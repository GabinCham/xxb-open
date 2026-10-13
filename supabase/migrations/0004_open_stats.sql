alter table public.booster_player_state
  add column if not exists boosters_opened jsonb not null default '{}'::jsonb,
  add column if not exists hits_pulled integer not null default 0 check (hits_pulled >= 0),
  add column if not exists berries_spent numeric(12, 2) not null default 0 check (berries_spent >= 0);
