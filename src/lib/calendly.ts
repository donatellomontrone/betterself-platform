export function buildCalendlySchedulingUrl(
  calendlyUrl: string,
  options: {
    referenceNumber?: string | null;
    source?: string;
  } = {},
) {
  if (!calendlyUrl) return "";

  try {
    const url = new URL(calendlyUrl);
    url.searchParams.set("utm_source", "betterself");
    url.searchParams.set("utm_medium", options.source ?? "patient_dashboard");
    url.searchParams.set("utm_campaign", "doctor_consultation");

    if (options.referenceNumber) {
      url.searchParams.set("utm_content", options.referenceNumber);
      // Calendly custom-answer prefill. If the event has a first custom question
      // for "BetterSelf booking reference", this makes the reference visible too.
      url.searchParams.set("a1", options.referenceNumber);
    }

    return url.toString();
  } catch {
    return calendlyUrl;
  }
}
