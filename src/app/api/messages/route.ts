import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isAdminEmail } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/db/client";
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

  const url = new URL(request.url);
  const requestedPatientId = url.searchParams.get("patientId");
  const email = primaryEmail(user);
  const isAdmin = isAdminEmail(email);
  const patientId = isAdmin && requestedPatientId ? requestedPatientId : user.id;

  const messages = await getPatientMessages(patientId);
  return NextResponse.json({ messages, patientId, isAdmin });
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
  const isAdmin = isAdminEmail(email);
  const patientId =
    isAdmin && body?.patientId ? String(body.patientId).trim().slice(0, 128) : user.id;

  if (isAdmin && body?.patientId) {
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
  return NextResponse.json({ messages, patientId, isAdmin });
}
