import Link from "next/link";
import { PageShell } from "@/components/site-shell";

/**
 * Functional legal drafts for a PH home-visit medical aesthetics service.
 * These are starting templates written in plain language — have a Philippine
 * lawyer review and confirm the registered entity, address, and DPO details
 * before relying on them. Update the `updated` date when revised.
 */

const LAST_UPDATED = "24 June 2026";

function LegalDoc({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <PageShell>
      <section className="px-5 py-10 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 font-serif text-5xl leading-tight text-[#1F1F1F] md:text-6xl">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-[#595550]">{intro}</p>
        </div>
      </section>
      <section className="px-5 pb-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-[#5C574F]">Last updated: {LAST_UPDATED}</p>
          <div className="mt-6 grid gap-8">{children}</div>
          <p className="mt-10 text-sm leading-6 text-[#595550]">
            Questions about this document? Visit our{" "}
            <Link className="font-semibold text-[#2F3D36] underline" href="/contact">
              contact page
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}

function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-serif text-2xl text-[#1F1F1F]">{title}</h2>
      <div className="mt-2 grid gap-2 text-sm leading-7 text-[#4A4641]">{children}</div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalDoc
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="How BetterSelf collects, uses, and protects your personal and health information, in line with the Philippine Data Privacy Act of 2012 (RA 10173)."
    >
      <Clause title="Who we are">
        <p>
          BetterSelf provides doctor-led aesthetic treatments delivered at home in
          Metro Manila. For privacy purposes, BetterSelf is the personal information
          controller for the data described below.
        </p>
      </Clause>
      <Clause title="What we collect">
        <p>
          Account details (name, email, phone); booking details (treatment, address
          for home visits, appointment schedule); medical-intake answers and consent
          records; messages you send us; and payment status from our payment
          processor. We do not store your full card details.
        </p>
      </Clause>
      <Clause title="Why we use it">
        <p>
          To assess suitability and deliver treatment safely, schedule and confirm
          appointments, process payments, keep medical and aftercare records, and
          communicate with you about your bookings. Health data is processed for the
          provision of medical care and with your consent.
        </p>
      </Clause>
      <Clause title="Who we share it with">
        <p>
          The treating doctor and authorised BetterSelf staff; service providers that
          run our platform, scheduling, and payments (for example our database host,
          authentication, scheduling, and payment partners), under confidentiality
          obligations. We do not sell your personal data.
        </p>
      </Clause>
      <Clause title="Cookies">
        <p>
          We use essential cookies and similar browser storage for account access,
          booking, payment security, and site functionality. Optional cookies, such
          as analytics or service-improvement cookies, are used only after you accept
          them in the cookie banner. You can change your choice by clearing your
          browser storage for BetterSelf or contacting us for help.
        </p>
      </Clause>
      <Clause title="How long we keep it">
        <p>
          Medical records are retained for the period required by Philippine law and
          professional guidelines. Other data is kept only as long as needed for the
          purposes above, then securely deleted or anonymised.
        </p>
      </Clause>
      <Clause title="Your rights">
        <p>
          Under the Data Privacy Act you may access, correct, object to processing,
          and request deletion of your data, and you may withdraw consent (this may
          affect our ability to provide treatment). You may also lodge a complaint
          with the National Privacy Commission.
        </p>
      </Clause>
      <Clause title="Security">
        <p>
          We use encryption in transit, access controls, and reputable processors to
          protect your information. No system is perfectly secure, but we take
          reasonable and appropriate measures to safeguard health data.
        </p>
      </Clause>
    </LegalDoc>
  );
}

export function TermsPage() {
  return (
    <LegalDoc
      eyebrow="Terms"
      title="Terms of Service"
      intro="The terms that govern your use of BetterSelf and the booking of home-visit aesthetic treatments."
    >
      <Clause title="The service">
        <p>
          BetterSelf lets you request doctor-led aesthetic treatments at home in
          serviced areas of Metro Manila. A booking is a request — every treatment is
          subject to medical screening and doctor confirmation, and may be declined or
          adjusted on medical grounds.
        </p>
      </Clause>
      <Clause title="Eligibility">
        <p>
          You must be at least 18 years old and provide accurate medical-intake
          information. Treatment may be unsafe or unsuitable for certain conditions;
          the doctor makes the final clinical decision.
        </p>
      </Clause>
      <Clause title="Bookings, payments, and consultations">
        <p>
          Prices are shown in Philippine Peso and may be starting or unit-based rates.
          Patients may book a known treatment directly and pay for that treatment,
          or book a paid doctor consultation first when they need help choosing a
          service. The consultation fee is separate from any later treatment booking.
          Payment is processed by our payment partner on a secure hosted page.
        </p>
      </Clause>
      <Clause title="Rescheduling, cancellation, and refunds">
        <p>
          If the doctor cannot safely proceed after assessment, you are refunded for
          the treatment. Patient-initiated changes and no-shows may be subject to a
          fee. Contact us as early as possible to reschedule.
        </p>
      </Clause>
      <Clause title="Medical disclaimer">
        <p>
          Aesthetic treatments are medical procedures. Results vary between patients
          and are not guaranteed. Information on this site is general and is not a
          substitute for an in-person medical assessment.
        </p>
      </Clause>
      <Clause title="Your responsibilities">
        <p>
          Provide truthful information, follow pre-care and aftercare instructions,
          ensure a safe and private space for the home visit, and tell the doctor
          immediately about any adverse reaction.
        </p>
      </Clause>
      <Clause title="Limitation of liability">
        <p>
          To the extent permitted by law, BetterSelf is not liable for outcomes
          arising from inaccurate information you provide or failure to follow medical
          instructions. Nothing here excludes liability that cannot be excluded by
          law.
        </p>
      </Clause>
    </LegalDoc>
  );
}

export function ConsentPage() {
  return (
    <LegalDoc
      eyebrow="Consent"
      title="Informed Consent"
      intro="What you are agreeing to before an aesthetic treatment. You also confirm key points in the booking flow, and the doctor reviews consent in person before treatment."
    >
      <Clause title="Nature of treatment">
        <p>
          I understand that aesthetic treatments (such as injectables and skin
          treatments) are medical procedures performed by a licensed doctor, and that
          a medical assessment is required before any treatment is performed.
        </p>
      </Clause>
      <Clause title="Risks and side effects">
        <p>
          I understand that possible side effects include, among others, redness,
          swelling, bruising, tenderness, and—less commonly—infection, asymmetry, or
          allergic reaction, and that the doctor will discuss risks relevant to my
          treatment.
        </p>
      </Clause>
      <Clause title="No guarantee of results">
        <p>
          I understand that results vary between individuals, that more than one
          session may be needed, and that outcomes cannot be guaranteed.
        </p>
      </Clause>
      <Clause title="Accurate information">
        <p>
          I confirm that the medical information I provide is accurate and complete,
          including pregnancy or breastfeeding, allergies, medication, and medical
          conditions, and I understand that withholding information can be dangerous.
        </p>
      </Clause>
      <Clause title="Voluntary consent">
        <p>
          My consent is voluntary, I have had the opportunity to ask questions, and I
          may withdraw consent at any time before the procedure begins.
        </p>
      </Clause>
    </LegalDoc>
  );
}
