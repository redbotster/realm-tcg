// Elemental school effectiveness chart (mirrors the Gen 6+ 18-type chart).
// CHART[attacker][defender] = multiplier (2, 0.5, 0, or 1).
// Lookups treat missing entries as 1×.
//
// Schools (renamed from the source type chart, matrix preserved verbatim):
//   martial fire tide storm verdant frost brawl plague earth sky
//   mind swarm stone spectral wyrm shadow iron radiant

export const TYPES = [
  "martial", "fire", "tide", "storm", "verdant", "frost",
  "brawl", "plague", "earth", "sky", "mind", "swarm",
  "stone", "spectral", "wyrm", "shadow", "iron", "radiant",
];

export const TYPE_COLORS = {
  martial:  "#A8A77A",
  fire:     "#EE8130",
  tide:     "#6390F0",
  storm:    "#F7D02C",
  verdant:  "#7AC74C",
  frost:    "#96D9D6",
  brawl:    "#C22E28",
  plague:   "#A33EA1",
  earth:    "#E2BF65",
  sky:      "#A98FF3",
  mind:     "#F95587",
  swarm:    "#A6B91A",
  stone:    "#B6A136",
  spectral: "#735797",
  wyrm:     "#6F35FC",
  shadow:   "#705746",
  iron:     "#B7B7CE",
  radiant:  "#D685AD",
};

// rows = attacker, cols = defender. Only non-1 entries listed.
const RAW = {
  martial:  { stone: 0.5, spectral: 0, iron: 0.5 },
  fire:     { fire: 0.5, tide: 0.5, verdant: 2, frost: 2, swarm: 2, stone: 0.5, wyrm: 0.5, iron: 2 },
  tide:     { fire: 2, tide: 0.5, verdant: 0.5, earth: 2, stone: 2, wyrm: 0.5 },
  storm:    { tide: 2, storm: 0.5, verdant: 0.5, earth: 0, sky: 2, wyrm: 0.5 },
  verdant:  { fire: 0.5, tide: 2, verdant: 0.5, plague: 0.5, earth: 2, sky: 0.5, swarm: 0.5, stone: 2, wyrm: 0.5, iron: 0.5 },
  frost:    { fire: 0.5, tide: 0.5, verdant: 2, frost: 0.5, earth: 2, sky: 2, wyrm: 2, iron: 0.5 },
  brawl:    { martial: 2, frost: 2, plague: 0.5, sky: 0.5, mind: 0.5, swarm: 0.5, stone: 2, spectral: 0, shadow: 2, iron: 2, radiant: 0.5 },
  plague:   { verdant: 2, plague: 0.5, earth: 0.5, stone: 0.5, spectral: 0.5, iron: 0, radiant: 2 },
  earth:    { fire: 2, storm: 2, verdant: 0.5, plague: 2, sky: 0, swarm: 0.5, stone: 2, iron: 2 },
  sky:      { storm: 0.5, verdant: 2, brawl: 2, swarm: 2, stone: 0.5, iron: 0.5 },
  mind:     { brawl: 2, plague: 2, mind: 0.5, shadow: 0, iron: 0.5 },
  swarm:    { fire: 0.5, verdant: 2, brawl: 0.5, plague: 0.5, sky: 0.5, mind: 2, spectral: 0.5, shadow: 2, iron: 0.5, radiant: 0.5 },
  stone:    { fire: 2, frost: 2, brawl: 0.5, earth: 0.5, sky: 2, swarm: 2, iron: 0.5 },
  spectral: { martial: 0, mind: 2, spectral: 2, shadow: 0.5 },
  wyrm:     { wyrm: 2, iron: 0.5, radiant: 0 },
  shadow:   { brawl: 0.5, mind: 2, spectral: 2, shadow: 0.5, radiant: 0.5 },
  iron:     { fire: 0.5, tide: 0.5, storm: 0.5, frost: 2, stone: 2, iron: 0.5, radiant: 2 },
  radiant:  { fire: 0.5, brawl: 2, plague: 0.5, wyrm: 2, shadow: 2, iron: 0.5 },
};

// Damage multiplier for an attack of `attackerType` against a defender with
// `defenderTypes`. Stacks across the defender's schools, but capped at 2x in
// both directions — this is a fairness departure from the official games,
// where 4x and 0.25x are possible. In our TCG, card HP is small (1-25), so
// uncapped 4x super-effective frequently one-shots a defender. The 2x cap
// keeps school-matchups meaningful without making turn-1 KOs trivial.
export function getMultiplier(attackerType, defenderTypes) {
  if (!attackerType || !defenderTypes || defenderTypes.length === 0) return 1;
  const row = RAW[attackerType];
  if (!row) return 1;
  let mult = 1;
  let immune = false;
  for (const t of defenderTypes) {
    if (t in row) {
      if (row[t] === 0) immune = true;
      mult *= row[t];
    }
  }
  if (immune) return 0;
  // Cap at [0.5, 2] outside of immunity.
  return Math.max(0.5, Math.min(2, mult));
}

// Human-readable verdict for an effectiveness multiplier (used by toasts).
export function describeMultiplier(mult) {
  if (mult === 0) return { text: "No effect!", tone: "miss" };
  if (mult >= 4) return { text: "Devastating!", tone: "super" };
  if (mult >= 2) return { text: "Super effective!", tone: "super" };
  if (mult <= 0.25) return { text: "Barely scratched...", tone: "weak" };
  if (mult < 1) return { text: "Not very effective.", tone: "weak" };
  return { text: "", tone: "normal" };
}
