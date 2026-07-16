import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { hasValidClerkPublishableKey } from "@/lib/clerk-env";
import { AuthShell } from "@/components/auth-shell";

export default async function SignInPage() {
  if (!hasValidClerkPublishableKey()) {
    return (
      <AuthShell
        eyebrow="Patient account"
        title="Sign in is almost ready."
        description="Patient account access is being configured for BetterSelf."
      >
        <section className="auth-setup-notice">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7A746E]">
            Clerk setup required
          </p>
          <p className="mt-3 text-sm leading-6 text-[#6F6F6F]">
            Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in
            Vercel to enable patient accounts.
          </p>
          <Link className="btn btn-primary mt-6 justify-center" href="/">
            Back to site
          </Link>
        </section>
      </AuthShell>
    );
  }

  // Already signed in? Skip the form and go to the dashboard — prevents a blank <SignIn>
  // when the post-sign-up/sign-in redirect briefly lands here before the client settles.
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      eyebrow="Patient account"
      title="Welcome back."
      description="Sign in to manage appointments, messages, and payments in one private place."
    >
      <SignIn
        signUpUrl="/sign-up"
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
    </AuthShell>
  );
}
