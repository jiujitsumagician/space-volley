# Decisions Log — Aesthetic Overhaul (autonomous)

Operator absent; in-scope calls logged here per the goal.

- Fonts self-hosted as OFL .ttf under assets/fonts/ via @font-face, replacing the
  Google Fonts CDN <link> the first pass added — satisfies "all assets local / runs
  fully offline".
- Three.js is still loaded via the jsdelivr importmap (index.html). Vendoring the
  engine locally is a separate higher-risk step tracked for the final offline pass;
  all game ASSETS (models/textures/audio/fonts) are local.
- Space Volley logo reduced (clamp 30-62px, letter-spacing .04em) so "SPACE VOLLEY"
  in Orbitron fits the panel (wider glyphs overflowed at the inherited size).
- Music includes two CC0 .mp3 tracks; total audio ~12MB, well under the 100MB budget,
  so no OGG re-encode was needed.
- poly.pizza "hover tank" search returned no IDs; vehicle set filled from
  tank/spaceship/mech/vehicle queries (all CC0 low-poly).
- Mechanics freeze enforced structurally: gameplay-logic files are off-limits;
  git diff on those paths is empty after each wave. Verified via menu/nav/flow/live tests.

## Wave 2 (3D models / textures / offline engine)
- three.js + GLTFLoader + used addons + PeerJS vendored locally; importmap -> local paths;
  index.html has ZERO http(s) refs -> fully offline.
- Tank: GLB Quaternius hull as the visible chassis with the procedural
  turret/barrel/muzzle/mgMuzzle rig kept on top (rig-preserving) so aiming/firing are
  behaviour-identical; hover chassis stay procedural; fail-safe procedural fallback.
- Props: GLB models fitted to the EXISTING collider radius; obstacles.push collider
  entries unchanged; model variant derived from the already-rolled RNG value so the
  seeded stream (prop positions/scale/collider radius) is byte-identical.
- Terrain ground color+normal textures per map (fail-safe -> procedural detail on 404).
- Particle polish (muzzle embers / dust) via existing effect hooks (cosmetic only).
- Codex senior review run on the wave-2 diffs; its mechanics-drift blocker (Space Volley
  propModel drew a stray rng()) and the texture fail-safe gaps were fixed before commit.
- Mechanics: gameplay-logic files byte-clean; tank.js/terrain.js changes confined to
  visual builders; full headless playtest PASSED on both games.

## Wave 3 (render quality — ported from Iron Volley)
Space Volley forked before Iron Volley's render pass, so it was still running
the pre-wave-3 renderer. Ported, adapted to this game's own maps and terrain:
- EffectComposer's default render target carries no `samples`, so solo mode —
  the only mode that goes through the composer — was rendering with NO
  antialiasing despite `antialias: true` on the renderer. Fixed with an
  explicit multisampled HalfFloat target.
- Lighting probe switched from RoomEnvironment (an indoor studio box) to a
  PMREM baked from each map's OWN sky dome, cached per map id, with
  `skyEnvIntensity()` normalising on sky luminance so the very dark orbital
  skies here don't turn every craft into a silhouette.
- Shadows fitted per frame to the action and snapped to light-space texels
  instead of a fixed 420-unit box. The online guest returns early from
  update(), so it needed its own updateShadows() call — harmless under the old
  huge box, black screen under a fitted one.
- Grass was `alphaTest: 0.0` with no alpha map, i.e. solid untextured
  rectangles; now alpha-cut blades with a vertex-shader wind bend. Water and
  lava gained a scrolling ripple normal, driven by a cosmetic clock that also
  runs on the guest.
- Ground and ripple textures now take up to 8x anisotropy.

## Wave 4 (craft models)
- The shared GLB hull is RETIRED. `tank_static.glb` was being fitted to ALL
  TWELVE chassis (this fork applied it even to the hover chassis, which Iron
  Volley at least excluded), so WRAITH and COLOSSUS — a 9.4-unit recon skimmer
  and a 13.2-unit dreadnought — wore the identical blob, and `plated` /
  `lowProfile` / `angular` had no visible effect at all. Everything is
  procedural again, built per chassis from the build flags.
- New `src/craftart.js` holds all craft visuals. tank.js keeps the entity and
  the frozen rig and just composes them, so the mechanics audit has one file
  to read.
- Anti-grav drive replaces Iron Volley's running gear: plenum skirt, a
  scrolling lift-emitter strip along the outboard bottom edge, ventral wash,
  intake ports, downward lift pods, vector fins, and turbine fans in the
  thruster nozzles.
- Two rejected iterations worth recording, both caught on the bench:
  a side-mounted spinning intake rotor reads as a ROAD WHEEL no matter how
  small it gets, which is the one thing an anti-grav craft must never look
  like — the only moving part now lives down the exhaust, where a spinning
  disc reads as an engine. And the first lift emitters were positioned inside
  the skirt volume, so the defining "this thing is floating" cue rendered as
  nothing at all.
- Spinners carry `userData.spinAxis`, because nozzle fans face aft (turn about
  Z) while flank hardware faces outboard (turns about X). The old code assumed
  X for everything, which was fine when everything was a road wheel.
- Hull plating is textured from a generated height field Sobel'd into a normal
  map — a milled panel grid with recessed seams, raised sub-panels, louvred
  heat vents and bolted hatches. Deliberately NOT Iron Volley's rivet-and-weld
  language: this hardware is machined, not welded in a shed. Deterministic
  seed, so the plate is identical every boot.
- Plating is mostly dielectric (metalness 0.18, vs the 0.62 the re-skin used).
  Under the new sky IBL the old value made every craft read as polished brass.
- The gun is an accelerator lance: stacked coil rings, side rails and a glowing
  muzzle emitter, instead of a powder tube with a muzzle brake.
- Craft now RECEIVE shadows, not just cast them — with the shadow box fitted
  tightly to the action, they were the one thing that couldn't benefit.
- Draw calls held roughly flat despite ~40 new greebles per craft: static
  detail is merged per material (35 meshes / ~4k tris per craft). Note
  mergeGeometries rejects a batch mixing indexed and non-indexed geometry —
  and this one always does, since ExtrudeGeometry is non-indexed and
  Box/Cylinder are not — so everything is flattened to non-indexed first.
- `disposeMaterial()` frees every texture slot, not just `.map`; plating brings
  a per-craft normal + roughness clone, so teardown was leaking GPU textures.
- Judged on a real GPU via `test/gallery.mjs` (contact sheet of all twelve
  chassis plus single-chassis views). SwiftShader is too coarse to show
  material or geometry detail, and its capture times forced the harness
  timeouts up rather than the features down.
- Mechanics: every gameplay-logic file byte-clean; the rig offsets
  (turret/barrel/muzzle/mgMuzzle/tubeOffsets) are byte-identical to the
  previous commit, so shells still spawn exactly where they did. Full playtest
  PASSED.

