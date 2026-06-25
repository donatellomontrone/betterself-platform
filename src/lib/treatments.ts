export type TreatmentCategory =
  | "Toxin-Based"
  | "Skin Boosters"
  | "Acne Scars"
  | "Others";

export type Treatment = {
  id: string;
  name: string;
  category: TreatmentCategory;
  description: string;
  duration: string;
  price: number;
  priceLabel: string;
  unitLabel?: string;
  doctor: string;
  concerns: string[];
  mayHelpWith: string[];
  suitableFor: string[];
  avoidIf: string[];
  whatToExpect: string[];
  beforecare: string[];
  aftercare: string[];
  requiresDoctorApproval: boolean;
  homeVisitAvailable: boolean;
  detailNote?: string;
};

export type DiscountCategory = {
  category: TreatmentCategory;
  tiers: {
    name: "Office Employee" | "Regenesys Employee" | "Regenesys Medical Team";
    discount: string;
  }[];
};

const defaultAvoidIf = [
  "Pregnant or breastfeeding, unless cleared by the doctor",
  "Active infection or open wounds in the treatment area",
  "History of severe allergy to related products or ingredients",
  "Uncontrolled medical conditions that require further evaluation",
];

const defaultBeforecare = [
  "Complete the medical intake form truthfully before booking confirmation.",
  "Share allergies, medication, previous procedures, and recent illness.",
  "Avoid alcohol and non-prescribed blood-thinning supplements for 24 hours when medically appropriate.",
];

const defaultAftercare = [
  "Follow the doctor’s aftercare instructions and avoid touching the treated area unnecessarily.",
  "Avoid intense heat, strenuous activity, and alcohol immediately after treatment when advised.",
  "Message the doctor for expected reactions or follow-up questions. Seek urgent care for severe symptoms.",
];

const toxinExpect = [
  "Doctor assessment and facial movement review before any procedure.",
  "Dose and treatment areas are confirmed only after suitability screening.",
  "Results vary per patient and follow-up review may be recommended.",
];

const skinExpect = [
  "Skin concern review, consent, and sterile preparation before treatment.",
  "The doctor confirms the product and treatment plan before starting.",
  "Recovery and visible response vary depending on skin condition and aftercare.",
];

const scarExpect = [
  "The doctor reviews scar type, skin condition, and suitability first.",
  "A staged plan may be recommended instead of a single aggressive session.",
  "Redness, sensitivity, or downtime may vary based on the procedure selected.",
];

const otherExpect = [
  "Treatment area is assessed before the procedure is confirmed.",
  "Doctor may delay, decline, or redirect treatment when home care is not suitable.",
  "Aftercare guidance is sent after the appointment.",
];

