// scripts/generate-extras.js
// Generates the non-creature art — the 6 champion portraits and the landing
// hero banner — via Google Imagen, uploads them to the public Supabase Storage
// bucket, and prints the public URLs to wire into game.js / the landing.
//
//   GOOGLE_API_KEY=... node scripts/generate-extras.js            # all
//   GOOGLE_API_KEY=... node scripts/generate-extras.js champions  # just champs
//   GOOGLE_API_KEY=... node scripts/generate-extras.js hero
//
// Reads SUPABASE_URL / SUPABASE_SERVICE_KEY from .env. Manual-run only.

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const MODEL = process.env.GOOGLE_IMAGE_MODEL || "imagen-4.0-generate-001";
const BUCKET = process.env.STORAGE_BUCKET || "creatures";
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!KEY) { console.error("GOOGLE_API_KEY not set"); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error("Supabase creds missing (.env)"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// Shared painted-box-art style suffix (Variant A, portrait or wide).
const PAINTED =
  "Painted in late-1990s fantasy box-art style: traditional oil on board, " +
  "painterly realism in the Brandywine tradition, dramatic warm-cool lighting " +
  "(sunset gold and torchfire against cool teal-indigo shadow), strong " +
  "chiaroscuro, rim light on armor and skin, rich saturated earthy palette, " +
  "lavish ornament — etched runes, gem inlays, filigree. Mythic and noble in " +
  "tone, matte oil-paint finish, not digital-slick. No text, no logos, no UI.";

const CHAMP_STYLE = `Heroic half-body character portrait, three-quarter view, looking slightly down at the viewer, ornate gilt-framed composition. ${PAINTED} Aspect 3:4 portrait. --ar 3:4 --style raw`;

// keyed by the champion's internal id (matches game.js CHAMPIONS)
const CHAMPIONS = {
  brock:   "Thordak the Stonewarden, a stout grey-bearded dwarven paladin in rune-etched golden plate armor, planting an enormous round tower shield rimmed in gold, a warhammer at his hip, stern and immovable, deep-set determined eyes under a winged helm, glowing earth-rune sigils on the shield",
  misty:   "Lyralei the Tidecaller, an elegant high-elf mage in flowing blue-and-seafoam robes with silver filigree, conjuring a swirling orb of luminous water between her hands, a delicate silver circlet on flowing pale hair, serene and graceful, droplets suspended in the air",
  pikachu: "Zix the Sparkthief, a wiry grinning goblin tinker in cracked brass goggles and a patched leather coat, arcs of stolen blue-white lightning crackling between his clawed fingers and along copper gadgets strapped to his arms, mischievous yellow eyes, soot-smudged face",
  erika:   "Sylvanis Greenmother, a serene wood-elf druid crowned with branching antlers and living vines, robed in moss-green and bark, glowing green nature magic and drifting leaves swirling around her open hand, ancient gentle eyes, dappled forest light",
  sabrina: "Vael the Mindweaver, an austere human arcanist in deep-violet robes trimmed with silver sigils, eyes glowing with pale psionic light, luminous arcane glyphs and floating runes orbiting raised hands, hood drawn back, cold composed expression",
  lance:   "Drakkonir Wyrmlord, a towering dragonborn warlord with crimson-and-bronze scaled hide and a horned crest, clad in blackened dragon-scale plate, hefting a massive greatsword wreathed in curling dragonfire, fierce reptilian eyes, smoke rising",
};

const HERO =
  "An epic wide establishing vista of the Sundered Age: a shattered realm of " +
  "floating broken landmasses and ancient ruined towers drifting under a vast " +
  "stormy sky of gold and teal, a great dragon wheeling as a distant silhouette " +
  "in the clouds, shafts of warm sunset light breaking through, tiny banners and " +
  "figures implying immense scale, foreground crag in shadow. " + PAINTED +
  " Cinematic wide banner, aspect 16:9. --ar 16:9 --style raw";

async function imagen(prompt, aspect) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict?key=${KEY}`;
  const body = JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: aspect, personGeneration: "allow_all" } });
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    if (res.status === 429 && attempt < 2) {
      const txt = await res.text();
      const m = txt.match(/retry in ([\d.]+)s/i);
      const waitMs = Math.ceil((m ? parseFloat(m[1]) : 25) + 1) * 1000;
      console.warn(`  rate-limited, waiting ${Math.round(waitMs / 1000)}s…`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    if (!res.ok) throw new Error(`google ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const b64 = json.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error(`no image: ${JSON.stringify(json).slice(0, 160)}`);
    return Buffer.from(b64, "base64");
  }
}

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "10MB" });
}

async function upload(objectPath, bytes) {
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, { contentType: "image/webp", upsert: true });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

