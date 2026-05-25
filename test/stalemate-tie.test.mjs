// Regression for: stalemate tick must hit both champions simultaneously,
// so a 1-HP-vs-1-HP situation resolves as a draw (state.winner === "tie")
// instead of whichever side's beginTurn ran first.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, endTurn } from "../client/js/game.js";

function deck(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: 100 + i, name: "C" + (100 + i), types: ["martial"], tier: 1,
    energyCost: 1, cardHp: 5, cardAttack: 2,
    raw: { hp: 30, attack: 20, defense: 10, sp_attack: 20, sp_defense: 10, speed: 10 },
  }));
}

function fastForwardToTurn(state, target) {
  // Spin endTurn until state.turn reaches target.
  let safety = 0;
  while (state.turn < target && !state.winner && safety++ < 200) {
    endTurn(state);
  }
}

test("stalemate damage does NOT fire before turn 30", () => {
  const s = createGame({ playerDeck: deck(60), aiDeck: deck(60), firstPlayer: "player" });
  fastForwardToTurn(s, 25);
  // Both should still be at full champion HP (no attacks, no stalemate yet).
  assert.equal(s.players.player.championHp, 30);
  assert.equal(s.players.ai.championHp, 30);
});

test("stalemate damage hits BOTH champions at the same endTurn from turn 30", () => {
  const s = createGame({ playerDeck: deck(60), aiDeck: deck(60), firstPlayer: "player" });
  fastForwardToTurn(s, 30);
  const beforeP = s.players.player.championHp;
  const beforeA = s.players.ai.championHp;
  endTurn(s); // turn 30 endTurn → first stalemate tick
  // Both must have lost the SAME amount in the same tick.
  const lossP = beforeP - s.players.player.championHp;
  const lossA = beforeA - s.players.ai.championHp;
  assert.ok(lossP > 0, "player should have lost HP");
  assert.equal(lossP, lossA, `both sides should lose the same amount in one tick (${lossP} vs ${lossA})`);
});

test("1 HP vs 1 HP on a stalemate tick resolves as a DRAW (state.winner='tie')", () => {
  const s = createGame({ playerDeck: deck(60), aiDeck: deck(60), firstPlayer: "player" });
  fastForwardToTurn(s, 30);
  // Force both bars to 1 HP right before the tick lands.
  s.players.player.championHp = 1;
  s.players.ai.championHp = 1;
  endTurn(s);
  assert.equal(s.winner, "tie", `expected tie, got ${s.winner}`);
  assert.equal(s.phase, "over");
  assert.equal(s.players.player.championHp, 0);
  assert.equal(s.players.ai.championHp, 0);
});

test("asymmetric HP at tick time → the lower-HP side loses (no draw)", () => {
  const s = createGame({ playerDeck: deck(60), aiDeck: deck(60), firstPlayer: "player" });
  fastForwardToTurn(s, 30);
  s.players.player.championHp = 1;
  s.players.ai.championHp = 5;
  endTurn(s);
  // Player should be out; AI still standing → AI wins.
  assert.equal(s.winner, "ai");
  assert.equal(s.players.player.championHp, 0);
  assert.ok(s.players.ai.championHp > 0, "AI should still have HP after the tick");
});
