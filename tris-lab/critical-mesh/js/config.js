/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · config.js
 *  Constants shared by every other script (physics, layout, tuning)
 * ════════════════════════════════════════════════════════════════
 *
 *  The game is plain JavaScript loaded as classic <script> files, so it
 *  also runs when index.html is opened by double-click (file://).
 *  Top-level const/function declarations are shared between the files.
 */
"use strict";

// FEAScript release the game is built against. Pinned so that a push to FEAScript-core cannot
// change the game; bump it on purpose and replay the shifts and interludes.
const FEASCRIPT_VERSION = "0.3.1";

// FEAScript builds (documented CDN URLs); the first one that loads wins
const FEASCRIPT_URLS = [
  `https://cdn.jsdelivr.net/npm/feascript@${FEASCRIPT_VERSION}/dist/feascript.esm.js`,
  `https://cdn.jsdelivr.net/gh/FEAScript/FEAScript-core@${FEASCRIPT_VERSION}/dist/feascript.esm.js`,
];

// ─── The plate (heat conduction) ───
const PLATE = { maxX: 4, maxY: 2, nx: 32, ny: 16 }; // 32 × 16 quadratic elements

// The Plate is 40 m × 20 m in the story; the game and the solver work in units of 10 m.
// The player sees lengths ×10, heat sources ÷100 and convection coefficients ÷10, which is the
// same heat equation on the bigger plate: k and every temperature stay exactly the same.
const SCALE = 10;
const showLen = (v, digits = 0) => (v * SCALE).toFixed(digits); // model units → metres shown
const showQ = (q) => q / (SCALE * SCALE);
const showH = (h) => h / SCALE;
const NI = 2 * PLATE.nx + 1; // 65 nodes along x
const NJ = 2 * PLATE.ny + 1; // 33 nodes along y
const T_AMB = 20; // reference coolant and air temperature (°C)
const H_CONV = 1; // convection coefficient on the top edge
const H_VENT = 3; // convection coefficient of an opened side vent

// Boundary conditions of the Plate. The reference setup; some shifts change them
// (heat wave, half-blocked coolant) and the side-vent tool opens an insulated edge.
const DEFAULT_BC = { coolantT: T_AMB, airT: T_AMB, airH: H_CONV, ventLeft: false, ventRight: false };
const K_ALLOY = 2; // healthy alloy conductivity
const WEAK_FACTOR = 0.15; // a crack keeps 15 % of the conductivity
const K_COPPER = 10; // copper inlay conductivity
const SOURCE_R = 0.3; // thermo-cell radius (m)
const SOURCE_EDGE = 0.05; // half-width of the smoothed rim of a cell
const WEAK_R = 0.5; // crack radius
const COPPER_R = 0.45; // copper inlay radius
const BRACKET_R = 0.3; // mounting bracket radius

// Difficulty: power per die pip, critical limit, suit hearts.
// Tuned with simulated games so a typical Normal game melts after ~5–8 cells.
const DIFFICULTY = {
  easy: { label: "EASY", qPerPip: 400, limit: 500, targetScale: 1, hearts: 4 },
  normal: { label: "NORMAL", qPerPip: 500, limit: 400, targetScale: 1, hearts: 3 },
  hard: { label: "HARD", qPerPip: 600, limit: 320, targetScale: 0.8, hearts: 2 },
};

// ─── The engineer ───
const ENGINEER = {
  speed: 1.35, // m/s
  hatch: { x: 2.0, y: 0.12 }, // spawn point above the airlock
  safeBand: 0.5, // fraction of the limit above which the floor burns (the red band)
  heatRate: 0.25, // suit heating per second just above the safe band...
  heatRateHot: 0.55, // ...plus this much more at the critical limit
  coolRate: 0.3, // suit cooling per second on safe ground
  weldTime: 2.0, // seconds to weld a crack shut
  reach: 0.2, // pickup radius for crates
};

// ─── Scene layout in logical pixels (40 px per metre) ───
const PPM = 40;
const CW = 200;
const CH = 136;
const PX0 = 20; // plate left
const PY0 = 30; // plate top
const PW = PLATE.maxX * PPM; // 160
const PH = PLATE.maxY * PPM; // 80
const PIPE_Y = PY0 + PH + 2; // coolant pipe top
