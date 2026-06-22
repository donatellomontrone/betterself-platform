# BetterSelf Home Aesthetics

Premium website and patient platform prototype for BetterSelf, a doctor-led private medical aesthetic concierge service in Metro Manila. The project is now prepared for GitHub, Vercel, Clerk, Neon, and PayMongo.

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
- `/membership`
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

The file also includes employee discount tiers and referral promo structures.

## Platform features represented

- Doctor-led homepage and public service positioning
- Full treatment catalog with detail pages
- Medical-safe treatment copy and disclaimers
- Booking flow with treatment, appointment type, location, time, intake, review, and payment
- Patient dashboard with bookings, treatment plan, messages, aftercare, and payment status
- Internal doctor-patient chat structure with emergency disclaimer and attachment placeholder
- Doctor/admin dashboard preview for appointments, intake review, patient messaging, payment status, and notes
- Safety & Protocol page
- BetterSelf Private Plan membership page
- PayMongo Hosted Checkout-ready API route
- PayMongo webhook stub for confirmed payment fulfillment

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

If `PAYMONGO_SECRET_KEY` is missing, the booking flow opens the local demo checkout page. If present, `/api/checkout` creates a PayMongo Hosted Checkout session server-side.

## Production next steps

- Create Clerk and Neon integrations from Vercel Marketplace.
- Run `database/schema.sql` in the Neon SQL editor.
- Persist Clerk-created users into `user_profiles`.
- Store uploaded patient photos securely.
- Replace placeholder doctor credentials and imagery.
- Connect booking statuses to doctor review actions.
- Fulfill bookings only from verified PayMongo webhooks, not browser redirects.
- Add privacy policy, terms, consent forms, and medical disclaimer pages with legal review.
