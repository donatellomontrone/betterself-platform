"use client";

import Link from "next/link";
import { BadgeInfo, MousePointer2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { Treatment } from "@/lib/treatments";

type MapView = "face" | "body";

type TreatmentZone = {
  id: string;
  view: MapView;
  label: string;
  description: string;
  x: number;
  y: number;
  treatmentIds: string[];
  tag: string;
};

type TreatmentAnatomyMapProps = {
  treatments: Treatment[];
};

const zones: TreatmentZone[] = [
  {
    id: "forehead-expression",
    view: "face",
    label: "Forehead & expression lines",
    description: "Doctor-assessed injectable options for expression lines and facial balance.",
    x: 50,
    y: 18,
    treatmentIds: ["neurotoxin-face"],
    tag: "Injectable",
  },
  {
    id: "pores-skin-quality",
    view: "face",
    label: "Pores, glow & skin quality",
    description: "Skin boosters and microtox options for texture, hydration, glow, and pore appearance.",
    x: 68,
    y: 49,
    treatmentIds: [
      "skin-microtox-pores",
      "mesoheal-korean-skin-booster",
      "crystal-pn",
      "crystal-pn-plus",
      "luhilo",
      "rejuran-h",
      "bi-dens",
      "duoexoti",
    ],
    tag: "Injectable skin quality",
  },
  {
    id: "jawline-lower-face",
    view: "face",
    label: "Jawline & lower face",
    description: "Doctor-reviewed contour support for jawline, masseter, and selected lower-face concerns.",
    x: 63,
    y: 62,
    treatmentIds: ["jawtox", "face-mesolipo"],
    tag: "Contour",
  },
  {
    id: "acne-scar-texture",
    view: "face",
    label: "Acne scars & texture",
    description: "Scar and texture treatments selected after assessment of scar type and skin condition.",
    x: 39,
    y: 46,
    treatmentIds: [
      "3-in-1-scar-treatment",
      "scar-plus",
      "needle-subcision",
      "cannula-subcision",
      "microneedling",
      "tca-chemical-peel",
    ],
    tag: "Texture",
  },
  {
    id: "small-face-lesions",
    view: "face",
    label: "Milia, bumps & small lesions",
    description: "Doctor-led removal or extraction options for selected small facial lesions.",
    x: 33,
    y: 34,
    treatmentIds: ["milia-extraction", "sebaceous-hyperplasia-removal", "wart-removal"],
    tag: "Small lesions",
  },
  {
    id: "neck-lower-face",
    view: "face",
    label: "Neck & lower-face skin",
    description: "Skin quality and contour options that may be considered after doctor review.",
    x: 50,
    y: 78,
    treatmentIds: ["face-mesolipo", "crystal-pn-plus", "rejuran-h", "bi-dens"],
    tag: "Doctor review",
  },
  {
    id: "underarms",
    view: "body",
    label: "Underarms",
    description: "Options for excessive sweating and selected underarm tone concerns when suitable.",
    x: 35,
    y: 32,
    treatmentIds: ["sweatox", "underarm-whitening-injectable"],
    tag: "Injectable",
  },
  {
    id: "abdomen-contour",
    view: "body",
    label: "Abdomen & body contour",
    description: "Doctor-led mesolipo treatment requests for selected body areas.",
    x: 50,
    y: 52,
    treatmentIds: ["body-mesolipo"],
    tag: "Contour",
  },
  {
    id: "arms-selected-areas",
    view: "body",
    label: "Arms & selected areas",
    description: "Body-area treatment planning for localized fullness or selected lesion concerns.",
    x: 66,
    y: 44,
    treatmentIds: ["body-mesolipo", "wart-removal", "sebaceous-hyperplasia-removal"],
    tag: "Selected areas",
  },
  {
    id: "scars-keloids",
    view: "body",
    label: "Keloids & raised scars",
    description: "Doctor-assessed injection care for selected keloids or raised scar concerns.",
    x: 35,
    y: 55,
    treatmentIds: ["keloid-injection"],
    tag: "Scar care",
  },
  {
    id: "warts-lesions",
    view: "body",
    label: "Warts & small lesions",
    description: "Removal options for selected warts, milia, or sebaceous hyperplasia after assessment.",
    x: 66,
    y: 62,
    treatmentIds: ["wart-removal", "milia-extraction", "sebaceous-hyperplasia-removal"],
    tag: "Removal",
  },
  {
    id: "intimate-tone",
    view: "body",
    label: "Intimate-area tone concerns",
    description: "Discreet doctor-led treatment requests for selected intimate-area tone concerns.",
    x: 50,
    y: 73,
    treatmentIds: ["intimate-area-whitening-injectable"],
    tag: "Discreet care",
  },
];

export function TreatmentAnatomyMap({ treatments }: TreatmentAnatomyMapProps) {
  const [activeView, setActiveView] = useState<MapView>("face");
  const [activeZoneId, setActiveZoneId] = useState("pores-skin-quality");

  const treatmentById = useMemo(() => {
    return new Map(treatments.map((treatment) => [treatment.id, treatment]));
  }, [treatments]);

  const visibleZones = zones.filter((zone) => zone.view === activeView);
  const activeZone =
    zones.find((zone) => zone.id === activeZoneId && zone.view === activeView) ?? visibleZones[0];
  const activeTreatments = activeZone.treatmentIds
    .map((id) => treatmentById.get(id))
    .filter((treatment): treatment is Treatment => Boolean(treatment));

  function chooseView(view: MapView) {
    setActiveView(view);
    setActiveZoneId(zones.find((zone) => zone.view === view)?.id ?? activeZoneId);
  }

  return (
    <section className="px-5 pb-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-lg border border-[#E6DFD5] bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1fr_0.92fr]">
            <div className="bg-[#F7F3ED] p-5 md:p-7">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="eyebrow">Interactive treatment map</p>
                  <h2 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F] md:text-5xl">
                    Choose the area first.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#595550]">
                    Tap the face, neck, or body area to see which BetterSelf treatments may be requested there.
                  </p>
                </div>
                <div className="grid grid-cols-2 rounded-lg border border-[#E6DFD5] bg-white p-1 text-sm font-semibold">
                  {(["face", "body"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      className={`rounded-md px-4 py-2 transition ${
                        activeView === view ? "bg-[#3F5249] text-white" : "text-[#4D4D4D] hover:bg-[#EEF5F5]"
                      }`}
                      onClick={() => chooseView(view)}
                    >
                      {view === "face" ? "Face & neck" : "Body"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-[0.95fr_1fr] md:items-center">
                <div className="relative min-h-[430px] overflow-hidden rounded-lg border border-[#E6DFD5] bg-gradient-to-b from-white to-[#F1ECE4] p-4">
                  <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-[#3F5249] shadow-sm">
                    <MousePointer2 className="h-3.5 w-3.5" />
                    Tap a point
                  </div>
                  {activeView === "face" ? <FaceDiagram /> : <BodyDiagram />}
                  {visibleZones.map((zone) => {
                    const isActive = zone.id === activeZone.id;

                    return (
                      <button
                        key={zone.id}
                        type="button"
                        aria-label={`Show treatments for ${zone.label}`}
                        aria-pressed={isActive}
                        className={`absolute z-20 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 shadow-lg transition ${
                          isActive
                            ? "scale-110 border-white bg-[#3F5249] text-white"
                            : "border-white bg-[#DDE8E8] text-[#3F5249] hover:scale-105 hover:bg-[#3F5249] hover:text-white"
                        }`}
                        style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                        onClick={() => setActiveZoneId(zone.id)}
                      >
                        <span className={isActive ? "h-2.5 w-2.5 rounded-full bg-white" : "h-2.5 w-2.5 rounded-full bg-current"} />
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-3">
                  {visibleZones.map((zone) => {
                    const isActive = zone.id === activeZone.id;

                    return (
                      <button
                        key={zone.id}
                        type="button"
                        className={`rounded-lg border p-4 text-left transition ${
                          isActive
                            ? "border-[#3F5249] bg-[#3F5249] text-white"
                            : "border-[#E6DFD5] bg-white text-[#1F1F1F] hover:border-[#3F5249]"
                        }`}
                        onClick={() => setActiveZoneId(zone.id)}
                      >
                        <span className={isActive ? "text-xs font-bold uppercase tracking-[0.18em] text-white/72" : "text-xs font-bold uppercase tracking-[0.18em] text-[#3F5249]"}>
                          {zone.tag}
                        </span>
                        <span className="mt-2 block font-serif text-2xl leading-tight">
                          {zone.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="p-5 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{activeView === "face" ? "Face area" : "Body area"}</p>
                  <h3 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F]">
                    {activeZone.label}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#595550]">
                    {activeZone.description}
                  </p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#EEF5F5] text-[#3F5249]">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-5 rounded-lg border border-[#DDE8E8] bg-[#EEF5F5] p-4">
                <div className="flex gap-3 text-sm leading-6 text-[#566060]">
                  <BadgeInfo className="mt-0.5 h-4 w-4 shrink-0 text-[#3F5249]" />
                  <p>
                    Area matches are a guide only. Injectable and procedural treatments still require medical intake and doctor assessment.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {activeTreatments.map((treatment) => (
                  <article key={treatment.id} className="rounded-lg border border-[#E6DFD5] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl leading-tight text-[#1F1F1F]">
                          {treatment.name}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#3F5249]">
                          {treatment.category}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#F1ECE4] px-3 py-1 text-xs font-semibold text-[#5C574F]">
                        {treatment.priceLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#595550]">
                      {treatment.description}
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaceDiagram() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 260 430"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M82 358 C100 332 160 332 178 358 L200 420 H60 L82 358Z" fill="#E9DDD0" stroke="#D6C7B7" strokeWidth="2" />
      <path d="M84 160 C84 87 111 48 135 48 C171 48 194 92 190 164 C187 241 158 295 132 295 C105 295 86 237 84 160Z" fill="#F4E8DD" stroke="#D6C7B7" strokeWidth="2" />
      <path d="M91 121 C113 63 153 44 181 91 C164 67 135 63 119 89 C105 112 108 149 89 176 C84 158 84 139 91 121Z" fill="#D8C6B6" opacity="0.75" />
      <path d="M103 162 C113 152 126 152 137 162" stroke="#8B7A6B" strokeWidth="2" strokeLinecap="round" />
      <path d="M151 162 C159 153 171 153 179 162" stroke="#8B7A6B" strokeWidth="2" strokeLinecap="round" />
      <path d="M143 172 C137 199 137 212 148 218" stroke="#B69E8A" strokeWidth="2" strokeLinecap="round" />
      <path d="M126 244 C140 253 157 253 171 244" stroke="#9F8B7A" strokeWidth="2" strokeLinecap="round" />
      <path d="M100 350 C113 370 153 370 166 350" stroke="#D6C7B7" strokeWidth="2" strokeLinecap="round" />
      <path d="M55 410 C84 384 176 384 205 410" stroke="#D6C7B7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BodyDiagram() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 260 430"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      <circle cx="130" cy="55" r="34" fill="#F4E8DD" stroke="#D6C7B7" strokeWidth="2" />
      <path d="M111 91 H149 L167 174 L153 261 H107 L93 174 L111 91Z" fill="#F4E8DD" stroke="#D6C7B7" strokeWidth="2" />
      <path d="M101 115 C72 140 55 189 52 238" stroke="#D6C7B7" strokeWidth="18" strokeLinecap="round" />
      <path d="M159 115 C188 140 205 189 208 238" stroke="#D6C7B7" strokeWidth="18" strokeLinecap="round" />
      <path d="M109 260 C101 304 97 348 93 400" stroke="#D6C7B7" strokeWidth="22" strokeLinecap="round" />
      <path d="M151 260 C159 304 163 348 167 400" stroke="#D6C7B7" strokeWidth="22" strokeLinecap="round" />
      <path d="M99 166 H161" stroke="#C8B7A5" strokeWidth="2" strokeLinecap="round" />
      <path d="M106 223 H154" stroke="#C8B7A5" strokeWidth="2" strokeLinecap="round" />
      <path d="M113 92 C120 108 140 108 147 92" stroke="#D6C7B7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
