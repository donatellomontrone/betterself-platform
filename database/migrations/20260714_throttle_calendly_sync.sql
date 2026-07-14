begin;

create table if not exists public.integration_sync_state (
  integration text primary key,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_status text not null default 'idle'
    check (last_status in ('idle', 'running', 'completed', 'failed')),
  last_error text,
  updated_at timestamptz not null default now()
);

commit;
