/**
 * Admin/doctor access is granted to emails listed in ADMIN_EMAILS
 * (comma-separated). Keep this server-only (no NEXT_PUBLIC_ prefix) so the list
 * isn't shipped to the browser.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
