import { getSql } from "./client";
import { SUPPORT_EMAIL } from "@/lib/contact";
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

export const MEDICAL_TEAM_USER_ID = "betterself-medical-team";
export const MEDICAL_TEAM_NAME = "BetterSelf medical team";

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

export async function ensureMedicalTeamProfile() {
  const sql = getSql();
  await sql`
    insert into public.user_profiles (id, full_name, email, role)
    values (${MEDICAL_TEAM_USER_ID}, ${MEDICAL_TEAM_NAME}, ${SUPPORT_EMAIL}, 'doctor')
    on conflict (id) do update set
      full_name = excluded.full_name,
      email = excluded.email,
      role = excluded.role
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

export type PendingPaymentAttempt = {
  id: string;
  booking_id: string;
  patient_id: string;
  amount: number;
  currency: string;
  payment_type: string;
  status: PaymentStatus;
  transaction_reference: string;
  paymongo_checkout_id: string | null;
};

/**
 * Return the one active QR attempt for a booking, or create it. The partial unique
 * index added in the payment-state migration makes a second active QR impossible
 * even when a patient double-clicks or two requests reach the server together.
 */
export async function createOrReusePendingPayment(input: Required<
  Pick<CreatePaymentInput, "bookingId" | "patientId" | "amount" | "paymentType" | "transactionReference">
>): Promise<{ attempt: PendingPaymentAttempt; reused: boolean }> {
  const sql = getSql();
  const existing = (await sql`
    select id, booking_id, patient_id, amount, currency, payment_type, status,
           transaction_reference, paymongo_checkout_id
    from public.payments
    where booking_id = ${input.bookingId} and status = 'pending'
    order by created_at desc
    limit 1
  `) as unknown as PendingPaymentAttempt[];
  if (existing[0]) return { attempt: existing[0], reused: true };

  try {
    const created = (await sql`
      insert into public.payments
        (booking_id, patient_id, amount, currency, payment_type, status, transaction_reference)
      values
        (${input.bookingId}, ${input.patientId}, ${input.amount}, 'PHP', ${input.paymentType},
         'pending', ${input.transactionReference})
      returning id, booking_id, patient_id, amount, currency, payment_type, status,
                transaction_reference, paymongo_checkout_id
    `) as unknown as PendingPaymentAttempt[];
    if (created[0]) return { attempt: created[0], reused: false };
  } catch (error) {
    // A simultaneous request can lose the partial-unique-index race. Read the
    // winning attempt and deliberately reuse it rather than issuing another QR.
    const winner = (await sql`
      select id, booking_id, patient_id, amount, currency, payment_type, status,
             transaction_reference, paymongo_checkout_id
      from public.payments
      where booking_id = ${input.bookingId} and status = 'pending'
      order by created_at desc
      limit 1
    `) as unknown as PendingPaymentAttempt[];
    if (winner[0]) return { attempt: winner[0], reused: true };
    throw error;
  }

  throw new Error("Could not create a payment attempt.");
}

export async function attachPayMongoCheckout(input: {
  transactionReference: string;
  paymongoCheckoutId: string;
}) {
  const sql = getSql();
  await sql`
    update public.payments
    set paymongo_checkout_id = ${input.paymongoCheckoutId}
    where transaction_reference = ${input.transactionReference}
      and status = 'pending'
      and (paymongo_checkout_id is null or paymongo_checkout_id = ${input.paymongoCheckoutId})
  `;
}

export async function markPendingPaymentAttemptFailed(transactionReference: string) {
  const sql = getSql();
  await sql`
    update public.payments
    set status = 'failed'
    where transaction_reference = ${transactionReference}
      and status = 'pending'
      and paymongo_checkout_id is null
  `;
}

/**
 * Close a pending checkout when its signed-in patient returns from PayMongo's
 * cancellation URL. The patient ownership guard prevents arbitrary visitors
 * from invalidating someone else's checkout reference.
 */
export async function markPatientPendingPaymentAttemptFailed(
  transactionReference: string,
  patientId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    update public.payments p
    set status = 'failed'
    from public.bookings b
    where p.booking_id = b.id
      and p.transaction_reference = ${transactionReference}
      and p.status = 'pending'
      and b.patient_id = ${patientId}
      and b.status <> 'cancelled'
      and b.payment_status <> 'paid'
    returning p.id
  `) as unknown as { id: string }[];
  return rows.length > 0;
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

