# BetterSelf Features

Last updated: 2026-07-04

BetterSelf is a doctor-led home aesthetics platform for Metro Manila. Patients can
create an account, describe their concern, book either a paid consultation or a
treatment request, and continue payment/scheduling from their dashboard.

## Live platform

- Production domain: `https://betterself.health`
- Vercel project: `betterself-platform`
- GitHub deploy branch: `main`
- Stack: Next.js 16 App Router, React 19, Tailwind CSS v4, Vercel, Clerk, Neon,
  PayMongo, Calendly, Google Places, optional OpenAI.

## Patient website

- Public pages: Home, Treatments, How it works, Safety, About, Contact, FAQ,
  Privacy, Terms, and Consent.
- Treatment catalog with real BetterSelf services and per-treatment pricing.
- No membership/subscription model: every booking is priced per consultation or
  per treatment.
- Treatment explorer with search, category filtering, concern chips, and visual
  face/body anatomy maps.
- Patient concern prompt: the patient describes the problem they want to address.
- Optional OpenAI treatment recommendation endpoint with strict output schema,
  red-flag fallback, and 1000-character abuse/cost cap.
- If OpenAI is not configured or fails, the local heuristic fallback still
  recommends a treatment or the doctor consultation.

## Booking flows

There are two separate business flows.

1. Doctor consultation
   - Price: PHP 800.
   - Paid up front through PayMongo QR Ph.
   - After payment, the patient schedules the video call/doctor call.
   - Used when the patient is unsure which treatment is right.

2. Treatment request
   - Patient selects a known treatment and submits intake/consent first.
   - No treatment payment is taken before doctor review.
   - The doctor reviews the intake and confirms suitability.
   - For unit/area-priced treatments, the doctor sets the assessed total in admin.
   - Patient pays from the dashboard after confirmation.

## Booking wizard

- Five-step booking wizard with labelled progress state.
- Logged-in users get name, email, and phone prefill from Clerk/profile data.
- Home visit address field with Google Places search when optional cookies are
  accepted; manual address input always works.
- Home visit address is hidden for online consultation bookings.
- Medical intake questions and consent gates block booking submission until
  required items are completed.
- Calendly embed is available for doctor call scheduling, with a fallback button
  to open Calendly in a new tab.
- Discount-code support is validated server-side before payment.

## Patient dashboard

- Real database-backed dashboard for the signed-in patient.
- Shows upcoming/current booking, treatment history, payment state, appointment
  type, address/location, video-call link when available, and aftercare state.
- Shows "Payment after doctor call" until doctor review makes the treatment
  payable.
- Shows Pay now only when the booking is confirmed and payable.
- Supports retrying payment with a fresh PayMongo QR Ph session.
- Supports cancelling pending unpaid bookings.
- Message Doctor entry points route patients toward the available support/chat
  channel.

## Doctor / admin platform

- `/admin` is protected by Clerk and gated by `ADMIN_EMAILS`.
- Admin footer link exists so the doctor/operator can find the admin area.
- Left-side doctor navigation for dashboard, bookings, patients, calendar,
  payment queue, and messages/context.
- Booking stats: total, awaiting review, confirmed, paid, patients, ready to pay,
  flagged intakes, and filtered count.
- Filters by text search, booking status, payment status, and intake status.
- Full booking review with patient profile, intake answers, notes, medical flags,
  payment state, and video-call context.
- Admin can update booking status, schedule details, notes, intake review status,
  patient profile fields, payment status, and doctor-assessed amount.
- Admin calendar sections show confirmed video calls and confirmed home visits.
- CSV export is admin-gated, formula-injection guarded, and console-audited.

## Payments

- PayMongo Hosted Checkout integration uses QR Ph only.
- Consultations pay first.
- Treatments pay after doctor confirmation.
- Retry payment creates a new single-use checkout session instead of reopening an
  already-consumed QR source.
- Webhook verifies HMAC signature, timestamp replay window, and parses both
  PayMongo event envelope shapes observed in production/testing.
- Webhook marks payment/booking paid by reference number and does not resurrect
  cancelled bookings.
- Demo mode without `PAYMONGO_SECRET_KEY` completes the local retry flow instead
  of leaving the patient in a dead loop.

## Auth and data

- Clerk production auth is wired with sign-in/sign-up pages and protected routes.
- Neon Postgres stores user profiles, patient profiles, bookings, medical intakes,
  payments, messages, aftercare instructions, and consent-related data.
- Server-side routes validate auth and admin access before touching private data.
- Booking/payment data is fetched dynamically for dashboard/admin views.

## Privacy, legal, and trust

- Cookie banner stores the user's choice.
- Optional Google Places is gated behind optional-cookie acceptance.
- Privacy, Terms, and Consent pages are present as PH-oriented drafts.
- Doctor identity is intentionally not public on the marketing site.
- Medical copy avoids diagnosis, guaranteed outcomes, and emergency-care claims.
- SEO metadata, robots, sitemap, Open Graph, and private-route noindex handling
  are in place.

## Environment variables

Core production variables:

```bash
NEXT_PUBLIC_SITE_URL=
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
ADMIN_EMAILS=
NEXT_PUBLIC_CALENDLY_URL=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
OPENAI_API_KEY=
OPENAI_MODEL=
NEXT_PUBLIC_SUPPORT_EMAIL=
NEXT_PUBLIC_SUPPORT_PHONE=
NEXT_PUBLIC_WHATSAPP_URL=
NEXT_PUBLIC_DOCTOR_VIDEO_CALL_URL=
```

Keep server secrets marked sensitive in Vercel. Do not expose PayMongo, Clerk
secret, database, or OpenAI keys as public variables.

## Known external go-live dependencies

- PayMongo business verification/channel activation and final live-key smoke test.
- PayMongo webhook delivery test from the live dashboard.
- Final legal entity, registered address, and DPO/contact details for legal pages.
- Real medical copy and treatment-specific aftercare from the doctor.
- Optional: real persisted doctor-patient messaging instead of support-channel
  handoff.
