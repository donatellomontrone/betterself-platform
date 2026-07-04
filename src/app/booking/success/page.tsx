import Link from "next/link";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP } from "@/lib/contact";

export default async function BookingSuccess({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const bookCall = (Array.isArray(params.book) ? params.book[0] : params.book) === "call";
  const demo = (Array.isArray(params.demo) ? params.demo[0] : params.demo) === "1";
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() ?? "";

  return (
    <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 text-[#1F1F1F]">
      <section className="card w-full max-w-xl p-8">
        <p className="eyebrow">{demo ? "Demo checkout" : "PayMongo checkout complete"}</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F]">
          {bookCall ? "Next step: book your doctor call." : "Thank you — payment submitted."}
        </h1>
        <p className="mt-4 leading-7 text-[#595550]">
          {bookCall
            ? calendlyUrl
              ? "Pick a time that works for you. PayMongo confirms the payment through a webhook; once that lands, your dashboard marks the consultation as paid."
              : "Message us and we'll set your call time. PayMongo confirms the payment through a webhook; once that lands, your dashboard marks the consultation as paid."
            : "PayMongo is confirming the payment through a webhook. You can track the booking from your dashboard while that sync finishes."}
        </p>
        {!demo ? (
          <p className="mt-3 rounded-lg border border-[#F6D7A7] bg-[#FFF8E7] px-4 py-3 text-sm leading-6 text-[#6E565A]">
            If your dashboard still says payment pending after a few minutes, do not pay
            again yet. BetterSelf can verify the payment in PayMongo and reconcile it.
          </p>
        ) : null}
        {demo ? (
          <p className="mt-3 rounded-lg border border-[#ECDCDE] bg-[#F4E8EA] px-4 py-3 text-sm leading-6 text-[#6E444E]">
            Demo mode: no real payment was taken. Online payments turn on once PayMongo is
            connected.
          </p>
        ) : null}
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
          {bookCall && !calendlyUrl ? (
            <a
              className="btn btn-primary justify-center"
              href={SUPPORT_WHATSAPP || `mailto:${SUPPORT_EMAIL}`}
              target="_blank"
              rel="noreferrer"
            >
              Message us to schedule
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
