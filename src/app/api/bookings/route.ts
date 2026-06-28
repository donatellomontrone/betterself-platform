import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { consultationService, getTreatmentById, type Treatment } from "@/lib/treatments";
import { applyDiscount } from "@/lib/discounts";
import { hasValidClerkServerKeys } from "@/lib/clerk-env";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  createBooking,
  createMedicalIntake,
  createPayment,
  ensureUserProfile,
  upsertPatientProfile,
} from "@/lib/db/queries";

type BookingRequest = {
  bookingIntent?: "treatment" | "consultation";
  treatmentId?: string;
  appointmentType?: string;
  location?: string;
  calendlyEventUri?: string;
  calendlyInviteeUri?: string;
  patientConcern?: string;
  consultationNotes?: string;
  intake?: string[];
  discountCode?: string;
  consentConfirmed?: boolean;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    emergencyContact?: string;
  };
};

function isConsultationBooking(treatment: Treatment) {
  // Derive from the treatment itself, never the client-sent bookingIntent — otherwise
  // a client could label a real injectable a "consultation" and skip the address rule.
  return treatment.id === consultationService.id;
}

// Server-side copy of the booking-flow intake questions. Client-supplied intake
// flags are whitelisted against this so arbitrary text can't be persisted to jsonb.
const INTAKE_QUESTIONS = [
  "Are you pregnant or breastfeeding?",
  "Do you have any allergies?",
  "Are you taking any medication?",
  "Do you have any autoimmune condition?",
  "Do you have any bleeding disorder?",
  "Have you had Botox, fillers, or skin boosters before?",
  "Have you had any adverse reaction before?",
];

function getPatientConcern(body: BookingRequest) {
  // Cap length so a huge free-text concern can't bloat the jsonb record or notes.
  return (body.patientConcern?.trim() || body.consultationNotes?.trim() || "").slice(0, 2000);
}

function sanitizeIntake(intake: unknown): string[] {
  if (!Array.isArray(intake)) return [];
  return intake.filter(
    (item): item is string => typeof item === "string" && INTAKE_QUESTIONS.includes(item),
  );
}

function asMetadataValue(value: string | undefined, fallback = "not_provided") {
  return value?.trim() || fallback;
}

