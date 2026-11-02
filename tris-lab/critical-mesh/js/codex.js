/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · codex.js
 *  The physics behind the game, taught while you play:
 *    · the live equation panel next to the Plate
 *    · Field Notes: short physics cards unlocked by playing
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

// Equations are plain text in the UI font. Markup: {k} is a term the panel can light up,
// {phi|φ} a term with its own label, _{air} a subscript; everything else is plain maths
const EQ = {
  heat: "−∇·({k}∇{T}) = {Q}",
  beam: "d²/dx²({EI}d²{w}/dx²) = {q}",
  front: "|∇{phi|φ}| = 1",
  flow: "−μ∇²{u} + ∇{p} = 0, ∇·{u} = 0",
};
const TERM_COL = { k: "#5aa2ec", T: "#f7e7b7", Q: "#ff5c8d", EI: "#2fcf93", w: "#f7e7b7", q: "#ff5c8d", phi: "#f7e7b7", u: "#f7e7b7", p: "#2fcf93" };

function eqHtml(markup, { color = "" } = {}) {
  const text = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/_\{([^}]+)\}/g, "<sub>$1</sub>");
  let html = "";
  let last = 0;
  for (const m of markup.matchAll(/(?<!_)\{([^}|]+)(?:\|([^}]+))?\}/g)) {
    html += text(markup.slice(last, m.index));
    html += `<span class="term" data-term="${m[1]}" style="color:${TERM_COL[m[1]] || "#f7e7b7"}">${m[2] || m[1]}</span>`;
    last = m.index + m[0].length;
  }
  html += text(markup.slice(last));
  return `<span class="eq"${color ? ` style="color:${color}"` : ""}>${html}</span>`;
}

