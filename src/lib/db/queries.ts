import { getSql } from "./client";
import type { BookingStatus, Json, PatientProfile, PaymentStatus, UserProfile } from "./types";

/**
 * Data-access layer for the BetterSelf patient flow.
 *
 * Neon stores the data; Clerk supplies the authenticated user ID. Authorization
 * is enforced by the caller (Server Components / Route Handlers) BEFORE these
 * functions run — see database/schema.sql. Every value is passed through Neon's
 * tagged-template parameterization, so these queries are safe from injection.
 *
 * Monetary amounts are stored in PHP pesos (the human-readable total the patient
 * sees), not centavos.
 */

export type EnsureUserProfileInput = {
  id: string; // Clerk user ID
  fullName: string;
  email: string;
  phone?: string | null;
};

/** Insert the Clerk user into user_profiles, or refresh contact details if it exists. */
export async function ensureUserProfile(input: EnsureUserProfileInput) {
  const sql = getSql();
  await sql`
    insert into public.user_profiles (id, full_name, email, phone, role)
    values (${input.id}, ${input.fullName}, ${input.email}, ${input.phone ?? null}, 'patient')
    on conflict (id) do update set
      full_name = excluded.full_name,
      email = excluded.email,
      phone = coalesce(excluded.phone, public.user_profiles.phone)
  `;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const sql = getSql();
  const rows = (await sql`
    select * from public.user_profiles where id = ${userId}
  `) as unknown as UserProfile[];
  return rows[0] ?? null;
}

export type UpsertPatientProfileInput = {
  userId: string;
  address?: string | null;
  emergencyContact?: string | null;
};

/** Create or update the patient_profiles row for a Clerk user. */
export async function upsertPatientProfile(input: UpsertPatientProfileInput) {
  const sql = getSql();
  await sql`
    insert into public.patient_profiles (user_id, address, emergency_contact, profile_completion_status, updated_at)
    values (${input.userId}, ${input.address ?? null}, ${input.emergencyContact ?? null}, 'in_progress', now())
    on conflict (user_id) do update set
      address = coalesce(excluded.address, public.patient_profiles.address),
      emergency_contact = coalesce(excluded.emergency_contact, public.patient_profiles.emergency_contact),
      updated_at = now()
  `;
}

export type RecordAccountConsentInput = {
  userId: string;
  consentVersion: string;
  acceptedAt?: string | null;
  acceptedItems: unknown[];
  userAgent?: string | null;
};

/** Store account-level legal/privacy/data consent after Clerk signup. */
export async function recordAccountConsent(input: RecordAccountConsentInput) {
  const sql = getSql();
  await sql`
    insert into public.account_consents
      (user_id, consent_version, accepted_at, accepted_items, user_agent)
    values
      (${input.userId}, ${input.consentVersion},
       coalesce(${input.acceptedAt ?? null}::timestamptz, now()),
       ${JSON.stringify(input.acceptedItems)}::jsonb,
       ${input.userAgent ?? null})
  `;
}

export async function getPatientProfile(userId: string): Promise<PatientProfile | null> {
  const sql = getSql();
  const rows = (await sql`
    select * from public.patient_profiles where user_id = ${userId}
  `) as unknown as PatientProfile[];
  return rows[0] ?? null;
}

export type CreateBookingInput = {
  patientId: string;
  treatmentId: string;
  appointmentType: string;
  location: string;
  notes?: string | null;
};

export type CreatedBooking = { id: string };

/** Insert a booking (status: pending_doctor_review, payment: pending). Returns its id. */
export async function createBooking(input: CreateBookingInput): Promise<CreatedBooking> {
  const sql = getSql();
  const rows = (await sql`
    insert into public.bookings
      (patient_id, treatment_id, appointment_type, location, status, payment_status, notes)
    values
      (${input.patientId}, ${input.treatmentId}, ${input.appointmentType}, ${input.location},
       'pending_doctor_review', 'pending', ${input.notes ?? null})
    returning id
  `) as unknown as CreatedBooking[];
  return rows[0];
}

export type CreatePaymentInput = {
  bookingId: string;
  patientId: string;
  amount: number; // PHP pesos
  paymentType: string;
  transactionReference?: string | null;
  paymongoCheckoutId?: string | null;
};

