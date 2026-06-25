"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

const consentItems = [
  {
    id: "age",
    label:
      "I confirm that I am at least 18 years old and legally able to create a BetterSelf account.",
  },
  {
    id: "legal",
    label: "I have read and accept the platform Terms, Privacy Policy, and Informed Consent.",
  },
  {
    id: "medical",
    label:
      "I understand that creating an account does not guarantee treatment suitability. Each treatment requires medical intake and doctor assessment.",
  },
  {
    id: "emergency",
    label:
      "I understand BetterSelf is not emergency care and I should seek urgent medical help for emergency symptoms.",
  },
  {
    id: "data",
    label:
      "I consent to BetterSelf processing my account, contact, booking, medical-intake, and consent information to provide doctor-led services.",
  },
] as const;

type ConsentId = (typeof consentItems)[number]["id"];
const CONSENT_VERSION = "account-consent-v1";

export function AccountConsentGate({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState<Record<ConsentId, boolean>>({
    age: false,
    legal: false,
    medical: false,
    emergency: false,
    data: false,
  });
  const [isUnlocked, setIsUnlocked] = useState(false);

  const allAccepted = consentItems.every((item) => checked[item.id]);

  function toggleConsent(id: ConsentId) {
    setChecked((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function unlockAccountCreation() {
    if (!allAccepted) {
      return;
    }

    window.sessionStorage.setItem(
      "betterself_account_consent_v1",
      JSON.stringify({
        consentVersion: CONSENT_VERSION,
        acceptedAt: new Date().toISOString(),
        acceptedItems: consentItems.map((item) => ({
          id: item.id,
          label: item.label,
        })),
      }),
    );
    setIsUnlocked(true);
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <section className="w-full max-w-3xl rounded-lg border border-[#E6DFD5] bg-white p-5 shadow-xl sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8F5B67]">
        Account consent
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-[#1F1F1F] sm:text-5xl">
        Before creating your account
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#5C574F]">
        BetterSelf accounts are used for medical intake, treatment booking,
        payment records, consent, and patient-doctor communication. Please
        confirm the points below before continuing.
      </p>

      <div className="mt-5 grid gap-3">
        {consentItems.map((item) => (
          <label
            key={item.id}
            className="flex gap-3 rounded-lg border border-[#EDE6DC] bg-[#FAF8F4] p-4 text-sm leading-6 text-[#37332F]"
          >
            <input
              className="mt-1 h-4 w-4 accent-[#8F5B67]"
              type="checkbox"
              checked={checked[item.id]}
              onChange={() => toggleConsent(item.id)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-[#ECDCDE] bg-[#F6EDEA] p-4 text-sm leading-6 text-[#4A5A55]">
        Review the full{" "}
        <Link className="font-bold underline" href="/terms">
          Terms
        </Link>
        ,{" "}
        <Link className="font-bold underline" href="/privacy">
          Privacy Policy
        </Link>
        , and{" "}
        <Link className="font-bold underline" href="/consent">
          Informed Consent
        </Link>
        .
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link className="btn btn-secondary justify-center" href="/">
          Back to site
        </Link>
        <button
          className="btn btn-primary justify-center"
          type="button"
          disabled={!allAccepted}
          onClick={unlockAccountCreation}
        >
          Continue to account creation
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#6F6F6F]" aria-live="polite">
        {allAccepted
          ? "All consent points are confirmed."
          : "Tick every consent point to continue."}
      </p>
    </section>
  );
}
