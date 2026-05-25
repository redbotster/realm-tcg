# Realm TCG — Reskin Audit

End-to-end read of the codebase after the original-IP fantasy reskin. The
upstream engine was a mature Pokémon-themed TCG; this audit records what is now
IP-clean, what's intentionally unchanged, and what still needs work.

## Architecture (unchanged from upstream)

| Layer | Tech |
|---|---|
| Client | Vanilla JS ES modules, optional esbuild bundle |
| Server | Express 5, Node 22+ |
| Data | Supabase (Postgres + Auth) |
| State (MP) | Redis-backed HTTP polling + Socket.IO |
| Deploy | Vercel (Fluid Compute) / Fly.io (Dockerfile) |
| Tests | `node --test`, 555 unit/integration assertions |

The engine (`client/js/game.js`, `battle.js`, the 47-signature system in
`passives.js`, spells, items, boss phases) is untouched — the reskin is theme,
data, and copy only. The 555 tests are the canary proving that.

## IP posture — what was removed

The upstream's existential risk was Nintendo / Game Freak IP. This fork:

- **Deleted** the PokeAPI scraper, the live Pokédex seed, and cached-IP test
  fixtures; started a fresh git history.
- **Replaced all live external sprite/cry URLs.** No build path fetches
  Nintendo artwork at runtime any more — PokeAPI official-artwork and Showdown
  trainer-sprite URLs now resolve to local `/client/assets/...` paths.
- **Renamed** every user-facing "Pokémon / Pokédex / trainer / type" to
  creature / Bestiary / champion / school, and the DB table to `bestiary`.
- **Reskinned** creatures, the 18 schools, status effects, the 6 playable
  champions, the 4 boss champions, achievements, and brand copy to original IP.

No Nintendo / Game Freak / Pokémon Company IP remains in the shipped build.

## What's intentionally unchanged

- Damage formula, 18×18 effectiveness matrix (re-keyed only), ability /
  signature hooks, deck-builder limits, achievement triggers, matchmaking,
  room codes, passkey auth, Supabase schema shape (6 stats kept).
- Internal opaque ids (champion ability keys; the `pokemon`-era theme id inside
  `registry.js`, now `creature`) are kept as stable keys — never user-visible.

## What still needs work

- **Deep content pass** (depends on the full roster): story-mode chapters,
  reading-mode stories, daily boss/puzzle anchors, and the dex-id-keyed
  signatures in `passives.js` still reference the old roster. They are inert or
  placeholder for the curated 32-creature sample — no crashes, just unused or
  off-theme content.
- **Art.** Cards ship a neutral "artwork pending" placeholder.
  `scripts/generate-art.js` produces real art on demand (manual run).
- **Bestiary breadth.** 32 of a target 1,025. Extend via
  `scripts/build-bestiary-sample.js`.

## Risk notes

1. **Internal comments** still say "PokeAPI" / "Pokéball" in a few places and a
   `lastPokeIdx` local var exists — cosmetic, not shipped IP. Scrub opportunistically.
2. **Bleed** is a deliberate new mechanic on the Martial special; easy to tune
   or revert if it skews balance.
3. **License / monetization.** PolyForm Noncommercial is retained. Any
   commercial pivot needs a license review and a clean-room re-derivation of
   any AI-art style (see the reskin brief's ethics note).
