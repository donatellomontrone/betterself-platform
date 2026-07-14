import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  clearBookingScheduleByPaymentReference,
  updateBookingScheduleByPaymentReference,
} from "@/lib/db/queries";

type CalendlyTracking = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  salesforce_uuid?: string | null;
};

type CalendlyLocation =
  | string
  | {
      type?: string | null;
      location?: string | null;
      join_url?: string | null;
      status?: string | null;
    };

type CalendlyScheduledEvent = {
  uri?: string | null;
  name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: CalendlyLocation | null;
};

type CalendlyWebhookPayload = {
  event?: string;
  payload?: {
    uri?: string | null;
    name?: string | null;
    email?: string | null;
    timezone?: string | null;
    event?: string | CalendlyScheduledEvent | null;
    scheduled_event?: CalendlyScheduledEvent | null;
    tracking?: CalendlyTracking | null;
    questions_and_answers?: Array<{
      question?: string | null;
      answer?: string | null;
    }> | null;
    cancellation?: {
      created_at?: string | null;
      reason?: string | null;
    } | null;
  };
};

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseSignatureHeader(header: string) {
  const parts: Record<string, string> = {};
  for (const segment of header.split(",")) {
    const [key, ...rest] = segment.trim().split("=");
    if (key && rest.length) {
      parts[key] = rest.join("=");
    }
  }
  return parts;
}

function hasValidSignature(rawBody: string, secret: string, signatureHeader: string) {
  const parts = parseSignatureHeader(signatureHeader);
  const timestamp = parts.t;
  const signature = parts.v1;
  const eventSeconds = Number(timestamp);
  if (!timestamp || !signature || !Number.isFinite(eventSeconds)) {
    return false;
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - eventSeconds);
  if (ageSeconds > 15 * 60) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return safeCompare(expected, signature);
}

function scheduledEvent(payload: CalendlyWebhookPayload["payload"]) {
  if (!payload) return null;
  if (payload.scheduled_event) return payload.scheduled_event;
  if (payload.event && typeof payload.event === "object") return payload.event;
  return null;
}

function eventUri(payload: CalendlyWebhookPayload["payload"], event: CalendlyScheduledEvent | null) {
  if (typeof payload?.event === "string") return payload.event;
  return event?.uri ?? null;
}

function findReference(payload: CalendlyWebhookPayload["payload"]) {
  const answers = payload?.questions_and_answers ?? [];
  const answerReference = answers
    .map((item) => item.answer ?? "")
    .find((answer) => /BS-[A-Z]+-\d+-[a-z0-9]+/i.test(answer))
    ?.match(/BS-[A-Z]+-\d+-[a-z0-9]+/i)?.[0];

  return (
    payload?.tracking?.utm_content ??
    answerReference ??
    null
  );
}

function getVideoCallUrl(location: CalendlyLocation | null | undefined) {
  if (!location || typeof location === "string") return null;
  const candidate = location.join_url ?? location.location;
  return candidate && /^https?:\/\//i.test(candidate) ? candidate : null;
}

function zonedDateAndTime(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const webhookSecret =
    process.env.CALENDLY_WEBHOOK_SIGNING_KEY ?? process.env.CALENDLY_WEBHOOK_SECRET;
  const signature =
    request.headers.get("calendly-webhook-signature") ??
    request.headers.get("x-calendly-webhook-signature");

  if (!webhookSecret) {
    console.error("[calendly webhook] signing key is not configured.");
    return NextResponse.json({ message: "Webhook is not configured." }, { status: 503 });
  }

  if (!signature || !hasValidSignature(rawBody, webhookSecret, signature)) {
    return NextResponse.json({ message: "Invalid webhook signature." }, { status: 401 });
  }

  let body: CalendlyWebhookPayload;
  try {
    body = JSON.parse(rawBody) as CalendlyWebhookPayload;
  } catch (error) {
    console.error("[calendly webhook] invalid JSON payload:", error);
    return NextResponse.json({ message: "Invalid JSON payload." }, { status: 400 });
  }
  const payload = body.payload;
  const referenceNumber = findReference(payload);

  if (!referenceNumber) {
    console.info("[calendly webhook] ignored event without BetterSelf reference", {
      event: body.event,
    });
    return NextResponse.json({ received: true, action: "ignored_missing_reference" });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ message: "Database is not configured." }, { status: 503 });
  }

  if (body.event === "invitee.canceled") {
    const updated = await clearBookingScheduleByPaymentReference(
      referenceNumber,
      payload?.cancellation?.created_at ?? null,
      payload?.email ?? null,
    );
    console.info("[calendly webhook] invitee canceled", { referenceNumber, updated });
    return NextResponse.json({ received: true, action: "schedule_cleared", updated });
  }

  if (body.event !== "invitee.created") {
    console.info("[calendly webhook] ignored event", { event: body.event, referenceNumber });
    return NextResponse.json({ received: true, action: "ignored", event: body.event });
  }

  const event = scheduledEvent(payload);
  const startTime = event?.start_time;
  if (!event || !startTime) {
    console.info("[calendly webhook] missing scheduled event details", { referenceNumber });
    return NextResponse.json({ received: true, action: "ignored_missing_schedule" });
  }

  const timeZone = payload?.timezone || "Asia/Manila";
  const schedule = zonedDateAndTime(startTime, timeZone);
  const updated = await updateBookingScheduleByPaymentReference({
    referenceNumber,
    appointmentDate: schedule.date,
    appointmentTime: schedule.time,
    inviteeEmail: payload?.email ?? null,
    eventUri: eventUri(payload, event),
    inviteeUri: payload?.uri ?? null,
    videoCallUrl: getVideoCallUrl(event.location),
    timezone: timeZone,
    eventName: event.name ?? null,
  });

  console.info("[calendly webhook] invitee created", { referenceNumber, updated });
  return NextResponse.json({ received: true, action: "schedule_saved", updated });
}
