// Champion battles — preset legendary-heavy decks that play like end-of-
// region bosses. Difficulty is Hard with the AI's special-use cranked up,
// and win rewards are a 5-pick offer with at least one guaranteed
// legendary in the pool.
//
//   GET /api/champion/list           -> list of champion meta
//   GET /api/champion/:id/deck       -> 30-card deck for that champion
//
// The champion deck builder uses a curated id list per champion, falling
// back to creature Showdown-style typed picks if a curated id isn't in the
// Bestiary (so it always returns 30 cards).

const { toCard } = require("../shared/deck-builder");

const CHAMPIONS = {
  // Boss champions for "Fight a Champion". Internal ids kept as opaque keys.
  // coreIds reference the curated Bestiary; the builder falls back to typeFilter
  // / tier-balanced picks for any id not present, so decks always reach 30.
  lance: {
    id: "lance",
    name: "Vorthak, the Dragon Tyrant",
    title: "Wyrmlord of the Ember Peaks",
    portrait: "wyrm",
    bio: "Master of the great wyrms; his roost is carved into a living volcano.",
    typeFilter: ["wyrm", "sky"],
    coreIds: [5, 6, 7, 8, 19], // Cinder Drakeling, Ashscale Wyvern, Pyraxis, Glacith, Skyreach Griffon
  },
  cynthia: {
    id: "cynthia",
    name: "Archmagus Selene",
    title: "the Balanced Crown",
    portrait: "mind",
    bio: "A scholar-queen who answers every strategy with a measured one.",
    typeFilter: null,
    coreIds: [7, 8, 11, 15, 26, 32], // a spread of legends across schools
  },
  steven: {
    id: "steven",
    name: "Ferrovax the Ironclad",
    title: "the Iron Magnate",
    portrait: "iron",
    bio: "Warden of the deep forges; fields only constructs of living iron and stone.",
    typeFilter: ["iron"],
    coreIds: [4, 28, 29], // Thurgrim Ironbeard, Stone Gargoyle, Iron Golem Sentinel
  },
  red: {
    id: "red",
    name: "The Nameless Wanderer",
    title: "Champion of the First Age",
    portrait: "martial",
    bio: "A silent legend who has bested every hall. None know their true name.",
    typeFilter: null,
    coreIds: [3, 7, 12, 18, 25, 29, 32], // an all-rounder gauntlet
  },
};

async function buildChampionDeck(supabase, champion) {
  const seen = new Set();
  const deck = [];
  // First pass — curated core ids (each once, then any duplicates as 2nd copy).
  const { data: coreRows } = await supabase
    .from("bestiary")
    .select("*")
    .in("id", champion.coreIds);
  const byId = new Map((coreRows || []).map((r) => [r.id, r]));
  // 2 copies of each core (10 × 2 = 20).
  for (const id of champion.coreIds) {
    const row = byId.get(id);
    if (!row) continue;
    deck.push(toCard(row));
    deck.push(toCard(row));
    seen.add(id);
  }
  // Fill the remaining 10 with type-filtered or tier-balanced extras.
  const need = 30 - deck.length;
  let { data: pool } = champion.typeFilter
    ? await supabase
        .from("bestiary")
        .select("*")
        .overlaps("types", champion.typeFilter)
        .order("hp", { ascending: false })
        .limit(200)
    : await supabase
        .from("bestiary")
        .select("*")
        .order("hp", { ascending: false })
        .limit(300);
  pool = (pool || []).filter((r) => !seen.has(r.id));
  // Shuffle deterministically-enough via Math.random for filler.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < pool.length && deck.length < 30; i++) {
    deck.push(toCard(pool[i]));
    seen.add(pool[i].id);
  }
  return deck.slice(0, 30);
}

function mount(app, supabase) {
  app.get("/api/champion/list", (_req, res) => {
    res.json({
      champions: Object.values(CHAMPIONS).map((c) => ({
        id: c.id, name: c.name, title: c.title, portrait: c.portrait, bio: c.bio,
      })),
    });
  });

  app.get("/api/champion/:id/deck", async (req, res) => {
    const champ = CHAMPIONS[req.params.id];
    if (!champ) return res.status(404).json({ error: "Unknown champion" });
    if (!supabase) return res.status(503).json({ error: "DB unavailable" });
    try {
      const deck = await buildChampionDeck(supabase, champ);
      res.json({ champion: champ, deck });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { mount };
