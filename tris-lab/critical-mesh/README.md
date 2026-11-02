# Critical Mesh

A pixel-art, push-your-luck game about heat conduction. Every simulation in the game is solved by [FEAScript](https://feascript.com).

Nodessa, 2089. The city runs on the Heatworks: a 40 m × 20 m slab of alloy (the Plate) covered in thermo-cells. You are the new night engineer. Roll a die for each cell's power, walk onto the Plate and mount the cell, then watch FEAScript solve the temperature field. Deliver the quota before the hottest point passes the critical limit.

## Run it

Open `index.html` directly in a browser (double-click, `file://`), or serve the folder:

```bash
python3 -m http.server   # then open http://localhost:8000/tris-lab/critical-mesh/
```

It needs an internet connection: FEAScript is loaded from its CDN (pinned to a release by `FEASCRIPT_VERSION` in `js/config.js`).

## Modes

- **Campaign**: 10 night shifts and 3 engineering interludes, with a story. Each shift has a quota (in MW) and up to three stars. Interlude results carry over: a clean cast removes a crack in shift 8, a flushed manifold keeps the coolant at 20 °C in shift 9.
- **Endless shift**: the original push-your-luck rules. Score = cells placed. Bank whenever you like; a meltdown scores 0. Each difficulty has its own top-10 table, kept in `localStorage`.

## The physics

| Where | FEAScript model | What is solved |
|---|---|---|
| Every shift | `heatConductionScript` | −∇·(k ∇T) = Q on 32 × 16 quadratic elements. Q(x, y) comes from the mounted cells; k(x, y) from the alloy, cracks (15 % k) and copper inlays (k = 10). Bottom edge: coolant (fixed temperature). Top edge: convection (h = 0.1 on the 40 m Plate). Sides: insulated, or convective after a side vent is opened. |
| Shift 8 | `heatConductionScript` + `importGmshMesh` | The same equation on a non-rectangular plate: a Gmsh mesh with a coolant bypass pipe (a 5th boundary) through it. |
| The Gantry | `eulerBernoulliBeamScript` | A cantilever catwalk with a corroded section (lower EI(x)) and self-weight q(x). 17 load cases, one for each position the engineer can stand on. Place two props so the sag stays under 4 cm. |
| Cold Pour | `frontPropagationScript` | The eikonal equation \|∇φ\| = 1 gives the freezing time φ. Choose which mould walls to chill so the riser freezes last. |
| Pump Room | `creepingFlowScript` | Stokes flow in the coolant manifold, driven by moving wall belts. Get enough flow through two clogs. |

Each solve is logged to the console with its time (budget: < 1 s). On load, the game solves an empty plate and checks that its maximum temperature is exactly 20 °C.

The difficulty constants in `js/config.js` were tuned by simulating games with bots on the same FEAScript build. On Normal, a typical game melts down after 5–8 cells.

## Learning while playing

The game teaches the physics without stopping the play:

- **The Equation panel**, next to the Plate, shows the equation FEAScript solves, −∇·(k∇T) = Q. It shows the values of k, T and Q under the cursor (or the engineer's boots), the condition on every edge, and the size of the linear system K·T = F with its solve time. Terms light up when the game changes them: Q when a cell is mounted, k when the alloy cracks or copper is laid, an edge when a vent opens.
- **Field Notes**: 15 short cards, from the heat equation and the three kinds of boundary condition to elements and nodes, superposition, Gmsh meshes, beam bending, the eikonal equation and Stokes flow. Each one is unlocked by meeting its idea in play (walking to an insulated wall, surviving a crack, opening the mesh view, and so on). A new note is a small pop-up that doesn't interrupt; press <kbd>N</kbd> to read it, and the shift pauses. Each card has a plain-language explanation, what it means in the game, and the FEAScript call that does it.

## Files

```
index.html             markup only
css/critical-mesh.css  FEAScript website tokens (dark theme) + a pixel UI kit
js/config.js           constants: plate, boundary conditions, difficulty, engineer, layout
js/art.js              all pixel art (sprites as character maps), pixel fonts, drawing helpers
js/story.js            cast, campaign steps, dialogue, tools
js/storage.js          progress, settings and high scores (localStorage)
js/sound.js            WebAudio sound effects (generated, no audio files)
js/meshes.js           Gmsh mesh embedded as text (file://-safe)
js/physics.js          FEAScript loading and the four models
js/field.js            nodal solution → pixel-art contour bands
js/engineer.js         the player character
js/game.js             shift state and turn logic
js/scene.js            shift scene, particles, main loop
js/interludes.js       The Gantry, Cold Pour, Pump Room
js/codex.js            the live equation panel and the Field Notes
js/ui.js               screens, HUD, story player, map, modals
js/main.js             input and boot
meshes/plate-bypass.geo / .msh   source and output of the shift 8 Gmsh mesh
meshes/build-meshes.mjs          copies the .msh into js/meshes.js
meshes/mould-l.geo               an L-shaped Cold Pour mould, not used yet (see below)
meshes/check-pour.mjs            solves every Cold Pour chill setup on a Gmsh mould
```

The Plate is 40 m × 20 m in the story, but the game and the solver work in units of 10 m (a 4 × 2 model). Everything the player sees is converted in `js/config.js`: lengths ×10, heat sources ÷100 and convection coefficients ÷10. That is the same heat equation on the bigger plate, so k and every temperature are unchanged.

The files are plain JavaScript with no build step. They are loaded as classic `<script>` tags, which (unlike ES modules) also work on `file://`, and they share their top-level declarations. FEAScript is an ES module, so `js/physics.js` loads it with a dynamic `import()`.

To regenerate the Gmsh mesh:

```bash
gmsh meshes/plate-bypass.geo -2 -format msh41 -o meshes/plate-bypass.msh
```

Then copy it into `js/meshes.js` (embedded as text so the game also runs on `file://`):

```bash
node meshes/build-meshes.mjs          # rewrite MESH_PLATE_BYPASS from the .msh
node meshes/build-meshes.mjs --check  # fail if js/meshes.js and the .msh differ
```

The Cold Pour mould is a plain rectangle because FEAScript's eikonal solver (`frontPropagationScript`, checked with 0.3.1 and 0.4.0-rc) does not converge for every chill setup on other shapes. `meshes/mould-l.geo` is a harder, L-shaped mould for when it does: 22 of its 41 setups (up to three chilled walls) fail today. To check a FEAScript build against it:

```bash
cd meshes
gmsh mould-l.geo -2 -format msh41 -o mould-l.msh
node check-pour.mjs path/to/feascript.mjs mould-l.msh   # exit code 1 while any setup fails
```

## Controls

<kbd>WASD</kbd> / arrows walk · <kbd>Space</kbd> / <kbd>E</kbd> mount or weld · click to walk there and act · <kbd>R</kbd> roll · <kbd>B</kbd> bank or deliver · <kbd>1</kbd>–<kbd>6</kbd> tools · <kbd>Esc</kbd> cancel · <kbd>G</kbd> mesh overlay · <kbd>N</kbd> field notes · <kbd>M</kbd> sound
