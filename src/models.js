// © 2026 [YOUR NAME HERE]. All rights reserved.
// Unauthorized copying, distribution, or use of this software is strictly prohibited.

/**
 * Cosmetic GLB model cache. Loads CC0 low-poly props + the vehicle hull
 * from assets/models/ via the local (offline-vendored) GLTFLoader and hands
 * out fresh clones. FULLY FAIL-SAFE: any load error simply leaves that model
 * absent — getModel() returns null and every caller falls back to its
 * procedural mesh. No model load can ever break the game.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// name -> parsed THREE.Group (the gltf scene), or absent if it failed to load
const _cache = new Map();
let _loaded = false;

// The GLBs we actually wire. Keep this list in sync with what terrain.js /
// tank.js request; only these files are shipped under assets/models/.
const MODELS = {
  vehicle: "assets/models/tank_static.glb",
  rock_01: "assets/models/rock_01.glb",
  rock_02: "assets/models/rock_02.glb",
  boulder_01: "assets/models/boulder_01.glb",
  boulder_02: "assets/models/boulder_02.glb",
  crystal_01: "assets/models/crystal_01.glb",
  crystal_02: "assets/models/crystal_02.glb",
  spire_01: "assets/models/spire_01.glb",
};

/**
 * Load every wired GLB. Idempotent — safe to await more than once. Never
 * rejects: failures are swallowed per-model so a missing/corrupt asset just
 * means that prop renders procedurally.
 */
export async function preloadModels() {
  if (_loaded) return;
  _loaded = true;
  let loader;
  try {
    loader = new GLTFLoader();
  } catch {
    return; // no loader (offline engine missing) -> all procedural
  }
  const load = (url) =>
    new Promise((resolve) => {
      try {
        loader.load(url, (gltf) => resolve(gltf.scene), undefined, () => resolve(null));
      } catch {
        resolve(null);
      }
    });
  await Promise.all(
    Object.entries(MODELS).map(async ([name, url]) => {
      const scene = await load(url);
      if (scene) _cache.set(name, scene);
    })
  );
}

/**
 * Fresh deep clone of a cached model, or null if it never loaded. Callers
 * must treat null as "use the procedural fallback".
 */
export function getModel(name) {
  const src = _cache.get(name);
  if (!src) return null;
  return src.clone(true);
}

/** Has any model loaded? (purely informational) */
export function anyModelLoaded() {
  return _cache.size > 0;
}

/**
 * Normalize an arbitrary GLB clone to a target footprint and recenter it on
 * the ground. CC0 props ship at wildly different native scales, so we measure
 * the clone's bounding box and rescale uniformly so its largest horizontal
 * extent equals `footprint` world units, then drop its base onto y=0.
 * Returns the same object (now scaled/positioned) for convenience.
 */
export function fitModel(obj, footprint, { ground = true } = {}) {
  const box = new THREE.Box3().setFromObject(obj);
  if (!box.isEmpty()) {
    const size = box.getSize(new THREE.Vector3());
    const horiz = Math.max(size.x, size.z) || 1;
    const k = footprint / horiz;
    obj.scale.multiplyScalar(k);
    if (ground) {
      // re-measure after scaling and seat the base at y=0
      const box2 = new THREE.Box3().setFromObject(obj);
      obj.position.y -= box2.min.y;
    }
  }
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return obj;
}