/** Record a pending payment linked to a booking. */
export async function createPayment(input: CreatePaymentInput) {
  const sql = getSql();
  await sql`
    insert into public.payments
      (booking_id, patient_id, amount, currency, payment_type, status, transaction_reference, paymongo_checkout_id)
    values
      (${input.bookingId}, ${input.patientId}, ${input.amount}, 'PHP', ${input.paymentType},
       'pending', ${input.transactionReference ?? null}, ${input.paymongoCheckoutId ?? null})
  `;
}

export type CreateMedicalIntakeInput = {
  patientId: string;
  bookingId: string;
  answers: Json;
  consentConfirmed: boolean;
};

/** Persist the patient's screening answers + consent for a booking. */
export async function createMedicalIntake(input: CreateMedicalIntakeInput) {
  const sql = getSql();
  await sql`
    insert into public.medical_intakes
      (patient_id, booking_id, answers, consent_confirmed, doctor_review_status)
    values
      (${input.patientId}, ${input.bookingId}, ${JSON.stringify(input.answers)}::jsonb,
       ${input.consentConfirmed}, 'submitted')
  `;
}

export type PatientBookingView = {
  id: string;
  treatment_id: string;
  treatment_name: string;
  appointment_type: string;
  location: string;
  appointment_date: string | null;
  appointment_time: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus;
  notes: string | null;
  amount: number | null;
  confirmed_amount: number | null;
  payment_type: string | null;
  transaction_reference: string | null;
  paymongo_checkout_id: string | null;
  payment_created_at: string | null;
  treatment_price_label: string;
  created_at: string;
};

export type RetryableBookingCheckout = {
  id: string;
  patient_id: string;
  treatment_id: string;
  treatment_name: string;
  treatment_description: string;
  appointment_type: string;
  location: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount: number;
  payment_type: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  patient_address: string | null;
};

/** All of a patient's bookings, newest first, with treatment name and latest payment amount. */
export async function getPatientBookings(patientId: string): Promise<PatientBookingView[]> {
  const sql = getSql();
  const rows = (await sql`
    select
      b.id,
      b.treatment_id,
      t.name as treatment_name,
      b.appointment_type,
      b.location,
      b.appointment_date,
      b.appointment_time,
      b.status,
      b.payment_status,
      b.notes,
      b.confirmed_amount,
      t.price_label as treatment_price_label,
      p.amount,
      p.payment_type,
      p.transaction_reference,
      p.paymongo_checkout_id,
      p.created_at as payment_created_at,
      b.created_at
    from public.bookings b
    join public.treatments t on t.id = b.treatment_id
    left join lateral (
      select *
      from public.payments p
      where p.booking_id = b.id
      order by p.created_at desc
      limit 1
    ) p on true
    where b.patient_id = ${patientId}
    order by b.created_at desc
  `) as unknown as PatientBookingView[];
  return rows;
}

export async function getRetryableBookingForCheckout(
  patientId: string,
  bookingId: string,
): Promise<RetryableBookingCheckout | null> {
  const sql = getSql();
  const rows = (await sql`
    select
      b.id,
      b.patient_id,
      b.treatment_id,
      t.name as treatment_name,
      t.description as treatment_description,
      b.appointment_type,
      b.location,
      b.status,
      b.payment_status,
      coalesce(p.amount, b.confirmed_amount, t.starting_price) as amount,
      coalesce(
        p.payment_type,
        case when b.treatment_id = 'doctor-consultation' then 'consultation' else 'treatment' end
      ) as payment_type,
      u.full_name as patient_name,
      u.email as patient_email,
      u.phone as patient_phone,
      pp.address as patient_address
    from public.bookings b
    join public.treatments t on t.id = b.treatment_id
    join public.user_profiles u on u.id = b.patient_id
    left join public.patient_profiles pp on pp.user_id = b.patient_id
    left join lateral (
      select *
      from public.payments p
      where p.booking_id = b.id
      order by p.created_at desc
      limit 1
    ) p on true
    where b.id::text = ${bookingId}
      and b.patient_id = ${patientId}
    limit 1
  `) as unknown as RetryableBookingCheckout[];
  return rows[0] ?? null;
}

/**
 * Doctor sets the assessed total (pesos) on a booking — used for unit/area-priced
 * treatments so the patient is charged the real amount, not the base starting price.
 * Pass null to clear it.
 */
export async function setBookingConfirmedAmount(bookingId: string, amount: number | null) {
  const sql = getSql();
  await sql`
    update public.bookings
    set confirmed_amount = ${amount}, updated_at = now()
    where id::text = ${bookingId}
  `;
}

