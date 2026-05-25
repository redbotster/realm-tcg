-- Daily-quest claim ledger (server-modules/quests.js). One row per
-- (user, quest, day); the composite primary key enforces single-claim and
-- makes a duplicate insert surface as a 23505 the claim handler maps to 409.
create table if not exists quest_claims (
  user_id    uuid not null references users(id) on delete cascade,
  quest_id   text not null,
  claim_date text not null,
  created_at timestamptz default now(),
  primary key (user_id, quest_id, claim_date)
);
create index if not exists quest_claims_user_date_idx on quest_claims (user_id, claim_date);
