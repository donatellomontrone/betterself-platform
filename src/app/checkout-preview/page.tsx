import Link from "next/link";

export default async function CheckoutPreview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reference = Array.isArray(params.reference)
    ? params.reference[0]
    : params.reference;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7efe2] px-5 text-[#203a33]">
      <section className="w-full max-w-xl rounded-lg border border-[#e2d3c7] bg-white p-8 shadow-[0_30px_90px_rgba(65,75,63,0.16)]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b99086]">
          Demo checkout
        </p>
        <h1 className="mt-3 font-serif text-4xl text-[#486a5d]">
          PayMongo is ready to connect
        </h1>
        <p className="mt-4 leading-7 text-[#6f665f]">
          This screen appears because no `PAYMONGO_SECRET_KEY` is configured yet.
          Once the key is added, the same checkout button will create a live
          PayMongo hosted checkout session and redirect the customer there.
        </p>
        <div className="mt-6 rounded-lg bg-[#f7efe2] p-4">
          <p className="text-sm font-semibold text-[#486a5d]">Reference</p>
          <p className="mt-1 font-mono text-sm text-[#203a33]">
            {reference ?? "Not generated"}
          </p>
        </div>
        <Link
          className="mt-6 inline-flex h-12 items-center rounded-lg bg-[#486a5d] px-5 font-bold text-white transition hover:bg-[#38564b]"
          href="/"
        >
          Return to BetterSelf
        </Link>
      </section>
    </main>
  );
}
