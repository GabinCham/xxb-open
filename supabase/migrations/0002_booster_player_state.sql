-- Etat de jeu OP TCG Booster. La table popo_owned_sec existante n'est pas modifiée.

create table if not exists public.booster_player_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  coins integer not null default 60 check (coins >= 0),
  last_coin_earned_at timestamptz not null default now(),
  collection jsonb not null default '[]'::jsonb,
  binder_slots jsonb not null default '[null, null, null, null]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.booster_player_state is
  'Progression OP TCG Booster par compte : Berrys, collection et classeur.';

alter table public.booster_player_state enable row level security;

revoke all on public.booster_player_state from anon, authenticated;
grant select, insert, update on public.booster_player_state to authenticated;

drop policy if exists booster_player_state_select_own on public.booster_player_state;
drop policy if exists booster_player_state_insert_own on public.booster_player_state;
drop policy if exists booster_player_state_update_own on public.booster_player_state;

create policy booster_player_state_select_own on public.booster_player_state
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy booster_player_state_insert_own on public.booster_player_state
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy booster_player_state_update_own on public.booster_player_state
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
