import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { limitAuthenticatedRequest } from "@/lib/server-rate-limit";
import {
  attachPayMongoCheckout,
  createOrReusePendingPayment,
  getRetryableBookingForCheckout,
  markPaidByReference,
  markPendingPaymentAttemptFailed,
} from "@/lib/db/queries";
import { applyDiscount } from "@/lib/discounts";
import { track } from "@vercel/analytics/server";

// QR Ph only. A booking has one active payment attempt at a time; a repeated
// click deliberately reuses its PayMongo idempotency key instead of making a
// second QR that could charge the patient twice.
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

  const rateLimit = await limitAuthenticatedRequest({
    scope: "checkout-retry",
    userId: user.id,
    maxRequests: 6,
    windowSeconds: 10 * 60,
  });
  if (rateLimit.limited) {
    return dashboardRedirect(request, "retry_limited");
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

  const isConsultation = booking.treatment_id === "doctor-consultation";
  const paymentIsAllowed = isConsultation
    ? booking.status === "pending_doctor_review" || booking.status === "confirmed"
    : booking.status === "ready_for_payment";
  if (!paymentIsAllowed) {
    return dashboardRedirect(request, "not_confirmed");
  }

  if (booking.amount == null) {
    return dashboardRedirect(request, "amount_missing");
  }

  // Validate any discount code server-side against the booking's amount.
  const applied = applyDiscount(booking.amount, discountCode);

  const attempt = await createOrReusePendingPayment({
    bookingId: booking.id,
    patientId: user.id,
    amount: applied.total,
    paymentType: booking.payment_type,
    transactionReference: `BS-RETRY-${Date.now()}-${randomUUID().slice(0, 8)}`,
  });
  const referenceNumber = attempt.attempt.transaction_reference;
  const checkoutAmount = attempt.attempt.amount;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  if (!secretKey) {
    // Demo mode (no PayMongo): record + mark the payment paid so the flow actually
    // completes and the dashboard 'Pay now' clears, then land on the success page —
    // instead of dead-ending on /checkout-preview and looping forever.
    await markPaidByReference(referenceNumber);
    return NextResponse.redirect(
      new URL(`/booking/success?reference=${referenceNumber}&demo=1`, request.url),
      303,
    );
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
              amount: checkoutAmount * 100,
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
    await markPendingPaymentAttemptFailed(referenceNumber);
    return dashboardRedirect(request, "retry_failed");
  }

  await attachPayMongoCheckout({
    transactionReference: referenceNumber,
    paymongoCheckoutId: payload.data.id,
  });
  await track("payment_started", {
    payment_type: booking.payment_type,
    retry: true,
  });

  return NextResponse.redirect(payload.data.attributes.checkout_url, 303);
}
