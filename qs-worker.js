// Live result of the home page example, worked out off the main thread so the sliders stay smooth.
// The worker solves the model and samples the solution for the contour plot (the slow part), then sends the
// Plotly trace and layout back: the page draws them with one Plotly.react.

let core = null;
let mesh = null;
let plot = null;

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

self.onmessage = async ({ data: message }) => {
  try {
    if (message.type === "init") {
      core = await import(message.coreUrl);
      core.logSystem?.("none");
      mesh = await core.importGmshMesh(new File([message.meshText], "rect_with_hole_quad_quadratic.msh"));
      // Read the edges now: the first solve renumbers the elements in place
      self.postMessage({ type: "ready", version: core.version, meshLines: buildMeshLines(mesh) });
      return;
    }

    const { temp, hk, ext } = message.values;
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
    const time = performance.now() - start;
    core.plotInterpolatedSolution(model, result, "contour", "qs-plot");
    self.postMessage({ type: "result", time, nodes: result.nodesCoordinates, field: plot.data[0], layout: plot.layout });
  } catch (error) {
    self.postMessage({ type: "error", message: String(error?.message || error) });
  }
};
