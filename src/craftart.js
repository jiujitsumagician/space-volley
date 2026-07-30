// © 2026 [YOUR NAME HERE]. All rights reserved.
// Unauthorized copying, distribution, or use of this software is strictly prohibited.

/**
 * Craft art: materials, generated hull-plate textures, and the cosmetic
 * geometry builders (hull, anti-grav drive, turret furniture, gun).
 *
 * PURELY VISUAL. Nothing here reads or writes gameplay state — tank.js owns
 * the rig contract (the `turret` / `barrel` / `muzzle` / `mgMuzzle` groups and
 * their exact offsets) and this module only decorates around it.
 *
 * Two hard constraints:
 *  - Textures may be cached and shared between craft; MATERIALS and GEOMETRIES
 *    may not. thumbs.js snapshots a craft and then disposes every geometry and
 *    material it can reach, so anything shared would be freed out from under
 *    the live ones. Material.dispose() does NOT touch textures, which is why
 *    the texture cache is safe.
 *  - Static parts are merged per-material to keep the draw count sane; only
 *    parts that actually animate (turbine rotors) stay separate.
 *
 * Where Iron Volley has road wheels and a track belt, Space Volley has lift
 * emitters and intake turbines — every chassis here is anti-grav, so the
 * ground-contact hardware is replaced by thrust hardware that reads as
 * hovering rather than rolling.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { clamp, lerp } from "./util.js";

// ── generated texture cache (shared; never disposed — see header) ──
let _plate = null;   // { normal, rough }
let _emit = null;    // scrolling energy strip

function canvas(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

/** Sobel a greyscale height canvas into a tangent-space normal map. */
function heightToNormal(src, strength = 2.0) {
  const n = src.width;
  const h = src.getContext("2d").getImageData(0, 0, n, n).data;
  const out = canvas(n);
  const octx = out.getContext("2d");
  const img = octx.createImageData(n, n);
  const at = (x, y) => h[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
      const l = at(x - 1, y), r = at(x + 1, y);
      const bl = at(x - 1, y + 1), b = at(x, y + 1), br = at(x + 1, y + 1);
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      let nx = -dx * strength, ny = -dy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const i = (y * n + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

/**
 * Fielded sci-fi hull plating: a panel grid with recessed seams, raised
 * sub-panels, louvred heat vents and access hatches. Deliberately NOT the
 * rivet-and-weld language Iron Volley's rolled armour uses — this hardware is
 * milled and bolted, not welded in a shed.
 */
function plateMaps() {
  if (_plate) return _plate;
  const N = 512;
  const hc = canvas(N), rc = canvas(N);
  const h = hc.getContext("2d"), r = rc.getContext("2d");

  h.fillStyle = "#808080"; h.fillRect(0, 0, N, N);
  r.fillStyle = "#8a8a8a"; r.fillRect(0, 0, N, N);

  let seed = 0x51f2c3d;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // recessed panel grid — irregular cell sizes so it doesn't read as graph paper
  const cuts = (n) => {
    const xs = [0];
    let x = 0;
    while (x < N - 40) { x += 60 + rnd() * 90; xs.push(Math.min(N, x)); }
    xs.push(N);
    return xs;
  };
  const xs = cuts(), ys = cuts();

  h.strokeStyle = "#5e5e5e"; h.lineWidth = 2.5;
  r.strokeStyle = "#b4b4b4"; r.lineWidth = 3;
  for (const x of xs) { h.beginPath(); h.moveTo(x, 0); h.lineTo(x, N); h.stroke(); r.beginPath(); r.moveTo(x, 0); r.lineTo(x, N); r.stroke(); }
  for (const y of ys) { h.beginPath(); h.moveTo(0, y); h.lineTo(N, y); h.stroke(); r.beginPath(); r.moveTo(0, y); r.lineTo(N, y); r.stroke(); }

  // raised sub-panels + hatches inside some cells
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i], x1 = xs[i + 1], y0 = ys[j], y1 = ys[j + 1];
      const w = x1 - x0, ht = y1 - y0;
      if (w < 30 || ht < 30) continue;
      const roll = rnd();
      if (roll < 0.34) {
        // raised sub-panel
        h.fillStyle = "#949494";
        h.fillRect(x0 + 8, y0 + 8, w - 16, ht - 16);
        r.fillStyle = "#7e7e7e";
        r.fillRect(x0 + 8, y0 + 8, w - 16, ht - 16);
      } else if (roll < 0.5) {
        // louvred heat vent
        const n = Math.max(2, Math.floor((ht - 16) / 9));
        for (let k = 0; k < n; k++) {
          const yy = y0 + 10 + k * 9;
          h.fillStyle = "#5a5a5a";
          h.fillRect(x0 + 12, yy, w - 24, 4);
          r.fillStyle = "#c4c4c4";
          r.fillRect(x0 + 12, yy, w - 24, 4);
        }
      } else if (roll < 0.62) {
        // access hatch with corner bolts
        h.strokeStyle = "#6a6a6a"; h.lineWidth = 2;
        h.strokeRect(x0 + 14, y0 + 14, w - 28, ht - 28);
        for (const [bx, by] of [[x0 + 20, y0 + 20], [x1 - 20, y0 + 20], [x0 + 20, y1 - 20], [x1 - 20, y1 - 20]]) {
          h.fillStyle = "#adadad";
          h.beginPath(); h.arc(bx, by, 2.4, 0, Math.PI * 2); h.fill();
        }
        h.strokeStyle = "#5e5e5e"; h.lineWidth = 2.5;
      }
    }
  }

  // micro-scoring and scuffs
  for (let i = 0; i < 70; i++) {
    const x = rnd() * N, y = rnd() * N, a = rnd() * Math.PI * 2, len = 6 + rnd() * 40;
    h.strokeStyle = rnd() > 0.5 ? "#727272" : "#8e8e8e";
    h.lineWidth = 0.5 + rnd() * 1.1;
    h.beginPath(); h.moveTo(x, y);
    h.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    h.stroke();
  }
  // grime in roughness only
  for (let i = 0; i < 28; i++) {
    r.fillStyle = `rgba(210,210,210,${0.08 + rnd() * 0.14})`;
    r.beginPath();
    r.ellipse(rnd() * N, rnd() * N, 20 + rnd() * 55, 14 + rnd() * 42, rnd() * Math.PI, 0, Math.PI * 2);
    r.fill();
  }

  const normal = new THREE.CanvasTexture(heightToNormal(hc, 1.5));
  const rough = new THREE.CanvasTexture(rc);
  for (const t of [normal, rough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  rough.colorSpace = THREE.NoColorSpace;
  _plate = { normal, rough };
  return _plate;
}

/**
 * Lift-emitter strip: banded energy that scrolls along the craft. This is the
 * anti-grav analogue of Iron Volley's track tread — the thing that tells you
 * at a glance the machine is under power and moving.
 */
function emitterMap() {
  if (_emit) return _emit;
  const W = 128, H = 32;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#101010"; ctx.fillRect(0, 0, W, H);
  // bright bands with soft falloff, tapering at the strip edges
  for (let i = 0; i < 4; i++) {
    const x = i * (W / 4);
    const g = ctx.createLinearGradient(x, 0, x + W / 4, 0);
    g.addColorStop(0, "#000");
    g.addColorStop(0.42, "#fff");
    g.addColorStop(0.58, "#fff");
    g.addColorStop(1, "#000");
    ctx.fillStyle = g;
    ctx.fillRect(x, 5, W / 4, H - 10);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  _emit = t;
  return _emit;
}

/** Per-part texture clone so texel density can be tuned without sharing state. */
function tiled(tex, rx, ry) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

/**
 * Free a material and every texture hanging off it. Callers used to dispose
 * only `.map`, which was fine when that was the only texture a craft material
 * carried; plating now brings a per-craft normal + roughness clone.
 * envMap is excluded — that slot is the shared per-map PMREM probe.
 */
const TEX_SLOTS = [
  "map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap",
  "aoMap", "alphaMap", "bumpMap", "displacementMap", "lightMap", "specularMap",
];
export function disposeMaterial(m) {
  if (!m) return;
  for (const slot of TEX_SLOTS) m[slot]?.dispose?.();
  m.dispose?.();
}

// ── paint shop: generated camo, cached per skin ────────────────
const _camoCache = new Map();
export function camoTexture(skin) {
  if (_camoCache.has(skin.id)) return _camoCache.get(skin.id);
  const c = canvas(256);
  const ctx = c.getContext("2d");
  const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;
  ctx.fillStyle = hex(skin.colors[0]);
  ctx.fillRect(0, 0, 256, 256);
  if (skin.stripes) {
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = hex(skin.colors[i % 2 === 0 ? 1 : 2]);
      ctx.lineWidth = 6 + Math.random() * 12;
      ctx.beginPath();
      const y = Math.random() * 256;
      ctx.moveTo(-20, y);
      ctx.bezierCurveTo(80, y + (Math.random() - 0.5) * 90, 180, y + (Math.random() - 0.5) * 90, 286, y + (Math.random() - 0.5) * 60);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 46; i++) {
      ctx.fillStyle = hex(skin.colors[1 + (i % (skin.colors.length - 1))]);
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 256, Math.random() * 256,
        14 + Math.random() * 30, 9 + Math.random() * 20,
        Math.random() * Math.PI, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(0.12, 0.12);
  _camoCache.set(skin.id, tex);
  return tex;
}

/** Fresh material set for one craft. Only the underlying textures are shared. */
export function craftMaterials(team, skin) {
  const { normal, rough } = plateMaps();

  const paint = {};
  if (skin && skin.kind === "solid") paint.color = skin.color;
  else if (skin && skin.kind === "camo") { paint.color = 0xffffff; paint.map = tiled(camoTexture(skin), 1, 1); }
  else paint.color = team.body;

  // Painted hull plating is mostly DIELECTRIC. The previous pass ran
  // metalness 0.62, which under the new sky IBL made every craft read as
  // polished brass rather than a painted composite hull. A little more
  // metalness than Iron Volley's armour, because this hardware is milled
  // alloy — but nowhere near a mirror.
  const body = new THREE.MeshStandardMaterial({
    ...paint,
    normalMap: tiled(normal, 2.2, 2.2),
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: tiled(rough, 2.2, 2.2),
    roughness: 0.62, metalness: 0.18, envMapIntensity: 1.0,
  });
  // Whole-number repeat: the turret dome is a sphere whose U wraps, and a
  // fractional repeat leaves a seam running down it.
  const bodyFine = new THREE.MeshStandardMaterial({
    ...paint,
    normalMap: tiled(normal, 4, 4),
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: tiled(rough, 4, 4),
    roughness: 0.6, metalness: 0.18, envMapIntensity: 1.0,
  });

  const dark = new THREE.MeshStandardMaterial({
    color: 0x161a22,
    normalMap: tiled(normal, 3.0, 3.0),
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.72, metalness: 0.5, envMapIntensity: 0.85,
  });

  const gun = new THREE.MeshStandardMaterial({
    color: 0x2b3038,
    normalMap: tiled(normal, 6, 1.5),
    normalScale: new THREE.Vector2(0.3, 0.3),
    roughness: 0.34, metalness: 0.9, envMapIntensity: 1.25,
  });

  const accent = new THREE.MeshStandardMaterial({
    color: team.accent, roughness: 0.35, metalness: 0.2,
    emissive: team.accent, emissiveIntensity: 0.95, envMapIntensity: 0.8,
  });

  // bright energy read for thrusters + ground-effect glow
  const glow = new THREE.MeshStandardMaterial({
    color: team.accent, roughness: 0.3, metalness: 0.0,
    emissive: team.accent, emissiveIntensity: 2.4,
  });

  // the scrolling lift emitter — same material trick as a track tread, but
  // driven through the emissive channel so it reads as energy, not steel
  const emitTex = tiled(emitterMap(), 1, 1);
  const emitter = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: team.accent,
    emissiveMap: emitTex,
    emissiveIntensity: 2.2,
    roughness: 0.4, metalness: 0.0,
  });

  const glass = new THREE.MeshStandardMaterial({
    color: 0x08121c, roughness: 0.08, metalness: 0.95, envMapIntensity: 1.8,
  });

  return { body, bodyFine, dark, gun, accent, glow, emitter, glass };
}

// ── small geometry helpers ─────────────────────────────────────
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);

function place(geo, x, y, z, rx = 0, ry = 0, rz = 0) {
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z);
  return geo;
}

