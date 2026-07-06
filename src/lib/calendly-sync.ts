import { isDatabaseConfigured } from "@/lib/db/client";
import {
  clearBookingScheduleByPaymentReference,
  updateBookingScheduleByPaymentReference,
} from "@/lib/db/queries";

type CalendlyCollection<T> = {
  collection?: T[];
  pagination?: {
    next_page?: string | null;
  };
};

type CalendlyMeResponse = {
  resource?: {
    uri?: string;
  };
};

type CalendlyLocation =
  | string
  | {
      type?: string | null;
      location?: string | null;
      join_url?: string | null;
      status?: string | null;
    };

type CalendlyEvent = {
  uri?: string | null;
  name?: string | null;
  start_time?: string | null;
  status?: string | null;
  location?: CalendlyLocation | null;
};

type CalendlyInvitee = {
  uri?: string | null;
  status?: string | null;
  timezone?: string | null;
  tracking?: {
    utm_content?: string | null;
  } | null;
  questions_and_answers?: Array<{
    answer?: string | null;
  }> | null;
  cancellation?: {
    created_at?: string | null;
  } | null;
};

type CalendlySyncResult = {
  skipped: boolean;
  eventsScanned: number;
  inviteesScanned: number;
  schedulesUpdated: number;
  schedulesCleared: number;
};

const referencePattern = /BS-[A-Z]+-\d+-[a-z0-9]+/i;

export function isCalendlyApiSyncConfigured() {
  return Boolean(process.env.CALENDLY_ACCESS_TOKEN?.trim());
}

async function calendlyGet<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Calendly API request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

function eventUuid(uri: string | null | undefined) {
  if (!uri) return null;
  return uri.split("/").filter(Boolean).at(-1) ?? null;
}

function findReference(invitee: CalendlyInvitee) {
  const answerReference = invitee.questions_and_answers
    ?.map((item) => item.answer ?? "")
    .find((answer) => referencePattern.test(answer))
    ?.match(referencePattern)?.[0];

  return invitee.tracking?.utm_content ?? answerReference ?? null;
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

async function eachCalendlyPage<T>(
  firstUrl: string,
  token: string,
  callback: (item: T) => Promise<void>,
) {
  let nextUrl: string | null | undefined = firstUrl;
  let pages = 0;

  while (nextUrl && pages < 5) {
    pages += 1;
    const page: CalendlyCollection<T> = await calendlyGet<CalendlyCollection<T>>(nextUrl, token);
    for (const item of page.collection ?? []) {
      await callback(item);
    }
    nextUrl = page.pagination?.next_page;
  }
}

export async function syncCalendlyBookings(): Promise<CalendlySyncResult> {
  const result: CalendlySyncResult = {
    skipped: true,
    eventsScanned: 0,
    inviteesScanned: 0,
    schedulesUpdated: 0,
    schedulesCleared: 0,
  };
  const token = process.env.CALENDLY_ACCESS_TOKEN?.trim();

  if (!token || !isDatabaseConfigured()) {
    return result;
  }

  const me = await calendlyGet<CalendlyMeResponse>("https://api.calendly.com/users/me", token);
  const userUri = me.resource?.uri;
  if (!userUri) {
    throw new Error("Calendly API did not return a user URI.");
  }

  result.skipped = false;
  const minStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const firstEventsUrl = new URL("https://api.calendly.com/scheduled_events");
  firstEventsUrl.searchParams.set("user", userUri);
  firstEventsUrl.searchParams.set("min_start_time", minStart);
  firstEventsUrl.searchParams.set("count", "100");

  await eachCalendlyPage<CalendlyEvent>(firstEventsUrl.toString(), token, async (event) => {
    result.eventsScanned += 1;
    const uuid = eventUuid(event.uri);
    if (!uuid) return;

    const firstInviteesUrl = new URL(
      `https://api.calendly.com/scheduled_events/${encodeURIComponent(uuid)}/invitees`,
    );
    firstInviteesUrl.searchParams.set("count", "100");

    await eachCalendlyPage<CalendlyInvitee>(firstInviteesUrl.toString(), token, async (invitee) => {
      result.inviteesScanned += 1;
      const referenceNumber = findReference(invitee);
      if (!referenceNumber) return;

      if (event.status === "canceled" || invitee.status === "canceled") {
        result.schedulesCleared += await clearBookingScheduleByPaymentReference(
          referenceNumber,
          invitee.cancellation?.created_at ?? null,
        );
        return;
      }

      if (!event.start_time) return;

      const timeZone = invitee.timezone || "Asia/Manila";
      const schedule = zonedDateAndTime(event.start_time, timeZone);
      result.schedulesUpdated += await updateBookingScheduleByPaymentReference({
        referenceNumber,
        appointmentDate: schedule.date,
        appointmentTime: schedule.time,
        eventUri: event.uri ?? null,
        inviteeUri: invitee.uri ?? null,
        videoCallUrl: getVideoCallUrl(event.location),
        timezone: timeZone,
        eventName: event.name ?? null,
      });
    });
  });

  return result;
}
