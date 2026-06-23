# BetterSelf — To-Do (prioritized)

Last updated: 2026-06-23. See `docs/HANDOFF.md` for what's already done.

## 🔴 P0 — Production launch blockers (config, not code)

1. **Custom domain.** The live site is on `betterself-platform-mu.vercel.app`. You
   need your own domain (e.g. `betterself.ph`) for both Clerk production and a
   trustworthy brand. Buy it and add it to the Vercel project.
2. **Clerk production instance.** Login/Dashboard do NOT work on the deployed URL
   because the current key is a **dev** key (`pk_test`, works only on localhost) —
   protected routes return 404 (`dev-browser-missing`). Fix: create a Clerk
   **production** instance for the custom domain (DNS CNAME records), then set
   `pk_live`/`sk_live` in Vercel Production env. (Requires the domain from #1.)
3. **PayMongo key in Vercel is invalid.** Production checkout returns
   `401 "Invalid merchant key format"`. Either remove `PAYMONGO_SECRET_KEY` from
   Vercel (→ demo mode works) or set the **real** PayMongo secret key + set
   `PAYMONGO_WEBHOOK_SECRET` and register the webhook
   `https://<domain>/api/paymongo/webhook`.
## 🟠 P1 — Before taking real patients

5. **Real contact details.** Set `NEXT_PUBLIC_SUPPORT_EMAIL`, `_PHONE`,
   `_WHATSAPP_URL` in Vercel so the footer shows a real phone/email/WhatsApp.
6. **Doctor↔patient chat is not real.** `DoctorChat` is local-only (no backend, no
   doctor accounts). Build message persistence (`messages` table exists) + doctor
   accounts/roles, or switch to an honest async/WhatsApp model.
7. **Photo upload is a placeholder.** Booking step 2 shows "Optional photo upload
   structure" with no real upload. Wire real uploads (e.g. Vercel Blob /
   UploadThing) into `medical_intakes.photo_uploads`, or remove the stub.
8. **Lawyer-review the legal pages.** `/privacy`, `/terms`, `/consent` are
   plain-language drafts — have a PH lawyer confirm the registered entity, address,
   DPO, and retention terms.
9. **Surface real appointment date/time.** The dashboard "latest appointment" shows
    the booked-on date; capture and show the actual Calendly slot date/time
    (store it from the Calendly event), with an "Awaiting scheduling" fallback.

## 🟡 P2 — Polish / content

10. **Per-treatment medical copy.** The treatment catalog uses hedged descriptions and
    one cloned aftercare block. Rewrite each with mechanism, timeline, longevity,
    sessions, downtime, and treatment-specific aftercare. **Needs medical input.**
11. **Home page rhythm & CTAs.** Vary repeated heading-left/card-right sections;
    reduce the many identical "Book Treatment" buttons to a clear hierarchy
    (one hero, one mid, one final).
12. **Treatments page**: category links look like buttons — make them pill
    filters/tabs with an active/scroll-spy state; per-category copy is boilerplate.
13. **Responsive polish**: Calendly embed fixed at 720px (nested-scroll on phones);
    chat list/composer cramped on mobile; add small-screen heading tiers.
14. **A11y finishing**: promote real `<p>` titles to headings; `aria-hidden` on
    decorative icons;
    visually-hidden chat sender labels (authorship is color-only).
15. **Safety/authenticity content**: add concrete FDA-PH product verification,
    cold-chain for home visits, and an adverse-event/emergency protocol.

## ⏭️ Intentionally NOT doing
- **Named doctor / photo / PRC license / testimonials / before-after** — founder
  wants the doctor kept anonymous.

## Quick reference — current production issues to retest after fixes
- `GET /dashboard` on prod → currently 404 (Clerk dev-on-domain). Should redirect to
  sign-in once the production Clerk instance + domain are set.
- `POST /api/checkout` on prod → currently 401 invalid PayMongo key. Should return a
  demo or real checkout URL once the PayMongo env is fixed.
