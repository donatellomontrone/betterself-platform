# Stack Setup: GitHub, Vercel, Clerk, Calendly, Neon

BetterSelf is prepared for this stack:

- GitHub: source control, pull requests, CI
- Vercel: Next.js hosting and environment variables
- Clerk: patient and doctor authentication
- Calendly: doctor availability and appointment scheduling
- Neon: Postgres database for bookings, intake, messages, payments, and aftercare
- PayMongo: hosted checkout and payment webhooks

## 1. Clerk

Install Clerk from the Vercel Marketplace or Clerk dashboard, then add these
environment variables locally and on Vercel:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

Implemented app files:

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

`/booking` is public so a patient can choose a treatment, fill intake, schedule
in Calendly, and pay before creating an account.

## 2. Calendly

Create a Calendly event type for the BetterSelf home-treatment appointment.
Recommended event setup:

- Event name: `BetterSelf Home Treatment`
- Location: custom question or phone/WhatsApp confirmation
- Invitee questions:
  - Treatment requested
  - Metro Manila area
  - Phone number
  - Home address or access notes

Add this environment variable locally and on Vercel:

```bash
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/<account>/<event-type>
```

The booking page embeds Calendly with `Calendly.initInlineWidget`, pre-fills
name and email, and passes the treatment/location details into Calendly custom
answers.

## 3. Neon

Create a Neon Postgres store from the Vercel Marketplace, then run:

```text
database/schema.sql
```

The schema creates:

- `user_profiles`
- `patient_profiles`
- `treatments`
- `bookings`
- `medical_intakes`
- `messages`
- `payments`
- `aftercare_instructions`

Required environment variable:

```bash
DATABASE_URL=
```

The Neon helper is:

```text
src/lib/db/client.ts
```

It uses lazy initialization so `next build` does not crash before Vercel injects
the database environment variable.

## 4. GitHub

The project includes CI at:

```text
.github/workflows/ci.yml
```

CI runs:

```bash
npm ci
npm run lint
npm run build
npm audit --audit-level=moderate
```

Once a GitHub repository exists, add it as the remote:

```bash
git remote add origin git@github.com:<owner>/<repo>.git
git push -u origin main
```

## 5. Vercel

Create a Vercel project from the GitHub repository.

Add these environment variables in Vercel for Development, Preview, and
Production:

```bash
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_CALENDLY_URL=
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
```

Set `NEXT_PUBLIC_SITE_URL` to the Vercel domain for preview/production.
Set `NEXT_PUBLIC_CALENDLY_URL` to the public Calendly event URL and redeploy
after changing it.

## 6. PayMongo

Register this webhook URL after the Vercel deployment exists:

```text
https://your-domain.com/api/paymongo/webhook
```

Use the verified webhook as the source of truth for payment fulfillment.

The current checkout route creates PayMongo Hosted Checkout sessions at:

```text
https://api.paymongo.com/v2/checkout_sessions
```

The checkout metadata includes treatment ID/name, appointment type, location,
payment mode, and Calendly event/invitee references.
