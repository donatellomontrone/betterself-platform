# BetterSelf Handoff For Claude Code

Last updated: 2026-07-15

## What BetterSelf is

BetterSelf is a doctor-led home aesthetics platform for Metro Manila. The patient
books either:

- a PHP 800 doctor consultation paid up front; or
- a treatment request that is reviewed by the doctor before payment.

The business does not sell memberships.

## Production

- Website: `https://betterself.health`
- Vercel project: `betterself-platform`
- Deploy branch: `main`
- Auth: Clerk production
- DB: Neon Postgres
- Payments: PayMongo QR Ph Hosted Checkout
- Scheduling: Calendly

## Current flow

1. Patient signs up/logs in with Clerk.
2. Patient chooses:
   - "I need a consultation" -> pays PHP 800 first -> schedules call.
   - "I know the treatment" -> submits treatment request + intake + consent.
3. Doctor reviews treatment requests in `/admin`.
4. Doctor confirms/declines/requests more info.
5. For variable-priced treatments, doctor sets the assessed amount.
6. Patient pays from `/dashboard`.
7. PayMongo webhook marks payment and booking paid.

## Important implemented pieces

- Real patient dashboard.
- Real admin dashboard.
- Admin left-side navigation.
- Admin calendar sections for video calls and home visits.
- Admin payment queue.
- Admin doctor-assessed amount field.
- Booking cancellation for unpaid pending bookings.
- Payment retry with fresh QR Ph checkout.
- PayMongo webhook hardening.
- Cookie-consent gated Google Places.
- Claude Haiku concern matching with catalog validation and local fallback.
- Legal pages and SEO pages.

## Main files to inspect first

- `src/components/platform-widgets.tsx` - booking wizard and Calendly.
- `src/components/betterself-pages.tsx` - public pages, dashboard, admin UI.
- `src/app/admin/actions.ts` - admin server actions.
- `src/lib/db/queries.ts` - data layer.
- `src/app/api/bookings/route.ts` - booking creation.
- `src/app/api/checkout/retry/route.ts` - dashboard Pay now retry.
- `src/app/api/paymongo/webhook/route.ts` - PayMongo reconciliation.
- `src/app/api/recommend-treatment/route.ts` - Anthropic/OpenAI/fallback matching.
- `src/lib/treatments.ts` - services and prices.
- `database/schema.sql` - database schema.

## Do next

1. Verify PayMongo live mode end to end:
   - merchant/business approved;
   - QR Ph enabled;
   - live keys in Vercel;
   - webhook URL registered as `https://betterself.health/api/paymongo/webhook`;
   - paid event updates Neon rows.
2. Test Clerk production signup in incognito with a fresh email.
3. Confirm one real booking writes user profile, patient profile, booking, intake,
   payment, and consent data correctly.
4. Fill legal entity/DPO/contact details.
5. Get doctor-approved treatment copy and aftercare.
6. Decide final doctor-patient messaging model: in-app messages vs WhatsApp/email
   handoff.

## Notes

- Keep PayMongo, Clerk, database, Anthropic/OpenAI, and admin env vars sensitive.
- Do not reintroduce memberships/subscriptions.
- Do not charge treatments before doctor review.
- Do not expose doctor identity publicly unless the founder explicitly changes
  that decision.
