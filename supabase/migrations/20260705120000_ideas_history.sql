-- Sent-ideas history archive.
--
-- Written ONLY by the send-email Edge Function using the service role.
-- RLS is enabled with no policies, so the public anon key can neither read
-- nor write this table — idea history stays private even though the anon
-- key ships in the frontend. (The weekly digest will read it server-side.)

create table if not exists public.ideas_history (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,                -- groups the ideas of one send
  recipient text not null check (recipient in ('work', 'personal')),
  text text not null,
  captured_at timestamptz not null,      -- when the idea was captured mid-run
  sent_at timestamptz not null default now()
);

alter table public.ideas_history enable row level security;
-- Intentionally no RLS policies: deny-all for anon/authenticated.
-- The service role bypasses RLS.

create index if not exists ideas_history_sent_at_idx
  on public.ideas_history (sent_at desc);
