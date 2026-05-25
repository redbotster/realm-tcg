-- Realm TCG — Bestiary schema.
-- Paste this into your Supabase project's SQL editor (Project → SQL Editor → New query)
-- and click "Run" before running scripts/seed-bestiary.js.

create table if not exists bestiary (
  id           int primary key,           -- creature id (1..N, no dex semantics)
  name         text not null,
  slug         text not null unique,
  -- Elemental schools (1-2). 18 values, mirroring the effectiveness chart:
  --   martial fire tide storm verdant frost brawl plague earth sky
  --   mind swarm stone spectral wyrm shadow iron radiant
  types        text[] not null,           -- ["fire", "sky"]
  hp           int not null,
  attack       int not null,
  defense      int not null,
  sp_attack    int not null,
  sp_defense   int not null,
  speed        int not null,
  -- Creature taxonomy for the reskin.
  creature_family text,                    -- Humanoid|Dragon|Undead|Demon|Beast|Elemental|Aberration|Fey
  tier         int default 1,              -- evolution tier 1-4 (recruit->veteran->champion->legend)
  height_m     numeric,
  weight_kg    numeric,
  abilities    text[],
  sprite_front text,                       -- card art URL (generated; see scripts/generate-art.js)
  sprite_back  text,
  cry_url      text,                       -- unused in original-IP build (no creature audio)
  flavor_text  text,
  art_prompt   text,                        -- rich visual description fed to the art pipeline
  generation   int not null default 1,     -- legacy bucket; kept for collection/achievement code
  is_legendary boolean default false,
  is_mythical  boolean default false
);

create index if not exists bestiary_generation_idx on bestiary (generation);
create index if not exists bestiary_types_gin on bestiary using gin (types);
create index if not exists bestiary_family_idx on bestiary (creature_family);
create index if not exists bestiary_tier_idx on bestiary (tier);
