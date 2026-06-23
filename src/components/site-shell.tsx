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
import { MobileBottomCta } from "@/components/mobile-cta";

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
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link className="flex items-center gap-4" href="/" aria-label="BetterSelf home">
          <Image
            src="/betterself-mark.png"
            alt="BetterSelf Home Aesthetics"
            width={96}
            height={96}
            priority
            className="h-16 w-16 rounded-full border border-[#E6DFD5] bg-[#F7EBDD] object-cover shadow-sm sm:h-20 sm:w-20"
          />
          <div>
            <p className="font-serif text-3xl leading-none text-[#1F1F1F] sm:text-4xl">
              BetterSelf
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#5C574F] sm:text-xs">
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
        <details className="relative lg:hidden">
          <summary className="btn btn-secondary list-none cursor-pointer">Menu</summary>
          <div className="absolute right-0 top-12 z-40 grid w-60 gap-2 rounded-lg border border-[#E6DFD5] bg-white p-3 shadow-xl">
            {primaryNav.map((item) => (
              <Link key={item.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#4D4D4D]" href={item.href}>
                {item.label}
              </Link>
            ))}
            <HeaderAuthControls variant="mobile" />
            <Link className="btn btn-primary mt-1 justify-center" href="/booking">
              Book Treatment
            </Link>
          </div>
        </details>
        <div className="hidden items-center gap-3 lg:flex">
          <HeaderAuthControls />
          <Link className="btn btn-primary" href="/booking">
            Book Treatment
          </Link>
        </div>
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
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#595550]">
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
        <FooterContact />
      </div>
      <div className="border-t border-[#E6DFD5]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-xs text-[#5C574F] sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© 2026 BetterSelf. Doctor-led aesthetic care, Metro Manila.</p>
          <div className="flex flex-wrap gap-4">
            <Link className="transition hover:text-[#1F1F1F]" href="/privacy">
              Privacy
            </Link>
            <Link className="transition hover:text-[#1F1F1F]" href="/terms">
              Terms
            </Link>
            <Link className="transition hover:text-[#1F1F1F]" href="/consent">
              Consent
            </Link>
          </div>
        </div>
      </div>
      <MobileBottomCta />
    </footer>
  );
}

function FooterContact() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim();
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim();
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#5C574F]">
        Contact
      </p>
      <div className="mt-4 grid gap-3 text-sm text-[#4D4D4D]">
        {email ? (
          <a className="transition hover:text-[#1F1F1F]" href={`mailto:${email}`}>
            {email}
          </a>
        ) : null}
        {phone ? (
          <a
            className="transition hover:text-[#1F1F1F]"
            href={`tel:${phone.replace(/\s+/g, "")}`}
          >
            {phone}
          </a>
        ) : null}
        {whatsapp ? (
          <a
            className="transition hover:text-[#1F1F1F]"
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        ) : null}
        <Link className="transition hover:text-[#1F1F1F]" href="/contact">
          Contact page
        </Link>
      </div>
    </div>
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
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#5C574F]">
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

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F4] text-[#1F1F1F]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="flex-1 pb-24 md:pb-0">
        {children}
      </main>
      <Footer />
    </div>
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
      {text ? <p className="mt-4 text-base leading-7 text-[#595550]">{text}</p> : null}
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
          <span className="rounded-full bg-[#F1ECE4] px-3 py-1 text-xs font-semibold text-[#595550]">
            Doctor assessment required
          </span>
        </div>
        <h3 className="mt-5 font-serif text-3xl leading-tight text-[#1F1F1F]">
          {treatment.name}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#595550]">{treatment.description}</p>
        {treatment.detailNote ? (
          <p className="mt-2 text-sm italic text-[#5C574F]">{treatment.detailNote}</p>
        ) : null}
      </div>
      <div className="mt-6">
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-[#FAF8F4] p-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5C574F]">
              Duration
            </p>
            <p className="mt-1 font-semibold text-[#1F1F1F]">{treatment.duration}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5C574F]">
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
              <p className="mt-1 text-sm leading-5 text-[#595550]">{text}</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5C574F]">
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

export type StatusTone = "default" | "positive" | "warning" | "danger" | "neutral";

export function StatusBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  const tones: Record<StatusTone, string> = {
    default: "bg-[#EEF5F5] text-[#3F5249]",
    positive: "bg-[#E7F1E9] text-[#2F5135]",
    warning: "bg-[#F6EEDD] text-[#7A5A1E]",
    danger: "bg-[#F7E6E3] text-[#9B2C20]",
    neutral: "bg-[#F1ECE4] text-[#5C574F]",
  };
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}
    >
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
