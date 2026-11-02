/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · physics.js
 *  Every simulation in the game is solved by FEAScript:
 *    heatConductionScript      the Plate (every shift)
 *    eulerBernoulliBeamScript  the catwalk (The Gantry)
 *    frontPropagationScript    the casting (Cold Pour)
 *    creepingFlowScript        the coolant manifold (Pump Room)
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

let FEA = null; // the FEAScript module
let feaUrl = "";

// Classic scripts can still load ES modules with a dynamic import(), which also works on file://
async function loadFEAScript() {
  for (const url of FEASCRIPT_URLS) {
    try {
      FEA = await import(url);
      feaUrl = url;
      return true;
    } catch (err) {
      console.warn(`Could not load FEAScript from ${url}`, err);
    }
  }
  return false;
}

// lusolve may return a nested vector [[v0], [v1], ...]
const flatten = (vec) => Array.from(vec, (v) => (Array.isArray(v) ? v[0] : v));

// Quadratic quadrilateral (Gmsh order: 4 corners, 4 mid-sides, centre) at natural coordinates (ξ, η)
const QUAD9_NODES = [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [1, 0], [0, 1], [-1, 0], [0, 0]];
const lagrange2 = (a, s) => (a === 0 ? 1 - s * s : 0.5 * s * (s + a));
const lagrange2d = (a, s) => (a === 0 ? -2 * s : s + 0.5 * a);
function quad9Shape(xi, eta) {
  return QUAD9_NODES.map(([a, b]) => [
    lagrange2(a, xi) * lagrange2(b, eta),
    lagrange2d(a, xi) * lagrange2(b, eta),
    lagrange2(a, xi) * lagrange2d(b, eta),
  ]);
}

// Shape-function weights [[node, N], ...] of point (x, y) in a 9-node element, or null if it lies outside.
// Newton iterations invert the isoparametric map x(ξ, η).
function quad9Weights(el, X, Y, x, y) {
  let xi = 0;
  let eta = 0;
  for (let it = 0; it < 20; it++) {
    const N = quad9Shape(xi, eta);
    let fx = -x, fy = -y, xXi = 0, xEta = 0, yXi = 0, yEta = 0;
    N.forEach(([n, dXi, dEta], k) => {
      const px = X[el[k]];
      const py = Y[el[k]];
      fx += n * px;
      fy += n * py;
      xXi += dXi * px;
      xEta += dEta * px;
      yXi += dXi * py;
      yEta += dEta * py;
    });
    const det = xXi * yEta - xEta * yXi;
    if (!det) return null;
    const dxi = (yEta * fx - xEta * fy) / det;
    const deta = (xXi * fy - yXi * fx) / det;
    xi -= dxi;
    eta -= deta;
    if (Math.abs(dxi) + Math.abs(deta) < 1e-12) break;
  }
  const tol = 1e-9;
  if (!(Math.abs(xi) <= 1 + tol && Math.abs(eta) <= 1 + tol)) return null;
  return quad9Shape(xi, eta).map(([n], k) => [el[k], n]);
}

// Map nodal values of a structured quadratic mesh onto an (ni × nj) grid, x-major
function nodalGrid(X, Y, values, maxX, maxY, ni, nj, fill = 0) {
  const grid = new Float64Array(ni * nj).fill(fill);
  const dx = maxX / (ni - 1);
  const dy = maxY / (nj - 1);
  for (let n = 0; n < values.length && n < X.length; n++) {
    grid[Math.round(X[n] / dx) * nj + Math.round(Y[n] / dy)] = values[n];
  }
  return grid;
}

