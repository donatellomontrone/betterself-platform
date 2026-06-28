import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  createPayment,
  getRetryableBookingForCheckout,
  updateBookingPaymentStatus,
} from "@/lib/db/queries";
import { applyDiscount } from "@/lib/discounts";

// QR Ph only (business uses QR Ph, not cards/GCash). Each "Pay now" creates a
// fresh single-use checkout session, so a new QR is generated every attempt.
// "Source has consumed status" only happens if an already-scanned QR is reopened
// — generate a new payment instead of reloading the old PayMongo page.
const paymentMethods = ["qrph"];

function dashboardRedirect(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/dashboard?payment=${status}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in?redirect_url=/dashboard", request.url), 303);
  }

  if (!isDatabaseConfigured()) {
    return dashboardRedirect(request, "retry_unavailable");
  }

  const formData = await request.formData();
  const bookingId = String(formData.get("bookingId") ?? "");
  const discountCode = String(formData.get("discountCode") ?? "");
  if (!bookingId) {
    return dashboardRedirect(request, "retry_missing");
  }

  const booking = await getRetryableBookingForCheckout(user.id, bookingId);
  if (!booking) {
    return dashboardRedirect(request, "retry_missing");
  }

  if (booking.payment_status === "paid") {
    return dashboardRedirect(request, "already_paid");
  }

  if (booking.status === "cancelled") {
    return dashboardRedirect(request, "retry_missing");
  }

  if (booking.status !== "confirmed") {
    return dashboardRedirect(request, "not_confirmed");
  }

  // Validate any discount code server-side against the booking's amount.
  const applied = applyDiscount(booking.amount, discountCode);

  const referenceNumber = `BS-RETRY-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  if (!secretKey) {
    const checkoutUrl = new URL(
      `/checkout-preview?reference=${referenceNumber}&treatment=${booking.treatment_id}`,
      request.url,
    );
    return NextResponse.redirect(checkoutUrl, 303);
  }

  const response = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": referenceNumber,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          description: `BetterSelf retry payment: ${booking.treatment_name}`,
          line_items: [
            {
              name: booking.treatment_name,
              amount: applied.total * 100,
              currency: "PHP",
              quantity: 1,
              description: applied.code
                ? `${booking.treatment_description} (${applied.code}: ${applied.label})`
                : booking.treatment_description,
            },
          ],
          payment_method_types: paymentMethods,
          success_url: `${origin}/booking/success?reference=${referenceNumber}`,
          cancel_url: `${origin}/booking/cancelled?reference=${referenceNumber}`,
          reference_number: referenceNumber,
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          billing: {
            name: booking.patient_name,
            email: booking.patient_email,
            phone: booking.patient_phone ?? undefined,
            address: {
              line1: booking.patient_address ?? booking.location,
              city: booking.location,
              country: "PH",
              state: "Metro Manila",
            },
          },
          metadata: {
            booking_id: booking.id,
            reference_number: referenceNumber,
            treatment_id: booking.treatment_id,
            treatment_name: booking.treatment_name,
            booking_intent:
              booking.payment_type === "consultation" ? "consultation" : "treatment",
            appointment_type: booking.appointment_type,
            appointment_location: booking.location,
            payment_mode: "paymongo_qrph_retry",
            care_model:
              booking.payment_type === "consultation" ? "consultation" : "home_treatment",
            discount_code: applied.code ?? "",
            discount_amount: String(applied.discount),
          },
        },
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok || !payload.data?.attributes?.checkout_url) {
    console.error("[checkout retry] PayMongo failed:", payload);
    return dashboardRedirect(request, "retry_failed");
  }

  await createPayment({
    bookingId: booking.id,
    patientId: user.id,
    amount: applied.total,
    paymentType: booking.payment_type,
    transactionReference: referenceNumber,
    paymongoCheckoutId: payload.data.id,
  });
  await updateBookingPaymentStatus(booking.id, "pending");

  return NextResponse.redirect(payload.data.attributes.checkout_url, 303);
}
