import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function hasValidSignature(rawBody: string, secret: string, signatureHeader: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const candidates = signatureHeader
    .split(",")
    .map((part) => part.trim())
    .map((part) => (part.includes("=") ? part.split("=").at(-1) ?? "" : part));

  return candidates.some((candidate) => safeCompare(expected, candidate));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  const signature =
    request.headers.get("paymongo-signature") ??
    request.headers.get("x-paymongo-signature");

  if (webhookSecret) {
    if (!signature || !hasValidSignature(rawBody, webhookSecret, signature)) {
      return NextResponse.json({ message: "Invalid webhook signature." }, { status: 401 });
    }
  }

  const event = JSON.parse(rawBody) as {
    data?: {
      id?: string;
      type?: string;
      attributes?: {
        reference_number?: string;
        status?: string;
      };
    };
  };

  if (event.data?.type === "checkout_session.payment.paid") {
    // TODO: Mark the referenced booking paid in the database and queue doctor dispatch.
    return NextResponse.json({
      received: true,
      action: "booking_payment_confirmed",
      referenceNumber: event.data.attributes?.reference_number,
    });
  }

  return NextResponse.json({
    received: true,
    action: "ignored",
    eventType: event.data?.type ?? "unknown",
  });
}