// Bilinear sample of a nodal grid at (x, y)
function sampleNodal(grid, ni, nj, maxX, maxY, x, y) {
  const fi = Math.max(0, Math.min(ni - 1.0001, (x / maxX) * (ni - 1)));
  const fj = Math.max(0, Math.min(nj - 1.0001, (y / maxY) * (nj - 1)));
  const i = Math.floor(fi);
  const j = Math.floor(fj);
  const a = fi - i;
  const b = fj - j;
  return (
    grid[i * nj + j] * (1 - a) * (1 - b) +
    grid[(i + 1) * nj + j] * a * (1 - b) +
    grid[i * nj + j + 1] * (1 - a) * b +
    grid[(i + 1) * nj + j + 1] * a * b
  );
}

const sampleGrid = (grid, x, y) => sampleNodal(grid, NI, NJ, PLATE.maxX, PLATE.maxY, x, y);

function logSolve(label, ms, extra) {
  const status = ms < 1000 ? "OK (< 1 s)" : "SLOW (> 1 s)";
  console.log(`[Critical Mesh] ${label}: FEAScript solve ${ms.toFixed(1)} ms ${status} · ${extra}`);
}

// Smooth rim so a cell's total power doesn't depend on where it falls between Gauss points
function rimProfile(d) {
  const t = (SOURCE_R + SOURCE_EDGE - d) / (2 * SOURCE_EDGE);
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}

