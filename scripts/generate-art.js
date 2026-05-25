// scripts/generate-art.js
// Card-art generator for the Bestiary. Reads each entry's `art_prompt` from
// shared/bestiary.json and renders it through a configurable image API, saving
// outputs to client/assets/creatures/<id>.webp and (optionally) updating
// bestiary.sprite_front in Supabase with a content hash for cache-busting.
//
// THIS SCRIPT IS NOT RUN BY CI OR THE BUILD. Run it manually so you can review
// cost and curate output:
//
//   IMAGE_PROVIDER=fal      FAL_KEY=...            node scripts/generate-art.js
//   IMAGE_PROVIDER=replicate REPLICATE_API_TOKEN=... REPLICATE_MODEL=owner/model:ver \
//                                                  node scripts/generate-art.js
//   IMAGE_PROVIDER=openai   OPENAI_API_KEY=...     node scripts/generate-art.js
//
// Flags:
//   --provider <fal|replicate|openai>  override IMAGE_PROVIDER
//   --style-ref <path|url>             reference image for style-locked gen
//                                      (fal: image_url + strength; replicate:
//                                      passed as `image`; openai: ignored)
//   --lora <id|url>                    LoRA to apply (fal/replicate only)
//   --only <ids>                       comma-separated creature ids (e.g. 1,7,32)
//   --limit <n>                        stop after n generations
//   --force                            regenerate even if the .webp exists
//   --concurrency <n>                  parallel requests (default 3)
//   --dry-run                          print what would happen, call no API
//
// The consistency strategy (see PLAN.md / the reskin brief): generate the
// family "anchor" pieces first, then pass each as --style-ref for the rest of
// that family — that single lever is what keeps 1,025 cards on-model.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

require("dotenv").config();

// ---------------------------------------------------------------- args/env
function parseArgs(argv) {
  const a = { concurrency: 3 };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const next = () => argv[++i];
    if (k === "--provider") a.provider = next();
    else if (k === "--style-ref") a.styleRef = next();
    else if (k === "--lora") a.lora = next();
    else if (k === "--only") a.only = next().split(",").map((s) => parseInt(s.trim(), 10));
    else if (k === "--limit") a.limit = parseInt(next(), 10);
    else if (k === "--force") a.force = true;
    else if (k === "--concurrency") a.concurrency = parseInt(next(), 10);
    else if (k === "--dry-run") a.dryRun = true;
    else throw new Error(`Unknown flag: ${k}`);
  }
  a.provider = a.provider || process.env.IMAGE_PROVIDER || "fal";
  return a;
}

const ARGS = parseArgs(process.argv);
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "client", "assets", "creatures");
const BESTIARY = path.join(ROOT, "shared", "bestiary.json");

// If a style-ref path is local, read it once as a data URL the adapters can use.
function loadStyleRef(ref) {
  if (!ref) return null;
  if (/^https?:\/\//.test(ref)) return ref; // already a URL
  const buf = fs.readFileSync(ref);
  const ext = path.extname(ref).slice(1) || "png";
  return `data:image/${ext};base64,${buf.toString("base64")}`;
}

// ---------------------------------------------------------------- adapters
// Each adapter returns a Buffer of image bytes for a given prompt. They all
// honor opts.styleRef and opts.lora where the provider supports it.

async function falAdapter(prompt, opts) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");
  const model = process.env.FAL_MODEL || "fal-ai/flux/dev";
  const body = {
    prompt,
    image_size: "portrait_4_3",
    num_images: 1,
    output_format: "webp",
  };
  if (opts.styleRef) { body.image_url = opts.styleRef; body.strength = 0.65; }
  if (opts.lora) body.loras = [{ path: opts.lora, scale: 1 }];

  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`fal ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const url = json.images?.[0]?.url;
  if (!url) throw new Error("fal returned no image url");
  return Buffer.from(await (await fetch(url)).arrayBuffer());
}

async function replicateAdapter(prompt, opts) {
  const token = process.env.REPLICATE_API_TOKEN;
  const model = process.env.REPLICATE_MODEL; // "owner/name:version"
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  if (!model) throw new Error("REPLICATE_MODEL is not set (owner/name:version)");
  const version = model.split(":")[1] || model;

  const input = { prompt, aspect_ratio: "3:4", output_format: "webp" };
  if (opts.styleRef) input.image = opts.styleRef;
  if (opts.lora) input.lora_weights = opts.lora;

  // Create prediction, then poll until it succeeds.
  let res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ version, input }),
  });
  if (!res.ok) throw new Error(`replicate ${res.status}: ${await res.text()}`);
  let pred = await res.json();
  while (pred.status === "starting" || pred.status === "processing") {
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${token}` } });
    pred = await res.json();
  }
  if (pred.status !== "succeeded") throw new Error(`replicate ${pred.status}: ${pred.error}`);
  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  return Buffer.from(await (await fetch(url)).arrayBuffer());
}

