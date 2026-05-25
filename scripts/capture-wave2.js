const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const BASE = process.argv[2] || "https://creature-tcg-five-lime.vercel.app";
const OUT = "/tmp/pkmn-screens";
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".champion-card");
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "polish-menu-6champions.png") });
  console.log("✓ menu-6champions");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