export async function POST(request: NextRequest) {
  if (!hasValidClerkServerKeys()) {
    return NextResponse.json(
      { message: "Patient accounts are not configured yet." },
      { status: 503 },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      {
        message: "Please sign in before submitting a booking request.",
        signInUrl: "/sign-in?redirect_url=/booking",
      },
      { status: 401 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { message: "Booking database is not available right now." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as BookingRequest | null;
  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }
  const treatment = body.treatmentId ? getTreatmentById(body.treatmentId) : null;

  if (!treatment) {
    return NextResponse.json(
      { message: "Please choose a valid treatment before submitting." },
      { status: 400 },
    );
  }

  const isConsultation = isConsultationBooking(treatment);
  const patientConcern = getPatientConcern(body);

  if (!body.consentConfirmed) {
    return NextResponse.json(
      { message: "Please accept the consent items before submitting." },
      { status: 400 },
    );
  }

  if (!isConsultation && !body.location?.trim()) {
    return NextResponse.json(
      { message: "Please enter the home visit address before submitting." },
      { status: 400 },
    );
  }

  const user = await currentUser();
  const clerkEmail = user?.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  )?.emailAddress;
  const clerkPhone =
    user?.phoneNumbers.find((phone) => phone.id === user.primaryPhoneNumberId)?.phoneNumber ??
    user?.phoneNumbers[0]?.phoneNumber;
  const fullName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    body.customer?.name?.trim() ||
    "BetterSelf patient";
  const email = clerkEmail ?? body.customer?.email?.trim();

  if (!email) {
    return NextResponse.json(
      { message: "Please add an email address to your account before submitting." },
      { status: 400 },
    );
  }

  try {
    await ensureUserProfile({
      id: userId,
      fullName,
      email,
      phone: body.customer?.phone ?? clerkPhone ?? null,
    });
    await upsertPatientProfile({
      userId,
      address: (body.location?.trim() || body.customer?.address) ?? null,
      emergencyContact: body.customer?.emergencyContact ?? null,
    });

    // Consultations are paid up front (before the call is booked); treatments are
    // requested first, reviewed by the doctor, then paid from the dashboard.
    const referenceNumber = isConsultation
      ? `BS-CONSULT-${Date.now()}-${randomUUID().slice(0, 8)}`
      : null;

    // Consultations are charged now — validate any discount code server-side.
    const consultDiscount = isConsultation
      ? applyDiscount(treatment.price, body.discountCode)
      : null;

    const notes = [
      isConsultation
        ? "Consultation: paid up front; the patient books the call after payment."
        : "Doctor review call before payment; payment is collected from the dashboard after review.",
      body.calendlyEventUri ? `Calendly event: ${body.calendlyEventUri}` : null,
      body.calendlyInviteeUri ? `Calendly invitee: ${body.calendlyInviteeUri}` : null,
      patientConcern ? `Patient concern: ${patientConcern}` : null,
      consultDiscount?.code
        ? `Discount: ${consultDiscount.code} (${consultDiscount.label}, -₱${consultDiscount.discount})`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const booking = await createBooking({
      patientId: userId,
      treatmentId: treatment.id,
      appointmentType: asMetadataValue(
        body.appointmentType,
        isConsultation ? "online_consultation" : "doctor_review_call",
      ),
      location: asMetadataValue(
        body.location,
        isConsultation ? "Online consultation" : "Metro Manila",
      ),
      notes,
    });

    // Only consultations are paid now, so only they get a payment row here. Treatments
    // get their real payment row when the patient checks out from the dashboard
    // (checkout/retry), avoiding a permanent NULL-reference orphan row per booking.
    if (isConsultation) {
      await createPayment({
        bookingId: booking.id,
        patientId: userId,
        amount: consultDiscount?.total ?? treatment.price,
        paymentType: "consultation",
        transactionReference: referenceNumber,
      });
    }

    await createMedicalIntake({
      patientId: userId,
      bookingId: booking.id,
      answers: {
        flow: isConsultation ? "consultation_paid_upfront" : "doctor_review_before_payment",
        flagged: sanitizeIntake(body.intake),
        patientConcern: patientConcern || null,
      },
      consentConfirmed: true,
    });

    // Treatment: request first, pay later from the dashboard once confirmed.
    if (!isConsultation) {
      return NextResponse.json(
        {
          bookingId: booking.id,
          dashboardUrl: "/dashboard?booking=submitted",
          message: "Booking request submitted. The doctor will review it before payment.",
        },
        { status: 201 },
      );
    }

    // Consultation: take payment now; the call is booked after it clears.
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const secretKey = process.env.PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      // Demo mode: skip PayMongo but still land on the success page so the patient
      // can reach the Calendly link to book the call (mirrors the real success_url).
      return NextResponse.json(
        {
          bookingId: booking.id,
          checkoutUrl: `/booking/success?reference=${referenceNumber}&book=call&demo=1`,
          message: "Demo checkout — add PAYMONGO_SECRET_KEY to take real consultation payments.",
        },
        { status: 201 },
      );
    }

    const paymongo = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": referenceNumber as string,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            description: "BetterSelf doctor consultation",
            line_items: [
              {
                name: consultationService.name,
                amount: (consultDiscount?.total ?? treatment.price) * 100,
                currency: "PHP",
                quantity: 1,
                description: consultDiscount?.code
                  ? `Online doctor consultation (${consultDiscount.code}: ${consultDiscount.label}).`
                  : "Online doctor consultation to plan your treatment.",
              },
            ],
            payment_method_types: ["qrph"],
            success_url: `${origin}/booking/success?reference=${referenceNumber}&book=call`,
            cancel_url: `${origin}/booking/cancelled?reference=${referenceNumber}`,
            reference_number: referenceNumber,
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            billing: {
              name: fullName,
              email,
              phone: body.customer?.phone ?? clerkPhone ?? undefined,
            },
            metadata: {
              booking_id: booking.id,
              reference_number: referenceNumber as string,
              booking_intent: "consultation",
              care_model: "consultation",
              discount_code: consultDiscount?.code ?? "",
              discount_amount: String(consultDiscount?.discount ?? 0),
            },
          },
        },
      }),
    });

    const payload = await paymongo.json();
    if (!paymongo.ok || !payload.data?.attributes?.checkout_url) {
      console.error("[bookings] consultation PayMongo failed:", payload);
      return NextResponse.json(
        { message: "We couldn't open the payment page. Please try again or contact us." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        bookingId: booking.id,
        checkoutUrl: payload.data.attributes.checkout_url,
        message: "Redirecting to secure payment for your consultation.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[bookings] failed to create booking request:", error);
    return NextResponse.json(
      { message: "We couldn't submit your request just now. Please try again in a moment." },
      { status: 500 },
    );
  }
}
