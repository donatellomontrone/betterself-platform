import { getSql } from "./client";

type ConsumeRateLimitInput = {
  scope: string;
  clientKeyHash: string;
  windowSeconds: number;
  maxRequests: number;
};

type RateLimitRow = {
  request_count: number | string;
  expires_at: string | Date;
};

export type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds: number;
};

/**
 * Atomically increments a fixed-window counter in Neon. Only a one-way hash of
 * the client identifier is stored, and stale counters are removed opportunistically.
 */
export async function consumeRateLimit(input: ConsumeRateLimitInput): Promise<RateLimitResult> {
  const sql = getSql();
  const rows = (await sql`
    with cleanup as (
      delete from public.api_rate_limits
      where expires_at < now() - interval '1 day'
    ), upserted as (
      insert into public.api_rate_limits
        (scope, client_key_hash, window_started_at, request_count, expires_at, updated_at)
      values
        (${input.scope}, ${input.clientKeyHash}, now(), 1,
         now() + make_interval(secs => ${input.windowSeconds}), now())
      on conflict (scope, client_key_hash) do update set
        window_started_at = case
          when public.api_rate_limits.expires_at <= now() then now()
          else public.api_rate_limits.window_started_at
        end,
        request_count = case
          when public.api_rate_limits.expires_at <= now() then 1
          else public.api_rate_limits.request_count + 1
        end,
        expires_at = case
          when public.api_rate_limits.expires_at <= now()
            then now() + make_interval(secs => ${input.windowSeconds})
          else public.api_rate_limits.expires_at
        end,
        updated_at = now()
      returning request_count, expires_at
    )
    select request_count, expires_at from upserted
  `) as unknown as RateLimitRow[];

  const row = rows[0];
  if (!row) {
    throw new Error("Rate limit counter was not returned.");
  }

  const expiresAt = new Date(row.expires_at).getTime();
  const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));

  return {
    limited: Number(row.request_count) > input.maxRequests,
    retryAfterSeconds,
  };
}