/**
 * Patient cancels their own booking. Enforced in SQL: only the owner, only while
 * unpaid, and only if not already completed/cancelled. Returns true if a row was
 * cancelled.
 */
export async function cancelPatientBooking(
  bookingId: string,
  patientId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    update public.bookings
    set status = 'cancelled', updated_at = now()
    where id::text = ${bookingId}
      and patient_id = ${patientId}
      and payment_status <> 'paid'
      and status not in ('completed', 'cancelled')
    returning id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

export type AdminBookingView = {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  patient_address: string | null;
  patient_emergency_contact: string | null;
  patient_allergies: string | null;
  patient_medications: string | null;
  patient_contraindications: string | null;
  profile_completion_status: string | null;
  treatment_id: string;
  treatment_name: string;
  treatment_category: string;
  treatment_price_label: string;
  requires_doctor_approval: boolean;
  appointment_type: string;
  location: string;
  appointment_date: string | null;
  appointment_time: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount: number | null;
  confirmed_amount: number | null;
  payment_currency: string | null;
  payment_type: string | null;
  transaction_reference: string | null;
  paymongo_checkout_id: string | null;
  payment_created_at: string | null;
  intake_answers: Json | null;
  intake_consent_confirmed: boolean | null;
  intake_review_status: string | null;
  intake_doctor_notes: string | null;
  notes: string | null;
  patient_total_bookings: number;
  patient_paid_bookings: number;
  patient_total_spend: number | null;
  created_at: string;
  updated_at: string;
};

/** All bookings across patients, newest first — for the doctor/admin dashboard. */
export async function getAllBookings(): Promise<AdminBookingView[]> {
  const sql = getSql();
  const rows = (await sql`
    select
      b.id,
      b.patient_id,
      u.full_name as patient_name,
      u.email as patient_email,
      u.phone as patient_phone,
      pp.address as patient_address,
      pp.emergency_contact as patient_emergency_contact,
      pp.allergies as patient_allergies,
      pp.medications as patient_medications,
      pp.contraindications as patient_contraindications,
      pp.profile_completion_status,
      b.treatment_id,
      t.name as treatment_name,
      t.category as treatment_category,
      t.price_label as treatment_price_label,
      t.requires_doctor_approval,
      b.appointment_type,
      b.location,
      b.appointment_date,
      b.appointment_time,
      b.status,
      b.payment_status,
      p.amount,
      b.confirmed_amount,
      p.currency as payment_currency,
      p.payment_type,
      p.transaction_reference,
      p.paymongo_checkout_id,
      p.created_at as payment_created_at,
      mi.answers as intake_answers,
      mi.consent_confirmed as intake_consent_confirmed,
      mi.doctor_review_status as intake_review_status,
      mi.doctor_notes as intake_doctor_notes,
      b.notes,
      (
        select count(*)::int from public.bookings patient_bookings
        where patient_bookings.patient_id = b.patient_id
      ) as patient_total_bookings,
      (
        select count(*)::int from public.bookings patient_bookings
        where patient_bookings.patient_id = b.patient_id
          and patient_bookings.payment_status = 'paid'
      ) as patient_paid_bookings,
      (
        select coalesce(sum(payments.amount), 0)::int
        from public.payments payments
        where payments.patient_id = b.patient_id
          and payments.status = 'paid'
      ) as patient_total_spend,
      b.created_at,
      b.updated_at
    from public.bookings b
    join public.user_profiles u on u.id = b.patient_id
    join public.treatments t on t.id = b.treatment_id
    left join public.patient_profiles pp on pp.user_id = b.patient_id
    left join lateral (
      select *
      from public.payments p
      where p.booking_id = b.id
      order by p.created_at desc
      limit 1
    ) p on true
    left join lateral (
      select *
      from public.medical_intakes mi
      where mi.booking_id = b.id
      order by mi.created_at desc
      limit 1
    ) mi on true
    order by b.created_at desc
  `) as unknown as AdminBookingView[];
  return rows;
}

/**
 * Update a booking's review status (admin/doctor action). Uses id::text so a
 * malformed id can't throw "invalid input syntax for type uuid", and refuses to
 * move a patient-cancelled booking back to an active state (which would re-expose
 * the "Pay now" button on a dead booking).
 */
export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const sql = getSql();
  await sql`
    update public.bookings
    set status = ${status}, updated_at = now()
    where id::text = ${bookingId}
      and status <> 'cancelled'
  `;
}