// ─── Field Notes ───
// how: what unlocks the note (shown while it's still locked)
const NOTES = [
  {
    id: "heat",
    physics: "heat",
    title: "The heat equation",
    eq: EQ.heat,
    words:
      "Heat always flows from hot to cold. Once nothing changes any more (steady state), every tiny piece of metal must pass on exactly as much heat as it receives, plus whatever is made inside it. Write that balance for every point of the Plate and you get this equation. <b>∇T</b> is the slope of the temperature, <b>k∇T</b> is the heat flow down that slope, and <b>∇·</b> asks whether more heat leaves a point than arrives.",
    game: "Every time you mount a cell, FEAScript solves this equation for the whole Plate. The colours under your boots are its answer, T(x, y).",
    code: `model.setModelConfig("heatConductionScript", {
  coefficientFunctions: { thermalConductivity, heatSource },
});`,
    how: "Start any shift.",
  },
  {
    id: "source",
    physics: "heat",
    title: "Heat source Q",
    eq: "{Q} = pips·q in a cell",
    words:
      "Q is how much heat every cubic metre makes each second (W/m³). It is the only thing on the right-hand side of the equation, so it is what pushes the temperature up. Everything else (k and the edges) decides where that heat can go.",
    game: "The die sets Q: each pip adds the same power inside a circle of radius 3 m. A 6 makes twice the heat of a 3.",
    code: `heatSource: (x, y) =>
  cells.reduce((Q, c) => Q + (Math.hypot(x - c.x, y - c.y) < 3 ? c.q : 0), 0)`,
    how: "Mount your first cell.",
  },
  {
    id: "dirichlet",
    physics: "heat",
    title: "Fixed temperature (Dirichlet)",
    eq: "{T} = T_{coolant}",
    words:
      "Some edges are simply told their temperature. The coolant pipe holds the bottom of the Plate at 20 °C however much heat arrives, so it is the Plate's main way out. Mathematicians call this a <b>Dirichlet</b> boundary condition.",
    game: "Mount big cells close to the bottom edge: their heat has a short trip to the coolant. If the coolant runs warm, the whole Plate shifts up with it.",
    code: `model.addBoundaryCondition("0", ["constantTemperature", 20]); // bottom`,
    how: "Stand on the bottom edge after mounting a cell.",
  },
  {
    id: "robin",
    physics: "heat",
    title: "Convection (Robin)",
    eq: "−{k}∂{T}/∂n = h({T} − T_{air})",
    words:
      "The top edge touches air. Air carries heat away, but only in proportion to how much hotter the metal is than the air. <b>h</b> says how good the air is at it: still air has a small h, a fan a big one. This mix of T and its slope is a <b>Robin</b> boundary condition.",
    game: "With h = 0.1 the top is a poor exit, so most of your heat must reach the coolant. On a heat wave the air is hotter than the coolant and the top edge heats the Plate instead.",
    code: `model.addBoundaryCondition("2", ["convection", 0.1, 20]); // top: h, T_air`,
    how: "Walk to the top edge.",
  },
  {
    id: "neumann",
    physics: "heat",
    title: "Insulated edge (Neumann)",
    eq: "∂{T}/∂n = 0",
    words:
      "No heat crosses an insulated wall: the temperature slope across it is zero. In FEAScript an edge without any condition is insulated automatically (a <b>natural</b> boundary condition, also called <b>Neumann</b>). Heat that reaches a side wall has to turn around.",
    game: "Corners are traps: two walls, no exit. A cell tucked into a side corner runs much hotter than the same cell in the middle.",
    code: `// No condition on "1" (left) and "3" (right): both are insulated`,
    how: "Walk to one of the side walls.",
  },
  {
    id: "conductivity",
    physics: "heat",
    title: "Conductivity k",
    eq: "{k}_{crack} = 0.15·{k}_{alloy}",
    words:
      "k says how easily heat moves through a material, in W/(m·K). Copper is about 400, steel 50, glass 1, wood 0.15. A crack is a very poor conductor: heat struggles to cross it and piles up on the hot side, like traffic in front of a narrow bridge.",
    game: "A crack between a cell and the coolant is the worst place for one. Stand in it and weld it shut.",
    code: `thermalConductivity: (x, y) => (inCrack(x, y) ? 0.15 * 2 : 2)`,
    how: "Survive your first crack.",
  },
  {
    id: "copper",
    physics: "heat",
    title: "Mixed materials",
    eq: "{k} = 10 copper, 2 alloy",
    words:
      "A strip of high-k material is a heat highway. The finite element method doesn't mind k jumping from one material to the next: FEAScript evaluates k(x, y) at every integration point inside every element, so materials can be mixed freely.",
    game: "Lay copper between a hot cell and the bottom edge, and the cell drains through it.",
    code: `thermalConductivity: (x, y) => (inCopper(x, y) ? 10 : 2)`,
    how: "Lay a copper inlay.",
  },
  {
    id: "mesh",
    physics: "heat",
    title: "Elements and nodes",
    eq: "{T} ≈ ΣT_{i}N_{i}",
    words:
      "A computer can't find T at infinitely many points. The finite element method cuts the Plate into small pieces called <b>elements</b> (here 32 × 16 quadratic quadrilaterals). Inside each element T is a simple curved shape N<sub>i</sub> built from the values at its <b>nodes</b>, T<sub>i</sub>. Find the 2145 nodal values and you know T everywhere.",
    game: "Press <kbd>G</kbd> to see the mesh. Every corner and mid-side point is a node.",
    code: `model.setMeshConfig({
  meshDimension: "2D", elementOrder: "quadratic",
  numElementsX: 32, numElementsY: 16, maxX: 40, maxY: 20,
});`,
    how: "Switch on the mesh view (G).",
  },
  {
    id: "system",
    physics: "heat",
    title: "One big system: K·T = F",
    eq: "K{T} = F",
    words:
      "Galerkin's idea: multiply the equation by each shape function N<sub>i</sub> and integrate over the Plate. Every node gives one equation, so 2145 nodes give 2145 equations for 2145 unknowns. <b>K</b> holds k, the mesh and the edges; <b>F</b> holds Q and the boundary temperatures. A direct LU solver finds every T<sub>i</sub> at once.",
    game: "That's the millisecond count on the HUD: the whole system is solved again after every move you make.",
    code: `model.setSolverMethod("lusolve");
const { solutionVector, nodesCoordinates } = model.solve();`,
    how: "Let FEAScript solve the Plate 5 times in one shift.",
  },
  {
    id: "linear",
    physics: "heat",
    title: "Superposition",
    eq: "ΔT(Q_{1}+Q_{2}) = ΔT(Q_{1})+ΔT(Q_{2})",
    words:
      "The heat equation is <b>linear</b>: effects add up. With the edges at 20 °C, the temperature rise ΔT from two cells is the sum of the rises from each one alone, and doubling Q doubles ΔT. That is why a what-if solve predicts the next move so reliably.",
    game: "Each cell raises its own warm hill, and close cells stack their hills on top of each other. Spread them out.",
    code: `// Same model, different Q: solve twice and compare
const before = model.solve();`,
    how: "Run an FEA scan, or mount 6 cells in one shift.",
  },
  {
    id: "vent",
    physics: "heat",
    title: "Changing the boundary",
    eq: "∂{T}/∂n = 0 → −{k}∂{T}/∂n = 0.3({T}−T_{air})",
    words:
      "Opening a vent turns an insulated wall into a convective one. Same equation, same cells, different boundary, different answer: boundary conditions are half of every physics problem.",
    game: "A vent only helps the cells near its wall. FEAScript re-solves the whole Plate with the new edge right away.",
    code: `model.addBoundaryCondition("1", ["convection", 0.3, 20]); // left vent`,
    how: "Open a side vent.",
  },
  {
    id: "gmsh",
    physics: "heat",
    title: "Unstructured meshes (Gmsh)",
    eq: "{T} = T_{coolant} on the pipe",
    words:
      "Real parts have holes. A grid of rectangles can't follow a circle, so this Plate was meshed in Gmsh: 604 curved quadratic quadrilaterals that wrap around the pipe. FEAScript reads the .msh file, and the pipe wall becomes a fifth boundary with its own condition.",
    game: "The bypass pipe pulls heat out from the middle of the Plate. Cells around it run cool.",
    code: `const mesh = await importGmshMesh(file);
model.setMeshConfig({ parsedMesh: mesh, meshDimension: "2D", elementOrder: "quadratic" });
model.addBoundaryCondition("4", ["constantTemperature", 20]); // pipe`,
    how: "Reach the shift with the bypass pipe.",
  },
  {
    id: "beam",
    physics: "structure",
    title: "Euler-Bernoulli beam",
    eq: EQ.beam,
    words:
      "A beam bends under load. <b>w</b> is how far it sags, <b>q</b> the load per metre, and <b>EI</b> the bending stiffness: E for the material, I for the shape of the cross-section. Rust lowers EI, so that span bends more. A prop pins w = 0 at one point and splits the beam into shorter, stiffer spans.",
    game: "Each check solves 17 load cases, one for every spot you could stand on, and keeps the worst sag.",
    code: `model.setModelConfig("eulerBernoulliBeamScript", {
  coefficientFunctions: { EI: (x) => (rusty(x) ? 1400 : 4000), q: () => -120 },
});
model.addBoundaryCondition("1", [["fixed"]]);`,
    how: "Reach The Gantry.",
  },
  {
    id: "front",
    physics: "front",
    title: "Front propagation (eikonal)",
    eq: EQ.front,
    words:
      "Metal freezes from the cold walls inward, at a steady speed. <b>φ(x, y)</b> is the time the solid front reaches each point, and its slope is always 1, like ripples spreading from a stone. The last point to freeze (largest φ) is where shrinkage holes form, so it must sit inside the riser.",
    game: "A chilled wall starts the front at φ = 0. A warm wall lets the front slide along it.",
    code: `model.setModelConfig("frontPropagationScript");
model.addBoundaryCondition("0", ["constantValue", 0]);  // chilled
model.addBoundaryCondition("2", ["zeroGradient"]);      // warm`,
    how: "Reach Cold Pour.",
  },
  {
    id: "flow",
    physics: "flow",
    title: "Creeping (Stokes) flow",
    eq: EQ.flow,
    words:
      "Very thick or very slow fluids have no momentum: they stop the moment you stop pushing. Friction <b>μ∇²u</b> balances the pressure push <b>∇p</b>, and <b>∇·u = 0</b> says fluid is never created or lost. Moving walls drag the fluid along with them.",
    game: "Two belts moving the same way add up. Opposite belts make the coolant spin in place.",
    code: `model.setModelConfig("creepingFlowScript");
model.addBoundaryCondition("2", ["constantVelocity", 1, 0]); // moving top belt`,
    how: "Reach the Pump Room.",
  },
];

