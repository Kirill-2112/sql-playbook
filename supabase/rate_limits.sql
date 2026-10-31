-- Request limits for the Vercel API (api/_lib/rateLimit.ts). Run once in the Supabase SQL editor.
-- One row per key (an action plus a hash of the caller's IP address, never the address itself).
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  hits         integer not null
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
grant select, insert, update, delete on public.rate_limits to service_role;

-- Counts one request; true while the key stays within p_limit requests per p_window_seconds.
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  current_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into current_hits;
  -- Old rows are cleaned up now and then, so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return current_hits <= p_limit;
end;
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