/**
 * Merge a bucket of pre-transformed geometries into one mesh, or null.
 *
 * mergeGeometries() bails out (returns null) if the batch mixes indexed and
 * non-indexed geometry — and it always does here, because ExtrudeGeometry is
 * non-indexed while Box/Cylinder are indexed. Flattening everything to
 * non-indexed first is what keeps the hull from silently vanishing.
 */
export function mergeInto(geos, material) {
  if (!geos.length) return null;
  const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(flat, false);
  for (let i = 0; i < geos.length; i++) {
    if (flat[i] !== geos[i]) flat[i].dispose();
    geos[i].dispose();
  }
  if (!merged) return null;
  const m = new THREE.Mesh(merged, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ── hull ───────────────────────────────────────────────────────
/**
 * Per-chassis hull. The build flags drive the actual silhouette: low-profile
 * skimmers get a long raked prow and a shallow spine, bulwarks get a slab
 * forebody with bolt-on armour, and everything else lands in between. Read at
 * a glance, which the shared GLB blob could never do.
 */
export function buildHull(b, mats, out) {
  const hw = b.hullW / 2, hl = b.hullL / 2, hh = b.hullH;
  const bodyG = [], darkG = [], accentG = [], glowG = [], glassG = [];
  // The turret rig is frozen at y = 1.5 + hullH + 0.2, so the hull floor has
  // to stay at 1.5 and the deck at 1.5 + hullH.
  const yFloor = 1.5;
  const deckY = yFloor + hh;

  const prow = b.lowProfile ? 0.62 : b.plated ? 0.38 : 0.5; // how far the nose rakes
  const tail = b.plated ? 0.2 : 0.28;
  const chin = b.lowProfile ? 0.1 : 0.2;

  const pTopZ = hl - hl * prow, pTopY = deckY;
  const pBotZ = hl, pBotY = yFloor + hh * chin;
  const dz = pBotZ - pTopZ, dy = pBotY - pTopY;
  const pA = Math.atan2(-dy, dz);
  const nY = Math.cos(pA), nZ = Math.sin(pA); // prow outward normal

  const shape = new THREE.Shape();
  shape.moveTo(-hl, yFloor);
  shape.lineTo(-hl, yFloor + hh * 0.62);
  shape.lineTo(-hl + hl * tail * 0.7, deckY);
  shape.lineTo(pTopZ, pTopY);
  // two-plane prow, built INTO the profile rather than bolted on as a plate
  shape.lineTo(pTopZ + dz * 0.5 + nZ * 0.22, pTopY + dy * 0.5 + nY * 0.22);
  shape.lineTo(pBotZ, pBotY);
  shape.lineTo(hl - 0.25, yFloor);
  shape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: b.hullW, bevelEnabled: false });
  // The shape is authored in XY (x = length, y = height) and extruded along
  // +Z (width). rotateY(-PI/2) is the one that lands it correctly:
  //   x -> +z (nose stays the nose)   z -> -x (width spans -hullW..0)
  // rotateY(+PI/2) mirrors it front-to-back AND leaves the body a full
  // hull-width off centre.
  hullGeo.rotateY(-Math.PI / 2);
  hullGeo.translate(hw, 0, 0);
  bodyG.push(hullGeo);

  // chined side strakes — the sci-fi read is faceted, not slab-sided
  for (const s of [-1, 1]) {
    const strake = box(0.5, hh * 0.34, b.hullL * 0.82);
    strake.rotateZ(s * 0.5);
    strake.translate(s * (hw - 0.05), yFloor + hh * 0.34, 0);
    bodyG.push(strake);
  }

  // belly pan
  bodyG.push(place(box(b.hullW * 0.92, 0.5, b.hullL * 0.94), 0, yFloor + 0.05, 0));

  // dorsal spine housing + cockpit canopy
  darkG.push(place(box(b.hullW * 0.34, 0.3, b.hullL * 0.5), 0, deckY + 0.12, -hl * 0.1));
  glassG.push(place(box(b.hullW * 0.3, 0.22, 1.5), -hw * 0.2, deckY + 0.2, hl * 0.42));

  // heat-sink fins along the spine
  for (let i = 0; i < 5; i++) {
    darkG.push(place(box(b.hullW * 0.42, 0.26, 0.14), 0, deckY + 0.22, -hl * 0.52 + i * 0.5));
  }

  // sensor blisters + running lights on the prow face
  for (const s of [-1, 1]) {
    const lamp = box(0.66, 0.3, 0.16);
    lamp.rotateX(-pA);
    lamp.translate(s * hw * 0.6, pTopY + dy * 0.36 + nY * 0.14, pTopZ + dz * 0.36 + nZ * 0.14);
    accentG.push(lamp);
    darkG.push(place(box(0.34, 0.34, 0.42), s * hw * 0.34, pBotY + 0.22, pBotZ - 0.2));
  }
  // energy trim line down the prow centre
  const trim = box(0.26, 0.1, Math.hypot(dz, dy) * 0.8);
  trim.rotateX(-pA);
  trim.translate(0, (pTopY + pBotY) / 2 + nY * 0.12, (pTopZ + pBotZ) / 2 + nZ * 0.12);
  glowG.push(trim);

  // deck accent strips
  accentG.push(place(box(0.22, 0.1, b.hullL * 0.52), hw * 0.84, deckY + 0.04, 0));
  accentG.push(place(box(0.22, 0.1, b.hullL * 0.52), -hw * 0.84, deckY + 0.04, 0));

  // bolt-on armour on bulwark chassis
  if (b.plated) {
    for (const s of [-1, 1]) {
      bodyG.push(place(box(0.3, hh * 0.5, b.hullL * 0.64), s * (hw + 0.06), yFloor + hh * 0.6, 0));
    }
    const ap = box(b.hullW * 0.36, 0.24, 1.0);
    ap.rotateX(-pA);
    ap.translate(0, pTopY + dy * 0.64 + nY * 0.2, pTopZ + dz * 0.64 + nZ * 0.2);
    bodyG.push(ap);
  }

  out.body.push(...bodyG);
  out.dark.push(...darkG);
  out.accent.push(...accentG);
  out.glow.push(...glowG);
  out.glass.push(...glassG);
  return { deckY, yFloor, pA };
}

