# BetterSelf Project Handoff

Last updated: 2026-07-14

This is the current handoff for another engineer/agent continuing BetterSelf.

## Product

BetterSelf is a doctor-led medical aesthetics platform for Metro Manila. The
patient can:

- browse treatments;
- describe the concern they want to address;
- book a paid doctor consultation if unsure;
- submit a treatment request if they already know what they want;
- complete medical intake and consent;
- schedule a doctor call;
- pay through PayMongo QR Ph when the flow allows payment;
- manage bookings from the patient dashboard.

There is no membership model. Pricing is per consultation or per treatment.

## Current production state

- Primary domain: `https://betterself.health`
- Vercel project: `betterself-platform`
- GitHub deploy branch: `main`
- Production deploys automatically from GitHub/Vercel.
- Clerk production auth is wired.
- Neon database is wired.
- PayMongo code is wired for QR Ph Hosted Checkout, but live operation still
  depends on PayMongo merchant/channel activation and final smoke testing.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS v4
- Clerk for auth
- Neon Postgres for data
- PayMongo Hosted Checkout for QR Ph payments
- Calendly for doctor call scheduling
- Google Places for optional address search
- OpenAI optional recommendation API with local fallback
- Vercel hosting

## Important Next.js / Clerk conventions

- Middleware/protection lives in `src/proxy.ts`, not `middleware.ts`.
- Do not exclude `.csv` routes from the proxy matcher; `/admin/export.csv` must
  run through Clerk protection.
- Protected routes:
  - `/admin`
  - `/dashboard`
  - `/messages`
- Admin access is controlled by `ADMIN_EMAILS`.
- Header auth is handled by client/server islands, not by assuming
  `<SignedIn>`/`<SignedOut>` are available.

## Main flows

### Doctor consultation

- Treatment id: `doctor-consultation`
- Price: PHP 800
- Appointment type: online doctor consultation
- Payment timing: patient pays first
- After payment: patient schedules/joins the call

### Treatment request

- Patient selects a treatment and submits intake/consent.
- Payment is not taken up front.
- Doctor reviews the request in `/admin`.
- Doctor confirms, requests more info, cancels, or completes the booking.
- For unit/area-priced treatments, doctor sets the final assessed amount.
- Patient pays from `/dashboard` after the booking is confirmed and payable.

## Key files

- Public/page UI: `src/components/betterself-pages.tsx`
- Booking wizard: `src/components/platform-widgets.tsx`
- Treatment content: `src/lib/treatments.ts`
- Anatomy maps: `src/components/treatment-anatomy-map.tsx`
- Address autocomplete: `src/components/address-autocomplete.tsx`
- Cookie banner: `src/components/cookie-consent-banner.tsx`
- Admin actions: `src/app/admin/actions.ts`
- Admin page route: `src/app/admin/page.tsx`
- Booking API: `src/app/api/bookings/route.ts`
- Checkout retry API: `src/app/api/checkout/retry/route.ts`
- PayMongo webhook: `src/app/api/paymongo/webhook/route.ts`
- DB schema: `database/schema.sql`
- DB queries: `src/lib/db/queries.ts`
- Discounts: `src/lib/discounts.ts`
- Recommendation API: `src/app/api/recommend-treatment/route.ts`

## What is implemented

- Marketing/public website with treatment catalog and legal pages.
- Treatment concern discovery and face/body interactive maps.
- AI-ready treatment suggestion endpoint with safe fallback.
- Cookie consent and optional Google Places gating.
- Clerk sign-in/sign-up and protected dashboard/admin.
- Real Neon-backed patient dashboard and admin dashboard.
- Booking wizard with validation, intake, consent, address, Calendly, and PayMongo.
- Consultation pay-first flow.
- Treatment doctor-review-before-payment flow.
- Doctor-assessed treatment amount field.
- Patient payment retry with fresh PayMongo QR Ph checkout session.
- Patient cancellation for pending unpaid bookings.
- Admin booking filters, patient view, calendar sections, payment queue, CSV export.
- Durable Neon-backed doctor-patient messaging and admin message inbox.
- Durable Neon-backed rate limiting for the public treatment recommendation endpoint.
- Webhook hardening: HMAC, timestamp replay window, payload-shape support, no
  cancelled-booking resurrection.
- SEO metadata, robots, sitemap, and private noindex behavior.

## Environment variables

Production needs:

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

Server-side/sensitive:

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `ADMIN_EMAILS`

## Current priority

1. Verify PayMongo live QR Ph checkout and webhook delivery end to end.
2. Test Clerk production signup in incognito with a fresh email.
3. Confirm a real patient booking writes profile, address, intake, booking, and
   payment rows correctly.
4. Fill legal entity/DPO/contact placeholders and get legal/medical review.
5. Replace generic treatment copy with doctor-approved treatment-specific copy.
