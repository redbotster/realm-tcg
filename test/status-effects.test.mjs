// Tests for status-effect mechanics — burn, stun, sleep.
// These are central to gameplay (rollStatus, tickStatus, isLockedOut)
// but had zero direct tests until now.

import { test } from "node:test";
import assert from "node:assert/strict";
import { rollStatus, tickStatus, isLockedOut } from "../client/js/battle.js";

function mkCard(types = ["martial"]) {
  return {
    name: "C", types,
    cardAttack: 5, cardHp: 10,
    raw: { hp: 100, attack: 60, defense: 30, sp_attack: 60, sp_defense: 30 },
  };
}

function mkInst(card, opts = {}) {
  return {
    card,
    currentHp: opts.currentHp ?? card.cardHp,
    maxHp: opts.maxHp ?? card.cardHp,
    status: opts.status ?? null,
  };
}

// --- rollStatus -------------------------------------------------------

test("rollStatus: fire attacker has ~25% burn chance on contact", () => {
  // Deterministic rand always-below-threshold → always burns.
  const attacker = mkCard(["fire"]);
  const defender = mkCard(["martial"]);
  const status = rollStatus(attacker, defender, () => 0.1);
  assert.equal(status?.kind, "burn");
  assert.equal(status.turnsLeft, 2);
});

test("rollStatus: fire above threshold → no status", () => {
  const attacker = mkCard(["fire"]);
  const defender = mkCard(["martial"]);
  const status = rollStatus(attacker, defender, () => 0.9);
  assert.equal(status, null);
});

test("rollStatus: electric attacker has stun chance", () => {
  const attacker = mkCard(["storm"]);
  const defender = mkCard(["martial"]);
  const status = rollStatus(attacker, defender, () => 0.1);
  assert.equal(status?.kind, "stun");
});

test("rollStatus: psychic attacker has sleep chance", () => {
  const attacker = mkCard(["mind"]);
  const defender = mkCard(["martial"]);
  const status = rollStatus(attacker, defender, () => 0.05);
  assert.equal(status?.kind, "sleep");
});

test("rollStatus: non-status types return null", () => {
  for (const type of ["martial", "stone", "verdant", "brawl"]) {
    const attacker = mkCard([type]);
    const defender = mkCard(["martial"]);
    const status = rollStatus(attacker, defender, () => 0);
    assert.equal(status, null, `${type} should not apply status`);
  }
});

test("rollStatus: missing attacker/defender returns null safely", () => {
  assert.equal(rollStatus(null, mkCard(), () => 0), null);
  assert.equal(rollStatus(mkCard(["fire"]), null, () => 0), null);
});

// --- tickStatus -------------------------------------------------------

test("tickStatus: burn deals 2 damage, decrements turnsLeft", () => {
  const card = mkInst(mkCard(), { status: { kind: "burn", turnsLeft: 2 } });
  const r = tickStatus(card);
  assert.equal(r.damage, 2);
  assert.equal(r.expired, false);
  assert.equal(card.status?.turnsLeft, 1);
});

test("tickStatus: burn expires after its last tick", () => {
  const card = mkInst(mkCard(), { status: { kind: "burn", turnsLeft: 1 } });
  const r = tickStatus(card);
  assert.equal(r.damage, 2);
  assert.equal(r.expired, true);
  assert.equal(card.status, undefined);  // deleted from instance
});

test("tickStatus: bleed (Martial) deals 2 damage per tick like burn", () => {
  const card = mkInst(mkCard(), { status: { kind: "bleed", turnsLeft: 2 } });
  const r = tickStatus(card);
  assert.equal(r.damage, 2);
  assert.equal(r.expired, false);
  assert.equal(card.status?.turnsLeft, 1);
});

test("tickStatus: bleed expires after its last tick", () => {
  const card = mkInst(mkCard(), { status: { kind: "bleed", turnsLeft: 1 } });
  const r = tickStatus(card);
  assert.equal(r.damage, 2);
  assert.equal(r.expired, true);
  assert.equal(card.status, undefined);
});

test("isLockedOut: bleed does NOT lock the card (DoT, not a gate)", () => {
  const card = mkInst(mkCard(), { status: { kind: "bleed", turnsLeft: 2 } });
  assert.equal(isLockedOut(card), false);
});

test("tickStatus: stun decrements without dealing damage", () => {
  const card = mkInst(mkCard(), { status: { kind: "stun", turnsLeft: 2 } });
  const r = tickStatus(card);
  assert.equal(r.damage, 0);
  assert.equal(card.status?.turnsLeft, 1);
});

test("tickStatus: stun expires", () => {
  const card = mkInst(mkCard(), { status: { kind: "stun", turnsLeft: 1 } });
  const r = tickStatus(card);
  assert.equal(r.expired, true);
  assert.equal(card.status, undefined);
});

test("tickStatus: sleep decrements without damage", () => {
  const card = mkInst(mkCard(), { status: { kind: "sleep", turnsLeft: 1 } });
  const r = tickStatus(card);
  assert.equal(r.damage, 0);
  assert.equal(r.expired, true);
});

test("tickStatus: card with no status is a no-op", () => {
  const card = mkInst(mkCard());
  const r = tickStatus(card);
  assert.equal(r.damage, 0);
  assert.equal(r.expired, false);
});

// --- isLockedOut ------------------------------------------------------

test("isLockedOut: stun locks the card", () => {
  const card = mkInst(mkCard(), { status: { kind: "stun", turnsLeft: 1 } });
  assert.equal(isLockedOut(card), true);
});

test("isLockedOut: sleep locks the card", () => {
  const card = mkInst(mkCard(), { status: { kind: "sleep", turnsLeft: 1 } });
  assert.equal(isLockedOut(card), true);
});

test("isLockedOut: burn does NOT lock (you can still attack while burning)", () => {
  const card = mkInst(mkCard(), { status: { kind: "burn", turnsLeft: 2 } });
  assert.equal(isLockedOut(card), false);
});

test("isLockedOut: no status returns false", () => {
  const card = mkInst(mkCard());
  assert.equal(isLockedOut(card), false);
});
