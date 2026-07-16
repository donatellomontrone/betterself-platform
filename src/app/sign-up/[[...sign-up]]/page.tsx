import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AccountConsentGate } from "@/components/account-consent-gate";
import { hasValidClerkPublishableKey } from "@/lib/clerk-env";
import { AuthShell } from "@/components/auth-shell";

export default async function SignUpPage() {
  if (!hasValidClerkPublishableKey()) {
    return (
      <AuthShell
        eyebrow="Patient account"
        title="Account creation is almost ready."
        description="Patient account registration is being configured for BetterSelf."
      >
        <section className="auth-setup-notice">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7A746E]">
            Clerk setup required
          </p>
          <p className="mt-3 text-sm leading-6 text-[#6F6F6F]">
            Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in
            Vercel to enable patient registration.
          </p>
          <Link className="btn btn-primary mt-6 justify-center" href="/">
            Back to site
          </Link>
        </section>
      </AuthShell>
    );
  }

  // Already signed in? Skip sign-up and go to the dashboard (prevents the blank-page
  // bounce when the post-sign-up redirect lands back here before the client settles).
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="A private space for your care."
      description="Create an account to keep bookings, messages, payments, and aftercare in one secure place."
    >
      <AccountConsentGate>
        <SignUp
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: "#2F4A40",
              borderRadius: "6px",
            },
            elements: {
              card: "auth-clerk-card",
              rootBox: "auth-clerk-root",
            },
          }}
        />
      </AccountConsentGate>
    </AuthShell>
  );
}
