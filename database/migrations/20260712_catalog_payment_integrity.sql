-- Keep the production catalog in sync with the application treatment IDs, and
-- harden payment lookups used by PayMongo and Calendly reconciliation.

do $$
begin
  if to_regclass('public.treatments') is null
    or to_regclass('public.bookings') is null
    or to_regclass('public.payments') is null
    or to_regclass('public.medical_intakes') is null
    or to_regclass('public.user_profiles') is null
    or to_regclass('public.messages') is null
  then
    raise exception
      'BetterSelf base schema is missing. Run database/schema.sql on the correct Neon database before this migration.';
  end if;
end $$;

with treatment_catalog (
  id, name, category, description, duration, starting_price, price_label,
  requires_doctor_approval
) as (
  values
    ('doctor-consultation', 'Doctor Consultation', 'Others', 'A paid doctor consultation for patients who want medical guidance before choosing a treatment.', '30 min', 800, '₱800', false),
    ('neurotoxin-face', 'Neurotoxin (Face)', 'Toxin-Based', 'A doctor-led facial neurotoxin treatment that may help soften the appearance of expression lines after assessment.', '30-45 min', 450, '₱450/unit', true),
    ('skin-microtox-pores', 'Skin Microtox (for pores)', 'Toxin-Based', 'A medical aesthetic treatment designed to support smoother-looking skin texture and pore appearance, subject to doctor review.', '45-60 min', 10000, '₱10,000', true),
    ('jawtox', 'Jawtox', 'Toxin-Based', 'A doctor-assessed facial slimming or jaw tension treatment using neurotoxin when medically appropriate.', '45 min', 20000, '₱20,000', true),
    ('sweatox', 'Sweatox', 'Toxin-Based', 'A doctor-led treatment option for excessive sweating concerns, offered only when suitable.', '45-60 min', 15000, '₱15,000', true),
    ('mesoheal-korean-skin-booster', 'Mesoheal Korean Skin Booster', 'Skin Boosters', 'A skin booster appointment designed to support hydration and glow, planned after doctor assessment.', '60 min', 15000, '₱15,000', true),
    ('crystal-pn', 'Crystal PN', 'Skin Boosters', 'A doctor-guided skin booster option that may support smoother, refreshed-looking skin.', '60 min', 15000, '₱15,000', true),
    ('crystal-pn-plus', 'Crystal PN+ (PN + HA)', 'Skin Boosters', 'A PN and HA skin booster option selected after medical review of skin goals and suitability.', '60 min', 20000, '₱20,000', true),
    ('luhilo', 'Luhilo', 'Skin Boosters', 'A medical skin booster session for selected skin quality concerns, subject to doctor approval.', '60 min', 20000, '₱20,000', true),
    ('rejuran-h', 'Rejuran H', 'Skin Boosters', 'A doctor-led regenerative skin quality treatment option for selected concerns after medical assessment.', '60-75 min', 25000, '₱25,000', true),
    ('bi-dens', 'Bi-Dens', 'Skin Boosters', 'A skin quality treatment option that may be included in a personalized doctor-led treatment plan.', '60-75 min', 25000, '₱25,000', true),
    ('duoexoti', 'DuoExoti', 'Skin Boosters', 'Plant-based exosomes with PDRN, used as part of a doctor-guided skin quality plan when suitable.', '60-75 min', 25000, '₱25,000', true),
    ('3-in-1-scar-treatment', '3-in-1 Scar Treatment', 'Acne Scars', 'A doctor-planned acne scar session combining selected techniques when medically appropriate.', '75-90 min', 20000, '₱20,000', true),
    ('scar-plus', 'Scar Plus', 'Acne Scars', 'A more advanced scar plan using cannula subcision with Bi-Dens injectable when the doctor confirms suitability.', '90 min', 35000, '₱35,000', true),
    ('needle-subcision', 'Needle Subcision', 'Acne Scars', 'A scar treatment technique that may be recommended for selected acne scar types after assessment.', '45-60 min', 10000, '₱10,000', true),
    ('cannula-subcision', 'Cannula Subcision', 'Acne Scars', 'A doctor-led subcision approach selected for appropriate scar patterns and patient profile.', '60 min', 20000, '₱20,000', true),
    ('microneedling', 'Microneedling', 'Acne Scars', 'A skin needling treatment that may support texture improvement in selected patients.', '45-60 min', 10000, '₱10,000', true),
    ('tca-chemical-peel', 'TCA Chemical Peel', 'Acne Scars', 'A doctor-selected chemical peel option for specific texture and scar concerns after skin assessment.', '30-45 min', 3000, '₱3,000', true),
    ('face-mesolipo', 'Face Mesolipo', 'Others', 'A doctor-assessed facial contour support option for selected areas and suitable patients.', '45-60 min', 10000, '₱10,000', true),
    ('body-mesolipo', 'Body Mesolipo', 'Others', 'A doctor-led body mesolipo treatment appointment for selected areas, subject to suitability review.', '60 min', 15000, '₱15,000/area', true),
    ('keloid-injection', 'Keloid Injection', 'Others', 'A doctor-assessed keloid care appointment for selected lesions and suitable patients.', '30 min', 2500, '₱2,500', true),
    ('milia-extraction', 'Milia Extraction', 'Others', 'A careful doctor-led extraction appointment for selected milia, with skin review before treatment.', '30-45 min', 150, '₱150/piece', true),
    ('wart-removal', 'Wart Removal', 'Others', 'A doctor-reviewed wart removal appointment for selected areas, with aftercare guidance.', '30-45 min', 5000, '₱5,000/area', true),
    ('sebaceous-hyperplasia-removal', 'Sebaceous Hyperplasia Removal', 'Others', 'A doctor-assessed removal appointment for selected sebaceous hyperplasia lesions.', '30-45 min', 200, '₱200/piece', true),
    ('underarm-whitening-injectable', 'Underarm Whitening (Injectable)', 'Others', 'A medically guided underarm brightening treatment plan when suitable.', '45 min', 15000, '₱15,000', true),
    ('intimate-area-whitening-injectable', 'Intimate Area Whitening (Injectable)', 'Others', 'A discreet doctor-led treatment request for selected intimate-area brightening concerns, subject to suitability review.', '45 min', 15000, '₱15,000', true)
)
insert into public.treatments
  (id, name, category, description, duration, starting_price, price_label,
   requires_doctor_approval, beforecare, aftercare, contraindications, is_active)
