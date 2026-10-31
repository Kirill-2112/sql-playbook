-- Learner progress for signed-in users (src/progress/sync.ts). Run once in the Supabase SQL editor.
-- One row per user: the same JSON the app keeps in localStorage. Each user can read and write only their own row.
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null check (octet_length(state::text) < 500000),
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;
revoke all on public.progress from anon;
grant select, insert, update, delete on public.progress to authenticated;

create policy "Read own progress" on public.progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Add own progress" on public.progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Change own progress" on public.progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own progress" on public.progress for delete to authenticated
  using ((select auth.uid()) = user_id);
