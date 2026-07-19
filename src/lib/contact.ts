/**
 * Public contact details shown on the site. The email defaults to the real
 * BetterSelf support inbox so a contact channel is always visible; all three can
 * be overridden per environment via NEXT_PUBLIC_SUPPORT_EMAIL / _PHONE / _WHATSAPP_URL.
 */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "dr.swab.manila@gmail.com";
export const SUPPORT_PHONE =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || "+63 917 548 3579";
export const SUPPORT_WHATSAPP =
  process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim() || "https://wa.me/639175483579";
export const SUPPORT_INSTAGRAM = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "";
