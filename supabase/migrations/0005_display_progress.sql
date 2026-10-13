alter table public.booster_player_state
  add column if not exists display_progress jsonb not null default '{"epoch":0,"queue":[]}'::jsonb;
