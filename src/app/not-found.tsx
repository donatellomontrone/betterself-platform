import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 text-[#1F1F1F]">
      <section className="card w-full max-w-lg p-8 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F]">Page not found</h1>
        <p className="mt-4 leading-7 text-[#595550]">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link className="btn btn-primary mt-6 justify-center" href="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
