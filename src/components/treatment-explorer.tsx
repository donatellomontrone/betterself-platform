"use client";

import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Treatment, TreatmentCategory } from "@/lib/treatments";

type TreatmentExplorerProps = {
  categories: TreatmentCategory[];
  treatments: Treatment[];
};

const categoryCopy: Record<TreatmentCategory, { eyebrow: string; text: string }> = {
  "Toxin-Based": {
    eyebrow: "Expression, pores, sweat",
    text: "Neurotoxin-based options for face, pores, jawline, and sweating concerns.",
  },
  "Skin Boosters": {
    eyebrow: "Hydration and glow",
    text: "Injectable skin quality treatments for hydration, texture, and refreshed-looking skin.",
  },
  "Acne Scars": {
    eyebrow: "Texture and scars",
    text: "Scar-focused treatments selected after doctor review of scar type and skin condition.",
  },
  Others: {
    eyebrow: "Targeted concerns",
    text: "Doctor-led treatments for contour, lesions, keloids, milia, warts, and selected tone concerns.",
  },
};

const priorityConcerns = [
  "Expression lines",
  "Visible pores",
  "Hydration",
  "Acne scars",
  "Texture",
  "Excessive sweating",
  "Keloids",
  "Warts",
];

function includesSearch(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

export function TreatmentExplorer({ categories, treatments }: TreatmentExplorerProps) {
  const [activeCategory, setActiveCategory] = useState<TreatmentCategory>(categories[0]);
  const [query, setQuery] = useState("");
  const [activeConcern, setActiveConcern] = useState("");

  const concernChips = useMemo(() => {
    const available = new Set(treatments.flatMap((treatment) => treatment.concerns));
    const priority = priorityConcerns.filter((concern) => available.has(concern));
    const fallback = [...available]
      .filter((concern) => !priority.includes(concern))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 4);

    return [...priority, ...fallback].slice(0, 10);
  }, [treatments]);

  const categoryCounts = useMemo(() => {
    return categories.reduce<Record<TreatmentCategory, number>>((counts, category) => {
      counts[category] = treatments.filter((treatment) => treatment.category === category).length;
      return counts;
    }, {} as Record<TreatmentCategory, number>);
  }, [categories, treatments]);

  const filteredTreatments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return treatments.filter((treatment) => {
      if (treatment.category !== activeCategory) return false;
      if (activeConcern && !treatment.concerns.includes(activeConcern)) return false;
      if (!normalizedQuery) return true;

      return [
        treatment.name,
        treatment.category,
        treatment.description,
        treatment.priceLabel,
        treatment.duration,
        treatment.detailNote ?? "",
        ...treatment.concerns,
      ].some((value) => includesSearch(value, normalizedQuery));
    });
  }, [activeCategory, activeConcern, query, treatments]);

  const activeMeta = categoryCopy[activeCategory];
  const spotlight = filteredTreatments[0];
  const compactTreatments = filteredTreatments.slice(spotlight ? 1 : 0);
  const hasFilters = Boolean(query.trim() || activeConcern);

  function resetFilters() {
    setQuery("");
    setActiveConcern("");
  }

  return (
    <section className="px-5 pb-14 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid min-w-0 gap-5 overflow-hidden rounded-lg border border-[#E6DFD5] bg-white p-4 shadow-sm lg:grid-cols-[280px_1fr] lg:overflow-visible lg:p-5">
          <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <div className="min-w-0 overflow-hidden rounded-lg bg-[#FAF8F4] p-3">
              <div className="flex items-center gap-2 px-2 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#3F5249]">
                <SlidersHorizontal className="h-4 w-4" />
                Sections
              </div>
              <div
                className="mt-2 flex min-w-0 gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0"
                role="tablist"
                aria-label="Treatment sections"
              >
                {categories.map((category) => {
                  const isActive = category === activeCategory;

                  return (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`min-w-[11rem] rounded-lg border px-4 py-3 text-left transition lg:min-w-0 ${
                        isActive
                          ? "border-[#3F5249] bg-[#3F5249] text-white shadow-sm"
                          : "border-[#E6DFD5] bg-white text-[#1F1F1F] hover:border-[#3F5249]"
                      }`}
                      onClick={() => setActiveCategory(category)}
                    >
                      <span className="block font-serif text-2xl leading-none">{category}</span>
                      <span className={isActive ? "mt-2 block text-xs text-white/78" : "mt-2 block text-xs text-[#5C574F]"}>
                        {categoryCounts[category]} treatments
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="grid min-w-0 gap-4 rounded-lg bg-[#FAF8F4] p-4 lg:grid-cols-[1fr_0.9fr] lg:items-end">
              <div className="min-w-0">
                <p className="eyebrow">{activeMeta.eyebrow}</p>
                <h2 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F] md:text-5xl">
                  {activeCategory}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#595550]">
                  {activeMeta.text}
                </p>
              </div>
              <div className="grid min-w-0 gap-3">
                <label className="relative block">
                  <span className="sr-only">Search treatments</span>
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5C574F]" />
                  <input
                    className="h-14 w-full rounded-lg border border-[#E6DFD5] bg-white py-0 pl-12 pr-4 text-base text-[#1F1F1F] outline-none transition placeholder:text-[#8A847B] focus:border-[#3F5249] focus:shadow-[0_0_0_3px_rgb(63_82_73_/_0.18)] sm:h-12 sm:text-sm"
                    value={query}
                    placeholder="Search treatment, concern, or price"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                {hasFilters ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E6DFD5] bg-white px-3 py-2 text-sm font-semibold text-[#3F5249]"
                    onClick={resetFilters}
                  >
                    <X className="h-4 w-4" />
                    Clear filters
                  </button>
                ) : null}
              </div>
            </div>

            <div
              className="mt-4 flex min-w-0 flex-wrap gap-2"
              aria-label="Filter by concern"
            >
              {concernChips.map((concern) => {
                const isActive = activeConcern === concern;

                return (
                  <button
                    key={concern}
                    type="button"
                    className={`rounded-full border px-3 py-2 text-sm font-semibold leading-none transition sm:px-4 ${
                      isActive
                        ? "border-[#3F5249] bg-[#3F5249] text-white"
                        : "border-[#E6DFD5] bg-white text-[#4D4D4D] hover:border-[#3F5249]"
                    }`}
                    onClick={() => setActiveConcern(isActive ? "" : concern)}
                  >
                    {concern}
                  </button>
                );
              })}
            </div>

            <p className="mt-5 text-sm text-[#595550]" aria-live="polite">
              Showing <span className="font-semibold text-[#1F1F1F]">{filteredTreatments.length}</span>{" "}
              treatment{filteredTreatments.length === 1 ? "" : "s"} in{" "}
              <span className="font-semibold text-[#1F1F1F]">{activeCategory}</span>.
            </p>

            {spotlight ? (
              <article className="mt-5 grid overflow-hidden rounded-lg border border-[#E6DFD5] bg-white shadow-sm lg:grid-cols-[1fr_0.75fr]">
                <div className="p-5 md:p-6">
                  <p className="eyebrow">Top match</p>
                  <h3 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F] md:text-5xl">
                    {spotlight.name}
                  </h3>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-[#595550]">
                    {spotlight.description}
                  </p>
                  {spotlight.detailNote ? (
                    <p className="mt-2 text-sm italic text-[#5C574F]">{spotlight.detailNote}</p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {spotlight.concerns.slice(0, 4).map((concern) => (
                      <span
                        key={concern}
                        className="rounded-full bg-[#EEF5F5] px-3 py-1 text-xs font-semibold text-[#3F5249]"
                      >
                        {concern}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-between bg-[#F7F3ED] p-5 md:p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <TreatmentStat label="Duration" value={spotlight.duration} />
                    <TreatmentStat label="From" value={spotlight.priceLabel} />
                  </div>
                  <div className="mt-5 grid gap-2">
                    <Link className="btn btn-primary justify-center" href={`/booking?treatment=${spotlight.id}`}>
                      Book Treatment
                    </Link>
                    <Link className="btn btn-secondary justify-center" href={`/treatments/${spotlight.id}`}>
                      View Details
                    </Link>
                  </div>
                </div>
              </article>
            ) : (
              <div className="mt-5 rounded-lg border border-[#E6DFD5] bg-white p-6 text-center">
                <h3 className="font-serif text-3xl text-[#1F1F1F]">No treatments found</h3>
                <p className="mt-2 text-sm leading-6 text-[#595550]">
                  Try another section or clear the search filters.
                </p>
              </div>
            )}

            {compactTreatments.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {compactTreatments.map((treatment) => (
                  <article
                    key={treatment.id}
                    className="grid gap-4 rounded-lg border border-[#E6DFD5] bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-3xl leading-tight text-[#1F1F1F]">
                          {treatment.name}
                        </h3>
                        <span className="rounded-full bg-[#F1ECE4] px-3 py-1 text-xs font-semibold text-[#595550]">
                          {treatment.priceLabel}
                        </span>
                      </div>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#595550]">
                        {treatment.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#FAF8F4] px-3 py-1 text-xs font-semibold text-[#5C574F]">
                          {treatment.duration}
                        </span>
                        {treatment.concerns.slice(0, 3).map((concern) => (
                          <span
                            key={concern}
                            className="rounded-full bg-[#EEF5F5] px-3 py-1 text-xs font-semibold text-[#3F5249]"
                          >
                            {concern}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:w-72">
                      <Link className="btn btn-secondary justify-center" href={`/treatments/${treatment.id}`}>
                        Details
                      </Link>
                      <Link className="btn btn-primary justify-center" href={`/booking?treatment=${treatment.id}`}>
                        Book
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function TreatmentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5C574F]">
        {label}
      </p>
      <p className="mt-1 font-semibold text-[#1F1F1F]">{value}</p>
    </div>
  );
}
