"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  MapPin,
  MessageCircle,
  Paperclip,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { formatPeso, getTreatmentById, treatments } from "@/lib/treatments";
import { Notice, StatusBadge } from "@/components/site-shell";

const appointmentTypes = ["Home treatment visit", "Online doctor review", "Follow-up review"];
const locations = ["BGC", "Makati", "Rockwell", "Alabang", "Ortigas", "Other Metro Manila area"];
const slots = ["Tomorrow 10:00 AM", "Thu 3:00 PM", "Fri 6:30 PM", "Sat 11:00 AM"];
const paymentModes = ["Deposit payment", "Full payment", "Pay after doctor approval"];

const intakeQuestions = [
  "Are you pregnant or breastfeeding?",
  "Do you have any allergies?",
  "Are you taking any medication?",
  "Do you have any autoimmune condition?",
  "Do you have any bleeding disorder?",
  "Have you had Botox, fillers, or skin boosters before?",
  "Have you had any adverse reaction before?",
];

type BookingFlowProps = {
  initialTreatmentId?: string;
};

export function BookingFlow({ initialTreatmentId }: BookingFlowProps) {
  const [step, setStep] = useState(0);
  const [treatmentId, setTreatmentId] = useState(
    initialTreatmentId && getTreatmentById(initialTreatmentId)
      ? initialTreatmentId
      : treatments[0].id,
  );
  const [appointmentType, setAppointmentType] = useState(appointmentTypes[0]);
  const [location, setLocation] = useState(locations[0]);
  const [slot, setSlot] = useState(slots[0]);
  const [paymentMode, setPaymentMode] = useState(paymentModes[0]);
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutNote, setCheckoutNote] = useState("");

  const selectedTreatment = useMemo(
    () => getTreatmentById(treatmentId) ?? treatments[0],
    [treatmentId],
  );

  const total = selectedTreatment.price + 1500;
  const progress = ((step + 1) / 5) * 100;

  async function startCheckout() {
    setCheckoutState("loading");
    setCheckoutNote("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treatmentId: selectedTreatment.id,
          slot,
          appointmentType,
          customer: {
            name: "Mia Santos",
            email: "mia@example.com",
            phone: "+639171234567",
            address: `${location}, Metro Manila`,
          },
        }),
      });

      const payload = (await response.json()) as {
        checkoutUrl?: string;
        message?: string;
      };

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.message ?? "Checkout is not available yet.");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      setCheckoutState("error");
      setCheckoutNote(
        error instanceof Error ? error.message : "Unable to create checkout right now.",
      );
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="card p-5 md:p-7">
        <div className="mb-6">
          <div className="h-2 overflow-hidden rounded-full bg-[#F1ECE4]">
            <div
              className="h-full rounded-full bg-[#A8B8A1] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#7A746E]">
            Step {step + 1} of 5
          </p>
        </div>

        {step === 0 ? (
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
                  onClick={() => setTreatmentId(treatment.id)}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7A746E]">
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

        {step === 1 ? (
          <BookingStep title="Appointment type and location" text="Home treatment visits are available in selected Metro Manila areas, subject to doctor availability.">
            <ChoiceGrid items={appointmentTypes} value={appointmentType} onChange={setAppointmentType} />
            <div className="mt-6">
              <p className="text-sm font-semibold text-[#1F1F1F]">Preferred location</p>
              <ChoiceGrid items={locations} value={location} onChange={setLocation} />
            </div>
          </BookingStep>
        ) : null}

        {step === 2 ? (
          <BookingStep title="Choose date and time" text="The doctor may propose a different slot if the selected treatment requires more time or preparation.">
            <ChoiceGrid items={slots} value={slot} onChange={setSlot} />
          </BookingStep>
        ) : null}

        {step === 3 ? (
          <BookingStep title="Medical intake" text="The first version shows the structure of the step-by-step intake form. This must be completed before confirmation.">
            <div className="grid gap-4 md:grid-cols-2">
              {["Full name", "Date of birth", "Phone number", "Emergency contact"].map((label) => (
                <label key={label} className="grid gap-2 text-sm font-semibold text-[#1F1F1F]">
                  {label}
                  <input className="field" placeholder={label} />
                </label>
              ))}
            </div>
            <div className="mt-6 grid gap-3">
              {intakeQuestions.map((question) => (
                <label key={question} className="flex items-start gap-3 rounded-lg border border-[#E6DFD5] bg-white p-4 text-sm text-[#4D4D4D]">
                  <input className="mt-1" type="checkbox" />
                  <span>{question}</span>
                </label>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-[#C8B89F] bg-[#FAF8F4] p-4 text-sm text-[#6F6F6F]">
              <Paperclip className="h-4 w-4" />
              Optional photo upload structure
            </label>
          </BookingStep>
        ) : null}

        {step === 4 ? (
          <BookingStep title="Review treatment booking and payment" text="Confirm the treatment booking request. The doctor may need to approve or adjust the treatment before the home visit is fully confirmed.">
            <div className="grid gap-4">
              {paymentModes.map((mode) => (
                <button
                  key={mode}
                  className={`rounded-lg border p-4 text-left text-sm font-semibold ${
                    paymentMode === mode
                      ? "border-[#1F1F1F] bg-[#FAF8F4]"
                      : "border-[#E6DFD5] bg-white"
                  }`}
                  onClick={() => setPaymentMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-[#E6DFD5] p-4">
              <p className="text-sm font-semibold text-[#1F1F1F]">Consent required</p>
              <div className="mt-3 grid gap-3">
                {[
                  "I confirm the information provided is accurate.",
                  "I understand that treatment is subject to doctor assessment.",
                  "I understand that results vary per patient.",
                  "I agree to receive appointment-related messages.",
                ].map((item) => (
                  <label key={item} className="flex gap-3 text-sm text-[#4D4D4D]">
                    <input type="checkbox" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              className="btn btn-primary mt-6 h-12 w-full justify-center"
              disabled={checkoutState === "loading"}
              onClick={startCheckout}
            >
              <CreditCard className="h-4 w-4" />
              {checkoutState === "loading" ? "Creating checkout..." : "Confirm Booking"}
            </button>
            {checkoutNote ? <p className="mt-3 text-sm text-[#8A3E35]">{checkoutNote}</p> : null}
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
              onClick={() => setStep((current) => Math.min(4, current + 1))}
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
            {selectedTreatment.name}
          </h2>
          <div className="mt-5 grid gap-3 text-sm">
            <SummaryRow label="Treatment" value={selectedTreatment.priceLabel} />
            <SummaryRow label="Home visit fee" value={formatPeso(1500)} />
            <SummaryRow label="Appointment" value={appointmentType} />
            <SummaryRow label="Location" value={location} />
            <SummaryRow label="Time" value={slot} />
            <SummaryRow label="Payment" value={paymentMode} />
          </div>
          <div className="mt-5 rounded-lg bg-[#FAF8F4] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A746E]">
              Estimated total
            </p>
            <p className="mt-1 font-serif text-3xl text-[#1F1F1F]">
              {formatPeso(total)}
            </p>
          </div>
        </section>
        <Notice title="Booking disclaimer">
          Your treatment booking may require doctor approval before the home visit is confirmed.
          Suitability, treatment plan, and expected outcomes depend on individual
          medical assessment.
        </Notice>
      </aside>
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
      <h1 className="font-serif text-4xl leading-tight text-[#1F1F1F]">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F6F6F]">{text}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ChoiceGrid({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <button
          key={item}
          className={`rounded-lg border p-4 text-left text-sm font-semibold ${
            value === item ? "border-[#1F1F1F] bg-[#FAF8F4]" : "border-[#E6DFD5] bg-white"
          }`}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#E6DFD5] pb-3 last:border-0 last:pb-0">
      <span className="text-[#6F6F6F]">{label}</span>
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
    text: "Appointment thread created for Skin Booster Treatment.",
    time: "9:10 AM",
  },
  {
    sender: "doctor",
    text: "Please upload clear photos in natural light and confirm if you have allergies or current medication.",
    time: "9:12 AM",
  },
  {
    sender: "patient",
    text: "I have no known allergies. I will upload photos before the appointment.",
    time: "9:18 AM",
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
        sender: "doctor",
        text: "Thank you. This has been added to your intake for doctor review.",
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
          {["Skin Booster Treatment", "Medical Intake Review", "Aftercare Follow-up"].map(
            (conversation, index) => (
              <button
                key={conversation}
                className={`rounded-lg border p-4 text-left ${
                  index === 0 ? "border-[#A8B8A1] bg-white" : "border-[#E6DFD5]"
                }`}
              >
                <p className="font-semibold text-[#1F1F1F]">{conversation}</p>
                <p className="mt-1 text-xs text-[#6F6F6F]">
                  {index === 0 ? "Active appointment thread" : "Conversation preview"}
                </p>
              </button>
            ),
          )}
        </div>
        <p className="mt-5 rounded-lg bg-[#EEF5F5] p-3 text-xs leading-5 text-[#566060]">
          WhatsApp support coming soon. Internal messaging is prepared first.
        </p>
      </aside>
      <section className="flex flex-col">
        <div className="flex items-center justify-between border-b border-[#E6DFD5] p-5">
          <div>
            <p className="font-serif text-2xl text-[#1F1F1F]">Doctor Chat</p>
            <p className="mt-1 text-sm text-[#6F6F6F]">Response time may vary.</p>
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
                    : "mx-auto bg-[#F1ECE4] text-[#6F6F6F]"
              }`}
            >
              <p>{message.text}</p>
              <p className="mt-2 text-xs opacity-70">{message.time}</p>
            </div>
          ))}
        </div>
        <form className="flex gap-3 border-t border-[#E6DFD5] p-4" onSubmit={sendMessage}>
          <button
            className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#E6DFD5] text-[#6F6F6F]"
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
        <p className="mt-4 text-base leading-7 text-[#6F6F6F]">
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
          [CalendarDays, "Date and time", "Tomorrow, 10:00 AM"],
          [MessageCircle, "Doctor", "BetterSelf Medical Doctor"],
          [MapPin, "Address", "BGC, Taguig, Metro Manila"],
          [Check, "Preparation", "Complete intake and avoid active skin irritation."],
        ].map(([Icon, label, value]) => (
          <div key={label as string} className="rounded-lg border border-[#E6DFD5] p-4">
            <Icon className="h-5 w-5 text-[#4F5B55]" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#7A746E]">
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