/** Set the confirmed appointment date/time for a booking (admin/doctor). */
export async function updateBookingSchedule(
  bookingId: string,
  appointmentDate: string | null,
  appointmentTime: string | null,
) {
  const sql = getSql();
  await sql`
    update public.bookings
    set appointment_date = ${appointmentDate}::date,
        appointment_time = ${appointmentTime},
        updated_at = now()
    where id::text = ${bookingId}
  `;
}

export async function updateBookingNotes(bookingId: string, notes: string | null) {
  const sql = getSql();
  await sql`
    update public.bookings set notes = ${notes}, updated_at = now() where id::text = ${bookingId}
  `;
}

export async function updateBookingPaymentStatus(
  bookingId: string,
  status: PaymentStatus,
) {
  const sql = getSql();
  await sql`
    update public.bookings
    set payment_status = ${status}, updated_at = now()
    where id::text = ${bookingId}
  `;
  // Target the newest still-PENDING payment row first (a stale resolved row may be
  // newer), falling back to the newest row, so admin "mark paid" hits the real one.
  await sql`
    update public.payments
    set status = ${status}
    where id = (
      select id from public.payments
      where booking_id::text = ${bookingId}
      order by (status = 'pending') desc, created_at desc
      limit 1
    )
  `;
}

export async function updateMedicalIntakeReview(
  bookingId: string,
  status: string,
  doctorNotes: string | null,
) {
  const sql = getSql();
  await sql`
    update public.medical_intakes
    set doctor_review_status = ${status}::public.intake_review_status,
        doctor_notes = ${doctorNotes},
        updated_at = now()
    where id = (
      select id from public.medical_intakes
      where booking_id::text = ${bookingId}
      order by created_at desc
      limit 1
    )
  `;
}

export async function updatePatientAdminProfile(input: {
  userId: string;
  phone?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  allergies?: string | null;
  medications?: string | null;
  contraindications?: string | null;
}) {
  const sql = getSql();
  await sql`
    update public.user_profiles
    set phone = coalesce(${input.phone ?? null}, phone)
    where id = ${input.userId}
  `;
  // coalesce(excluded.*, existing) so saving a partial admin form never wipes
  // previously stored fields (esp. allergies/medications/contraindications) with blanks.
  await sql`
    insert into public.patient_profiles
      (user_id, address, emergency_contact, allergies, medications, contraindications,
       profile_completion_status, updated_at)
    values
      (${input.userId}, ${input.address ?? null}, ${input.emergencyContact ?? null},
       ${input.allergies ?? null}, ${input.medications ?? null},
       ${input.contraindications ?? null}, 'admin_reviewed', now())
    on conflict (user_id) do update set
      address = coalesce(excluded.address, public.patient_profiles.address),
      emergency_contact = coalesce(excluded.emergency_contact, public.patient_profiles.emergency_contact),
      allergies = coalesce(excluded.allergies, public.patient_profiles.allergies),
      medications = coalesce(excluded.medications, public.patient_profiles.medications),
      contraindications = coalesce(excluded.contraindications, public.patient_profiles.contraindications),
      profile_completion_status = excluded.profile_completion_status,
      updated_at = now()
  `;
}

/**
 * Mark a booking + its payment as paid, identified by the checkout reference number.
 * Called from the PayMongo webhook. Returns the number of payment rows updated.
 */
export async function markPaidByReference(referenceNumber: string): Promise<number> {
  const sql = getSql();
  const updated = (await sql`
    update public.payments
    set status = 'paid'
    where transaction_reference = ${referenceNumber}
      and status = 'pending'
    returning booking_id
  `) as unknown as { booking_id: string }[];

  for (const row of updated) {
    // Never resurrect a cancelled booking to paid. If money was captured against a
    // cancelled booking, the payment row is still marked paid above — log it so the
    // booking can be reconciled/refunded manually.
    const bookingUpdated = (await sql`
      update public.bookings
      set payment_status = 'paid',
          status = case
            when treatment_id = 'doctor-consultation' and status = 'pending_doctor_review'
              then 'confirmed'::public.booking_status
            else status
          end,
          updated_at = now()
      where id = ${row.booking_id}
        and status <> 'cancelled'
      returning id
    `) as unknown as { id: string }[];
    if (bookingUpdated.length === 0) {
      console.error(
        `[markPaidByReference] payment captured (ref ${referenceNumber}) for booking ${row.booking_id}, but it is cancelled — needs manual reconciliation/refund.`,
      );
    }
  }
  return updated.length;
}