export const treatments: Treatment[] = [
  {
    id: "neurotoxin-face",
    name: "Neurotoxin (Face)",
    category: "Toxin-Based",
    description:
      "A doctor-led facial neurotoxin treatment that may help soften the appearance of expression lines after assessment.",
    duration: "30-45 min",
    price: 450,
    priceLabel: "₱450/unit",
    unitLabel: "per unit",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Expression lines", "Facial balance", "Preventive aging"],
    mayHelpWith: ["Forehead lines", "Frown lines", "Crow's feet"],
    suitableFor: ["Patients seeking subtle, medically guided facial refreshment"],
    avoidIf: defaultAvoidIf,
    whatToExpect: toxinExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "skin-microtox-pores",
    name: "Skin Microtox (for pores)",
    category: "Toxin-Based",
    description:
      "A medical aesthetic treatment designed to support smoother-looking skin texture and pore appearance, subject to doctor review.",
    duration: "45-60 min",
    price: 10000,
    priceLabel: "₱10,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Visible pores", "Texture", "Oiliness"],
    mayHelpWith: ["Pore appearance", "Skin texture", "Subtle skin refinement"],
    suitableFor: ["Patients with pore or texture concerns after assessment"],
    avoidIf: defaultAvoidIf,
    whatToExpect: toxinExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "jawtox",
    name: "Jawtox",
    category: "Toxin-Based",
    description:
      "A doctor-assessed facial slimming or jaw tension treatment using neurotoxin when medically appropriate.",
    duration: "45 min",
    price: 20000,
    priceLabel: "₱20,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Jawline bulk", "Masseter tension", "Facial balance"],
    mayHelpWith: ["Lower-face contour support", "Masseter prominence", "Jaw tension"],
    suitableFor: ["Patients with masseter-related concerns after doctor evaluation"],
    avoidIf: defaultAvoidIf,
    whatToExpect: toxinExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "sweatox",
    name: "Sweatox",
    category: "Toxin-Based",
    description:
      "A doctor-led treatment option for excessive sweating concerns, offered only when suitable.",
    duration: "45-60 min",
    price: 15000,
    priceLabel: "₱15,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Excessive sweating", "Underarm sweating", "Comfort"],
    mayHelpWith: ["Sweat reduction support", "Daily comfort", "Confidence in selected cases"],
    suitableFor: ["Patients with sweating concerns after medical screening"],
    avoidIf: defaultAvoidIf,
    whatToExpect: toxinExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "mesoheal-korean-skin-booster",
    name: "Mesoheal Korean Skin Booster",
    category: "Skin Boosters",
    description:
      "A skin booster appointment designed to support hydration and glow, planned after doctor assessment.",
    duration: "60 min",
    price: 15000,
    priceLabel: "₱15,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Dryness", "Dullness", "Skin quality"],
    mayHelpWith: ["Hydration support", "Glow", "Skin texture"],
    suitableFor: ["Patients seeking skin quality support after doctor review"],
    avoidIf: defaultAvoidIf,
    whatToExpect: skinExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "crystal-pn",
    name: "Crystal PN",
    category: "Skin Boosters",
    description:
      "A doctor-guided skin booster option that may support smoother, refreshed-looking skin.",
    duration: "60 min",
    price: 15000,
    priceLabel: "₱15,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Skin quality", "Fine texture", "Dullness"],
    mayHelpWith: ["Skin texture", "Hydration support", "Refreshed appearance"],
    suitableFor: ["Patients cleared for injectable skin quality treatments"],
    avoidIf: defaultAvoidIf,
    whatToExpect: skinExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "crystal-pn-plus",
    name: "Crystal PN+ (PN + HA)",
    category: "Skin Boosters",
    description:
      "A PN and HA skin booster option selected after medical review of skin goals and suitability.",
    duration: "60 min",
    price: 20000,
    priceLabel: "₱20,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Hydration", "Texture", "Elasticity support"],
    mayHelpWith: ["Skin hydration", "Texture refinement", "Overall skin quality"],
    suitableFor: ["Patients who want a doctor-planned skin booster session"],
    avoidIf: defaultAvoidIf,
    whatToExpect: skinExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "luhilo",
    name: "Luhilo",
    category: "Skin Boosters",
    description:
      "A medical skin booster session for selected skin quality concerns, subject to doctor approval.",
    duration: "60 min",
    price: 20000,
    priceLabel: "₱20,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Hydration", "Texture", "Refresh"],
    mayHelpWith: ["Refreshed-looking skin", "Hydration support", "Skin quality"],
    suitableFor: ["Patients cleared after intake and skin review"],
    avoidIf: defaultAvoidIf,
    whatToExpect: skinExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "rejuran-h",
    name: "Rejuran H",
    category: "Skin Boosters",
    description:
      "A doctor-led regenerative skin quality treatment option for selected concerns after medical assessment.",
    duration: "60-75 min",
    price: 25000,
    priceLabel: "₱25,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Skin quality", "Texture", "Recovery support"],
    mayHelpWith: ["Skin texture", "Hydration support", "Refreshed appearance"],
    suitableFor: ["Patients suitable for regenerative injectable treatment"],
    avoidIf: defaultAvoidIf,
    whatToExpect: skinExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "bi-dens",
    name: "Bi-Dens",
    category: "Skin Boosters",
    description:
      "A skin quality treatment option that may be included in a personalized doctor-led treatment plan.",
    duration: "60-75 min",
    price: 25000,
    priceLabel: "₱25,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Texture", "Hydration", "Skin density support"],
    mayHelpWith: ["Skin quality", "Subtle rejuvenation support", "Texture"],
    suitableFor: ["Patients with appropriate skin concerns and medical clearance"],
    avoidIf: defaultAvoidIf,
    whatToExpect: skinExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "duoexoti",
    name: "DuoExoti",
    category: "Skin Boosters",
    description:
      "Plant-based exosomes with PDRN, used as part of a doctor-guided skin quality plan when suitable.",
    duration: "60-75 min",
    price: 25000,
    priceLabel: "₱25,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Dullness", "Texture", "Recovery support"],
    mayHelpWith: ["Skin recovery support", "Texture", "Glow"],
    suitableFor: ["Patients assessed as suitable for exosome-based skin support"],
    avoidIf: defaultAvoidIf,
    whatToExpect: skinExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
    detailNote: "Plant-based exosomes with PDRN.",
  },
  {
    id: "3-in-1-scar-treatment",
    name: "3-in-1 Scar Treatment",
    category: "Acne Scars",
    description:
      "A doctor-planned acne scar session combining selected techniques when medically appropriate.",
    duration: "75-90 min",
    price: 20000,
    priceLabel: "₱20,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Acne scars", "Texture", "Uneven skin"],
    mayHelpWith: ["Scar texture", "Skin surface irregularity", "Overall skin refinement"],
    suitableFor: ["Patients with acne scars after in-person or photo-based assessment"],
    avoidIf: defaultAvoidIf,
    whatToExpect: scarExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
    detailNote: "Needle subcision, microneedling, and chemical peel.",
  },
  {
    id: "scar-plus",
    name: "Scar Plus",
    category: "Acne Scars",
    description:
      "A more advanced scar plan using cannula subcision with Bi-Dens injectable when the doctor confirms suitability.",
    duration: "90 min",
    price: 35000,
    priceLabel: "₱35,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Acne scars", "Tethered scars", "Texture"],
    mayHelpWith: ["Scar texture", "Selected depressed scars", "Skin quality support"],
    suitableFor: ["Patients needing a deeper scar plan after doctor assessment"],
    avoidIf: defaultAvoidIf,
    whatToExpect: scarExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
    detailNote: "Cannula subcision plus Bi-Dens injectable.",
  },
  {
    id: "needle-subcision",
    name: "Needle Subcision",
    category: "Acne Scars",
    description:
      "A scar treatment technique that may be recommended for selected acne scar types after assessment.",
    duration: "45-60 min",
    price: 10000,
    priceLabel: "₱10,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Tethered scars", "Texture", "Acne scars"],
    mayHelpWith: ["Selected depressed scars", "Scar texture", "Skin surface irregularity"],
    suitableFor: ["Patients with scar types suitable for subcision"],
    avoidIf: defaultAvoidIf,
    whatToExpect: scarExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "cannula-subcision",
    name: "Cannula Subcision",
    category: "Acne Scars",
    description:
      "A doctor-led subcision approach selected for appropriate scar patterns and patient profile.",
    duration: "60 min",
    price: 20000,
    priceLabel: "₱20,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Acne scars", "Tethered scars", "Texture"],
    mayHelpWith: ["Selected scar release", "Scar texture", "Skin surface appearance"],
    suitableFor: ["Patients suitable for cannula-based scar treatment"],
    avoidIf: defaultAvoidIf,
    whatToExpect: scarExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "microneedling",
    name: "Microneedling",
    category: "Acne Scars",
    description:
      "A skin needling treatment that may support texture improvement in selected patients.",
    duration: "45-60 min",
    price: 10000,
    priceLabel: "₱10,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Texture", "Acne scars", "Dullness"],
    mayHelpWith: ["Skin texture", "Mild scar appearance", "Overall surface refinement"],
    suitableFor: ["Patients with suitable skin condition and no active infection"],
    avoidIf: defaultAvoidIf,
    whatToExpect: scarExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "tca-chemical-peel",
    name: "TCA Chemical Peel",
    category: "Acne Scars",
    description:
      "A doctor-selected chemical peel option for specific texture and scar concerns after skin assessment.",
    duration: "30-45 min",
    price: 3000,
    priceLabel: "₱3,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Texture", "Pigmentation concerns", "Scar appearance"],
    mayHelpWith: ["Skin renewal support", "Texture", "Selected superficial concerns"],
    suitableFor: ["Patients whose skin type and history are suitable for TCA peeling"],
    avoidIf: defaultAvoidIf,
    whatToExpect: scarExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "face-mesolipo",
    name: "Face Mesolipo",
    category: "Others",
    description:
      "A doctor-assessed facial contour support option for selected areas and suitable patients.",
    duration: "45-60 min",
    price: 10000,
    priceLabel: "₱10,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Facial fullness", "Contour support", "Lower-face balance"],
    mayHelpWith: ["Facial contour support", "Subtle refinement", "Localized fullness"],
    suitableFor: ["Patients with localized concerns after medical evaluation"],
    avoidIf: defaultAvoidIf,
    whatToExpect: otherExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "body-mesolipo",
    name: "Body Mesolipo",
    category: "Others",
    description:
      "A doctor-led body mesolipo treatment appointment for selected areas, subject to suitability review.",
    duration: "60 min",
    price: 15000,
    priceLabel: "₱15,000/area",
    unitLabel: "per area",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Localized body fullness", "Contour support", "Selected areas"],
    mayHelpWith: ["Localized contour support", "Treatment planning", "Selected body areas"],
    suitableFor: ["Patients with medically suitable localized concerns"],
    avoidIf: defaultAvoidIf,
    whatToExpect: otherExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "keloid-injection",
    name: "Keloid Injection",
    category: "Others",
    description:
      "A doctor-assessed keloid care appointment for selected lesions and suitable patients.",
    duration: "30 min",
    price: 2500,
    priceLabel: "₱2,500",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Keloids", "Raised scars", "Scar discomfort"],
    mayHelpWith: ["Keloid management support", "Raised scar appearance", "Treatment planning"],
    suitableFor: ["Patients with keloids suitable for injection after assessment"],
    avoidIf: defaultAvoidIf,
    whatToExpect: otherExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "milia-extraction",
    name: "Milia Extraction",
    category: "Others",
    description:
      "A careful doctor-led extraction appointment for selected milia, with skin review before treatment.",
    duration: "30-45 min",
    price: 150,
    priceLabel: "₱150/piece",
    unitLabel: "per piece",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Milia", "Small bumps", "Skin texture"],
    mayHelpWith: ["Milia removal", "Texture refinement", "Clearer-looking skin in selected areas"],
    suitableFor: ["Patients with milia suitable for extraction"],
    avoidIf: defaultAvoidIf,
    whatToExpect: otherExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "wart-removal",
    name: "Wart Removal",
    category: "Others",
    description:
      "A doctor-reviewed wart removal appointment for selected areas, with aftercare guidance.",
    duration: "30-45 min",
    price: 5000,
    priceLabel: "₱5,000/area",
    unitLabel: "per area",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Warts", "Selected lesions", "Skin comfort"],
    mayHelpWith: ["Wart removal", "Lesion care", "Aftercare planning"],
    suitableFor: ["Patients with lesions confirmed suitable for home treatment"],
    avoidIf: defaultAvoidIf,
    whatToExpect: otherExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "sebaceous-hyperplasia-removal",
    name: "Sebaceous Hyperplasia Removal",
    category: "Others",
    description:
      "A doctor-assessed removal appointment for selected sebaceous hyperplasia lesions.",
    duration: "30-45 min",
    price: 200,
    priceLabel: "₱200/piece",
    unitLabel: "per piece",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Sebaceous hyperplasia", "Texture", "Small lesions"],
    mayHelpWith: ["Selected lesion removal", "Texture refinement", "Treatment planning"],
    suitableFor: ["Patients with lesions appropriate for doctor-led removal"],
    avoidIf: defaultAvoidIf,
    whatToExpect: otherExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "underarm-whitening-injectable",
    name: "Underarm Whitening (Injectable)",
    category: "Others",
    description:
      "A medically guided underarm brightening treatment plan when suitable.",
    duration: "45 min",
    price: 15000,
    priceLabel: "₱15,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Underarm tone", "Pigmentation concerns", "Skin confidence"],
    mayHelpWith: ["Tone support", "Treatment planning", "Selected pigmentation concerns"],
    suitableFor: ["Patients medically cleared for injectable brightening treatment"],
    avoidIf: defaultAvoidIf,
    whatToExpect: otherExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
  {
    id: "intimate-area-whitening-injectable",
    name: "Intimate Area Whitening (Injectable)",
    category: "Others",
    description:
      "A discreet doctor-led treatment request for selected intimate-area brightening concerns, subject to suitability review.",
    duration: "45 min",
    price: 15000,
    priceLabel: "₱15,000",
    doctor: "BetterSelf Medical Doctor",
    concerns: ["Tone concerns", "Discreet care", "Personalized planning"],
    mayHelpWith: ["Tone support", "Private treatment planning", "Selected pigmentation concerns"],
    suitableFor: ["Patients comfortable with doctor assessment and medically suitable"],
    avoidIf: defaultAvoidIf,
    whatToExpect: otherExpect,
    beforecare: defaultBeforecare,
    aftercare: defaultAftercare,
    requiresDoctorApproval: true,
    homeVisitAvailable: true,
  },
];