/** Atomically persist the clinical request and its required intake. */
export async function createBookingWithMedicalIntake(input: CreateBookingInput & {
  answers: Json;
  consentConfirmed: boolean;
}): Promise<CreatedBooking> {
  const sql = getSql();
  const rows = (await sql`
    with created_booking as (
      insert into public.bookings
        (patient_id, treatment_id, appointment_type, location, status, payment_status, notes)
      values
        (${input.patientId}, ${input.treatmentId}, ${input.appointmentType}, ${input.location},
         'pending_doctor_review', 'pending', ${input.notes ?? null})
      returning id
    ), created_intake as (
      insert into public.medical_intakes
        (patient_id, booking_id, answers, consent_confirmed, doctor_review_status)
      select ${input.patientId}, id, ${JSON.stringify(input.answers)}::jsonb,
             ${input.consentConfirmed}, 'submitted'
      from created_booking
    )
    select id from created_booking
  `) as unknown as CreatedBooking[];
  if (!rows[0]) throw new Error("Booking intake transaction did not return a booking.");
  return rows[0];
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
  amount: number | null;
  payment_type: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  patient_address: string | null;
};

export type PaymentReconciliationTarget = {
  booking_id: string;
  patient_id: string;
  booking_payment_status: PaymentStatus;
  payment_status: PaymentStatus | null;
  transaction_reference: string | null;
  paymongo_checkout_id: string | null;
};

export type PaidConsultationByReference = {
  booking_id: string;
  patient_id: string;
  patient_email: string;
};

export async function getPaidConsultationByPaymentReference(
  referenceNumber: string,
  patientId?: string | null,
): Promise<PaidConsultationByReference | null> {
  const sql = getSql();
  const rows = (await sql`
    select
      b.id as booking_id,
      b.patient_id,
      u.email as patient_email
    from public.bookings b
    join public.payments p on p.booking_id = b.id
    join public.user_profiles u on u.id = b.patient_id
    where p.transaction_reference = ${referenceNumber}
      and p.status = 'paid'
      and b.payment_status = 'paid'
      and b.status <> 'cancelled'
      and b.treatment_id = 'doctor-consultation'
      and (${patientId ?? null}::text is null or b.patient_id = ${patientId ?? null})
    order by p.created_at desc
    limit 1
  `) as unknown as PaidConsultationByReference[];
  return rows[0] ?? null;
}

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
      case
        when b.confirmed_amount is not null then b.confirmed_amount
        when b.treatment_id = 'doctor-consultation' then coalesce(p.amount, t.starting_price)
        when t.price_label ~* '/(unit|area|piece)' then null
        else coalesce(p.amount, t.starting_price)
      end as amount,
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

export async function getPaymentReconciliationTarget(
  patientId: string,
  bookingId: string,
): Promise<PaymentReconciliationTarget | null> {
  const sql = getSql();
  const rows = (await sql`
    select
      b.id as booking_id,
      b.patient_id,
      b.payment_status as booking_payment_status,
      p.status as payment_status,
      p.transaction_reference,
      p.paymongo_checkout_id
    from public.bookings b
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
  `) as unknown as PaymentReconciliationTarget[];
  return rows[0] ?? null;
}

/**
 * Doctor sets the assessed total (pesos) on a booking — used for unit/area-priced
 * treatments so the patient is charged the real amount, not the base starting price.
 * Pass null to clear it.
 */
export async function setBookingConfirmedAmount(
  bookingId: string,
  amount: number | null,
): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    update public.bookings
    set confirmed_amount = ${amount}, updated_at = now()
    where id::text = ${bookingId}
      and status <> 'cancelled'
      and payment_status <> 'paid'
    returning id
  `) as unknown as { id: string }[];
  return rows.length > 0;
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
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<boolean> {
  const sql = getSql();
  if (status === "completed") {
    const rows = (await sql`
      update public.bookings
      set status = ${status}, updated_at = now()
      where id::text = ${bookingId}
        and status <> 'cancelled'
        and payment_status = 'paid'
      returning id
    `) as unknown as { id: string }[];
    return rows.length > 0;
  }

  const rows = (await sql`
    update public.bookings
    set status = ${status}, updated_at = now()
    where id::text = ${bookingId}
      and status <> 'cancelled'
      and payment_status <> 'paid'
    returning id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

