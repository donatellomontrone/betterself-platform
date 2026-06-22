# Stack Setup: GitHub, Vercel, Clerk, Neon

BetterSelf is prepared for this stack:

- GitHub: source control, pull requests, CI
- Vercel: Next.js hosting and environment variables
- Clerk: patient and doctor authentication
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
/booking
/dashboard
/messages
```

## 2. Neon

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

## 3. GitHub

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

## 4. Vercel

Create a Vercel project from the GitHub repository.

Add these environment variables in Vercel for Development, Preview, and
Production:

```bash
NEXT_PUBLIC_SITE_URL=
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

## 5. PayMongo

Register this webhook URL after the Vercel deployment exists:

```text
https://your-domain.com/api/paymongo/webhook
```

Use the verified webhook as the source of truth for payment fulfillment.
