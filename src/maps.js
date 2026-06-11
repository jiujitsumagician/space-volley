// © 2026 [YOUR NAME HERE]. All rights reserved.
// Unauthorized copying, distribution, or use of this software is strictly prohibited.

/**
 * The worlds of SPACE VOLLEY. Every battlefield is an off-world surface —
 * a moon, a planet, a station deck, an alien construct — fought under a
 * deep star field with a parent body looming on the horizon.
 *
 * A map definition is pure data + an analytic height function (the terrain
 * mesh displacement AND physics collision query use the same function, so
 * they can never disagree). Terrain SHAPES are inherited from the engine;
 * only the sky, light, palette and dressing change per world.
 *
 * Every map is a 1400×1400 battlefield with hills high enough to volley
 * over but passes low enough to brawl through.
 *
 * Per-map space dressing (all optional):
 *   stars   : true by default (set false only for a hazy atmosphere world)
 *   nebula  : hex tint for the faint background nebula
 *   planet  : { dir:[x,y,z], color, size, ring } parent body on the horizon
 */

import { makeFbm, clamp, lerp, smoothstep } from "./util.js";

export const WORLD_SIZE = 1400;
const HALF = WORLD_SIZE / 2;

/** Soft circular falloff to a rim wall so nobody drives off the world. */
function rimWall(x, z) {
  const r = Math.hypot(x, z);
  const edge = HALF * 0.92;
  if (r < edge) return 0;
  const t = clamp((r - edge) / (HALF - edge), 0, 1);
  return smoothstep(t) * 90;
}

function makeMap(def) {
  return { props: [], water: null, stars: true, ...def };
}

