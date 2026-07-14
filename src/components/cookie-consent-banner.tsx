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
      className="cookie-consent fixed inset-x-3 bottom-3 z-50 mx-auto max-w-5xl p-3 md:bottom-4 md:p-4"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center md:gap-4">
        <div>
          <p className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[#8F5B67] sm:block">
            Cookie consent
          </p>
          <p className="text-sm leading-5 text-[#4A4641] sm:mt-2 sm:leading-6">
            <span className="md:hidden">
              We use essential cookies for secure bookings. Optional cookies
              require your permission.{" "}
            </span>
            <span className="hidden md:inline">
              BetterSelf uses essential cookies for account access, booking,
              payments, and site security. Optional cookies are used only after
              you accept them.{" "}
            </span>
            <Link className="font-bold text-[#6E444E] underline" href="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
          <button
            className="cookie-consent-secondary justify-center"
            type="button"
            onClick={() => saveChoice("essential")}
          >
            Essential only
          </button>
          <button
            className="cookie-consent-primary justify-center"
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

function getOptionalCookiesSnapshot() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as { choice?: CookieChoice }).choice === "accepted";
  } catch {
    return false;
  }
}

/**
 * Reactive hook: true once the user has accepted optional cookies. Gate optional
 * third-party embeds (e.g. Google Places search) on this so the stored choice is
 * authoritative, not decorative.
 */
export function useOptionalCookiesAccepted() {
  return useSyncExternalStore(
    subscribeToConsentChanges,
    getOptionalCookiesSnapshot,
    () => false,
  );
}

export function useCookieConsentVisible() {
  return useSyncExternalStore(
    subscribeToConsentChanges,
    getCookieConsentSnapshot,
    getServerCookieConsentSnapshot,
  );
}