// ── anti-grav drive ────────────────────────────────────────────
/**
 * The hover analogue of a track run: a plenum skirt, a scrolling lift-emitter
 * strip slung beneath it, an intake turbine that spins with ground speed, and
 * a vector fin. One per side.
 *
 * The turbine rotor goes into `out.wheels`, which Tank.animateRunningGear
 * already spins by ground speed — so the drive visibly spools up when the
 * craft moves, using the rig that used to turn road wheels.
 */
export function buildDrive(b, mats, side, out) {
  const hw = b.hullW / 2, hl = b.hullL / 2, hh = b.hullH;
  const x = side * (hw + 0.42);
  const statics = [], darkStatics = [];

  // plenum skirt segment down this flank, tucked under the hull line
  darkStatics.push(place(box(1.05, 0.95, b.hullL * 0.9), 0, 1.02, 0));

  // Lift emitter: the bright band along the outboard bottom edge. This is the
  // silhouette cue that the machine is FLOATING, so it sits proud on the
  // outside where it reads from the side, not tucked underneath.
  const strip = new THREE.Mesh(box(0.26, 0.34, b.hullL * 0.88), mats.emitter);
  strip.position.set(x + side * 0.62, 0.92, 0);
  out.group.add(strip);
  // ventral wash, clear of the skirt's underside
  const wash = new THREE.Mesh(box(1.5, 0.12, b.hullL * 0.82), mats.emitter);
  wash.position.set(x, 0.5, 0);
  out.group.add(wash);

  // Intake ports along the upper flank — small, recessed, and STATIC. A big
  // spinning disc on the side of the hull reads as a road wheel, which is the
  // one thing an anti-grav craft must never look like.
  for (let i = 0; i < 3; i++) {
    const z = lerp(hl * 0.42, -hl * 0.28, i / 2);
    const portGeo = new THREE.TorusGeometry(0.3, 0.09, 6, 12);
    portGeo.rotateY(Math.PI / 2);
    portGeo.translate(0, 1.5 + hh * 0.62, z);
    darkStatics.push(portGeo);
    const vent = new THREE.Mesh(cyl(0.17, 0.17, 0.08, 10), mats.accent);
    vent.rotation.z = Math.PI / 2;
    vent.position.set(x + side * 0.1, 1.5 + hh * 0.62, z);
    out.group.add(vent);
  }

  // downward lift pod at the rear quarter
  darkStatics.push(place(cyl(0.6, 0.8, 1.2, 10), 0, 1.05, -hl * 0.46));
  const podGlow = new THREE.Mesh(cyl(0.42, 0.42, 0.14, 12), mats.glow);
  podGlow.position.set(x, 0.42, -hl * 0.46);
  out.group.add(podGlow);

  // vector fin — canted stabiliser aft, reads as attitude control
  const fin = box(0.16, hh * 0.7, b.hullL * 0.2);
  fin.rotateZ(side * 0.3);
  fin.translate(side * 0.28, 1.5 + hh * 0.66, -hl * 0.76);
  statics.push(fin);

  const st = mergeInto(statics, mats.body);
  if (st) { st.position.x = x; out.group.add(st); }
  const dk = mergeInto(darkStatics, mats.dark);
  if (dk) { dk.position.x = x; out.group.add(dk); }
}

