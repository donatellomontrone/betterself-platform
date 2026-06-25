import Link from "next/link";

export default function BookingCancelled() {
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
