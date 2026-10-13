create or replace function public.booster_player_state_block_stale_restore()
returns trigger
language plpgsql
as $$
declare
  old_cards int;
  new_cards int;
begin
  old_cards := coalesce(jsonb_array_length(old.collection), 0);
  new_cards := coalesce(jsonb_array_length(new.collection), 0);
  if old_cards = 0
     and old.coins <= 60
     and (
       new.coins > 200
       or new_cards > 12
       or coalesce(new.hits_pulled, 0) > 5
     )
  then
    new.coins := old.coins;
    new.last_coin_earned_at := old.last_coin_earned_at;
    new.collection := old.collection;
    new.binder_slots := old.binder_slots;
    new.boosters_opened := old.boosters_opened;
    new.hits_pulled := old.hits_pulled;
    new.berries_spent := old.berries_spent;
    new.display_progress := old.display_progress;
    new.welcome_gift := old.welcome_gift;
  end if;
  return new;
end;
$$;

drop trigger if exists booster_player_state_block_stale_restore on public.booster_player_state;
create trigger booster_player_state_block_stale_restore
before update on public.booster_player_state
for each row
execute function public.booster_player_state_block_stale_restore();
