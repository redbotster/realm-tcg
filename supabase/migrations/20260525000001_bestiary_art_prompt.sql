-- Store the rich, per-creature art generation prompt in the database so the
-- "what this creature looks like" context lives alongside its stats and is
-- queryable / reusable by the art pipeline.
alter table bestiary add column if not exists art_prompt text;
