// Ranked ladder rating math (server-modules/ranked.js).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { tierForPoints, applyResult, seasonKey, seasonReset } = require("../server-modules/ranked");

test("tierForPoints maps points to the right tier", () => {
  assert.equal(tierForPoints(0).name, "Bronze");
  assert.equal(tierForPoints(99).name, "Bronze");
  assert.equal(tierForPoints(100).name, "Silver");
  assert.equal(tierForPoints(250).name, "Gold");
  assert.equal(tierForPoints(500).name, "Platinum");
  assert.equal(tierForPoints(1000).name, "Diamond");
  assert.equal(tierForPoints(2500).name, "Legend");
  assert.equal(tierForPoints(99999).name, "Legend");
});

test("tier exposes the next threshold (null at the top)", () => {
  assert.deepEqual(tierForPoints(0).next, { name: "Silver", at: 100 });
  assert.equal(tierForPoints(3000).next, null);
});

test("applyResult: win gains 25, loss -18, floored at 0", () => {
  assert.equal(applyResult(100, true).delta, 25);
  assert.equal(applyResult(100, true).after, 125);
  assert.equal(applyResult(100, false).delta, -18);
  assert.equal(applyResult(10, false).after, 0);   // can't go below 0
  assert.equal(applyResult(0, false).after, 0);
});

test("applyResult: win streak adds a capped bonus", () => {
  assert.equal(applyResult(0, true, 0).delta, 25);
  assert.equal(applyResult(0, true, 3).delta, 31);   // +2 per streak
  assert.equal(applyResult(0, true, 99).delta, 35);  // capped at +10
});

test("seasonKey is monthly and stable", () => {
  assert.equal(seasonKey(new Date(Date.UTC(2026, 4, 25))), "2026-S05");
  assert.equal(seasonKey(new Date(Date.UTC(2026, 11, 1))), "2026-S12");
  assert.equal(seasonKey(new Date(Date.UTC(2026, 0, 15))), "2026-S01");
});

test("seasonReset demotes toward the middle but keeps some progress", () => {
  assert.equal(seasonReset(1000), 400);
  assert.equal(seasonReset(0), 0);
  const r = seasonReset(2500);
  assert.ok(r > 0 && r < 2500);
});
