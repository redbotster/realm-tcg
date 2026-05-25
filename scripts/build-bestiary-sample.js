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
  { id: 1, name: "Mudtusk Whelp", family: "Humanoid", schools: ["martial"], tier: 1, stats: [45,55,45,30,30,50], flavor: "The runt of the warren, all nerve and no caution. It bites first and counts its teeth later.", visual: "a scrawny knee-high goblin scout with mottled mossy-green skin and oversized pointed ears, dressed in mismatched scavenged leather and rusted buckles; it clutches a notched flint dagger far too large for its hands, hunched and wary, darting amber eyes and a snaggle-toothed grin beneath a pushed-back tattered fur hood, mud caked to its bare feet", biome: "mistwood hollow" },
  { id: 2, name: "Bog Goblin Raider", family: "Humanoid", schools: ["martial","plague"], tier: 2, flavor: "Raiders of the fenlands coat their blades in marsh-rot, so even a glancing cut festers for days.", stats: [60,75,55,40,45,65], visual: "a wiry adult goblin raider with sickly olive skin over corded muscle, clad in bone-studded boiled leather hung with shrunken trophies and reeking pouches; it wields twin rusted hand-hatchets that drip greenish marsh-rot, green ochre war-paint streaked across a snarling tattooed face, swamp reeds and dried mud crusting its shins", biome: "sunken jungle ruin" },
  { id: 3, name: "Grommash Warhowl", family: "Humanoid", schools: ["martial","brawl"], tier: 3, flavor: "His warcry has broken shield-walls before his axe ever lands. The clans follow the howl.", stats: [95,110,80,50,60,75], visual: "a towering grey-green orc warlord with a brutal jutting underbite and tusks, shoulders wrapped in spiked blackened-iron pauldrons and a wolf-pelt mantle; he hefts an enormous rune-burned greataxe across one shoulder, twin thick braids bound in iron rings, crimson war-paint slashed across deep battle-scars, caught mid-bellow with neck veins straining", biome: "volcanic ridge" },
  { id: 4, name: "Thurgrim Ironbeard", family: "Humanoid", schools: ["iron","earth"], tier: 3, abilities: ["sturdy"], flavor: "An ancestor-sworn dwarf defender. Where he plants his shield, the line does not move.", stats: [110,90,120,55,60,40], visual: "a broad, immovable dwarf defender in interlocking dwarf-forged plate etched with glowing ancestral runes, planting an enormous round tower shield rimmed in hammered gold; a magnificent braided beard ringed with golden clasps spills over the breastplate, deep-set resolute eyes beneath a winged helm, gauntleted fists like anvils", biome: "frost-spire pass" },

  // --- Dragon ---
  { id: 5, name: "Cinder Drakeling", family: "Dragon", schools: ["fire","wyrm"], tier: 1, flavor: "Newly hatched and already arrogant. The smoke curling from its snout is mostly bluff. Mostly.", stats: [50,60,45,55,40,55], visual: "a fox-sized crimson hatchling drake with overlapping ember-orange scales that glow at the edges like cooling lava, stubby horns and half-furled translucent wings veined with gold; it perches on a charred rock, neck arched in a tiny defiant snarl, a thin curl of smoke rising from one nostril, molten cracks tracing its underbelly", biome: "volcanic ridge" },
  { id: 6, name: "Ashscale Wyvern", family: "Dragon", schools: ["fire","sky"], tier: 2, flavor: "It hunts the thermals above the calderas, folding its wings to fall on prey like a burning spear.", stats: [75,85,60,65,55,80], visual: "a lean, sinewy crimson wyvern with ash-darkened scales and broad leathery bat-wings spread wide, a barbed tail-stinger raised over its back; muscular hind talons clutch a jagged spire, jaws parted in a hissing snarl baring rows of fangs, heat-shimmer rising off its hide against a smoke-streaked sky", biome: "volcanic ridge" },
  { id: 7, name: "Pyraxis the Emberwyrm", family: "Dragon", schools: ["fire","wyrm"], tier: 4, legendary: true, flavor: "Older than the kingdoms whose crowns line its hoard. To wake it is to end an age in fire.", stats: [130,125,95,120,90,85], visual: "a colossal ancient red dragon coiled atop a hoard of molten gold and shattered crowns, vast wings half-mantled; obsidian-black horns sweep back from a craggy scarred skull, every overlapping scale rimmed with living fire, molten light bleeding between them, blazing golden eyes and a low plume of flame escaping its maw, immense and regal", biome: "volcanic ridge" },
  { id: 8, name: "Glacith Frostwyrm", family: "Dragon", schools: ["frost","wyrm"], tier: 4, legendary: true, flavor: "It sleeps beneath the glacier and dreams in slow centuries. Its breath freezes the question on your lips.", stats: [130,110,100,125,95,80], visual: "a vast pale ice-blue ancient dragon with crystalline frost-rimed spines and translucent sail-like wings frosted at the edges; rime sheets its scaled flanks, pale vapour rolls from its parted jaws, piercing white eyes glint cold, coiled within a vaulted glacial cavern hung with blue ice and refracted light", biome: "frost-spire pass" },

  // --- Undead ---
  { id: 9, name: "Rattle Thrall", family: "Undead", schools: ["shadow"], tier: 1, flavor: "Bound bone and borrowed malice. It remembers nothing of life but the swing of a sword.", stats: [40,50,40,30,30,45], visual: "a crude reanimated skeleton draped in flaking rusted chainmail and rotted straps, jaw hanging agape; it clutches a chipped, pitted shortsword in bony fingers, a faint sickly green soul-glow flickering deep in its empty eye sockets, posture lurching and unbalanced, wisps of grave-dust trailing from its joints", biome: "shattered planar void" },
  { id: 10, name: "Grave Revenant", family: "Undead", schools: ["shadow","spectral"], tier: 2, flavor: "It rose to finish an oath the grave interrupted. The mist that leaks from its armor is what's left of its rage.", stats: [70,80,60,55,50,55], visual: "an armored revenant knight in corroded, dented plate over a tattered heraldic surcoat, pale spectral mist seeping from every gap and visor-slit; it grips a notched rune-etched longsword that glows faint violet, hollow points of cold light for eyes, standing grim and unnaturally still amid drifting fog", biome: "mistwood hollow" },
  { id: 11, name: "Mortis the Lich-King", family: "Undead", schools: ["shadow","mind"], tier: 4, legendary: true, flavor: "He traded his heartbeat for centuries and his name for a phylactery. Now he collects both from others.", stats: [115,95,90,135,90,70], visual: "a gaunt skeletal lich crowned in cold black iron, swathed in voluminous midnight-blue robes trimmed with tarnished silver sigils; he raises a tall staff capped with a captured soul-gem pulsing pale green, ribbons of necrotic energy curling around skeletal fingers, twin points of cold flame burning in his sockets, towering and imperious", biome: "shattered planar void" },
  { id: 12, name: "Sanguine Vampire Lord", family: "Undead", schools: ["shadow","spectral"], tier: 3, flavor: "Courtly, patient, and very old. He will compliment your courage before he drains it.", stats: [95,100,75,90,70,95], visual: "a tall, gaunt aristocratic vampire lord in regal crimson and black brocade with a high collar, pale waxen skin and slicked dark hair; clawed pale hands raised, fangs bared in a refined smile, eyes glinting blood-red, a long cloak whose lower edge dissolves into a flurry of bats against a moonlit ruin", biome: "mistwood hollow" },

  // --- Demon ---
  { id: 13, name: "Pit Imp", family: "Demon", schools: ["fire","shadow"], tier: 1, flavor: "A minor nuisance from below, sent to fetch, spy, and snicker. The hellfire in its palm is real, though.", stats: [42,55,40,50,40,60], visual: "a small impish demon with cherry-red skin, two curved horns, leathery bat-wings and a long barbed tail, perched on a scorched stone; it grins wickedly, balancing a flicker of orange hellfire on one clawed fingertip, mischievous yellow eyes and a forked tongue, embers drifting around it", biome: "shattered planar void" },
  { id: 14, name: "Hellhound Stalker", family: "Demon", schools: ["fire","brawl"], tier: 2, flavor: "It tracks by the scent of fear and breathes the embers of the pit. Both heads always agree on the kill.", stats: [70,90,55,50,45,85], visual: "a hulking coal-black two-headed hound with cracked obsidian hide glowing molten-orange along the fissures, both maws baring ember-lit fangs and dripping fire; muscles taut in a low prowling crouch, smoke curling from its nostrils and the spiked ridge of its spine, eyes like burning coals", biome: "volcanic ridge" },
  { id: 15, name: "Balethorn Pit Fiend", family: "Demon", schools: ["fire","shadow"], tier: 4, legendary: true, flavor: "A general of the lower planes. Mortal armies are, to it, a brief and tedious paperwork problem.", stats: [125,130,100,110,85,80], visual: "a towering muscular pit fiend with deep-red and charred-black hide wreathed in flame, immense ribbed bat-wings flared and great curving horns scraping the smoke-choked sky; it cracks a flaming whip in one hand and hefts a serrated black blade in the other, hooved and tusked, glowing fissures of lava webbing its body, eyes molten gold", biome: "shattered planar void" },
  { id: 16, name: "Soulbinder Succubus", family: "Demon", schools: ["shadow","mind"], tier: 3, flavor: "She does not take what isn't offered. She is simply very, very good at making you offer.", stats: [85,80,65,110,75,90], visual: "an elegant winged fiend with dusky violet skin, slender curved horns and dark feathered-membrane wings, draped in flowing black silks and tarnished gold jewellery; she beckons with clawed grace, glowing amethyst eyes half-lidded, ribbons of dark shadow-energy curling from her fingertips through candlelit gloom", biome: "shattered planar void" },

  // --- Beast ---
  { id: 17, name: "Dire Wolf Pup", family: "Beast", schools: ["martial"], tier: 1, flavor: "Already the size of a war-hound and twice as hungry. The pack is never far behind.", stats: [48,55,42,28,30,65], visual: "an oversized shaggy wolf pup the size of a calf, thick grey-and-white fur dusted with frost, oversized paws and ears not yet grown into; bright amber eyes, tongue lolling between needle teeth, caught mid-pounce in fresh snow with breath fogging the cold air", biome: "frost-spire pass" },
  { id: 18, name: "Frostmane Direwolf", family: "Beast", schools: ["frost","martial"], tier: 2, flavor: "It runs down elk across frozen leagues and brings winter in its wake. Its howl carries for miles.", stats: [75,90,60,40,45,90], visual: "a massive snow-white direwolf the size of a horse, mid-lunge with fangs bared and hackles raised, ice crystals crusting its bristling mane and shoulders; pale glacial-blue eyes, steaming breath, powerful muscles rippling beneath thick fur, paws throwing up snow across a windswept ridge", biome: "frost-spire pass" },
  { id: 19, name: "Skyreach Griffon", family: "Beast", schools: ["sky","martial"], tier: 3, abilities: ["intimidate"], flavor: "Half eagle, half lion, wholly proud. It bonds for life and stoops from the sun without warning.", stats: [90,95,70,55,60,105], visual: "a noble griffon with the head, foretalons and broad feathered wings of a golden eagle and the muscular tawny hindquarters and tufted tail of a lion; wings spread wide against a bright sky, razor talons gleaming, fierce amber eye and hooked beak, plumage shading from white throat to russet flanks, perched proud on a crag", biome: "frost-spire pass" },
  { id: 20, name: "Manticore Stalker", family: "Beast", schools: ["martial","plague"], tier: 3, flavor: "Lion's body, scorpion's tail, a mouth of human teeth. It is said to ask riddles. It is said to be lying.", stats: [95,105,75,60,55,90], visual: "a tawny lion-bodied manticore with a segmented chitinous scorpion tail arched and dripping venom over its back, ribbed bat-wings half-spread; an unsettling near-human face ringed by a dark mane, jaws crowded with rows of needle fangs, prowling low and predatory through ruin-choked jungle", biome: "sunken jungle ruin" },
  { id: 21, name: "Krakenspawn", family: "Beast", schools: ["tide"], tier: 2, abilities: ["torrent"], flavor: "The smallest of its kind could still pull a longship under. It is not yet the largest of its kind.", stats: [80,70,75,75,55,50], visual: "a young kraken with a bulbous mottled violet-and-teal mantle and a single great glassy eye, eight coiling barnacle-crusted tentacles breaching black water; rows of pale suckers and faint blue-green bioluminescent spots pulse along its limbs, spray and foam churning around it beneath a drowned ruin", biome: "sunken jungle ruin" },

  // --- Elemental ---
  { id: 22, name: "Cinder Mote", family: "Elemental", schools: ["fire"], tier: 1, flavor: "A spark with intent. Feed it and it grows; ignore it and your tent is gone.", stats: [40,50,35,55,40,55], visual: "a small living flame-spirit shaped like a hovering teardrop of fire, a white-hot molten core fading to orange and trailing wisps of smoke; two bright ember-points for eyes and tiny flickering arms of flame, drifting sparks spiralling off it, casting a warm glow on charred ground", biome: "volcanic ridge" },
  { id: 23, name: "Magma Colossus", family: "Elemental", schools: ["fire","earth"], tier: 3, abilities: ["blaze"], flavor: "It wakes when the mountain is angry and walks until the mountain is calm. The journey is rarely gentle.", stats: [120,100,110,70,65,40], visual: "a lumbering humanoid colossus built of cracked blackened basalt plates with rivers of glowing molten magma seething through every fissure, fists like boulders and shoulders crowned with cooling crags; it strides forward heavily, heat-haze and embers rising, a furnace glow pouring from the cracks in its chest and joints", biome: "volcanic ridge" },
  { id: 24, name: "Tideborn Sylph", family: "Elemental", schools: ["tide","sky"], tier: 2, flavor: "A spirit of storm-spray and sea-wind, here and gone like a breaking wave. Sailors pray it stays playful.", stats: [65,60,55,80,60,85], visual: "a graceful translucent spirit of water and wind in a vaguely feminine form, body of shifting blue-green water shot through with foam, ribbons of mist and suspended droplets trailing from her arms and streaming hair; serene glowing eyes, half-dissolving into spray as she drifts above churning surf", biome: "sunken jungle ruin" },
  { id: 25, name: "Ancient Treant", family: "Elemental", schools: ["verdant","earth"], tier: 3, abilities: ["overgrow"], flavor: "It has stood so long it has forgotten it can move. When it remembers, the forest moves with it.", stats: [125,95,115,75,70,30], visual: "a towering ancient treant with a gnarled trunk-body armored in thick mossy bark, root-like legs and great branching arms hung with leaves and a beard of hanging moss; faint amber runes glow within a deep knothole face, small birds nesting in its boughs, dappled forest light filtering around it", biome: "mistwood hollow" },
  { id: 26, name: "Storm Djinn", family: "Elemental", schools: ["storm","sky"], tier: 4, legendary: true, flavor: "Bound once to a lamp, now bound to nothing. It answers no wishes and grants only thunder.", stats: [110,110,85,120,90,100], visual: "a vast genie whose lower body trails off into a swirling vortex of bruised storm-cloud, his broad torso formed of churning vapour crackling with forked blue-white lightning; arms folded, eyes blazing like white arc-light, brass storm-cuffs at his wrists, a tempest of cloud and electricity spiralling around him over a desolate moonlit waste", biome: "lunar wasteland" },

  // --- Aberration ---
  { id: 27, name: "Carrion Swarm", family: "Aberration", schools: ["swarm","plague"], tier: 1, flavor: "Ten thousand carrion beetles wearing the shape of a man. It came for the dead and stayed for the living.", stats: [55,50,40,45,40,60], visual: "a vaguely humanoid silhouette made entirely of thousands of crawling black carrion beetles and stinging flies held in loose formation, its edges constantly dissolving into a buzzing cloud; gaps reveal glints of bone and chitin, a faint sickly haze around it, swarming over the mossy stones of a drowned ruin", biome: "sunken jungle ruin" },
  { id: 28, name: "Stone Gargoyle", family: "Aberration", schools: ["stone","iron"], tier: 2, abilities: ["rough-skin"], flavor: "It perches as a statue for decades, patient as masonry, until the wrong thief climbs the wrong wall.", stats: [80,75,95,45,50,55], visual: "a crouched winged gargoyle carved from weathered grey granite streaked with lichen and old iron staining, leathery stone wings folded tight and clawed hands gripping a parapet; a snarling horned beast-face just beginning to crack and stir to life, faint amber light kindling behind its stone eyes, frost on the battlements behind", biome: "frost-spire pass" },
  { id: 29, name: "Iron Golem Sentinel", family: "Aberration", schools: ["iron"], tier: 3, abilities: ["sturdy","bulletproof"], flavor: "It has one order, carved into the rune-core in its chest, and it has kept it for six hundred years.", stats: [130,100,130,50,60,35], visual: "a massive humanoid construct assembled from riveted dark-iron plates and thick bronze bolts, blocky and immense with hammer-like fists; a rune-etched core glows hot orange behind a grille in its chest, twin slit-eyes burning the same hue, steam venting from its shoulder joints, standing sentinel in a frost-rimed hall", biome: "frost-spire pass" },
  { id: 30, name: "Hex Hag", family: "Aberration", schools: ["shadow","plague"], tier: 2, flavor: "She trades in names, teeth, and firstborns, and her bargains are always, technically, honoured.", stats: [70,65,55,95,60,55], visual: "a hunched, emaciated green-skinned hag in filthy tattered rags, wild grey hair and a long crooked nose covered in warts, gnarled clawed fingers cradling a bubbling charm of bone and twine; a sickly greenish aura clings to her, yellow eyes glinting with malice through the mist of a gloomy hollow", biome: "mistwood hollow" },

  // --- Fey ---
  { id: 31, name: "Glimmer Pixie", family: "Fey", schools: ["radiant","sky"], tier: 1, flavor: "A thumb-sized spark of mischief and light. Helpful exactly as often as it is a menace.", stats: [38,45,35,55,45,75], visual: "a thumb-sized luminous pixie with delicate iridescent dragonfly wings and a tiny lithe body wrapped in petal-and-leaf garb, trailing a comet-tail of golden motes of light; an impish grin and oversized bright eyes, hovering in a shaft of warm light amid the ferns of a misty hollow", biome: "mistwood hollow" },
  { id: 32, name: "Seraph of Dawn", family: "Fey", schools: ["radiant"], tier: 4, legendary: true, flavor: "It does not hate the dark. It simply ends it, the way sunrise ends a long and terrible night.", stats: [115,105,95,125,95,95], visual: "a towering armored celestial with six great white feathered wings, clad in radiant gold-and-ivory plate that catches the light; it lifts aloft a sword of pure white light, a ring-halo of gold burning behind its serene, stern face, golden radiance streaming outward against a pale dawn sky, both beautiful and terrible", biome: "lunar wasteland" },
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
