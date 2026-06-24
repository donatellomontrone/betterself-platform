"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const STORAGE_KEY = "betterself_account_consent_v1";
const RECORDED_KEY = "betterself_account_consent_recorded_v1";

export function AccountConsentRecorder() {
  const { isLoaded, isSignedIn } = useUser();
  const hasAttemptedSave = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasAttemptedSave.current) {
      return;
    }

    const rawConsent = window.sessionStorage.getItem(STORAGE_KEY);
    if (!rawConsent || window.sessionStorage.getItem(RECORDED_KEY) === rawConsent) {
      return;
    }

    hasAttemptedSave.current = true;

    fetch("/api/account-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: rawConsent,
      keepalive: true,
    })
      .then((response) => {
        if (response.ok) {
          window.sessionStorage.setItem(RECORDED_KEY, rawConsent);
        } else {
          hasAttemptedSave.current = false;
        }
      })
      .catch(() => {
        hasAttemptedSave.current = false;
      });
  }, [isLoaded, isSignedIn]);

  return null;
}
