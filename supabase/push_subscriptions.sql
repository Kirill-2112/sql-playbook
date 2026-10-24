-- Reminder subscriptions for the Vercel API (api/push). Run once in the Supabase SQL editor.
-- One row per browser that turned reminders on. No names or emails: only the push address the browser gave,
-- its encryption keys, the reminder settings, and the last day the learner practised.
create table if not exists public.push_subscriptions (
  endpoint      text primary key,
  p256dh        text not null,
  auth          text not null,
  remind_at     text not null check (remind_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  time_zone     text not null,
  daily         boolean not null default true,
  streak_saver  boolean not null default true,
  practised_on  date,
  streak        integer not null default 0,
  daily_sent_on date,
  saver_sent_on date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Only the server, with the secret key, may touch the table: row level security on, no policies for anyone else.
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;