/** Rear drive block: engine housing and glowing thruster nozzles. */
export function buildEngine(b, mats, out) {
  const hl = b.hullL / 2, hh = b.hullH;
  const darkG = [];
  darkG.push(place(box(b.hullW * 0.76, hh * 0.6, 1.3), 0, 1.5 + hh * 0.52, -hl * 0.86));

  const n = b.hullW > 8 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const nx = lerp(-b.hullW * 0.28, b.hullW * 0.28, t);
    darkG.push(place(cyl(0.5, 0.66, 0.9, 12), nx, 1.5 + hh * 0.5, -hl - 0.3, Math.PI / 2));
    // nozzle petals
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      darkG.push(place(box(0.16, 0.16, 0.42), nx + Math.cos(a) * 0.56, 1.5 + hh * 0.5 + Math.sin(a) * 0.56, -hl - 0.62));
    }
    const core = new THREE.Mesh(cyl(0.34, 0.46, 0.5, 12), mats.glow);
    core.rotation.x = Math.PI / 2;
    core.position.set(nx, 1.5 + hh * 0.5, -hl - 0.56);
    out.group.add(core);

    // Turbine fan sitting in the nozzle throat. This is the craft's only
    // moving part: a spinning disc on the FLANK reads as a road wheel, but
    // one down the exhaust reads as an engine spooling up.
    const fan = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const bl = box(0.34, 0.1, 0.08);
      bl.rotateZ(a);
      bl.translate(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0);
      fan.push(bl);
    }
    fan.push(cyl(0.1, 0.1, 0.14, 8).rotateX(Math.PI / 2));
    const fanMesh = mergeInto(fan, mats.dark);
    if (fanMesh) {
      fanMesh.position.set(nx, 1.5 + hh * 0.5, -hl - 0.42);
      fanMesh.userData.spinAxis = "z"; // disc faces +/-Z, so it turns about Z
      out.group.add(fanMesh);
      out.wheels.push(fanMesh);
    }
  }
  out.dark.push(...darkG);
}

