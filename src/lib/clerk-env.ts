export function hasValidClerkPublishableKey() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return Boolean(key?.startsWith("pk_test_") || key?.startsWith("pk_live_"));
}

export function hasValidClerkServerKeys() {
  const secretKey = process.env.CLERK_SECRET_KEY;

  return Boolean(
    hasValidClerkPublishableKey() &&
      (secretKey?.startsWith("sk_test_") || secretKey?.startsWith("sk_live_")),
  );
}
