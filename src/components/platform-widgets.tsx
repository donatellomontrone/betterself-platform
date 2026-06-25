"use client";

import Link from "next/link";
import Script from "next/script";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  MapPin,
  MessageCircle,
  Paperclip,
  Send,
  ShieldCheck,
  SquareArrowOutUpRight,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  consultationService,
  getTreatmentById,
  treatments,
} from "@/lib/treatments";
import { Notice, StatusBadge } from "@/components/site-shell";
import { AddressAutocomplete } from "@/components/address-autocomplete";

const directTreatmentAppointment = "Doctor review call";
const consultationAppointment = "Doctor consultation call";
const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() ?? "";

const intakeQuestions = [
  "Are you pregnant or breastfeeding?",
  "Do you have any allergies?",
  "Are you taking any medication?",
  "Do you have any autoimmune condition?",
  "Do you have any bleeding disorder?",
  "Have you had Botox, fillers, or skin boosters before?",
  "Have you had any adverse reaction before?",
];

const consentItems = [
  "I confirm the information provided is accurate.",
  "I understand that care is subject to doctor assessment.",
  "I understand that results vary per patient.",
  "I agree to receive appointment-related messages.",
];

type BookingIntent = "treatment" | "consultation";

type BookingFlowProps = {
  initialTreatmentId?: string;
  prefill?: BookingPrefill;
};

type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
};

export type BookingPrefill = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
};

type CalendlyPayload = {
  event?: {
    uri?: string;
  };
  invitee?: {
    uri?: string;
  };
};

type RecommendationResult = {
  recommendation: {
    recommendedTreatmentId: string;
    confidence: "low" | "medium" | "high";
    reason: string;
    safetyNote: string;
    source: "openai" | "fallback";
  };
  treatment: {
    id: string;
    name: string;
    category: string;
    description: string;
    duration: string;
    priceLabel: string;
  };
  alternatives: {
    id: string;
    name: string;
    priceLabel: string;
  }[];
  message?: string;
};

type CalendlyWidgetOptions = {
  url: string;
  parentElement: HTMLElement;
  prefill?: {
    name?: string;
    email?: string;
    customAnswers?: Record<string, string>;
  };
};

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: CalendlyWidgetOptions) => void;
    };
  }
}

