import Link from "next/link";
import { PageShell } from "@/components/site-shell";
import { SUPPORT_EMAIL } from "@/lib/contact";

/**
 * Plain-language legal pages for a PH home-visit medical aesthetics service.
 * Keep LAST_UPDATED current when revised and have final operating details reviewed
 * by local legal/medical counsel before accepting real patients.
 */

const LAST_UPDATED = "25 June 2026";
const LEGAL_ENTITY_NAME = "BetterSelf Home Aesthetics";
const REGISTERED_ADDRESS = "Metro Manila, Philippines";
const DPO_EMAIL = SUPPORT_EMAIL;

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
          <p className="text-sm text-[#6E565A]">Last updated: {LAST_UPDATED}</p>
          <div className="mt-6 grid gap-8">{children}</div>
          <p className="mt-10 text-sm leading-6 text-[#595550]">
            Questions about this document? Visit our{" "}
            <Link className="font-semibold text-[#6E444E] underline" href="/contact">
              contact page
            </Link>{" "}
            or email{" "}
            <a className="font-semibold text-[#6E444E] underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
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
      intro="How BetterSelf collects, uses, shares, and protects your personal and health information, in line with the Philippine Data Privacy Act of 2012 (RA 10173) and its IRR."
    >
      <Clause title="Who we are & how to contact us">
        <p>
          BetterSelf provides doctor-led aesthetic treatments delivered at home in Metro
          Manila. The personal information controller is{" "}
          <strong>{LEGAL_ENTITY_NAME}</strong>, with service address at{" "}
          <strong>{REGISTERED_ADDRESS}</strong>.
        </p>
        <p>
          For any privacy request or question, contact our Data Protection Officer at{" "}
          <a className="font-semibold text-[#6E444E] underline" href={`mailto:${DPO_EMAIL}`}>
            {DPO_EMAIL}
          </a>
          .
        </p>
      </Clause>
      <Clause title="Information we collect">
        <p>
          Account details (name, email, phone); booking details (the treatment you choose,
          your home-visit address, and appointment schedule); health information from your
          medical-intake answers and your consent records; messages you send us; and the
          status of your payments. Payments are made via QR Ph through our payment partner;
          we never receive or store your full payment or bank details.
        </p>
      </Clause>
      <Clause title="How we use your information & legal basis">
        <p>
          We use it to assess suitability and deliver treatment safely, to schedule and
          confirm appointments, to take payment, to keep medical and aftercare records, and
          to communicate with you about your bookings. Health information is processed for the
          provision of medical care by a licensed professional and on the basis of your
          consent, which you can withdraw at any time.
        </p>
      </Clause>
      <Clause title="AI-assisted treatment suggestions">
        <p>
          If you use the optional &ldquo;describe your concern&rdquo; tool, the text you enter
          may be sent to a third-party AI provider to suggest a possible treatment or a doctor
          consultation. This is not a medical diagnosis, the suggestion is not stored as a
          medical record on its own, and a licensed doctor always makes the final decision.
          Please avoid entering more sensitive detail than necessary, and you can skip the
          tool and book a consultation directly instead.
        </p>
      </Clause>
      <Clause title="Service providers & international transfers">
        <p>
          We share your information with the treating doctor and authorised BetterSelf staff,
          and with the service providers that run our platform — for example our
          authentication, database and hosting, payment, scheduling, mapping, and AI partners —
          under confidentiality obligations and only as needed to provide the service. Some of
          these providers process data outside the Philippines; where that happens we rely on
          appropriate safeguards as required by the Data Privacy Act. We do not sell your
          personal data.
        </p>
      </Clause>
      <Clause title="Cookies & browser storage">
        <p>
          We use essential cookies and similar browser storage for account access, booking,
          payment security, and basic site functionality. Optional cookies (such as analytics)
          are used only after you accept them in the cookie banner. You can change your choice
          by clearing your browser storage for BetterSelf or by contacting us.
        </p>
      </Clause>
      <Clause title="How long we keep it">
        <p>
          Medical records are retained for the period required by Philippine law and
          professional guidelines. Other data is kept only as long as needed for the purposes
          above, then securely deleted or anonymised.
        </p>
      </Clause>
      <Clause title="Your rights">
        <p>
          Under the Data Privacy Act you have the right to be informed, and to access,
          correct, object to the processing of, and request deletion or blocking of your data,
          to data portability, and to withdraw consent (which may affect our ability to
          provide treatment). To exercise any of these, contact our DPO above. You may also
          lodge a complaint with the National Privacy Commission (privacy.gov.ph).
        </p>
      </Clause>
      <Clause title="Messaging is not for emergencies">
        <p>
          The in-app message box and our WhatsApp/email channels are not monitored around the
          clock and are not for medical emergencies. If you experience a severe reaction or
          urgent symptoms, contact your nearest emergency service or doctor immediately.
        </p>
      </Clause>
      <Clause title="Security & changes to this policy">
        <p>
          We use encryption in transit, access controls, and reputable processors to protect
          your information; no system is perfectly secure, but we take reasonable and
          appropriate measures to safeguard health data. We may update this policy from time
          to time; the date above shows the latest version.
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
          BetterSelf lets you request doctor-led aesthetic treatments at home in serviced
          areas of Metro Manila. Every treatment is subject to medical screening and doctor
          confirmation, and may be declined or adjusted on medical grounds.
        </p>
      </Clause>
      <Clause title="Eligibility">
        <p>
          You must be at least 18 years old and provide accurate medical-intake information.
          Treatment may be unsafe or unsuitable for certain conditions; the doctor makes the
          final clinical decision.
        </p>
      </Clause>
      <Clause title="How booking and payment work">
        <p>
          Prices are shown in Philippine Peso and may be starting or unit-based rates.
        </p>
        <p>
          <strong>Treatments:</strong> a booking is a request. You submit it, the doctor
          reviews your suitability, and only if it is confirmed do you pay from your patient
          dashboard before the home visit.
        </p>
        <p>
          <strong>Doctor consultation (₱800):</strong> this is paid up front. Once payment
          clears, you book your consultation call. The consultation fee is separate from any
          later treatment.
        </p>
        <p>
          Payment is processed by our payment partner on a secure hosted page using QR Ph; we
          do not accept card or cash payments online and never see your full payment details.
        </p>
      </Clause>
      <Clause title="Rescheduling, cancellation, and refunds">
        <p>
          If the doctor cannot safely proceed after assessment, you are refunded for the
          treatment. Patient-initiated changes and no-shows may be subject to a fee, and a
          consultation that has already taken place is generally non-refundable. Contact us as
          early as possible to reschedule.
        </p>
      </Clause>
      <Clause title="Home visit conditions">
        <p>
          For your safety, you agree to provide a clean, private, and well-lit space for the
          treatment, and to have a responsible adult present if the doctor advises it.
        </p>
      </Clause>
      <Clause title="Medical disclaimer">
        <p>
          Aesthetic treatments are medical procedures. Results vary between patients and are
          not guaranteed. Information on this site is general and is not a substitute for an
          in-person medical assessment.
        </p>
      </Clause>
      <Clause title="Your responsibilities">
        <p>
          Provide truthful information, follow pre-care and aftercare instructions, ensure a
          safe and private space for the home visit, and tell the doctor immediately about any
          adverse reaction.
        </p>
      </Clause>
      <Clause title="Limitation of liability & governing law">
        <p>
          To the extent permitted by law, BetterSelf is not liable for outcomes arising from
          inaccurate information you provide or failure to follow medical instructions.
          Nothing here excludes liability that cannot be excluded by law. These terms are
          governed by the laws of the Republic of the Philippines.
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
          I understand that aesthetic treatments (such as injectables and skin treatments) are
          medical procedures performed by a licensed doctor, and that a medical assessment is
          required before any treatment is performed.
        </p>
      </Clause>
      <Clause title="Risks and side effects">
        <p>
          I understand that possible side effects include, among others, redness, swelling,
          bruising, tenderness, and—less commonly—infection, asymmetry, or allergic reaction,
          and that the doctor will discuss risks relevant to my treatment.
        </p>
      </Clause>
      <Clause title="No guarantee of results">
        <p>
          I understand that results vary between individuals, that more than one session may be
          needed, and that outcomes cannot be guaranteed.
        </p>
      </Clause>
      <Clause title="Accurate information">
        <p>
          I confirm that the medical information I provide is accurate and complete, including
          pregnancy or breastfeeding, allergies, medication, and medical conditions, and I
          understand that withholding information can be dangerous.
        </p>
      </Clause>
      <Clause title="Home environment">
        <p>
          I understand the treatment is performed at the home address I provide, and I will
          make available a clean, private, and well-lit space suitable for a medical procedure.
        </p>
      </Clause>
      <Clause title="Photographs (optional)">
        <p>
          If I agree separately, the doctor may take clinical photographs for my medical record
          and treatment planning. I can decline photographs without affecting my care.
        </p>
      </Clause>
      <Clause title="Voluntary consent">
        <p>
          My consent is voluntary, I have had the opportunity to ask questions, and I may
          withdraw consent at any time before the procedure begins.
        </p>
      </Clause>
    </LegalDoc>
  );
}
