import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { consumeRateLimit, type RateLimitResult } from "@/lib/db/rate-limit";
import { consultationService, treatments, type Treatment } from "@/lib/treatments";

type RecommendationConfidence = "low" | "medium" | "high";
type RecommendationSource = "openai" | "fallback";

type ModelRecommendation = {
  recommendedTreatmentId: string;
  confidence: RecommendationConfidence;
  reason: string;
  safetyNote: string;
  alternativeTreatmentIds: string[];
};

const allowedServices = [...treatments, consultationService];
const allowedTreatmentIds = new Set(allowedServices.map((service) => service.id));
const redFlagTerms = [
  "emergency",
  "severe pain",
  "infection",
  "pus",
  "fever",
  "allergic reaction",
  "difficulty breathing",
  "pregnant",
  "breastfeeding",
];
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 8;
const recommendationRateLimits = new Map<string, { count: number; resetAt: number }>();

const recommendationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    recommendedTreatmentId: {
      type: "string",
      enum: allowedServices.map((service) => service.id),
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
    reason: {
      type: "string",
      maxLength: 420,
    },
    safetyNote: {
      type: "string",
      maxLength: 320,
    },
    alternativeTreatmentIds: {
      type: "array",
      maxItems: 3,
      items: {
        type: "string",
        enum: allowedServices.map((service) => service.id),
      },
    },
  },
  required: [
    "recommendedTreatmentId",
    "confidence",
    "reason",
    "safetyNote",
    "alternativeTreatmentIds",
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function summarizeService(service: Treatment) {
  return {
    id: service.id,
    name: service.name,
    category: service.category,
    priceLabel: service.priceLabel,
    description: service.description,
    concerns: service.concerns,
    mayHelpWith: service.mayHelpWith,
    avoidIf: service.avoidIf,
  };
}

function toClientService(service: Treatment) {
  return {
    id: service.id,
    name: service.name,
    category: service.category,
    description: service.description,
    duration: service.duration,
    priceLabel: service.priceLabel,
  };
}

function findService(id: string) {
  return allowedServices.find((service) => service.id === id) ?? consultationService;
}

function extractResponseText(payload: unknown): string {
  if (!isRecord(payload)) {
    return "";
  }

  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return "";
  }

  const chunks: string[] = [];

  for (const outputItem of payload.output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (isRecord(contentItem) && typeof contentItem.text === "string") {
        chunks.push(contentItem.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function coerceRecommendation(value: unknown): ModelRecommendation | null {
  if (!isRecord(value)) {
    return null;
  }

  const recommendedTreatmentId =
    typeof value.recommendedTreatmentId === "string" &&
    allowedTreatmentIds.has(value.recommendedTreatmentId)
      ? value.recommendedTreatmentId
      : consultationService.id;
  const confidence =
    value.confidence === "high" || value.confidence === "medium" || value.confidence === "low"
      ? value.confidence
      : "low";
  const reason =
    typeof value.reason === "string" && value.reason.trim()
      ? value.reason.trim()
      : "A doctor consultation is the safest next step before choosing a treatment.";
  const safetyNote =
    typeof value.safetyNote === "string" && value.safetyNote.trim()
      ? value.safetyNote.trim()
      : "This is not a diagnosis. The doctor confirms suitability after medical intake.";
  const alternativeTreatmentIds = Array.isArray(value.alternativeTreatmentIds)
    ? value.alternativeTreatmentIds.filter(
        (id): id is string =>
          typeof id === "string" &&
          allowedTreatmentIds.has(id) &&
          id !== recommendedTreatmentId,
      )
    : [];

  return {
    recommendedTreatmentId,
    confidence,
    reason,
    safetyNote,
    alternativeTreatmentIds: alternativeTreatmentIds.slice(0, 3),
  };
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function fallbackRecommendation(concern: string): ModelRecommendation {
  const normalizedConcern = concern.toLowerCase();

  if (isRedFlagConcern(normalizedConcern)) {
    return {
      recommendedTreatmentId: consultationService.id,
      confidence: "low",
      reason:
        "This concern may need a doctor to review safety and suitability before any aesthetic procedure is chosen.",
      safetyNote:
        "For urgent symptoms, severe reaction, infection, or breathing difficulty, seek urgent medical care instead of booking online.",
      alternativeTreatmentIds: [],
    };
  }

  const tokens = tokenize(concern);
  const scored = treatments
    .map((treatment) => {
      const haystack = [
        treatment.name,
        treatment.category,
        treatment.description,
        ...treatment.concerns,
        ...treatment.mayHelpWith,
      ]
        .join(" ")
        .toLowerCase();
      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);

      return { treatment, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return {
      recommendedTreatmentId: consultationService.id,
      confidence: "low",
      reason:
        "The concern is not specific enough to safely match one treatment from the available list.",
      safetyNote:
        "A paid doctor consultation is recommended so the patient can be assessed before choosing a treatment.",
      alternativeTreatmentIds: [],
    };
  }

  return {
    recommendedTreatmentId: scored[0].treatment.id,
    confidence: scored[0].score >= 3 ? "medium" : "low",
    reason: `${scored[0].treatment.name} is the closest match based on the concern words provided.`,
    safetyNote:
      "This suggestion is not a diagnosis. The doctor still confirms suitability, contraindications, and the final plan.",
    alternativeTreatmentIds: scored.slice(1, 4).map((item) => item.treatment.id),
  };
}

function isRedFlagConcern(concern: string) {
  const normalizedConcern = concern.toLowerCase();
  return redFlagTerms.some((term) => normalizedConcern.includes(term));
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "anonymous";
}

function consumeMemoryRateLimit(request: NextRequest): RateLimitResult {
  const key = getClientKey(request);
  const now = Date.now();
  const current = recommendationRateLimits.get(key);

  if (!current || current.resetAt <= now) {
    recommendationRateLimits.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return { limited: false, retryAfterSeconds: Math.ceil(rateLimitWindowMs / 1000) };
  }

  current.count += 1;
  recommendationRateLimits.set(key, current);
  return {
    limited: current.count > rateLimitMaxRequests,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

async function getRateLimit(request: NextRequest): Promise<RateLimitResult> {
  if (!isDatabaseConfigured()) {
    return consumeMemoryRateLimit(request);
  }

  const clientKeyHash = createHash("sha256")
    .update(`recommend-treatment:${getClientKey(request)}`)
    .digest("hex");

  try {
    return await consumeRateLimit({
      scope: "recommend-treatment",
      clientKeyHash,
      windowSeconds: Math.ceil(rateLimitWindowMs / 1000),
      maxRequests: rateLimitMaxRequests,
    });
  } catch (error) {
    console.error("[recommend-treatment] durable rate limit unavailable:", error);
    return consumeMemoryRateLimit(request);
  }
}

async function getTreatmentRecommendation(
  concern: string,
): Promise<{ recommendation: ModelRecommendation; source: RecommendationSource }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return { recommendation: fallbackRecommendation(concern), source: "fallback" };
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are a conservative medical-aesthetics triage assistant for BetterSelf. Match a patient concern to exactly one available service ID, or choose doctor-consultation when the concern is unclear, sensitive, risky, urgent, outside the catalog, or needs medical judgment first. Do not diagnose, promise outcomes, invent treatments, or recommend treatment for emergencies. Keep explanations patient-friendly.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                patientConcern: concern,
                services: allowedServices.map(summarizeService),
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "betterself_treatment_recommendation",
          strict: true,
          schema: recommendationSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    console.error("[recommend-treatment] OpenAI request failed:", await response.text());
    return { recommendation: fallbackRecommendation(concern), source: "fallback" };
  }

  const payload = (await response.json()) as unknown;
  const outputText = extractResponseText(payload);

  try {
    const parsed = JSON.parse(outputText) as unknown;
    const coerced = coerceRecommendation(parsed);

    return {
      recommendation: coerced ?? fallbackRecommendation(concern),
      source: coerced ? "openai" : "fallback",
    };
  } catch (error) {
    console.error("[recommend-treatment] failed to parse OpenAI response:", error);
    return { recommendation: fallbackRecommendation(concern), source: "fallback" };
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = await getRateLimit(request);
  if (rateLimit.limited) {
    return NextResponse.json(
      { message: "Too many matching requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    concern?: string;
    aiConsent?: boolean;
  } | null;
  const concern = body?.concern?.trim() ?? "";

  if (concern.length < 8) {
    return NextResponse.json(
      { message: "Please describe the problem in a little more detail." },
      { status: 400 },
    );
  }

  // Hard cap before forwarding to the paid AI API (abuse / cost control on this
  // unauthenticated route).
  if (concern.length > 1000) {
    return NextResponse.json(
      { message: "Please shorten your description to 1000 characters or fewer." },
      { status: 400 },
    );
  }

  if (isRedFlagConcern(concern)) {
    const recommendation = fallbackRecommendation(concern);
    const treatment = findService(recommendation.recommendedTreatmentId);
    return NextResponse.json({
      recommendation: {
        ...recommendation,
        source: "fallback" satisfies RecommendationSource,
      },
      treatment: toClientService(treatment),
      alternatives: [],
    });
  }

  if (process.env.OPENAI_API_KEY?.trim() && body?.aiConsent !== true) {
    return NextResponse.json(
      {
        message:
          "Please confirm that this concern can be sent to the AI matching provider, or book a doctor consultation directly.",
      },
      { status: 400 },
    );
  }

  const { recommendation, source } = await getTreatmentRecommendation(concern);
  const treatment = findService(recommendation.recommendedTreatmentId);
  const alternatives = recommendation.alternativeTreatmentIds
    .map(findService)
    .filter((service) => service.id !== treatment.id)
    .slice(0, 3);

  return NextResponse.json({
    recommendation: {
      ...recommendation,
      source,
    },
    treatment: toClientService(treatment),
    alternatives: alternatives.map((service) => ({
      id: service.id,
      name: service.name,
      priceLabel: service.priceLabel,
    })),
  });
}
