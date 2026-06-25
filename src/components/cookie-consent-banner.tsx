"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "betterself_cookie_consent_v1";
const CONSENT_EVENT = "betterself-cookie-consent";

type CookieChoice = "accepted" | "essential";

export function CookieConsentBanner() {
  const isVisible = useSyncExternalStore(
    subscribeToConsentChanges,
    getCookieConsentSnapshot,
    getServerCookieConsentSnapshot,
  );

  function saveChoice(choice: CookieChoice) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        choice,
        savedAt: new Date().toISOString(),
      }),
    );
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  if (!isVisible) {
    return null;
  }

  return (
    <section
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-5xl rounded-lg border border-[#E6DFD5] bg-white p-4 shadow-2xl md:bottom-4 md:p-5"
    >
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8F5B67]">
            Cookie consent
          </p>
          <p className="mt-2 text-sm leading-6 text-[#4A4641]">
            BetterSelf uses essential cookies for account access, booking,
            payments, and site security. Optional cookies are used only after
            you accept them. Read our{" "}
            <Link className="font-bold text-[#6E444E] underline" href="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
          <button
            className="btn btn-secondary justify-center"
            type="button"
            onClick={() => saveChoice("essential")}
          >
            Essential only
          </button>
          <button
            className="btn btn-primary justify-center"
            type="button"
            onClick={() => saveChoice("accepted")}
          >
            Accept cookies
          </button>
        </div>
      </div>
    </section>
  );
}

function subscribeToConsentChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CONSENT_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CONSENT_EVENT, onStoreChange);
  };
}

function getCookieConsentSnapshot() {
  return !window.localStorage.getItem(STORAGE_KEY);
}

function getServerCookieConsentSnapshot() {
  return false;
}
