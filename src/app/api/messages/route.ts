import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/db/client";
import { limitAuthenticatedRequest } from "@/lib/server-rate-limit";
import {
  createDoctorMessage,
  createPatientMessage,
  ensureUserProfile,
  getPatientMessages,
  recordAdminAuditLog,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

function primaryEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  return user?.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)
    ?.emailAddress;
}

function fullName(user: Awaited<ReturnType<typeof currentUser>>) {
  return user?.fullName || user?.firstName || primaryEmail(user) || "BetterSelf patient";
}

function isAdmin(user: Awaited<ReturnType<typeof currentUser>>) {
  const primary = user?.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId);
  return isAdminUser({
    userId: user?.id,
    email: primary?.emailAddress,
    emailVerified: primary?.verification?.status === "verified",
  });
}

function normalizeMessage(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, 2000);
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ messages: [], warning: "Database not configured" });
  }

  const rateLimit = await limitAuthenticatedRequest({
    scope: "messages-send",
    userId: user.id,
    maxRequests: 30,
    windowSeconds: 10 * 60,
  });
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Please wait a moment before sending another message." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const url = new URL(request.url);
  const requestedPatientId = url.searchParams.get("patientId");
  const admin = isAdmin(user);
  const patientId = admin && requestedPatientId ? requestedPatientId : user.id;

  const messages = await getPatientMessages(patientId);
  return NextResponse.json({ messages, patientId, isAdmin: admin });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    message?: unknown;
    patientId?: unknown;
  } | null;
  const message = normalizeMessage(body?.message);
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const email = primaryEmail(user);
  const admin = isAdmin(user);
  const patientId =
    admin && body?.patientId ? String(body.patientId).trim().slice(0, 128) : user.id;

  if (admin && body?.patientId) {
    await createDoctorMessage(patientId, message);
    await recordAdminAuditLog({
      actorId: user.id,
      actorEmail: email,
      action: "message.doctor_reply",
      targetType: "patient",
      targetId: patientId,
      metadata: { length: message.length },
    });
  } else {
    await ensureUserProfile({
      id: user.id,
      fullName: fullName(user),
      email: email ?? `${user.id}@betterself.local`,
      phone: user.phoneNumbers[0]?.phoneNumber ?? null,
    });
    await createPatientMessage(user.id, message);
  }

  revalidatePath("/messages");
  revalidatePath("/admin");
  const messages = await getPatientMessages(patientId);
  return NextResponse.json({ messages, patientId, isAdmin: admin });
}
