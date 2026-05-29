-- Run this in Supabase SQL Editor before using cloud match history.
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  mode text not null,
  difficulty text,
  player_side text,
  winner text,
  result text,
  moves jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

drop policy if exists "Users can view own games" on public.games;
drop policy if exists "Users can insert own games" on public.games;
drop policy if exists "Users can delete own games" on public.games;

create policy "Users can view own games"
on public.games
for select
using (auth.uid() = user_id);

create policy "Users can insert own games"
on public.games
for insert
with check (auth.uid() = user_id);

create policy "Users can delete own games"
on public.games
for delete
using (auth.uid() = user_id);
