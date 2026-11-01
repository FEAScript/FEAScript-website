/**
 * ════════════════════════════════════════════════════════════════
 *  FEM Blocks · generator.js
 *  Reads the blocks, checks them (with friendly messages) and
 *  writes the FEAScript code that Run executes
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

const EDGE_KEY = {
  "2D": { bottom: "0", left: "1", top: "2", right: "3" },
  "1D": { left: "0", right: "1" },
};
const EDGE_NAME_1D = { left: "left end", right: "right end" };

const HEAT_ONLY = ["fem_material", "fem_material_k", "fem_heat_all", "fem_heater", "fem_edge_temp", "fem_edge_air", "fem_edge_insulate"];
const FLOW_ONLY = ["fem_wall_slide", "fem_wall_still"];
const FRONT_ONLY = ["fem_front_start", "fem_front_slide"];
const PHYSICS_NAME = { heat: "heat", flow: "flow", front: "front" };
const blockPhysics = (type) => (HEAT_ONLY.includes(type) ? "heat" : FLOW_ONLY.includes(type) ? "flow" : FRONT_ONLY.includes(type) ? "front" : null);

// Number → short, readable code
const n = (v) => String(Math.round(v * 1e6) / 1e6);

// ─── Blocks → a plain description of the simulation ───
function readWorkspace(ws) {
  const problems = []; // { level: "error" | "warn", text, block }
  const hats = ws.getTopBlocks(true).filter((b) => b.type === "fem_sim" && b.isEnabled());
  if (!hats.length) {
    problems.push({ level: "error", text: "Start with a <b>NEW SIMULATION</b> block (you'll find it in <i>Start</i>), then put the other blocks inside it." });
    return { spec: null, problems };
  }
  if (hats.length > 1) problems.push({ level: "warn", text: "There's more than one NEW SIMULATION block. Only the top one runs.", block: hats[1] });
  const hat = hats[0];

  const spec = {
    physics: hat.getFieldValue("PHYSICS"),
    shape: null,
    material: null,
    heatAll: [],
    heaters: [],
    edges: {},
    walls: {},
    fronts: {},
    solver: null,
    show: null,
    probes: [],
    blocks: [],
    hat,
  };

  let b = hat.getInputTargetBlock("DO");
  while (b) {
    if (!b.isEnabled()) {
      b = b.getNextBlock();
      continue;
    }
    spec.blocks.push(b);
    const f = (name) => b.getFieldValue(name);
    switch (b.type) {
      case "fem_bar":
      case "fem_plate":
        if (spec.shape) problems.push({ level: "error", text: "Only <b>one shape</b> per simulation, please. Remove one of them.", block: b });
        spec.shape =
          b.type === "fem_bar"
            ? { dim: "1D", L: f("LEN"), nx: f("N"), order: f("ORDER"), block: b }
            : { dim: "2D", W: f("W"), H: f("H"), nx: f("NX"), ny: f("NY"), order: f("ORDER"), block: b };
        break;
      case "fem_material":
        spec.material = { name: f("MAT"), k: K_OF[f("MAT")], block: b };
        break;
      case "fem_material_k":
        spec.material = { name: "custom", k: f("K"), block: b };
        break;
      case "fem_heat_all":
        spec.heatAll.push({ q: f("Q"), block: b });
        break;
      case "fem_heater":
        spec.heaters.push({ x: f("X"), y: f("Y"), r: f("R"), q: f("Q"), block: b });
        break;
      case "fem_edge_temp":
      case "fem_edge_air":
      case "fem_edge_insulate": {
        const e = f("EDGE");
        if (spec.edges[e]) problems.push({ level: "warn", text: `The <b>${e}</b> edge has two blocks. The lower one wins.`, block: b });
        spec.edges[e] =
          b.type === "fem_edge_temp"
            ? { kind: "temp", T: f("T"), block: b }
            : b.type === "fem_edge_air"
              ? { kind: "air", Tair: f("TAIR"), h: f("H"), block: b }
              : { kind: "insulate", block: b };
        break;
      }
      case "fem_wall_slide":
      case "fem_wall_still": {
        const e = f("EDGE");
        if (spec.walls[e]) problems.push({ level: "warn", text: `The <b>${e}</b> wall has two blocks. The lower one wins.`, block: b });
        spec.walls[e] = b.type === "fem_wall_slide" ? { kind: "slide", U: f("U"), block: b } : { kind: "still", block: b };
        break;
      }
      case "fem_front_start":
      case "fem_front_slide": {
        const e = f("EDGE");
        if (spec.fronts[e]) problems.push({ level: "warn", text: `The <b>${e}</b> edge has two front blocks. The lower one wins.`, block: b });
        spec.fronts[e] = { kind: b.type === "fem_front_start" ? "start" : "slide", block: b };
        break;
      }
      case "fem_solve":
        if (spec.solver) problems.push({ level: "warn", text: "You only need <b>one</b> SOLVE IT! block.", block: b });
        spec.solver = { method: f("METHOD"), block: b };
        break;
      case "fem_show":
        spec.show = { mesh: f("MESH") === "TRUE", block: b, afterSolve: !!spec.solver };
        break;
      case "fem_probe":
        spec.probes.push({ x: f("X"), y: f("Y"), block: b });
        break;
      case "fem_sim":
        problems.push({ level: "warn", text: "A NEW SIMULATION inside another one is ignored.", block: b });
        break;
    }
    b = b.getNextBlock();
  }

  // ─── Checks, in the order a kid would fix them ───
  const err = (text, block) => problems.push({ level: "error", text, block });
  const warn = (text, block) => problems.push({ level: "warn", text, block });
  const S = spec.shape;
  if (!S) err("Your simulation needs a <b>shape</b>. Drag a <b>BAR</b> or a <b>PLATE</b> (in <i>Shape</i>) inside the NEW SIMULATION block.", hat);
  if (S) {
    const pieces = S.dim === "1D" ? S.nx : S.nx * S.ny;
    if (pieces > 2400) err(`That's ${pieces} pieces: too many for a quick solve. Try fewer than 2400.`, S.block);
    if (spec.physics === "flow" && S.dim === "1D") err("Flow needs room to swirl: use a <b>PLATE</b>, not a bar.", S.block);
    if (spec.physics === "flow" && S.order === "linear") warn("Flow always uses <b>curvy</b> pieces in FEAScript, so the plate was switched to curvy.", S.block);
  }
  if (S && S.dim === "1D") {
    for (const [e, v] of [...Object.entries(spec.edges), ...Object.entries(spec.fronts)])
      if (!EDGE_KEY["1D"][e]) err(`A bar has only two ends: <b>left</b> and <b>right</b>. It has no ${e} edge.`, v.block);
    for (const h of spec.heaters) if (h.x < 0 || h.x > S.L) warn("This heater is outside the bar, so it heats nothing.", h.block);
    for (const p of spec.probes) if (p.x < 0 || p.x > S.L) warn("This measuring point is outside the bar.", p.block);
  }
  if (S && S.dim === "2D") {
    for (const h of spec.heaters)
      if (h.x + h.r < 0 || h.x - h.r > S.W || h.y + h.r < 0 || h.y - h.r > S.H) warn("This heater is outside the plate, so it heats nothing.", h.block);
    for (const p of spec.probes) if (p.x < 0 || p.x > S.W || p.y < 0 || p.y > S.H) warn("This measuring point is outside the plate.", p.block);
  }
  if (spec.physics === "heat") {
    const exits = Object.values(spec.edges).filter((e) => e.kind !== "insulate");
    if (S && !exits.length)
      err("Heat needs a way out! Give at least one edge a <b>fixed temperature</b> or <b>air cooling</b> (in <i>Edges</i>). With every edge wrapped in a blanket, the temperature is never decided.", hat);
  } else if (spec.physics === "flow") {
    if (S && !Object.values(spec.walls).some((w) => w.kind === "slide" && w.U !== 0))
      warn("Nothing moves the fluid yet. Make a wall <b>slide</b> (in <i>Flow</i>) to stir it.", hat);
  } else if (S && !Object.values(spec.fronts).some((f) => f.kind === "start"))
    err("The front needs somewhere to start! Use <b>start the front at</b> (in <i>Front</i>) on at least one edge.", hat);
  for (const bl of spec.blocks) {
    const ph = blockPhysics(bl.type);
    if (ph && ph !== spec.physics) warn(`That's a <b>${PHYSICS_NAME[ph]}</b> block. In a ${spec.physics} simulation it does nothing.`, bl);
  }
  if (S && !spec.solver) err("Nothing gets solved without a <b>SOLVE IT!</b> block (in <i>Solve & see</i>). Put it below the others.", hat);
  if (spec.solver && spec.show && !spec.show.afterSolve) warn("SHOW comes <b>after</b> SOLVE IT!: you can only paint an answer you have.", spec.show.block);
  return { spec, problems };
}

// ─── Description → FEAScript code ───
// Every line remembers which blocks wrote it, so the Code tab can light up a selected block's lines
function buildCode(spec) {
  if (!spec || !spec.shape) return { lines: ["// Put a NEW SIMULATION block with a shape on the workspace to see its code here."], owners: [[]] };
  const S = spec.shape;
  const is1D = S.dim === "1D";
  const order = spec.physics === "flow" ? "quadratic" : S.order;
  const lines = [];
  const owners = [];
  let by = [spec.hat]; // blocks behind the next lines
  const L = { push: (...t) => t.forEach((x) => (lines.push(x), owners.push(by.map((b) => b.id)))) };
  const from = (...blocks) => (by = blocks.filter(Boolean));

  if (spec.physics === "heat") {
    L.push("// Heat conduction: −∇·(k ∇T) = Q");
    L.push("const model = new FEAScriptModel();");
    L.push("");
    if (spec.heaters.length) {
      // A soft edge lets every piece of the mesh "see" the heater fairly, however the pieces fall
      from(...spec.heaters.map((h) => h.block));
      L.push("// A round heater: power Q inside radius r, with a soft edge (up to 0.1 m wide)");
      L.push("const heater = (d, r, Q) => Q * Math.min(1, Math.max(0, (r - d) / Math.min(0.1, r) + 0.5));");
      from(spec.hat);
      L.push("");
    }
    const coef = [];
    if (spec.material) coef.push([`    thermalConductivity: ${n(spec.material.k)}, // k: ${spec.material.name}`, [spec.material.block]]);
    const terms = [];
    for (const h of spec.heatAll) terms.push(n(h.q));
    for (const h of spec.heaters)
      terms.push(
        is1D
          ? `heater(Math.abs(x - ${n(h.x)}), ${n(h.r)}, ${n(h.q)})`
          : `heater(Math.hypot(x - ${n(h.x)}, y - ${n(h.y)}), ${n(h.r)}, ${n(h.q)})`,
      );
    const qBlocks = [...spec.heatAll, ...spec.heaters].map((h) => h.block);
    if (terms.length === 1 && !spec.heaters.length) coef.push([`    heatSource: ${terms[0]}, // Q: heat made everywhere`, qBlocks]);
    else if (terms.length) coef.push([`    heatSource: (${is1D ? "x" : "x, y"}) => ${terms.join(" + ")}, // Q: heaters`, qBlocks]);
    if (coef.length) {
      L.push("// Material (k) and heat sources (Q)");
      L.push(`model.setModelConfig("heatConductionScript", {`);
      L.push("  coefficientFunctions: {");
      for (const [line, blocks] of coef) {
        from(...blocks);
        L.push(line);
      }
      from(spec.hat);
      L.push("  },");
      L.push("});");
    } else {
      L.push("// No material block: k = 1. No heaters: Q = 0.");
      L.push(`model.setModelConfig("heatConductionScript");`);
    }
  } else if (spec.physics === "front") {
    L.push("// Front propagation (the eikonal equation): |∇φ| = 1");
    L.push("const model = new FEAScriptModel();");
    L.push(`model.setModelConfig("frontPropagationScript");`);
  } else {
    L.push("// Creeping (Stokes) flow: −μ∇²u + ∇p = 0, ∇·u = 0");
    L.push("const model = new FEAScriptModel();");
    L.push(`model.setModelConfig("creepingFlowScript");`);
  }

  from();
  L.push("");
  from(S.block);
  if (is1D) {
    L.push(`// Shape: a ${n(S.L)} m bar cut into ${S.nx} ${order === "linear" ? "straight" : "curvy"} pieces`);
    L.push("model.setMeshConfig({");
    L.push(`  meshDimension: "1D",`);
    L.push(`  elementOrder: "${order}",`);
    L.push(`  numElementsX: ${S.nx},`);
    L.push(`  maxX: ${n(S.L)},`);
    L.push("});");
  } else {
    L.push(`// Shape: a ${n(S.W)} m × ${n(S.H)} m plate cut into ${S.nx} × ${S.ny} ${order === "linear" ? "straight" : "curvy"} pieces`);
    L.push("model.setMeshConfig({");
    L.push(`  meshDimension: "2D",`);
    L.push(`  elementOrder: "${order}",`);
    L.push(`  numElementsX: ${S.nx},`);
    L.push(`  numElementsY: ${S.ny},`);
    L.push(`  maxX: ${n(S.W)},`);
    L.push(`  maxY: ${n(S.H)},`);
    L.push("});");
  }

  from();
  L.push("");
  const keys = EDGE_KEY[S.dim];
  const label = (e) => (is1D ? EDGE_NAME_1D[e] : `${e} edge`);
  if (spec.physics === "heat") {
    L.push("// Edges (boundary conditions)");
    let any = false;
    for (const e of Object.keys(keys)) {
      const c = spec.edges[e];
      if (!c) continue;
      any = true;
      from(c.block);
      if (c.kind === "temp") L.push(`model.addBoundaryCondition("${keys[e]}", ["constantTemperature", ${n(c.T)}]); // ${label(e)}: ${n(c.T)} °C`);
      if (c.kind === "air") L.push(`model.addBoundaryCondition("${keys[e]}", ["convection", ${n(c.h)}, ${n(c.Tair)}]); // ${label(e)}: air at ${n(c.Tair)} °C`);
      if (c.kind === "insulate") L.push(`model.addBoundaryCondition("${keys[e]}", ["symmetry"]); // ${label(e)}: insulated`);
    }
    from();
    const bare = Object.keys(keys).filter((e) => !spec.edges[e]);
    if (bare.length) L.push(`// No block on the ${bare.join(", ")} ${bare.length > 1 ? "edges" : "edge"}: insulated automatically`);
    if (!any && !bare.length) L.push("// (none)");
  } else if (spec.physics === "front") {
    L.push("// Edges: where the front starts (φ = 0), and where it only slides along");
    for (const e of Object.keys(keys)) {
      const c = spec.fronts[e];
      from(c?.block);
      if (c?.kind === "start") L.push(`model.addBoundaryCondition("${keys[e]}", ["constantValue", 0]); // ${label(e)}: the front starts here`);
      else L.push(`model.addBoundaryCondition("${keys[e]}", ["zeroGradient"]); // ${label(e)}: the front slides along${c ? "" : " (no block)"}`);
    }
  } else {
    L.push("// Walls (boundary conditions)");
    for (const e of Object.keys(keys)) {
      const w = spec.walls[e];
      const along = e === "bottom" || e === "top";
      from(w?.block);
      if (w && w.kind === "slide") {
        const v = along ? `${n(w.U)}, 0` : `0, ${n(w.U)}`;
        L.push(`model.addBoundaryCondition("${keys[e]}", ["constantVelocity", ${v}]); // ${e} wall slides at ${n(w.U)}`);
      } else L.push(`model.addBoundaryCondition("${keys[e]}", ["constantVelocity", 0, 0]); // ${e} wall holds still${w ? "" : " (no block)"}`);
    }
  }

  from();
  L.push("");
  from(spec.solver?.block);
  L.push(
    spec.physics === "heat"
      ? "// Solve all the equations at once: K · T = F"
      : spec.physics === "front"
        ? "// Solve: the equation is nonlinear, so FEAScript solves it in rounds (Newton-Raphson)"
        : "// Solve all the equations at once",
  );
  L.push(`model.setSolverMethod("${spec.solver ? spec.solver.method : "lusolve"}");`);
  L.push("const result = model.solve();");
  // Showing and measuring happen on the page, after the solve
  if (spec.show || spec.probes.length) {
    from();
    L.push("");
  }
  if (spec.show) {
    from(spec.show.block);
    L.push(`// SHOW: the Picture tab paints result.solutionVector on the mesh${spec.show.mesh ? " (with the mesh lines)" : ""}`);
  }
  for (const p of spec.probes) {
    from(p.block);
    L.push(`// MEASURE: read the answer at x = ${n(p.x)}${is1D ? "" : `, y = ${n(p.y)}`} from the nodes around it`);
  }
  return { lines, owners };
}

const generateCode = (spec) => buildCode(spec).lines.join("\n");


// Very small JavaScript highlighter for the Code tab
function highlightCode({ lines, owners }) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return lines
    .map((line, k) => {
      const ci = line.indexOf("//");
      const body = ci >= 0 ? line.slice(0, ci) : line;
      const comment = ci >= 0 ? line.slice(ci) : "";
      let h = esc(body)
        .replace(/("[^"]*")/g, '<span class="tok-str">$1</span>')
        .replace(/\b(const|new|return)\b/g, '<span class="tok-kw">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b(?![^<]*<\/span>)/g, '<span class="tok-num">$1</span>')
        .replace(/\.(setModelConfig|setMeshConfig|addBoundaryCondition|setSolverMethod|solve|hypot|abs)\(/g, '.<span class="tok-fn">$1</span>(');
      if (comment) h += `<span class="tok-comment">${esc(comment)}</span>`;
      return `<span class="ln" data-b="${owners[k].join(" ")}">${h || " "}</span>`;
    })
    .join("");
}
