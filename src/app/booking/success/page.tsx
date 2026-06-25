import Link from "next/link";

export default async function BookingSuccess({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const bookCall = (Array.isArray(params.book) ? params.book[0] : params.book) === "call";
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() ?? "";

  return (
    <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 text-[#1F1F1F]">
      <section className="card w-full max-w-xl p-8">
        <p className="eyebrow">Payment received</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F]">
          {bookCall ? "You're set — now book your call." : "Thank you — payment received."}
        </h1>
        <p className="mt-4 leading-7 text-[#595550]">
          {bookCall
            ? "Your consultation is confirmed once payment clears. Pick a time that works for you and the doctor will call you then. It also appears in your dashboard."
            : "We've received your payment. You can track your booking from your dashboard, and we'll be in touch about next steps."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {bookCall && calendlyUrl ? (
            <a
              className="btn btn-primary justify-center"
              href={calendlyUrl}
              target="_blank"
              rel="noreferrer"
            >
              Book your call time
            </a>
          ) : null}
          <Link className="btn btn-secondary justify-center" href="/dashboard">
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