export const MAPS = [
  // ── 1. SEA OF TRANQUILITY — lunar mare, grey regolith, Earthrise ──
  makeMap({
    id: "dunes",
    name: "Sea of Tranquility",
    blurb: "Grey mare dust and old impact swells. Earth hangs over the rim.",
    seed: 101,
    sky: { top: 0x02040a, horizon: 0x1a2433, sun: 0xfffaf0, sunPos: [0.55, 0.32, 0.4] },
    fog: { color: 0x10141c, near: 520, far: 1900 },
    hemi: { sky: 0x6878a0, ground: 0x3a3d42, intensity: 0.5 },
    sunlight: { color: 0xfff6e6, intensity: 2.5 },
    exposure: 1.08,
    nebula: 0x223a66,
    planet: { dir: [0.4, 0.12, -0.9], color: 0x5b86c4, size: 0.2, ring: false },
    palette: [
      { h: -10, c: [0.30, 0.30, 0.31] },
      { h: 14, c: [0.42, 0.42, 0.43] },
      { h: 34, c: [0.55, 0.55, 0.55] },
      { h: 60, c: [0.36, 0.36, 0.37] },
      { h: 100, c: [0.24, 0.24, 0.25] },
    ],
    slopeColor: [0.26, 0.26, 0.27],
    height(x, z, fbm) {
      const nx = x / 560, nz = z / 560;
      const ridges = Math.pow(Math.abs(fbm(nx * 1.6 + 9, nz * 1.6 - 4)), 0.8) * 46;
      const swell = fbm(nx * 0.55, nz * 0.55) * 26;
      const detail = fbm(nx * 6, nz * 6) * 3;
      return ridges + swell + detail + rimWall(x, z);
    },
    propsSpec: { kind: "monoliths", count: 70 },
  }),

  // ── 2. EUROPA SHELF — cracked ice plain under Jupiter ────────────
  makeMap({
    id: "frost",
    name: "Europa Shelf",
    blurb: "Fractured ice over a black ocean. Jupiter fills half the sky.",
    seed: 202,
    sky: { top: 0x040810, horizon: 0x2a3a52, sun: 0xeef4ff, sunPos: [-0.4, 0.22, 0.6] },
    fog: { color: 0x16202e, near: 360, far: 1500 },
    hemi: { sky: 0x9fc2e8, ground: 0x35454f, intensity: 0.78 },
    sunlight: { color: 0xeaf2ff, intensity: 1.7 },
    nebula: 0x2a4a7a,
    planet: { dir: [-0.5, 0.18, -0.82], color: 0xc8a070, size: 0.34, ring: false },
    palette: [
      { h: -10, c: [0.52, 0.62, 0.72] },
      { h: 6, c: [0.74, 0.82, 0.9] },
      { h: 30, c: [0.86, 0.92, 0.98] },
      { h: 62, c: [0.68, 0.76, 0.86] },
      { h: 110, c: [0.46, 0.54, 0.66] },
    ],
    slopeColor: [0.34, 0.42, 0.52],
    snow: true,
    height(x, z, fbm) {
      const nx = x / 600, nz = z / 600;
      const valley = Math.abs(fbm(nx * 0.8, nz * 0.8)) * 64;
      const shelf = smoothstep(clamp(fbm(nx * 1.7 + 31, nz * 1.7) * 0.5 + 0.5, 0, 1)) * 22;
      const detail = fbm(nx * 5, nz * 5) * 4;
      const lake = Math.hypot(x + 220, z - 120);
      const flat = smoothstep(clamp(1 - lake / 240, 0, 1));
      const h = valley + shelf + detail;
      return lerp(h, 1.5, flat * 0.92) + rimWall(x, z);
    },
    water: { level: 1.2, color: 0x8fc4e8, opacity: 0.85, frozen: true },
    propsSpec: { kind: "pines+boulders", count: 110 },
  }),

  // ── 3. GENESIS-IV — terraformed alien world, teal flora ─────────
  makeMap({
    id: "verdant",
    name: "Genesis-IV",
    blurb: "A half-terraformed colony world. The green is not from Earth.",
    seed: 303,
    sky: { top: 0x05101a, horizon: 0x16484a, sun: 0xe6fff0, sunPos: [0.25, 0.5, -0.3] },
    fog: { color: 0x123030, near: 460, far: 1700 },
    hemi: { sky: 0x7fe0d0, ground: 0x2a4a30, intensity: 0.85 },
    sunlight: { color: 0xeafff4, intensity: 2.0 },
    nebula: 0x1f7a6a,
    planet: { dir: [0.62, 0.1, -0.78], color: 0x4fae8a, size: 0.16, ring: true },
    palette: [
      { h: -8, c: [0.08, 0.24, 0.2] },
      { h: 8, c: [0.12, 0.4, 0.3] },
      { h: 28, c: [0.18, 0.52, 0.38] },
      { h: 52, c: [0.26, 0.5, 0.4] },
      { h: 95, c: [0.34, 0.46, 0.46] },
    ],
    slopeColor: [0.22, 0.34, 0.32],
    grass: true,
    height(x, z, fbm) {
      const nx = x / 520, nz = z / 520;
      const downs = fbm(nx, nz) * 46 + fbm(nx * 0.4 + 7, nz * 0.4) * 26;
      const knolls = Math.max(0, fbm(nx * 2.4 + 17, nz * 2.4 - 9)) * 24;
      const detail = fbm(nx * 7, nz * 7) * 2.2;
      const river = Math.abs(fbm(nx * 0.7 + 50, nz * 0.7 + 50)) * 999;
      const cut = Math.max(0, 16 - river * 0.5);
      return downs + knolls + detail - cut + 6 + rimWall(x, z);
    },
    water: { level: -6, color: 0x1fa8a0, opacity: 0.82, energy: true, emissive: 1.2 },
    propsSpec: { kind: "trees+stones", count: 150 },
  }),

  // ── 4. IO ASCENDANT — volcanic moon, sulfur and lava ────────────
  makeMap({
    id: "cinder",
    name: "Io Ascendant",
    blurb: "Sulfur plains and red rivers. Jupiter broods over the calderas.",
    seed: 404,
    sky: { top: 0x0a0408, horizon: 0x5a2412, sun: 0xff8a3c, sunPos: [-0.2, 0.18, -0.55] },
    fog: { color: 0x2a120c, near: 280, far: 1300 },
    hemi: { sky: 0x8a4a3a, ground: 0x281410, intensity: 1.1 },
    sunlight: { color: 0xffa066, intensity: 2.0 },
    exposure: 1.42,
    nebula: 0x6a2a14,
    planet: { dir: [-0.3, 0.14, -0.86], color: 0xb88a5a, size: 0.3, ring: false },
    palette: [
      { h: -10, c: [0.22, 0.18, 0.12] },
      { h: 10, c: [0.4, 0.3, 0.14] },
      { h: 34, c: [0.56, 0.42, 0.18] },
      { h: 70, c: [0.4, 0.26, 0.16] },
      { h: 130, c: [0.5, 0.4, 0.22] },
    ],
    slopeColor: [0.2, 0.14, 0.1],
    embers: true,
    height(x, z, fbm) {
      const nx = x / 540, nz = z / 540;
      const r = Math.hypot(x - 60, z + 80);
      const cone = Math.max(0, 1 - r / 420) * 120;
      const crater = Math.max(0, 1 - r / 130) * 70;
      const rough = Math.abs(fbm(nx * 2.1, nz * 2.1)) * 30;
      const flows = Math.abs(fbm(nx * 1.1 + 99, nz * 1.1)) * 999;
      const channel = Math.max(0, 18 - flows * 0.55);
      return cone - crater + rough - channel + 8 + rimWall(x, z);
    },
    water: { level: 1, color: 0xff5a18, opacity: 0.95, lava: true, emissive: 2.2 },
    propsSpec: { kind: "spires", count: 80 },
  }),

  // ── 5. GRID SECTOR 7 — synthwave training construct ─────────────
  makeMap({
    id: "neon",
    name: "Grid Sector 7",
    blurb: "A combat simulation that never powered down. The grid remembers.",
    seed: 505,
    sky: { top: 0x070114, horizon: 0xff2e88, sun: 0x66e0ff, sunPos: [0, 0.26, -0.8] },
    fog: { color: 0x1a0533, near: 300, far: 1300 },
    hemi: { sky: 0x4422aa, ground: 0x140a26, intensity: 0.85 },
    sunlight: { color: 0x9fd0ff, intensity: 1.2 },
    exposure: 1.2,
    nebula: 0xff2e88,
    palette: [
      { h: -12, c: [0.05, 0.02, 0.12] },
      { h: 6, c: [0.1, 0.05, 0.22] },
      { h: 30, c: [0.16, 0.08, 0.3] },
      { h: 64, c: [0.24, 0.1, 0.36] },
      { h: 120, c: [0.36, 0.16, 0.46] },
    ],
    slopeColor: [0.07, 0.03, 0.16],
    wireframeGlow: 0xff2e88,
    height(x, z, fbm) {
      const nx = x / 500, nz = z / 500;
      const base = fbm(nx, nz) * 0.5 + 0.5;
      const terrace = Math.round(base * 5) / 5;
      const blend = lerp(base, terrace, 0.45) * 64;
      const rift = Math.abs(fbm(nx * 0.8 + 77, nz * 0.8 - 33)) * 999;
      const cut = Math.max(0, 15 - rift * 0.6);
      const detail = fbm(nx * 5, nz * 5) * 2;
      return blend - cut + detail + rimWall(x, z);
    },
    water: { level: -8, color: 0x21e6ff, opacity: 0.9, energy: true, emissive: 1.8 },
    propsSpec: { kind: "monoliths", count: 70 },
  }),

  // ── 6. VALLES MARINERIS — Martian canyon country ───────────────
  makeMap({
    id: "razorwash",
    name: "Valles Marineris",
    blurb: "Rust tables split by sly canyons that beg for bank shots. Phobos rises.",
    seed: 606,
    sky: { top: 0x0a0606, horizon: 0x7a3a22, sun: 0xffd0a0, sunPos: [0.5, 0.25, -0.42] },
    fog: { color: 0x4a241a, near: 380, far: 1600 },
    hemi: { sky: 0xb98a6a, ground: 0x5a3424, intensity: 0.7 },
    sunlight: { color: 0xffcaa0, intensity: 2.1 },
    exposure: 1.16,
    nebula: 0x6a3422,
    planet: { dir: [0.7, 0.08, -0.7], color: 0x9a8278, size: 0.06, ring: false },
    palette: [
      { h: -12, c: [0.34, 0.18, 0.12] },
      { h: 10, c: [0.54, 0.28, 0.16] },
      { h: 34, c: [0.7, 0.4, 0.22] },
      { h: 68, c: [0.48, 0.26, 0.16] },
      { h: 118, c: [0.3, 0.18, 0.13] },
    ],
    slopeColor: [0.4, 0.22, 0.15],
    height(x, z, fbm) {
      const nx = x / 560, nz = z / 560;
      const plateau = 46 + fbm(nx * 0.7 - 4, nz * 0.7 + 2) * 18;
      const veinA = Math.abs(fbm(nx * 1.05 + 13, nz * 1.05 - 21));
      const veinB = Math.abs(fbm(nz * 1.0 - 7, nx * 1.0 + 44));
      const branch = Math.min(veinA, veinB * 1.08);
      const slot = smoothstep(clamp(1 - branch / 0.19, 0, 1)) * 44;
      const shoulders = Math.pow(Math.max(0, 0.28 - branch), 2) * 75;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 90, 0, 1));
      const h = plateau - slot + shoulders + fbm(nx * 5.5, nz * 5.5) * 2.5;
      return lerp(h, 18 + fbm(nx * 2, nz * 2) * 2, center * 0.88) + rimWall(x, z);
    },
    propsSpec: { kind: "spires", count: 110 },
  }),

  // ── 7. TITAN SHALLOWS — methane seas under Saturn ──────────────
  makeMap({
    id: "lowtide",
    name: "Titan Shallows",
    blurb: "Methane flats and exposed ice roads under a thick orange haze. Saturn looms.",
    seed: 707,
    sky: { top: 0x1a1206, horizon: 0xc98a3a, sun: 0xffe0a0, sunPos: [-0.35, 0.46, 0.25] },
    fog: { color: 0x8a6024, near: 320, far: 1300 },
    hemi: { sky: 0xe0b070, ground: 0x5a4a2a, intensity: 1.0 },
    sunlight: { color: 0xffd88a, intensity: 1.6 },
    exposure: 1.3,
    stars: false,
    nebula: 0xc98a3a,
    planet: { dir: [-0.4, 0.2, -0.85], color: 0xd8c088, size: 0.36, ring: true },
    palette: [
      { h: -10, c: [0.34, 0.3, 0.18] },
      { h: 4, c: [0.6, 0.5, 0.28] },
      { h: 22, c: [0.72, 0.6, 0.34] },
      { h: 50, c: [0.5, 0.44, 0.26] },
      { h: 95, c: [0.36, 0.32, 0.22] },
    ],
    slopeColor: [0.42, 0.36, 0.22],
    height(x, z, fbm) {
      const nx = x / 620, nz = z / 620;
      const islands = Math.max(0, fbm(nx * 1.6 + 17, nz * 1.6 - 8) + 0.1) * 54;
      const barsA = Math.max(0, 0.2 - Math.abs(fbm(nx * 0.85 + 70, nz * 0.85))) * 95;
      const barsB = Math.max(0, 0.16 - Math.abs(fbm(nz * 0.9 - 31, nx * 0.9 + 9))) * 75;
      const lagoon = -8 + fbm(nx * 0.45, nz * 0.45) * 5;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 85, 0, 1));
      const h = lagoon + islands + barsA + barsB + fbm(nx * 7, nz * 7) * 1.6;
      return lerp(h, 10, center * 0.9) + rimWall(x, z);
    },
    water: { level: 1.5, color: 0xc08a3a, opacity: 0.6 },
    propsSpec: { kind: "monoliths", count: 75 },
  }),

  // ── 8. LUNA FAR SIDE — crater bowls, hardest star field ────────
  makeMap({
    id: "regolith",
    name: "Luna Far Side",
    blurb: "Every old impact is a bunker until someone lobs into it. No Earth here.",
    seed: 808,
    sky: { top: 0x010204, horizon: 0x0e141c, sun: 0xfffaf0, sunPos: [0.15, 0.22, -0.72] },
    fog: { color: 0x0a0e14, near: 620, far: 2100 },
    hemi: { sky: 0x6a7280, ground: 0x202327, intensity: 0.46 },
    sunlight: { color: 0xfff4e2, intensity: 2.7 },
    exposure: 1.05,
    nebula: 0x1a2440,
    palette: [
      { h: -18, c: [0.18, 0.18, 0.19] },
      { h: 0, c: [0.3, 0.3, 0.31] },
      { h: 22, c: [0.46, 0.46, 0.45] },
      { h: 58, c: [0.34, 0.34, 0.35] },
      { h: 108, c: [0.56, 0.56, 0.56] },
    ],
    slopeColor: [0.24, 0.25, 0.26],
    height(x, z, fbm) {
      const nx = x / 580, nz = z / 580;
      const swell = fbm(nx * 0.6, nz * 0.6) * 22 + 24;
      let craters = 0;
      const sites = [
        [-310, -260, 165, 30], [270, -320, 130, 24], [-60, -310, 105, 20],
        [-390, 120, 115, 23], [330, 170, 155, 32], [-150, 285, 145, 28],
        [120, 300, 95, 18], [-520, -40, 90, 16], [485, -75, 110, 21],
      ];
      for (const [cx, cz, radius, depth] of sites) {
        const d = Math.hypot(x - cx, z - cz) / radius;
        const bowl = smoothstep(clamp(1 - d, 0, 1));
        const rim = Math.max(0, 1 - Math.abs(d - 1.08) / 0.22);
        craters += rim * depth * 0.85 - bowl * depth;
      }
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 75, 0, 1));
      const h = swell + craters + fbm(nx * 6.5 + 3, nz * 6.5 - 5) * 3;
      return lerp(h, 12, center * 0.94) + rimWall(x, z);
    },
    propsSpec: { kind: "monoliths", count: 55 },
  }),

  // ── 9. CERES FLATS — bright salt-ice dwarf planet ──────────────
  makeMap({
    id: "mirrorsalt",
    name: "Ceres Flats",
    blurb: "Blinding salt-ice lanes make every mesa a verdict.",
    seed: 909,
    sky: { top: 0x060a12, horizon: 0x3a4a5c, sun: 0xffffff, sunPos: [0.48, 0.62, 0.18] },
    fog: { color: 0x28323e, near: 540, far: 1900 },
    hemi: { sky: 0xc8dcf0, ground: 0x9aa0a4, intensity: 1.0 },
    sunlight: { color: 0xfffaf0, intensity: 2.3 },
    exposure: 1.34,
    nebula: 0x2a3a5a,
    palette: [
      { h: -8, c: [0.78, 0.8, 0.82] },
      { h: 8, c: [0.88, 0.9, 0.92] },
      { h: 28, c: [0.66, 0.7, 0.74] },
      { h: 60, c: [0.46, 0.56, 0.62] },
      { h: 115, c: [0.34, 0.44, 0.52] },
    ],
    slopeColor: [0.42, 0.48, 0.52],
    height(x, z, fbm) {
      const nx = x / 610, nz = z / 610;
      const flats = fbm(nx * 0.55 + 8, nz * 0.55 - 8) * 4;
      const mesas = [
        [-390, -250, 145, 58], [-35, -360, 110, 48], [330, -210, 150, 64],
        [-315, 185, 120, 54], [185, 250, 175, 70], [505, 115, 95, 42],
      ];
      let caps = 0;
      for (const [cx, cz, radius, height] of mesas) {
        const d = Math.hypot(x - cx, z - cz) / radius;
        const cap = smoothstep(clamp(1 - d, 0, 1));
        const skirt = smoothstep(clamp(1 - d / 1.55, 0, 1));
        caps += cap * height + skirt * height * 0.28;
      }
      const pans = -Math.max(0, fbm(nx * 1.25 - 40, nz * 1.25 + 14) - 0.3) * 10;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 80, 0, 1));
      const h = 8 + flats + caps + pans;
      return lerp(h, 7, center * 0.96) + rimWall(x, z);
    },
    water: { level: 0, color: 0xcfe2ec, opacity: 0.34 },
    propsSpec: { kind: "monoliths", count: 65 },
  }),

  // ── 10. XENO DELTA — alien jungle moon, glowing rivers ─────────
  makeMap({
    id: "greenbraid",
    name: "Xeno Delta",
    blurb: "Bioluminescent river fingers split the xeno-jungle into ambush lanes.",
    seed: 1010,
    sky: { top: 0x05101c, horizon: 0x1a5a4a, sun: 0xe6ffd6, sunPos: [-0.25, 0.5, 0.42] },
    fog: { color: 0x123a30, near: 320, far: 1380 },
    hemi: { sky: 0x6ad8c0, ground: 0x1a4028, intensity: 0.95 },
    sunlight: { color: 0xe8ffc8, intensity: 1.85 },
    exposure: 1.18,
    nebula: 0x1f8a6a,
    planet: { dir: [0.5, 0.1, -0.82], color: 0x6ab0d8, size: 0.22, ring: false },
    palette: [
      { h: -10, c: [0.05, 0.2, 0.16] },
      { h: 6, c: [0.09, 0.32, 0.22] },
      { h: 28, c: [0.14, 0.44, 0.28] },
      { h: 58, c: [0.2, 0.42, 0.3] },
      { h: 106, c: [0.3, 0.4, 0.36] },
    ],
    slopeColor: [0.14, 0.24, 0.2],
    grass: true,
    height(x, z, fbm) {
      const nx = x / 570, nz = z / 570;
      const banks = 24 + fbm(nx * 0.8, nz * 0.8) * 28 + Math.max(0, fbm(nx * 2.2 - 6, nz * 2.2 + 11)) * 18;
      const riverA = Math.abs(fbm(nx * 0.95 + 10, nz * 0.95 - 30));
      const riverB = Math.abs(fbm(nx * 1.2 - 58, nz * 1.2 + 14));
      const channels = smoothstep(clamp(1 - Math.min(riverA, riverB * 1.15) / 0.16, 0, 1)) * 30;
      const levees = Math.max(0, 0.25 - Math.min(riverA, riverB)) * 38;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 85, 0, 1));
      const h = banks - channels + levees + fbm(nx * 7, nz * 7) * 2.2;
      return lerp(h, 13, center * 0.9) + rimWall(x, z);
    },
    water: { level: 2, color: 0x18c0a0, opacity: 0.8, energy: true, emissive: 1.4 },
    propsSpec: { kind: "trees+stones", count: 185 },
  }),

  // ── 11. OLYMPUS SPIRES — Martian striped hoodoo country ────────
  makeMap({
    id: "paintedneedles",
    name: "Olympus Spires",
    blurb: "Wind-striped Martian needles turn every shell arc theatrical.",
    seed: 1111,
    sky: { top: 0x0a0606, horizon: 0x9a5638, sun: 0xffd0a0, sunPos: [0.32, 0.36, -0.48] },
    fog: { color: 0x5a3022, near: 360, far: 1500 },
    hemi: { sky: 0xc88a64, ground: 0x6a3a2a, intensity: 0.78 },
    sunlight: { color: 0xffbc87, intensity: 2.1 },
    exposure: 1.26,
    nebula: 0x7a3a22,
    planet: { dir: [-0.45, 0.12, -0.8], color: 0x8a7a6a, size: 0.07, ring: false },
    palette: [
      { h: -10, c: [0.46, 0.22, 0.18] },
      { h: 12, c: [0.72, 0.38, 0.26] },
      { h: 32, c: [0.86, 0.56, 0.38] },
      { h: 62, c: [0.74, 0.42, 0.46] },
      { h: 112, c: [0.5, 0.27, 0.34] },
    ],
    slopeColor: [0.45, 0.25, 0.2],
    height(x, z, fbm) {
      const nx = x / 560, nz = z / 560;
      const wash = 20 + fbm(nx * 0.8, nz * 0.8) * 22;
      const hoodooNoise = fbm(nx * 2.8 + 90, nz * 2.8 - 17) * 0.5 + 0.5;
      const needles = Math.pow(Math.max(0, hoodooNoise - 0.56) / 0.44, 2.2) * 72;
      const gullies = smoothstep(clamp(1 - Math.abs(fbm(nx * 1.25 - 11, nz * 1.25 + 5)) / 0.17, 0, 1)) * 18;
      const ripples = Math.sin((x + z * 0.55) * 0.035) * 2.4;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 85, 0, 1));
      const h = wash + needles - gullies + ripples + fbm(nx * 6, nz * 6) * 2;
      return lerp(h, 12, center * 0.9) + rimWall(x, z);
    },
    propsSpec: { kind: "spires", count: 125 },
  }),

  // ── 12. ENCELADUS RIFTS — geyser ice moon under Saturn ─────────
  makeMap({
    id: "blueknife",
    name: "Enceladus Rifts",
    blurb: "Blue tiger-stripe crevasses vent ice into the dark. Saturn rules the sky.",
    seed: 1212,
    sky: { top: 0x040810, horizon: 0x2e4a5e, sun: 0xf6fbff, sunPos: [-0.55, 0.28, -0.25] },
    fog: { color: 0x1a2e3a, near: 340, far: 1450 },
    hemi: { sky: 0xaad0e8, ground: 0x44606e, intensity: 0.9 },
    sunlight: { color: 0xeaf7ff, intensity: 1.7 },
    exposure: 1.14,
    nebula: 0x2a4a66,
    planet: { dir: [-0.6, 0.16, -0.78], color: 0xd8c088, size: 0.38, ring: true },
    palette: [
      { h: -12, c: [0.34, 0.54, 0.64] },
      { h: 4, c: [0.56, 0.74, 0.84] },
      { h: 24, c: [0.82, 0.9, 0.95] },
      { h: 56, c: [0.66, 0.78, 0.88] },
      { h: 108, c: [0.46, 0.6, 0.72] },
    ],
    slopeColor: [0.34, 0.46, 0.56],
    snow: true,
    height(x, z, fbm) {
      const nx = x / 590, nz = z / 590;
      const shelf = 30 + fbm(nx * 0.7, nz * 0.7) * 26 + Math.abs(fbm(nx * 1.8 + 8, nz * 1.8 - 2)) * 18;
      const crackA = Math.abs(fbm(nx * 1.05 + 31, nz * 1.05 + 60));
      const crackB = Math.abs(fbm(nz * 1.2 - 19, nx * 1.2 + 47));
      const crevasse = smoothstep(clamp(1 - Math.min(crackA, crackB) / 0.13, 0, 1)) * 36;
      const berm = Math.max(0, 0.22 - Math.min(crackA, crackB)) * 55;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 90, 0, 1));
      const h = shelf - crevasse + berm + fbm(nx * 8, nz * 8) * 1.7;
      return lerp(h, 15, center * 0.92) + rimWall(x, z);
    },
    water: { level: -4, color: 0x6ac4e8, opacity: 0.82, frozen: true, energy: true, emissive: 0.8 },
    propsSpec: { kind: "pines+boulders", count: 115 },
  }),

  // ── 13. ORBITAL TERRACE — terraformed ring-station decks ───────
  makeMap({
    id: "ringfarm",
    name: "Orbital Terrace",
    blurb: "Stepped station decks make polite stairs for impolite artillery.",
    seed: 1313,
    sky: { top: 0x050a14, horizon: 0x2a5a64, sun: 0xffeec8, sunPos: [0.4, 0.55, 0.18] },
    fog: { color: 0x163036, near: 440, far: 1650 },
    hemi: { sky: 0x8ad0e0, ground: 0x3a5232, intensity: 0.9 },
    sunlight: { color: 0xffe0a0, intensity: 1.95 },
    exposure: 1.2,
    nebula: 0x2a6a7a,
    planet: { dir: [0.55, 0.1, -0.8], color: 0x5b86c4, size: 0.26, ring: false },
    palette: [
      { h: -10, c: [0.2, 0.3, 0.22] },
      { h: 8, c: [0.32, 0.46, 0.3] },
      { h: 28, c: [0.46, 0.54, 0.34] },
      { h: 54, c: [0.5, 0.46, 0.32] },
      { h: 98, c: [0.36, 0.36, 0.32] },
    ],
    slopeColor: [0.3, 0.32, 0.26],
    grass: true,
    height(x, z, fbm) {
      const nx = x / 600, nz = z / 600;
      const r = Math.hypot(x + 25, z - 35);
      const ring = Math.floor(clamp(r / 82, 0, 7)) * 8.5;
      const valley = 68 - ring;
      const lake = smoothstep(clamp(1 - r / 185, 0, 1)) * 54;
      const orchard = Math.max(0, fbm(nx * 2.1 + 12, nz * 2.1 - 5)) * 12;
      const lanes = Math.sin(Math.atan2(z - 35, x + 25) * 10) * 1.8;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 82, 0, 1));
      const h = valley - lake + orchard + lanes + fbm(nx * 5.5, nz * 5.5) * 1.5;
      return lerp(h, 14, center * 0.88) + rimWall(x, z);
    },
    water: { level: 5, color: 0x3aa0b0, opacity: 0.74, energy: true, emissive: 1.0 },
    propsSpec: { kind: "trees+stones", count: 160 },
  }),

  // ── 14. HEPHAESTUS RING — molten moat moon ─────────────────────
  makeMap({
    id: "magmahalo",
    name: "Hephaestus Ring",
    blurb: "A molten moat dares commanders to fight across the glow.",
    seed: 1414,
    sky: { top: 0x0a0406, horizon: 0x6a2e16, sun: 0xff9c55, sunPos: [-0.18, 0.2, 0.62] },
    fog: { color: 0x3a1c14, near: 290, far: 1320 },
    hemi: { sky: 0x9c5648, ground: 0x201a18, intensity: 1.0 },
    sunlight: { color: 0xffa06c, intensity: 1.9 },
    exposure: 1.44,
    nebula: 0x7a2e16,
    planet: { dir: [-0.2, 0.12, -0.88], color: 0xc06a3a, size: 0.18, ring: false },
    palette: [
      { h: -12, c: [0.12, 0.11, 0.1] },
      { h: 6, c: [0.22, 0.2, 0.17] },
      { h: 28, c: [0.36, 0.31, 0.25] },
      { h: 62, c: [0.32, 0.25, 0.21] },
      { h: 120, c: [0.48, 0.4, 0.33] },
    ],
    slopeColor: [0.16, 0.13, 0.11],
    embers: true,
    height(x, z, fbm) {
      const nx = x / 560, nz = z / 560;
      const r = Math.hypot(x - 20, z + 10);
      const ash = 20 + fbm(nx * 0.75, nz * 0.75) * 20 + Math.abs(fbm(nx * 2.4 - 8, nz * 2.4 + 4)) * 14;
      const ring = Math.max(0, 1 - Math.abs(r - 285) / 55);
      const moat = smoothstep(clamp(ring, 0, 1)) * 34;
      const rampBreaks = Math.max(0, fbm(nx * 3.1 + 80, nz * 3.1 - 2) - 0.42) * 18;
      const outerRidge = Math.max(0, 1 - Math.abs(r - 405) / 170) * 34;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 88, 0, 1));
      const h = ash + outerRidge - moat + rampBreaks + fbm(nx * 7, nz * 7) * 2;
      return lerp(h, 15, center * 0.9) + rimWall(x, z);
    },
    water: { level: 0, color: 0xff6b1a, opacity: 0.95, lava: true, emissive: 2.4 },
    propsSpec: { kind: "spires", count: 95 },
  }),

  // ── 15. FRACTAL CONSTRUCT — alien megastructure plates ─────────
  makeMap({
    id: "fractalpanes",
    name: "Fractal Construct",
    blurb: "Alien tiles tilt the battlefield into a luminous puzzle.",
    seed: 1515,
    sky: { top: 0x020915, horizon: 0x0f4b5c, sun: 0x8ffcff, sunPos: [0.05, 0.3, -0.75] },
    fog: { color: 0x08242e, near: 330, far: 1350 },
    hemi: { sky: 0x55ccdd, ground: 0x061015, intensity: 0.82 },
    sunlight: { color: 0xb6faff, intensity: 1.25 },
    exposure: 1.26,
    nebula: 0x0f4b5c,
    wireframeGlow: 0x36ffe2,
    palette: [
      { h: -14, c: [0.03, 0.07, 0.09] },
      { h: 4, c: [0.06, 0.14, 0.16] },
      { h: 26, c: [0.1, 0.24, 0.25] },
      { h: 58, c: [0.16, 0.34, 0.33] },
      { h: 112, c: [0.24, 0.42, 0.38] },
    ],
    slopeColor: [0.05, 0.12, 0.13],
    height(x, z, fbm) {
      const nx = x / 520, nz = z / 520;
      const plateNoise = fbm(nx * 1.45, nz * 1.45) * 0.5 + 0.5;
      const plate = Math.round(plateNoise * 7) / 7;
      const tiltA = Math.floor((x + 700) / 140) * 2.8;
      const tiltB = Math.floor((z + 700) / 160) * -2.4;
      const seams = Math.max(0, 0.2 - Math.abs(fbm(nx * 2.4 + 18, nz * 2.4 - 33))) * 85;
      const sink = smoothstep(clamp(seams / 17, 0, 1)) * 20;
      const drift = fbm(nx * 0.65 - 44, nz * 0.65 + 2) * 18;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 86, 0, 1));
      const h = plate * 58 + tiltA + tiltB + drift - sink + fbm(nx * 8, nz * 8) * 1.4;
      return lerp(h, 16, center * 0.9) + rimWall(x, z);
    },
    water: { level: -6, color: 0x35fff0, opacity: 0.84, energy: true, emissive: 2.0 },
    propsSpec: { kind: "monoliths", count: 90 },
  }),

  // ── 16. ASTEROID DRIFT — broken rock in deep void (NEW) ────────
  makeMap({
    id: "asteroid",
    name: "Asteroid Drift",
    blurb: "A captured rock tumbling in the dark. Hard shadows, harder cover.",
    seed: 1616,
    sky: { top: 0x010103, horizon: 0x070a12, sun: 0xffffff, sunPos: [0.62, 0.3, -0.5] },
    fog: { color: 0x05070c, near: 700, far: 2200 },
    hemi: { sky: 0x44505e, ground: 0x141518, intensity: 0.34 },
    sunlight: { color: 0xffffff, intensity: 3.1 },
    exposure: 1.0,
    nebula: 0x2a2050,
    palette: [
      { h: -20, c: [0.16, 0.15, 0.16] },
      { h: 0, c: [0.26, 0.25, 0.26] },
      { h: 26, c: [0.4, 0.38, 0.38] },
      { h: 64, c: [0.3, 0.29, 0.3] },
      { h: 120, c: [0.5, 0.48, 0.47] },
    ],
    slopeColor: [0.2, 0.19, 0.2],
    height(x, z, fbm) {
      const nx = x / 480, nz = z / 480;
      const ridges = Math.pow(Math.abs(fbm(nx * 1.7 + 3, nz * 1.7 - 6)), 0.6) * 70;
      const chasm = smoothstep(clamp(1 - Math.abs(fbm(nx * 0.9 + 40, nz * 0.9 - 12)) / 0.14, 0, 1)) * 46;
      const spurs = Math.pow(Math.max(0, fbm(nx * 3.2 - 9, nz * 3.2 + 4)), 2) * 38;
      const detail = fbm(nx * 7, nz * 7) * 4;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 80, 0, 1));
      const h = 24 + ridges - chasm + spurs + detail;
      return lerp(h, 16, center * 0.85) + rimWall(x, z);
    },
    propsSpec: { kind: "monoliths", count: 95 },
  }),

  // ── 17. SATURN'S EDGE — high decks beneath the rings (NEW) ─────
  makeMap({
    id: "saturnedge",
    name: "Saturn's Edge",
    blurb: "Fight on broken cliff decks while the rings slice the whole sky in half.",
    seed: 1717,
    sky: { top: 0x060812, horizon: 0x2a3550, sun: 0xfff0d0, sunPos: [0.3, 0.42, -0.6] },
    fog: { color: 0x141a2a, near: 460, far: 1750 },
    hemi: { sky: 0x9aa8d0, ground: 0x3a3e4c, intensity: 0.62 },
    sunlight: { color: 0xfff2da, intensity: 2.2 },
    exposure: 1.12,
    nebula: 0x33408a,
    planet: { dir: [0.0, 0.22, -0.97], color: 0xe8d8a8, size: 0.55, ring: true },
    palette: [
      { h: -14, c: [0.24, 0.24, 0.28] },
      { h: 4, c: [0.36, 0.36, 0.4] },
      { h: 28, c: [0.5, 0.49, 0.5] },
      { h: 62, c: [0.4, 0.4, 0.44] },
      { h: 118, c: [0.58, 0.57, 0.58] },
    ],
    slopeColor: [0.28, 0.28, 0.32],
    height(x, z, fbm) {
      const nx = x / 540, nz = z / 540;
      const base = fbm(nx * 0.9, nz * 0.9) * 0.5 + 0.5;
      const deck = Math.round(base * 4) / 4;
      const tiers = lerp(base, deck, 0.7) * 88;
      const fault = Math.abs(fbm(nx * 1.1 + 22, nz * 1.1 - 50));
      const drop = smoothstep(clamp(1 - fault / 0.12, 0, 1)) * 40;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 86, 0, 1));
      const h = tiers - drop + fbm(nx * 6, nz * 6) * 2.4;
      return lerp(h, 30, center * 0.9) + rimWall(x, z);
    },
    propsSpec: { kind: "monoliths", count: 80 },
  }),

  // ── 18. NOVA WASTES — crystal desert under a dying star (NEW) ──
  makeMap({
    id: "novawastes",
    name: "Nova Wastes",
    blurb: "Glass dunes and crystal needles burning under a swollen red star.",
    seed: 1818,
    sky: { top: 0x12040a, horizon: 0x8a1e2e, sun: 0xff5a3c, sunPos: [-0.3, 0.26, -0.6] },
    fog: { color: 0x44101a, near: 360, far: 1500 },
    hemi: { sky: 0xc04a4a, ground: 0x3a1418, intensity: 0.85 },
    sunlight: { color: 0xff7a5a, intensity: 2.0 },
    exposure: 1.3,
    nebula: 0xaa2244,
    planet: { dir: [-0.32, 0.18, -0.84], color: 0xff6a4a, size: 0.42, ring: false },
    palette: [
      { h: -12, c: [0.32, 0.14, 0.18] },
      { h: 12, c: [0.5, 0.2, 0.24] },
      { h: 34, c: [0.66, 0.3, 0.3] },
      { h: 64, c: [0.5, 0.24, 0.34] },
      { h: 118, c: [0.36, 0.18, 0.34] },
    ],
    slopeColor: [0.3, 0.14, 0.18],
    height(x, z, fbm) {
      const nx = x / 560, nz = z / 560;
      const dunes = Math.pow(Math.abs(fbm(nx * 1.4 + 5, nz * 1.4 - 8)), 0.8) * 40;
      const swell = fbm(nx * 0.5, nz * 0.5) * 22;
      const crystalNoise = fbm(nx * 3.0 + 60, nz * 3.0 - 22) * 0.5 + 0.5;
      const needles = Math.pow(Math.max(0, crystalNoise - 0.62) / 0.38, 2.4) * 78;
      const detail = fbm(nx * 6, nz * 6) * 2.4;
      const center = smoothstep(clamp(1 - Math.hypot(x, z) / 84, 0, 1));
      const h = 14 + dunes + swell + needles + detail;
      return lerp(h, 12, center * 0.9) + rimWall(x, z);
    },
    propsSpec: { kind: "spires", count: 120 },
  }),
];

export function mapById(id) {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}

/** Build the bound height sampler for a map (analytic, shared). */
export function makeHeightFn(map) {
  const fbm = makeFbm(map.seed, 5);
  return (x, z) => map.height(x, z, fbm);
}
