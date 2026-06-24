import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  Check,
  FileText,
  Home,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import {
  categories,
  featuredTreatmentIds,
  getFeaturedTreatments,
  getTreatmentById,
  Treatment,
  treatments,
} from "@/lib/treatments";
import {
  ArrowLink,
  Badge,
  DoctorLedStrip,
  Notice,
  PageShell,
  SafetyChecklist,
  SectionHeading,
  StatusBadge,
  type StatusTone,
  TreatmentCard,
} from "@/components/site-shell";
import {
  BookingFlow,
  DoctorChat,
  LoginRegisterPreview,
  type BookingPrefill,
} from "@/components/platform-widgets";
import { TreatmentAnatomyMap } from "@/components/treatment-anatomy-map";
import { TreatmentExplorer } from "@/components/treatment-explorer";
import type { AdminBookingView, PatientBookingView } from "@/lib/db/queries";
import type { Json } from "@/lib/db/types";
import {
  updateBookingNotesAction,
  updateBookingPaymentStatusAction,
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

function canRetryPayment(booking: PatientBookingView) {
  return (
    booking.amount != null &&
    booking.status === "confirmed" &&
    (booking.payment_status === "pending" || booking.payment_status === "refunded")
  );
}

function isAwaitingDoctorConfirmation(booking: PatientBookingView) {
  return booking.payment_status === "pending" && booking.status === "pending_doctor_review";
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
    <form action="/api/checkout/retry" method="post">
      <input type="hidden" name="bookingId" value={bookingId} />
      <button className={compact ? "btn btn-primary h-10" : "btn btn-primary"} type="submit">
        {label}
      </button>
    </form>
  );
}

function canCancelBooking(booking: PatientBookingView) {
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
      <button className={compact ? "btn btn-ghost h-10" : "btn btn-ghost"} type="submit">
        Cancel request
      </button>
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

const safetyItems = [
  "Medical intake before treatment",
  "Doctor review required",
  "Consent form before procedure",
  "Sterile treatment preparation",
  "Aftercare instructions",
  "Follow-up support",
];

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
    "BetterSelf provides doctor-led aesthetic care through private appointments. Some treatments may be available at home, while others may require clinic-based care depending on doctor assessment.",
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
    "Yes. Patients can message the doctor through the platform before or after appointments. This chat is not for emergencies.",
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
      <section className="relative isolate overflow-hidden border-b border-[#E6DFD5] px-5 py-12 lg:px-8 lg:py-20">
        <Image
          src="/betterself-hero-home.jpg"
          alt="BetterSelf doctor preparing a sterile home aesthetic treatment kit in a private residence"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[68%_center] md:object-center"
        />
        <div className="absolute inset-0 -z-10 bg-[#FAF8F4]/62 md:bg-transparent" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#FAF8F4] via-[#FAF8F4]/92 to-[#FAF8F4]/10" />
        <div className="mx-auto flex min-h-[600px] max-w-7xl items-center">
          <div className="max-w-3xl">
            <Badge>Home-visit medical aesthetics · Metro Manila</Badge>
            <h1 className="mt-6 font-serif text-5xl leading-[1.03] text-[#1F1F1F] md:text-7xl">
              Doctor-led aesthetic care at your doorstep.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#595550]">
              BetterSelf brings private aesthetic treatments to your home,
              guided by a licensed medical doctor and designed around safety,
              discretion, and convenience.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="btn btn-primary" href="/booking">
                Book a Treatment
              </Link>
              <Link className="btn btn-secondary" href="/treatments">
                Explore Treatments
              </Link>
            </div>
            <p className="mt-5 text-sm leading-6 text-[#5C574F]">
              Medical intake required. Doctor assessment before treatment.
              Private home appointments available.
            </p>
          </div>
        </div>
      </section>
      <DoctorLedStrip />
      <HowItWorksSection />
      <FeaturedTreatmentsSection />
      <WhyBetterSelfSection />
      <DoctorProfileSection />
      <SafetySectionCompact />
      <PricingSectionCompact />
      <FinalCta />
    </PageShell>
  );
}

