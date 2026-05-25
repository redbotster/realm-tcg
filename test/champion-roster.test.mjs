// The 6 playable champions: reskinned to original identities, mechanics keys
// intact, portraits valid schools, art resolves to Storage URLs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAMPIONS, championSpriteUrl } from "../client/js/game.js";
import { TYPES } from "../client/js/type-chart.js";

const SCHOOLS = new Set(TYPES);
const ids = Object.keys(CHAMPIONS);

test("there are exactly 6 playable champions", () => {
  assert.equal(ids.length, 6);
});

test("champion display names/titles are reskinned (no Pokémon-era names)", () => {
  const banned = /\b(brock|misty|sabrina|erika|lance|lt\.?\s*surge|pikachu)\b/i;
  for (const id of ids) {
    const c = CHAMPIONS[id];
    assert.ok(c.name && c.title && c.bio, `champion ${id} missing name/title/bio`);
    assert.ok(!banned.test(c.name), `champion ${id} name not reskinned: ${c.name}`);
    assert.ok(!banned.test(c.title), `champion ${id} title not reskinned: ${c.title}`);
  }
});

test("each champion portrait is one of the 18 schools", () => {
  for (const id of ids) {
    assert.ok(SCHOOLS.has(CHAMPIONS[id].portrait),
      `champion ${id} portrait not a valid school: ${CHAMPIONS[id].portrait}`);
  }
});

test("championSpriteUrl resolves champion art to a Storage URL", () => {
  for (const id of ids) {
    const u = championSpriteUrl(id);
    assert.ok(/^https:\/\/\S+\/champions\/\S+\.webp$/.test(u),
      `champion ${id} sprite url unexpected: ${u}`);
  }
});
