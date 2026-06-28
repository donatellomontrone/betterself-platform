"use client";

import { useEffect, useRef, useState } from "react";
import { useOptionalCookiesAccepted } from "@/components/cookie-consent-banner";

/**
 * Google Places address search, restricted to Metro Manila.
 *
 * Uses the new Places UI Kit (`PlaceAutocompleteElement`) — the legacy
 * `Autocomplete` widget is no longer available to new Google projects.
 *
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (Places API (New) enabled + billing).
 * If the key is absent, it falls back to a plain text input so the booking form
 * keeps working.
 */

declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary?: (name: string) => Promise<Record<string, unknown>>;
      };
    };
  }
}

// Approximate bounding box of Metro Manila / NCR.
const METRO_MANILA_BOUNDS = {
  north: 14.78,
  south: 14.34,
  east: 121.15,
  west: 120.9,
};

let mapsPromise: Promise<NonNullable<Window["google"]>["maps"]> | null = null;

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google.maps);
  }
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const callbackName = "__betterselfGmapsInit";
      (window as unknown as Record<string, unknown>)[callbackName] = () =>
        resolve(window.google!.maps);
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey,
      )}&libraries=places&loading=async&callback=${callbackName}`;
      script.async = true;
      script.onerror = () => {
        // Don't cache a rejected promise — otherwise address search stays dead until a
        // full reload even after a transient network failure.
        mapsPromise = null;
        reject(new Error("Google Maps failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return mapsPromise;
}

type AddressAutocompleteProps = {
  value: string;
  onChange: (address: string, isValid: boolean) => void;
};

function isUsableManualAddress(address: string) {
  return address.trim().length >= 8;
}

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const optionalCookiesAccepted = useOptionalCookiesAccepted();
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    // Gate the third-party Google Places embed on optional-cookie consent; the manual
    // address input below always works regardless.
    if (!apiKey || !optionalCookiesAccepted || !containerRef.current) return;
    const host = containerRef.current;
    let element: HTMLElement | null = null;
    let cancelled = false;

    (async () => {
      try {
        const maps = await loadGoogleMaps(apiKey);
        const places = (await maps!.importLibrary!("places")) as {
          PlaceAutocompleteElement: new (options: unknown) => HTMLElement;
        };
        if (cancelled) return;

        element = new places.PlaceAutocompleteElement({
          includedRegionCodes: ["ph"],
          locationRestriction: METRO_MANILA_BOUNDS,
        });
        element.style.width = "100%";
        element.style.display = "block";
        element.style.minHeight = "52px";
        host.replaceChildren(element);
        setReady(true);

        element.addEventListener("gmp-select", async (event: Event) => {
          try {
            const prediction = (event as unknown as { placePrediction?: { toPlace: () => unknown } })
              .placePrediction;
            const place = prediction?.toPlace() as {
              fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
              formattedAddress?: string;
            };
            await place.fetchFields({ fields: ["formattedAddress", "addressComponents"] });
            const address = place.formattedAddress ?? "";
            const inMetroManila = /metro manila|national capital region|,\s*ncr/i.test(address);
            if (!inMetroManila) {
              setError("We currently serve only Metro Manila. Please pick an address there.");
              onChangeRef.current("", false);
              return;
            }
            setError("");
            onChangeRef.current(address, true);
          } catch {
            setError("Could not read that address — please try again.");
            onChangeRef.current("", false);
          }
        });
      } catch {
        if (!cancelled) setError("Address search is unavailable right now.");
      }
    })();

    return () => {
      cancelled = true;
      element?.remove();
    };
  }, [apiKey, optionalCookiesAccepted]);

  // No key configured → plain input so the form still works end to end.
  if (!apiKey) {
    return (
      <input
        className="field mt-2 w-full"
        placeholder="Your full address (Metro Manila)"
        value={value}
        onChange={(event) => {
          const address = event.target.value;
          onChange(address, isUsableManualAddress(address));
        }}
      />
    );
  }

  return (
    <div className="mt-2 grid gap-3">
      <input
        className="field w-full"
        placeholder="Type your full address in Metro Manila"
        value={value}
        onChange={(event) => {
          const address = event.target.value;
          setError("");
          onChange(address, isUsableManualAddress(address));
        }}
      />
      <div className="rounded-lg border border-[#E6DFD5] bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5C574F]">
          Search Google Places (optional)
        </p>
        {optionalCookiesAccepted ? (
          <div ref={containerRef} />
        ) : (
          <p className="text-sm leading-6 text-[#6E565A]">
            Accept optional cookies to enable Google address search. You can still type your
            full address above.
          </p>
        )}
      </div>
      {optionalCookiesAccepted && !ready && !error ? (
        <p className="mt-2 text-xs text-[#6E565A]">Loading address search…</p>
      ) : null}
      {value ? (
        <p className="text-sm text-[#4D4D4D]">Address for this booking: {value}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