// Spell/item card art — a single iconic fantasy object/effect per spell,
// centered on a dark atmospheric ground, matching the painted style.
const SPELL_VIS = {
  freeze:       "a faceted frost-blue crystal vial swirling with freezing mist and rime",
  stun:         "a crackling rune-stone wreathed in arcs of white-blue lightning",
  heal:         "an ornate glass flask of luminous emerald healing elixir, glowing softly",
  defender:     "an ornate iron tower shield emblazoned with a glowing protective rune",
  evolve:       "a radiant chrysalis cracking open with golden transformative light",
  aoe:          "a great rune-carved stone slamming into the ground, a shockwave of cracked earth and dust",
  bolt:         "a single jagged bolt of lightning captured in a charged storm-javelin",
  "sleep-powder":"a drifting cloud of glowing green soporific spores from an open pouch",
  cleanse:      "an ornate phial of radiant holy water pouring a burst of purifying light",
  surge:        "an overcharged arcane rune-cell crackling with overflowing blue energy",
  scout:        "an ornate brass spyglass beside three fanned glowing scrying cards",
  phoenix:      "a brilliant phoenix rising in a spiral of flame from glowing ashes",
  burn:         "a sealed vial of churning liquid fire, flames licking its glass",
  shield:       "a glowing hexagonal ward-barrier of radiant blue light, an ornate buckler at its center",
  "mass-heal":  "a radiant fountain of healing light cascading over a marble altar",
  "power-strike":"a heroic greatsword raised and wreathed in surging golden might",
  counter:      "a mirrored ward-rune deflecting an incoming blade in a flash of light",
  "stop-time":  "an ornate golden hourglass with its sand frozen mid-fall, arcane glow around it",
  curse:        "a cursed obsidian idol leaking swirling violet hex-smoke and dark sigils",
  storm:        "a violent tempest of wind and rain captured churning inside a glass bottle",
  burst:        "an explosive fire-rune detonating in a blossom of flame and embers",
  "brave-strike":"a raised war-banner and a glowing gauntleted fist crackling with valor",
  refresh:      "a dew-laden sprig of glowing verdant leaves unfurling with renewing light",
  drain:        "a bat-winged dark sigil siphoning glowing red life-essence into a black chalice",
};
function spellPrompt(s) {
  const vis = SPELL_VIS[s.effect] || `a glowing magical relic representing ${s.name}`;
  return `A fantasy spell-card illustration: ${vis}. Single iconic object centered on a dark, ` +
    `atmospheric background with depth. ${PAINTED} Aspect 3:4 portrait. --ar 3:4 --style raw`;
}

async function main() {
  const which = process.argv[2] || "all";
  await ensureBucket();
  const results = {};

  if (which === "all" || which === "spells") {
    const { SPELL_CARDS } = require("../shared/spell-cards");
    const pubBase = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/spells`;
    let quotaHit = false;
    for (const s of SPELL_CARDS) {
      if (quotaHit) break;
      // Skip spells already generated (resume-friendly).
      const head = await fetch(`${pubBase}/${s.effect}.webp`, { method: "HEAD" }).catch(() => null);
      if (head && head.ok) { console.log(`· spell ${s.effect} already done`); continue; }
      try {
        const bytes = await imagen(spellPrompt(s), "3:4");
        const u = await upload(`spells/${s.effect}.webp`, bytes);
        results[`spell:${s.effect}`] = u;
        console.log(`✓ spell ${s.effect} (${s.name}) -> ${u}`);
      } catch (e) {
        if (/\b429\b|quota|RESOURCE_EXHAUSTED/i.test(e.message)) {
          console.error("  quota cap hit — stopping spells (will resume later)");
          quotaHit = true;
        } else {
          console.error(`✗ spell ${s.effect}: ${e.message}`);
        }
      }
    }
    if (quotaHit) process.exitCode = 3;
  }

  if (which === "all" || which === "champions") {
    for (const [id, subject] of Object.entries(CHAMPIONS)) {
      try {
        const bytes = await imagen(`${subject}. ${CHAMP_STYLE}`, "3:4");
        const u = await upload(`champions/${id}.webp`, bytes);
        results[`champion:${id}`] = u;
        console.log(`✓ champion ${id} -> ${u}`);
      } catch (e) { console.error(`✗ champion ${id}: ${e.message}`); }
    }
  }
  if (which === "all" || which === "hero") {
    try {
      const bytes = await imagen(HERO, "16:9");
      const u = await upload(`hero/banner.webp`, bytes);
      results["hero"] = u;
      console.log(`✓ hero -> ${u}`);
    } catch (e) { console.error(`✗ hero: ${e.message}`); }
  }

  console.log("\n--- URLs (wire these in) ---");
  console.log(JSON.stringify(results, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
