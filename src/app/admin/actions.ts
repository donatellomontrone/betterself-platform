"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import {
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

  return isAdminEmail(email);
}

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function updateBookingStatusAction(formData: FormData) {
  // Re-check authorization on the server — never trust the client.
  if (!(await assertAdmin())) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;
  if (!bookingId || !VALID_STATUSES.includes(status)) return;

  await updateBookingStatus(bookingId, status);
  revalidatePath("/admin");
}

export async function updateBookingPaymentStatusAction(formData: FormData) {
  if (!(await assertAdmin())) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("paymentStatus") ?? "") as PaymentStatus;
  if (!bookingId || !VALID_PAYMENT_STATUSES.includes(status)) return;

  await updateBookingPaymentStatus(bookingId, status);
  revalidatePath("/admin");
}

export async function updateIntakeReviewAction(formData: FormData) {
  if (!(await assertAdmin())) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("intakeStatus") ?? "") as IntakeReviewStatus;
  if (!bookingId || !VALID_INTAKE_STATUSES.includes(status)) return;

  await updateMedicalIntakeReview(bookingId, status, cleanText(formData.get("doctorNotes")));
  revalidatePath("/admin");
}

export async function updateBookingScheduleAction(formData: FormData) {
  if (!(await assertAdmin())) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return;

  await updateBookingSchedule(
    bookingId,
    cleanText(formData.get("appointmentDate")),
    cleanText(formData.get("appointmentTime")),
  );
  revalidatePath("/admin");
}

export async function setBookingAmountAction(formData: FormData) {
  if (!(await assertAdmin())) return;

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
  revalidatePath("/admin");
}

export async function updateBookingNotesAction(formData: FormData) {
  if (!(await assertAdmin())) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return;

  await updateBookingNotes(bookingId, cleanText(formData.get("notes")));
  revalidatePath("/admin");
}

export async function updatePatientProfileAction(formData: FormData) {
  if (!(await assertAdmin())) return;

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
  revalidatePath("/admin");
}
