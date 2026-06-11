# SPACE VOLLEY

**Futuristic off-world tank artillery combat.** A National Space Defense Force
training arena: arc shells across lunar mare, Martian canyons and alien decks,
hose them down with the mounted machine gun up close, and scavenge the surface
for rounds that should probably be banned by treaty.

A stylistic/artistic re-skin of the [Iron Volley](https://github.com/jiujitsumagician/iron-volley)
engine — **same mechanics, same engine, all-new space setting** and an NSDF
command-terminal HUD. Iron Volley remains its own game; this is a separate one.

## Play

```bash
npm install
npm start          # → http://localhost:8137
```

No build step. Three.js via import map, everything else is hand-rolled. Deploys
static to GitHub Pages.

## Modes

- **SOLO OPS** — you against 1–7 computer-controlled tanks (Recruit / Veteran / Warlord)
- **SPLIT-SCREEN VERSUS** — two commanders on one keyboard (or two gamepads)
- **ONLINE VERSUS** — host or join a room with a 5-letter code

## Controls

| | Player 1 | Player 2 | Gamepad |
|---|---|---|---|
| Drive | `W` `A` `S` `D` | Arrow keys | Left stick |
| Turret / aim | `Q` / `E` · `R` / `F` | `,` / `.` · `'` / `;` | Right stick |
| Fire cannon | `Space` | `Enter` | RT |
| Machine gun (hold) | `Left Shift` | `/` | LT |
| Camera (1st / 3rd) | `C` | `P` | Y |

The cannon is ballistic — raise the barrel and lob shells **over** the terrain.
The machine gun is hitscan for close-quarters brawls, and it overheats.

## Worlds

Eighteen off-world arenas under deep star fields — lunar mare with Earthrise,
Europa and Enceladus ice, Io and Hephaestus lava moons, Valles Marineris and
Olympus on Mars, Titan's methane shallows under ringed Saturn, the Asteroid
Drift, Saturn's Edge beneath the rings, the Nova Wastes under a swollen red
star, plus the Grid Sector and Fractal Construct alien simulations.

## Discoverable rounds

Glowing beacon crates spawn across the map. Drive through one to load SCATTER,
LANCE, NUKE, INFERNO, SINGULARITY and more. First to 10 kills takes the field.

## Tests

```bash
npm run shots      # Playwright: screenshot every world + menu, fail on console errors
npm run playtest   # headless all-bot war: functional checks across all maps
```
