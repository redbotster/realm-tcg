// Booster-pack reward modal shown after a match ends.
// Server hands the client an offer { offerId, picks: [card,...] }.
// Cards arrive FACE-DOWN; the player taps to flip-reveal each (legendary /
// mythical pulls flash), then taps the revealed card again to claim it.

import { renderCard } from "./cards.js";

export function showOffer(offer, { onClaim, didWin } = {}) {
  if (!offer || !offer.picks?.length) {
    onClaim?.(null);
    return;
  }
  const overlay = document.createElement("div");
  overlay.className = "reward-overlay";
  overlay.innerHTML = `
    <div class="reward-card">
      <div class="reward-title">${didWin ? "Victory Pack" : "Consolation Pack"}</div>
      <div class="reward-sub">Tap a card to reveal — then tap again to claim</div>
      <div class="reward-picks"></div>
      <button class="reward-skip">Skip</button>
    </div>
  `;
  const picksEl = overlay.querySelector(".reward-picks");
  const titleEl = overlay.querySelector(".reward-title");
  const subEl = overlay.querySelector(".reward-sub");
  let claimed = false;
  let revealedCount = 0;

  offer.picks.forEach((card, i) => {
    const rarity = card.rarity || "common";
    const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
    const big = rarity === "legendary" || rarity === "mythical";

    const wrap = document.createElement("div");
    wrap.className = `reward-pick rarity-${rarity} tier-${card.tier}`;
    wrap.style.setProperty("--pick-i", String(i));
    wrap.style.setProperty("--pick-delay", `${i * 160}ms`);
    wrap.innerHTML = `
      <div class="reward-flip">
        <div class="reward-back" aria-hidden="true">
          <span class="rb-crest">❖</span>
          <span class="rb-word">REALM</span>
        </div>
        <div class="reward-front"></div>
      </div>
      <div class="reward-tier tier-${card.tier} rarity-${rarity}">${rarityLabel}</div>
      <div class="reward-sparkle">${"✦ ✧ ✦ ✧ ✦".split(" ").map((s) => `<span>${s}</span>`).join("")}</div>
    `;
    const cardEl = renderCard({ ...card, raw: { hp: card.cardHp * 10, attack: card.cardAttack * 15 } });
    wrap.querySelector(".reward-front").appendChild(cardEl);

    wrap.addEventListener("click", async () => {
      if (claimed) return;

      // First tap: flip to reveal.
      if (!wrap.classList.contains("revealed")) {
        wrap.classList.add("revealed");
        if (big) wrap.classList.add("big-pull");
        revealedCount++;
        if (revealedCount === 1) subEl.textContent = "Tap a revealed card to claim it";
        if (big) {
          overlay.classList.add("flash");
          setTimeout(() => overlay.classList.remove("flash"), 600);
        }
        return;
      }

      // Second tap on a revealed card: claim it.
      claimed = true;
      [...picksEl.children].forEach((c) => c.classList.remove("chosen"));
      wrap.classList.add("chosen");
      picksEl.style.pointerEvents = "none";
      try {
        const res = await fetch("/me/rewards/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ offerId: offer.offerId, creatureId: card.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "claim failed");
        titleEl.textContent = "Added to collection!";
        subEl.textContent = `${card.name} ×${data.newQuantity}`;
        setTimeout(() => { overlay.remove(); onClaim?.(card); }, 1100);
      } catch (err) {
        alert("Claim failed: " + (err.message || "unknown"));
        picksEl.style.pointerEvents = "auto";
        claimed = false;
      }
    });
    picksEl.appendChild(wrap);
  });

  overlay.querySelector(".reward-skip").addEventListener("click", () => {
    overlay.remove();
    onClaim?.(null);
  });
  document.body.appendChild(overlay);
}