const Physics = {
  model: null,
  lastResult: null,

  bc: { ...DEFAULT_BC },
  unstructured: false,
  bypass: null, // { parsedMesh, map } for the Gmsh plate with the coolant bypass pipe

  // Parse the embedded Gmsh mesh once and precompute how its nodes map onto the game grid
  async prepareMeshes() {
    const parsedMesh = await FEA.importGmshMesh(new File([MESH_PLATE_BYPASS], "plate-bypass.msh"));
    const X = parsedMesh.nodesXCoordinates;
    const Y = parsedMesh.nodesYCoordinates;
    // Every grid point outside the pipe gets the 9 shape-function weights of the element that holds it,
    // so the picture is the FEM field itself. Gmsh node order, 1-based, read before solve() reorders it.
    const elements = parsedMesh.nodalNumbering.quadElements.map((el) => el.map((n) => n - 1));
    const boxes = elements.map((el) => {
      const xs = el.map((n) => X[n]);
      const ys = el.map((n) => Y[n]);
      const pad = 0.05 * (Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys)); // curved edges
      return [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
    });
    const map = [];
    for (let i = 0; i < NI; i++)
      for (let j = 0; j < NJ; j++) {
        const x = (i / (NI - 1)) * PLATE.maxX;
        const y = (j / (NJ - 1)) * PLATE.maxY;
        if (Math.hypot(x - BYPASS_PIPE.x, y - BYPASS_PIPE.y) < BYPASS_PIPE.r) {
          map.push(null);
          continue;
        }
        let weights = null;
        for (let e = 0; e < elements.length && !weights; e++) {
          const [x0, x1, y0, y1] = boxes[e];
          if (x >= x0 && x <= x1 && y >= y0 && y <= y1) weights = quad9Weights(elements[e], X, Y, x, y);
        }
        if (weights) {
          map.push(weights);
          continue;
        }
        // Not inside any element (a grid point in the sliver between the pipe circle and its curved mesh edge):
        // inverse-distance weights from the 4 nearest nodes
        const near = [];
        for (let n = 0; n < X.length; n++) {
          const d = (X[n] - x) ** 2 + (Y[n] - y) ** 2;
          if (near.length < 4 || d < near[3][1]) {
            near.push([n, d]);
            near.sort((a, b) => a[1] - b[1]);
            if (near.length > 4) near.pop();
          }
        }
        if (near[0][1] < 1e-12) map.push([[near[0][0], 1]]);
        else {
          const w = near.map(([n, d]) => [n, 1 / d]);
          const sum = w.reduce((a, b) => a + b[1], 0);
          map.push(w.map(([n, wi]) => [n, wi / sum]));
        }
      }
    this.bypass = { parsedMesh, map, nodes: X.length, X, Y };
  },

  // ─── Heat conduction on the Plate ───
  // (Re)build the model for a set of boundary conditions; bc.pipe switches to the Gmsh plate
  init(bc = DEFAULT_BC) {
    this.bc = { ...bc };
    this.unstructured = !!(bc.pipe && this.bypass);
    const model = new FEA.FEAScriptModel();
    if (this.unstructured) {
      model.setMeshConfig({ parsedMesh: this.bypass.parsedMesh, meshDimension: "2D", elementOrder: "quadratic" });
      model.addBoundaryCondition("4", ["constantTemperature", bc.coolantT]); // bypass pipe wall
    } else {
      model.setMeshConfig({
        meshDimension: "2D",
        elementOrder: "quadratic",
        numElementsX: PLATE.nx,
        numElementsY: PLATE.ny,
        maxX: PLATE.maxX,
        maxY: PLATE.maxY,
      });
    }
    model.addBoundaryCondition("0", ["constantTemperature", bc.coolantT]); // bottom: coolant
    model.addBoundaryCondition("2", ["convection", bc.airH, bc.airT]); // top: air
    // "1" left and "3" right: insulated (no condition) unless a side vent is open
    if (bc.ventLeft) model.addBoundaryCondition("1", ["convection", H_VENT, bc.airT]);
    if (bc.ventRight) model.addBoundaryCondition("3", ["convection", H_VENT, bc.airT]);
    model.setSolverMethod("lusolve");
    this.model = model;
  },

  // board = { kBase, sources: [{x, y, q}], weak: [{x, y, r}], copper: [{x, y, r}] }
  solveHeat(board, label = "heat", keep = true) {
    const { kBase, sources, weak, copper } = board;
    const thermalConductivity = (x, y) => {
      for (const c of copper) if (Math.hypot(x - c.x, y - c.y) < c.r) return K_COPPER;
      for (const w of weak) if (Math.hypot(x - w.x, y - w.y) < w.r) return kBase * WEAK_FACTOR;
      return kBase;
    };
    const heatSource = (x, y) => {
      let q = 0;
      for (const s of sources) {
        const d = Math.hypot(x - s.x, y - s.y);
        if (d < SOURCE_R + SOURCE_EDGE) q += s.q * rimProfile(d);
      }
      return q;
    };

    // Rebuild k(x, y) and Q(x, y) from every item on the plate, then solve
    this.model.setModelConfig("heatConductionScript", {
      coefficientFunctions: { thermalConductivity, heatSource },
    });
    const t0 = performance.now();
    const result = this.model.solve();
    const ms = performance.now() - t0;

    const T = flatten(result.solutionVector);
    const { nodesXCoordinates: X, nodesYCoordinates: Y } = result.nodesCoordinates;
    let grid;
    if (this.unstructured) {
      // Unstructured Gmsh nodes → game grid; inside the pipe the metal sits at the coolant temperature
      grid = new Float64Array(NI * NJ);
      this.bypass.map.forEach((m, g) => (grid[g] = m ? m.reduce((a, [n, w]) => a + T[n] * w, 0) : this.bc.coolantT));
    } else grid = nodalGrid(X, Y, T, PLATE.maxX, PLATE.maxY, NI, NJ, T_AMB);
    let maxIdx = 0;
    for (let n = 1; n < T.length; n++) if (T[n] > T[maxIdx]) maxIdx = n;
    const max = T[maxIdx];
    logSolve(label, ms, `${T.length} nodes${this.unstructured ? " (Gmsh)" : ""} · max T ${max.toFixed(2)} °C`);
    if (keep) this.lastResult = result;
    return { grid, max, maxX: X[maxIdx], maxY: Y[maxIdx], ms, nodes: T.length };
  },

  // ─── Euler-Bernoulli beam: the catwalk ───
  // Cantilever clamped at x = 0 with bending stiffness EI(x) and self-weight q(x),
  // optional pinned props (1-based node numbers) and a point load at loadNode
  solveBeam({ length, elements, EI, selfWeight, force, props, loadNode }) {
    const model = new FEA.FEAScriptModel();
    model.setModelConfig("eulerBernoulliBeamScript", {
      coefficientFunctions: { EI, c0: () => 0, q: () => -selfWeight },
    });
    model.setMeshConfig({ meshDimension: "1D", elementOrder: "linear", numElementsX: elements, maxX: length });
    const conditions = { 1: [["fixed"]] };
    for (const p of props) (conditions[p] ||= []).push(["pinned"]);
    if (loadNode > 1) (conditions[loadNode] ||= []).push(["force", -force]);
    for (const [node, list] of Object.entries(conditions)) model.addBoundaryCondition(String(node), list);
    model.setSolverMethod("lusolve");
    const t0 = performance.now();
    const result = model.solve();
    const ms = performance.now() - t0;
    return { w: flatten(result.fields.w), ms };
  },

  // ─── Eikonal front: the casting ───
  // chilled[k] = true → mould wall k ("0" bottom, "1" left, "2" top, "3" right) starts the front
  solveFront({ chilled, nx, ny }) {
    const model = new FEA.FEAScriptModel();
    model.setModelConfig("frontPropagationScript");
    model.setMeshConfig({ meshDimension: "2D", elementOrder: "quadratic", numElementsX: nx, numElementsY: ny, maxX: 4, maxY: 2 });
    chilled.forEach((on, k) => model.addBoundaryCondition(String(k), on ? ["constantValue", 0] : ["zeroGradient"]));
    model.setSolverMethod("lusolve");
    const t0 = performance.now();
    const result = model.solve();
    const ms = performance.now() - t0;
    const phi = flatten(result.solutionVector);
    const { nodesXCoordinates: X, nodesYCoordinates: Y } = result.nodesCoordinates;
    logSolve("Cold Pour (front propagation)", ms, `${phi.length} nodes · max φ ${Math.max(...phi).toFixed(3)}`);
    return { phi, X, Y, grid: nodalGrid(X, Y, phi, 4, 2, 2 * nx + 1, 2 * ny + 1), ms };
  },

  // ─── Stokes flow: the coolant manifold ───
  // walls[k] = tangential belt speed of wall k ("0" bottom, "1" left, "2" top, "3" right)
  solveFlow({ walls, nx, ny }) {
    const model = new FEA.FEAScriptModel();
    model.setModelConfig("creepingFlowScript");
    model.setMeshConfig({ meshDimension: "2D", elementOrder: "quadratic", numElementsX: nx, numElementsY: ny, maxX: 4, maxY: 2 });
    model.addBoundaryCondition("0", ["constantVelocity", walls[0], 0]);
    model.addBoundaryCondition("1", ["constantVelocity", 0, walls[1]]);
    model.addBoundaryCondition("2", ["constantVelocity", walls[2], 0]);
    model.addBoundaryCondition("3", ["constantVelocity", 0, walls[3]]);
    model.setSolverMethod("lusolve");
    const t0 = performance.now();
    const result = model.solve();
    const ms = performance.now() - t0;
    const { nodesXCoordinates: X, nodesYCoordinates: Y } = result.nodesCoordinates;
    const u = flatten(result.fields.u);
    const v = flatten(result.fields.v);
    const ni = 2 * nx + 1;
    const nj = 2 * ny + 1;
    const speed = u.map((ui, i) => Math.hypot(ui, v[i]));
    logSolve("Pump Room (creeping flow)", ms, `${X.length} velocity nodes · max |u| ${Math.max(...speed).toFixed(3)}`);
    return {
      X, Y, speed, ms,
      u: nodalGrid(X, Y, u, 4, 2, ni, nj),
      v: nodalGrid(X, Y, v, 4, 2, ni, nj),
      s: nodalGrid(X, Y, speed, 4, 2, ni, nj),
    };
  },
};