async function openaiAdapter(prompt, opts) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  if (opts.styleRef || opts.lora) {
    console.warn("  (openai adapter ignores --style-ref / --lora)");
  }
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt,
      size: "1024x1536", // portrait
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("openai returned no image data");
  return Buffer.from(b64, "base64"); // PNG bytes; saved as .webp (see note below)
}

const ADAPTERS = { fal: falAdapter, replicate: replicateAdapter, openai: openaiAdapter };

// ---------------------------------------------------------------- supabase
// Optional: update sprite_front with a cache-busting hash if creds are present.
function maybeSupabase() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const { createClient } = require("@supabase/supabase-js");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

async function recordHash(supabase, id, hash) {
  if (!supabase) return;
  const sprite_front = `/client/assets/creatures/${id}.webp?v=${hash.slice(0, 8)}`;
  const { error } = await supabase.from("bestiary").update({ sprite_front }).eq("id", id);
  if (error) console.warn(`  DB update failed for #${id}: ${error.message}`);
}

// ---------------------------------------------------------------- runner
async function pool(items, n, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.max(1, n) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const adapter = ADAPTERS[ARGS.provider];
  if (!adapter) throw new Error(`Unknown provider "${ARGS.provider}" (fal|replicate|openai)`);

  const all = JSON.parse(fs.readFileSync(BESTIARY, "utf8"));
  let work = all.filter((c) => c.art_prompt);
  if (ARGS.only) work = work.filter((c) => ARGS.only.includes(c.id));
  if (!ARGS.force) {
    work = work.filter((c) => !fs.existsSync(path.join(OUT_DIR, `${c.id}.webp`)));
  }
  if (ARGS.limit) work = work.slice(0, ARGS.limit);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const styleRef = loadStyleRef(ARGS.styleRef);
  const supabase = maybeSupabase();

  console.log(
    `provider=${ARGS.provider} creatures=${work.length} concurrency=${ARGS.concurrency}` +
      `${styleRef ? " style-ref=on" : ""}${ARGS.lora ? ` lora=${ARGS.lora}` : ""}` +
      `${ARGS.dryRun ? " [DRY RUN]" : ""}`,
  );
  if (work.length === 0) { console.log("Nothing to generate."); return; }

  let done = 0, failed = 0;
  await pool(work, ARGS.concurrency, async (c) => {
    const file = path.join(OUT_DIR, `${c.id}.webp`);
    if (ARGS.dryRun) {
      console.log(`#${c.id} ${c.name}\n  -> ${path.relative(ROOT, file)}\n  prompt: ${c.art_prompt.slice(0, 90)}...`);
      done++;
      return;
    }
    try {
      const bytes = await adapter(c.art_prompt, { styleRef, lora: ARGS.lora });
      fs.writeFileSync(file, bytes);
      const hash = crypto.createHash("sha256").update(bytes).digest("hex");
      await recordHash(supabase, c.id, hash);
      done++;
      console.log(`✓ #${c.id} ${c.name} (${(bytes.length / 1024) | 0} KB)`);
    } catch (err) {
      failed++;
      console.error(`✗ #${c.id} ${c.name}: ${err.message}`);
    }
  });

  console.log(`\nDone. generated=${done} failed=${failed}`);
  // NOTE: adapters that return PNG/JPEG (openai) are written with a .webp
  // extension as-is. If you need true webp, request webp output from the
  // provider (fal/replicate do above) or post-process with `sharp`.
}

main().catch((err) => { console.error(err); process.exit(1); });