/**
 * Open payment only after the clinician explicitly approved intake and set the
 * appropriate total for variable-price treatments. This is the only route to
 * `ready_for_payment`; `confirmed` is reserved for a paid appointment.
 */
export async function markBookingReadyForPayment(bookingId: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    update public.bookings b
    set status = 'ready_for_payment', updated_at = now()
    where b.id::text = ${bookingId}
      and b.status in ('pending_doctor_review', 'needs_more_information')
      and b.payment_status in ('pending', 'refunded', 'failed')
      and b.treatment_id <> 'doctor-consultation'
      and exists (
        select 1 from public.medical_intakes mi
        where mi.booking_id = b.id and mi.doctor_review_status = 'approved'
      )
      and (
        b.confirmed_amount is not null
        or exists (
          select 1 from public.treatments t
          where t.id = b.treatment_id and t.price_label !~* '/(unit|area|piece)'
        )
      )
    returning b.id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

/** Set the confirmed appointment date/time for a booking (admin/doctor). */
export async function updateBookingSchedule(
  bookingId: string,
  appointmentDate: string | null,
  appointmentTime: string | null,
): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    update public.bookings
    set appointment_date = ${appointmentDate}::date,
        appointment_time = ${appointmentTime},
        updated_at = now()
    where id::text = ${bookingId}
      and payment_status = 'paid'
    returning id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

export async function updateBookingNotes(bookingId: string, notes: string | null) {
  const sql = getSql();
  await sql`
    update public.bookings set notes = ${notes}, updated_at = now() where id::text = ${bookingId}
  `;
}

function mergeBookingNotes(
  existing: string | null,
  replacements: Record<string, string | null | undefined>,
) {
  const prefixes = Object.keys(replacements).map((label) => `${label}:`);
  const kept = (existing ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !prefixes.some((prefix) => line.startsWith(prefix)));
  const added = Object.entries(replacements)
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${value}`);
  const merged = [...kept, ...added].join("\n");
  return merged || null;
}

export type CalendlyBookingScheduleInput = {
  referenceNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  inviteeEmail?: string | null;
  eventUri?: string | null;
  inviteeUri?: string | null;
  videoCallUrl?: string | null;
  timezone?: string | null;
  eventName?: string | null;
};

export async function updateBookingScheduleByPaymentReference(
  input: CalendlyBookingScheduleInput,
): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    select b.id, b.notes
    from public.bookings b
    join public.payments p on p.booking_id = b.id
    join public.user_profiles u on u.id = b.patient_id
    where p.transaction_reference = ${input.referenceNumber}
      and p.status = 'paid'
      and b.payment_status = 'paid'
      and b.status <> 'cancelled'
      and b.treatment_id = 'doctor-consultation'
      and (
        ${input.inviteeEmail ?? null}::text is null
        or lower(u.email) = lower(${input.inviteeEmail ?? null})
      )
    order by p.created_at desc
    limit 1
  `) as unknown as { id: string; notes: string | null }[];

  const booking = rows[0];
  if (!booking) return 0;

  const notes = mergeBookingNotes(booking.notes, {
    "Calendly event": input.eventUri,
    "Calendly invitee": input.inviteeUri,
    "Video call": input.videoCallUrl,
    "Calendly timezone": input.timezone,
    "Calendly event name": input.eventName,
  });

  const updated = (await sql`
    update public.bookings
    set appointment_date = ${input.appointmentDate}::date,
        appointment_time = ${input.appointmentTime},
        notes = ${notes},
        updated_at = now()
    where id = ${booking.id}
    returning id
  `) as unknown as { id: string }[];

  return updated.length;
}

export type CalendlyEmailBookingScheduleInput = Omit<
  CalendlyBookingScheduleInput,
  "referenceNumber"
> & {
  inviteeEmail: string;
  scheduledStartAt: string;
};

