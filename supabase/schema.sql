-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── Profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id               uuid references auth.users on delete cascade primary key,
  username         text unique,
  display_name     text,
  avatar_url       text,
  school_or_job    text,
  streak_days      int  default 0,
  total_focus_minutes int default 0,
  last_active_date date,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Rooms ────────────────────────────────────────────────────────────────────
create table public.rooms (
  id               uuid default gen_random_uuid() primary key,
  name             text not null,
  description      text,
  environment      text not null default 'rainy-cafe',
  is_public        boolean not null default true,
  access_key       text,
  host_id          uuid references public.profiles(id) on delete set null,
  focus_duration   int not null default 25,
  break_duration   int not null default 5,
  timer_state      jsonb not null default '{"status":"idle","started_at":null,"ends_at":null,"round":0}',
  created_at       timestamptz default now()
);

alter table public.rooms enable row level security;

create policy "Anyone can view public rooms"
  on public.rooms for select using (is_public = true);

create policy "Authenticated users can view private rooms they know the key for"
  on public.rooms for select using (auth.role() = 'authenticated');

create policy "Authenticated users can create rooms"
  on public.rooms for insert with check (auth.uid() = host_id);

create policy "Host can update room"
  on public.rooms for update using (auth.uid() = host_id);

create policy "Host can delete room"
  on public.rooms for delete using (auth.uid() = host_id);

-- ── Focus Sessions ───────────────────────────────────────────────────────────
create table public.focus_sessions (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references public.profiles(id) on delete cascade,
  room_id          uuid references public.rooms(id) on delete set null,
  task             text,
  started_at       timestamptz default now(),
  ended_at         timestamptz,
  duration_minutes int
);

alter table public.focus_sessions enable row level security;

create policy "Users can manage own sessions"
  on public.focus_sessions for all using (auth.uid() = user_id);

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime for rooms table (timer sync)
alter publication supabase_realtime add table public.rooms;
