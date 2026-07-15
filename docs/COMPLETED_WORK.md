# BetterSelf Completed Work

Last updated: 2026-07-15

This is the concise list of work completed so far on BetterSelf Home Aesthetics.

## Public website

- Built public pages: Home, Treatments, How it works, Safety, About, Contact,
  FAQ, Privacy, Terms, and Consent.
- Removed the membership model; BetterSelf is priced per consultation/treatment.
- Added real treatment categories and service rates from the BetterSelf rate cards.
- Added direct treatment booking and doctor-consultation booking paths.
- Added BetterSelf branding, calmer visual direction, logo usage, and treatment
  imagery.
- Added treatment discovery with search, filters, concern chips, and interactive
  face/body maps.
- Added concern-first UX: patients describe what problem they want to address.
- Added cookie consent.
- Added legal and medical disclaimer language across the site.
- Added SEO metadata, sitemap, robots, Open Graph, and noindex for private areas.

## Booking flow

- Built a five-step booking wizard.
- Split business logic into two flows:
  - consultation: PHP 800 paid up front, then schedule the doctor call;
  - treatment: request first, doctor review, then pay from dashboard.
- Added patient details, medical intake, consent gates, validation, and summary.
- Added logged-in user prefill for name, email, and phone.
- Added address capture for home visits and hid address for online consults.
- Added Google Places address search gated behind optional-cookie acceptance.
- Added Calendly embed/fallback link for doctor-call scheduling.
- Added discount codes validated server-side.
- Added cancellation for pending unpaid bookings.

## Patient dashboard

- Built a real database-backed dashboard.
- Shows current booking, treatment history, payment state, location/address,
  appointment type, and status badges.
- Shows payment only when the doctor has confirmed the treatment and the booking
  is payable.
- Supports payment retry with a new PayMongo QR Ph checkout session.
- Supports cancelling pending unpaid bookings.
- Shows video-call links when Calendly/fallback doctor call URL is available.
- Added message-doctor entry points.

## Doctor/admin platform

- Created protected `/admin` dashboard gated by Clerk and `ADMIN_EMAILS`.
- Added footer access to admin.
- Added left-side doctor navigation.
- Added stats: total bookings, awaiting review, confirmed, paid, patients, ready
  to pay, flagged intakes, and filtered count.
- Added booking filters by search, status, payment, and intake.
- Added patient quick view and patient profile editing.
- Added intake review controls and medical flag visibility.
- Added booking status updates and notes.
- Added doctor-assessed amount field for unit/area treatment pricing.
- Added payment queue.
- Added calendar sections for confirmed video calls and confirmed home visits.
- Added doctor-side message/thread overview and video-call context.
- Added CSV export with formula-injection guard and console audit log.

## Payments

- Integrated PayMongo Hosted Checkout for QR Ph.
- Consultation payments happen up front.
- Treatment payments happen after doctor confirmation.
- Added retry payment from dashboard with fresh QR checkout sessions.
- Added payment states in patient and admin views.
- Hardened PayMongo webhook:
  - HMAC verification;
  - timestamp replay window;
  - support for wrapper/direct event payload shapes;
  - reference-based payment matching;
  - no cancelled-booking resurrection.
- Added demo retry completion when no PayMongo secret is configured locally.

## Auth, data, and backend

- Integrated Clerk authentication.
- Integrated Neon Postgres data layer.
- Added real bookings, profiles, payments, intake answers, admin views, and
  dashboard views.
- Added admin email allowlist.
- Added server-side validation and protected routes.
- Added profile updates that preserve existing medical fields.
- Fixed Clerk proxy matching for protected CSV export.

## AI / concern matching

- Added Claude Haiku treatment suggestion using the Costarax provider pattern.
- Added tool-schema output, catalog allowlisting, OpenAI secondary-provider
  support, and a local fallback.
- Added red-flag/uncertain concern handling to steer toward consultation.
- Added input-length cap before calling an external AI provider.

## Documentation

- Updated feature list.
- Updated audit remediation status.
- Updated handoff and to-do files.
- Added/maintained stack setup guidance.
