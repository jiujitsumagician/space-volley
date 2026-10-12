// Deterministic checks for the untrusted-input hardening (no browser, no
// broker): HTML escaping / name sanitising, room-code format, malformed peer
// messages being contained, and the host's single-guest slot reservation.
import { escapeHtml, sanitizeName } from "../src/util.js";
import { NetSession, makeRoomCode } from "../src/net.js";
import assert from "node:assert";

// escapeHtml / sanitizeName
assert.strictEqual(escapeHtml(`<img src=x onerror="a('b')">&`), "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;");
assert.strictEqual(escapeHtml(null), "");
assert.strictEqual(escapeHtml(7), "7");
assert.strictEqual(escapeHtml("CHALLENGER"), "CHALLENGER");
assert.strictEqual(sanitizeName("<img src=x onerror=1>"), "img srcx onerror");
assert.strictEqual(sanitizeName({}), "CHALLENGER");
assert.strictEqual(sanitizeName(undefined), "CHALLENGER");
assert.strictEqual(sanitizeName("<>"), "CHALLENGER");
assert.strictEqual(sanitizeName("CHALLENGER"), "CHALLENGER");
assert.ok(sanitizeName("x".repeat(100)).length <= 16);

// room codes keep their format
for (let i = 0; i < 200; i++) assert.match(makeRoomCode(), /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);

// malformed peer messages are dropped / contained, valid ones still dispatch
const handlers = {};
const conn = { open: true, on: (e, cb) => { handlers[e] = cb; }, send() {}, close() {} };
const s = new NetSession();
s._wire(conn);
let got = null;
s.on("ok", (d) => { got = d; });
s.on("boom", () => { throw new Error("handler blew up"); });
for (const bad of [null, undefined, 5, "str", {}, { y: 5 }, { y: "nope" }, { y: "boom", d: 1 }]) handlers.data(bad);
handlers.data({ y: "ok", d: { a: 1 } });
assert.deepStrictEqual(got, { a: 1 });

// host accepts exactly one guest even if two connect before either opens
let onConn;
globalThis.Peer = class {
  constructor() { this._h = {}; setTimeout(() => this._h.open?.(), 0); }
  on(e, cb) { this._h[e] = cb; if (e === "connection") onConn = cb; }
};
const mkConn = () => {
  const h = {};
  return { h, open: false, closed: false, on(e, cb) { h[e] = cb; }, close() { this.closed = true; h.close?.(); }, send() {} };
};
const host = new NetSession();
await host.host();
const c1 = mkConn(), c2 = mkConn();
onConn(c1); onConn(c2);
assert.strictEqual(c1.closed, false);
assert.strictEqual(c2.closed, true, "second simultaneous guest must be rejected");
c1.open = true; c1.h.open();
assert.strictEqual(host.conn, c1);
// aborted attempt must not lock the room
const host2 = new NetSession();
await host2.host();
const a1 = mkConn(), a2 = mkConn();
onConn(a1);
a1.h.close(); // aborted before open
onConn(a2);
assert.strictEqual(a2.closed, false, "room must accept a new guest after an aborted attempt");

console.log("security-check: OK");
process.exit(0);
