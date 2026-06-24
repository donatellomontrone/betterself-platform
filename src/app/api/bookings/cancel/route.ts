import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { cancelPatientBooking } from "@/lib/db/queries";

function dashboardRedirect(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/dashboard?booking=${status}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in?redirect_url=/dashboard", request.url), 303);
  }

  if (!isDatabaseConfigured()) {
    return dashboardRedirect(request, "cancel_unavailable");
  }

  const formData = await request.formData();
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) {
    return dashboardRedirect(request, "cancel_failed");
  }

  try {
    const cancelled = await cancelPatientBooking(bookingId, user.id);
    return dashboardRedirect(request, cancelled ? "cancelled" : "cancel_failed");
  } catch (error) {
    console.error("[bookings/cancel] failed:", error);
    return dashboardRedirect(request, "cancel_failed");
  }
}
