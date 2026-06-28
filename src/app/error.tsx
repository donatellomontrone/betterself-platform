"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 text-[#1F1F1F]">
      <section className="card w-full max-w-lg p-8 text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F]">We hit a snag</h1>
        <p className="mt-4 leading-7 text-[#595550]">
          Please try again. If it keeps happening, contact us and we&apos;ll help sort it out.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button className="btn btn-primary justify-center" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="btn btn-secondary justify-center" href="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
