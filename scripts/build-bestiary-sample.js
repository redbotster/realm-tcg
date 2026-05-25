// Authoring generator for the curated sample Bestiary.
//
// Emits shared/bestiary.json from the compact ROSTER table below, composing
// each entry's `art_prompt` from the shared Variant A (descriptive, no named
// artist) template so the whole set stays stylistically consistent. This is
// the seam for scaling to the full 1,025-entry roster later: add rows to
// ROSTER, re-run `node scripts/build-bestiary-sample.js`, re-seed.
//
//   node scripts/build-bestiary-sample.js   # writes shared/bestiary.json
//
// Each emitted entry matches the `bestiary` table shape (6 stats) plus the
// reskin taxonomy (creature_family, tier) and an art_prompt for the pipeline.

const fs = require("fs");
const path = require("path");

const TIER_DESCRIPTOR = {
  1: "young initiate",
  2: "seasoned warrior",
  3: "elite champion",
  4: "ancient and dread",
};

// Visual qualities of late-1990s painted fantasy box art, described WITHOUT
// naming a living/real artist (Variant A — the safe default).
const STYLE_BLOCK =
  "Heroic three-quarter pose, shot slightly from below, centered triangular " +
  "composition. Painted in late-1990s fantasy box-art style: traditional oil " +
  "on board, painterly realism in the Brandywine tradition, visible brushwork " +
  "blended smooth. Dramatic single-source warm lighting (sunset gold or " +
  "torchfire) cutting through cool atmospheric shadow, strong chiaroscuro, " +
  "glowing rim light on edges of armor and scales. Rich saturated earthy " +
  "palette — warm amber and ochre on the figure, cool teal and indigo in the " +
  "haze behind. Lavish ornamentation: etched runes, gem inlays, filigreed " +
  "armor, layered scale, woven cloth — every rivet visible. Atmospheric " +
  "background of {biome} dissolving into mist and ember-haze, tiny distant " +
  "silhouettes implying scale. Mythic and noble in tone. No text, no logos, " +
  "no watermarks, no UI overlay. Matte oil-paint finish, not digital-slick. " +
  "Aspect 3:4 portrait. --ar 3:4 --style raw --stylize 400";

function composeArtPrompt(c) {
  const [primary, secondary] = c.schools;
  const secClause = secondary ? `, attuned also to the ${secondary} school` : "";
  const desc = TIER_DESCRIPTOR[c.tier];
  const article = /^[aeiou]/i.test(desc) ? "An" : "A";
  const subject =
    `${article} ${desc} ${c.name}, a ${c.family} of the ${primary} ` +
    `school${secClause}, depicted as a single full-body fantasy trading card ` +
    `illustration. ${c.visual}.`;
  return `${subject} ${STYLE_BLOCK.replace("{biome}", c.biome)}`;
}