export const categories: TreatmentCategory[] = [
  "Toxin-Based",
  "Skin Boosters",
  "Acne Scars",
  "Others",
];

export const featuredTreatmentIds = [
  "neurotoxin-face",
  "mesoheal-korean-skin-booster",
  "jawtox",
  "3-in-1-scar-treatment",
  "duoexoti",
  "wart-removal",
];

export const consultationService: Treatment = {
  id: "doctor-consultation",
  name: "Doctor Consultation",
  category: "Others",
  description:
    "A paid doctor consultation for patients who want medical guidance before choosing a treatment.",
  duration: "30 min",
  price: 800,
  priceLabel: "₱800",
  doctor: "BetterSelf Medical Doctor",
  concerns: ["Treatment planning", "Medical suitability", "Personalized advice"],
  mayHelpWith: [
    "Choosing the right treatment",
    "Understanding suitability and contraindications",
    "Planning next steps before a home treatment",
  ],
  suitableFor: ["Patients who are unsure which aesthetic treatment is right for them"],
  avoidIf: ["Emergency symptoms or urgent medical concerns"],
  whatToExpect: [
    "Doctor-led review of your goals and medical background.",
    "Personalized recommendation for treatment options when suitable.",
    "Clear next steps if a home treatment booking is appropriate.",
  ],
  beforecare: [
    "Prepare your main concerns and any questions for the doctor.",
    "Share relevant medical history, allergies, medication, and recent procedures.",
  ],
  aftercare: [
    "Follow the doctor's recommendation before booking a treatment.",
    "Message BetterSelf if you need clarification after the consultation.",
  ],
  requiresDoctorApproval: false,
  homeVisitAvailable: false,
};