export async function updateLatestPaidConsultationScheduleByPatientEmail(
  input: CalendlyEmailBookingScheduleInput,
): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    with eligible as (
      select b.id, b.notes, b.created_at
      from public.bookings b
      join public.user_profiles u on u.id = b.patient_id
      where lower(u.email) = lower(${input.inviteeEmail})
        and b.treatment_id = 'doctor-consultation'
        and b.payment_status = 'paid'
        and b.status <> 'cancelled'
        and b.appointment_date is null
        and b.created_at <= ${input.scheduledStartAt}::timestamptz
    )
    select id, notes
    from eligible
    where (select count(*) from eligible) = 1
    order by created_at desc
    limit 1
  `) as unknown as { id: string; notes: string | null }[];

  const booking = rows[0];
  if (!booking) return 0;

  const notes = mergeBookingNotes(booking.notes, {
    "Calendly event": input.eventUri,
    "Calendly invitee": input.inviteeUri,
    "Video call": input.videoCallUrl,
    "Calendly timezone": input.timezone,
    "Calendly event name": input.eventName,
    "Calendly matched by": "invitee email",
  });

  const updated = (await sql`
    update public.bookings
    set appointment_date = ${input.appointmentDate}::date,
        appointment_time = ${input.appointmentTime},
        notes = ${notes},
        updated_at = now()
    where id = ${booking.id}
    returning id
  `) as unknown as { id: string }[];

  return updated.length;
}

export async function clearInvalidEmailMatchedCalendlySchedules(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    select id, notes
    from public.bookings
    where notes like '%Calendly matched by: invitee email%'
      and appointment_date is not null
      and appointment_date < created_at::date
  `) as unknown as { id: string; notes: string | null }[];

  let cleared = 0;
  for (const booking of rows) {
    const notes = mergeBookingNotes(booking.notes, {
      "Calendly event": null,
      "Calendly invitee": null,
      "Video call": null,
      "Calendly timezone": null,
      "Calendly event name": null,
      "Calendly matched by": null,
    });

    const updated = (await sql`
      update public.bookings
      set appointment_date = null,
          appointment_time = null,
          notes = ${notes},
          updated_at = now()
      where id = ${booking.id}
      returning id
    `) as unknown as { id: string }[];
    cleared += updated.length;
  }

  return cleared;
}

