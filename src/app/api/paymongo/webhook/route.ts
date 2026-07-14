import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { markPaidByReference } from "@/lib/db/queries";

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
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

// PayMongo signs `${timestamp}.${rawBody}` with the webhook secret and sends it as
// `Paymongo-Signature: t=<ts>,te=<test sig>,li=<live sig>`. We must hash the
// timestamped payload (not the raw body alone) and reject stale events (replay).
function hasValidSignature(rawBody: string, secret: string, signatureHeader: string) {
  const parts = parseSignatureHeader(signatureHeader);
  const timestamp = parts.t;
  const eventSeconds = Number(timestamp);
  if (!timestamp || !Number.isFinite(eventSeconds)) {
    return false;
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - eventSeconds);
  if (ageSeconds > 5 * 60) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return [parts.te, parts.li]
    .filter((value): value is string => Boolean(value))
    .some((candidate) => safeCompare(expected, candidate));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  const signature =
    request.headers.get("paymongo-signature") ??
    request.headers.get("x-paymongo-signature");

  // Fail closed: never act on a payment event without a configured, valid signature.
  // (Demo mode keys off PAYMONGO_SECRET_KEY and never reaches this webhook.)
  if (!webhookSecret) {
    console.error("[paymongo webhook] PAYMONGO_WEBHOOK_SECRET is not set — refusing to process.");
    return NextResponse.json({ message: "Webhook is not configured." }, { status: 503 });
  }
  if (!signature || !hasValidSignature(rawBody, webhookSecret, signature)) {
    return NextResponse.json({ message: "Invalid webhook signature." }, { status: 401 });
  }

  let event: {
    data?: {
      id?: string;
      type?: string;
      attributes?: {
        type?: string;
        livemode?: boolean;
        reference_number?: string;
        status?: string;
        data?: {
          id?: string;
          type?: string;
          attributes?: {
            reference_number?: string;
            status?: string;
            metadata?: Record<string, string>;
          };
        };
      };
      data?: {
        id?: string;
        type?: string;
        attributes?: {
          reference_number?: string;
          status?: string;
          metadata?: Record<string, string>;
        };
      };
    };
  };

  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch (error) {
    console.error("[paymongo webhook] invalid JSON payload:", error);
    return NextResponse.json({ message: "Invalid JSON payload." }, { status: 400 });
  }

  // PayMongo's Hosted Checkout docs currently send the event type at data.type
  // and the checkout session at data.data. Some dashboard/webhook fixtures wrap
  // the event type at data.attributes.type with the resource at attributes.data.
  // Support both envelopes so payment reconciliation does not depend on one shape.
  const eventType =
    event.data?.type === "event" ? event.data.attributes?.type : event.data?.type;
  const checkoutSession =
    event.data?.data ?? event.data?.attributes?.data ?? event.data;

  if (eventType === "checkout_session.payment.paid") {
    const referenceNumber = checkoutSession?.attributes?.reference_number;

    if (!referenceNumber) {
      console.error("[paymongo webhook] paid checkout event missing reference number.");
      return NextResponse.json(
        { message: "Paid checkout event is missing a reference number." },
        { status: 422 },
      );
    }

    if (!isDatabaseConfigured()) {
      console.error("[paymongo webhook] database is not configured.");
      return NextResponse.json({ message: "Database is not configured." }, { status: 503 });
    }

    let bookingsMarkedPaid = 0;
    try {
      bookingsMarkedPaid = await markPaidByReference(referenceNumber);
    } catch (error) {
      // Return non-2xx so PayMongo retries instead of losing a real paid event.
      console.error("[paymongo webhook] failed to mark booking paid:", error);
      return NextResponse.json(
        { message: "Could not persist paid checkout event." },
        { status: 500 },
      );
    }

    console.info("[paymongo webhook] checkout paid", {
      referenceNumber,
      bookingsMarkedPaid,
    });

    return NextResponse.json({
      received: true,
      action: "booking_payment_confirmed",
      referenceNumber,
      bookingsMarkedPaid,
    });
  }

  console.info("[paymongo webhook] ignored event", {
    eventType: eventType ?? "unknown",
  });

  return NextResponse.json({
    received: true,
    action: "ignored",
    eventType: eventType ?? "unknown",
  });
}
