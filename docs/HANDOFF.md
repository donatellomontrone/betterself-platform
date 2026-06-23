# BetterSelf — Project State & Handoff

Handoff notes for another engineer/agent (e.g. Codex) picking up this project.
Last updated: 2026-06-23.

## What it is
BetterSelf is a **doctor-led, home-visit medical aesthetics platform** for Metro
Manila, Philippines (Botox, fillers, skin boosters, etc.). Patients sign up, book a
treatment for a home visit (or an online doctor review), chat with the doctor, and
pay online. Prices in PHP (₱). **The doctor is intentionally kept anonymous** (no
name/photo/PRC license) per the founder.

## Stack & conventions
- **Next.js 16** (App Router, Turbopack), React 19, Tailwind CSS v4.
- **Neon** (Postgres) — DB. **Clerk** — auth. **PayMongo** — payments (Hosted
  Checkout). **Calendly** — scheduling (inline embed). **Google Places (New)** —
  booking address autocomplete. **Vercel** — hosting (auto-deploy from `main`).
- **Next 16 gotchas (important):**
  - Middleware lives in `src/proxy.ts` (NOT `middleware.ts`).
  - `searchParams`, `cookies`, `headers`, Clerk `auth()`/`currentUser()` are async.
  - This `@clerk/nextjs` build does **not** export `<SignedIn>/<SignedOut>` — use
    `useUser()` (client) or `auth()` (server). Header auth is a client island in
    `src/components/header-auth.tsx`.
  - Clerk redirect env vars (`*_AFTER_SIGN_IN_URL`) are ignored — set
    `fallbackRedirectUrl` on `<SignIn>`/`<SignUp>` instead.
  - `read node_modules/next/dist/docs/` before writing Next code (see AGENTS.md).
  - `cacheComponents` is OFF.

## How to run
```
npm install
npm run dev      # http://localhost:3000 (use any PORT=)
npm run build    # production build (clean)
npm run lint
```
Auth (Clerk dev instance) works on **localhost**. See env vars below.

## Environment variables (`.env.local`, mirrored in Vercel)
- `DATABASE_URL` (+ Neon `POSTGRES_*`) — set.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — **dev keys (`pk_test`)**.
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `..._SIGN_UP_URL=/sign-up`.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — set + restricted (localhost + `*.vercel.app`).
- `NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/betterselfhealth/new-meeting`.
- `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` — **NOT real** (demo locally;
  an invalid placeholder is set in Vercel prod — see TODO).
- `NEXT_PUBLIC_SUPPORT_EMAIL` / `_PHONE` / `_WHATSAPP_URL` — optional footer contacts
  (currently unset → rows hidden).

## Git / deploy state
- All work merged to **`main`** and pushed; Vercel production builds from `main`.
- Production URL: **`betterself-platform-mu.vercel.app`** (the bare
  `betterself-platform.vercel.app` is an unrelated app).
- GitHub: `github.com/donatellomontrone/betterself-platform`. Local uses SSH alias
  `github-betterself` (key `~/.ssh/betterself_github_ed25519`).

## ✅ Done

### Data / backend (Neon)
- `src/lib/db/client.ts` (`getSql`) + `src/lib/db/queries.ts` (data layer).
- Schema in `database/schema.sql` (applied; `treatments` seeded with 25 rows).
- Checkout (`/api/checkout`) persists, for a signed-in patient: user profile,
  patient profile, **booking** (`pending_doctor_review`), **payment** (pending),
  and a **medical_intake** (screening answers + consent). Best-effort — DB errors
  never block payment; anonymous checkout falls back to a non-persisted demo.
- PayMongo **webhook** (`/api/paymongo/webhook`) marks booking + payment `paid` by
  reference on `checkout_session.payment.paid`.
- Verified end-to-end against live Neon (a real booking was created + read back).

### Auth (Clerk)
- `src/proxy.ts` protects `/dashboard`, `/messages`, `/admin`; graceful fallback if
  keys missing. Embedded `<SignIn>`/`<SignUp>` at `/sign-in`, `/sign-up` with
  `fallbackRedirectUrl="/dashboard"`. Header reflects auth via `header-auth.tsx`.

### Booking flow (`src/components/platform-widgets.tsx`)
- 5-step wizard with labelled stepper + "no charge until the last step".
- **Google Places address search** (`src/components/address-autocomplete.tsx`),
  restricted to Metro Manila; rejects out-of-area picks; falls back to a text input
  with no key. Address (and the address step) is hidden for "Online doctor review".
- **Home-visit fee** (₱1,500) only applies to home visits (client total, summary,
  and PayMongo line items all conditional).
- Medical-intake (7) and consent (4) checkboxes are **controlled**; payment is
  blocked until all consents are ticked; answers + consent persisted.
- Per-field validation (required markers, email + PH-phone format, inline errors).
- Payment step shows security cues + refund line; CTA "Continue to secure payment".
- Bookings paid without a verified Calendly event are flagged in `bookings.notes`.
- Calendly inline embed wired (`NEXT_PUBLIC_CALENDLY_URL`).

### Dashboard (`betterself-pages.tsx` `DashboardPage`, `src/app/dashboard/page.tsx`)
- Loads the signed-in patient's real bookings (`force-dynamic`). Real stat cards,
  latest appointment, treatment history with **semantic status colors**, empty
  states; aftercare gated on a completed treatment.

### Admin / doctor dashboard
- `/admin` is protected by Clerk and gated by `ADMIN_EMAILS`.
- Loads real bookings from Neon through `getAllBookings()`.
- Supports booking status updates through `src/app/admin/actions.ts` and
  `updateBookingStatusAction`.
- Shows an empty state instead of fabricated patients when there are no bookings.

### Front-end overhaul (from a 7-dimension UX audit)
- `globals.css`: sage accent on CTAs/links/focus; deeper card elevation + larger
  radius; readable eyebrows; global `:focus-visible` ring; tighter serif tracking.
- Darkened washed-out greys site-wide.
- Removed all fake/placeholder content: About "placeholder" badges, the always-on
  fake "booking received" card, the fake dashboard demo cards, the fake instant
  "doctor" chat reply (now an honest system acknowledgement + single channel).
- Hero badge no longer duplicates the H1; treatment-detail card leads with price.
- **Legal pages**: `/privacy`, `/terms`, `/consent` (`src/components/legal-pages.tsx`)
  + footer legal bar + env-driven footer Contact column.
- Removed the public employee-discount/referral section from the treatments page
  so internal partner names are not exposed publicly.
- A11y: header/main/footer landmarks + skip-to-content link; labelled booking
  stepper with `role="progressbar"`; mobile bottom "Book" bar is a client island
  (`mobile-cta.tsx`) that respects iOS safe-area and hides on
  booking/messages/dashboard. Fixed the tablet (768–1023px) nav dead zone.

### Key files
- Pages/UI: `src/components/betterself-pages.tsx`, `site-shell.tsx`,
  `platform-widgets.tsx`, `address-autocomplete.tsx`, `header-auth.tsx`,
  `mobile-cta.tsx`, `legal-pages.tsx`.
- API: `src/app/api/checkout/route.ts`, `src/app/api/paymongo/webhook/route.ts`.
- Content: `src/lib/treatments.ts`. Styles/tokens: `src/app/globals.css`.

See `docs/TODO.md` for what's left.
