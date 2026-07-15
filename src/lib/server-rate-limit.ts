import { createHash } from "crypto";
import { isDatabaseConfigured } from "@/lib/db/client";
import { consumeRateLimit } from "@/lib/db/rate-limit";

export async function limitAuthenticatedRequest(input: {
  scope: string;
  userId: string;
  maxRequests: number;
  windowSeconds: number;
}) {
  if (!isDatabaseConfigured()) return { limited: false, retryAfterSeconds: 0 };
  const pepper = process.env.RATE_LIMIT_HASH_SECRET ?? process.env.CLERK_SECRET_KEY ?? "betterself";
  const clientKeyHash = createHash("sha256")
    .update(`${input.scope}:${input.userId}:${pepper}`)
    .digest("hex");
  return consumeRateLimit({
    scope: input.scope,
    clientKeyHash,
    maxRequests: input.maxRequests,
    windowSeconds: input.windowSeconds,
  });
}
