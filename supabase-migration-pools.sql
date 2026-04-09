-- ============================================================
-- Migration: Add Pools support + migrate existing data
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Pools table
create table public.pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.pools enable row level security;

create policy "Pools are viewable by everyone"
  on public.pools for select using (true);

create policy "Authenticated users can create pools"
  on public.pools for insert with check (auth.uid() = created_by);


-- 2. Pool members join table
create table public.pool_members (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (pool_id, user_id)
);

alter table public.pool_members enable row level security;

create policy "Pool members are viewable by everyone"
  on public.pool_members for select using (true);

create policy "Users can join pools"
  on public.pool_members for insert with check (auth.uid() = user_id);


-- 3. Add pool_id column to picks (nullable for now)
alter table public.picks add column pool_id uuid references public.pools(id) on delete cascade;


-- 4. Create default pool for the existing tournament
--    Using Toby's user ID as the creator
insert into public.pools (id, name, tournament_id, invite_code, created_by)
values (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'Agoosesta 2026',
  '8e5bf5dd-920d-4bcf-a12c-961ed446fddc',
  'AGO26A',
  '8c83948f-c94a-47ff-b498-3d45fd774726'
);


-- 5. Add all 4 existing users as members of the default pool
insert into public.pool_members (pool_id, user_id) values
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1dd74001-39da-4f8a-a5eb-163d24675e5c'),  -- Canitaberm
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '38348c50-07ce-4be7-9150-e9e1cd84a7d3'),  -- Arkelly
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '8c83948f-c94a-47ff-b498-3d45fd774726'),  -- Toby's Mashed Potatos
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'dd08b2cd-35f1-4727-b746-4c1976606210'); -- 2017 Agooseta Winner


-- 6. Update all existing picks to belong to the default pool
update public.picks
set pool_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
where tournament_id = '8e5bf5dd-920d-4bcf-a12c-961ed446fddc'
  and pool_id is null;


-- 7. Drop old unique constraint, add new one scoped to pool
alter table public.picks drop constraint if exists picks_user_id_tournament_id_tier_key;
alter table public.picks add constraint picks_user_pool_tier_unique
  unique (user_id, pool_id, tournament_id, tier);


-- 8. Indexes
create index idx_pools_tournament on public.pools(tournament_id);
create index idx_pools_invite_code on public.pools(invite_code);
create index idx_pool_members_pool on public.pool_members(pool_id);
create index idx_pool_members_user on public.pool_members(user_id);
create index idx_picks_pool on public.picks(pool_id);
