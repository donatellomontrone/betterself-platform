import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  getPaymentReconciliationTarget,
  markPaidByReference,
} from "@/lib/db/queries";

type PayMongoCheckoutSession = {
  data?: {
    id?: string;
    attributes?: {
      reference_number?: string;
      status?: string;
      metadata?: Record<string, string>;
      payments?: Array<{
        id?: string;
        attributes?: {
          status?: string;
        };
      }>;
      payment_intent?: {
        attributes?: {
          status?: string;
        };
      };
    };
  };
};

function dashboardRedirect(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/dashboard?payment=${status}`, request.url), 303);
}

function isCheckoutPaid(session: PayMongoCheckoutSession) {
  const attributes = session.data?.attributes;
  const statuses = [
    attributes?.status,
    attributes?.payment_intent?.attributes?.status,
    ...(attributes?.payments ?? []).map((payment) => payment.attributes?.status),
  ].filter(Boolean);

  return statuses.some((status) => {
    const normalized = status?.toLowerCase();
    return normalized === "paid" || normalized === "succeeded";
  });
}

async function fetchCheckoutSession(checkoutId: string, secretKey: string) {
  const auth = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
  const endpoints = [
    `https://api.paymongo.com/v2/checkout_sessions/${checkoutId}`,
    `https://api.paymongo.com/v1/checkout_sessions/${checkoutId}`,
  ];

  let lastStatus = 0;
  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    lastStatus = response.status;
    if (response.ok) {
      return (await response.json()) as PayMongoCheckoutSession;
    }
    if (response.status !== 404) {
      console.error("[paymongo reconcile] PayMongo checkout lookup failed", {
        status: response.status,
      });
      return null;
    }
  }

  console.error("[paymongo reconcile] PayMongo checkout lookup not found", {
    checkoutId,
    status: lastStatus,
  });
  return null;
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in?redirect_url=/dashboard", request.url), 303);
  }

  if (!isDatabaseConfigured()) {
    return dashboardRedirect(request, "sync_unavailable");
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    return dashboardRedirect(request, "sync_unavailable");
  }

  const formData = await request.formData();
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) {
    return dashboardRedirect(request, "retry_missing");
  }

  const target = await getPaymentReconciliationTarget(user.id, bookingId);
  if (!target || !target.transaction_reference || !target.paymongo_checkout_id) {
    return dashboardRedirect(request, "sync_missing");
  }

  if (target.booking_payment_status === "paid" || target.payment_status === "paid") {
    return dashboardRedirect(request, "already_paid");
  }

  const checkout = await fetchCheckoutSession(target.paymongo_checkout_id, secretKey);
  if (!checkout) {
    return dashboardRedirect(request, "sync_failed");
  }

  const checkoutReference =
    checkout.data?.attributes?.reference_number ??
    checkout.data?.attributes?.metadata?.reference_number;
  if (checkoutReference !== target.transaction_reference) {
    console.error("[paymongo reconcile] checkout reference mismatch", {
      bookingId,
      checkoutId: target.paymongo_checkout_id,
    });
    return dashboardRedirect(request, "sync_failed");
  }

  if (!isCheckoutPaid(checkout)) {
    return dashboardRedirect(request, "sync_pending");
  }

  const updated = await markPaidByReference({
    referenceNumber: target.transaction_reference,
    paymongoCheckoutId: target.paymongo_checkout_id,
    eventType: "checkout.reconciled",
  });
  return dashboardRedirect(request, updated > 0 ? "synced" : "already_paid");
}