const slug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// id, name, family, schools[1-2], tier, [hp,atk,def,spa,spd,spe], legendary,
// abilities (PokeAPI-style names the passive engine recognises, optional),
// flavor (card blurb), visual (art subject), biome
const ROSTER = [
  // --- Humanoid ---
  { id: 1, name: "Mudtusk Whelp", family: "Humanoid", schools: ["martial"], tier: 1, stats: [45,55,45,30,30,50], flavor: "The runt of the warren, all nerve and no caution. It bites first and counts its teeth later.", visual: "a runty green goblin scout in patched leather, clutching a notched dagger, ears pricked", biome: "mistwood hollow" },
  { id: 2, name: "Bog Goblin Raider", family: "Humanoid", schools: ["martial","plague"], tier: 2, flavor: "Raiders of the fenlands coat their blades in marsh-rot, so even a glancing cut festers for days.", stats: [60,75,55,40,45,65], visual: "a wiry goblin raider in bone-studded armor, twin rusted hatchets, warpaint across the face", biome: "sunken jungle ruin" },
  { id: 3, name: "Grommash Warhowl", family: "Humanoid", schools: ["martial","brawl"], tier: 3, flavor: "His warcry has broken shield-walls before his axe ever lands. The clans follow the howl.", stats: [95,110,80,50,60,75], visual: "a towering orc warlord in spiked iron plate, hefting a rune-burned greataxe over one shoulder, twin braids and warpaint", biome: "volcanic ridge" },
  { id: 4, name: "Thurgrim Ironbeard", family: "Humanoid", schools: ["iron","earth"], tier: 3, abilities: ["sturdy"], flavor: "An ancestor-sworn dwarf defender. Where he plants his shield, the line does not move.", stats: [110,90,120,55,60,40], visual: "a broad dwarven defender in interlocking dwarf-forged plate, a tower shield etched with ancestor-runes, braided beard ringed in gold", biome: "frost-spire pass" },

  // --- Dragon ---
  { id: 5, name: "Cinder Drakeling", family: "Dragon", schools: ["fire","wyrm"], tier: 1, flavor: "Newly hatched and already arrogant. The smoke curling from its snout is mostly bluff. Mostly.", stats: [50,60,45,55,40,55], visual: "a fox-sized red hatchling drake, scales like embers, wings half-furled, a curl of smoke from its snout", biome: "volcanic ridge" },
  { id: 6, name: "Ashscale Wyvern", family: "Dragon", schools: ["fire","sky"], tier: 2, flavor: "It hunts the thermals above the calderas, folding its wings to fall on prey like a burning spear.", stats: [75,85,60,65,55,80], visual: "a lean crimson wyvern mid-snarl, leathery wings spread, barbed tail-stinger raised", biome: "volcanic ridge" },
  { id: 7, name: "Pyraxis the Emberwyrm", family: "Dragon", schools: ["fire","wyrm"], tier: 4, legendary: true, flavor: "Older than the kingdoms whose crowns line its hoard. To wake it is to end an age in fire.", stats: [130,125,95,120,90,85], visual: "a colossal ancient red dragon coiled on a hoard of molten gold, horns like obsidian, eyes blazing, every scale rimmed in fire", biome: "volcanic ridge" },
  { id: 8, name: "Glacith Frostwyrm", family: "Dragon", schools: ["frost","wyrm"], tier: 4, legendary: true, flavor: "It sleeps beneath the glacier and dreams in slow centuries. Its breath freezes the question on your lips.", stats: [130,110,100,125,95,80], visual: "a vast pale-blue ancient dragon, frost rimming its spines, breath fogging the air, glacial cavern behind", biome: "frost-spire pass" },

  // --- Undead ---
  { id: 9, name: "Rattle Thrall", family: "Undead", schools: ["shadow"], tier: 1, flavor: "Bound bone and borrowed malice. It remembers nothing of life but the swing of a sword.", stats: [40,50,40,30,30,45], visual: "a crude animated skeleton in rusted chain, jaw agape, clutching a chipped sword, faint green soul-glow in its sockets", biome: "shattered planar void" },
  { id: 10, name: "Grave Revenant", family: "Undead", schools: ["shadow","spectral"], tier: 2, flavor: "It rose to finish an oath the grave interrupted. The mist that leaks from its armor is what's left of its rage.", stats: [70,80,60,55,50,55], visual: "an armored revenant knight, tattered surcoat, spectral mist leaking from gaps in its corroded plate, runic blade", biome: "mistwood hollow" },
  { id: 11, name: "Mortis the Lich-King", family: "Undead", schools: ["shadow","mind"], tier: 4, legendary: true, flavor: "He traded his heartbeat for centuries and his name for a phylactery. Now he collects both from others.", stats: [115,95,90,135,90,70], visual: "a skeletal lich crowned in cold iron, robes of midnight, a staff capped with a captured soul-gem, swirling necrotic energy", biome: "shattered planar void" },
  { id: 12, name: "Sanguine Vampire Lord", family: "Undead", schools: ["shadow","spectral"], tier: 3, flavor: "Courtly, patient, and very old. He will compliment your courage before he drains it.", stats: [95,100,75,90,70,95], visual: "a gaunt vampire lord in regal crimson and black, clawed hands, fangs bared, a cloak that frays into bats", biome: "mistwood hollow" },

  // --- Demon ---
  { id: 13, name: "Pit Imp", family: "Demon", schools: ["fire","shadow"], tier: 1, flavor: "A minor nuisance from below, sent to fetch, spy, and snicker. The hellfire in its palm is real, though.", stats: [42,55,40,50,40,60], visual: "a small horned imp with bat wings and a barbed tail, grinning, a flick of hellfire in its palm", biome: "shattered planar void" },
  { id: 14, name: "Hellhound Stalker", family: "Demon", schools: ["fire","brawl"], tier: 2, flavor: "It tracks by the scent of fear and breathes the embers of the pit. Both heads always agree on the kill.", stats: [70,90,55,50,45,85], visual: "a coal-black two-headed hellhound, embers in its maw, muscles taut, smoke curling from its hide", biome: "volcanic ridge" },
  { id: 15, name: "Balethorn Pit Fiend", family: "Demon", schools: ["fire","shadow"], tier: 4, legendary: true, flavor: "A general of the lower planes. Mortal armies are, to it, a brief and tedious paperwork problem.", stats: [125,130,100,110,85,80], visual: "a towering winged pit fiend wreathed in flame, a flaming whip and serrated blade, horns scraping a smoke-choked sky", biome: "shattered planar void" },
  { id: 16, name: "Soulbinder Succubus", family: "Demon", schools: ["shadow","mind"], tier: 3, flavor: "She does not take what isn't offered. She is simply very, very good at making you offer.", stats: [85,80,65,110,75,90], visual: "an elegant winged fiend in dark silks, eyes glowing, beckoning with clawed grace, shadow-tendrils curling", biome: "shattered planar void" },

  // --- Beast ---
  { id: 17, name: "Dire Wolf Pup", family: "Beast", schools: ["martial"], tier: 1, flavor: "Already the size of a war-hound and twice as hungry. The pack is never far behind.", stats: [48,55,42,28,30,65], visual: "a shaggy oversized wolf pup, frost on its fur, amber eyes, snow-dusted paws", biome: "frost-spire pass" },
  { id: 18, name: "Frostmane Direwolf", family: "Beast", schools: ["frost","martial"], tier: 2, flavor: "It runs down elk across frozen leagues and brings winter in its wake. Its howl carries for miles.", stats: [75,90,60,40,45,90], visual: "a massive snow-white direwolf mid-lunge, breath steaming, ice crusting its mane", biome: "frost-spire pass" },
  { id: 19, name: "Skyreach Griffon", family: "Beast", schools: ["sky","martial"], tier: 3, abilities: ["intimidate"], flavor: "Half eagle, half lion, wholly proud. It bonds for life and stoops from the sun without warning.", stats: [90,95,70,55,60,105], visual: "a noble griffon with eagle fore and lion hind, wings spread against the sun, talons gleaming", biome: "frost-spire pass" },
  { id: 20, name: "Manticore Stalker", family: "Beast", schools: ["martial","plague"], tier: 3, flavor: "Lion's body, scorpion's tail, a mouth of human teeth. It is said to ask riddles. It is said to be lying.", stats: [95,105,75,60,55,90], visual: "a lion-bodied manticore with a barbed scorpion tail and rows of fangs, bat wings, prowling low", biome: "sunken jungle ruin" },
  { id: 21, name: "Krakenspawn", family: "Beast", schools: ["tide"], tier: 2, abilities: ["torrent"], flavor: "The smallest of its kind could still pull a longship under. It is not yet the largest of its kind.", stats: [80,70,75,75,55,50], visual: "a young kraken, mottled purple, coiling tentacles breaching dark water, bioluminescent spots glowing", biome: "sunken jungle ruin" },

  // --- Elemental ---
  { id: 22, name: "Cinder Mote", family: "Elemental", schools: ["fire"], tier: 1, flavor: "A spark with intent. Feed it and it grows; ignore it and your tent is gone.", stats: [40,50,35,55,40,55], visual: "a small living flame-spirit with ember eyes, drifting sparks, a core of white heat", biome: "volcanic ridge" },
  { id: 23, name: "Magma Colossus", family: "Elemental", schools: ["fire","earth"], tier: 3, abilities: ["blaze"], flavor: "It wakes when the mountain is angry and walks until the mountain is calm. The journey is rarely gentle.", stats: [120,100,110,70,65,40], visual: "a lumbering humanoid of cracked basalt and glowing magma veins, fists like boulders", biome: "volcanic ridge" },
  { id: 24, name: "Tideborn Sylph", family: "Elemental", schools: ["tide","sky"], tier: 2, flavor: "A spirit of storm-spray and sea-wind, here and gone like a breaking wave. Sailors pray it stays playful.", stats: [65,60,55,80,60,85], visual: "a graceful water-and-wind spirit, translucent blue, ribbons of mist and droplets trailing", biome: "sunken jungle ruin" },
  { id: 25, name: "Ancient Treant", family: "Elemental", schools: ["verdant","earth"], tier: 3, abilities: ["overgrow"], flavor: "It has stood so long it has forgotten it can move. When it remembers, the forest moves with it.", stats: [125,95,115,75,70,30], visual: "a towering ancient treant, bark armored and moss-bearded, glowing runes in its trunk-hollow, birds nesting in its boughs", biome: "mistwood hollow" },
  { id: 26, name: "Storm Djinn", family: "Elemental", schools: ["storm","sky"], tier: 4, legendary: true, flavor: "Bound once to a lamp, now bound to nothing. It answers no wishes and grants only thunder.", stats: [110,110,85,120,90,100], visual: "a vast genie of crackling storm-cloud and lightning, arms folded, eyes like white arc-light, a tempest swirling around it", biome: "lunar wasteland" },

  // --- Aberration ---
  { id: 27, name: "Carrion Swarm", family: "Aberration", schools: ["swarm","plague"], tier: 1, flavor: "Ten thousand carrion beetles wearing the shape of a man. It came for the dead and stayed for the living.", stats: [55,50,40,45,40,60], visual: "a roiling cloud of carrion beetles and stinging flies coalesced into a crude humanoid shape", biome: "sunken jungle ruin" },
  { id: 28, name: "Stone Gargoyle", family: "Aberration", schools: ["stone","iron"], tier: 2, abilities: ["rough-skin"], flavor: "It perches as a statue for decades, patient as masonry, until the wrong thief climbs the wrong wall.", stats: [80,75,95,45,50,55], visual: "a crouched winged gargoyle of weathered grey stone, wings tucked, eyes flickering to life", biome: "frost-spire pass" },
  { id: 29, name: "Iron Golem Sentinel", family: "Aberration", schools: ["iron"], tier: 3, abilities: ["sturdy","bulletproof"], flavor: "It has one order, carved into the rune-core in its chest, and it has kept it for six hundred years.", stats: [130,100,130,50,60,35], visual: "a massive humanoid construct of riveted iron plates, a rune-lit core in its chest, glowing eye-slits", biome: "frost-spire pass" },
  { id: 30, name: "Hex Hag", family: "Aberration", schools: ["shadow","plague"], tier: 2, flavor: "She trades in names, teeth, and firstborns, and her bargains are always, technically, honoured.", stats: [70,65,55,95,60,55], visual: "a hunched green-skinned hag in rags, clutching a bubbling charm, warts and crooked fingers, a sickly aura", biome: "mistwood hollow" },

  // --- Fey ---
  { id: 31, name: "Glimmer Pixie", family: "Fey", schools: ["radiant","sky"], tier: 1, flavor: "A thumb-sized spark of mischief and light. Helpful exactly as often as it is a menace.", stats: [38,45,35,55,45,75], visual: "a tiny luminous pixie with dragonfly wings, trailing motes of golden light, a mischievous grin", biome: "mistwood hollow" },
  { id: 32, name: "Seraph of Dawn", family: "Fey", schools: ["radiant"], tier: 4, legendary: true, flavor: "It does not hate the dark. It simply ends it, the way sunrise ends a long and terrible night.", stats: [115,105,95,125,95,95], visual: "a towering armored angel with great feathered wings, a sword of pure light, a halo of gold, serene and terrible", biome: "lunar wasteland" },
];

