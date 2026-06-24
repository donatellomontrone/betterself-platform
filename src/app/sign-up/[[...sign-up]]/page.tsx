import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { AccountConsentGate } from "@/components/account-consent-gate";
import { hasValidClerkPublishableKey } from "@/lib/clerk-env";

export default function SignUpPage() {
  if (!hasValidClerkPublishableKey()) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 py-10">
        <section className="max-w-md rounded-lg border border-[#E6DFD5] bg-white p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7A746E]">
            Clerk setup required
          </p>
          <h1 className="mt-3 font-serif text-4xl text-[#1F1F1F]">
            Account creation is almost ready.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6F6F6F]">
            Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in
            Vercel to enable patient registration.
          </p>
          <Link className="btn btn-primary mt-6 justify-center" href="/">
            Back to site
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 py-10">
      <AccountConsentGate>
        <SignUp
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: "#4F5B55",
              borderRadius: "8px",
            },
          }}
        />
      </AccountConsentGate>
    </main>
  );
}
