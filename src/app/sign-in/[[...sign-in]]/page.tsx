import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { hasValidClerkPublishableKey } from "@/lib/clerk-env";

export default async function SignInPage() {
  if (!hasValidClerkPublishableKey()) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 py-10">
        <section className="max-w-md rounded-lg border border-[#E6DFD5] bg-white p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7A746E]">
            Clerk setup required
          </p>
          <h1 className="mt-3 font-serif text-4xl text-[#1F1F1F]">
            Sign in is almost ready.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6F6F6F]">
            Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in
            Vercel to enable patient accounts.
          </p>
          <Link className="btn btn-primary mt-6 justify-center" href="/">
            Back to site
          </Link>
        </section>
      </main>
    );
  }

  // Already signed in? Skip the form and go to the dashboard — prevents a blank <SignIn>
  // when the post-sign-up/sign-in redirect briefly lands here before the client settles.
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 py-10">
      <SignIn
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
        appearance={{
          variables: {
            colorPrimary: "#8F5B67",
            borderRadius: "8px",
          },
        }}
      />
    </main>
  );
}
