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
    <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 text-[#1F1F1F]">
      <section className="card w-full max-w-xl p-8">
        <p className="eyebrow">Demo checkout</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F]">
          PayMongo is ready to connect.
        </h1>
        <p className="mt-4 leading-7 text-[#595550]">
          This screen appears because no PayMongo key is configured yet. Once the key is added,
          this step creates a live PayMongo hosted checkout and redirects the patient there to pay.
        </p>
        <div className="mt-6 rounded-lg border border-[#ECDCDE] bg-[#F4E8EA] p-4">
          <p className="text-sm font-semibold text-[#6E444E]">Reference</p>
          <p className="mt-1 font-mono text-sm text-[#1F1F1F]">{reference ?? "Not generated"}</p>
        </div>
        <Link className="btn btn-primary mt-6 justify-center" href="/dashboard">
          Return to BetterSelf
        </Link>
      </section>
    </main>
  );
}
