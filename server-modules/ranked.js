// Ranked ladder + monthly seasons + async PvP.
//
// Rating lives on users.rank_points (current season) with users.rank_best and
// users.ranked_season. Async PvP: a ranked match is the player's deck vs a
// SNAPSHOT of another player's deck, piloted by the local AI — so the ladder
// is populated even with zero concurrent players.
//
//   GET  /api/ranked/me          -> { points, tier, nextTier, season, best }
//   GET  /api/ranked/opponent    -> { name, cardIds[] } a ghost deck to fight
//   POST /me/ranked/result       -> { won, streak } -> updates points, returns delta
//   GET  /api/ranked/leaderboard -> top players this season

// --- Pure rating logic (unit-tested) ---------------------------------------

const TIERS = [
  { name: "Bronze",   min: 0 },
  { name: "Silver",   min: 100 },
  { name: "Gold",     min: 250 },
  { name: "Platinum", min: 500 },
  { name: "Diamond",  min: 1000 },
  { name: "Master",   min: 1750 },
  { name: "Legend",   min: 2500 },
];

function tierForPoints(points) {
  let cur = TIERS[0];
  for (const t of TIERS) if (points >= t.min) cur = t;
  const next = TIERS.find((t) => t.min > points) || null;
  return { name: cur.name, floor: cur.min, next: next ? { name: next.name, at: next.min } : null };
}

// Win/loss point delta. Wins scale a little with win-streak (capped); losses
// are gentler than wins so the ladder trends upward with skill. Floored at 0.
function applyResult(points, won, streak = 0) {
  const before = Math.max(0, points | 0);
  let delta;
  if (won) delta = 25 + Math.min(10, Math.max(0, streak) * 2);
  else delta = -18;
  const after = Math.max(0, before + delta);
  return { before, after, delta: after - before };
}

// Monthly season key, e.g. "2026-S05".
function seasonKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-S${m}`;
}

// Soft reset when a new season starts: demote toward the middle so high ranks
// re-climb but keep some progress.
function seasonReset(points) {
  return Math.floor(Math.max(0, points | 0) * 0.4);
}

// --- HTTP wiring ------------------------------------------------------------

function mount(app, supabase, deps = {}) {
  const { ensureBestiary, buildDeck } = deps;

  // Normalise the user's row to the current season (soft-reset if stale).
  async function currentRow(userId) {
    const { data } = await supabase
      .from("users")
      .select("rank_points, rank_best, ranked_season")
      .eq("id", userId)
      .maybeSingle();
    const season = seasonKey();
    let points = data?.rank_points || 0;
    let best = data?.rank_best || 0;
    if ((data?.ranked_season || null) !== season) {
      points = seasonReset(points);
      await supabase.from("users")
        .update({ rank_points: points, ranked_season: season })
        .eq("id", userId);
    }
    return { points, best, season };
  }

  app.get("/api/ranked/me", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Sign in required." });
    const { points, best, season } = await currentRow(req.user.id);
    res.json({ points, best, season, tier: tierForPoints(points) });
  });

  app.get("/api/ranked/opponent", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Sign in required." });
    const dex = ensureBestiary ? await ensureBestiary() : [];
    const byId = new Map(dex.map((c) => [c.id, c]));
    // Pull other players' decks and pick one at random as the async-PvP ghost.
    const { data: decks } = await supabase
      .from("decks")
      .select("name, card_ids, user_id, users(display_name)")
      .neq("user_id", req.user.id)
      .limit(50);
    const pool = (decks || []).filter((d) => Array.isArray(d.card_ids) && d.card_ids.length >= 20);
    if (pool.length) {
      const ghost = pool[Math.floor(Math.random() * pool.length)];
      const cards = ghost.card_ids.map((id) => byId.get(id)).filter(Boolean);
      if (cards.length >= 20) {
        return res.json({
          name: ghost.users?.display_name
            ? `${ghost.users.display_name}'s ${ghost.name || "deck"}`
            : "Rival Champion",
          cards, ghost: true,
        });
      }
    }
    // No usable opponent decks yet — generate a fresh challenger deck.
    const cards = buildDeck && dex.length ? buildDeck(dex, {}) : [];
    res.json({ name: "Wandering Challenger", cards, ghost: false });
  });

  app.post("/me/ranked/result", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Sign in required." });
    const won = !!req.body?.won;
    const streak = Math.max(0, Math.min(20, Number(req.body?.streak) || 0));
    const { points, best } = await currentRow(req.user.id);
    const r = applyResult(points, won, streak);
    const newBest = Math.max(best, r.after);
    await supabase.from("users")
      .update({ rank_points: r.after, rank_best: newBest, ranked_season: seasonKey() })
      .eq("id", req.user.id);
    res.json({ points: r.after, delta: r.delta, best: newBest, tier: tierForPoints(r.after) });
  });

  app.get("/api/ranked/leaderboard", async (req, res) => {
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 25));
    const { data, error } = await supabase
      .from("users")
      .select("id, display_name, rank_points, rank_best")
      .eq("ranked_season", seasonKey())
      .gt("rank_points", 0)
      .order("rank_points", { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    const rows = (data || []).map((u, i) => ({
      pos: i + 1,
      display_name: u.display_name,
      points: u.rank_points,
      tier: tierForPoints(u.rank_points).name,
    }));
    res.json({ season: seasonKey(), rows });
  });
}

module.exports = { mount, tierForPoints, applyResult, seasonKey, seasonReset, TIERS };
