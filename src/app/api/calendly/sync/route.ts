import { NextRequest, NextResponse } from "next/server";
import { syncCalendlyBookings } from "@/lib/calendly-sync";

function isAuthorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  return Boolean(expected) && request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await syncCalendlyBookings()) });
  } catch (error) {
    console.error("[calendly cron] sync failed", error);
    return NextResponse.json({ message: "Calendly sync failed" }, { status: 500 });
  }
}
