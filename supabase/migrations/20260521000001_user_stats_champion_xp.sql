-- Champion progression + win-streak columns the app expects on users, and a
-- rebuilt user_stats view that exposes them. These were added by upstream
-- migrations missing from the repo; a fresh DB lacked them, 500ing the
-- leaderboard ("column user_stats.champion_xp does not exist").
alter table users add column if not exists champion_xp           int default 0;
alter table users add column if not exists champion_level        int default 1;
alter table users add column if not exists match_win_streak      int default 0;
alter table users add column if not exists match_win_streak_best int default 0;

create or replace view user_stats as
  select
    u.id                                                       as user_id,
    u.display_name,
    coalesce(played.cnt, 0)                                    as matches_played,
    coalesce(won.cnt, 0)                                       as wins,
    coalesce(played.cnt, 0) - coalesce(won.cnt, 0)             as losses,
    case when coalesce(played.cnt, 0) = 0 then 0.0
         else round(100.0 * coalesce(won.cnt, 0) / played.cnt, 1)
    end                                                        as win_pct,
    coalesce(owned.cnt, 0)                                     as cards_owned,
    coalesce(u.champion_xp, 0)                                 as champion_xp,
    coalesce(u.champion_level, 1)                              as champion_level,
    coalesce(u.match_win_streak, 0)                            as win_streak
  from users u
  left join (
    select user_id, count(*)::int as cnt from (
      select p1_user_id as user_id from matches where p1_user_id is not null
      union all
      select p2_user_id as user_id from matches where p2_user_id is not null
    ) m group by user_id
  ) played on played.user_id = u.id
  left join (
    select winner_id as user_id, count(*)::int as cnt
      from matches where winner_id is not null
      group by winner_id
  ) won on won.user_id = u.id
  left join (
    select user_id, count(*)::int as cnt
      from owned_cards group by user_id
  ) owned on owned.user_id = u.id;
