import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getTreatmentById } from "@/lib/treatments";

type CheckoutRequest = {
  treatmentId?: string;
  slot?: string;
  appointmentType?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
};

const paymentMethods = ["card", "gcash", "qrph"];
const homeVisitFee = 1500;

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

  if (!secretKey) {
    const checkoutUrl = `/checkout-preview?reference=${referenceNumber}&treatment=${treatment.id}`;

    return NextResponse.json({
      checkoutUrl,
      mode: "demo",
      referenceNumber,
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
          description: `BetterSelf home visit: ${treatment.name}`,
          line_items: [
            {
              name: treatment.name,
              amount: treatment.price * 100,
              currency: "PHP",
              quantity: 1,
              description: treatment.description,
            },
            {
              name: "BetterSelf home visit fee",
              amount: homeVisitFee * 100,
              currency: "PHP",
              quantity: 1,
              description:
                "Private home appointment support, subject to doctor approval and area availability.",
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
              line1: body.customer?.address,
              country: "PH",
            },
          },
          metadata: {
            treatment_id: treatment.id,
            visit_slot: body.slot ?? "not_selected",
            appointment_type: body.appointmentType ?? "home_visit",
            care_model: "home_visit",
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
    message: "Redirecting to secure PayMongo checkout.",
  });
}
