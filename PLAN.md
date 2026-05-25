# Realm TCG — Reskin Plan

Realm TCG is an original-IP fantasy reskin of an upstream Pokémon-themed 1v1
card game. The game mechanics are kept 1:1; only theme, names, art, copy, and a
handful of taxonomy mappings change.

## Done (IP-clean core)

- **Repo hygiene.** Fresh git history; stripped the PokeAPI scraper, the live
  seed, and cached-IP test fixtures. Project renamed to `realm-tcg`.
- **Global rename.** pokemon→creature, Pokedex→Bestiary, trainer→champion
  across the codebase; DB table `pokemon`→`bestiary`.
- **Schema.** `bestiary` table + `creature_family` + `tier`; dex-number
  semantics dropped; idempotent forward migration.
- **18 schools.** Pokémon types → martial/fire/tide/storm/verdant/frost/brawl/
  plague/earth/sky/mind/swarm/stone/spectral/wyrm/shadow/iron/radiant. The
  effectiveness matrix is preserved verbatim, only re-keyed.
- **Status effects.** Paralyze→Stun, Confuse→Curse; Burn/Freeze/Poison/Sleep
  kept; **Bleed** added (Martial DoT) — the one intentional mechanic addition.
- **Champions.** 6 playable champions reskinned to original identities,
  mechanics unchanged. 4 boss champions reskinned, decks repointed to the
  Bestiary.
- **Live IP removed.** All external sprite/cry CDN URLs (PokeAPI artwork,
  Showdown trainer sprites) replaced with local `/client/assets/...` paths.
- **Copy.** Brand → "Realm TCG"; achievements, i18n, OG/Twitter meta reskinned.
- **Bestiary sample.** 32 original creatures (all 8 families, tiers 1–4, all 18
  schools) in `shared/bestiary.json` via `scripts/build-bestiary-sample.js`.
- **Tooling.** `scripts/seed-bestiary.js` (DB seed) and
  `scripts/generate-art.js` (manual-run art pipeline with fal.ai / Replicate /
  OpenAI adapters, `--style-ref` / `--lora`).
- **Tests green** (555) after every step — the canary that mechanics weren't
  broken by the renames.

## Remaining — deeper content pass (depends on the full roster)

These narrative surfaces still reference individual creatures from the old
roster and read as placeholder until reskinned:

- **Story mode** (`shared/story-chapters.js`) — chapters, summon ids, prose.
- **Reading mode** (`shared/reading-stories*.js`) — comprehension stories.
- **Daily boss / puzzle** — anchored to specific creature ids.
- **Signatures / tank / boss anchors** keyed by old dex ids in `passives.js`
  (inert for new ids — they simply don't fire — so no crash, just unused).

## Scaling to 1,025 creatures

1. Add rows to the roster in `scripts/build-bestiary-sample.js` (or author
   `shared/bestiary.json` directly), keeping the entry shape.
2. Re-run the generator, re-run `scripts/seed-bestiary.js`.
3. Generate art: build family "anchor" pieces first, then pass each as
   `--style-ref` for the rest of that family — the single biggest consistency
   lever (see the reskin brief / `scripts/generate-art.js`).
4. Map the deep-content surfaces above onto the full roster.

## Non-negotiables

- Mechanics stay 1:1 with the upstream engine (Bleed is the one documented
  exception). `yarn test` must stay green.
- No Nintendo / Game Freak IP in the shipped build — ever.
- For any future monetization: re-evaluate the PolyForm Noncommercial license
  and the provenance of any AI-generated art style.
