"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Paperclip,
  Send,
  ShieldCheck,
  WandSparkles,
} from "lucide-react";
import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import {
  consultationService,
  getTreatmentById,
  treatments,
} from "@/lib/treatments";
import { Notice, StatusBadge } from "@/components/site-shell";
import { useUser } from "@clerk/nextjs";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP } from "@/lib/contact";
import { AddressAutocomplete } from "@/components/address-autocomplete";

const directTreatmentAppointment = "Doctor review call";
const consultationAppointment = "Doctor consultation call";

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
type IntakeAnswer = "yes" | "no" | "not_sure";

type BookingFlowProps = {
  initialTreatmentId?: string;
  startAtDetails?: boolean;
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

type RecommendationResult = {
  recommendation: {
    recommendedTreatmentId: string;
    confidence: "low" | "medium" | "high";
    reason: string;
    safetyNote: string;
    source: "anthropic" | "openai" | "fallback";
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

export function BookingFlow({ initialTreatmentId, startAtDetails = false, prefill }: BookingFlowProps) {
  const { isLoaded, isSignedIn } = useUser();
  const hasInitialTreatment = Boolean(
    initialTreatmentId && treatments.some((treatment) => treatment.id === initialTreatmentId),
  );
  const skipTreatmentSelection = hasInitialTreatment && startAtDetails;
  const firstAvailableStep = skipTreatmentSelection ? 2 : 0;
  const [step, setStep] = useState(skipTreatmentSelection ? 2 : hasInitialTreatment ? 1 : 0);
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
  const [aiMatchingConsent, setAiMatchingConsent] = useState(false);
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
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutNote, setCheckoutNote] = useState("");
  const [intake, setIntake] = useState<Record<string, IntakeAnswer | undefined>>({});
  const [intakeDetails, setIntakeDetails] = useState<Record<string, string>>({});
  const [consents, setConsents] = useState(() => consentItems.map(() => false));
  const [triedDetails, setTriedDetails] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountChecking, setDiscountChecking] = useState(false);
  const [discountInfo, setDiscountInfo] = useState<{
    valid: boolean;
    label?: string;
    kind?: "percent" | "amount";
    value?: number;
    message?: string;
  } | null>(null);

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
  const scheduleStatus = "Doctor arranges after review";
  const requiresAddress = isDirectTreatment;
  const allConsented = consents.every(Boolean);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim());
  const phoneValid = customer.phone.replace(/[^\d+]/g, "").length >= 10;
  const intakeComplete = intakeQuestions.every((question) => Boolean(intake[question]));
  const intakeNeedsDetail = intakeQuestions.some(
    (question) => intake[question] === "yes" && intakeDetails[question]?.trim().length < 2,
  );

  function updateCustomer(field: keyof CustomerDetails, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
    // Clear the bottom error banner as soon as the patient starts correcting.
    if (checkoutState === "error") {
      setCheckoutState("idle");
      setCheckoutNote("");
    }
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

    if (step === 2 && (!intakeComplete || intakeNeedsDetail)) {
      setCheckoutState("error");
      setCheckoutNote(
        "Please answer every medical screening question. Add a short detail for each Yes answer.",
      );
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

    if (!aiMatchingConsent) {
      setRecommendationState("error");
      setRecommendationNote(
        "Please confirm the AI matching consent first, or continue without a suggestion.",
      );
      return;
    }

    setRecommendationState("loading");
    setRecommendationNote("");
    setRecommendation(null);

    try {
      const response = await fetch("/api/recommend-treatment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concern, aiConsent: aiMatchingConsent }),
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

  // Preview only — the server re-validates and applies the discount at checkout.
  async function applyDiscountCode() {
    const code = discountCode.trim();
    if (!code) {
      setDiscountInfo(null);
      return;
    }
    setDiscountChecking(true);
    try {
      const response = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setDiscountInfo(await response.json());
    } catch {
      setDiscountInfo({ valid: false, message: "Couldn't check that code. Please try again." });
    } finally {
      setDiscountChecking(false);
    }
  }

  const consultBasePrice = consultationService.price;
  const consultDiscountAmount =
    isConsultation && discountInfo?.valid
      ? discountInfo.kind === "percent"
        ? Math.round((consultBasePrice * (discountInfo.value ?? 0)) / 100)
        : Math.min(discountInfo.value ?? 0, consultBasePrice)
      : 0;
  const consultTotal = Math.max(0, consultBasePrice - consultDiscountAmount);

  useEffect(() => {
    document.getElementById("booking-step-heading")?.focus();
  }, [step]);

  async function submitBookingRequest() {
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

    try {
      setCheckoutState("loading");
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingIntent: isConsultation ? "consultation" : "treatment",
          treatmentId: selectedService.id,
          appointmentType,
          location: requiresAddress ? location : "Online consultation",
          patientConcern: patientConcern.trim() || undefined,
          intakeAnswers: Object.fromEntries(
            intakeQuestions.map((question) => [
              question,
              { answer: intake[question], detail: intakeDetails[question]?.trim() || undefined },
            ]),
          ),
          discountCode: isConsultation ? discountCode.trim() || undefined : undefined,
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
        checkoutUrl?: string;
        message?: string;
        signInUrl?: string;
      };

      if (response.status === 401 && payload.signInUrl) {
        window.location.href = payload.signInUrl;
        return;
      }

      // Consultation → checkoutUrl (pay first); treatment → dashboardUrl (request first).
      const nextUrl = payload.checkoutUrl ?? payload.dashboardUrl;
      if (!response.ok || !nextUrl) {
        throw new Error(payload.message ?? "Booking request is not available yet.");
      }

      window.location.href = nextUrl;
    } catch (error) {
      setCheckoutState("error");
      setCheckoutNote(
        error instanceof Error ? error.message : "Unable to submit this booking right now.",
      );
    }
  }

  return (
    <>
      {isLoaded && !isSignedIn ? (
        <div className="mb-6">
          <Notice title="Sign in to submit your request">
            You can fill this in, but you&apos;ll need a free BetterSelf account to send it —{" "}
            <Link className="font-semibold text-[#6E444E] underline" href="/sign-in?redirect_url=/booking">
              sign in or create one
            </Link>{" "}
            first so you don&apos;t lose your progress.
          </Notice>
        </div>
      ) : null}
      <div className="booking-flow-shell grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
      <section className="booking-main-panel p-5 md:p-7">
        <div className="booking-mobile-summary mb-5 flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
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
            className="booking-progress h-2 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={5}
            aria-label={`Booking step ${step + 1} of 5: ${stepLabels[step]}`}
          >
            <div
              className="booking-progress-fill h-full rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#5C574F]">
            <span>
              Step {step + 1} of 5 · {stepLabels[step]}
            </span>
            <span className="font-medium normal-case tracking-normal text-[#5C574F]">
              {isConsultation
                ? "Consultation is paid up front"
                : "Payment only after doctor confirmation"}
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
                className={`booking-choice-card text-left ${
                  bookingIntent === "treatment"
                    ? "is-selected"
                    : ""
                }`}
                type="button"
                onClick={() => {
                  setBookingIntent("treatment");
                  setCheckoutNote("");
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8F5B67]">
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
                className={`booking-choice-card text-left ${
                  bookingIntent === "consultation"
                    ? "is-selected"
                    : ""
                }`}
                type="button"
                onClick={() => {
                  setBookingIntent("consultation");
                  setCheckoutNote("");
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8F5B67]">
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
                  className={`booking-treatment-card text-left ${
                    treatmentId === treatment.id
                      ? "is-selected"
                      : ""
                  }`}
                  onClick={() => {
                    setTreatmentId(treatment.id);
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
            text="Tell us what you'd like to address, in your own words. BetterSelf can suggest the closest treatment option, and the doctor still confirms suitability."
          >
            <div className="booking-soft-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8F5B67]">
                Consultation request
              </p>
              <p className="mt-2 font-serif text-4xl text-[#1F1F1F]">
                {consultationService.priceLabel}
              </p>
                <p className="mt-2 text-sm leading-6 text-[#595550]">
                  Pay the consultation fee now, then choose your doctor call time
                  immediately after PayMongo confirms the payment.
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
				aria-invalid={checkoutState === "error" && patientConcern.trim().length < 8}
				aria-describedby="patient-concern-help"
	                onChange={(event) => {
	                  setPatientConcern(event.target.value);
	                  setRecommendation(null);
	                  setRecommendationNote("");
	                  setCheckoutNote("");
	                }}
			  />
			  <span id="patient-concern-help" className="text-xs font-normal text-[#5C574F]">
			    Please include enough detail for the doctor to understand your concern.
			  </span>
	            </label>
	            <label className="mt-3 flex gap-3 rounded-lg border border-[#E6DFD5] bg-white/70 p-3 text-xs leading-5 text-[#5C574F]">
	              <input
	                className="mt-1 h-4 w-4 accent-[#8F5B67]"
	                type="checkbox"
	                checked={aiMatchingConsent}
	                onChange={(event) => setAiMatchingConsent(event.target.checked)}
	              />
	              <span>
	                I agree that BetterSelf may send this concern text to its AI matching
	                provider to suggest a possible treatment. This is not a diagnosis, and I
	                can skip this and continue with a doctor consultation.
	              </span>
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
              <div className="booking-recommendation-panel mt-5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8F5B67]">
                      Suggested match
                    </p>
                    <h2 className="mt-2 font-serif text-3xl text-[#1F1F1F]">
                      {recommendation.treatment.name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[#4D4D4D]">
                      {recommendation.treatment.priceLabel}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8F5B67]">
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
                        setStep(2);
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
                : "These details create the request for the doctor. Payment happens later from the dashboard after review."
            }
          >
            {requiresAddress ? (
              <div className="mb-6">
                <label htmlFor="home-visit-address" className="text-sm font-semibold text-[#1F1F1F]">Home visit address</label>
                <p id="home-visit-address-help" className="mt-1 text-xs text-[#5C574F]">
                  Start typing and select the address. Home treatments are available in Metro Manila only.
                </p>
                <AddressAutocomplete
                  inputId="home-visit-address"
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
            <fieldset className="mt-6 grid gap-4" aria-describedby="medical-screening-help">
              <legend className="text-sm font-semibold text-[#1F1F1F]">Medical screening</legend>
              <p id="medical-screening-help" className="text-xs leading-5 text-[#5C574F]">
                Answer every question. A Yes response needs a short detail so the doctor can review it safely.
              </p>
              {intakeQuestions.map((question, index) => (
                <div key={question} className="booking-checkbox-row p-4 text-sm text-[#4D4D4D]">
                  <p className="font-medium text-[#1F1F1F]">{question}</p>
                  <div className="mt-3 flex flex-wrap gap-3" role="radiogroup" aria-label={question}>
                    {(["yes", "no", "not_sure"] as IntakeAnswer[]).map((answer) => (
                      <label key={answer} className="inline-flex items-center gap-2">
                        <input
                          className="h-4 w-4 accent-[#8F5B67]"
                          type="radio"
                          name={`intake-${index}`}
                          value={answer}
                          checked={intake[question] === answer}
                          onChange={() => setIntake((current) => ({ ...current, [question]: answer }))}
                        />
                        <span>{answer === "not_sure" ? "Not sure" : answer[0].toUpperCase() + answer.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                  {intake[question] === "yes" ? (
                    <textarea
                      className="field mt-3 min-h-20 w-full"
                      value={intakeDetails[question] ?? ""}
                      placeholder="Please share relevant details for the doctor."
                      onChange={(event) => setIntakeDetails((current) => ({ ...current, [question]: event.target.value }))}
                    />
                  ) : null}
                </div>
              ))}
            </fieldset>
          </BookingStep>
        ) : null}

        {step === 3 ? (
          <BookingStep
            title={isConsultation ? "Booking your consultation" : "Doctor review before payment"}
            text={
              isConsultation
                ? "You'll pay the consultation fee on the next step. Once it clears, you'll get the link to pick your call time straight away."
                : "Submit the request first. The doctor will review your intake, contact you for a call if needed, then unlock payment from your dashboard."
            }
          >
            {isConsultation ? (
              <div className="booking-soft-panel p-5">
                <p className="text-sm font-semibold text-[#1F1F1F]">Pay first, then pick your time</p>
                <p className="mt-2 text-sm leading-6 text-[#595550]">
                  Your ₱800 consultation is booked once payment clears. You&apos;ll get the
                  scheduling link to choose your call time immediately after paying.
                </p>
              </div>
            ) : (
              <div className="booking-soft-panel p-5">
                <p className="text-sm font-semibold text-[#1F1F1F]">
                  No payment and no home visit confirmation yet
                </p>
                <p className="mt-2 text-sm leading-6 text-[#595550]">
                  This creates the clinical request in BetterSelf. The doctor sees your intake
                  in the admin workspace, can message or call you, and then confirms the final
                  treatment plan and amount. Your dashboard will show Pay now only after that.
                </p>
              </div>
            )}
          </BookingStep>
        ) : null}

        {step === 4 ? (
          <BookingStep
            title={isConsultation ? "Review & pay for your consultation" : "Review treatment request"}
            text={
              isConsultation
                ? "Review your details, then pay the ₱800 consultation fee to book your call."
                : "Submit the treatment request. The doctor reviews you first, then you pay from the dashboard to confirm the service."
            }
          >
            <div className="booking-soft-panel p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#1F1F1F]">
                <ShieldCheck className="h-4 w-4 text-[#8F5B67]" />
                {isConsultation ? "Secure payment via PayMongo" : "Doctor review before payment"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#595550]">
                {isConsultation
                  ? "You'll pay the ₱800 consultation fee now via QR Ph. Your call is booked as soon as payment clears, and you'll pick your time right after."
                  : "You will not pay at this step. After the doctor call, the dashboard will show Pay now when the service is ready to confirm."}
              </p>
            </div>
            <div className="booking-soft-panel mt-6 p-4">
              <p className="text-sm font-semibold text-[#1F1F1F]">Consent required</p>
              <div className="mt-3 grid gap-3">
                {consentItems.map((item, index) => (
                  <label key={item} className="flex items-start gap-3 text-sm text-[#4D4D4D]">
                    <input
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[#8F5B67]"
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
            {isConsultation ? (
              <div className="booking-soft-panel mt-6 p-4">
                <p className="text-sm font-semibold text-[#1F1F1F]">Discount code</p>
                <div className="mt-3 flex gap-2">
                  <input
                    className="field h-11 flex-1 text-sm uppercase"
                    type="text"
                    value={discountCode}
                    placeholder="Have a code? (optional)"
                    aria-label="Discount code"
                    autoCapitalize="characters"
                    autoComplete="off"
                    onChange={(event) => {
                      setDiscountCode(event.target.value);
                      setDiscountInfo(null);
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary h-11"
                    disabled={discountChecking || !discountCode.trim()}
                    onClick={applyDiscountCode}
                  >
                    {discountChecking ? "Checking..." : "Apply"}
                  </button>
                </div>
                {discountInfo ? (
                  discountInfo.valid ? (
                    <p className="mt-2 text-sm font-medium text-[#2F5135]">
                      {discountInfo.label} applied — you&apos;ll pay ₱
                      {consultTotal.toLocaleString("en-PH")} (was ₱
                      {consultBasePrice.toLocaleString("en-PH")}).
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-[#9B2C20]">
                      {discountInfo.message ?? "That code isn't valid."}
                    </p>
                  )
                ) : null}
              </div>
            ) : null}
            <button
              className="btn btn-primary mt-6 h-12 w-full justify-center"
              disabled={checkoutState === "loading" || !allConsented}
              onClick={submitBookingRequest}
            >
              {isConsultation ? <CreditCard className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {checkoutState === "loading"
                ? isConsultation
                  ? "Opening secure payment..."
                  : "Submitting request..."
                : isConsultation
                  ? "Continue to secure payment"
                  : "Submit treatment request"}
            </button>
            <p className="mt-3 text-center text-xs text-[#5C574F]">
              {isConsultation
                ? "You'll review the exact amount on PayMongo before paying."
                : "Payment opens from the dashboard after the doctor review/call."}
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
            disabled={step <= firstAvailableStep}
            onClick={() => {
              setCheckoutState("idle");
              setCheckoutNote("");
              setStep((current) => Math.max(firstAvailableStep, current - 1));
            }}
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
        {checkoutNote && step !== 0 && !(step === 1 && isConsultation) && step !== 4 ? (
          <p className="mt-3 text-sm font-medium text-[#B42318]" role="alert" aria-live="polite">
            {checkoutNote}
          </p>
        ) : null}
      </section>

      <aside className="grid content-start gap-4">
        <section className="booking-summary-panel p-5">
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
            <SummaryRow
              label="Calendar"
              value={isConsultation ? "Booked after payment" : scheduleStatus}
            />
            <SummaryRow
              label="Payment"
              value={isConsultation ? "Paid up front" : "After doctor confirmation"}
            />
          </div>
          <div className="booking-total-panel mt-5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5C574F]">
              {isConsultation ? "Consultation fee" : "Starting price"}
            </p>
            <p className="mt-1 font-serif text-3xl text-[#1F1F1F]">
              {isConsultation && discountInfo?.valid ? (
                <>
                  <span className="mr-2 text-xl text-[#9A8F86] line-through">
                    {selectedService.priceLabel}
                  </span>
                  ₱{consultTotal.toLocaleString("en-PH")}
                </>
              ) : bookingIntent ? (
                selectedService.priceLabel
              ) : (
                "—"
              )}
            </p>
            {isConsultation && discountInfo?.valid ? (
              <p className="mt-2 text-xs font-medium text-[#2F5135]">
                {discountInfo.label} applied with {discountCode.trim().toUpperCase()}.
              </p>
            ) : null}
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
            ? "The consultation helps the doctor guide treatment options. You pay the consultation fee now, then pick the call time after PayMongo confirms payment."
            : "Your treatment request requires doctor review before payment and home-visit confirmation. Suitability, treatment plan, and expected outcomes depend on individual medical assessment."}
          </Notice>
      </aside>
      </div>
    </>
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
    <div className="booking-step-content">
      <h2 id="booking-step-heading" tabIndex={-1} className="font-serif text-4xl leading-tight text-[#1F1F1F] outline-none md:text-5xl">{title}</h2>
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
  const errorId = useId();
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
        aria-describedby={error ? errorId : undefined}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <span id={errorId} className="text-xs font-medium text-[#B42318]">
          {error}
        </span>
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

export type ChatMessage = {
  id: string;
  sender: "doctor" | "patient" | "system";
  text: string;
  time: string;
};

type PersistedApiMessage = {
  id: string;
  sender_role: "doctor" | "patient";
  message_text: string;
  created_at: string;
};

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function mapApiMessages(messages: PersistedApiMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    sender: message.sender_role,
    text: message.message_text,
    time: formatChatTime(message.created_at),
  }));
}

function getSystemMessage(): ChatMessage {
  return {
    id: "system-intro",
    sender: "system",
    text: `This is your private message box with the BetterSelf medical team. For the fastest reply, message us on WhatsApp or email ${SUPPORT_EMAIL} — we'll also follow up here about your booking.`,
    time: "",
  };
}

export function DoctorChat({
  initialMessages = [],
  patientId,
  isAdmin = false,
}: {
  initialMessages?: ChatMessage[];
  patientId?: string;
  isAdmin?: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setError("");
    setIsSending(true);
    const optimisticMessage: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      sender: isAdmin ? "doctor" : "patient",
      text,
      time: "Now",
    };
    setMessages((current) => [...current, optimisticMessage]);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, patientId }),
      });
      const payload = (await response.json().catch(() => null)) as {
        messages?: PersistedApiMessage[];
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Message could not be sent.");
      }
      if (payload?.messages) setMessages(mapApiMessages(payload.messages));
      setDraft("");
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setError(sendError instanceof Error ? sendError.message : "Message could not be sent.");
    } finally {
      setIsSending(false);
    }
  }

  const displayMessages = [getSystemMessage(), ...messages];

  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-lg border border-[#E6DFD5] bg-white lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-[#E6DFD5] bg-[#FAF8F4] p-4 lg:border-b-0 lg:border-r">
        <p className="eyebrow">Messages</p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-lg border border-[#CAA6AD] bg-white p-4">
            <p className="font-semibold text-[#1F1F1F]">Your conversation</p>
            <p className="mt-1 text-xs text-[#595550]">
              Private channel with the BetterSelf medical team
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2">
          {SUPPORT_WHATSAPP ? (
            <a
              className="btn btn-primary justify-center"
              href={SUPPORT_WHATSAPP}
              target="_blank"
              rel="noreferrer"
            >
              Message us on WhatsApp
            </a>
          ) : null}
          <a className="btn btn-secondary justify-center" href={`mailto:${SUPPORT_EMAIL}`}>
            Email the team
          </a>
        </div>
      </aside>
      <section className="flex flex-col">
        <div className="flex items-center justify-between border-b border-[#E6DFD5] p-5">
          <div>
            <p className="font-serif text-2xl text-[#1F1F1F]">Doctor Chat</p>
            <p className="mt-1 text-sm text-[#595550]">
              {isAdmin ? "Doctor-side reply thread." : "Response time may vary."}
            </p>
          </div>
          <StatusBadge>Linked to booking</StatusBadge>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <Notice title="Chat disclaimer">
            This chat is not for emergency care. For urgent symptoms or medical
            emergencies, seek immediate medical attention.
          </Notice>
          {displayMessages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[78%] rounded-lg p-4 text-sm leading-6 ${
                message.sender === "patient"
                  ? "ml-auto bg-[#1F1F1F] text-white"
                  : message.sender === "doctor"
                    ? "bg-[#F6EDEA] text-[#1F1F1F]"
                    : "mx-auto bg-[#F1ECE4] text-[#595550]"
              }`}
            >
              <p>{message.text}</p>
              <p className="mt-2 text-xs opacity-90">{message.time}</p>
            </div>
          ))}
          {error ? (
            <p className="rounded-lg border border-[#E0B4B4] bg-[#FFF7F7] p-3 text-sm text-[#8A2F2F]">
              {error}
            </p>
          ) : null}
        </div>
        <form className="flex gap-3 border-t border-[#E6DFD5] p-4" onSubmit={sendMessage}>
          <a
            className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#E6DFD5] text-[#595550] transition hover:border-[#8F5B67] hover:text-[#6E444E]"
            href={SUPPORT_WHATSAPP || `mailto:${SUPPORT_EMAIL}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Send photos to the team on WhatsApp"
            title="Photos can be sent on WhatsApp"
          >
            <Paperclip className="h-4 w-4" />
          </a>
          <input
            className="field min-w-0 flex-1"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={isAdmin ? "Reply to the patient" : "Type a message for the doctor"}
            aria-label={isAdmin ? "Reply to the patient" : "Type a message for the doctor"}
            maxLength={2000}
          />
          <button className="btn btn-primary h-12" type="submit" disabled={isSending}>
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </section>
    </div>
  );
}
