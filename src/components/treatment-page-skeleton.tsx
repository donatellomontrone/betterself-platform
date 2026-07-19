import { PageShell } from "@/components/site-shell";

export function TreatmentPageSkeleton({ detail = false }: { detail?: boolean }) {
  return (
    <PageShell>
      <section className="px-5 py-16 lg:px-8 lg:py-24" aria-busy="true" aria-label="Loading treatment information">
        <div className="mx-auto max-w-7xl">
          <div className={detail ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]" : "grid gap-12 lg:grid-cols-[0.9fr_1.1fr]"}>
            <div className="space-y-5">
              <div className="skeleton-block h-3 w-32" />
              <div className="skeleton-block h-16 w-full max-w-2xl" />
              <div className="skeleton-block h-5 w-full max-w-xl" />
              <div className="skeleton-block h-5 w-4/5 max-w-lg" />
              <div className="skeleton-block mt-8 h-12 w-52" />
            </div>
            <div className="skeleton-block min-h-72 rounded-[1.125rem]" />
          </div>
          {!detail ? (
            <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="skeleton-block h-80 rounded-[1.125rem]" />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
