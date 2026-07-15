import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Home,
  Sparkles,
} from "lucide-react";
import {
  categories,
  consultationService,
  featuredTreatmentIds,
  getFeaturedTreatments,
  getTreatmentById,
  Treatment,
  treatments,
} from "@/lib/treatments";
import {
  Badge,
  Notice,
  PageShell,
  SafetyChecklist,
  SectionHeading,
  StatusBadge,
  type StatusTone,
} from "@/components/site-shell";
import {
  BookingFlow,
  DoctorChat,
  type BookingPrefill,
  type ChatMessage,
} from "@/components/platform-widgets";
import { FormSubmitButton } from "@/components/form-submit-button";
import { TreatmentAnatomyMap } from "@/components/treatment-anatomy-map";
import { TreatmentExplorer } from "@/components/treatment-explorer";
import type { AdminBookingView, MessageThreadView, PatientBookingView } from "@/lib/db/queries";
import { buildCalendlySchedulingUrl } from "@/lib/calendly";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP } from "@/lib/contact";
import type { Json } from "@/lib/db/types";
import {
  setBookingAmountAction,
  sendDoctorMessageAction,
  syncCalendlyAction,
  updateBookingNotesAction,
  updateBookingPaymentStatusAction,
  updateBookingScheduleAction,
  updateBookingStatusAction,
  updateIntakeReviewAction,
  updatePatientProfileAction,
} from "@/app/admin/actions";

