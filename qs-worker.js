// Live result of the home page example, worked out off the main thread so the sliders stay smooth.
// The worker solves the model, builds the field for the contour plot, and sends the Plotly trace and layout back:
// the page draws them with one Plotly.react.
//
// Sampling the solution on the plot grid takes about 15 times as long as the solve, so it is not redone for each
// slider step. The problem is linear: for one h/k, the temperature is temp * A + ext * B, where A is the solution
// with temp = 1, ext = 0 and B the one with temp = 0, ext = 1. The worker samples A and B once per h/k step (the
// slider has a few), and each slider step then solves the model and adds the two sampled fields.

let core = null;
let mesh = null;
let plot = null;
let hkSteps = [];
const fields = new Map(); // h/k -> { a, b }: the sampled fields A and B

// FEAScript draws with the global Plotly: keep what it would draw instead, and give it the window width it asks for
globalThis.window = { innerWidth: 600 };
globalThis.Plotly = {
  newPlot: (id, data, layout) => {
    plot = { data, layout };
  },
  relayout: () => {},
};

// Trace each element edge once, through its mid-side node (Gmsh 9-node quad order, 1-based)
const buildMeshLines = (parsed) => {
  const xs = parsed.nodesXCoordinates;
  const ys = parsed.nodesYCoordinates;
  const x = [];
  const y = [];
  const seen = new Set();
  for (const nodes of parsed.nodalNumbering.quadElements) {
    for (let side = 0; side < 4; side++) {
      const a = nodes[side];
      const b = nodes[(side + 1) % 4];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const path = nodes.length === 9 ? [a, nodes[4 + side], b] : [a, b];
      path.forEach((n) => {
        x.push(xs[n - 1]);
        y.push(ys[n - 1]);
      });
      x.push(null);
      y.push(null);
    }
  }
  return { x, y };
};

const solve = ({ temp, hk, ext }) => {
  const model = new core.FEAScriptModel();
  model.setModelConfig("heatConduction", { solver: { method: "lusolve" } });
  model.setMesh(mesh);
  model.addBoundaryCondition("bottom", { type: "constantTemperature", temperature: temp });
  model.addBoundaryCondition("left", { type: "symmetry" });
  model.addBoundaryCondition("top", { type: "convection", h: hk, ambientTemperature: ext });
  model.addBoundaryCondition("right", { type: "constantTemperature", temperature: temp });
  model.addBoundaryCondition("hole", { type: "convection", h: hk, ambientTemperature: ext });
  const start = performance.now();
  const result = model.solve();
  return { model, result, time: performance.now() - start };
};

// Sample the solution on the plot grid, as FEAScript draws it
const sample = (values) => {
  const { model, result } = solve(values);
  core.plotInterpolatedSolution(model, result, "contour", "qs-plot");
  return plot.data[0].z;
};

const fieldsFor = (hk) => {
  if (!fields.has(hk))
    fields.set(hk, { a: sample({ temp: 1, hk, ext: 0 }), b: sample({ temp: 0, hk, ext: 1 }) });
  return fields.get(hk);
};

// Sample the other h/k steps while the page is idle, one step per task so that solves are answered in between
const warm = () => {
  const hk = hkSteps.find((step) => !fields.has(step));
  if (hk === undefined) return;
  fieldsFor(hk);
  setTimeout(warm, 0);
};

self.onmessage = async ({ data: message }) => {
  try {
    if (message.type === "init") {
      core = await import(message.coreUrl);
      core.logSystem?.("none");
      hkSteps = message.hkSteps;
      mesh = await core.importGmshMesh(new File([message.meshText], "rect_with_hole_quad_quadratic.msh"));
      // Read the edges now: the first solve renumbers the elements in place
      self.postMessage({ type: "ready", version: core.version, meshLines: buildMeshLines(mesh) });
      return;
    }

    const { temp, hk, ext } = message.values;
    const { a, b } = fieldsFor(hk);
    const { result, time } = solve(message.values);
    const z = a.map((value, i) => (value === null ? null : temp * value + ext * b[i]));
    self.postMessage({
      type: "result",
      time,
      nodes: result.nodesCoordinates,
      field: { ...plot.data[0], z },
      layout: plot.layout,
    });
    if (fields.size === 1) setTimeout(warm, 0);
  } catch (error) {
    self.postMessage({ type: "error", message: String(error?.message || error) });
  }
};
