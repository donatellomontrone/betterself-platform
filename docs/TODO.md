# BetterSelf To-Do

Last updated: 2026-07-14

## P0 - Verify before real patients

1. PayMongo live smoke test
   - Confirm BetterSelf merchant/business verification in PayMongo.
   - Confirm QR Ph is enabled.
   - Put live `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET` in Vercel.
   - Register webhook: `https://betterself.health/api/paymongo/webhook`.
   - Create one consultation checkout and one treatment retry checkout.
   - Confirm webhook marks the correct booking/payment as paid in Neon.

2. Clerk production signup test
   - Open incognito.
   - Sign up with a new email.
   - Confirm redirect to `/dashboard`.
   - Start a booking and confirm name/email/phone prefill works.
   - Confirm profile/booking rows appear in admin/Neon.

3. Legal identity details
   - Fill company/legal entity name.
   - Fill registered/business address.
   - Fill DPO/privacy contact.
   - Confirm refund, cancellation, and consent wording with a PH lawyer/doctor.

## P1 - Product/admin improvements

4. Real doctor-patient messaging — completed
   - Messages are persisted in Neon and visible in both patient and admin views.
   - WhatsApp and email remain available as support fallbacks.

5. Photo upload
   - Decide whether patient photos are required for intake.
   - If yes, add secure upload storage and write URLs to medical intake records.
   - If no, remove any remaining photo-upload placeholder wording.

6. Appointment time from Calendly — completed in code
   - Calendly event time and call URL are stored and shown in patient/admin views.
   - Production has a Calendly access token; add the webhook signing key when a
     webhook subscription is enabled for immediate push updates.

7. Admin audit trail — completed
   - Sensitive admin changes and CSV exports are stored in `admin_audit_logs`.

## P2 - Content and polish

8. Doctor-approved treatment copy
   - Replace generic treatment copy with mechanism, indications, downtime,
     longevity, contraindications, aftercare, and expected follow-up.

9. Safety content
   - Add real BetterSelf safety protocol: sterile kit, product verification,
     cold-chain/storage if relevant, adverse-event process, and emergency routing.

10. Support/contact details
   - Set live support email, phone, and WhatsApp variables in Vercel.
   - Confirm footer/contact pages show the correct public contacts.

11. Testimonials/social proof
   - Add only real, consented testimonials.
   - Avoid before/after claims unless legally and medically reviewed.

12. Consent/account data cleanup
   - Consider a deliberate backup + migration for consent/account-consent
     deduplication if historical duplicates exist.

## Intentionally not public

- Doctor name/photo/license are intentionally not exposed publicly unless the
  founder/doctor changes that decision.
- No memberships or subscriptions.
