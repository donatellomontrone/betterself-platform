import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  HeartPulse,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Treatment } from "@/lib/treatments";
import { HeaderAuthControls } from "@/components/header-auth";

export const primaryNav = [
  { href: "/treatments", label: "Treatments" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety", label: "Safety" },
  { href: "/about", label: "About" },
];

export const patientNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/booking", label: "Book" },
  { href: "/messages", label: "Messages" },
  { href: "/dashboard#aftercare", label: "Aftercare" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E6DFD5] bg-[#FAF8F4]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link className="flex items-center gap-3" href="/" aria-label="BetterSelf home">
          <Image
            src="/betterself-logo.jpg"
            alt="BetterSelf Home Aesthetics"
            width={56}
            height={56}
            priority
            className="h-14 w-14 rounded-full border border-[#E6DFD5] object-cover"
          />
          <div>
            <p className="font-serif text-2xl leading-none text-[#1F1F1F]">
              BetterSelf
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#7A746E]">
              Home Aesthetics
            </p>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-[#4D4D4D] lg:flex">
          {primaryNav.map((item) => (
            <Link key={item.href} className="transition hover:text-[#1F1F1F]" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <details className="relative md:hidden">
          <summary className="btn btn-secondary list-none">Menu</summary>
          <div className="absolute right-0 top-12 z-40 grid w-56 gap-2 rounded-lg border border-[#E6DFD5] bg-white p-3 shadow-xl">
            {primaryNav.map((item) => (
              <Link key={item.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#4D4D4D]" href={item.href}>
                {item.label}
              </Link>
            ))}
            <HeaderAuthControls variant="mobile" />
          </div>
        </details>
        <div className="hidden items-center gap-3 md:flex">
          <HeaderAuthControls />
          <Link className="btn btn-primary" href="/booking">
            Book Treatment
          </Link>
        </div>
        <Link className="btn btn-primary hidden sm:inline-flex md:hidden" href="/booking">
          Book
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[#E6DFD5] bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr] lg:px-8">
        <div>
          <p className="font-serif text-3xl text-[#1F1F1F]">BetterSelf</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#6F6F6F]">
            Doctor-led aesthetic services. Private home appointments in selected
            Metro Manila areas, subject to medical suitability and availability.
          </p>
          <p className="mt-5 rounded-lg border border-[#DDE8E8] bg-[#EEF5F5] p-4 text-xs leading-5 text-[#566060]">
            BetterSelf provides doctor-led aesthetic services. All treatments are
            subject to medical assessment. Results vary per patient. This website
            is not a substitute for medical advice, diagnosis, or emergency care.
          </p>
        </div>
        <FooterColumn
          title="Platform"
          links={[
            ["Treatments", "/treatments"],
            ["Book Appointment", "/booking"],
            ["Patient Dashboard", "/dashboard"],
            ["Messages", "/messages"],
          ]}
        />
        <FooterColumn
          title="Trust"
          links={[
            ["Safety", "/safety"],
            ["About Doctor", "/about"],
            ["FAQ", "/faq"],
            ["Contact", "/contact"],
          ]}
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7A746E]">
            WhatsApp support
          </p>
          <p className="mt-3 text-sm leading-6 text-[#6F6F6F]">
            WhatsApp support coming soon. For now, the internal doctor-patient
            messaging structure is prepared inside the platform.
          </p>
        </div>
      </div>
      <MobileBottomCta />
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7A746E]">
        {title}
      </p>
      <div className="mt-4 grid gap-3 text-sm text-[#4D4D4D]">
        {links.map(([label, href]) => (
          <Link key={href} className="transition hover:text-[#1F1F1F]" href={href}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function MobileBottomCta() {
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 md:hidden">
      <Link
        className="flex h-12 items-center justify-center rounded-lg bg-[#1F1F1F] px-4 text-sm font-semibold text-white shadow-lg"
        href="/booking"
      >
        Book Treatment
      </Link>
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#FAF8F4] text-[#1F1F1F]">
      <Header />
      {children}
      <Footer />
    </main>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  text,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F] md:text-5xl">
        {title}
      </h2>
      {text ? <p className="mt-4 text-base leading-7 text-[#6F6F6F]">{text}</p> : null}
    </div>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#DDE8E8] bg-[#EEF5F5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#566060]">
      {children}
    </span>
  );
}

export function Notice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#DDE8E8] bg-[#EEF5F5] p-4">
      <p className="text-sm font-semibold text-[#1F1F1F]">{title}</p>
      <div className="mt-2 text-sm leading-6 text-[#566060]">{children}</div>
    </div>
  );
}

export function SafetyChecklist({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item} className="flex gap-3 text-sm leading-6 text-[#4D4D4D]">
          <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#DDE8E8] text-[#4F5B55]">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export function TreatmentCard({ treatment }: { treatment: Treatment }) {
  return (
    <article className="card flex h-full flex-col justify-between p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{treatment.category}</Badge>
          <span className="rounded-full bg-[#F1ECE4] px-3 py-1 text-xs font-semibold text-[#6F6F6F]">
            Doctor assessment required
          </span>
        </div>
        <h3 className="mt-5 font-serif text-3xl leading-tight text-[#1F1F1F]">
          {treatment.name}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#6F6F6F]">{treatment.description}</p>
        {treatment.detailNote ? (
          <p className="mt-2 text-sm italic text-[#7A746E]">{treatment.detailNote}</p>
        ) : null}
      </div>
      <div className="mt-6">
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-[#FAF8F4] p-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A746E]">
              Duration
            </p>
            <p className="mt-1 font-semibold text-[#1F1F1F]">{treatment.duration}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A746E]">
              From
            </p>
            <p className="mt-1 font-semibold text-[#1F1F1F]">{treatment.priceLabel}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link className="btn btn-secondary flex-1" href={`/treatments/${treatment.id}`}>
            View Treatment
          </Link>
          <Link className="btn btn-primary flex-1" href={`/booking?treatment=${treatment.id}`}>
            Book Treatment
          </Link>
        </div>
      </div>
    </article>
  );
}

export function DoctorLedStrip() {
  const items = [
    [Stethoscope, "Doctor-led care", "Treatment is assessed and performed by a licensed doctor."],
    [LockKeyhole, "Private appointments", "Home visits are discreet and scheduled around the patient."],
    [FileText, "Medical intake required", "Eligibility, consent, and aftercare are part of the process."],
    [ShieldCheck, "Safety-first protocol", "Treatments may be declined or redirected when not suitable."],
  ] as const;

  return (
    <section className="border-y border-[#E6DFD5] bg-white px-5 py-8 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
        {items.map(([Icon, title, text]) => (
          <div key={title} className="flex gap-3 rounded-lg bg-[#FAF8F4] p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#DDE8E8] text-[#4F5B55]">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-[#1F1F1F]">{title}</p>
              <p className="mt-1 text-sm leading-5 text-[#6F6F6F]">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BookingPreviewCard() {
  return (
    <div className="card bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Private appointment</p>
          <h3 className="mt-2 font-serif text-3xl text-[#1F1F1F]">
            Treatment booking preview
          </h3>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#DDE8E8] text-[#4F5B55]">
          <CalendarDays className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        {[
          ["Requested treatment", "Home treatment request"],
          ["Appointment type", "Home treatment visit or online doctor review"],
          ["Location", "BGC, Makati, Rockwell, Alabang, Ortigas"],
          ["Status", "Pending doctor review"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#E6DFD5] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A746E]">
              {label}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1F1F1F]">{value}</p>
          </div>
        ))}
      </div>
      <Notice title="Trust line">
        Medical intake required. Doctor assessment before treatment. Private
        home appointments available.
      </Notice>
    </div>
  );
}

export function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-[#EEF5F5] px-3 py-1 text-xs font-semibold text-[#4F5B55]">
      {children}
    </span>
  );
}

export const patientDashboardCards = [
  {
    icon: CalendarDays,
    title: "Upcoming Appointment",
    text: "Skin Booster Treatment with BetterSelf Medical Doctor, tomorrow at 10:00 AM in BGC.",
    status: "Pending doctor review",
  },
  {
    icon: Sparkles,
    title: "Treatment Plan",
    text: "Current concern: skin quality and hydration. Next suggested review after two weeks.",
    status: "Plan draft",
  },
  {
    icon: MessageCircle,
    title: "Messages",
    text: "Doctor requested allergy and medication details before confirming the appointment.",
    status: "Needs reply",
  },
  {
    icon: HeartPulse,
    title: "Aftercare",
    text: "Latest aftercare instructions will appear here after completed treatments.",
    status: "Not yet sent",
  },
];

export function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-semibold text-[#1F1F1F] transition hover:text-[#4F5B55]"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
