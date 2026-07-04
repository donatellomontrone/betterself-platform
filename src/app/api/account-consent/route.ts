import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { hasValidClerkServerKeys } from "@/lib/clerk-env";
import { isDatabaseConfigured } from "@/lib/db/client";
import { ensureUserProfile, recordAccountConsent } from "@/lib/db/queries";

const CONSENT_VERSION = "account-consent-v1";

type AccountConsentRequest = {
  consentVersion?: string;
  acceptedAt?: string;
  acceptedItems?: unknown[];
};

export async function POST(request: NextRequest) {
  if (!hasValidClerkServerKeys() || !isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Account consent storage is not configured." },
      { status: 503 },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as AccountConsentRequest | null;

  // Only accept non-empty strings, each bounded, capped to a sane count — so arbitrary
  // objects/huge payloads can't be persisted to the consent jsonb.
  const acceptedItems = Array.isArray(body?.acceptedItems)
    ? body.acceptedItems
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 300))
        .slice(0, 20)
    : [];

  if (!body || body.consentVersion !== CONSENT_VERSION || acceptedItems.length < 5) {
    return NextResponse.json({ ok: false, error: "Invalid consent payload." }, { status: 400 });
  }

  try {
    const user = await currentUser();
    const clerkEmail = user?.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    )?.emailAddress;
    const fullName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.fullName ||
      "BetterSelf patient";

    if (!clerkEmail) {
      return NextResponse.json(
        { ok: false, error: "Account email is required." },
        { status: 400 },
      );
    }

    await ensureUserProfile({
      id: userId,
      fullName,
      email: clerkEmail,
      phone: user?.phoneNumbers[0]?.phoneNumber ?? null,
    });

    await recordAccountConsent({
      userId,
      consentVersion: body.consentVersion,
      acceptedAt: body.acceptedAt ?? null,
      acceptedItems,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[account-consent] failed to persist consent:", error);
    return NextResponse.json(
      { ok: false, error: "Could not save account consent." },
      { status: 500 },
    );
  }
}