// ── turret furniture ───────────────────────────────────────────
/**
 * Everything bolted to the turret that isn't the gun: sensor cluster, hatch,
 * countermeasure pods, comms blades, heat vents.
 */
export function turretFurniture(b, mats, turret) {
  const r = b.turretR;
  // actual roof height of each dome variant, so furniture sits ON the turret
  const top = b.boxTurret ? 1.87 : b.angular ? 1.77 : r * 0.9;
  const bodyG = [], darkG = [], glassG = [], accentG = [], glowG = [];

  // sensor cluster / commander's cupola
  bodyG.push(place(cyl(r * 0.4, r * 0.44, 0.5, 12), -r * 0.42, top + 0.18, -r * 0.18));
  darkG.push(place(cyl(r * 0.36, r * 0.36, 0.1, 12), -r * 0.42, top + 0.48, -r * 0.18));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    glassG.push(place(
      box(0.2, 0.16, 0.08),
      -r * 0.42 + Math.sin(a) * r * 0.42, top + 0.28, -r * 0.18 + Math.cos(a) * r * 0.42,
      0, a, 0
    ));
  }
  // main optic block, glowing
  glowG.push(place(box(r * 0.5, 0.18, 0.1), r * 0.5, top - 0.34, r * 0.86));

  // loader hatch
  darkG.push(place(cyl(r * 0.32, r * 0.32, 0.1, 10), r * 0.46, top + 0.14, -r * 0.3));

  // countermeasure launcher pods on the turret cheeks
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const g = cyl(0.12, 0.12, 0.56, 8);
      g.rotateX(Math.PI / 2);
      g.rotateY(s * 0.5);
      g.translate(s * (r * 0.8 - i * 0.05), top - 0.22, r * 0.34 + i * 0.28);
      darkG.push(g);
    }
  }

  // rear equipment bustle, seated against the turret
  const bz = -r * 0.86, by = top * 0.5;
  darkG.push(place(box(r * 1.1, 0.4, 0.42), 0, by, bz - 0.4));
  darkG.push(place(box(r * 1.2, 0.07, 0.06), 0, by + 0.24, bz - 0.48));
  for (const s of [-1, 1]) {
    darkG.push(place(box(0.06, 0.5, 0.06), s * r * 0.58, by, bz - 0.48));
  }
  // heat vent louvres on the bustle
  for (let i = 0; i < 3; i++) {
    accentG.push(place(box(r * 0.9, 0.05, 0.07), 0, by - 0.14 + i * 0.12, bz - 0.62));
  }

  // comms blades — two, different lengths, so the turret reads asymmetric
  darkG.push(place(box(0.08, 2.6, 0.2), -r * 0.76, top + 1.3, -r * 0.5));
  darkG.push(place(cyl(0.03, 0.03, 1.9, 4), r * 0.7, top + 0.95, -r * 0.6));

  for (const [geos, mat] of [
    [bodyG, mats.bodyFine], [darkG, mats.dark], [glassG, mats.glass],
    [accentG, mats.accent], [glowG, mats.glow],
  ]) {
    const m = mergeInto(geos, mat);
    if (m) turret.add(m);
  }
}

