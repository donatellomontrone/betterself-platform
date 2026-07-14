-- Durable fixed-window counters for public API abuse and AI cost protection.

create table if not exists public.api_rate_limits (
  scope text not null,
  client_key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (scope, client_key_hash)
);

create index if not exists api_rate_limits_expires_idx
  on public.api_rate_limits(expires_at);
