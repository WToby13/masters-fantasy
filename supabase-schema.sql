-- ============================================================
-- Masters Fantasy Pool — Supabase SQL Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  tiebreaker_score integer, -- predicted winning score (e.g. -12 → stored as -12)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Tournaments
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- e.g. "The Masters 2026"
  year integer not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'drafting', 'locked', 'in_progress', 'completed')),
  winning_score integer,              -- actual winner score, set after tournament
  espn_event_id text,                 -- for API lookups
  created_at timestamptz default now()
);

alter table public.tournaments enable row level security;

create policy "Tournaments are viewable by everyone"
  on public.tournaments for select using (true);


-- 3. Golfers
create table public.golfers (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  world_ranking integer not null,
  tier integer not null check (tier between 1 and 6),
  espn_player_id text,
  score_r1 integer,
  score_r2 integer,
  score_r3 integer,
  score_r4 integer,
  total_score integer,               -- total strokes relative to par
  status text default 'active'
    check (status in ('active', 'cut', 'withdrawn', 'disqualified')),
  created_at timestamptz default now()
);

alter table public.golfers enable row level security;

create policy "Golfers are viewable by everyone"
  on public.golfers for select using (true);


-- 4. Picks (one row per user per tier per tournament)
create table public.picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  golfer_id uuid not null references public.golfers(id) on delete cascade,
  tier integer not null check (tier between 1 and 6),
  created_at timestamptz default now(),
  unique (user_id, tournament_id, tier)
);

alter table public.picks enable row level security;

create policy "Picks are viewable by everyone"
  on public.picks for select using (true);

create policy "Users can insert their own picks"
  on public.picks for insert with check (auth.uid() = user_id);

create policy "Users can update their own picks"
  on public.picks for update using (auth.uid() = user_id);

create policy "Users can delete their own picks"
  on public.picks for delete using (auth.uid() = user_id);


-- 5. Indexes
create index idx_golfers_tournament on public.golfers(tournament_id);
create index idx_golfers_tier on public.golfers(tournament_id, tier);
create index idx_picks_user_tournament on public.picks(user_id, tournament_id);


-- 6. Helper view — leaderboard with best-4-of-6 scoring
create or replace view public.leaderboard as
with pick_scores as (
  select
    p.user_id,
    p.tournament_id,
    p.tier,
    g.name as golfer_name,
    g.status as golfer_status,
    case
      when g.status = 'cut' then
        coalesce(g.score_r1, 0) + coalesce(g.score_r2, 0) + 80 + 80
      when g.status in ('withdrawn', 'disqualified') then
        coalesce(g.score_r1, 0) + coalesce(g.score_r2, 0) + 80 + 80
      else
        coalesce(g.total_score, 0)
    end as effective_score,
    row_number() over (
      partition by p.user_id, p.tournament_id
      order by
        case
          when g.status = 'cut' then
            coalesce(g.score_r1, 0) + coalesce(g.score_r2, 0) + 80 + 80
          when g.status in ('withdrawn', 'disqualified') then
            coalesce(g.score_r1, 0) + coalesce(g.score_r2, 0) + 80 + 80
          else
            coalesce(g.total_score, 0)
        end asc
    ) as score_rank
  from public.picks p
  join public.golfers g on g.id = p.golfer_id
)
select
  user_id,
  tournament_id,
  sum(effective_score) as total_score,
  json_agg(json_build_object(
    'tier', tier,
    'golfer_name', golfer_name,
    'golfer_status', golfer_status,
    'effective_score', effective_score,
    'counted', score_rank <= 4
  ) order by tier) as picks_detail
from pick_scores
group by user_id, tournament_id;
