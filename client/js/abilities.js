// Special abilities derived from a creature's primary type. Each card gets
// (a) a free "Basic" attack and (b) one type-flavored "Special" that costs
// extra energy when used. Specials apply a damage multiplier and may
// guarantee a status effect.
//
// Pure data + helpers; no DOM, no game-state.
//
// Public shape returned by abilitiesFor(card):
//   [
//     { id, name, type, energyCost: 0, damageMult: 1, status: null, desc },
//     { id, name, type, energyCost: 2, damageMult: 1.4, status: "burn", desc },
//   ]

const TYPE_SPECIALS = {
  martial:  { name: "Crushing Blow",   energyCost: 1, damageMult: 1.4, status: "bleed",    desc: "+40% dmg, causes Bleed" },
  fire:     { name: "Inferno",         energyCost: 2, damageMult: 1.5, status: "burn",     desc: "+50% dmg, guaranteed Burn" },
  tide:     { name: "Tidal Crash",     energyCost: 2, damageMult: 1.5, status: null,       desc: "+50% damage" },
  storm:    { name: "Thunderclap",     energyCost: 2, damageMult: 1.4, status: "stun", desc: "+40% dmg, guaranteed Stun" },
  verdant:  { name: "Thornlash",       energyCost: 1, damageMult: 1.3, status: null,       desc: "+30% damage, low cost" },
  frost:    { name: "Glacial Burst",   energyCost: 2, damageMult: 1.4, status: "stun", desc: "+40% dmg, may Stun" },
  brawl:    { name: "Flurry Strike",   energyCost: 2, damageMult: 1.7, status: null,       desc: "+70% raw damage" },
  plague:   { name: "Venom Bite",      energyCost: 1, damageMult: 1.1, status: "burn",     desc: "Light dmg, guaranteed Poison" },
  earth:    { name: "Seismic Slam",    energyCost: 2, damageMult: 1.5, status: null,       desc: "+50% damage" },
  sky:      { name: "Diving Talon",    energyCost: 1, damageMult: 1.2, status: null,       desc: "Cheap, +20% dmg, ignores defense" },
  mind:     { name: "Psychic Lance",   energyCost: 2, damageMult: 1.3, status: "sleep",    desc: "+30% dmg, guaranteed Sleep" },
  swarm:    { name: "Devouring Swarm", energyCost: 1, damageMult: 1.1, status: null,       desc: "+10% dmg, heals attacker for half" },
  stone:    { name: "Avalanche",       energyCost: 2, damageMult: 1.4, status: null,       desc: "+40% damage" },
  spectral: { name: "Spirit Bolt",     energyCost: 2, damageMult: 1.4, status: null,       desc: "+40% dmg, ignores defense" },
  wyrm:     { name: "Wyrmfire Breath", energyCost: 3, damageMult: 1.9, status: null,       desc: "+90% damage, expensive" },
  shadow:   { name: "Shadow Rend",     energyCost: 2, damageMult: 1.5, status: null,       desc: "+50% damage" },
  iron:     { name: "Iron Maul",       energyCost: 2, damageMult: 1.4, status: null,       desc: "+40% damage" },
  radiant:  { name: "Radiant Beam",    energyCost: 2, damageMult: 1.4, status: null,       desc: "+40% damage" },
};

export function basicAbility(card) {
  const type = card.types?.[0] || "martial";
  return {
    id: "basic",
    name: "Strike",
    type,
    energyCost: 0,
    damageMult: 1,
    status: null,
    desc: "Standard attack",
  };
}

export function specialAbility(card) {
  const type = card.types?.[0] || "martial";
  const spec = TYPE_SPECIALS[type] || TYPE_SPECIALS.normal;
  return {
    id: "special",
    type,
    name: spec.name,
    energyCost: spec.energyCost,
    damageMult: spec.damageMult,
    status: spec.status,
    desc: spec.desc,
  };
}

export function abilitiesFor(card) {
  return [basicAbility(card), specialAbility(card)];
}

// Look up an ability by id for a card (used by the battle resolver).
export function abilityById(card, id) {
  if (id === "special") return specialAbility(card);
  return basicAbility(card);
}

// Cheap predicate used by UI: can the actor afford this ability right now?
export function canAfford(player, ability) {
  return player.energy >= (ability.energyCost || 0);
}
