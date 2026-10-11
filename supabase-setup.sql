-- Emberfall: database setup for online accounts.
-- Paste this whole file into Supabase → SQL Editor → New query, then press Run. Safe to run more than once.

-- One row per hero. The owner is the logged-in account that created it.
create table if not exists public.heroes (
  id          text primary key default gen_random_uuid()::text,
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 24),
  data        jsonb not null check (pg_column_size(data) < 400000),
  updated_at  timestamptz not null default now()
);
create index if not exists heroes_owner_idx on public.heroes (owner);

-- Row Level Security: every player can only see, create, change and delete their OWN heroes.
alter table public.heroes enable row level security;

drop policy if exists "own heroes: read"   on public.heroes;
drop policy if exists "own heroes: create" on public.heroes;
drop policy if exists "own heroes: update" on public.heroes;
drop policy if exists "own heroes: delete" on public.heroes;
create policy "own heroes: read"   on public.heroes for select using (owner = auth.uid());
create policy "own heroes: create" on public.heroes for insert with check (owner = auth.uid());
create policy "own heroes: update" on public.heroes for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own heroes: delete" on public.heroes for delete using (owner = auth.uid());

-- At most 6 heroes per account.
create or replace function public.heroes_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.heroes where owner = new.owner) >= 6 then
    raise exception 'You can have at most 6 heroes.';
  end if;
  return new;
end $$;
drop trigger if exists heroes_limit on public.heroes;
create trigger heroes_limit before insert on public.heroes for each row execute function public.heroes_limit();
