/**
 * Admin/doctor access is granted to emails listed in ADMIN_EMAILS
 * (comma-separated). Keep this server-only (no NEXT_PUBLIC_ prefix) so the list
 * isn't shipped to the browser.
 */
function envList(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAdminUser(input: {
  userId?: string | null;
  email?: string | null;
  emailVerified?: boolean;
}): boolean {
  const allowedUserIds = envList("ADMIN_USER_IDS");
  if (input.userId && allowedUserIds.includes(input.userId)) return true;

  // Email is retained only as a transition path for the existing deployment.
  // Require the primary email to be verified and move admins to immutable Clerk
  // user IDs in ADMIN_USER_IDS as soon as they have logged in once.
  if (!input.email || input.emailVerified === false) return false;
  const allowed = envList("ADMIN_EMAILS").map((value) => value.toLowerCase());
  return allowed.includes(input.email.toLowerCase());
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return isAdminUser({ email, emailVerified: true });
}
