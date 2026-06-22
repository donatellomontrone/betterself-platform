import Link from "next/link";

export default function BookingCancelled() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7efe2] px-5 text-[#203a33]">
      <section className="w-full max-w-xl rounded-lg border border-[#e2d3c7] bg-white p-8 shadow-[0_30px_90px_rgba(65,75,63,0.16)]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b99086]">
          Checkout cancelled
        </p>
        <h1 className="mt-3 font-serif text-4xl text-[#486a5d]">
          No payment was completed
        </h1>
        <p className="mt-4 leading-7 text-[#6f665f]">
          The booking can stay in draft while the customer talks with the doctor
          or chooses a different time.
        </p>
        <Link
          className="mt-6 inline-flex h-12 items-center rounded-lg bg-[#486a5d] px-5 font-bold text-white transition hover:bg-[#38564b]"
          href="/"
        >
          Continue booking
        </Link>
      </section>
    </main>
  );
}
