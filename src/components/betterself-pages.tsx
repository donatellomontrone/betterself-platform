import Image from "next/image";
import Link from "next/link";
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
import { updateBookingStatusAction } from "@/app/admin/actions";

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
    title: "Book a private appointment",
    text: "Select your preferred date, time, and location in selected Metro Manila areas.",
    icon: CalendarDays,
  },
  {
    title: "Receive care at home",
    text: "A licensed doctor visits with the required medical setup and aftercare guidance.",
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
        text="Patients can book a known treatment and pay for that service, or book a ₱1,500 doctor consultation first when they need help choosing the right option."
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
}: {
  viewerName?: string;
  bookings?: PatientBookingView[];
}) {
  const upcoming = bookings[0];
  const hasCompleted = bookings.some((b) => b.status === "completed");
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
                    <Link className="btn btn-secondary" href="/booking">
                      Book Again
                    </Link>
                    <Link className="btn btn-primary" href="/messages">
                      Message Doctor
                    </Link>
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

export function AdminPage({
  authorized = false,
  bookings = [],
}: {
  authorized?: boolean;
  bookings?: AdminBookingView[];
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
          {bookings.length === 0 ? (
            <p className="card mt-8 p-6 text-sm text-[#595550]">No bookings yet.</p>
          ) : (
            <div className="mt-8 grid gap-4">
              {bookings.map((b) => (
                <article key={b.id} className="card p-5">
                  <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
                    <div>
                      <p className="font-serif text-2xl text-[#1F1F1F]">{b.patient_name}</p>
                      <p className="mt-1 text-sm text-[#595550]">{b.patient_email}</p>
                      <p className="mt-1 text-sm text-[#4D4D4D]">
                        {b.treatment_name} · {b.appointment_type}
                      </p>
                      <p className="text-sm text-[#595550]">
                        {b.location} · booked {formatBookingDate(b.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={bookingStatusTone(b.status)}>
                        {formatBookingStatus(b.status)}
                      </StatusBadge>
                      <StatusBadge tone={paymentStatusTone(b.payment_status)}>
                        {formatPaymentStatus(b.payment_status)}
                      </StatusBadge>
                      {b.intake_review_status ? (
                        <StatusBadge tone="neutral">Intake: {b.intake_review_status}</StatusBadge>
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
                        <option value="pending_doctor_review">Pending doctor review</option>
                        <option value="needs_more_information">Needs more information</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button className="btn btn-primary h-10" type="submit">
                        Update
                      </button>
                    </form>
                  </div>
                </article>
              ))}
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
          text="The journey is intentionally calm: treatment selection, intake, scheduling, medical review, payment, home visit, and follow-up."
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
            text="Patients can book the treatment directly, with doctor review before final confirmation."
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
              "Home visit fee and payment timing are shown before checkout",
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
