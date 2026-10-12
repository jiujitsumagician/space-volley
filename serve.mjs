// Tiny static server — zero dependencies. `npm start` → http://localhost:8137
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";

const ROOT = process.cwd();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8137;
const HOST = process.env.HOST ?? "127.0.0.1";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
  ".hdr": "image/vnd.radiance",
  ".ttf": "font/ttf",
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path === "/") path = "/index.html";
    const file = normalize(join(ROOT, path));
    if (file !== ROOT && !file.startsWith(ROOT + sep)) throw new Error("traversal");
    // never serve dotfiles/dirs (.git, .env, ...)
    if (path.split("/").some((seg) => seg.startsWith(".") && seg !== "")) throw new Error("hidden");
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
// Loopback only by default; use `HOST=0.0.0.0 npm start` for LAN/phone testing.
}).listen(PORT, HOST, () => console.log(`SPACE VOLLEY → http://${HOST === "127.0.0.1" ? "localhost" : HOST}:${PORT}`));
