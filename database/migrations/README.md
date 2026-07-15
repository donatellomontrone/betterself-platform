# BetterSelf database migrations

Run these files against the **production** Neon database in filename order, once.
They are designed to be safe to re-run, but do not apply them to a preview branch
when you intend to change live patient data.

## Before deployment

1. Open Neon -> BetterSelf -> `production` -> SQL Editor.
2. Confirm the database has the base BetterSelf tables: `bookings`, `payments`,
   `medical_intakes`, `messages`, and `treatments`.
3. Run any migration files that are newer than the last one applied.
4. For this release, run `20260715_payment_state_machine.sql` before deploying
   the application code that introduces `ready_for_payment`.

## Verification query

Run this after the migration:

```sql
select
  to_regclass('public.paymongo_webhook_events') as webhook_event_table,
  exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'booking_status' and e.enumlabel = 'ready_for_payment'
  ) as has_ready_for_payment;
```

Both values must be present/true. Never paste a database URL, payment key, or
webhook secret into SQL, source control, or support messages.