export async function clearBookingScheduleByPaymentReference(
  referenceNumber: string,
  cancelledAt: string | null,
  inviteeEmail?: string | null,
): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    select b.id, b.notes
    from public.bookings b
    join public.payments p on p.booking_id = b.id
    join public.user_profiles u on u.id = b.patient_id
    where p.transaction_reference = ${referenceNumber}
      and p.status = 'paid'
      and b.payment_status = 'paid'
      and b.status <> 'cancelled'
      and b.treatment_id = 'doctor-consultation'
      and (
        ${inviteeEmail ?? null}::text is null
        or lower(u.email) = lower(${inviteeEmail ?? null})
      )
    order by p.created_at desc
    limit 1
  `) as unknown as { id: string; notes: string | null }[];

  const booking = rows[0];
  if (!booking) return 0;

  const notes = mergeBookingNotes(booking.notes, {
    "Calendly event": null,
    "Calendly invitee": null,
    "Video call": null,
    "Calendly timezone": null,
    "Calendly event name": null,
    "Calendly canceled": cancelledAt ?? new Date().toISOString(),
  });

  const updated = (await sql`
    update public.bookings
    set appointment_date = null,
        appointment_time = null,
        notes = ${notes},
        updated_at = now()
    where id = ${booking.id}
    returning id
  `) as unknown as { id: string }[];

  return updated.length;
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
export async function markPaidByReference(input: string | {
  referenceNumber: string;
  paymongoCheckoutId?: string | null;
  paymongoEventId?: string | null;
  paymongoLivemode?: boolean | null;
  eventType?: string | null;
}): Promise<number> {
  const sql = getSql();
  const details = typeof input === "string" ? { referenceNumber: input } : input;
  const updated = (await sql`
    with accepted_event as (
      insert into public.paymongo_webhook_events (id, event_type)
      select ${details.paymongoEventId ?? null}, ${details.eventType ?? 'payment.paid'}
      where ${details.paymongoEventId ?? null}::text is not null
      on conflict (id) do nothing
      returning id
    ), captured_payment as (
      update public.payments p
      set status = 'paid',
          paymongo_event_id = coalesce(${details.paymongoEventId ?? null}, p.paymongo_event_id),
          paymongo_livemode = coalesce(${details.paymongoLivemode ?? null}, p.paymongo_livemode)
      where p.transaction_reference = ${details.referenceNumber}
        and p.status = 'pending'
        and (${details.paymongoCheckoutId ?? null}::text is null
          or p.paymongo_checkout_id = ${details.paymongoCheckoutId ?? null})
        and (${details.paymongoEventId ?? null}::text is null
          or exists (select 1 from accepted_event))
      returning p.booking_id
    ), updated_booking as (
      update public.bookings b
      set payment_status = 'paid',
          status = case
            when b.treatment_id = 'doctor-consultation' and b.status = 'pending_doctor_review'
              then 'confirmed'::public.booking_status
            when b.status = 'ready_for_payment'
              then 'confirmed'::public.booking_status
            else b.status
          end,
          updated_at = now()
      from captured_payment cp
      where b.id = cp.booking_id and b.status <> 'cancelled'
      returning b.id
    )
    select booking_id from captured_payment
  `) as unknown as { booking_id: string }[];

  return updated.length;
}

export type MessageView = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  attachment_url: string | null;
  created_at: string;
  sender_role: "patient" | "doctor";
};

export type MessageThreadView = {
  patient_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  last_message: string;
  last_message_at: string;
  last_sender_role: "patient" | "doctor";
};

export async function getMessageThreads(limit = 20): Promise<MessageThreadView[]> {
  const sql = getSql();
  await ensureMedicalTeamProfile();
  const rows = (await sql`
    with thread_patients as (
      select distinct
        case
          when sender_id = ${MEDICAL_TEAM_USER_ID} then receiver_id
          else sender_id
        end as patient_id
      from public.messages
      where sender_id = ${MEDICAL_TEAM_USER_ID}
         or receiver_id = ${MEDICAL_TEAM_USER_ID}
    )
    select
      tp.patient_id,
      u.full_name as patient_name,
      u.email as patient_email,
      u.phone as patient_phone,
      latest.message_text as last_message,
      latest.created_at as last_message_at,
      case
        when latest.sender_id = ${MEDICAL_TEAM_USER_ID} then 'doctor'
        else 'patient'
      end as last_sender_role
    from thread_patients tp
    join public.user_profiles u on u.id = tp.patient_id
    join lateral (
      select m.sender_id, m.message_text, m.created_at
      from public.messages m
      where (
        m.sender_id = tp.patient_id and m.receiver_id = ${MEDICAL_TEAM_USER_ID}
      ) or (
        m.sender_id = ${MEDICAL_TEAM_USER_ID} and m.receiver_id = tp.patient_id
      )
      order by m.created_at desc
      limit 1
    ) latest on true
    order by latest.created_at desc
    limit ${Math.max(1, Math.min(limit, 100))}
  `) as unknown as MessageThreadView[];
  return rows;
}

export async function getPatientMessages(patientId: string): Promise<MessageView[]> {
  const sql = getSql();
  await ensureMedicalTeamProfile();
  const rows = (await sql`
    select
      m.id,
      m.sender_id,
      m.receiver_id,
      m.message_text,
      m.attachment_url,
      m.created_at,
      case
        when m.sender_id = ${MEDICAL_TEAM_USER_ID} then 'doctor'
        else 'patient'
      end as sender_role
    from public.messages m
    where (
      m.sender_id = ${patientId} and m.receiver_id = ${MEDICAL_TEAM_USER_ID}
    ) or (
      m.sender_id = ${MEDICAL_TEAM_USER_ID} and m.receiver_id = ${patientId}
    )
    order by m.created_at asc
  `) as unknown as MessageView[];
  return rows;
}

export async function createPatientMessage(patientId: string, messageText: string) {
  const sql = getSql();
  await ensureMedicalTeamProfile();
  await sql`
    insert into public.messages (sender_id, receiver_id, message_text)
    values (${patientId}, ${MEDICAL_TEAM_USER_ID}, ${messageText})
  `;
}

export async function createDoctorMessage(patientId: string, messageText: string) {
  const sql = getSql();
  await ensureMedicalTeamProfile();
  await sql`
    insert into public.messages (sender_id, receiver_id, message_text)
    values (${MEDICAL_TEAM_USER_ID}, ${patientId}, ${messageText})
  `;
}

export type AdminAuditLogInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Json;
};

export async function recordAdminAuditLog(input: AdminAuditLogInput) {
  const sql = getSql();
  try {
    await sql`
      insert into public.admin_audit_logs
        (actor_id, actor_email, action, target_type, target_id, metadata)
      values
        (${input.actorId ?? null}, ${input.actorEmail ?? null}, ${input.action},
         ${input.targetType}, ${input.targetId}, ${JSON.stringify(input.metadata ?? {})}::jsonb)
    `;
  } catch (error) {
    console.error("[admin_audit] failed to write audit log:", error);
  }
}
