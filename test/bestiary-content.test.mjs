// Integrity tests for the generated Bestiary content (shared/bestiary.json)
// and the reskin invariants. Guards the content pipeline: a bad generator
// edit, an invalid school/family, or a duplicate id/slug fails here before it
// can reach the DB seed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TYPES } from "../client/js/type-chart.js";

const bestiary = JSON.parse(
  readFileSync(new URL("../shared/bestiary.json", import.meta.url), "utf8"),
);

const FAMILIES = new Set([
  "Humanoid", "Dragon", "Undead", "Demon", "Beast", "Elemental", "Aberration", "Fey",
]);
const SCHOOLS = new Set(TYPES); // the 18 elemental schools

test("bestiary has the full 200-creature roster", () => {
  assert.equal(bestiary.length, 200);
});

test("ids are unique and contiguous 1..200", () => {
  const ids = bestiary.map((c) => c.id).sort((a, b) => a - b);
  assert.equal(new Set(ids).size, 200, "ids must be unique");
  assert.equal(ids[0], 1);
  assert.equal(ids[199], 200);
});

test("slugs and names are unique (DB slug has a UNIQUE constraint)", () => {
  assert.equal(new Set(bestiary.map((c) => c.slug)).size, 200, "slugs unique");
  assert.equal(new Set(bestiary.map((c) => c.name)).size, 200, "names unique");
});

test("every creature has a valid family", () => {
  for (const c of bestiary) {
    assert.ok(FAMILIES.has(c.creature_family), `#${c.id} bad family: ${c.creature_family}`);
  }
});

test("every creature has 1-2 valid schools (from the 18-school chart)", () => {
  for (const c of bestiary) {
    assert.ok(Array.isArray(c.schools) && c.schools.length >= 1 && c.schools.length <= 2,
      `#${c.id} must have 1-2 schools`);
    for (const s of c.schools) assert.ok(SCHOOLS.has(s), `#${c.id} invalid school: ${s}`);
  }
});

test("every creature has tier 1-4 and six positive stats", () => {
  const STAT_KEYS = ["hp", "attack", "defense", "sp_attack", "sp_defense", "speed"];
  for (const c of bestiary) {
    assert.ok(c.tier >= 1 && c.tier <= 4, `#${c.id} bad tier ${c.tier}`);
    for (const k of STAT_KEYS) {
      assert.ok(Number.isFinite(c[k]) && c[k] > 0, `#${c.id} bad stat ${k}=${c[k]}`);
    }
  }
});

test("every creature carries a non-trivial art_prompt and flavor", () => {
  for (const c of bestiary) {
    assert.ok(typeof c.art_prompt === "string" && c.art_prompt.length > 120,
      `#${c.id} missing/short art_prompt`);
    assert.ok(typeof c.flavor_text === "string" && c.flavor_text.length > 0,
      `#${c.id} missing flavor_text`);
  }
});

test("art prompts contain no Pokémon-era IP terms", () => {
  const banned = /pok[eé]mon|pok[eé]dex|trainer|pikachu|charizard/i;
  for (const c of bestiary) {
    assert.ok(!banned.test(c.art_prompt), `#${c.id} art_prompt has banned term`);
    assert.ok(!banned.test(c.name), `#${c.id} name has banned term`);
    assert.ok(!banned.test(c.flavor_text), `#${c.id} flavor has banned term`);
  }
});

test("all 18 schools appear somewhere in the roster", () => {
  const seen = new Set();
  for (const c of bestiary) c.schools.forEach((s) => seen.add(s));
  for (const s of TYPES) assert.ok(seen.has(s), `school not represented: ${s}`);
});

test("all 8 families are represented", () => {
  const seen = new Set(bestiary.map((c) => c.creature_family));
  for (const f of FAMILIES) assert.ok(seen.has(f), `family not represented: ${f}`);
});
