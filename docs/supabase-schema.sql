-- Run these in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Favorites table: stores user's favorited leagues, teams, and players
create table user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('league', 'team', 'player')),
  external_id integer not null,
  name text not null,
  logo text,
  created_at timestamptz default now(),
  unique(user_id, type, external_id)
);

alter table user_favorites enable row level security;

create policy "Users manage own favorites"
  on user_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Push tokens table: stores Expo push tokens per user
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  token text not null,
  platform text not null,
  updated_at timestamptz default now(),
  unique(user_id, token)
);

alter table push_tokens enable row level security;

create policy "Users manage own tokens"
  on push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
