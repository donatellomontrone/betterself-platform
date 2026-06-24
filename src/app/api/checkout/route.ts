import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { consultationService, getTreatmentById, type Treatment } from "@/lib/treatments";
import { hasValidClerkServerKeys } from "@/lib/clerk-env";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  createBooking,
  createMedicalIntake,
  createPayment,
  ensureUserProfile,
  upsertPatientProfile,
} from "@/lib/db/queries";

type CheckoutRequest = {
  bookingIntent?: "treatment" | "consultation";
  treatmentId?: string;
  appointmentType?: string;
  location?: string;
  paymentMode?: string;
  calendlyEventUri?: string;
  calendlyInviteeUri?: string;
  consultationNotes?: string;
  intake?: string[];
  consentConfirmed?: boolean;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
};

function isConsultationBooking(treatment: Treatment, body: CheckoutRequest) {
  return body.bookingIntent === "consultation" || treatment.id === consultationService.id;
}

const paymentMethods = ["card", "gcash", "qrph"];

function asMetadataValue(value: string | undefined, fallback = "not_provided") {
  return value?.trim() || fallback;
}

/**
 * If a Clerk user is signed in (and the DB is configured), persist the patient
 * profile, the booking and a pending payment, and return the new booking id.
 * Returns null for anonymous checkouts or if persistence is unavailable.
 *
 * A database failure must never block the patient from paying, so the whole
 * thing is best-effort: on error we log and fall back to a non-persisted
 * checkout instead of returning an error to the client.
 */
async function persistBooking(
  treatment: Treatment,
  body: CheckoutRequest,
  referenceNumber: string,
  total: number,
): Promise<string | null> {
  if (!hasValidClerkServerKeys() || !isDatabaseConfigured()) {
    return null;
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return null;
    }

    const user = await currentUser();
    const clerkEmail = user?.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    )?.emailAddress;
    const fullName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      body.customer?.name?.trim() ||
      "BetterSelf patient";
    const email = clerkEmail ?? body.customer?.email?.trim();

    if (!email) {
      return null;
    }

    await ensureUserProfile({
      id: userId,
      fullName,
      email,
      phone: body.customer?.phone ?? null,
    });
    await upsertPatientProfile({
      userId,
      address: body.customer?.address ?? null,
    });

    const isConsultation = isConsultationBooking(treatment, body);
    const notes = [
      `Booking flow: ${isConsultation ? "consultation" : "direct treatment"}`,
      body.calendlyEventUri
        ? `Calendly event: ${body.calendlyEventUri}`
        : "Schedule NOT verified in Calendly — confirm the appointment with the patient.",
      body.calendlyInviteeUri ? `Calendly invitee: ${body.calendlyInviteeUri}` : null,
      body.consultationNotes?.trim()
        ? `Consultation notes: ${body.consultationNotes.trim()}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const booking = await createBooking({
      patientId: userId,
      treatmentId: treatment.id,
      appointmentType: asMetadataValue(body.appointmentType, "home_visit"),
      location: asMetadataValue(body.location, "metro_manila"),
      notes: notes || null,
    });

    await createPayment({
      bookingId: booking.id,
      patientId: userId,
      amount: total,
      paymentType: isConsultation ? "consultation" : "treatment",
      transactionReference: referenceNumber,
    });

    await createMedicalIntake({
      patientId: userId,
      bookingId: booking.id,
      answers: {
        flow: isConsultation ? "consultation" : "direct_treatment",
        flagged: body.intake ?? [],
        consultationNotes: body.consultationNotes?.trim() ?? null,
      },
      consentConfirmed: Boolean(body.consentConfirmed),
    });

    return booking.id;
  } catch (error) {
    console.error("[checkout] failed to persist booking:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CheckoutRequest;
  const treatment = body.treatmentId ? getTreatmentById(body.treatmentId) : null;

  if (!treatment) {
    return NextResponse.json(
      { message: "Please choose a valid treatment before checkout." },
      { status: 400 },
    );
  }

  const referenceNumber = `BS-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  const customerAddress = body.customer?.address;
  const isConsultation = isConsultationBooking(treatment, body);
  const total = treatment.price;
  const bookingId = await persistBooking(treatment, body, referenceNumber, total);

  if (!secretKey) {
    const checkoutUrl = `/checkout-preview?reference=${referenceNumber}&treatment=${treatment.id}`;

    return NextResponse.json({
      checkoutUrl,
      mode: "demo",
      referenceNumber,
      bookingId,
      persisted: Boolean(bookingId),
      message:
        "Demo checkout opened. Add PAYMONGO_SECRET_KEY to create real PayMongo sessions.",
    });
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
          description: `BetterSelf: ${treatment.name}`,
          line_items: [
            {
              name: treatment.name,
              amount: treatment.price * 100,
              currency: "PHP",
              quantity: 1,
              description: isConsultation
                ? "Doctor consultation before choosing or booking a treatment."
                : treatment.description,
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
            name: body.customer?.name,
            email: body.customer?.email,
            phone: body.customer?.phone,
            address: {
              line1: customerAddress,
              city: body.location ?? "Metro Manila",
              country: "PH",
              state: "Metro Manila",
            },
          },
          metadata: {
            booking_id: bookingId ?? "not_persisted",
            reference_number: referenceNumber,
            treatment_id: treatment.id,
            treatment_name: treatment.name,
            booking_intent: isConsultation ? "consultation" : "treatment",
            appointment_type: asMetadataValue(
              body.appointmentType,
              isConsultation ? "online_consultation" : "home_treatment_visit",
            ),
            appointment_location: asMetadataValue(
              body.location,
              isConsultation ? "online_consultation" : "metro_manila",
            ),
            payment_mode: asMetadataValue(body.paymentMode, "paymongo_checkout"),
            calendly_event_uri: asMetadataValue(body.calendlyEventUri),
            calendly_invitee_uri: asMetadataValue(body.calendlyInviteeUri),
            care_model: isConsultation ? "consultation" : "home_treatment",
          },
        },
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        message:
          "PayMongo could not create checkout. Please try again or choose another payment method.",
        provider: payload,
      },
      { status: response.status },
    );
  }

  return NextResponse.json({
    checkoutUrl: payload.data.attributes.checkout_url,
    referenceNumber,
    mode: "paymongo",
    sessionId: payload.data.id,
    bookingId,
    persisted: Boolean(bookingId),
    message: "Redirecting to secure PayMongo checkout.",
  });
}
