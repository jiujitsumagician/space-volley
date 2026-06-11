// Capture menu + a spread of space worlds to eyeball the restyle.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";

const PORT = 8150;
const BASE = `http://localhost:${PORT}`;
const server = spawn(process.execPath, ["serve.mjs"], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
await mkdir("test/shots", { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

const targets = (process.argv.slice(2).length ? process.argv.slice(2) : ["menu", "dunes", "saturnedge", "novawastes", "regolith", "neon"]);
for (const name of targets) {
  const url = name === "menu" ? `${BASE}/` : `${BASE}/?test&map=${name}&bots=3`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(name === "menu" ? 1600 : 4200);
  await page.screenshot({ path: `test/shots/${name}.png` });
  console.log("shot:", name);
}
await browser.close();
server.kill();
console.log("errors:", errors.length, errors.slice(0, 6).join(" | "));
process.exit(errors.length ? 1 : 0);