const bookingStatusLabels: Record<string, string> = {
  pending_doctor_review: "Pending doctor review",
  needs_more_information: "Needs more information",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const paymentStatusLabels: Record<string, string> = {
  not_required: "No payment required",
  pending: "Payment pending",
  paid: "Paid",
  refunded: "Refunded",
};

function formatBookingStatus(status: string) {
  return bookingStatusLabels[status] ?? status;
}

function formatPaymentStatus(status: string) {
  return paymentStatusLabels[status] ?? status;
}

function bookingStatusTone(status: string): StatusTone {
  if (status === "confirmed" || status === "completed") return "positive";
  if (status === "cancelled") return "danger";
  if (status === "needs_more_information") return "warning";
  return "neutral";
}

function paymentStatusTone(status: string): StatusTone {
  if (status === "paid") return "positive";
  if (status === "pending") return "warning";
  return "neutral";
}

function isUnitOrAreaPriced(priceLabel: string) {
  return /\/(unit|area|piece)/i.test(priceLabel);
}

function canRetryPayment(booking: PatientBookingView) {
  // Payable if a payment row exists, the doctor set an assessed amount, or it's a
  // fixed-price treatment (base price is the real price). Unit/area treatments need
  // the doctor's assessed amount first.
  const isVariablePrice = isUnitOrAreaPriced(booking.treatment_price_label);
  const hasPayableAmount = booking.confirmed_amount != null || !isVariablePrice;
  return (
    hasPayableAmount &&
    booking.status === "confirmed" &&
    (booking.payment_status === "pending" || booking.payment_status === "refunded")
  );
}

function isAwaitingAssessedPrice(booking: PatientBookingView) {
  return (
    booking.status === "confirmed" &&
    (booking.payment_status === "pending" || booking.payment_status === "refunded") &&
    booking.amount == null &&
    booking.confirmed_amount == null &&
    isUnitOrAreaPriced(booking.treatment_price_label)
  );
}

function isAwaitingDoctorConfirmation(booking: PatientBookingView) {
  return booking.payment_status === "pending" && booking.status === "pending_doctor_review";
}

function isConsultationBooking(booking: Pick<PatientBookingView, "treatment_id">) {
  return booking.treatment_id === consultationService.id || booking.treatment_id === "doctor-consultation";
}

function hasPayMongoAttempt(
  booking: Pick<PatientBookingView, "paymongo_checkout_id" | "transaction_reference">,
) {
  return Boolean(booking.paymongo_checkout_id || booking.transaction_reference);
}

function getDisplayAmount(booking: Pick<PatientBookingView, "amount" | "confirmed_amount">) {
  return booking.confirmed_amount ?? booking.amount ?? null;
}

function getPatientNextStep(booking: PatientBookingView) {
  if (booking.status === "cancelled") {
    return {
      eyebrow: "Cancelled",
      title: "This request was cancelled.",
      text: "It stays here for your records. You can start a new request whenever you are ready.",
    };
  }

  if (booking.status === "completed") {
    return {
      eyebrow: "Completed",
      title: "Treatment completed.",
      text: "Your aftercare guidance and follow-up support remain available from BetterSelf.",
    };
  }

  if (isConsultationBooking(booking)) {
    if (booking.payment_status === "paid") {
      return {
        eyebrow: "Consultation",
        title: "Consultation paid. Next step: doctor call.",
        text: "If you already picked a Calendly slot, keep that appointment. BetterSelf syncs Calendly automatically; if the time still shows pending, the doctor can update it in the admin calendar.",
      };
    }

    if (hasPayMongoAttempt(booking)) {
      return {
        eyebrow: "PayMongo confirmation",
        title: "We are waiting for PayMongo to confirm the payment.",
        text: "If you just paid by QR Ph, this can take a moment. Your Calendly slot is still useful; BetterSelf can reconcile the payment from PayMongo if the webhook is delayed.",
      };
    }

    return {
      eyebrow: "Consultation",
      title: "Consultation request started.",
      text: "Complete payment first, then choose your doctor-call slot.",
    };
  }

  if (isAwaitingAssessedPrice(booking)) {
    return {
      eyebrow: "Doctor pricing",
      title: "The doctor is setting the final amount.",
      text: "Unit or area-based treatments need a confirmed total before the payment button opens.",
    };
  }

  if (canRetryPayment(booking)) {
    return {
      eyebrow: "Ready to pay",
      title: "Doctor review is complete. Pay to confirm.",
      text: "Once you pay from here, BetterSelf can confirm the home treatment schedule.",
    };
  }

  if (booking.payment_status === "paid") {
    return {
      eyebrow: "Paid treatment",
      title: "Payment received. Home visit next.",
      text: "The doctor will confirm the visit time and aftercare details around your appointment.",
    };
  }

  return {
    eyebrow: "Doctor review",
    title: "Doctor call/review happens before payment.",
    text: "BetterSelf reviews your intake first. When the service is confirmed, the payment button appears in this dashboard.",
  };
}

function RetryPaymentButton({
  bookingId,
  label = "Pay now",
  compact = false,
}: {
  bookingId: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <form action="/api/checkout/retry" method="post" className="grid gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input
        className="field h-10 text-sm"
        type="text"
        name="discountCode"
        placeholder="Discount code (optional)"
        aria-label="Discount code"
        autoCapitalize="characters"
        autoComplete="off"
      />
      <FormSubmitButton
        className={compact ? "btn btn-primary h-10" : "btn btn-primary"}
        pendingLabel="Opening payment..."
      >
        {label}
      </FormSubmitButton>
    </form>
  );
}

function canCancelBooking(booking: PatientBookingView) {
  if (
    isConsultationBooking(booking) &&
    booking.payment_status === "pending" &&
    hasPayMongoAttempt(booking)
  ) {
    return false;
  }

  return (
    booking.payment_status !== "paid" &&
    booking.status !== "completed" &&
    booking.status !== "cancelled"
  );
}

function CancelRequestButton({
  bookingId,
  compact = false,
}: {
  bookingId: string;
  compact?: boolean;
}) {
  return (
    <form action="/api/bookings/cancel" method="post">
      <input type="hidden" name="bookingId" value={bookingId} />
      <FormSubmitButton
        className={compact ? "btn btn-ghost h-10" : "btn btn-ghost"}
        pendingLabel="Cancelling..."
      >
        Cancel request
      </FormSubmitButton>
    </form>
  );
}

function ReconcilePaymentButton({
  bookingId,
  compact = false,
}: {
  bookingId: string;
  compact?: boolean;
}) {
  return (
    <form action="/api/paymongo/reconcile" method="post">
      <input type="hidden" name="bookingId" value={bookingId} />
      <FormSubmitButton
        className={compact ? "btn btn-secondary h-10" : "btn btn-secondary"}
        pendingLabel="Checking..."
      >
        Refresh payment status
      </FormSubmitButton>
    </form>
  );
}

const paymentRetryMessages: Record<string, { title: string; text: string }> = {
  retry_failed: {
    title: "Payment could not be reopened",
    text: "PayMongo could not create a new checkout session. Please try again or message the doctor.",
  },
  retry_unavailable: {
    title: "Payment retry unavailable",
    text: "The booking database is not available right now. Please try again shortly.",
  },
  retry_missing: {
    title: "Booking not found",
    text: "We could not find that unpaid booking under your account.",
  },
  already_paid: {
    title: "Payment already completed",
    text: "This booking is already marked as paid.",
  },
  not_confirmed: {
    title: "Doctor confirmation required",
    text: "Payment opens here after the doctor call/review confirms the service.",
  },
  amount_missing: {
    title: "Doctor-assessed amount required",
    text: "The doctor still needs to set the final amount before this payment can open.",
  },
  synced: {
    title: "Payment confirmed",
    text: "PayMongo confirmed the payment and your dashboard has been updated.",
  },
  sync_pending: {
    title: "Payment still pending",
    text: "PayMongo does not show this checkout as paid yet. If you already paid, wait a minute and refresh again, or message the doctor.",
  },
  sync_failed: {
    title: "Payment check failed",
    text: "We could not verify this checkout with PayMongo just now. Please try again or message the doctor.",
  },
  sync_missing: {
    title: "Payment session missing",
    text: "This booking does not have a PayMongo checkout session to verify.",
  },
  sync_unavailable: {
    title: "Payment check unavailable",
    text: "The payment verification service is not available right now. Please try again shortly.",
  },
};

const bookingRequestMessages: Record<string, { title: string; text: string }> = {
  submitted: {
    title: "Request submitted",
    text: "The doctor call/review happens first. Once BetterSelf confirms the service, the payment button will appear here in your dashboard.",
  },
  cancelled: {
    title: "Request cancelled",
    text: "Your booking request has been cancelled. You can book again any time.",
  },
  cancel_failed: {
    title: "Could not cancel",
    text: "This booking can't be cancelled (it may already be paid, completed, or cancelled). Message the doctor if you need help.",
  },
  cancel_unavailable: {
    title: "Cancellation unavailable",
    text: "The booking database is not available right now. Please try again shortly.",
  },
};

function formatPeso(amount: number | null) {
  if (amount == null) return "—";
  return `₱${amount.toLocaleString("en-PH")}`;
}

function formatBookingDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const howItWorksSteps = [
  {
    title: "Choose your treatment",
    text: "Browse doctor-led aesthetic treatments and book the option you want directly.",
    icon: Sparkles,
  },
  {
    title: "Complete medical intake",
    text: "Answer a short health and aesthetic assessment before your appointment.",
    icon: FileText,
  },
  {
    title: "Speak with the doctor",
    text: "Choose a video call or phone review so the doctor can confirm the right next step.",
    icon: CalendarDays,
  },
  {
    title: "Pay after confirmation",
    text: "When the service is confirmed, pay from your dashboard to secure the home visit.",
    icon: Home,
  },
];

const faqs = [
  [
    "Is BetterSelf a clinic?",
    "No — BetterSelf is a doctor-led home-visit service. Most treatments are done at your home. A few machine-based treatments are performed at one of our partner clinics, only in specific cases when that's clinically safer. The doctor will let you know if that applies to you.",
  ],
  [
    "Who performs the treatment?",
    "Treatments are performed or supervised by a licensed medical doctor.",
  ],
  [
    "Can I book Botox at home?",
    "Yes. You can book the treatment request directly online. Medical intake and doctor assessment are still required before the doctor confirms and performs any injectable treatment.",
  ],
  [
    "Is home treatment safe?",
    "Home treatment is only offered when medically appropriate. BetterSelf uses medical intake, consent, sterile preparation, and aftercare guidance.",
  ],
  [
    "Can I chat with the doctor?",
    "Yes. You can reach the BetterSelf medical team before or after appointments via WhatsApp or email — that's the fastest way to get a reply. The in-app message box is for noting questions about your booking; it is not for emergencies.",
  ],
  [
    "What if I am not suitable for treatment?",
    "The doctor may refuse, delay, or redirect treatment if it is not medically appropriate.",
  ],
  [
    "Do results vary?",
    "Yes. Results vary per patient and depend on individual assessment, treatment type, and aftercare.",
  ],
  [
    "What areas do you serve?",
    "BetterSelf currently serves selected areas in Metro Manila, including BGC, Makati, Rockwell, Alabang, Ortigas, and nearby areas subject to availability.",
  ],
];

export function HomePage() {
  return (
    <PageShell>
      <section className="home-campaign">
        <Image
          src="/betterself-hero-home.jpg"
          alt="BetterSelf doctor preparing a sterile home aesthetic treatment kit in a private residence"
          fill
          priority
          sizes="100vw"
          className="home-campaign-image object-cover object-[72%_center] md:object-center"
        />
        <div className="home-campaign-wash" />
        <div className="relative mx-auto grid min-h-[760px] max-w-[1440px] items-center gap-8 px-5 pb-14 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:pb-16 lg:pt-20">
          <div className="home-campaign-copy">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.24em] text-[#8F5B67]">
              BetterSelf Home Aesthetics
            </p>
            <h1 className="mt-5 font-serif text-5xl leading-[0.95] text-[#1F1F1F] md:text-7xl lg:text-8xl">
              Doctor-led beauty, brought home.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#595550] md:text-lg">
              A private aesthetic experience for Metro Manila: medical intake,
              doctor review, secure payment, and discreet home treatment when suitable.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="premium-cta px-6" href="/booking">
                Book a Treatment
              </Link>
              <Link className="editorial-text-link" href="/treatments">
                Explore Treatments <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="home-hero-trust mt-9" aria-label="Service highlights">
              <span>Doctor-led</span>
              <span>Private home care</span>
              <span>Metro Manila</span>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="home-campaign-note">
              <span>Private doctor care</span>
              <span>At home</span>
              <span>By assessment</span>
            </div>
          </div>
          <div className="home-scroll-cue" aria-hidden="true">
            <span>Discover</span>
            <i />
          </div>
        </div>
      </section>
      <HomeBeautyStory />
      <HomeConcernRibbon />
      <HomeSignatureTreatments />
      <HomeFluidProcess />
      <HomeTrustMoment />
      <FinalCta />
    </PageShell>
  );
}

function HomeBeautyStory() {
  return (
    <section className="home-story-section premium-reveal px-5 py-20 lg:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.86fr_1.14fr]">
        <div className="home-story-image">
          <Image
            src="/betterself-doctor-kit.jpg"
            alt="BetterSelf doctor preparing sterile home aesthetic care equipment"
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="max-w-2xl">
          <p className="eyebrow">The feeling</p>
          <h2 className="mt-4 font-serif text-5xl leading-[0.98] text-[#1F1F1F] md:text-7xl">
            A calm beauty appointment, without the clinic waiting room.
          </h2>
          <p className="mt-6 text-lg leading-8 text-[#595550]">
            Your appointment is designed to feel considered, discreet, and
            medically guided. Choose the concern, complete the doctor review, and
            BetterSelf prepares the visit around your plan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {["Doctor-led", "Sterile setup", "Private home care", "Clear aftercare"].map((item) => (
              <span key={item} className="home-soft-pill">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeConcernRibbon() {
  const concerns = [
    "Expression lines",
    "Skin glow",
    "Pores",
    "Jawline",
    "Acne scars",
    "Sweating",
    "Keloids",
    "Whitening",
    "Small lesions",
  ];

  return (
    <section className="home-ribbon-section" aria-label="Common aesthetic concerns">
      <div className="home-ribbon-track">
        {[...concerns, ...concerns].map((concern, index) => (
          <Link key={`${concern}-${index}`} href="/treatments#treatment-map" className="home-ribbon-item">
            {concern}
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomeSignatureTreatments() {
  const featured = getFeaturedTreatments().slice(0, 4);

  return (
    <section className="home-signature-section premium-reveal px-5 py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="eyebrow">Signature requests</p>
            <h2 className="mt-4 font-serif text-5xl leading-[0.98] text-[#1F1F1F] md:text-7xl">
              Treatments that feel selected, not stacked.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-8 text-[#595550] lg:ml-auto">
            Browse by concern, review clear pricing, and request the option that
            fits your goals. Every treatment still depends on medical suitability
            and doctor confirmation.
          </p>
        </div>
        <div className="home-signature-list mt-12">
          {featured.map((treatment, index) => (
            <Link
              key={treatment.id}
              href={`/booking?treatment=${treatment.id}&direct=1`}
              className="home-signature-row group"
            >
              <span className="home-signature-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="home-signature-name">{treatment.name}</span>
              <span className="home-signature-meta">{treatment.category}</span>
              <span className="home-signature-price">{treatment.priceLabel}</span>
              <span className="home-signature-arrow">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-8">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#6E444E]" href="/treatments">
            View the full treatment edit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function HomeFluidProcess() {
  const steps = [
    ["01", "Tell us the concern", "Choose a treatment or start with a consultation."],
    ["02", "Doctor reviews", "Suitability, intake, and expected plan are checked first."],
    ["03", "Confirm beautifully", "Pay only when the plan is clear, then prepare for the visit."],
  ];

  return (
    <section className="home-process-section premium-reveal px-5 py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="eyebrow">The journey</p>
          <h2 className="mt-4 font-serif text-5xl leading-[0.98] text-[#1F1F1F] md:text-7xl">
            A flow that feels as considered as the treatment.
          </h2>
        </div>
        <div className="home-process-line mt-14">
          {steps.map(([number, title, text]) => (
            <div key={number} className="home-process-step">
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeTrustMoment() {
  return (
    <section className="home-trust-moment premium-reveal px-5 py-20 lg:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-2xl">
          <p className="eyebrow">Safety, quietly visible</p>
          <h2 className="mt-4 font-serif text-5xl leading-[0.98] text-[#1F1F1F] md:text-7xl">
            Premium does not mean vague. It means everything is prepared.
          </h2>
          <p className="mt-6 text-lg leading-8 text-[#595550]">
            Medical intake, consent, sterile preparation, appointment notes, and
            aftercare are part of the experience. The website should make that
            feel reassuring, not heavy.
          </p>
          <Link className="btn btn-secondary mt-8 rounded-full px-6" href="/safety">
            Read the safety approach
          </Link>
        </div>
        <div className="home-trust-image">
          <Image
            src="/betterself-safety-kit.jpg"
            alt="Sterile supplies prepared for BetterSelf doctor-led home aesthetic care"
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

export function TreatmentsPage() {
  return (
    <PageShell>
      <TreatmentsEditorialHero />
      <TreatmentAnatomyMap treatments={treatments} />
      <TreatmentExplorer categories={categories} treatments={treatments} />
    </PageShell>
  );
}

function TreatmentsEditorialHero() {
  return (
    <section className="treatments-editorial-hero px-5 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="max-w-3xl">
          <p className="eyebrow">Treatment edit</p>
          <h1 className="mt-4 font-serif text-6xl leading-[0.92] text-[#1F1F1F] md:text-8xl">
            Start with the concern, not the procedure.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#595550]">
            Browse BetterSelf treatments through the area or concern you want to address.
            Every request is still reviewed by the doctor before confirmation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="premium-cta px-6" href="/booking">
              Book Treatment
            </Link>
            <Link className="btn btn-secondary rounded-full px-6" href="/booking?treatment=doctor-consultation">
              Start with Consultation
            </Link>
          </div>
        </div>
        <div className="treatments-hero-visual">
          <Image
            src="/betterself-doctor-kit.jpg"
            alt="BetterSelf doctor preparing a private home aesthetic appointment"
            fill
            sizes="(min-width: 1024px) 44vw, 100vw"
            className="treatments-hero-photo object-cover"
            priority
          />
          <div className="treatments-hero-card">
            <span>Face</span>
            <span>Body</span>
            <span>Injectables</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TreatmentDetailPage({ treatment }: { treatment: Treatment }) {
  const isConsultation = treatment.id === consultationService.id;
  return (
    <PageShell>
      <section className="treatment-detail-section px-5 py-10 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          <article className="treatment-detail-editorial">
            <div className="treatment-detail-hero">
              <div>
                <Badge>{treatment.category}</Badge>
                <h1 className="mt-5 font-serif text-5xl leading-[0.95] text-[#1F1F1F] md:text-7xl">
                  {treatment.name}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-[#595550]">
                  {treatment.description}
                </p>
                {treatment.detailNote ? (
                  <p className="mt-3 max-w-2xl text-sm italic leading-6 text-[#6E565A]">
                    {treatment.detailNote}
                  </p>
                ) : null}
              </div>
              <div className="treatment-detail-mini">
                <span>Doctor reviewed</span>
                <span>Home visit eligible</span>
                <span>Private intake</span>
              </div>
            </div>

            <div className="treatment-detail-grid">
              <DetailBlock title="What it may help with" items={treatment.mayHelpWith} />
              <DetailBlock title="Who it may be suitable for" items={treatment.suitableFor} />
              <DetailBlock title="Who should avoid it or seek further review" items={treatment.avoidIf} />
              <DetailBlock title="What to expect" items={treatment.whatToExpect} />
              <DetailBlock title="Before treatment" items={treatment.beforecare} />
              <DetailBlock title="Aftercare" items={treatment.aftercare} />
            </div>
            <div className="treatment-detail-notice">
              <Notice title="Treatment disclaimer">
                Suitability, treatment plan, and expected outcomes depend on
                individual medical assessment. Results vary per patient. Medical
                intake and doctor confirmation are required before treatment.
              </Notice>
            </div>
          </article>
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <section className="treatment-booking-panel">
              <p className="eyebrow">{isConsultation ? "Book this consultation" : "Book this treatment"}</p>
              <p className="mt-3 font-serif text-5xl leading-none text-[#1F1F1F]">
                {treatment.priceLabel}
              </p>
              <div className="mt-6 grid gap-3 text-sm">
                <Summary label="Duration" value={treatment.duration} />
                {isConsultation ? (
                  <>
                    <Summary label="Format" value="Online doctor call" />
                    <Summary label="Payment" value="Paid up front to book" />
                  </>
                ) : (
                  <>
                    <Summary label="Home visit" value="Available when suitable" />
                    <Summary label="Requirement" value="Doctor assessment required" />
                  </>
                )}
              </div>
              <div className="mt-6 grid gap-2">
                <Link className="premium-cta min-h-12 justify-center" href={`/booking?treatment=${treatment.id}&direct=1`}>
                  {isConsultation ? "Book consultation" : "Book Treatment"}
                </Link>
                <Link className="btn btn-secondary justify-center rounded-full" href="/messages">
                  Ask Doctor
                </Link>
              </div>
              <p className="mt-5 text-xs leading-5 text-[#756A61]">
                The doctor reviews medical answers before confirming any in-home treatment.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}

export function BookingPage({
  treatmentId,
  startAtDetails = false,
  prefill,
}: {
  treatmentId?: string;
  startAtDetails?: boolean;
  prefill?: BookingPrefill;
}) {
  const selectedTreatment = treatmentId ? getTreatmentById(treatmentId) : undefined;
  const isDirectBooking = Boolean(startAtDetails && selectedTreatment);

  return (
    <PageShell>
      <PageHero
        eyebrow="Book appointment"
        title={
          isDirectBooking
            ? `Book ${selectedTreatment?.name}.`
            : "Choose a treatment directly or start with a doctor consultation."
        }
        text={
          isDirectBooking
            ? "Complete your details and medical intake. The doctor reviews suitability and confirms the plan before treatment payment opens."
            : "Submit your request first, schedule a doctor call or review, then pay from your dashboard only after BetterSelf confirms the service."
        }
      />
      <section className="px-5 pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <BookingFlow initialTreatmentId={treatmentId} startAtDetails={startAtDetails} prefill={prefill} />
        </div>
      </section>
    </PageShell>
  );
}

export function DashboardPage({
  viewerName,
  bookings = [],
  paymentStatus,
  bookingStatus,
  loadFailed = false,
}: {
  viewerName?: string;
  bookings?: PatientBookingView[];
  paymentStatus?: string;
  bookingStatus?: string;
  loadFailed?: boolean;
}) {
  const activeBookings = bookings.filter((b) => b.status !== "cancelled" && b.status !== "completed");
  const currentBooking = activeBookings[0] ?? bookings[0];
  const currentCallLink = currentBooking ? getVideoCallLink(currentBooking) : null;
  const currentStep = currentBooking ? getPatientNextStep(currentBooking) : null;
  const consultationBookings = bookings.filter(isConsultationBooking);
  const treatmentBookings = bookings.filter((booking) => !isConsultationBooking(booking));
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() ?? "";
  const currentCalendlyUrl = currentBooking
    ? buildCalendlySchedulingUrl(calendlyUrl, {
        referenceNumber: currentBooking.transaction_reference,
        source: "patient_dashboard_primary",
      })
    : "";
  const hasCompleted = bookings.some((b) => b.status === "completed");
  const paymentRetryMessage = paymentStatus ? paymentRetryMessages[paymentStatus] : undefined;
  const bookingRequestMessage = bookingStatus ? bookingRequestMessages[bookingStatus] : undefined;
  const stats = [
    { label: "Consultations", value: consultationBookings.length },
    {
      label: "Treatment requests",
      value: treatmentBookings.length,
    },
    {
      label: "Ready to pay",
      value: bookings.filter(canRetryPayment).length,
    },
    {
      label: "Paid",
      value: bookings.filter((b) => b.payment_status === "paid").length,
    },
  ];
  return (
    <PageShell>
      <section className="dashboard-page px-5 py-12 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <SectionHeading
              headingLevel={1}
              eyebrow="Patient dashboard"
              title={viewerName ? `Welcome back, ${viewerName}.` : "Welcome back."}
              text="Your bookings, schedule, payments, and aftercare in one private place."
            />
            <Link className="btn btn-primary" href="/booking">
              Book Appointment
            </Link>
          </div>
          {loadFailed ? (
            <div className="mt-6 rounded-lg border border-[#E7C6C2] bg-[#FBEDEB] p-4 text-sm leading-6 text-[#9B2C2C]">
              We couldn&apos;t load your bookings just now — this is a temporary glitch, not lost
              data. Please refresh in a moment.
            </div>
          ) : null}
          {paymentRetryMessage ? (
            <div className="mt-6">
              <Notice title={paymentRetryMessage.title}>{paymentRetryMessage.text}</Notice>
            </div>
          ) : null}
          {bookingRequestMessage ? (
            <div className="mt-6">
              <Notice title={bookingRequestMessage.title}>{bookingRequestMessage.text}</Notice>
            </div>
          ) : null}
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article key={stat.label} className="card dashboard-stat p-5">
                <p className="text-sm text-[#595550]">{stat.label}</p>
                <p className="mt-3 font-serif text-4xl text-[#1F1F1F]">{stat.value}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="card dashboard-primary p-6 md:p-8">
              <p className="eyebrow">{currentStep?.eyebrow ?? "Next step"}</p>
              {currentBooking && currentStep ? (
                <>
                  <h2 className="mt-3 font-serif text-4xl text-[#1F1F1F]">
                    {currentStep.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#595550]">
                    {currentStep.text}
                  </p>
                  {currentBooking.payment_status === "pending" &&
                  hasPayMongoAttempt(currentBooking) ? (
                    <div className="mt-4 rounded-lg border border-[#F6D7A7] bg-[#FFF8E7] p-4 text-sm leading-6 text-[#6E565A]">
                      PayMongo checkout was created for this booking. If you already paid,
                      do not pay again yet — BetterSelf should verify the webhook/payment
                      status first.
                    </div>
                  ) : null}
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Summary label="Booking" value={currentBooking.treatment_name} />
                    <Summary label="Booked on" value={formatBookingDate(currentBooking.created_at)} />
                    <Summary label="Appointment" value={currentBooking.appointment_type} />
                    <Summary
                      label="Calendar"
                      value={
                        currentBooking.appointment_date || currentBooking.appointment_time
                          ? getScheduleLabel(currentBooking)
                          : isConsultationBooking(currentBooking)
                            ? "Calendly manages the call slot"
                            : "Doctor confirms after review"
                      }
                    />
                    <Summary label="Status" value={formatBookingStatus(currentBooking.status)} />
                    <Summary
                      label="Payment"
                      value={
                        getDisplayAmount(currentBooking) != null
                          ? `${formatPaymentStatus(currentBooking.payment_status)} · ${formatPeso(
                              getDisplayAmount(currentBooking),
                            )}`
                          : formatPaymentStatus(currentBooking.payment_status)
                      }
                    />
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {currentBooking.payment_status === "pending" &&
                    hasPayMongoAttempt(currentBooking) ? (
                      <ReconcilePaymentButton bookingId={currentBooking.id} />
                    ) : canRetryPayment(currentBooking) ? (
                      <RetryPaymentButton bookingId={currentBooking.id} />
                    ) : isConsultationBooking(currentBooking) &&
                      currentBooking.payment_status === "paid" &&
                      currentCalendlyUrl ? (
                      <a
                        className="btn btn-primary"
                        href={currentCalendlyUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open Calendly
                      </a>
                    ) : isAwaitingAssessedPrice(currentBooking) ? (
                      <span className="btn btn-secondary cursor-default justify-center opacity-80">
                        Awaiting the doctor&apos;s assessed price
                      </span>
                    ) : isAwaitingDoctorConfirmation(currentBooking) ? (
                      <span className="btn btn-secondary cursor-default justify-center opacity-80">
                        Doctor review first
                      </span>
                    ) : (
                      <Link className="btn btn-secondary" href="/booking">
                        Book Again
                      </Link>
                    )}
                    <Link
                      className={canRetryPayment(currentBooking) ? "btn btn-secondary" : "btn btn-primary"}
                      href="/messages"
                    >
                      Message Doctor
                    </Link>
                    {currentCallLink ? (
                      <a
                        className="btn btn-secondary"
                        href={currentCallLink}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Join video call
                      </a>
                    ) : null}
                    {canCancelBooking(currentBooking) ? (
                      <CancelRequestButton bookingId={currentBooking.id} />
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-3 font-serif text-4xl text-[#1F1F1F]">
                    No appointments yet
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#595550]">
                    Once you book a treatment it will appear here, with its doctor-review
                    status, schedule, and payment.
                  </p>
                  <div className="mt-6">
                    <Link className="btn btn-primary" href="/booking">
                      Book Your First Appointment
                    </Link>
                  </div>
                </>
              )}
            </section>
            <section id="aftercare" className="card dashboard-side p-6 md:p-8">
              <p className="eyebrow">Flow</p>
              {hasCompleted ? (
                <>
                  <h2 className="mt-3 font-serif text-3xl text-[#1F1F1F]">
                    Latest instructions
                  </h2>
                  <SafetyChecklist
                    items={[
                      "Avoid intense heat and strenuous activity immediately after treatment when advised.",
                      "Do not massage or manipulate the treated area unless instructed.",
                      "Message the doctor if you notice unexpected symptoms.",
                    ]}
                  />
                </>
              ) : (
                <>
                  <h2 className="mt-3 font-serif text-3xl text-[#1F1F1F]">
                    What happens next
                  </h2>
                  <ol className="mt-4 grid gap-3 text-sm leading-6 text-[#595550]">
                    <li>
                      <span className="font-semibold text-[#1F1F1F]">Consultation:</span>{" "}
                      pay ₱800, pick a Calendly slot, then speak with the doctor.
                    </li>
                    <li>
                      <span className="font-semibold text-[#1F1F1F]">Treatment:</span>{" "}
                      submit intake first; the doctor confirms suitability and final price.
                    </li>
                    <li>
                      <span className="font-semibold text-[#1F1F1F]">Payment:</span>{" "}
                      treatment payment opens here after the doctor confirms the plan.
                    </li>
                  </ol>
                </>
              )}
            </section>
          </div>
          {bookings.length > 0 ? (
            <div className="mt-8 grid gap-8">
              <DashboardBookingSection
                title="Consultations"
                emptyText="No consultation bookings yet."
                bookings={consultationBookings}
                calendlyUrl={calendlyUrl}
              />
              <DashboardBookingSection
                title="Treatment requests"
                emptyText="No treatment requests yet."
                bookings={treatmentBookings}
                calendlyUrl={calendlyUrl}
              />
            </div>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}

function DashboardBookingSection({
  title,
  emptyText,
  bookings,
  calendlyUrl,
}: {
  title: string;
  emptyText: string;
  bookings: PatientBookingView[];
  calendlyUrl: string;
}) {
  return (
    <section>
      <p className="eyebrow">{title}</p>
      <div className="mt-4 grid gap-3">
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <DashboardBookingCard
              key={booking.id}
              booking={booking}
              calendlyUrl={calendlyUrl}
            />
          ))
        ) : (
          <p className="rounded-lg border border-[#E6DFD5] bg-white p-5 text-sm text-[#595550]">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function DashboardBookingCard({
  booking,
  calendlyUrl,
}: {
  booking: PatientBookingView;
  calendlyUrl: string;
}) {
  const callLink = getVideoCallLink(booking);
  const amount = getDisplayAmount(booking);
  const nextStep = getPatientNextStep(booking);
  const isConsultation = isConsultationBooking(booking);
  const paymentInProgress =
    isConsultation && booking.payment_status === "pending" && hasPayMongoAttempt(booking);
  const calendlyBookingUrl = buildCalendlySchedulingUrl(calendlyUrl, {
    referenceNumber: booking.transaction_reference,
    source: "patient_dashboard",
  });

  return (
    <article className="card dashboard-booking-row grid gap-4 p-5 lg:grid-cols-[1.25fr_1fr_auto] lg:items-center">
      <div>
        <p className="font-serif text-2xl text-[#1F1F1F]">{booking.treatment_name}</p>
        <p className="mt-1 text-sm text-[#595550]">
          {booking.appointment_type} · {booking.location}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#595550]">{nextStep.text}</p>
      </div>
      <div className="grid gap-2 text-sm text-[#4D4D4D]">
        <p>Booked {formatBookingDate(booking.created_at)}</p>
        <p>{amount != null ? formatPeso(amount) : booking.treatment_price_label}</p>
        <p>{getScheduleLabel(booking)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={bookingStatusTone(booking.status)}>
          {formatBookingStatus(booking.status)}
        </StatusBadge>
        <StatusBadge tone={paymentStatusTone(booking.payment_status)}>
          {paymentInProgress ? "Payment confirming" : formatPaymentStatus(booking.payment_status)}
        </StatusBadge>
        {callLink ? (
          <a className="btn btn-secondary h-10" href={callLink} rel="noreferrer" target="_blank">
            Video call
          </a>
        ) : null}
        {isConsultation && booking.payment_status === "paid" && calendlyBookingUrl ? (
          <a className="btn btn-secondary h-10" href={calendlyBookingUrl} rel="noreferrer" target="_blank">
            Calendly
          </a>
        ) : null}
        {paymentInProgress ? (
          <ReconcilePaymentButton bookingId={booking.id} compact />
        ) : canRetryPayment(booking) ? (
          <RetryPaymentButton bookingId={booking.id} label="Pay now" compact />
        ) : isAwaitingAssessedPrice(booking) ? (
          <StatusBadge tone="neutral">Awaiting assessed price</StatusBadge>
        ) : isAwaitingDoctorConfirmation(booking) && !isConsultation ? (
          <StatusBadge tone="neutral">Doctor review first</StatusBadge>
        ) : null}
        {canCancelBooking(booking) ? <CancelRequestButton bookingId={booking.id} compact /> : null}
      </div>
    </article>
  );
}

export function MessagesPage({
  initialMessages = [],
  isAdmin = false,
  patientId,
}: {
  initialMessages?: ChatMessage[];
  isAdmin?: boolean;
  patientId?: string;
}) {
  return (
    <PageShell>
      <PageHero
        eyebrow="Messages"
        title={isAdmin ? "Patient message thread." : "Message your BetterSelf doctor."}
        text={
          isAdmin
            ? "Reply to non-urgent patient questions from the doctor workspace."
            : "Ask non-urgent questions about your treatment and bookings before or after your appointment."
        }
      />
      <section className="px-5 pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link className="btn btn-ghost mb-4 inline-flex" href="/dashboard">
            ← Back to dashboard
          </Link>
          <DoctorChat initialMessages={initialMessages} isAdmin={isAdmin} patientId={patientId} />
        </div>
      </section>
    </PageShell>
  );
}

type AdminFilters = {
  q?: string;
  status?: string;
  payment?: string;
  intake?: string;
};

function formatIntakeStatus(status: string | null | undefined) {
  if (!status) return "No intake";
  return status.replaceAll("_", " ");
}

function intakeStatusTone(status: string | null | undefined): StatusTone {
  if (status === "approved") return "positive";
  if (status === "rejected") return "danger";
  if (status === "needs_more_information") return "warning";
  if (status === "submitted") return "warning";
  return "neutral";
}

function asRecord(value: Json | null | undefined): Record<string, Json | undefined> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function getStringList(value: Json | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function getPatientConcern(answers: Json | null | undefined) {
  const record = asRecord(answers);
  return typeof record.patientConcern === "string"
    ? record.patientConcern
    : typeof record.consultationNotes === "string"
      ? record.consultationNotes
      : "";
}

function matchesAdminFilters(booking: AdminBookingView, filters: AdminFilters) {
  const query = filters.q?.trim().toLowerCase();
  const queryMatch =
    !query ||
    [
      booking.patient_name,
      booking.patient_email,
      booking.patient_phone,
      booking.treatment_name,
      booking.location,
      booking.transaction_reference,
      getPatientConcern(booking.intake_answers),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  const statusMatch = !filters.status || booking.status === filters.status;
  const paymentMatch = !filters.payment || booking.payment_status === filters.payment;
  const intakeMatch = !filters.intake || booking.intake_review_status === filters.intake;
  return queryMatch && statusMatch && paymentMatch && intakeMatch;
}

function AdminField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#1F1F1F]">
      {label}
      {children}
    </label>
  );
}

function AdminMeta({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg bg-[#FAF8F4] p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5C574F]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-[#1F1F1F]">
        {value == null || value === "" ? "—" : value}
      </p>
    </div>
  );
}

type BookingCallFields = {
  appointment_type: string;
  location: string;
  appointment_date?: string | null;
  appointment_time?: string | null;
  notes?: string | null;
};

const defaultDoctorVideoCallUrl = process.env.NEXT_PUBLIC_DOCTOR_VIDEO_CALL_URL?.trim() ?? "";

function extractNoteValue(notes: string | null | undefined, label: string) {
  const prefix = `${label}:`;
  return (
    notes
      ?.split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith(prefix))
      ?.slice(prefix.length)
      .trim() || null
  );
}

function isVideoCallBooking(booking: BookingCallFields) {
  const appointment = booking.appointment_type.toLowerCase();
  const location = booking.location.toLowerCase();
  return appointment.includes("call") || appointment.includes("consultation") || location.includes("online");
}

// A confirmed booking still awaiting payment — the single source of truth for the
// admin "Ready to pay" stat and the Payment queue (so they never disagree and
// cancelled/refunded bookings don't linger).
function isReadyToPay(
  booking: Pick<
    AdminBookingView,
    "status" | "payment_status" | "amount" | "confirmed_amount" | "treatment_price_label"
  >,
) {
  if (booking.status !== "confirmed" || booking.payment_status !== "pending") return false;
  if (booking.confirmed_amount != null) return true;
  if (isUnitOrAreaPriced(booking.treatment_price_label)) return false;
  return true;
}

// A joinable meeting URL — NOT a Calendly API resource URI
// (https://api.calendly.com/scheduled_events/...), which returns JSON/401, not a call.
function isJoinableMeetingUrl(url: string | null): url is string {
  if (!url) return false;
  if (/api\.calendly\.com/i.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

function getVideoCallLink(booking: BookingCallFields) {
  const stored = [
    extractNoteValue(booking.notes, "Video call"),
    extractNoteValue(booking.notes, "Calendly invitee"),
    extractNoteValue(booking.notes, "Calendly event"),
  ].find(isJoinableMeetingUrl);
  if (stored) return stored;
  if (isVideoCallBooking(booking) && defaultDoctorVideoCallUrl) return defaultDoctorVideoCallUrl;
  return null;
}

function getScheduleLabel(booking: BookingCallFields) {
  if (booking.appointment_date && booking.appointment_time) {
    return `${formatBookingDate(booking.appointment_date)} · ${booking.appointment_time}`;
  }
  if (getVideoCallLink(booking)) return "Scheduled in call link";
  return "Schedule pending";
}

function AdminSidebar({
  totalBookings,
  confirmedCount,
  messageCount,
  patientCount,
  readyToPay,
}: {
  totalBookings: number;
  confirmedCount: number;
  messageCount: number;
  patientCount: number;
  readyToPay: number;
}) {
  const items = [
    ["Overview", "#overview", totalBookings],
    ["Calendar", "#calendar", confirmedCount],
    ["Messages", "#messages", messageCount],
    ["Patients", "#patients", patientCount],
    ["Payments", "#payments", readyToPay],
    ["Bookings", "#bookings", totalBookings],
  ] as const;

  return (
    <aside className="card h-fit p-4 lg:sticky lg:top-28">
      <p className="eyebrow">Doctor menu</p>
      <nav className="mt-4 grid gap-2" aria-label="Doctor workspace">
        {items.map(([label, href, count]) => (
          <a
            key={label}
            className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold text-[#1F1F1F] hover:bg-[#F6EDEA]"
            href={href}
          >
            <span>{label}</span>
            <span className="rounded-full bg-[#FAF8F4] px-2 py-1 text-xs text-[#5C574F]">
              {count}
            </span>
          </a>
        ))}
      </nav>
      <div className="mt-5 rounded-lg bg-[#F6EDEA] p-3 text-xs leading-5 text-[#6E565A]">
        Flow: review call first, mark booking confirmed, then patient payment opens in dashboard.
      </div>
    </aside>
  );
}

function AdminPanel({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-28 p-5">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl text-[#1F1F1F]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AdminBookingSummaryCard({ booking }: { booking: AdminBookingView }) {
  const callLink = getVideoCallLink(booking);
  return (
    <article className="rounded-lg border border-[#E6DFD5] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-2xl text-[#1F1F1F]">{booking.patient_name}</p>
          <p className="mt-1 text-sm font-semibold text-[#1F1F1F]">{booking.treatment_name}</p>
          <p className="mt-1 text-sm text-[#595550]">{booking.appointment_type}</p>
        </div>
        <StatusBadge tone={bookingStatusTone(booking.status)}>
          {formatBookingStatus(booking.status)}
        </StatusBadge>
      </div>
      <p className="mt-3 text-sm text-[#595550]">{getScheduleLabel(booking)}</p>
      {callLink ? (
        <a className="btn btn-secondary mt-4 h-10" href={callLink} rel="noreferrer" target="_blank">
          Open video call
        </a>
      ) : (
        <p className="mt-4 rounded-lg bg-[#FAF8F4] p-3 text-xs leading-5 text-[#5C574F]">
          Video call link pending. Add it via Calendly or set NEXT_PUBLIC_DOCTOR_VIDEO_CALL_URL.
        </p>
      )}
    </article>
  );
}

function AdminEmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-[#FAF8F4] p-4 text-sm text-[#595550]">{children}</p>;
}

export function AdminPage({
  authorized = false,
  bookings = [],
  messageThreads = [],
  calendlySync,
  filters = {},
}: {
  authorized?: boolean;
  bookings?: AdminBookingView[];
  messageThreads?: MessageThreadView[];
  calendlySync?: {
    status: "success" | "busy" | "error";
    updated: number;
    cleared: number;
  };
  filters?: AdminFilters;
}) {
  if (!authorized) {
    return (
      <PageShell>
        <section className="px-5 py-16 lg:px-8">
          <div className="mx-auto max-w-2xl card p-8 text-center">
            <p className="eyebrow">Doctor / Admin</p>
            <h1 className="mt-3 font-serif text-4xl text-[#1F1F1F]">Admin access only</h1>
            <p className="mt-3 text-sm leading-6 text-[#595550]">
              This dashboard is for BetterSelf medical staff. Add your email address
              to the <span className="font-semibold">ADMIN_EMAILS</span> environment
              variable to access it.
            </p>
            <Link className="btn btn-primary mt-6 justify-center" href="/">
              Back to site
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  const stats: [string, number][] = [
    ["Total bookings", bookings.length],
    ["Awaiting review", bookings.filter((b) => b.status === "pending_doctor_review").length],
    ["Confirmed", bookings.filter((b) => b.status === "confirmed").length],
    ["Paid", bookings.filter((b) => b.payment_status === "paid").length],
  ];
  const filteredBookings = bookings.filter((booking) => matchesAdminFilters(booking, filters));
  const uniquePatients = new Set(bookings.map((booking) => booking.patient_id)).size;
  const paymentsReady = bookings.filter(isReadyToPay).length;
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const confirmedVideoCalls = confirmedBookings.filter(isVideoCallBooking);
  const confirmedHomeVisits = confirmedBookings.filter((booking) => !isVideoCallBooking(booking));
  const activeMessageThreads = messageThreads.slice(0, 12);
  const patientSummaries = Array.from(
    new Map(bookings.map((booking) => [booking.patient_id, booking])).values(),
  );
  const flaggedIntakes = bookings.filter((booking) => {
    const answers = asRecord(booking.intake_answers);
    return getStringList(answers.flagged).length > 0;
  }).length;

  return (
    <PageShell>
      <section className="px-5 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <AdminSidebar
            totalBookings={bookings.length}
            confirmedCount={confirmedBookings.length}
            messageCount={activeMessageThreads.length}
            patientCount={uniquePatients}
            readyToPay={paymentsReady}
          />
          <div className="min-w-0">
            <section id="overview" className="scroll-mt-28">
              <SectionHeading
                eyebrow="Doctor / Admin dashboard"
                title="Manage real patient bookings."
                text="Live bookings from the database. Review each request, confirm the call or treatment, then payment opens for the patient."
              />
              <div className="mt-8 grid gap-4 md:grid-cols-4">
                {stats.map(([label, value]) => (
                  <div key={label} className="card p-5">
                    <p className="text-sm text-[#595550]">{label}</p>
                    <p className="mt-3 font-serif text-4xl text-[#1F1F1F]">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                {[
                  ["Patients", uniquePatients],
                  ["Ready to pay", paymentsReady],
                  ["Flagged intakes", flaggedIntakes],
                  ["Shown after filters", filteredBookings.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[#E6DFD5] bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5C574F]">
                      {label}
                    </p>
                    <p className="mt-2 font-serif text-3xl text-[#1F1F1F]">{value}</p>
                  </div>
                ))}
              </div>
            </section>

          <form
            className="card mt-8 grid gap-3 p-5 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))_auto]"
            action="/admin"
          >
            <AdminField label="Search">
              <input
                className="field"
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder="Name, email, treatment, reference..."
              />
            </AdminField>
            <AdminField label="Booking status">
              <select className="field" name="status" defaultValue={filters.status ?? ""}>
                <option value="">All</option>
                <option value="pending_doctor_review">Pending review</option>
                <option value="needs_more_information">Needs info</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </AdminField>
            <AdminField label="Payment">
              <select className="field" name="payment" defaultValue={filters.payment ?? ""}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
                <option value="not_required">Not required</option>
              </select>
            </AdminField>
            <AdminField label="Intake">
              <select className="field" name="intake" defaultValue={filters.intake ?? ""}>
                <option value="">All</option>
                <option value="submitted">Submitted</option>
                <option value="needs_more_information">Needs info</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="not_started">Not started</option>
              </select>
            </AdminField>
            <div className="flex items-end gap-2">
              <button className="btn btn-primary h-12" type="submit">
                Filter
              </button>
              <Link className="btn btn-secondary h-12" href="/admin">
                Clear
              </Link>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            <form action={syncCalendlyAction}>
              <FormSubmitButton className="btn btn-primary" pendingLabel="Syncing Calendly...">
                Sync Calendly
              </FormSubmitButton>
            </form>
            <Link className="btn btn-secondary" href="/admin/export.csv">
              Export CSV
            </Link>
            <Link className="btn btn-secondary" href="/dashboard">
              Patient view
            </Link>
          </div>

          {calendlySync ? (
            <div className="mt-4" aria-live="polite">
              <Notice
                title={
                  calendlySync.status === "success"
                    ? "Calendly is up to date"
                    : calendlySync.status === "busy"
                      ? "Calendly sync already running"
                      : "Calendly could not sync"
                }
              >
                {calendlySync.status === "success"
                  ? `${calendlySync.updated} schedule(s) updated and ${calendlySync.cleared} cancelled schedule(s) cleared.`
                  : calendlySync.status === "busy"
                    ? "Another sync is already in progress. Wait a moment, then try again."
                    : "Check the Calendly access token and try again. Existing booking data was not changed."}
              </Notice>
            </div>
          ) : null}

          <div className="mt-8 grid gap-6">
            <AdminPanel id="calendar" eyebrow="Calendar" title="Confirmed calls and visits">
              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <p className="text-sm font-bold text-[#1F1F1F]">Video calls confirmed</p>
                  <div className="mt-3 grid gap-3">
                    {confirmedVideoCalls.length > 0 ? (
                      confirmedVideoCalls.map((booking) => (
                        <AdminBookingSummaryCard key={booking.id} booking={booking} />
                      ))
                    ) : (
                      <AdminEmptyState>No confirmed video calls yet.</AdminEmptyState>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1F1F1F]">Home visits confirmed</p>
                  <div className="mt-3 grid gap-3">
                    {confirmedHomeVisits.length > 0 ? (
                      confirmedHomeVisits.map((booking) => (
                        <article key={booking.id} className="rounded-lg border border-[#E6DFD5] bg-white p-4">
                          <p className="font-serif text-2xl text-[#1F1F1F]">{booking.patient_name}</p>
                          <p className="mt-1 text-sm font-semibold text-[#1F1F1F]">
                            {booking.treatment_name}
                          </p>
                          <p className="mt-1 text-sm text-[#595550]">{booking.location}</p>
                          <p className="mt-3 text-sm text-[#595550]">{getScheduleLabel(booking)}</p>
                        </article>
                      ))
                    ) : (
                      <AdminEmptyState>No confirmed home visits yet.</AdminEmptyState>
                    )}
                  </div>
                </div>
              </div>
            </AdminPanel>

            <AdminPanel id="messages" eyebrow="Messages" title="Doctor-side patient threads">
              <div className="grid gap-3">
                {activeMessageThreads.length > 0 ? (
                  activeMessageThreads.map((thread) => (
                    <article
                      key={thread.patient_id}
                      className="grid gap-4 rounded-lg border border-[#E6DFD5] bg-white p-4 lg:grid-cols-[1fr_auto] lg:items-center"
                    >
                      <div>
                        <p className="font-serif text-2xl text-[#1F1F1F]">{thread.patient_name}</p>
                        <p className="mt-1 text-sm text-[#595550]">
                          {thread.patient_email}
                          {thread.patient_phone ? ` · ${thread.patient_phone}` : ""}
                        </p>
                        <p className="mt-2 text-sm text-[#4D4D4D]">
                          <span className="font-semibold">
                            {thread.last_sender_role === "doctor" ? "Doctor" : "Patient"}:
                          </span>{" "}
                          {thread.last_message}
                        </p>
                        <p className="mt-1 text-xs text-[#5C574F]">
                          Last message {formatBookingDate(thread.last_message_at)}
                        </p>
                        <form action={sendDoctorMessageAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input type="hidden" name="patientId" value={thread.patient_id} />
                          <input
                            className="field h-10"
                            name="message"
                            maxLength={2000}
                            placeholder="Quick reply to patient"
                            aria-label={`Quick reply to ${thread.patient_name}`}
                          />
                          <FormSubmitButton className="btn btn-primary h-10">
                            Reply
                          </FormSubmitButton>
                        </form>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link className="btn btn-secondary h-10" href={`/messages?patientId=${thread.patient_id}`}>
                          Open chat
                        </Link>
                        <a
                          className="btn btn-ghost h-10"
                          href={`mailto:${thread.patient_email}?subject=${encodeURIComponent("BetterSelf follow-up")}`}
                        >
                          Email
                        </a>
                      </div>
                    </article>
                  ))
                ) : (
                  <AdminEmptyState>No patient messages yet.</AdminEmptyState>
                )}
              </div>
            </AdminPanel>

            <AdminPanel id="patients" eyebrow="Patients" title="Patient quick list">
              <div className="grid gap-3 md:grid-cols-2">
                {patientSummaries.length > 0 ? (
                  patientSummaries.map((patient) => (
                    <article key={patient.patient_id} className="rounded-lg border border-[#E6DFD5] bg-white p-4">
                      <p className="font-serif text-2xl text-[#1F1F1F]">{patient.patient_name}</p>
                      <p className="mt-1 text-sm text-[#595550]">{patient.patient_email}</p>
                      <div className="mt-3 grid gap-2 text-sm">
                        <Summary label="Phone" value={patient.patient_phone ?? "No phone"} />
                        <Summary label="Bookings" value={String(patient.patient_total_bookings)} />
                        <Summary label="Spend" value={formatPeso(patient.patient_total_spend)} />
                      </div>
                    </article>
                  ))
                ) : (
                  <AdminEmptyState>No patients yet.</AdminEmptyState>
                )}
              </div>
            </AdminPanel>

            <AdminPanel id="payments" eyebrow="Payments" title="Payment queue">
              <div className="grid gap-3">
                {bookings.filter(isReadyToPay).length > 0 ? (
                  bookings
                    .filter(isReadyToPay)
                    .slice(0, 8)
                    .map((booking) => (
                      <article
                        key={booking.id}
                        className="grid gap-3 rounded-lg border border-[#E6DFD5] bg-white p-4 md:grid-cols-[1fr_auto] md:items-center"
                      >
                        <div>
                          <p className="font-serif text-2xl text-[#1F1F1F]">{booking.treatment_name}</p>
                          <p className="mt-1 text-sm text-[#595550]">
                            {booking.patient_name} · {formatPeso(getDisplayAmount(booking))}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge tone={bookingStatusTone(booking.status)}>
                            {formatBookingStatus(booking.status)}
                          </StatusBadge>
                          <StatusBadge tone={paymentStatusTone(booking.payment_status)}>
                            {formatPaymentStatus(booking.payment_status)}
                          </StatusBadge>
                        </div>
                      </article>
                    ))
                ) : (
                  <AdminEmptyState>No unpaid bookings in the queue.</AdminEmptyState>
                )}
              </div>
            </AdminPanel>
          </div>

          {bookings.length === 0 ? (
            <p className="card mt-8 p-6 text-sm text-[#595550]">No bookings yet.</p>
          ) : (
            <div id="bookings" className="mt-8 grid scroll-mt-28 gap-4">
              {filteredBookings.length === 0 ? (
                <p className="card p-6 text-sm text-[#595550]">
                  No bookings match the current filters.
                </p>
              ) : null}
              {filteredBookings.map((b) => {
                const answers = asRecord(b.intake_answers);
                const flagged = getStringList(answers.flagged);
                const patientConcern = getPatientConcern(b.intake_answers);
                const callLink = getVideoCallLink(b);
                return (
                  <article key={b.id} className="card p-5">
                    <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_auto] lg:items-start">
                      <div>
                        <p className="font-serif text-2xl text-[#1F1F1F]">{b.patient_name}</p>
                        <p className="mt-1 break-words text-sm text-[#595550]">
                          {b.patient_email} · {b.patient_phone || "No phone"}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#1F1F1F]">
                          {b.treatment_name} · {b.treatment_price_label}
                        </p>
                        <p className="mt-1 text-sm text-[#595550]">
                          {b.appointment_type} · {b.location}
                        </p>
                        <p className="mt-1 text-xs text-[#5C574F]">
                          Booked {formatBookingDate(b.created_at)} · updated{" "}
                          {formatBookingDate(b.updated_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone={bookingStatusTone(b.status)}>
                          {formatBookingStatus(b.status)}
                        </StatusBadge>
                        <StatusBadge tone={paymentStatusTone(b.payment_status)}>
                          {formatPaymentStatus(b.payment_status)}
                        </StatusBadge>
                        <StatusBadge tone={intakeStatusTone(b.intake_review_status)}>
                          Intake: {formatIntakeStatus(b.intake_review_status)}
                        </StatusBadge>
                        {flagged.length > 0 ? (
                          <StatusBadge tone="warning">{flagged.length} medical flags</StatusBadge>
                        ) : null}
                        {getDisplayAmount(b) != null ? (
                          <StatusBadge tone="neutral">{formatPeso(getDisplayAmount(b))}</StatusBadge>
                        ) : null}
                      </div>
                      <form
                        action={updateBookingStatusAction}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="bookingId" value={b.id} />
                        <select
                          name="status"
                          defaultValue={b.status}
                          className="field h-10 max-w-[13rem]"
                          aria-label={`Status for ${b.patient_name}`}
                        >
                          <option value="pending_doctor_review">Pending review</option>
                          <option value="needs_more_information">Needs more info</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button className="btn btn-primary h-10" type="submit">
                          Update
                        </button>
                      </form>
                    </div>

                    <details className="mt-5 rounded-lg border border-[#E6DFD5] bg-white p-4">
                      <summary className="cursor-pointer text-sm font-bold text-[#1F1F1F]">
                        Review full booking, patient, intake, payment, and notes
                      </summary>
                      <div className="mt-5 grid gap-5">
                        <section>
                          <p className="eyebrow">Patient profile</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <AdminMeta label="Address" value={b.patient_address || b.location} />
                            <AdminMeta label="Emergency contact" value={b.patient_emergency_contact} />
                            <AdminMeta label="Total bookings" value={b.patient_total_bookings} />
                            <AdminMeta label="Paid bookings" value={b.patient_paid_bookings} />
                            <AdminMeta label="Patient spend" value={formatPeso(b.patient_total_spend)} />
                            <AdminMeta label="Profile" value={b.profile_completion_status} />
                          </div>
                          <form
                            action={updatePatientProfileAction}
                            className="mt-4 grid gap-3 md:grid-cols-2"
                          >
                            <input type="hidden" name="userId" value={b.patient_id} />
                            <AdminField label="Phone">
                              <input className="field" name="phone" defaultValue={b.patient_phone ?? ""} />
                            </AdminField>
                            <AdminField label="Emergency contact">
                              <input
                                className="field"
                                name="emergencyContact"
                                defaultValue={b.patient_emergency_contact ?? ""}
                              />
                            </AdminField>
                            <AdminField label="Address">
                              <textarea
                                className="field min-h-20"
                                name="address"
                                defaultValue={b.patient_address ?? b.location}
                              />
                            </AdminField>
                            <AdminField label="Allergies">
                              <textarea
                                className="field min-h-20"
                                name="allergies"
                                defaultValue={b.patient_allergies ?? ""}
                              />
                            </AdminField>
                            <AdminField label="Medications">
                              <textarea
                                className="field min-h-20"
                                name="medications"
                                defaultValue={b.patient_medications ?? ""}
                              />
                            </AdminField>
                            <AdminField label="Contraindications / risk notes">
                              <textarea
                                className="field min-h-20"
                                name="contraindications"
                                defaultValue={b.patient_contraindications ?? ""}
                              />
                            </AdminField>
                            <div className="md:col-span-2">
                              <button className="btn btn-secondary" type="submit">
                                Save patient profile
                              </button>
                            </div>
                          </form>
                        </section>

                        <section>
                          <p className="eyebrow">Call & schedule</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <AdminMeta label="Appointment" value={b.appointment_type} />
                            <AdminMeta label="Schedule" value={getScheduleLabel(b)} />
                            <AdminMeta label="Location" value={b.location} />
                          </div>
                          <form
                            action={updateBookingScheduleAction}
                            className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
                          >
                            <input type="hidden" name="bookingId" value={b.id} />
                            <AdminField label="Visit date">
                              <input
                                className="field"
                                type="date"
                                name="appointmentDate"
                                defaultValue={b.appointment_date ?? ""}
                              />
                            </AdminField>
                            <AdminField label="Visit time">
                              <input
                                className="field"
                                type="time"
                                name="appointmentTime"
                                defaultValue={b.appointment_time ?? ""}
                              />
                            </AdminField>
                            <button className="btn btn-secondary h-12" type="submit">
                              Save schedule
                            </button>
                          </form>
                          {callLink ? (
                            <a
                              className="btn btn-secondary mt-4"
                              href={callLink}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Open video call
                            </a>
                          ) : (
                            <p className="mt-4 rounded-lg bg-[#FAF8F4] p-4 text-sm leading-6 text-[#595550]">
                              No video call link is stored yet. Calendly can provide one, or set
                              NEXT_PUBLIC_DOCTOR_VIDEO_CALL_URL for a default doctor call link.
                            </p>
                          )}
                        </section>

                        <section>
                          <p className="eyebrow">Medical intake</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <AdminMeta label="Patient concern" value={patientConcern} />
                            <AdminMeta
                              label="Consent"
                              value={b.intake_consent_confirmed ? "Confirmed" : "Missing"}
                            />
                          </div>
                          {flagged.length > 0 ? (
                            <div className="mt-3 rounded-lg border border-[#F6D7A7] bg-[#FFF8E7] p-4">
                              <p className="text-sm font-bold text-[#1F1F1F]">Flagged answers</p>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#5C574F]">
                                {flagged.map((item, index) => (
                                  <li key={`${index}-${item}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="mt-3 rounded-lg bg-[#F6EDEA] p-4 text-sm text-[#6E565A]">
                              No medical flags were submitted for this booking.
                            </p>
                          )}
                          <form
                            action={updateIntakeReviewAction}
                            className="mt-4 grid gap-3 md:grid-cols-[240px_1fr_auto]"
                          >
                            <input type="hidden" name="bookingId" value={b.id} />
                            <AdminField label="Review status">
                              <select
                                className="field"
                                name="intakeStatus"
                                defaultValue={b.intake_review_status ?? "submitted"}
                              >
                                <option value="not_started">Not started</option>
                                <option value="submitted">Submitted</option>
                                <option value="needs_more_information">Needs more info</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </AdminField>
                            <AdminField label="Doctor notes">
                              <textarea
                                className="field min-h-20"
                                name="doctorNotes"
                                defaultValue={b.intake_doctor_notes ?? ""}
                                placeholder="Clinical review notes, follow-up questions, suitability..."
                              />
                            </AdminField>
                            <div className="flex items-end">
                              <button className="btn btn-primary h-12" type="submit">
                                Save intake
                              </button>
                            </div>
                          </form>
                        </section>

                        <section>
                          <p className="eyebrow">Payment</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-4">
                            <AdminMeta label="Amount" value={formatPeso(getDisplayAmount(b))} />
                            <AdminMeta label="Type" value={b.payment_type} />
                            <AdminMeta label="Reference" value={b.transaction_reference} />
                            <AdminMeta label="PayMongo session" value={b.paymongo_checkout_id} />
                          </div>
                          <form
                            action={updateBookingPaymentStatusAction}
                            className="mt-4 flex flex-wrap items-end gap-3"
                          >
                            <input type="hidden" name="bookingId" value={b.id} />
                            <AdminField label="Payment status">
                              <select
                                className="field min-w-56"
                                name="paymentStatus"
                                defaultValue={b.payment_status}
                              >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="refunded">Refunded</option>
                                <option value="not_required">Not required</option>
                              </select>
                            </AdminField>
                            <button className="btn btn-secondary h-12" type="submit">
                              Update payment
                            </button>
                          </form>
                          <form
                            action={setBookingAmountAction}
                            className="mt-3 flex flex-wrap items-end gap-3"
                          >
                            <input type="hidden" name="bookingId" value={b.id} />
                            <AdminField label="Doctor-assessed amount (₱)">
                              <input
                                className="field min-w-56"
                                type="number"
                                name="confirmedAmount"
                                min="0"
                                step="1"
                                placeholder="e.g. 13500"
                                defaultValue={b.confirmed_amount ?? ""}
                              />
                            </AdminField>
                            <button className="btn btn-secondary h-12" type="submit">
                              Save amount
                            </button>
                          </form>
                          <p className="mt-2 text-xs text-[#6E565A]">
                            For unit/area treatments ({b.treatment_price_label}), set the total
                            the patient pays before they check out. Leave blank to use the base
                            price.
                          </p>
                        </section>

                        <section>
                          <p className="eyebrow">Internal booking notes</p>
                          <form action={updateBookingNotesAction} className="mt-3 grid gap-3">
                            <input type="hidden" name="bookingId" value={b.id} />
                            <textarea
                              className="field min-h-32"
                              name="notes"
                              defaultValue={b.notes ?? ""}
                              placeholder="Internal notes for doctor/admin only..."
                            />
                            <div>
                              <button className="btn btn-secondary" type="submit">
                                Save notes
                              </button>
                            </div>
                          </form>
                        </section>
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </section>
    </PageShell>
  );
}

export function SafetyPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Safety & protocol"
        title="Aesthetic treatments are medical procedures."
        text="BetterSelf uses a doctor-led process with screening, consent, sterile preparation, documentation, aftercare, and follow-up support."
      />
      <section className="px-5 pb-8 lg:px-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-lg border border-[#E6DFD5] bg-white shadow-sm lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[300px] lg:min-h-[420px]">
            <Image
              src="/betterself-safety-kit.jpg"
              alt="Sterile medical supplies and procedure checklist prepared for a BetterSelf treatment"
              fill
              priority
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center p-6 md:p-8">
            <p className="eyebrow">Sterile setup</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F] md:text-5xl">
              The appointment is prepared like a medical procedure, not a spa add-on.
            </h2>
            <p className="mt-5 text-base leading-7 text-[#595550]">
              Treatment only proceeds after intake, suitability review, consent,
              clean setup, product verification, and aftercare instructions.
            </p>
          </div>
        </div>
      </section>
      <section className="px-5 pb-14 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
          {[
            ["Before treatment", ["Medical intake", "Doctor assessment", "Treatment suitability check", "Consent form"]],
            ["During treatment", ["Sterile setup", "Product verification", "Medical documentation", "Patient comfort"]],
            ["After treatment", ["Aftercare instructions", "Follow-up support", "Warning signs", "Review if needed"]],
            ["When home treatment is not suitable", ["Some procedures may require a clinic setting", "BetterSelf may refuse, delay, or redirect care", "Patient safety comes before convenience"]],
          ].map(([title, items]) => (
            <section key={title as string} className="card p-6">
              <h2 className="font-serif text-3xl text-[#1F1F1F]">{title as string}</h2>
              <div className="mt-5">
                <SafetyChecklist items={items as string[]} />
              </div>
            </section>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

export function AboutPage() {
  return (
    <PageShell>
      <section className="px-5 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card p-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[#F1ECE4]">
              <Image
                src="/betterself-doctor-kit.jpg"
                alt="BetterSelf doctor preparing a sterile home-visit aesthetic kit"
                fill
                priority
                sizes="(min-width: 1024px) 420px, 90vw"
                className="object-cover object-center"
              />
            </div>
            <div className="mt-5 grid gap-3">
              <StatusBadge>Doctor-led care</StatusBadge>
              <StatusBadge>Licensed medical doctor</StatusBadge>
              <StatusBadge>Aesthetic &amp; injectable treatments</StatusBadge>
            </div>
          </div>
          <div>
            <Badge>Our approach</Badge>
            <h1 className="mt-5 font-serif text-5xl leading-tight text-[#1F1F1F] md:text-6xl">
              Private aesthetic care, guided by a licensed medical doctor.
            </h1>
            <div className="mt-6 grid gap-5 text-base leading-8 text-[#595550]">
              <p>
                BetterSelf was created to make aesthetic care more private,
                structured, and convenient without removing the medical standards
                that patients deserve.
              </p>
              <p>
                Led by a licensed medical doctor, BetterSelf offers selected
                aesthetic treatments through a careful process of booking,
                medical intake, doctor review, treatment planning, and aftercare.
              </p>
              <p>
                The goal is not to change how patients look. The goal is to help
                them look refreshed, feel confident, and receive care in a safe
                and discreet way.
              </p>
            </div>
            <Link className="btn btn-primary mt-8" href="/booking">
              Book Treatment
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export function FaqPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="FAQ"
        title="Clear answers before you book."
        text="Clear answers about how BetterSelf works, who performs your treatment, safety, and what to expect at a home visit."
      />
      <section className="px-5 pb-14 lg:px-8">
        <div className="mx-auto grid max-w-4xl gap-4">
          {faqs.map(([question, answer]) => (
            <article key={question} className="card p-5">
              <h2 className="font-serif text-2xl text-[#1F1F1F]">{question}</h2>
              <p className="mt-3 text-sm leading-6 text-[#595550]">{answer}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

export function LoginPage({ status }: { status?: string }) {
  return (
    <PageShell>
      <section className="px-5 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-6">
          <section className="card p-7">
            <p className="eyebrow">Patient account</p>
            <h1 className="mt-3 font-serif text-5xl leading-tight text-[#1F1F1F]">
              Sign in to your private BetterSelf account.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#595550]">
              Sign in to track your bookings, message the doctor, and pay securely
              once your treatment is confirmed. New here? Create an account in a
              minute.
            </p>
            {status ? (
              <div className="mt-5">
                <Notice title="Auth status">
                  {status === "clerk-missing"
                    ? "Clerk environment variables are not configured yet. Add them locally or through Vercel before testing protected routes."
                    : "Clerk will handle the active authentication state. If you were redirected here, sign in again or create a patient account."}
                </Notice>
              </div>
            ) : null}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link className="btn btn-primary justify-center" href="/sign-in">
                Sign in
              </Link>
              <Link className="btn btn-secondary justify-center" href="/sign-up">
                Create account
              </Link>
            </div>
            <Notice title="Your account is private">
              Your dashboard and messages are private to you. Sign in (or create a free
              account) to request a treatment, track it, and pay once the doctor confirms.
            </Notice>
          </section>
        </div>
      </section>
    </PageShell>
  );
}

export function HowItWorksPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="How it works"
        title="A simple process that keeps medical review visible."
        text="Patients can book in minutes, but BetterSelf still keeps intake, doctor review, consent, and aftercare as core parts of the journey."
      />
      <section className="px-5 pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <HowItWorksSection />
        </div>
      </section>
    </PageShell>
  );
}

export function ContactPage() {
  return (
    <PageShell>
      <section className="px-5 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <Badge>Contact</Badge>
            <h1 className="mt-5 font-serif text-5xl leading-tight text-[#1F1F1F] md:text-6xl">
              Book a treatment or ask the doctor.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#595550]">
              Choose the treatment you want, complete medical intake, and keep
              the doctor involved before and after your home appointment.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <p className="eyebrow">Email us</p>
                <a
                  className="text-lg font-semibold text-[#1F1F1F] underline decoration-[#CAA6AD] underline-offset-4"
                  href={`mailto:${SUPPORT_EMAIL}`}
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>
              {SUPPORT_PHONE ? (
                <div className="grid gap-1">
                  <p className="eyebrow">Call or text</p>
                  <a
                    className="text-lg font-semibold text-[#1F1F1F]"
                    href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`}
                  >
                    {SUPPORT_PHONE}
                  </a>
                </div>
              ) : null}
              {SUPPORT_WHATSAPP ? (
                <div className="grid gap-1">
                  <p className="eyebrow">WhatsApp</p>
                  <a
                    className="text-lg font-semibold text-[#1F1F1F] underline decoration-[#CAA6AD] underline-offset-4"
                    href={SUPPORT_WHATSAPP}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chat on WhatsApp
                  </a>
                </div>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-[#595550]">
              We typically reply within one business day.
            </p>
            <Link className="btn btn-primary mt-8" href="/booking">
              Book Treatment
            </Link>
          </div>
          <section className="card p-6">
            <h2 className="font-serif text-3xl text-[#1F1F1F]">Service areas</h2>
            <SafetyChecklist
              items={[
                "BGC",
                "Makati",
                "Rockwell",
                "Alabang",
                "Ortigas",
                "Nearby Metro Manila areas subject to availability",
              ]}
            />
            <div className="mt-6 border-t border-[#E6DFD5] pt-6">
              <Notice title="Support">
                Once you&apos;ve booked, you can message the doctor anytime from your
                patient dashboard.
              </Notice>
            </div>
          </section>
        </div>
      </section>
    </PageShell>
  );
}

function PageHero({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="page-editorial-hero premium-reveal px-5 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 font-serif text-5xl leading-[0.98] text-[#1F1F1F] md:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[#595550] md:text-lg">
            {text}
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="px-5 py-14 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="How BetterSelf works"
          title="A structured, doctor-led path from booking to aftercare."
          text="The journey is intentionally calm: treatment request, intake, doctor call or review, confirmation, dashboard payment, home visit, and follow-up."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {howItWorksSteps.map((step, index) => (
            <article key={step.title} className="card process-card p-5">
              <step.icon className="h-5 w-5 text-[#8F5B67]" />
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#5C574F]">
                0{index + 1}
              </p>
              <h3 className="mt-2 font-serif text-2xl text-[#1F1F1F]">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#595550]">{step.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 grid overflow-hidden rounded-lg border border-[#E6DFD5] bg-white shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[270px] lg:min-h-[360px]">
            <Image
              src="/betterself-home-visit-kit.jpg"
              alt="BetterSelf home-visit kit prepared with appointment calendar and medical notes"
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center p-6 md:p-8">
            <p className="eyebrow">Prepared visit</p>
            <h3 className="font-serif mt-3 text-4xl leading-tight text-[#1F1F1F]">
              Scheduling, intake, equipment, and aftercare stay in one flow.
            </h3>
            <p className="mt-4 text-sm leading-6 text-[#595550]">
              The platform supports the full appointment journey, while the
              doctor arrives prepared for the confirmed treatment plan.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="final-cta-section px-5 py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-serif text-5xl leading-tight text-[#1F1F1F]">
          Book the treatment you want at home.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#595550]">
          Select a service, complete intake, and let the doctor confirm the plan
          before your private home appointment.
        </p>
        <Link className="btn btn-primary mt-8" href="/booking">
          Book Treatment
        </Link>
      </div>
    </section>
  );
}

function DetailBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="treatment-detail-block">
      <h2 className="font-serif text-3xl leading-tight text-[#1F1F1F]">{title}</h2>
      <div className="mt-4">
        <SafetyChecklist items={items} />
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#E6DFD5] pb-3 last:border-0">
      <span className="text-[#595550]">{label}</span>
      <span className="text-right font-semibold text-[#1F1F1F]">{value}</span>
    </div>
  );
}

export function getStaticTreatmentIds() {
  return treatments.map((treatment) => ({ id: treatment.id }));
}

export function getTreatmentOrFirst(id?: string) {
  if (!id) return getTreatmentById(featuredTreatmentIds[0]) ?? treatments[0];
  return getTreatmentById(id) ?? treatments[0];
}