function buildEntry(c) {
  return {
    id: c.id,
    name: c.name,
    slug: slug(c.name),
    creature_family: c.family,
    schools: c.schools,        // mapped to the `types` text[] column by the seed
    tier: c.tier,
    hp: c.stats[0],
    attack: c.stats[1],
    defense: c.stats[2],
    sp_attack: c.stats[3],
    sp_defense: c.stats[4],
    speed: c.stats[5],
    abilities: c.abilities || [],
    flavor_text: c.flavor,
    is_legendary: !!c.legendary,
    is_mythical: false,
    art_prompt: composeArtPrompt(c),
  };
}

const entries = ROSTER.map(buildEntry);

// Integrity checks so a bad edit fails loudly rather than seeding garbage.
const ids = new Set();
const SCHOOLS = new Set([
  "martial","fire","tide","storm","verdant","frost","brawl","plague","earth",
  "sky","mind","swarm","stone","spectral","wyrm","shadow","iron","radiant",
]);
const FAMILIES = new Set([
  "Humanoid","Dragon","Undead","Demon","Beast","Elemental","Aberration","Fey",
]);
for (const e of entries) {
  if (ids.has(e.id)) throw new Error(`duplicate id ${e.id}`);
  ids.add(e.id);
  if (!FAMILIES.has(e.creature_family)) throw new Error(`bad family on #${e.id}: ${e.creature_family}`);
  if (!e.schools.length || e.schools.length > 2) throw new Error(`#${e.id} needs 1-2 schools`);
  for (const s of e.schools) if (!SCHOOLS.has(s)) throw new Error(`#${e.id} bad school: ${s}`);
  if (e.tier < 1 || e.tier > 4) throw new Error(`#${e.id} bad tier`);
}

const out = path.join(__dirname, "..", "shared", "bestiary.json");
fs.writeFileSync(out, JSON.stringify(entries, null, 2) + "\n");
console.log(`Wrote ${entries.length} creatures to ${path.relative(path.join(__dirname, ".."), out)}`);

// Coverage summary (handy when extending the roster).
const byFam = {};
const schoolsSeen = new Set();
for (const e of entries) {
  byFam[e.creature_family] = (byFam[e.creature_family] || 0) + 1;
  e.schools.forEach((s) => schoolsSeen.add(s));
}
console.log("Per family:", byFam);
console.log("Schools covered:", schoolsSeen.size, "/ 18");
console.log("Legendaries:", entries.filter((e) => e.is_legendary).length);