export const discountTiers: DiscountCategory[] = [
  {
    category: "Toxin-Based",
    tiers: [
      { name: "Office Employee", discount: "10% off" },
      { name: "Regenesys Employee", discount: "20% off" },
      { name: "Regenesys Medical Team", discount: "30% off" },
    ],
  },
  {
    category: "Skin Boosters",
    tiers: [
      { name: "Office Employee", discount: "5% off" },
      { name: "Regenesys Employee", discount: "10% off" },
      { name: "Regenesys Medical Team", discount: "20% off" },
    ],
  },
  {
    category: "Acne Scars",
    tiers: [
      { name: "Office Employee", discount: "10% off" },
      { name: "Regenesys Employee", discount: "20% off" },
      { name: "Regenesys Medical Team", discount: "30% off" },
    ],
  },
  {
    category: "Others",
    tiers: [
      { name: "Office Employee", discount: "10% off" },
      { name: "Regenesys Employee", discount: "20% off" },
      { name: "Regenesys Medical Team", discount: "30% off" },
    ],
  },
];

export const referralPromos = [
  {
    title: "Refer 5 paying patients",
    detail: "Get 50% off your next treatment.",
  },
  {
    title: "Refer 10 paying patients",
    detail:
      "Get 1 free treatment: wart removal (1 area), neurotoxin (face), 3-in-1 scar treatment, mesolipo (face), or keloid injection.",
  },
  {
    title: "Get 3 treatments in 1 day",
    detail:
      "Get 1 free treatment: wart removal (1 area) or undereye rejuvenation.",
  },
];

export function getTreatmentById(id: string) {
  return treatments.find((treatment) => treatment.id === id) ??
    (id === consultationService.id ? consultationService : undefined);
}

export function getTreatmentsByCategory(category: TreatmentCategory) {
  return treatments.filter((treatment) => treatment.category === category);
}

export function getFeaturedTreatments() {
  return featuredTreatmentIds
    .map((id) => getTreatmentById(id))
    .filter((treatment): treatment is Treatment => Boolean(treatment));
}

export function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}
