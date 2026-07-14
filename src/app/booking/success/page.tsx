import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { buildCalendlySchedulingUrl } from "@/lib/calendly";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP } from "@/lib/contact";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getPaidConsultationByPaymentReference } from "@/lib/db/queries";

export default async function BookingSuccess({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const bookCall = (Array.isArray(params.book) ? params.book[0] : params.book) === "call";
  const demo = (Array.isArray(params.demo) ? params.demo[0] : params.demo) === "1";
  const reference = Array.isArray(params.reference) ? params.reference[0] : params.reference;
  const { userId } = await auth();
  const paidConsultation =
    bookCall && reference && userId && isDatabaseConfigured()
      ? await getPaidConsultationByPaymentReference(reference, userId)
      : null;
  const canScheduleCall = demo || Boolean(paidConsultation);
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() ?? "";
  const schedulingUrl = buildCalendlySchedulingUrl(calendlyUrl, {
    referenceNumber: canScheduleCall ? reference : undefined,
    source: "paymongo_success",
  });

  return (
    <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 text-[#1F1F1F]">
      <section className="card w-full max-w-xl p-8">
        <p className="eyebrow">{demo ? "Demo checkout" : "PayMongo checkout complete"}</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F]">
          {bookCall ? "Next step: book your doctor call." : "Thank you — payment submitted."}
        </h1>
        <p className="mt-4 leading-7 text-[#595550]">
          {bookCall
            ? canScheduleCall && calendlyUrl
              ? "Your consultation payment is confirmed. Pick a time that works for you and the doctor."
              : "PayMongo is confirming the payment through a webhook. As soon as it is marked paid, your dashboard will show the Calendly scheduling link."
            : "PayMongo is confirming the payment through a webhook. You can track the booking from your dashboard while that sync finishes."}
        </p>
        {bookCall && !canScheduleCall ? (
          <p className="mt-3 rounded-lg border border-[#E7DED2] bg-[#FFFDF8] px-4 py-3 text-sm leading-6 text-[#6E565A]">
            For safety, BetterSelf only opens call scheduling after the consultation payment is
            confirmed for your account. Open your dashboard and refresh the payment status if it
            still shows pending after a minute.
          </p>
        ) : null}
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
          {bookCall && canScheduleCall && schedulingUrl ? (
            <a
              className="btn btn-primary justify-center"
              href={schedulingUrl}
              target="_blank"
              rel="noreferrer"
            >
              Book your call time
            </a>
          ) : null}
          {bookCall && canScheduleCall && !calendlyUrl ? (
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
