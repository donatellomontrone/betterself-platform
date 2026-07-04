# Stack Setup: GitHub, Vercel, Clerk, Calendly, Neon, PayMongo

Last updated: 2026-07-04

BetterSelf uses:

- GitHub for source control.
- Vercel for Next.js hosting and environment variables.
- Clerk for patient/admin authentication.
- Neon Postgres for bookings, intake, messages, payments, and profiles.
- Calendly for doctor-call scheduling.
- PayMongo for QR Ph Hosted Checkout and payment webhooks.
- Google Places for optional home-address search.
- OpenAI for optional concern-to-treatment suggestions.

## 1. Vercel

The production project deploys from `main`.

Important production variables:

```bash
NEXT_PUBLIC_SITE_URL=https://betterself.health
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
ADMIN_EMAILS=
NEXT_PUBLIC_CALENDLY_URL=
NEXT_PUBLIC_DOCTOR_VIDEO_CALL_URL=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
NEXT_PUBLIC_SUPPORT_EMAIL=
NEXT_PUBLIC_SUPPORT_PHONE=
NEXT_PUBLIC_WHATSAPP_URL=
```

Mark these as sensitive/server-only where Vercel allows it:

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `ADMIN_EMAILS`
- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_WEBHOOK_SECRET`
- `OPENAI_API_KEY`

Redeploy after changing environment variables.

## 2. Clerk

Production auth is wired through:

```text
src/app/sign-in/[[...sign-in]]/page.tsx
src/app/sign-up/[[...sign-up]]/page.tsx
src/proxy.ts
```

Protected routes:

```text
/admin
/dashboard
/messages
```

Admin access is controlled by `ADMIN_EMAILS` and checked server-side. The sign-up
page is wrapped in an account-consent gate before Clerk account creation.

## 3. Neon

Schema:

```text
database/schema.sql
```

Main data layer:

```text
src/lib/db/client.ts
src/lib/db/queries.ts
```

Core tables include:

- `user_profiles`
- `patient_profiles`
- `treatments`
- `bookings`
- `medical_intakes`
- `messages`
- `payments`
- `aftercare_instructions`

Run any DB migration deliberately with backup. Do not hand-edit production data
from a browser unless reconciling a specific booking/payment.

## 4. Calendly

Set:

```bash
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/<account>/<event-type>
```

Recommended Calendly questions:

- Treatment or consultation requested.
- Patient concern.
- Phone number.
- Home address/access notes for home visits.

If Calendly does not expose a per-booking meeting URL, set:

```bash
NEXT_PUBLIC_DOCTOR_VIDEO_CALL_URL=
```

This acts as a shared fallback video-call link in patient/admin views.

## 5. PayMongo

Payment mode is QR Ph only.

Webhook URL:

```text
https://betterself.health/api/paymongo/webhook
```

Required events:

```text
checkout_session.payment.paid
payment.paid
```

Use `checkout_session.payment.paid` as the primary source of truth for Hosted
Checkout. The webhook also handles a direct paid payment/resource shape where
available.

Set:

```bash
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
```

Go-live checklist:

1. Complete PayMongo business verification.
2. Enable QR Ph payment channel.
3. Add live keys in Vercel.
4. Add webhook URL in PayMongo.
5. Redeploy Vercel.
6. Create a real small checkout.
7. Confirm the corresponding booking/payment row becomes paid in Neon.

## 6. Google Places

Set:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

The address search is optional and gated behind optional-cookie acceptance.
Manual address entry still works when the key is absent or cookies are declined.

## 7. OpenAI

Set only if AI concern matching should call OpenAI:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

If unset, BetterSelf uses the local fallback recommendation logic. The public
recommendation endpoint caps patient concern input before calling OpenAI.

## 8. GitHub

Normal workflow:

```bash
npm run lint
npx tsc --noEmit
npm run build
git status
git add <files>
git commit -m "<message>"
git push origin main
```

Vercel will deploy `main` automatically.
