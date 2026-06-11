// Drives the full solo menu flow end to end (title → tank → skin → enemy
// armor → map → DEPLOY) using native element.click() — the same path the
// gamepad confirm takes — and asserts the match actually starts.
// Guards the "enemy armor won't start the game" regression (a map missing
// its palette crashed the map-select thumbnail render).
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const PORT = 8151;
const BASE = `http://localhost:${PORT}`;
const server = spawn(process.execPath, ["serve.mjs"], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

const click = (sel, idx = 0) => page.evaluate(([sel, idx]) => {
  const el = [...document.querySelectorAll("#menu " + sel)][idx];
  if (el) el.click();
  return !!el;
}, [sel, idx]);
const state = () => page.evaluate(() => ({
  logo: document.querySelector("#menu .logo")?.textContent?.trim() || "(none)",
  menuVisible: getComputedStyle(document.getElementById("menu")).display !== "none",
  game: !!window.__IV?.game,
}));

let failed = false;
const fail = (m) => { console.error("FAIL:", m); failed = true; };

await page.goto(`${BASE}/`, { waitUntil: "load" });
await page.waitForSelector("#menu .panel", { timeout: 15000 });

await click('.choice[data-v="solo"]'); await page.waitForTimeout(250);
if ((await state()).logo !== "Choose Your Tank") fail("SOLO did not reach tank select");
await click('.choice[data-v]'); await page.waitForTimeout(250);            // chassis
if ((await state()).logo !== "Paint Shop") fail("chassis did not reach paint shop");
await click('.choice[data-v]'); await page.waitForTimeout(250);            // skin
if ((await state()).logo !== "Enemy Armor") fail("skin did not reach enemy armor");

// ENEMY ARMOR → map select (this is the step that regressed)
await click('.choices .choice[data-v]', 1); await page.waitForTimeout(400);
if ((await state()).logo !== "Theater of War") fail("enemy armor did not advance to map select");

await click('.choice[data-v]'); await page.waitForTimeout(300);            // map
if ((await state()).logo !== "Ready") fail("map did not reach the Ready / deploy screen");

await click('[data-go]'); await page.waitForTimeout(1500);                 // DEPLOY
const final = await state();
if (final.menuVisible || !final.game) fail(`DEPLOY did not start the match (${JSON.stringify(final)})`);

if (errors.length) fail(`console/page errors: ${errors.join(" || ")}`);

await browser.close();
server.kill();
console.log(failed ? "FLOW: FAILED" : "FLOW: PASSED");
process.exit(failed ? 1 : 0);
