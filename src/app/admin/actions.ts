"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminUser } from "@/lib/admin";
import { syncCalendlyBookings } from "@/lib/calendly-sync";
import {
  createDoctorMessage,
  markBookingReadyForPayment,
  recordAdminAuditLog,
  setBookingConfirmedAmount,
  updateBookingNotes,
  updateBookingSchedule,
  updateBookingStatus,
  updateMedicalIntakeReview,
  updatePatientAdminProfile,
} from "@/lib/db/queries";
import type { BookingStatus, IntakeReviewStatus } from "@/lib/db/types";

const VALID_STATUSES: BookingStatus[] = [
  "pending_doctor_review",
  "needs_more_information",
  "completed",
];

const VALID_INTAKE_STATUSES: IntakeReviewStatus[] = [
  "not_started",
  "submitted",
  "needs_more_information",
  "approved",
  "rejected",
];

async function assertAdmin() {
  const user = await currentUser();
  const email = user?.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  )?.emailAddress;

  const primaryEmail = user?.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  );
  if (!isAdminUser({
    userId: user?.id,
    email,
    emailVerified: primaryEmail?.verification?.status === "verified",
  })) return null;
  return { id: user?.id ?? null, email: email ?? null };
}

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function updateBookingStatusAction(formData: FormData) {
  // Re-check authorization on the server — never trust the client.
  const actor = await assertAdmin();
  if (!actor) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;
  if (!bookingId || !VALID_STATUSES.includes(status)) return;

  const updated = await updateBookingStatus(bookingId, status);
  if (!updated) return;
  await recordAdminAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "booking.status.update",
    targetType: "booking",
    targetId: bookingId,
    metadata: { status },
  });
  revalidatePath("/admin");
}

export async function updateIntakeReviewAction(formData: FormData) {
  const actor = await assertAdmin();
  if (!actor) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("intakeStatus") ?? "") as IntakeReviewStatus;
  if (!bookingId || !VALID_INTAKE_STATUSES.includes(status)) return;

  const doctorNotes = cleanText(formData.get("doctorNotes"));
  await updateMedicalIntakeReview(bookingId, status, doctorNotes);
  await recordAdminAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "intake.review.update",
    targetType: "booking",
    targetId: bookingId,
    metadata: { status, hasDoctorNotes: Boolean(doctorNotes) },
  });
  revalidatePath("/admin");
}

export async function prepareBookingForPaymentAction(formData: FormData) {
  const actor = await assertAdmin();
  if (!actor) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return;

  const opened = await markBookingReadyForPayment(bookingId);
  await recordAdminAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "booking.payment.open",
    targetType: "booking",
    targetId: bookingId,
    metadata: { opened },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function updateBookingScheduleAction(formData: FormData) {
  const actor = await assertAdmin();
  if (!actor) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return;

  const appointmentDate = cleanText(formData.get("appointmentDate"));
  const appointmentTime = cleanText(formData.get("appointmentTime"));
  if (Boolean(appointmentDate) !== Boolean(appointmentTime)) return;
  if (appointmentDate && appointmentTime) {
    const scheduledAt = new Date(`${appointmentDate}T${appointmentTime}:00+08:00`);
    if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() - 5 * 60_000) {
      return;
    }
  }
  const updated = await updateBookingSchedule(bookingId, appointmentDate, appointmentTime);
  if (!updated) return;
  await recordAdminAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "booking.schedule.update",
    targetType: "booking",
    targetId: bookingId,
    metadata: { appointmentDate, appointmentTime },
  });
  revalidatePath("/admin");
}

export async function setBookingAmountAction(formData: FormData) {
  const actor = await assertAdmin();
  if (!actor) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return;

  // Blank clears the assessed amount; otherwise store a sane non-negative peso integer.
  const raw = cleanText(formData.get("confirmedAmount"));
  let amount: number | null = null;
  if (raw !== null) {
    const parsed = Math.round(Number(raw));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) return;
    amount = parsed;
  }

  const updated = await setBookingConfirmedAmount(bookingId, amount);
  if (!updated) return;
  await recordAdminAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "booking.amount.update",
    targetType: "booking",
    targetId: bookingId,
    metadata: { amount },
  });
  revalidatePath("/admin");
}

export async function updateBookingNotesAction(formData: FormData) {
  const actor = await assertAdmin();
  if (!actor) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return;

  const notes = cleanText(formData.get("notes"));
  await updateBookingNotes(bookingId, notes);
  await recordAdminAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "booking.notes.update",
    targetType: "booking",
    targetId: bookingId,
    metadata: { hasNotes: Boolean(notes) },
  });
  revalidatePath("/admin");
}

export async function updatePatientProfileAction(formData: FormData) {
  const actor = await assertAdmin();
  if (!actor) return;

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await updatePatientAdminProfile({
    userId,
    phone: cleanText(formData.get("phone")),
    address: cleanText(formData.get("address")),
    emergencyContact: cleanText(formData.get("emergencyContact")),
    allergies: cleanText(formData.get("allergies")),
    medications: cleanText(formData.get("medications")),
    contraindications: cleanText(formData.get("contraindications")),
  });
  await recordAdminAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "patient.profile.update",
    targetType: "patient",
    targetId: userId,
    metadata: { source: "admin" },
  });
  revalidatePath("/admin");
}

export async function sendDoctorMessageAction(formData: FormData) {
  const actor = await assertAdmin();
  if (!actor) return;

  const patientId = String(formData.get("patientId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  if (!patientId || !message) return;

  await createDoctorMessage(patientId, message);
  await recordAdminAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "message.doctor_reply",
    targetType: "patient",
    targetId: patientId,
    metadata: { length: message.length },
  });
  revalidatePath("/admin");
  revalidatePath("/messages");
}

export async function syncCalendlyAction() {
  const actor = await assertAdmin();
  if (!actor) return;

  let destination = "/admin?calendly=error";
  try {
    const result = await syncCalendlyBookings({ force: true });
    await recordAdminAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "calendly.sync.manual",
      targetType: "integration",
      targetId: "calendly",
      metadata: {
        skipped: result.skipped,
        eventsScanned: result.eventsScanned,
        inviteesScanned: result.inviteesScanned,
        schedulesUpdated: result.schedulesUpdated,
        schedulesCleared: result.schedulesCleared,
      },
    });
    revalidatePath("/admin");

    const params = new URLSearchParams({
      calendly: result.skipped ? "busy" : "success",
      updated: String(result.schedulesUpdated),
      cleared: String(result.schedulesCleared),
    });
    destination = `/admin?${params.toString()}`;
  } catch (error) {
    console.error("[admin] manual Calendly sync failed:", error);
  }

  redirect(destination);
}