select
  id,
  name,
  category,
  description,
  duration,
  starting_price,
  price_label,
  requires_doctor_approval,
  case
    when id = 'doctor-consultation' then array[
      'Prepare your main concerns and any questions for the doctor.',
      'Share relevant medical history, allergies, medication, and recent procedures.'
    ]
    else array[
      'Complete the medical intake form truthfully before booking confirmation.',
      'Share allergies, medication, previous procedures, and recent illness.',
      'Avoid alcohol and non-prescribed blood-thinning supplements for 24 hours when medically appropriate.'
    ]
  end,
  case
    when id = 'doctor-consultation' then array[
      'Follow the doctor''s recommendation before booking a treatment.',
      'Message BetterSelf if you need clarification after the consultation.'
    ]
    else array[
      'Follow the doctor''s aftercare instructions and avoid touching the treated area unnecessarily.',
      'Avoid intense heat, strenuous activity, and alcohol immediately after treatment when advised.',
      'Message the doctor for expected reactions or follow-up questions. Seek urgent care for severe symptoms.'
    ]
  end,
  case
    when id = 'doctor-consultation' then array['Emergency symptoms or urgent medical concerns']
    else array[
      'Pregnant or breastfeeding, unless cleared by the doctor',
      'Active infection or open wounds in the treatment area',
      'History of severe allergy to related products or ingredients',
      'Uncontrolled medical conditions that require further evaluation'
    ]
  end,
  true
from treatment_catalog
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  duration = excluded.duration,
  starting_price = excluded.starting_price,
  price_label = excluded.price_label,
  requires_doctor_approval = excluded.requires_doctor_approval,
  beforecare = excluded.beforecare,
  aftercare = excluded.aftercare,
  contraindications = excluded.contraindications,
  is_active = excluded.is_active;

create index if not exists payments_booking_created_idx
  on public.payments(booking_id, created_at desc);

create index if not exists medical_intakes_booking_created_idx
  on public.medical_intakes(booking_id, created_at desc);

create index if not exists user_profiles_lower_email_idx
  on public.user_profiles(lower(email));

create unique index if not exists payments_transaction_reference_unique
  on public.payments(transaction_reference)
  where transaction_reference is not null;

create unique index if not exists payments_paymongo_checkout_unique
  on public.payments(paymongo_checkout_id)
  where paymongo_checkout_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'treatments_starting_price_nonnegative'
  ) then
    alter table public.treatments
      add constraint treatments_starting_price_nonnegative check (starting_price >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'bookings_confirmed_amount_nonnegative'
  ) then
    alter table public.bookings
      add constraint bookings_confirmed_amount_nonnegative
      check (confirmed_amount is null or confirmed_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'payments_amount_nonnegative'
  ) then
    alter table public.payments
      add constraint payments_amount_nonnegative check (amount >= 0);
  end if;
end $$;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text,
  actor_email text,
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_patient_team_idx
  on public.messages(sender_id, receiver_id, created_at);

create index if not exists admin_audit_logs_target_idx
  on public.admin_audit_logs(target_type, target_id, created_at desc);

create index if not exists admin_audit_logs_actor_idx
  on public.admin_audit_logs(actor_email, created_at desc);
