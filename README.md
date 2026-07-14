# BetterSelf Home Aesthetics

Premium website and patient platform prototype for BetterSelf, a doctor-led private medical aesthetic concierge service in Metro Manila. The project is now prepared for GitHub, Vercel, Clerk, Calendly, Neon, and PayMongo.

## Positioning

BetterSelf is positioned as:

> Doctor-led aesthetic care at your doorstep.

The platform is intentionally medical, calm, premium, and trust-first. It avoids a beauty marketplace or discount Botox delivery feel.

## Built routes

Public website:

- `/` homepage
- `/treatments`
- `/treatments/[id]`
- `/how-it-works`
- `/safety`
- `/about`
- `/faq`
- `/contact`
- `/login`

Patient platform:

- `/dashboard`
- `/booking`
- `/messages`

Doctor/admin preview:

- `/admin`

Payment and booking support:

- `/api/checkout`
- `/api/paymongo/webhook`
- `/checkout-preview`
- `/booking/success`
- `/booking/cancelled`

## GitHub, Vercel, Clerk, Neon

Stack setup instructions live in:

```text
docs/stack-setup.md
```

Added:

- Clerk auth provider, sign-in, and sign-up routes
- Clerk protected-route proxy in `src/proxy.ts`
- Neon database helper in `src/lib/db/`
- Postgres schema for Neon in `database/schema.sql`
- GitHub CI workflow in `.github/workflows/ci.yml`

## Real service data

The full treatment catalog and discount tiers from the attached rate-card images are in:

```text
src/lib/treatments.ts
```

Included categories:

- Toxin-Based
- Skin Boosters
- Acne Scars
- Others

The platform does not use memberships. Pricing is per consultation or per
doctor-confirmed treatment.

## Platform features represented

- Doctor-led homepage and public service positioning
- Full treatment catalog with detail pages
- Medical-safe treatment copy and disclaimers
- Booking flow with two paths: paid doctor consultation first, or treatment request followed by doctor review and dashboard payment
- Patient dashboard with bookings, treatment plan, messages, aftercare, and payment status
- Internal doctor-patient messaging surface with emergency disclaimer
- Doctor/admin dashboard for appointments, intake review, patient records, payment status, and notes
- Safety & Protocol page
- Per-treatment pricing structure with doctor-confirmed totals for unit/area/piece services
- PayMongo Hosted Checkout routes for QR Ph payments
- PayMongo webhook fulfillment for paid checkout sessions

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/your-calendly-user/betterself-home-treatment
NEXT_PUBLIC_DOCTOR_VIDEO_CALL_URL=https://meet.google.com/...
DATABASE_URL=postgres://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_WEBHOOK_SECRET=...
```

If `NEXT_PUBLIC_CALENDLY_URL` is missing, the booking page shows a Calendly setup notice. If present, the booking page embeds Calendly and pre-fills name, email, treatment or consultation, location, phone, and address when relevant.

If `NEXT_PUBLIC_DOCTOR_VIDEO_CALL_URL` is present, doctor-consultation bookings show that call link in the patient dashboard and admin calendar whenever Calendly has not stored a booking-specific link.

When `CALENDLY_ACCESS_TOKEN` is present, dashboard and admin page loads reconcile Calendly events with Neon. A shared Neon lock limits the full scan to once every 30 seconds and recovers stale runs after five minutes; a Calendly webhook can still be added later for immediate push updates.

If `PAYMONGO_SECRET_KEY` is missing, the booking flow opens the local demo checkout page. If present, consultation bookings create a PayMongo Hosted Checkout session for the ₱800 consultation fee. Treatment requests are submitted first; the doctor confirms suitability and the final amount, then the patient pays from the dashboard.

## Production next steps

- Apply every SQL file in `database/migrations/` to Neon before deploying new admin or payment features.
- Keep the Neon migration for the durable `/api/recommend-treatment` rate limiter applied before high traffic campaigns.
- Keep the Neon migration for the shared Calendly sync state applied before enabling `CALENDLY_ACCESS_TOKEN`.
- Add secure patient photo uploads when BetterSelf is ready to review images inside the platform.
- Review legal entity, DPO, consent, and medical disclaimer copy with the clinic/legal owner before launch.
- Keep PayMongo webhook, Calendly webhook, Clerk production keys, and `NEXT_PUBLIC_SITE_URL` in Vercel Production and Preview environments.
