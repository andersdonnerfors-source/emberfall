-- Emberfall: friends list (account names, friend requests, online status).
-- Paste this whole file into Supabase → SQL Editor → New query, then press Run. Safe to run more than once.

-- Friendships: a request from one player to another; accepted once the other side says yes.
create table if not exists public.friendships (
  id          bigint generated always as identity primary key,
  requester   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  addressee   uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
alter table public.friendships enable row level security;

drop policy if exists "friendships: see own"      on public.friendships;
drop policy if exists "friendships: send request" on public.friendships;
drop policy if exists "friendships: accept"       on public.friendships;
drop policy if exists "friendships: remove"       on public.friendships;
create policy "friendships: see own"      on public.friendships for select using (auth.uid() in (requester, addressee));
create policy "friendships: send request" on public.friendships for insert with check (requester = auth.uid() and status = 'pending');
create policy "friendships: accept"       on public.friendships for update using (addressee = auth.uid()) with check (addressee = auth.uid() and status = 'accepted');
create policy "friendships: remove"       on public.friendships for delete using (auth.uid() in (requester, addressee));

-- Profiles: the account name friends find you by (never your email), plus what you are doing right now.
create table if not exists public.profiles (
  id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (name ~ '^[A-Za-z0-9_]{3,16}$'),
  last_seen   timestamptz not null default now(),
  status      jsonb not null default '{}'::jsonb check (pg_column_size(status) < 2000),
  created_at  timestamptz not null default now()
);
create unique index if not exists profiles_name_unique on public.profiles (lower(name));
alter table public.profiles enable row level security;

drop policy if exists "profiles: see self and friends" on public.profiles;
drop policy if exists "profiles: create own"           on public.profiles;
drop policy if exists "profiles: update own"           on public.profiles;
-- You can see your own profile and the profiles of players you have a friendship or pending request with.
create policy "profiles: see self and friends" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.friendships f
    where (f.requester = auth.uid() and f.addressee = profiles.id) or (f.addressee = auth.uid() and f.requester = profiles.id)));
create policy "profiles: create own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles: update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Find a player by their exact account name (so nobody can browse the list of players).
create or replace function public.find_player(p_name text)
returns table (id uuid, name text) language sql security definer stable set search_path = public as $$
  select p.id, p.name from public.profiles p where auth.uid() is not null and lower(p.name) = lower(p_name) limit 1
$$;
revoke execute on function public.find_player(text) from public, anon;
grant execute on function public.find_player(text) to authenticated;

-- At most 100 friends and requests per player (stops request spam).
create or replace function public.friendships_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.friendships where requester = new.requester or addressee = new.requester) >= 100 then
    raise exception 'Your friends list is full.';
  end if;
  return new;
end $$;
drop trigger if exists friendships_limit on public.friendships;
create trigger friendships_limit before insert on public.friendships for each row execute function public.friendships_limit();
