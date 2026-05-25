-- Ranked ladder: per-season rating on users (server-modules/ranked.js).
alter table users add column if not exists rank_points  int default 0;
alter table users add column if not exists rank_best    int default 0;
alter table users add column if not exists ranked_season text;
create index if not exists users_ranked_season_idx on users (ranked_season, rank_points desc);
