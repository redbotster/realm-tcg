-- owned_cards.shiny_level is selected by collection.js + the in-game Bestiary
-- but was never created on a fresh DB. Without it both views 500.
alter table owned_cards add column if not exists shiny_level int default 0;
