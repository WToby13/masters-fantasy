-- Migration: Add live score fields to golfers and tournaments
-- Run this in Supabase SQL Editor

-- New columns on golfers for live scoreboard
alter table public.golfers add column if not exists score_to_par text;
alter table public.golfers add column if not exists today_score text;
alter table public.golfers add column if not exists thru text;
alter table public.golfers add column if not exists position integer;

-- Timestamp on tournaments so the UI can show "Updated X min ago"
alter table public.tournaments add column if not exists scores_updated_at timestamptz;
