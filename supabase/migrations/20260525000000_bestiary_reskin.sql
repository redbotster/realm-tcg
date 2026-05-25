-- Bestiary reskin (original-IP fantasy theme).
--
-- For fresh deployments the canonical table is created by scripts/schema.sql
-- already named `bestiary` with creature_family + tier. This migration makes
-- the CLI (`supabase db push`) path idempotent and also upgrades any legacy
-- deployment that still has the old `pokemon` table in place.

-- 1) Legacy rename: pokemon -> bestiary (only if the old table is still around).
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'pokemon')
     and not exists (select 1 from information_schema.tables
                     where table_schema = 'public' and table_name = 'bestiary') then
    alter table pokemon rename to bestiary;
    alter index if exists pokemon_generation_idx rename to bestiary_generation_idx;
    alter index if exists pokemon_types_gin       rename to bestiary_types_gin;
  end if;
end $$;

-- 2) Taxonomy columns for the reskin (no-op if already present from schema.sql).
alter table bestiary add column if not exists creature_family text;
alter table bestiary add column if not exists tier int default 1;

create index if not exists bestiary_family_idx on bestiary (creature_family);
create index if not exists bestiary_tier_idx   on bestiary (tier);

-- 3) generation is no longer required for new entries (legacy bucket only).
alter table bestiary alter column generation set default 1;