/**
 * Gun: an accelerator lance rather than a powder tube — coil rings stacked
 * down the barrel, a pair of rails, and a glowing emitter at the muzzle.
 */
export function buildGunTube(b, mats, barrel, ox, out) {
  const R = b.barrelR, L = b.barrelL, z0 = b.turretR * 0.4;
  const geos = [];

  // core tube, tapering forward
  geos.push(place(cyl(R, R * 1.3, L, 14), ox, 0, z0 + L / 2, Math.PI / 2));
  // breech block at the trunnion
  geos.push(place(cyl(R * 3.0, R * 3.4, 0.75, 12), ox, 0, z0 - 0.1, Math.PI / 2));
  // accelerator coils down the length
  const coils = 5;
  for (let i = 0; i < coils; i++) {
    const z = z0 + L * (0.16 + (i / (coils - 1)) * 0.66);
    geos.push(place(cyl(R * 1.85, R * 1.85, 0.26, 12), ox, 0, z, Math.PI / 2));
  }
  // rails either side
  for (const s of [-1, 1]) {
    geos.push(place(box(R * 0.5, R * 0.5, L * 0.78), ox + s * R * 1.7, 0, z0 + L * 0.5));
  }
  // muzzle emitter housing
  geos.push(place(cyl(R * 1.9, R * 1.7, 0.7, 12), ox, 0, z0 + L - 0.35, Math.PI / 2));

  const m = mergeInto(geos, mats.gun);
  if (m) barrel.add(m);

  // glowing emitter ring at the mouth
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.5, R * 0.36, 8, 16), mats.glow);
  ring.position.set(ox, 0, z0 + L + 0.02);
  barrel.add(ring);
}
