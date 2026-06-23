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
  discountTiers,
  featuredTreatmentIds,
  getFeaturedTreatments,
  getTreatmentById,
  getTreatmentsByCategory,
  referralPromos,
  Treatment,
  treatments,
} from "@/lib/treatments";
import {
  ArrowLink,
  Badge,
  DoctorLedStrip,
  Notice,
  PageShell,
  patientDashboardCards,
  SafetyChecklist,
  SectionHeading,
  StatusBadge,
  TreatmentCard,
} from "@/components/site-shell";
import {
  BookingFlow,
  ConfirmationSummary,
  DoctorChat,
  LoginRegisterPreview,
} from "@/components/platform-widgets";
import type { PatientBookingView } from "@/lib/db/queries";

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
      <section className="px-5 py-10 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_500px]">
          <div>
            <Badge>Doctor-led aesthetic care at your doorstep</Badge>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[1.03] text-[#1F1F1F] md:text-7xl">
              Doctor-led aesthetic care at your doorstep.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6F6F6F]">
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
            <p className="mt-5 text-sm leading-6 text-[#7A746E]">
              Medical intake required. Doctor assessment before treatment.
              Private home appointments available.
            </p>
          </div>
          <HomeBrandPanel />
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

function HomeBrandPanel() {
  return (
    <aside className="grid gap-4">
      <div className="relative overflow-hidden rounded-lg border border-[#E6DFD5] bg-[#F7EBDD] shadow-sm">
        <Image
          src="/betterself-mark.png"
          alt="BetterSelf Home Aesthetics brand mark"
          width={1800}
          height={1800}
          priority
          sizes="(min-width: 1024px) 500px, 90vw"
          className="aspect-square w-full object-cover"
        />
      </div>
      <div className="grid gap-3 rounded-lg border border-[#E6DFD5] bg-white p-4 sm:grid-cols-3">
        {[
          ["Book", "Choose treatment"],
          ["Review", "Doctor confirms"],
          ["Home", "Private visit"],
        ].map(([title, text]) => (
          <div key={title} className="rounded-lg bg-[#FAF8F4] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A746E]">
              {title}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1F1F1F]">{text}</p>
          </div>
        ))}
      </div>
    </aside>
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
      <section className="px-5 pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((category) => (
              <a key={category} className="btn btn-secondary" href={`#${slugify(category)}`}>
                {category}
              </a>
            ))}
          </div>
          <div className="grid gap-12">
            {categories.map((category) => (
              <section key={category} id={slugify(category)}>
                <div className="mb-5 flex items-end justify-between gap-4">
                  <SectionHeading eyebrow="Service category" title={category} />
                  <p className="hidden max-w-sm text-sm leading-6 text-[#6F6F6F] md:block">
                    Book the treatment request directly. The doctor still
                    reviews suitability before confirming or performing care.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {getTreatmentsByCategory(category).map((treatment) => (
                    <TreatmentCard key={treatment.id} treatment={treatment} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
      <DiscountsSection />
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
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#6F6F6F]">
              {treatment.description}
            </p>
            {treatment.detailNote ? (
              <p className="mt-3 text-sm italic text-[#7A746E]">{treatment.detailNote}</p>
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
              <p className="eyebrow">Booking card</p>
              <h2 className="mt-3 font-serif text-3xl text-[#1F1F1F]">
                {treatment.name}
              </h2>
              <div className="mt-5 grid gap-3 text-sm">
                <Summary label="Starting price" value={treatment.priceLabel} />
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

export function BookingPage({ treatmentId }: { treatmentId?: string }) {
  return (
    <PageShell>
      <PageHero
        eyebrow="Book appointment"
        title="Book your treatment directly for private medical aesthetic care."
        text="Select the treatment, appointment type, Metro Manila location, schedule, medical intake, and payment option. The doctor confirms suitability before performing care."
      />
      <section className="px-5 pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <BookingFlow initialTreatmentId={treatmentId} />
          <div className="mt-6">
            <ConfirmationSummary />
          </div>
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
  return (
    <PageShell>
      <section className="px-5 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="Patient dashboard"
              title={viewerName ? `Welcome back, ${viewerName}.` : "Welcome back."}
              text="A private clinic-style portal for bookings, messages, intake, aftercare, treatment history, and payments."
            />
            <Link className="btn btn-primary" href="/booking">
              Book Appointment
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {patientDashboardCards.map((card) => (
              <article key={card.title} className="card p-5">
                <card.icon className="h-5 w-5 text-[#4F5B55]" />
                <h2 className="mt-4 font-serif text-2xl text-[#1F1F1F]">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#6F6F6F]">{card.text}</p>
                <div className="mt-4">
                  <StatusBadge>{card.status}</StatusBadge>
                </div>
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
                  <p className="mt-3 text-sm leading-6 text-[#6F6F6F]">
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
                      <p className="mt-1 text-sm text-[#6F6F6F]">
                        {booking.appointment_type} · {booking.location}
                      </p>
                    </div>
                    <div className="text-sm text-[#4D4D4D]">
                      <p>Booked {formatBookingDate(booking.created_at)}</p>
                      <p>{formatPeso(booking.amount)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge>{formatBookingStatus(booking.status)}</StatusBadge>
                      <StatusBadge>{formatPaymentStatus(booking.payment_status)}</StatusBadge>
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

export function AdminPage() {
  const appointments = [
    ["Mia Santos", "Mesoheal Korean Skin Booster", "BGC", "Tomorrow 10:00 AM", "Pending review", "Deposit pending"],
    ["Ana Cruz", "Neurotoxin (Face)", "Makati", "Thu 3:00 PM", "Needs more information", "Unpaid"],
    ["Carla Tan", "3-in-1 Scar Treatment", "Ortigas", "Fri 6:30 PM", "Confirmed", "Paid"],
  ];

  return (
    <PageShell>
      <section className="px-5 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Doctor/Admin dashboard"
            title="Manage appointments, patients, intake, messages, and aftercare."
            text="This preview shows the operational structure the doctor needs before the database and authentication layer are connected."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ["Today's appointments", "3"],
              ["Medical intake reviews", "2"],
              ["Messages needing reply", "4"],
              ["Payments pending", "2"],
            ].map(([label, value]) => (
              <div key={label} className="card p-5">
                <p className="text-sm text-[#6F6F6F]">{label}</p>
                <p className="mt-3 font-serif text-4xl text-[#1F1F1F]">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-5">
            {appointments.map(([patient, treatment, location, time, intake, payment]) => (
              <article key={`${patient}-${time}`} className="card p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr_auto] lg:items-center">
                  <div>
                    <p className="font-serif text-2xl text-[#1F1F1F]">{patient}</p>
                    <p className="mt-1 text-sm text-[#6F6F6F]">{treatment}</p>
                  </div>
                  <div className="text-sm text-[#4D4D4D]">
                    <p>{location}</p>
                    <p>{time}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge>{intake}</StatusBadge>
                    <StatusBadge>{payment}</StatusBadge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-secondary">View Patient</button>
                    <button className="btn btn-primary">Message</button>
                  </div>
                </div>
              </article>
            ))}
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
                src="/betterself-logo.jpg"
                alt="BetterSelf medical aesthetic brand"
                fill
                sizes="(min-width: 1024px) 420px, 90vw"
                className="object-cover"
              />
            </div>
            <div className="mt-5 grid gap-3">
              <StatusBadge>Doctor-led</StatusBadge>
              <StatusBadge>Medical license placeholder</StatusBadge>
              <StatusBadge>Aesthetic care specialization placeholder</StatusBadge>
            </div>
          </div>
          <div>
            <Badge>Meet your doctor</Badge>
            <h1 className="mt-5 font-serif text-5xl leading-tight text-[#1F1F1F] md:text-6xl">
              Private aesthetic care, guided by a licensed medical doctor.
            </h1>
            <div className="mt-6 grid gap-5 text-base leading-8 text-[#6F6F6F]">
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
              <p className="mt-3 text-sm leading-6 text-[#6F6F6F]">{answer}</p>
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
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#6F6F6F]">
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
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6F6F6F]">
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
        <SectionHeading eyebrow={eyebrow} title={title} text={text} />
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
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#7A746E]">
                0{index + 1}
              </p>
              <h3 className="mt-2 font-serif text-2xl text-[#1F1F1F]">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#6F6F6F]">{step.text}</p>
            </article>
          ))}
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
              <p className="mt-3 text-sm leading-6 text-[#6F6F6F]">{text}</p>
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
          <div className="relative aspect-square overflow-hidden rounded-lg bg-[#F1ECE4]">
            <Image
              src="/betterself-logo.jpg"
              alt="BetterSelf doctor-led aesthetic care"
              fill
              sizes="(min-width: 1024px) 360px, 90vw"
              className="object-cover"
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
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.8fr]">
        <SectionHeading
          eyebrow="Safety comes first"
          title="Aesthetic treatments are medical procedures."
          text="BetterSelf follows a structured process that includes medical intake, doctor assessment, consent, treatment documentation, and aftercare instructions."
        />
        <section className="card p-6">
          <SafetyChecklist items={safetyItems} />
          <Link className="btn btn-secondary mt-6" href="/safety">
            Read Our Safety Protocol
          </Link>
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
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6F6F6F]">
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

function DiscountsSection() {
  return (
    <section className="border-t border-[#E6DFD5] bg-[#FAF8F4] px-5 py-14 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Employee and referral benefits"
          title="Discounts are presented quietly and clinically."
          text="The platform can support office, Regenezys employee, medical team, and referral discounts without making the core brand feel promo-heavy."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {discountTiers.map((group) => (
            <article key={group.category} className="card p-5">
              <h3 className="font-serif text-2xl text-[#1F1F1F]">{group.category}</h3>
              <div className="mt-4 grid gap-3">
                {group.tiers.map((tier) => (
                  <div key={tier.name} className="flex justify-between gap-4 text-sm">
                    <span className="text-[#6F6F6F]">{tier.name}</span>
                    <span className="font-semibold text-[#1F1F1F]">{tier.discount}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {referralPromos.map((promo) => (
            <article key={promo.title} className="card p-5">
              <h3 className="font-serif text-2xl text-[#1F1F1F]">{promo.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6F6F6F]">{promo.detail}</p>
            </article>
          ))}
        </div>
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
      <span className="text-[#6F6F6F]">{label}</span>
      <span className="text-right font-semibold text-[#1F1F1F]">{value}</span>
    </div>
  );
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function getStaticTreatmentIds() {
  return treatments.map((treatment) => ({ id: treatment.id }));
}

export function getTreatmentOrFirst(id?: string) {
  if (!id) return getTreatmentById(featuredTreatmentIds[0]) ?? treatments[0];
  return getTreatmentById(id) ?? treatments[0];
}
