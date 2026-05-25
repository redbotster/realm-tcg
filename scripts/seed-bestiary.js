// scripts/seed-bestiary.js
// Loads the original-IP creatures from shared/bestiary.json and upserts them
// into the `bestiary` table in Supabase. No scraping, no external IP — the
// data is authored locally (see scripts/build-bestiary-sample.js). Idempotent:
// re-running won't duplicate rows (upsert on id).
//
// Usage:
//   1. Create a free Supabase project at https://supabase.com
//   2. Run scripts/schema.sql (+ scripts/schema-accounts.sql) in the SQL Editor
//   3. Copy .env.example -> .env and fill SUPABASE_URL + SUPABASE_SERVICE_KEY
//   4. yarn && node scripts/seed-bestiary.js

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "\nMissing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.\n" +
      "Copy .env.example to .env and fill in your Supabase credentials.\n",
  );
  process.exit(1);
}

const BESTIARY_PATH = path.join(__dirname, "..", "shared", "bestiary.json");
const PLACEHOLDER_ART = "/client/assets/creatures/_placeholder.svg";
const BATCH_SIZE = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Map an authored bestiary entry to a `bestiary` table row. `schools` maps to
// the `types` text[] column (the engine still keys off `card.types`). Art is a
// shared placeholder until scripts/generate-art.js produces per-creature art.
function toRow(c) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    types: c.schools,
    hp: c.hp,
    attack: c.attack,
    defense: c.defense,
    sp_attack: c.sp_attack,
    sp_defense: c.sp_defense,
    speed: c.speed,
    creature_family: c.creature_family,
    tier: c.tier ?? 1,
    abilities: c.abilities || [],
    sprite_front: c.sprite_front || PLACEHOLDER_ART,
    sprite_back: null,
    cry_url: null,
    height_m: null,
    weight_kg: null,
    flavor_text: c.flavor_text || null,
    generation: c.generation ?? 1,
    is_legendary: !!c.is_legendary,
    is_mythical: !!c.is_mythical,
  };
}

async function upsertBatch(rows) {
  const { error } = await supabase
    .from("bestiary")
    .upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function main() {
  const entries = JSON.parse(fs.readFileSync(BESTIARY_PATH, "utf8"));
  if (!Array.isArray(entries) || entries.length === 0) {
    console.error(`No entries found in ${BESTIARY_PATH}. Run build-bestiary-sample.js first.`);
    process.exit(1);
  }

  console.log(`Seeding ${entries.length} creatures into the bestiary table...`);
  const rows = entries.map(toRow);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    let attempt = 0;
    while (true) {
      try {
        await upsertBatch(chunk);
        break;
      } catch (err) {
        attempt++;
        if (attempt > 5) {
          console.error("\nUpsert failed after retries:", err.message);
          throw err;
        }
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
    process.stdout.write(`  upserted ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
  }

  const { count, error: countErr } = await supabase
    .from("bestiary")
    .select("*", { count: "exact", head: true });
  if (countErr) console.error("\nCould not query row count:", countErr.message);
  else console.log(`\nRows in bestiary table: ${count}`);

  // Per-family breakdown.
  const families = [...new Set(entries.map((e) => e.creature_family))];
  console.log("\nPer-family counts:");
  for (const fam of families) {
    const { count: fc } = await supabase
      .from("bestiary")
      .select("*", { count: "exact", head: true })
      .eq("creature_family", fam);
    console.log(`  ${fam}: ${fc}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
