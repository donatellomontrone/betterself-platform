# BetterSelf Completed Work

Last updated: 2026-06-25

This is the handoff list of the work completed so far for BetterSelf Home Aesthetics.

## Customer Website

- Built the public BetterSelf website with home, treatments, how it works, safety, about, contact, privacy, terms, and consent pages.
- Replaced the membership concept with per-treatment pricing.
- Added real service categories and pricing from the provided BetterSelf rate cards.
- Added direct treatment booking and doctor-consultation booking as two separate paths.
- Added a calmer hero and brand direction using the BetterSelf logo and provided treatment imagery.
- Added interactive treatment discovery for patient concerns, including face/body visual maps.
- Added a patient concern prompt so users can describe the problem they want to address before booking.
- Added cookie consent on site entry.
- Added legal/medical disclaimer language across the site.

## Booking Flow

- Built a 5-step booking wizard with treatment/consultation selection, location, patient details, medical intake, Calendly, and payment handoff.
- Updated the flow so treatment requests are reviewed by the doctor first, then payment becomes available from the patient dashboard after confirmation.
- Added consultation booking at ₱1,500 for patients who need help choosing a treatment.
- Added Google address search for home visits, with Metro Manila context and fallback behavior.
- Added required patient details, medical intake questions, consent gates, and validation before booking can be submitted.
- Added logged-in user prefill for name, email, and phone.
- Added dashboard support for retrying payment when payment is pending or failed.
- Added cancellation for pending unpaid bookings.

## Patient Dashboard

- Built a real patient dashboard backed by the database.
- Shows upcoming/current booking, status, payment status, address/location, treatment history, and aftercare guidance.
- Shows "Payment after doctor call" until the doctor confirms the request.
- Shows retry-payment actions when payment is available and not complete.
- Shows cancel actions for unpaid pending requests.
- Added video-call link display when a booking has a Calendly link or fallback doctor call URL.
- Added message-doctor entry points from active bookings.

## Doctor / Admin Platform

- Created `/admin` as a protected doctor/admin dashboard using Clerk plus `ADMIN_EMAILS`.
- Added admin footer access so the doctor can find the admin area.
- Added booking statistics: total bookings, awaiting review, confirmed, paid, patients, ready to pay, flagged intakes, and filtered results.
- Added booking filters by search, booking status, payment status, and intake status.
- Added CSV export.
- Added patient profile editing from admin: phone, address, emergency contact, allergies, medications, contraindications.
- Added intake review controls and medical flag visibility.
- Added booking status updates: pending review, needs more information, confirmed, completed, cancelled.
- Added a left-side doctor menu for quick navigation.
- Added admin calendar sections for confirmed video calls and confirmed home visits.
- Added doctor-side message/thread overview with links to chat and email.
- Added patient quick-list cards with patient contact and spend data.
- Added payment queue so the doctor can see which confirmed bookings still need payment.
- Added video-call access inside admin booking details and calendar cards.

## Payments

- Integrated PayMongo Hosted Checkout through `/api/checkout`.
- Added webhook handling for PayMongo payment confirmation.
- Added PayMongo env variables in Vercel docs and `.env.example`.
- Added support for retrying payment from the dashboard.
- Added payment states in patient and admin views.
- Added operational guidance: QR Ph / PayMongo methods depend on merchant activation in the PayMongo dashboard.

## Auth, Data, And Backend

- Integrated Clerk authentication.
- Integrated Neon Postgres data layer.
- Added real database-backed bookings, profiles, payments, intake answers, and admin views.
- Added server-side admin email gating with `ADMIN_EMAILS`.
- Added environment variable documentation for Clerk, Neon, Calendly, PayMongo, Google Maps, OpenAI, support contacts, and doctor video-call fallback.

## AI / Concern Matching

- Added OpenAI-ready treatment suggestion support using `OPENAI_API_KEY` and `OPENAI_MODEL`.
- Added local fallback behavior so the booking flow still works if the AI key is not configured.
- The patient describes the concern first, then the platform can suggest relevant treatments instead of relying only on manual category browsing.

## Operational Notes

- Set `NEXT_PUBLIC_DOCTOR_VIDEO_CALL_URL` in Vercel only if the doctor wants a shared fallback video-call room.
- Keep `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `CLERK_SECRET_KEY`, `DATABASE_URL`, `OPENAI_API_KEY`, and `ADMIN_EMAILS` server-side or sensitive where possible.
- For PayMongo live payments, complete business verification and enable payment channels in PayMongo.
- For a custom domain, update `NEXT_PUBLIC_SITE_URL`, Clerk redirect URLs, PayMongo webhook URL, and Google Maps restrictions after the domain is connected.
