alter table public.booster_player_state
  alter column coins type numeric(12, 2) using coins::numeric(12, 2);
