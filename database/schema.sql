create extension if not exists pgcrypto;

create type public.user_role as enum ('patient', 'doctor', 'admin');
create type public.booking_status as enum (
  'pending_doctor_review',
  'needs_more_information',
  'confirmed',
  'completed',
  'cancelled'
);
create type public.payment_status as enum ('not_required', 'pending', 'paid', 'refunded');
create type public.intake_review_status as enum (
  'not_started',
  'submitted',
  'needs_more_information',
  'approved',
  'rejected'
);

create table public.user_profiles (
  id text primary key,
  full_name text not null,
  email text not null unique,
  phone text,
  role public.user_role not null default 'patient',
  created_at timestamptz not null default now()
);

comment on column public.user_profiles.id is 'Clerk user ID, for example user_abc123.';

create table public.patient_profiles (
  user_id text primary key references public.user_profiles(id) on delete cascade,
  date_of_birth date,
  gender text,
  address text,
  emergency_contact text,
  allergies text,
  medications text,
  contraindications text,
  profile_completion_status text not null default 'incomplete',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.treatments (
  id text primary key,
  name text not null,
  category text not null,
  description text not null,
  duration text not null,
  starting_price integer not null,
  price_label text not null,
  requires_doctor_approval boolean not null default true,
  beforecare text[] not null default '{}',
  aftercare text[] not null default '{}',
  contraindications text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null references public.user_profiles(id) on delete cascade,
  doctor_id text references public.user_profiles(id) on delete set null,
  treatment_id text not null references public.treatments(id),
  appointment_type text not null,
  location text not null,
  appointment_date date,
  appointment_time text,
  status public.booking_status not null default 'pending_doctor_review',
  payment_status public.payment_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.medical_intakes (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null references public.user_profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  answers jsonb not null default '{}',
  photo_uploads text[] not null default '{}',
  consent_confirmed boolean not null default false,
  doctor_review_status public.intake_review_status not null default 'not_started',
  doctor_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null default gen_random_uuid(),
  sender_id text not null references public.user_profiles(id) on delete cascade,
  receiver_id text not null references public.user_profiles(id) on delete cascade,
  message_text text not null,
  attachment_url text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  patient_id text not null references public.user_profiles(id) on delete cascade,
  amount integer not null,
  currency text not null default 'PHP',
  payment_type text not null,
  status public.payment_status not null default 'pending',
  transaction_reference text,
  paymongo_checkout_id text,
  created_at timestamptz not null default now()
);

create table public.aftercare_instructions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  treatment_id text not null references public.treatments(id),
  patient_id text not null references public.user_profiles(id) on delete cascade,
  instructions text not null,
  sent_at timestamptz not null default now()
);

create index bookings_patient_idx on public.bookings(patient_id);
create index bookings_doctor_idx on public.bookings(doctor_id);
create index bookings_status_idx on public.bookings(status);
create index medical_intakes_booking_idx on public.medical_intakes(booking_id);
create index messages_conversation_idx on public.messages(conversation_id, created_at);
create index payments_booking_idx on public.payments(booking_id);

-- Neon stores the data; Clerk supplies the authenticated user ID.
-- Enforce patient/doctor/admin authorization in Next.js Server Components,
-- Server Actions, and Route Handlers before running database queries.
