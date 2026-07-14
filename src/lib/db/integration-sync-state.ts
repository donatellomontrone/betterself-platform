import { getSql } from "./client";

type ClaimIntegrationSyncInput = {
  integration: string;
  minIntervalSeconds: number;
  staleAfterSeconds: number;
};

/**
 * Claims a shared sync window in Neon so concurrent Vercel requests do not
 * repeat the same external API scan.
 */
export async function claimIntegrationSync(input: ClaimIntegrationSyncInput) {
  const sql = getSql();
  const rows = await sql`
    insert into public.integration_sync_state
      (integration, last_started_at, last_status, last_error, updated_at)
    values
      (${input.integration}, now(), 'running', null, now())
    on conflict (integration) do update set
      last_started_at = now(),
      last_status = 'running',
      last_error = null,
      updated_at = now()
    where
      public.integration_sync_state.last_started_at is null
      or (
        public.integration_sync_state.last_status <> 'running'
        and public.integration_sync_state.last_started_at
          <= now() - make_interval(secs => ${input.minIntervalSeconds})
      )
      or (
        public.integration_sync_state.last_status = 'running'
        and public.integration_sync_state.last_started_at
          <= now() - make_interval(secs => ${input.staleAfterSeconds})
      )
    returning integration
  `;

  return rows.length > 0;
}

export async function completeIntegrationSync(integration: string) {
  const sql = getSql();
  await sql`
    update public.integration_sync_state
    set
      last_completed_at = now(),
      last_status = 'completed',
      last_error = null,
      updated_at = now()
    where integration = ${integration}
  `;
}

export async function failIntegrationSync(integration: string, error: unknown) {
  const sql = getSql();
  const message = error instanceof Error ? error.message : "Unknown integration sync error";
  await sql`
    update public.integration_sync_state
    set
      last_status = 'failed',
      last_error = ${message.slice(0, 500)},
      updated_at = now()
    where integration = ${integration}
  `;
}