const NOTE_BY_ID = Object.fromEntries(NOTES.map((n) => [n.id, n]));

// Which note explains each live term or edge of the panel
const TERM_NOTE = { k: "conductivity", T: "heat", Q: "source", bottom: "dirichlet", top: "robin", side: "neumann", vent: "vent", pipe: "gmsh", fem: "system" };

const Codex = {
  queue: [],
  toastTimer: null,
  probeAt: 0,

  has: (id) => store.notes.includes(id),
  count: () => store.notes.filter((id) => NOTE_BY_ID[id]).length,

  // Unlock a note: a small toast, no interruption
  unlock(id) {
    if (!NOTE_BY_ID[id] || this.has(id)) return;
    store.notes.push(id);
    saveStore();
    this.queue.push([id, this.count()]);
    if (!this.toastTimer) this.nextToast();
    this.updateCounts();
  },

  nextToast() {
    const [id, num] = this.queue.shift() || [];
    const el = $("noteToast");
    if (!id) {
      this.toastTimer = null;
      el.classList.remove("show");
      return;
    }
    const n = NOTE_BY_ID[id];
    el.style.setProperty("--phys", PHYSICS[n.physics].color);
    el.innerHTML = `<small>NEW FIELD NOTE · ${num}/${NOTES.length}</small><b>${n.title}</b><span>Press <kbd>N</kbd> or click to read</span>`;
    el.dataset.note = id;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    Sound.play("note");
    this.toastTimer = setTimeout(() => {
      el.classList.remove("show");
      this.toastTimer = setTimeout(() => this.nextToast(), 350);
    }, 4200);
  },

  updateCounts() {
    const txt = `${this.count()}/${NOTES.length}`;
    document.querySelectorAll("[data-notes-count]").forEach((el) => (el.textContent = txt));
  },

  // ─── The Field Notes book ───
  open(id = null) {
    const unlocked = NOTES.filter((n) => this.has(n.id));
    const current = NOTE_BY_ID[id] && this.has(id) ? id : $("noteToast").dataset.note && this.has($("noteToast").dataset.note) ? $("noteToast").dataset.note : unlocked[0]?.id;
    $("noteToast").classList.remove("show");
    const list = NOTES.map((n) => {
      const open = this.has(n.id);
      return `<button type="button" class="note-tab ${open ? "" : "locked"} ${n.id === current ? "on" : ""}" style="--phys:${PHYSICS[n.physics].color}" ${open ? `data-note="${n.id}"` : "disabled"} title="${open ? n.title : `Locked: ${n.how}`}">
        <span>${open ? n.title : "? ? ?"}</span></button>`;
    }).join("");
    openModal(
      `<h2 class="cream">FIELD NOTES</h2>
       <p class="notes-sub"><canvas class="px notes-face" id="notesFace" width="16" height="16"></canvas>Tri's notebook: the physics behind every move · <b data-notes-count>${this.count()}/${NOTES.length}</b></p>
       <div class="notes-book">
         <div class="note-list">${list}</div>
         <div class="note-page" id="notePage"></div>
       </div>
       <div class="modal-actions"><button class="px-btn" data-act="close">BACK TO WORK</button></div>`,
      { close: closeModal },
    );
    $("modalCard").classList.add("wide");
    paintSprite($("notesFace"), "tri");
    $("modalCard").querySelectorAll("[data-note]").forEach((b) =>
      b.addEventListener("click", () => {
        Sound.play("click");
        $("modalCard").querySelectorAll(".note-tab").forEach((t) => t.classList.toggle("on", t === b));
        this.page(b.dataset.note);
      }),
    );
    this.page(current);
  },

  page(id) {
    const page = $("notePage");
    const n = NOTE_BY_ID[id];
    if (!n) {
      page.innerHTML = `<p class="note-empty">No notes yet. Play a shift: Tri writes down the physics as you meet it.</p>`;
      return;
    }
    const locked = NOTES.filter((x) => !this.has(x.id));
    page.style.setProperty("--phys", PHYSICS[n.physics].color);
    page.innerHTML = `
      <div class="phys-tag" style="--phys:${PHYSICS[n.physics].color}">${PHYSICS[n.physics].label}</div>
      <h4>${n.title}</h4>
      <div class="eq-big">${eqHtml(n.eq)}</div>
      <p>${n.words}</p>
      <div class="note-game"><b>IN THE GAME</b>${n.game}</div>
      <div class="note-code"><b>IN FEASCRIPT</b><pre>${n.code.replace(/</g, "&lt;")}</pre></div>
      ${locked.length ? `<p class="note-next">Next to find: <i>${locked[0].how}</i></p>` : `<p class="note-next good">Notebook complete. Tri is proud of you.</p>`}`;
  },

  // ─── The live equation panel (shift HUD) ───
  // Light up one term of the equation for a moment
  pulse(term, cls = "") {
    document.querySelectorAll(`#eqPanel [data-term="${term}"], #eqPanel [data-edge="${term}"]`).forEach((el) => {
      el.classList.remove("pulse", "cool", "gold");
      void el.offsetWidth;
      el.classList.add("pulse");
      if (cls) el.classList.add(cls);
    });
  },

  // Boundary conditions of the current shift, written as equations
  renderEdges() {
    const bc = G.bc;
    const small = { color: "#e6e3da" };
    const side = (open) =>
      open ? `<span data-edge="vent">${eqHtml(`−k∂T/∂n = ${showH(H_VENT)}(T − ${bc.airT})`, small)}</span>` : `<span data-edge="side">${eqHtml("∂T/∂n = 0", small)}</span>`;
    $("eqEdges").innerHTML = `
      <div><i>▼ bottom</i><span data-edge="bottom">${eqHtml(`T = ${bc.coolantT}°C`, small)}</span></div>
      <div><i>▲ top</i><span data-edge="top">${eqHtml(`−k∂T/∂n = ${showH(bc.airH)}(T − ${bc.airT})`, small)}</span></div>
      <div><i>◀ left</i>${side(bc.ventLeft)}</div>
      <div><i>▶ right</i>${side(bc.ventRight)}</div>
      ${bc.pipe ? `<div><i>● pipe</i><span data-edge="pipe">${eqHtml(`T = ${bc.coolantT}°C`, small)}</span></div>` : ""}`;
  },

  renderFem(r) {
    if (!r) return;
    $("eqFem").innerHTML = `<span data-edge="fem">${eqHtml("K·T = F", { color: "#e6c230" })}</span> · <b>${r.nodes}</b> unknowns${Physics.unstructured ? " (Gmsh)" : ""} · solved in <b>${r.ms.toFixed(0)} ms</b>`;
    this.pulse("fem", "gold");
  },

  // k and Q at a point, exactly as handed to FEAScript
  kAt(x, y) {
    for (const c of G.copper) if (Math.hypot(x - c.x, y - c.y) < c.r) return [K_COPPER, "copper"];
    for (const w of G.weak) if (Math.hypot(x - w.x, y - w.y) < w.r) return [G.kBase * WEAK_FACTOR, "crack"];
    return [G.kBase, "alloy"];
  },

  qAt(x, y) {
    let q = 0;
    for (const s of [...G.sources, ...G.legacy]) {
      const d = Math.hypot(x - s.x, y - s.y);
      if (d < SOURCE_R + SOURCE_EDGE) q += s.q * rimProfile(d);
    }
    return q;
  },

  // Values of T, k and Q under the cursor (or the engineer's boots), a few times a second
  probe(now) {
    if (now - this.probeAt < 120 || !G.field || !$("eqPanel").open) return;
    this.probeAt = now;
    const p = G.hover || { x: Engineer.x, y: Engineer.y };
    const inPipe = G.bc.pipe && Math.hypot(p.x - G.bc.pipe.x, p.y - G.bc.pipe.y) < G.bc.pipe.r;
    const where = G.hover ? "cursor" : "boots";
    if (inPipe) {
      $("eqProbe").innerHTML = `<div class="probe-where">at (${showLen(p.x)}, ${showLen(p.y)}) m · inside the pipe: not part of the mesh</div>`;
      return;
    }
    const T = sampleGrid(G.displayGrid, p.x, p.y);
    const [k, mat] = this.kAt(p.x, p.y);
    const q = this.qAt(p.x, p.y);
    $("eqProbe").innerHTML = `
      <div class="probe-where">under your ${where} · (${showLen(p.x)}, ${showLen(p.y)}) m</div>
      <div class="probe-vals">
        <span data-term="T"><i>${eqHtml("{T}")}</i>${T.toFixed(1)} °C</span>
        <span data-term="k" class="${mat}"><i>${eqHtml("{k}")}</i>${k.toFixed(2)} <small>${mat}</small></span>
        <span data-term="Q" class="${q > 0 ? "on" : ""}"><i>${eqHtml("{Q}")}</i>${showQ(q).toFixed(0)}</span>
      </div>`;
  },

  // Unlocks that come from simply walking around and looking
  watch() {
    if (G.phase === "over") return;
    if (G.turn >= 1 && Engineer.y < 0.2) this.unlock("dirichlet");
    if (Engineer.y > PLATE.maxY - 0.15) this.unlock("robin");
    if (Engineer.x < 0.15 || Engineer.x > PLATE.maxX - 0.15) this.unlock("neumann");
  },
};

// Equation block for the interlude equation panel
function labEquationHtml(type) {
  const eq = { gantry: EQ.beam, pour: EQ.front, pump: EQ.flow }[type];
  return `<div class="eq-big small">${eqHtml(eq)}</div>`;
}