export function TreatmentsPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Treatments"
        title="Doctor-led aesthetic treatments delivered privately at home."
        text="Browse the current BetterSelf service menu. Prices are starting points or unit-based rates where noted. Every treatment remains subject to medical intake and doctor assessment."
      />
      <TreatmentAnatomyMap treatments={treatments} />
      <TreatmentExplorer categories={categories} treatments={treatments} />
    </PageShell>
  );
}

export function TreatmentDetailPage({ treatment }: { treatment: Treatment }) {
  return (
    <PageShell>
      <section className="px-5 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_380px]">
          <article className="card p-6 md:p-8">
            <Badge>{treatment.category}</Badge>
            <h1 className="mt-5 font-serif text-5xl leading-tight text-[#1F1F1F] md:text-6xl">
              {treatment.name}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#595550]">
              {treatment.description}
            </p>
            {treatment.detailNote ? (
              <p className="mt-3 text-sm italic text-[#5C574F]">{treatment.detailNote}</p>
            ) : null}
            <div className="mt-8 grid gap-8">
              <DetailBlock title="What it may help with" items={treatment.mayHelpWith} />
              <DetailBlock title="Who it may be suitable for" items={treatment.suitableFor} />
              <DetailBlock title="Who should avoid it or seek further review" items={treatment.avoidIf} />
              <DetailBlock title="What to expect" items={treatment.whatToExpect} />
              <DetailBlock title="Before treatment" items={treatment.beforecare} />
              <DetailBlock title="Aftercare" items={treatment.aftercare} />
            </div>
            <Notice title="Treatment disclaimer">
              Suitability, treatment plan, and expected outcomes depend on
              individual medical assessment. Results vary per patient. Medical
              intake and doctor confirmation are required before treatment.
            </Notice>
          </article>
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <section className="card p-5">
              <p className="eyebrow">Book this treatment</p>
              <p className="mt-2 font-serif text-4xl text-[#1F1F1F]">
                {treatment.priceLabel}
              </p>
              <div className="mt-5 grid gap-3 text-sm">
                <Summary label="Duration" value={treatment.duration} />
                <Summary label="Home visit" value="Available when suitable" />
                <Summary label="Requirement" value="Doctor assessment required" />
              </div>
              <div className="mt-5 grid gap-2">
                <Link className="btn btn-primary justify-center" href={`/booking?treatment=${treatment.id}`}>
                  Book Treatment
                </Link>
                <Link className="btn btn-secondary justify-center" href="/messages">
                  Ask Doctor
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}

export function BookingPage({
  treatmentId,
  prefill,
}: {
  treatmentId?: string;
  prefill?: BookingPrefill;
}) {
  return (
    <PageShell>
      <PageHero
        eyebrow="Book appointment"
        title="Choose a treatment directly or start with a doctor consultation."
        text="Patients submit the request first, schedule a doctor call or review, then pay from the dashboard only after BetterSelf confirms the service."
      />
      <section className="px-5 pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <BookingFlow initialTreatmentId={treatmentId} prefill={prefill} />
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
}: {
  viewerName?: string;
  bookings?: PatientBookingView[];
  paymentStatus?: string;
  bookingStatus?: string;
}) {
  const upcoming = bookings[0];
  const hasCompleted = bookings.some((b) => b.status === "completed");
  const paymentRetryMessage = paymentStatus ? paymentRetryMessages[paymentStatus] : undefined;
  const bookingRequestMessage = bookingStatus ? bookingRequestMessages[bookingStatus] : undefined;
  const stats = [
    { label: "Total bookings", value: bookings.length },
    {
      label: "Awaiting doctor review",
      value: bookings.filter((b) => b.status === "pending_doctor_review").length,
    },
    {
      label: "Confirmed",
      value: bookings.filter((b) => b.status === "confirmed").length,
    },
    {
      label: "Paid",
      value: bookings.filter((b) => b.payment_status === "paid").length,
    },
  ];
  return (
    <PageShell>
      <section className="px-5 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="Patient dashboard"
              title={viewerName ? `Welcome back, ${viewerName}.` : "Welcome back."}
              text="Your bookings, schedule, payments, and aftercare in one private place."
            />
            <Link className="btn btn-primary" href="/booking">
              Book Appointment
            </Link>
          </div>
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
              <article key={stat.label} className="card p-5">
                <p className="text-sm text-[#595550]">{stat.label}</p>
                <p className="mt-3 font-serif text-4xl text-[#1F1F1F]">{stat.value}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="card p-6">
              <p className="eyebrow">{upcoming ? "Latest appointment" : "Upcoming appointment"}</p>
              {upcoming ? (
                <>
                  <h2 className="mt-3 font-serif text-4xl text-[#1F1F1F]">
                    {upcoming.treatment_name}
                  </h2>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Summary label="Doctor" value="BetterSelf Medical Doctor" />
                    <Summary label="Booked on" value={formatBookingDate(upcoming.created_at)} />
                    <Summary label="Appointment" value={upcoming.appointment_type} />
                    <Summary label="Location" value={upcoming.location} />
                    <Summary label="Status" value={formatBookingStatus(upcoming.status)} />
                    <Summary
                      label="Payment"
                      value={
                        upcoming.amount != null
                          ? `${formatPaymentStatus(upcoming.payment_status)} · ${formatPeso(upcoming.amount)}`
                          : formatPaymentStatus(upcoming.payment_status)
                      }
                    />
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {canRetryPayment(upcoming) ? (
                      <RetryPaymentButton bookingId={upcoming.id} />
                    ) : isAwaitingDoctorConfirmation(upcoming) ? (
                      <span className="btn btn-secondary cursor-default justify-center opacity-80">
                        Payment after doctor call
                      </span>
                    ) : (
                      <Link className="btn btn-secondary" href="/booking">
                        Book Again
                      </Link>
                    )}
                    <Link
                      className={canRetryPayment(upcoming) ? "btn btn-secondary" : "btn btn-primary"}
                      href="/messages"
                    >
                      Message Doctor
                    </Link>
                    {canCancelBooking(upcoming) ? (
                      <CancelRequestButton bookingId={upcoming.id} />
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
            <section id="aftercare" className="card bg-[#EEF5F5] p-6">
              <p className="eyebrow">Aftercare</p>
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
                    Aftercare guidance
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#595550]">
                    After your treatment, your doctor&apos;s personalised aftercare
                    instructions will appear here.
                  </p>
                </>
              )}
            </section>
          </div>
          {bookings.length > 0 ? (
            <section className="mt-8">
              <p className="eyebrow">Treatment history</p>
              <div className="mt-4 grid gap-3">
                {bookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="card grid gap-4 p-5 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center"
                  >
                    <div>
                      <p className="font-serif text-2xl text-[#1F1F1F]">
                        {booking.treatment_name}
                      </p>
                      <p className="mt-1 text-sm text-[#595550]">
                        {booking.appointment_type} · {booking.location}
                      </p>
                    </div>
                    <div className="text-sm text-[#4D4D4D]">
                      <p>Booked {formatBookingDate(booking.created_at)}</p>
                      <p>{formatPeso(booking.amount)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={bookingStatusTone(booking.status)}>
                        {formatBookingStatus(booking.status)}
                      </StatusBadge>
                      <StatusBadge tone={paymentStatusTone(booking.payment_status)}>
                        {formatPaymentStatus(booking.payment_status)}
                      </StatusBadge>
                      {canRetryPayment(booking) ? (
                        <RetryPaymentButton
                          bookingId={booking.id}
                          label="Retry payment"
                          compact
                        />
                      ) : isAwaitingDoctorConfirmation(booking) ? (
                        <StatusBadge tone="neutral">Payment after doctor call</StatusBadge>
                      ) : null}
                      {canCancelBooking(booking) ? (
                        <CancelRequestButton bookingId={booking.id} compact />
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}

export function MessagesPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Messages"
        title="Internal doctor-patient chat structure."
        text="Patients can message the doctor before or after treatment, attach photos, and keep conversations linked to bookings."
      />
      <section className="px-5 pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <DoctorChat />
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
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A746E]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-[#1F1F1F]">
        {value == null || value === "" ? "—" : value}
      </p>
    </div>
  );
}

export function AdminPage({
  authorized = false,
  bookings = [],
  filters = {},
}: {
  authorized?: boolean;
  bookings?: AdminBookingView[];
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
  const paymentsReady = bookings.filter(
    (booking) => booking.status === "confirmed" && booking.payment_status === "pending",
  ).length;
  const flaggedIntakes = bookings.filter((booking) => {
    const answers = asRecord(booking.intake_answers);
    return getStringList(answers.flagged).length > 0;
  }).length;

  return (
    <PageShell>
      <section className="px-5 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Doctor / Admin dashboard"
            title="Manage real patient bookings."
            text="Live bookings from the database. Review each request, then update its status."
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
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7A746E]">
                  {label}
                </p>
                <p className="mt-2 font-serif text-3xl text-[#1F1F1F]">{value}</p>
              </div>
            ))}
          </div>

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
            <Link className="btn btn-secondary" href="/admin/export.csv">
              Export CSV
            </Link>
            <Link className="btn btn-secondary" href="/dashboard">
              Patient view
            </Link>
          </div>

          {bookings.length === 0 ? (
            <p className="card mt-8 p-6 text-sm text-[#595550]">No bookings yet.</p>
          ) : (
            <div className="mt-8 grid gap-4">
              {filteredBookings.length === 0 ? (
                <p className="card p-6 text-sm text-[#595550]">
                  No bookings match the current filters.
                </p>
              ) : null}
              {filteredBookings.map((b) => {
                const answers = asRecord(b.intake_answers);
                const flagged = getStringList(answers.flagged);
                const patientConcern = getPatientConcern(b.intake_answers);
                return (
                  <article key={b.id} className="card p-5">
                    <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_auto] lg:items-start">
                      <div>
                        <p className="font-serif text-2xl text-[#1F1F1F]">{b.patient_name}</p>
                        <p className="mt-1 text-sm text-[#595550]">
                          {b.patient_email} · {b.patient_phone || "No phone"}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#1F1F1F]">
                          {b.treatment_name} · {b.treatment_price_label}
                        </p>
                        <p className="mt-1 text-sm text-[#595550]">
                          {b.appointment_type} · {b.location}
                        </p>
                        <p className="mt-1 text-xs text-[#7A746E]">
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
                        {b.amount != null ? (
                          <StatusBadge tone="neutral">{formatPeso(b.amount)}</StatusBadge>
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
                                {flagged.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="mt-3 rounded-lg bg-[#EEF5F5] p-4 text-sm text-[#566060]">
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
                            <AdminMeta label="Amount" value={formatPeso(b.amount)} />
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
            <Badge>Meet your doctor</Badge>
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
        text="BetterSelf should sell trust first, treatment second. These answers keep the experience calm, transparent, and medically guided."
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
            <p className="eyebrow">Clerk Auth</p>
            <h1 className="mt-3 font-serif text-5xl leading-tight text-[#1F1F1F]">
              Sign in to your private BetterSelf account.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#595550]">
              Patient accounts now use Clerk. After you add the Clerk environment
              variables from Vercel, patients can sign in, book treatments, and
              message the doctor from the protected portal.
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
            <Notice title="Protected portal">
              The dashboard, messages, and admin preview are protected routes.
              Booking stays open so patients can request treatment directly,
              then create or use an account for ongoing care.
            </Notice>
          </section>
          <LoginRegisterPreview />
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
            <Notice title="Support">
              Internal doctor-patient messaging is included in the first version.
              WhatsApp support can be added later.
            </Notice>
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
    <section className="px-5 py-10 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-5xl leading-tight text-[#1F1F1F] md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#595550]">
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
            <article key={step.title} className="card p-5">
              <step.icon className="h-5 w-5 text-[#4F5B55]" />
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

function FeaturedTreatmentsSection() {
  const featured = getFeaturedTreatments();

  return (
    <section className="bg-white px-5 py-14 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="Popular treatments"
            title="Selected treatments, medically reviewed."
            text="Patients can request the treatment directly, with doctor review before final confirmation and payment."
          />
          <ArrowLink href="/treatments">View all treatments</ArrowLink>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((treatment) => (
            <TreatmentCard key={treatment.id} treatment={treatment} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyBetterSelfSection() {
  const pillars = [
    ["Doctor-led", "Every treatment is reviewed and performed under medical supervision."],
    ["Discreet", "Appointments are private and designed around your schedule."],
    ["Convenient", "Receive aesthetic care without visiting a clinic when home treatment is suitable."],
    ["Safe process", "Medical intake, consent forms, aftercare, and follow-up are part of the journey."],
  ];

  return (
    <section className="px-5 py-14 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-[#E6DFD5] bg-[#DDE8E8] p-8">
          <Stethoscope className="h-8 w-8 text-[#4F5B55]" />
          <h2 className="mt-8 font-serif text-5xl leading-tight text-[#1F1F1F]">
            Private care, medically guided.
          </h2>
          <p className="mt-5 text-base leading-7 text-[#566060]">
            BetterSelf brings selected aesthetic treatments to your home through
            a structured, doctor-led process.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {pillars.map(([title, text]) => (
            <article key={title} className="card p-5">
              <Check className="h-5 w-5 text-[#4F5B55]" />
              <h3 className="mt-5 font-serif text-3xl text-[#1F1F1F]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#595550]">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DoctorProfileSection() {
  return (
    <section className="bg-white px-5 py-14 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="card p-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#F1ECE4]">
            <Image
              src="/betterself-doctor-kit.jpg"
              alt="Doctor preparing sterile equipment for a BetterSelf home treatment"
              fill
              sizes="(min-width: 1024px) 420px, 90vw"
              className="object-cover object-center"
            />
          </div>
          <div className="mt-5 grid gap-2">
            <StatusBadge>Licensed medical care</StatusBadge>
            <StatusBadge>Doctor-led</StatusBadge>
          </div>
        </div>
        <div>
          <SectionHeading
            eyebrow="Meet your doctor"
            title="Care begins with proper assessment."
            text="BetterSelf is led by a licensed medical doctor with experience in aesthetic care and patient-centered treatment planning. Every appointment begins with medical screening and clear aftercare guidance."
          />
          <Link className="btn btn-primary mt-8" href="/booking">
            Book Treatment
          </Link>
        </div>
      </div>
    </section>
  );
}

function SafetySectionCompact() {
  return (
    <section className="px-5 py-14 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.9fr]">
        <SectionHeading
          eyebrow="Safety comes first"
          title="Aesthetic treatments are medical procedures."
          text="BetterSelf follows a structured process that includes medical intake, doctor assessment, consent, treatment documentation, and aftercare instructions."
        />
        <section className="card overflow-hidden">
          <div className="relative h-56">
            <Image
              src="/betterself-safety-kit.jpg"
              alt="Sterile medical supplies used in BetterSelf safety preparation"
              fill
              sizes="(min-width: 1024px) 38vw, 100vw"
              className="object-cover object-[center_42%]"
            />
          </div>
          <div className="p-6">
            <SafetyChecklist items={safetyItems} />
            <Link className="btn btn-secondary mt-6" href="/safety">
              Read Our Safety Protocol
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}

function PricingSectionCompact() {
  return (
    <section className="bg-white px-5 py-14 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
        <SectionHeading
          eyebrow="Per-treatment pricing"
          title="No memberships. Each booking is priced by treatment."
          text="Patients choose a treatment, review the published starting price or unit rate, complete medical intake, and pay for that specific service when the booking is confirmed."
        />
        <div className="card p-6">
          <SafetyChecklist
            items={[
              "No monthly or annual membership",
              "Prices are per treatment, unit, area, or piece where noted",
              "Payment opens from the dashboard after doctor confirmation",
              "Doctor assessment is required before final treatment confirmation",
              "Eligible employee and referral discounts can still apply",
            ]}
          />
          <Link className="btn btn-primary mt-6" href="/treatments">
            View Service Rates
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-5 py-16 lg:px-8">
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
    <section>
      <h2 className="font-serif text-3xl text-[#1F1F1F]">{title}</h2>
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
