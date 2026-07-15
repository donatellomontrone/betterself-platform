-- BetterSelf payment and clinical review hardening.
-- Run this after the base schema and prior migrations. It is safe to re-run.

do $$
begin
  if to_regclass('public.bookings') is null
    or to_regclass('public.payments') is null
    or to_regclass('public.medical_intakes') is null
    or to_regclass('public.messages') is null
  then
    raise exception 'BetterSelf base schema is missing. Run database/schema.sql first.';
  end if;
end $$;

alter type public.booking_status add value if not exists 'ready_for_payment';
alter type public.payment_status add value if not exists 'failed';

alter table public.payments
  add column if not exists paymongo_event_id text,
  add column if not exists paymongo_livemode boolean;

alter table public.messages
  add column if not exists booking_id uuid references public.bookings(id) on delete set null;

create table if not exists public.paymongo_webhook_events (
  id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

-- Keep only the newest old pending checkout active. Earlier attempts remain in the
-- ledger but can no longer unlock a booking if an old QR is scanned later.
with ranked as (
  select id,
         row_number() over (partition by booking_id order by created_at desc, id desc) as rank
  from public.payments
  where status = 'pending'
)
update public.payments p
set status = 'failed'
from ranked r
where p.id = r.id and r.rank > 1;

create unique index if not exists payments_one_pending_attempt_per_booking
  on public.payments(booking_id)
  where status = 'pending';
create unique index if not exists payments_paymongo_event_unique
  on public.payments(paymongo_event_id)
  where paymongo_event_id is not null;
create index if not exists messages_booking_idx on public.messages(booking_id, created_at);
