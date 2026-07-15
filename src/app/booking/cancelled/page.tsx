import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { markPatientPendingPaymentAttemptFailed } from "@/lib/db/queries";

export default async function BookingCancelled({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reference = Array.isArray(params.reference) ? params.reference[0] : params.reference;
  const { userId } = await auth();

  if (reference && userId && isDatabaseConfigured()) {
    try {
      await markPatientPendingPaymentAttemptFailed(reference, userId);
    } catch (error) {
      // Preserve the clear cancellation screen; the dashboard can still retry or
      // reconcile the checkout if a temporary database outage prevented cleanup.
      console.error("[booking cancelled] could not close payment attempt", error);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 text-[#1F1F1F]">
      <section className="card w-full max-w-xl p-8">
        <p className="eyebrow">Checkout cancelled</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F]">
          No payment was completed.
        </h1>
        <p className="mt-4 leading-7 text-[#595550]">
          Nothing was charged. You can pick up where you left off whenever you&apos;re ready, or
          message us if you&apos;d like help choosing a time.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link className="btn btn-primary justify-center" href="/booking">
            Continue booking
          </Link>
          <Link className="btn btn-secondary justify-center" href="/dashboard">
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
