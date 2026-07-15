"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Treatment, TreatmentCategory } from "@/lib/treatments";

type TreatmentExplorerProps = {
  categories: TreatmentCategory[];
  treatments: Treatment[];
};

const categoryCopy: Record<TreatmentCategory, { eyebrow: string; text: string }> = {
  "Toxin-Based": {
    eyebrow: "Expression, pores, sweat",
    text: "Doctor-led options for expression lines, pores, jawline, and sweating concerns.",
  },
  "Skin Boosters": {
    eyebrow: "Hydration and glow",
    text: "Injectable treatments selected for hydration, texture, and refreshed-looking skin.",
  },
  "Acne Scars": {
    eyebrow: "Texture and scars",
    text: "Scar-focused treatments selected after a review of scar type and skin condition.",
  },
  Others: {
    eyebrow: "Targeted concerns",
    text: "Doctor-led care for contour, lesions, keloids, milia, warts, and selected tone concerns.",
  },
};

function includesSearch(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

export function TreatmentExplorer({ categories, treatments }: TreatmentExplorerProps) {
  const [activeCategory, setActiveCategory] = useState<TreatmentCategory>(categories[0]);
  const [query, setQuery] = useState("");

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
  }, [activeCategory, query, treatments]);

  const activeMeta = categoryCopy[activeCategory];

  return (
    <section className="treatment-edit-section px-5 pb-20 pt-12 lg:px-8 lg:pb-28 lg:pt-16">
      <div className="mx-auto max-w-7xl">
        <div className="border-b border-[#E6DFD5] pb-7 lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div>
            <p className="eyebrow">Treatment menu</p>
            <h2 className="mt-3 font-serif text-4xl leading-[0.98] text-[#1F1F1F] md:text-5xl">
              Find the care that fits.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#595550]">
              Start with a category, then choose a treatment or read the details before you request it.
            </p>
          </div>
          <label className="relative mt-6 block w-full max-w-md lg:mt-0">
            <span className="sr-only">Search treatments</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C574F]" />
            <input
              className="h-12 w-full rounded-full border border-[#E6DFD5] bg-white/75 py-0 pl-11 pr-11 text-sm text-[#1F1F1F] outline-none transition placeholder:text-[#807971] focus:border-[#8F5B67] focus:shadow-[0_0_0_3px_rgb(143_91_103_/_0.14)]"
              value={query}
              placeholder="Search a treatment or concern"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear treatment search"
                className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[#8F5B67] transition hover:bg-[#F6EDEA]"
                onClick={() => setQuery("")}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Treatment categories">
          {categories.map((category) => {
            const isActive = category === activeCategory;

            return (
              <button
                key={category}
                type="button"
                aria-pressed={isActive}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "border-[#8F5B67] bg-[#8F5B67] text-white"
                    : "border-[#E6DFD5] bg-white/65 text-[#494540] hover:border-[#8F5B67]"
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
                <span className={isActive ? "ml-2 text-white/75" : "ml-2 text-[#8F5B67]"}>
                  {categoryCounts[category]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(13rem,0.32fr)_1fr] lg:gap-14">
          <div className="lg:pt-2">
            <p className="eyebrow">{activeMeta.eyebrow}</p>
            <h3 className="mt-3 font-serif text-3xl leading-tight text-[#1F1F1F]">{activeCategory}</h3>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#595550]">{activeMeta.text}</p>
            <p className="mt-5 text-sm text-[#5C574F]" aria-live="polite">
              {filteredTreatments.length} treatment{filteredTreatments.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <div className="border-t border-[#E6DFD5]">
            {filteredTreatments.map((treatment) => (
              <article
                key={treatment.id}
                className="grid gap-4 border-b border-[#E6DFD5] py-6 md:grid-cols-[1fr_auto] md:items-center md:gap-8"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8F5B67]">
                    {treatment.priceLabel}
                  </p>
                  <h3 className="mt-2 font-serif text-3xl leading-tight text-[#1F1F1F]">{treatment.name}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#595550]">{treatment.description}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#807971]">
                    {treatment.duration}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 md:flex-col md:items-stretch">
                  <Link className="btn btn-secondary justify-center rounded-full" href={`/treatments/${treatment.id}`} aria-label={`View details for ${treatment.name}`}>
                    View treatment
                  </Link>
                  <Link className="btn btn-primary justify-center rounded-full" href={`/booking?treatment=${treatment.id}&direct=1`} aria-label={`Request ${treatment.name}`}>
                    Request
                  </Link>
                </div>
              </article>
            ))}

            {filteredTreatments.length === 0 ? (
              <div className="py-12">
                <h3 className="font-serif text-3xl text-[#1F1F1F]">No treatments found</h3>
                <p className="mt-2 text-sm leading-6 text-[#595550]">Try a different search or choose another category.</p>
                <button
                  type="button"
                  className="mt-5 text-sm font-semibold text-[#8F5B67] underline decoration-[#C68997]/60 underline-offset-4"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
