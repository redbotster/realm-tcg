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
    if (res.status === 429 && attempt < 8) {
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

async function main() {
  const which = process.argv[2] || "all";
  await ensureBucket();
  const results = {};

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
