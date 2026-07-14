"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import {
  createDoctorMessage,
  recordAdminAuditLog,
  setBookingConfirmedAmount,
  updateBookingNotes,
  updateBookingPaymentStatus,
  updateBookingSchedule,
  updateBookingStatus,
  updateMedicalIntakeReview,
  updatePatientAdminProfile,
} from "@/lib/db/queries";
import type { BookingStatus, IntakeReviewStatus, PaymentStatus } from "@/lib/db/types";

const VALID_STATUSES: BookingStatus[] = [
  "pending_doctor_review",
  "needs_more_information",
  "confirmed",
  "completed",
  "cancelled",
];

const VALID_PAYMENT_STATUSES: PaymentStatus[] = ["not_required", "pending", "paid", "refunded"];
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

  if (!isAdminEmail(email)) return null;
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

  await updateBookingStatus(bookingId, status);
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

export async function updateBookingPaymentStatusAction(formData: FormData) {
  const actor = await assertAdmin();
  if (!actor) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("paymentStatus") ?? "") as PaymentStatus;
  if (!bookingId || !VALID_PAYMENT_STATUSES.includes(status)) return;

  await updateBookingPaymentStatus(bookingId, status);
  await recordAdminAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "booking.payment_status.update",
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

export async function updateBookingScheduleAction(formData: FormData) {
  const actor = await assertAdmin();
  if (!actor) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return;

  const appointmentDate = cleanText(formData.get("appointmentDate"));
  const appointmentTime = cleanText(formData.get("appointmentTime"));
  await updateBookingSchedule(bookingId, appointmentDate, appointmentTime);
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

  await setBookingConfirmedAmount(bookingId, amount);
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