export function BookingFlow({ initialTreatmentId, prefill }: BookingFlowProps) {
  const hasInitialTreatment = Boolean(
    initialTreatmentId && treatments.some((treatment) => treatment.id === initialTreatmentId),
  );
  const [step, setStep] = useState(hasInitialTreatment ? 1 : 0);
  const [bookingIntent, setBookingIntent] = useState<BookingIntent | null>(
    hasInitialTreatment ? "treatment" : null,
  );
  const [treatmentId, setTreatmentId] = useState(
    hasInitialTreatment && initialTreatmentId
      ? initialTreatmentId
      : treatments[0].id,
  );
  const [location, setLocation] = useState(prefill?.address ?? "");
  const [locationValid, setLocationValid] = useState(Boolean(prefill?.address));
  const [patientConcern, setPatientConcern] = useState("");
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [recommendationState, setRecommendationState] = useState<"idle" | "loading" | "error">("idle");
  const [recommendationNote, setRecommendationNote] = useState("");
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: prefill?.name ?? "",
    email: prefill?.email ?? "",
    phone: prefill?.phone ?? "",
    address: "",
    emergencyContact: prefill?.emergencyContact ?? "",
  });
  const [calendlyEventUri, setCalendlyEventUri] = useState("");
  const [calendlyInviteeUri, setCalendlyInviteeUri] = useState("");
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutNote, setCheckoutNote] = useState("");
  const [intake, setIntake] = useState(() => intakeQuestions.map(() => false));
  const [consents, setConsents] = useState(() => consentItems.map(() => false));
  const [triedDetails, setTriedDetails] = useState(false);

  const selectedTreatment = useMemo(
    () => getTreatmentById(treatmentId) ?? treatments[0],
    [treatmentId],
  );

  const isConsultation = bookingIntent === "consultation";
  const isDirectTreatment = bookingIntent === "treatment";
  const selectedService = isConsultation ? consultationService : selectedTreatment;
  const appointmentType = isConsultation
    ? consultationAppointment
    : directTreatmentAppointment;
  const stepLabels = [
    "Path",
    isConsultation ? "Concern" : "Treatment",
    "Your details",
    "Schedule",
    "Review",
  ];
  const progress = ((step + 1) / 5) * 100;
  const scheduleStatus = scheduleConfirmed ? "Calendly appointment selected" : "Not scheduled yet";
  const requiresAddress = isDirectTreatment;
  const allConsented = consents.every(Boolean);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim());
  const phoneValid = customer.phone.replace(/[^\d+]/g, "").length >= 10;

  function updateCustomer(field: keyof CustomerDetails, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function resetScheduleSelection() {
    setCalendlyEventUri("");
    setCalendlyInviteeUri("");
    setScheduleConfirmed(false);
  }

  function isCustomerReady() {
    return Boolean(customer.name.trim()) && emailValid && phoneValid;
  }

  function handleNextStep() {
    setCheckoutNote("");

    if (step === 0 && !bookingIntent) {
      setCheckoutState("error");
      setCheckoutNote("Please choose whether you want to book a treatment or a consultation.");
      return;
    }

    if (step === 1 && isConsultation && patientConcern.trim().length < 8) {
      setCheckoutState("error");
      setCheckoutNote("Please describe what problem you would like to address.");
      return;
    }

    if (step === 2 && requiresAddress && !(location.trim() && locationValid)) {
      setCheckoutState("error");
      setCheckoutNote("Please enter your address in Metro Manila to continue.");
      return;
    }

    if (step === 2 && !isCustomerReady()) {
      setTriedDetails(true);
      setCheckoutState("error");
      setCheckoutNote("Please complete your name, a valid email, and a valid phone number.");
      return;
    }

    if (step === 3 && calendlyUrl && !scheduleConfirmed) {
      setCheckoutState("error");
      setCheckoutNote("Please choose a doctor call before submitting.");
      return;
    }

    setCheckoutState("idle");
    setStep((current) => Math.min(4, current + 1));
  }

  async function requestTreatmentRecommendation() {
    const concern = patientConcern.trim();

    if (concern.length < 8) {
      setRecommendationState("error");
      setRecommendationNote("Write the problem in a little more detail first.");
      return;
    }

    setRecommendationState("loading");
    setRecommendationNote("");
    setRecommendation(null);

    try {
      const response = await fetch("/api/recommend-treatment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concern }),
      });
      const payload = (await response.json()) as RecommendationResult;

      if (!response.ok || !payload.recommendation || !payload.treatment) {
        throw new Error(payload.message ?? "Unable to suggest a treatment right now.");
      }

      setRecommendation(payload);
      setRecommendationState("idle");
    } catch (error) {
      setRecommendationState("error");
      setRecommendationNote(
        error instanceof Error ? error.message : "Unable to suggest a treatment right now.",
      );
    }
  }

  async function submitBookingRequest() {
    setCheckoutState("loading");
    setCheckoutNote("");

    if (!isCustomerReady()) {
      setCheckoutState("error");
      setCheckoutNote("Please add name, email, and phone before submitting.");
      return;
    }

    if (requiresAddress && !(location.trim() && locationValid)) {
      setCheckoutState("error");
      setCheckoutNote("Please enter your address in Metro Manila before submitting.");
      return;
    }

    if (calendlyUrl && !scheduleConfirmed) {
      setCheckoutState("error");
      setCheckoutNote("Please choose a doctor call before submitting.");
      return;
    }

    if (!allConsented) {
      setCheckoutState("error");
      setCheckoutNote("Please tick all the consent boxes before submitting.");
      return;
    }

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingIntent: isConsultation ? "consultation" : "treatment",
          treatmentId: selectedService.id,
          appointmentType,
          location: requiresAddress ? location : "Online consultation",
          calendlyEventUri,
          calendlyInviteeUri,
          patientConcern: patientConcern.trim() || undefined,
          intake: intakeQuestions.filter((_, index) => intake[index]),
          consentConfirmed: allConsented,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            emergencyContact: customer.emergencyContact,
            address: requiresAddress
              ? customer.address
                ? `${location} (${customer.address})`
                : location
              : "Online consultation",
          },
        }),
      });

      const payload = (await response.json()) as {
        dashboardUrl?: string;
        message?: string;
        signInUrl?: string;
      };

      if (response.status === 401 && payload.signInUrl) {
        window.location.href = payload.signInUrl;
        return;
      }

      if (!response.ok || !payload.dashboardUrl) {
        throw new Error(payload.message ?? "Booking request is not available yet.");
      }

      window.location.href = payload.dashboardUrl;
    } catch (error) {
      setCheckoutState("error");
      setCheckoutNote(
        error instanceof Error ? error.message : "Unable to submit this booking right now.",
      );
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="card p-5 md:p-7">
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-[#FAF8F4] px-4 py-3 lg:hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5C574F]">
              {isConsultation ? "Consultation fee" : "Starting price"}
            </p>
            <p className="font-serif text-2xl text-[#1F1F1F]">
              {bookingIntent ? selectedService.priceLabel : "—"}
            </p>
          </div>
          <p className="max-w-[55%] text-right text-xs text-[#595550]">
            {bookingIntent ? selectedService.name : "Choose booking path"}
          </p>
        </div>
        <div className="mb-6">
          <div
            className="h-2 overflow-hidden rounded-full bg-[#F1ECE4]"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={5}
            aria-label={`Booking step ${step + 1} of 5: ${stepLabels[step]}`}
          >
            <div
              className="h-full rounded-full bg-[#3F5249] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#5C574F]">
            <span>
              Step {step + 1} of 5 · {stepLabels[step]}
            </span>
            <span className="font-medium normal-case tracking-normal text-[#5C574F]">
              Payment only after doctor confirmation
            </span>
          </div>
        </div>

        {step === 0 ? (
          <BookingStep
            title="How would you like to book?"
            text="Choose the path that matches the patient. If they already know the treatment, they can request that service. If they are unsure, they can start with a doctor consultation call."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <button
                className={`rounded-lg border p-5 text-left transition ${
                  bookingIntent === "treatment"
                    ? "border-[#1F1F1F] bg-[#FAF8F4]"
                    : "border-[#E6DFD5] bg-white hover:border-[#A8B8A1]"
                }`}
                type="button"
                onClick={() => {
                  setBookingIntent("treatment");
                  setCheckoutNote("");
                  resetScheduleSelection();
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3F5249]">
                  I know what I want
                </p>
                <h2 className="mt-3 font-serif text-3xl text-[#1F1F1F]">
                  Book a treatment
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#595550]">
                  Choose the exact service, complete intake, schedule the doctor
                  review call, then pay from the dashboard after confirmation.
                </p>
                <p className="mt-4 text-sm font-bold text-[#1F1F1F]">
                  Treatment price applies
                </p>
              </button>
              <button
                className={`rounded-lg border p-5 text-left transition ${
                  bookingIntent === "consultation"
                    ? "border-[#1F1F1F] bg-[#FAF8F4]"
                    : "border-[#E6DFD5] bg-white hover:border-[#A8B8A1]"
                }`}
                type="button"
                onClick={() => {
                  setBookingIntent("consultation");
                  setCheckoutNote("");
                  resetScheduleSelection();
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3F5249]">
                  I need guidance
                </p>
                <h2 className="mt-3 font-serif text-3xl text-[#1F1F1F]">
                  Book a consultation
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#595550]">
                  Talk with the doctor first, discuss goals and suitability, then
                  decide the right treatment later.
                </p>
                <p className="mt-4 text-sm font-bold text-[#1F1F1F]">
                  {consultationService.priceLabel}
                </p>
              </button>
            </div>
            {checkoutNote ? (
              <p className="mt-4 text-sm font-medium text-[#B42318]" role="alert">
                {checkoutNote}
              </p>
            ) : null}
          </BookingStep>
        ) : null}

        {step === 1 && isDirectTreatment ? (
          <BookingStep title="Select treatment to book" text="Choose the treatment you want to book directly. The doctor still reviews suitability before confirming or performing it.">
            <div className="grid gap-3 md:grid-cols-2">
              {treatments.map((treatment) => (
                <button
                  key={treatment.id}
                  className={`rounded-lg border p-4 text-left transition ${
                    treatmentId === treatment.id
                      ? "border-[#1F1F1F] bg-[#FAF8F4]"
                      : "border-[#E6DFD5] bg-white hover:border-[#A8B8A1]"
                  }`}
                  onClick={() => {
                    setTreatmentId(treatment.id);
                    resetScheduleSelection();
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5C574F]">
                    {treatment.category}
                  </p>
                  <p className="mt-2 font-serif text-2xl text-[#1F1F1F]">
                    {treatment.name}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#4D4D4D]">
                    {treatment.priceLabel}
                  </p>
                </button>
              ))}
            </div>
          </BookingStep>
        ) : null}

        {step === 1 && isConsultation ? (
          <BookingStep
            title="What problem would you like to address?"
            text="Describe the patient concern in their own words. BetterSelf can suggest the closest treatment option, while the doctor still confirms suitability."
          >
            <div className="rounded-lg border border-[#E6DFD5] bg-[#FAF8F4] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3F5249]">
                Consultation request
              </p>
              <p className="mt-2 font-serif text-4xl text-[#1F1F1F]">
                {consultationService.priceLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#595550]">
                The doctor call happens first. Any payment or next step appears
                in the patient dashboard after BetterSelf confirms it.
              </p>
            </div>
            <label className="mt-5 grid gap-2 text-sm font-semibold text-[#1F1F1F]">
              <span>
                What problem would you like to address? <span className="text-[#B42318]">*</span>
              </span>
              <textarea
                className="field min-h-32 py-3"
                placeholder="Example: I have acne scars on my cheeks, visible pores, underarm sweating, jawline bulk, keloids, warts, or under-eye tiredness."
                value={patientConcern}
                onChange={(event) => {
                  setPatientConcern(event.target.value);
                  setRecommendation(null);
                  setRecommendationNote("");
                  setCheckoutNote("");
                }}
              />
            </label>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                className="btn btn-secondary justify-center"
                type="button"
                disabled={recommendationState === "loading"}
                onClick={requestTreatmentRecommendation}
              >
                <WandSparkles className="h-4 w-4" />
                {recommendationState === "loading" ? "Finding match..." : "Suggest matching treatment"}
              </button>
              <p className="text-xs leading-5 text-[#5C574F]">
                This is guidance only. The doctor still reviews safety, suitability, and final plan.
              </p>
            </div>
            {recommendationNote ? (
              <p className="mt-3 text-sm font-medium text-[#B42318]" role="alert">
                {recommendationNote}
              </p>
            ) : null}
            {recommendation ? (
              <div className="mt-5 rounded-lg border border-[#DDE8E8] bg-[#EEF5F5] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3F5249]">
                      Suggested match
                    </p>
                    <h2 className="mt-2 font-serif text-3xl text-[#1F1F1F]">
                      {recommendation.treatment.name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[#4D4D4D]">
                      {recommendation.treatment.priceLabel}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#3F5249]">
                    {recommendation.recommendation.confidence} confidence
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#4D4D4D]">
                  {recommendation.recommendation.reason}
                </p>
                <p className="mt-3 rounded-lg bg-white p-3 text-xs leading-5 text-[#5C574F]">
                  {recommendation.recommendation.safetyNote}
                </p>
                {recommendation.alternatives.length ? (
                  <p className="mt-3 text-xs text-[#5C574F]">
                    Other possible options:{" "}
                    {recommendation.alternatives
                      .map((alternative) => alternative.name)
                      .join(", ")}
                  </p>
                ) : null}
                {recommendation.treatment.id !== consultationService.id ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      className="btn btn-primary justify-center"
                      type="button"
                      onClick={() => {
                        setBookingIntent("treatment");
                        setTreatmentId(recommendation.treatment.id);
                        setCheckoutNote("");
                        resetScheduleSelection();
                        setStep(1);
                      }}
                    >
                      Book this treatment
                    </button>
                    <button
                      className="btn btn-secondary justify-center"
                      type="button"
                      onClick={handleNextStep}
                    >
                      Continue with consultation
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {checkoutNote ? (
              <p className="mt-4 text-sm font-medium text-[#B42318]" role="alert">
                {checkoutNote}
              </p>
            ) : null}
          </BookingStep>
        ) : null}

        {step === 2 ? (
          <BookingStep
            title={isConsultation ? "Patient details for the doctor call" : "Patient details and home address"}
            text={
              isConsultation
                ? "These details pre-fill Calendly for the doctor consultation call."
                : "These details pre-fill Calendly for the doctor review call. Payment happens later from the dashboard after review."
            }
          >
            {requiresAddress ? (
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#1F1F1F]">Home visit address</p>
                <p className="mt-1 text-xs text-[#5C574F]">
                  Start typing and select the address. Home treatments are available in Metro Manila only.
                </p>
                <AddressAutocomplete
                  value={location}
                  onChange={(address, isValid) => {
                    setLocation(address);
                    setLocationValid(isValid);
                  }}
                />
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Full name"
                value={customer.name}
                onChange={(value) => updateCustomer("name", value)}
                placeholder="Patient full name"
                required
                error={triedDetails && !customer.name.trim() ? "Required." : undefined}
              />
              <TextField
                label="Email"
                type="email"
                value={customer.email}
                onChange={(value) => updateCustomer("email", value)}
                placeholder="patient@example.com"
                required
                error={triedDetails && !emailValid ? "Enter a valid email address." : undefined}
              />
              <TextField
                label="Phone number"
                value={customer.phone}
                onChange={(value) => updateCustomer("phone", value)}
                placeholder="+63 9XX XXX XXXX"
                required
                error={triedDetails && !phoneValid ? "Enter a valid phone number." : undefined}
              />
              <TextField
                label="Emergency contact"
                value={customer.emergencyContact}
                onChange={(value) => updateCustomer("emergencyContact", value)}
                placeholder="Name and phone"
              />
              {requiresAddress ? (
                <label className="grid gap-2 text-sm font-semibold text-[#1F1F1F] md:col-span-2">
                  Access notes (optional)
                  <textarea
                    className="field min-h-24"
                    placeholder="Unit / floor, building, landmark, parking or access instructions"
                    value={customer.address}
                    onChange={(event) => updateCustomer("address", event.target.value)}
                  />
                </label>
              ) : null}
            </div>
            <div className="mt-6 grid gap-3">
              {intakeQuestions.map((question, index) => (
                <label key={question} className="flex items-start gap-3 rounded-lg border border-[#E6DFD5] bg-white p-4 text-sm text-[#4D4D4D]">
                  <input
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[#3F5249]"
                    type="checkbox"
                    checked={intake[index]}
                    onChange={(event) =>
                      setIntake((current) =>
                        current.map((value, i) => (i === index ? event.target.checked : value)),
                      )
                    }
                  />
                  <span>{question}</span>
                </label>
              ))}
            </div>
            {isDirectTreatment ? (
              <label className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-[#C8B89F] bg-[#FAF8F4] p-4 text-sm text-[#595550]">
                <Paperclip className="h-4 w-4" />
                Optional photo upload structure
              </label>
            ) : null}
          </BookingStep>
        ) : null}

        {step === 3 ? (
          <BookingStep
            title={isConsultation ? "Choose consultation call time" : "Choose doctor review call time"}
            text={
              isConsultation
                ? "Calendly handles the doctor's consultation availability. After the call, the next step appears in the patient dashboard."
                : "Calendly handles the doctor's review-call availability. The home visit is confirmed only after review and payment from the dashboard."
            }
          >
            <CalendlyScheduler
              customer={customer}
              location={requiresAddress ? location : "Online consultation"}
              treatmentName={selectedService.name}
              onScheduled={(payload) => {
                setCalendlyEventUri(payload.event?.uri ?? "");
                setCalendlyInviteeUri(payload.invitee?.uri ?? "");
                setScheduleConfirmed(true);
              }}
            />
          </BookingStep>
        ) : null}

        {step === 4 ? (
          <BookingStep
            title={isConsultation ? "Review consultation request" : "Review treatment request"}
            text={
              isConsultation
                ? "Submit the consultation request. The doctor call happens first, then payment or next steps are handled from the dashboard."
                : "Submit the treatment request. The doctor reviews the patient first, then the patient pays from the dashboard to confirm the service."
            }
          >
            <div className="rounded-lg border border-[#E6DFD5] bg-[#FAF8F4] p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#1F1F1F]">
                <ShieldCheck className="h-4 w-4 text-[#3F5249]" />
                Doctor review before payment
              </p>
              <p className="mt-2 text-sm leading-6 text-[#595550]">
                {isConsultation
                  ? "You will not pay at this step. BetterSelf confirms the doctor call first."
                  : "You will not pay at this step. After the doctor call, the dashboard will show Pay now when the service is ready to confirm."}
              </p>
            </div>
            <div className="mt-6 rounded-lg border border-[#E6DFD5] p-4">
              <p className="text-sm font-semibold text-[#1F1F1F]">Consent required</p>
              <div className="mt-3 grid gap-3">
                {consentItems.map((item, index) => (
                  <label key={item} className="flex items-start gap-3 text-sm text-[#4D4D4D]">
                    <input
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[#3F5249]"
                      type="checkbox"
                      checked={consents[index]}
                      onChange={(event) =>
                        setConsents((current) =>
                          current.map((value, i) => (i === index ? event.target.checked : value)),
                        )
                      }
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              className="btn btn-primary mt-6 h-12 w-full justify-center"
              disabled={checkoutState === "loading" || !allConsented}
              onClick={submitBookingRequest}
            >
              <Check className="h-4 w-4" />
              {checkoutState === "loading"
                ? "Submitting request..."
                : isConsultation
                  ? "Submit consultation request"
                  : "Submit treatment request"}
            </button>
            <p className="mt-3 text-center text-xs text-[#5C574F]">
              Payment opens from the dashboard after the doctor review/call.
            </p>
            {checkoutNote ? (
              <p className="mt-3 text-sm font-medium text-[#B42318]" role="alert" aria-live="polite">
                {checkoutNote}
              </p>
            ) : null}
          </BookingStep>
        ) : null}

        <div className="mt-8 flex justify-between gap-3">
          <button
            className="btn btn-secondary"
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          {step < 4 ? (
            <button
              className="btn btn-primary"
              onClick={handleNextStep}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <section className="card p-5">
          <p className="eyebrow">Booking summary</p>
          <h2 className="mt-3 font-serif text-3xl text-[#1F1F1F]">
            {bookingIntent ? selectedService.name : "Choose a path"}
          </h2>
          <div className="mt-5 grid gap-3 text-sm">
            <SummaryRow
              label={isConsultation ? "Consultation" : "Treatment"}
              value={bookingIntent ? selectedService.priceLabel : "Select a path"}
            />
            <SummaryRow label="Appointment" value={appointmentType} />
            <SummaryRow
              label="Location"
              value={
                requiresAddress ? location || "Add your address" : "Online consultation"
              }
            />
            <SummaryRow label="Calendar" value={scheduleStatus} />
            <SummaryRow label="Payment" value="After doctor confirmation" />
          </div>
          <div className="mt-5 rounded-lg bg-[#FAF8F4] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5C574F]">
              {isConsultation ? "Consultation fee" : "Starting price"}
            </p>
            <p className="mt-1 font-serif text-3xl text-[#1F1F1F]">
              {bookingIntent ? selectedService.priceLabel : "—"}
            </p>
            {!isConsultation && bookingIntent ? (
              <p className="mt-2 text-xs leading-5 text-[#595550]">
                Final amount depends on the units/areas the doctor assesses. No
                charge until your booking is confirmed.
              </p>
            ) : null}
          </div>
        </section>
        <Notice title="Booking disclaimer">
          {isConsultation
            ? "The consultation helps the doctor guide treatment options. Any payment or later procedure is handled from the dashboard after confirmation."
            : "Your treatment request requires doctor review before payment and home-visit confirmation. Suitability, treatment plan, and expected outcomes depend on individual medical assessment."}
        </Notice>
      </aside>
    </div>
  );
}

function CalendlyScheduler({
  customer,
  location,
  treatmentName,
  onScheduled,
}: {
  customer: CustomerDetails;
  location: string;
  treatmentName: string;
  onScheduled: (payload: CalendlyPayload) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [manualConfirmation, setManualConfirmation] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://calendly.com") {
        return;
      }

      const data = event.data as { event?: string; payload?: CalendlyPayload };

      if (data.event === "calendly.event_scheduled") {
        onScheduled(data.payload ?? {});
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onScheduled]);

  useEffect(() => {
    if (!calendlyUrl || !scriptReady || !containerRef.current || !window.Calendly) {
      return;
    }

    containerRef.current.innerHTML = "";
    window.Calendly.initInlineWidget({
      url: calendlyUrl,
      parentElement: containerRef.current,
      prefill: {
        name: customer.name,
        email: customer.email,
        customAnswers: {
          a1: treatmentName,
          a2: location,
          a3: customer.phone,
          a4: customer.address,
        },
      },
    });
  }, [customer.address, customer.email, customer.name, customer.phone, location, scriptReady, treatmentName]);

  if (!calendlyUrl) {
    return (
      <div className="rounded-lg border border-[#E6DFD5] bg-[#FAF8F4] p-5">
        <p className="text-sm font-semibold text-[#1F1F1F]">Calendly is ready to connect</p>
        <p className="mt-2 text-sm leading-6 text-[#595550]">
          Add <span className="font-semibold text-[#1F1F1F]">NEXT_PUBLIC_CALENDLY_URL</span> in
          Vercel with the BetterSelf event link. The calendar will appear here after redeploy.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-[#E6DFD5] bg-[#FAF8F4] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#1F1F1F]">BetterSelf Calendly</p>
          <p className="mt-1 text-sm text-[#595550]">
            If the embedded calendar is blocked, open Calendly in a new tab.
          </p>
        </div>
        <a className="btn btn-secondary" href={calendlyUrl} rel="noreferrer" target="_blank">
          <SquareArrowOutUpRight className="h-4 w-4" />
          Open Calendly
        </a>
      </div>
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="min-h-[720px] overflow-hidden rounded-lg border border-[#E6DFD5] bg-white" />
      <button
        className={`rounded-lg border p-4 text-left text-sm font-semibold ${
          manualConfirmation ? "border-[#1F1F1F] bg-[#FAF8F4]" : "border-[#E6DFD5] bg-white"
        }`}
        onClick={() => {
          setManualConfirmation(true);
          onScheduled({});
        }}
      >
        I scheduled the doctor call and want to continue
      </button>
    </div>
  );
}

function BookingStep({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-serif text-4xl leading-tight text-[#1F1F1F]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#595550]">{text}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#1F1F1F]">
      <span>
        {label}
        {required ? <span className="text-[#B42318]"> *</span> : null}
      </span>
      <input
        className="field"
        style={error ? { borderColor: "#B42318" } : undefined}
        aria-invalid={error ? true : undefined}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <span className="text-xs font-medium text-[#B42318]">{error}</span>
      ) : null}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#E6DFD5] pb-3 last:border-0 last:pb-0">
      <span className="text-[#595550]">{label}</span>
      <span className="text-right font-semibold text-[#1F1F1F]">{value}</span>
    </div>
  );
}

type ChatMessage = {
  sender: "doctor" | "patient" | "system";
  text: string;
  time: string;
};

const seedMessages: ChatMessage[] = [
  {
    sender: "system",
    text: "This is your private channel with the BetterSelf medical team. Send a message and a doctor will reply here before your appointment.",
    time: "",
  },
];

export function DoctorChat() {
  const [messages, setMessages] = useState(seedMessages);
  const [draft, setDraft] = useState("");

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      { sender: "patient", text, time: "Now" },
      {
        sender: "system",
        text: "Message sent. A doctor will review and reply here — you'll be notified.",
        time: "Now",
      },
    ]);
    setDraft("");
  }

  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-lg border border-[#E6DFD5] bg-white lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-[#E6DFD5] bg-[#FAF8F4] p-4 lg:border-b-0 lg:border-r">
        <p className="eyebrow">Messages</p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-lg border border-[#A8B8A1] bg-white p-4">
            <p className="font-semibold text-[#1F1F1F]">Your conversation</p>
            <p className="mt-1 text-xs text-[#595550]">
              Private channel with the BetterSelf medical team
            </p>
          </div>
        </div>
        <p className="mt-5 rounded-lg bg-[#EEF5F5] p-3 text-xs leading-5 text-[#566060]">
          WhatsApp support coming soon. Internal messaging is prepared first.
        </p>
      </aside>
      <section className="flex flex-col">
        <div className="flex items-center justify-between border-b border-[#E6DFD5] p-5">
          <div>
            <p className="font-serif text-2xl text-[#1F1F1F]">Doctor Chat</p>
            <p className="mt-1 text-sm text-[#595550]">Response time may vary.</p>
          </div>
          <StatusBadge>Linked to booking</StatusBadge>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <Notice title="Chat disclaimer">
            This chat is not for emergency care. For urgent symptoms or medical
            emergencies, seek immediate medical attention.
          </Notice>
          {messages.map((message, index) => (
            <div
              key={`${message.sender}-${index}`}
              className={`max-w-[78%] rounded-lg p-4 text-sm leading-6 ${
                message.sender === "patient"
                  ? "ml-auto bg-[#1F1F1F] text-white"
                  : message.sender === "doctor"
                    ? "bg-[#EEF5F5] text-[#1F1F1F]"
                    : "mx-auto bg-[#F1ECE4] text-[#595550]"
              }`}
            >
              <p>{message.text}</p>
              <p className="mt-2 text-xs opacity-70">{message.time}</p>
            </div>
          ))}
        </div>
        <form className="flex gap-3 border-t border-[#E6DFD5] p-4" onSubmit={sendMessage}>
          <button
            className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#E6DFD5] text-[#595550]"
            type="button"
            aria-label="Attach photo"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            className="field min-w-0 flex-1"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a message for the doctor"
          />
          <button className="btn btn-primary h-12" type="submit">
            <Send className="h-4 w-4" />
            Send
          </button>
        </form>
      </section>
    </div>
  );
}

export function LoginRegisterPreview() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="card p-7">
        <p className="eyebrow">Patient access</p>
        <h1 className="mt-3 font-serif text-5xl leading-tight text-[#1F1F1F]">
          Sign in to manage private care.
        </h1>
        <p className="mt-4 text-base leading-7 text-[#595550]">
          The first version prepares account access for bookings, intake forms,
          doctor messaging, treatment history, payments, and aftercare.
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-[#1F1F1F]">
            Email
            <input className="field" defaultValue="mia@example.com" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#1F1F1F]">
            Password
            <input className="field" type="password" defaultValue="betterself" />
          </label>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link className="btn btn-primary" href="/dashboard">
            <UserRound className="h-4 w-4" />
            Login as Patient
          </Link>
          <Link className="btn btn-secondary" href="/admin">
            <ShieldCheck className="h-4 w-4" />
            Doctor/Admin Preview
          </Link>
        </div>
      </section>
      <section className="card bg-[#EEF5F5] p-7">
        <p className="eyebrow">Account structure</p>
        <div className="mt-5 grid gap-4">
          {[
            "Patient profile and contact details",
            "Medical intake and consent records",
            "Bookings and payment history",
            "Treatment history and aftercare",
            "Doctor-patient messages and photo uploads",
          ].map((item) => (
            <div key={item} className="flex gap-3 text-sm text-[#4D4D4D]">
              <Check className="mt-0.5 h-4 w-4 text-[#4F5B55]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ConfirmationSummary() {
  return (
    <section className="card p-7">
      <p className="eyebrow">Confirmation page structure</p>
      <h2 className="mt-3 font-serif text-4xl text-[#1F1F1F]">
        Treatment booking request received
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          [CalendarDays, "Date and time", "Selected in Calendly"],
          [MessageCircle, "Doctor", "BetterSelf Medical Doctor"],
          [MapPin, "Address", "BGC, Taguig, Metro Manila"],
          [Check, "Preparation", "Complete intake and avoid active skin irritation."],
        ].map(([Icon, label, value]) => (
          <div key={label as string} className="rounded-lg border border-[#E6DFD5] p-4">
            <Icon className="h-5 w-5 text-[#4F5B55]" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#5C574F]">
              {label as string}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1F1F1F]">{value as string}</p>
          </div>
        ))}
      </div>
      <Link className="btn btn-primary mt-6" href="/messages">
        Chat with doctor
      </Link>
    </section>
  );
}
