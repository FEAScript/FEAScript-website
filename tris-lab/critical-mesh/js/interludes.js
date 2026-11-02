/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · interludes.js
 *  Three engineering interludes, each solved by another FEAScript model:
 *    The Gantry  · eulerBernoulliBeamScript  (prop a catwalk, walk across)
 *    Cold Pour   · frontPropagationScript    (make the riser freeze last)
 *    Pump Room   · creepingFlowScript        (drive the walls, flush the clogs)
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

const Lab = {
  current: null,
  onDone: null,
  canvas: null,
  ctx: null,

  start(stepIndex, onDone) {
    const step = CAMPAIGN[stepIndex];
    const phys = PHYSICS[step.physics];
    this.canvas = $("lab");
    this.ctx = this.canvas.getContext("2d");
    this.onDone = onDone;
    $("labTitle").innerHTML = `<small>INTERLUDE</small>${step.title.toUpperCase()}`;
    $("labPhysics").innerHTML =
      `<div class="phys-tag" style="--phys:${phys.color}">${phys.label}</div><code class="model-name">${phys.model}</code>` +
      `${labEquationHtml(step.type)}<div class="tool-help" id="labPhysicsNote"></div>`;
    $("labNoteBtn").dataset.openNote = { gantry: "beam", pour: "front", pump: "flow" }[step.type];
    $("labEqPanel").open = store.settings.equationOpen;
    Codex.unlock({ gantry: "beam", pour: "front", pump: "flow" }[step.type]);
    $("labLog").innerHTML = "";
    particles.length = 0;
    this.current = { gantry: Gantry, pour: Pour, pump: Pump }[step.type];
    this.current.start();
    show("scr-lab");
    requestAnimationFrame(() => fitCanvas($("lab"), $("labWrap")));
  },

  finish(result) {
    this.current = null;
    const done = this.onDone;
    this.onDone = null;
    if (done) done(result);
  },
};

// Walls are numbered bottom, left, top, right; panels list them as they sit on screen
const WALL_ORDER = [2, 1, 3, 0];

// Status, rules and warnings come from MESH unless another speaker is given (Tri only explains physics)
function labMessage(html, face = "mesh") {
  $("labMsg").innerHTML = html;
  paintSprite($("labFace"), SPEAKERS[face]?.sprite || face);
}

function labLog(text, cls = "") {
  const log = $("labLog");
  const div = document.createElement("div");
  div.textContent = text;
  if (cls) div.className = cls;
  log.appendChild(div);
  while (log.children.length > 5) log.removeChild(log.firstChild);
}

function labPanel(html, wire) {
  const panel = $("labPanel");
  panel.innerHTML = html;
  panel.querySelectorAll("[data-act]").forEach((el) =>
    el.addEventListener("click", () => {
      Sound.play("click");
      wire[el.dataset.act]?.(el);
    }),
  );
}

function labCoords(evt) {
  const c = $("lab");
  const rect = c.getBoundingClientRect();
  return { px: ((evt.clientX - rect.left) / rect.width) * CW, py: ((evt.clientY - rect.top) / rect.height) * CH };
}

// ════════════════════════════════════════════════════════════════
//  THE GANTRY · Euler-Bernoulli beam
// ════════════════════════════════════════════════════════════════

const Gantry = {
  L: 4,
  elements: 16,
  EIsound: 4000, // bending stiffness of sound steel
  EIrust: 1400, // corroded section
  rust: [2.25, 3.0], // corroded span (m), no footings for props here
  selfWeight: 120, // N/m
  force: 1000, // engineer + copper spool (N)
  limit: 0.04, // allowed sag (m)
  maxProps: 2,
  deckY: 52,

  // Sag is shown to 0.1 cm, so it is judged at that precision too: "4.0 cm" never fails a 4 cm limit
  over(sag) {
    return Math.round(sag * 1000) > Math.round(this.limit * 1000);
  },
  sagScale: 350, // px per metre of sag (heavily exaggerated)

  start() {
    this.props = [];
    this.cases = null;
    this.envelope = null;
    this.rest = this.restShape();
    this.phase = "setup";
    this.engX = 0.05;
    this.walks = 0;
    this.fall = null;
    this.hoverNode = null;
    this.walkT = 0;
    this.creakT = 0;
    this.auto = false;
    $("labObjective").innerHTML = `Place up to two props, then carry the spool across · max sag <b>${Math.round(this.limit * 100)} cm</b>`;
    $("labPhysicsNote").innerHTML =
      `d²/dx²(EI(x) d²w/dx²) = q(x) + F δ(x − x<sub>you</sub>) · clamped at the wall, pinned at the props · EI = ${this.EIsound}, ${this.EIrust} on the corroded span · self-weight ${this.selfWeight} N/m · load ${this.force} N · 16 cubic Hermite elements, 17 load cases per check.`;
    labMessage("Get the spool to the east store. If the catwalk sags more than <b>4 cm</b> anywhere, you fall in. Click under the catwalk to place up to two props (not on the rusty span), press <b>SIMULATE</b> to check every step of the walk, then <b>WALK</b>.");
    this.panel();
  },

  panel() {
    const env = this.envelope ? Math.max(...this.envelope) : null;
    labPanel(
      `<h3>CATWALK</h3>
       <div class="stat"><span>Props</span><b>${this.props.length ? this.props.map((n) => `${((n - 1) * this.L / this.elements).toFixed(2)} m`).join(", ") : "none"}</b></div>
       <div class="stat"><span>Max sag (all positions)</span><b class="${env == null ? "" : this.over(env) ? "hot" : "good"}">${env == null ? "–" : `${(env * 100).toFixed(1)} cm`}</b></div>
       <div class="stat"><span>Allowed sag</span><b>${Math.round(this.limit * 100)} cm</b></div>
       <div class="stat"><span>Walks</span><b>${this.walks}</b></div>
       <div class="actions" style="margin-top:.7rem">
         <button class="px-btn flow wide" data-act="sim" ${this.phase !== "setup" ? "disabled" : ""}>SIMULATE LOAD CASES</button>
         ${this.phase === "walking"
           ? `<button class="px-btn dark" data-act="back">◀ BACK</button>`
           : `<button class="px-btn cool" data-act="walk" ${this.phase !== "setup" ? "disabled" : ""}>WALK ▶</button>`}
         <button class="px-btn dark" data-act="clear" ${this.phase !== "setup" || !this.props.length ? "disabled" : ""}>CLEAR PROPS</button>
       </div>
       <div class="tool-help"><b>WALK</b> crosses by itself. Or walk yourself with <kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd>. The catwalk bends under you exactly as FEAScript says it does.</div>`,
      { sim: () => this.simulate(), walk: () => this.beginWalk(true), back: () => this.stopWalk(), clear: () => this.setProps([]) },
    );
  },

  nodeX: (node) => PX0 + ((node - 1) / 16) * 160,

  isRusty(node) {
    const x = ((node - 1) * this.L) / this.elements;
    return x > this.rust[0] + 1e-9 && x < this.rust[1] - 1e-9;
  },

  EI(x) {
    return x > Gantry.rust[0] && x < Gantry.rust[1] ? Gantry.EIrust : Gantry.EIsound;
  },

  setProps(list) {
    if (this.phase !== "setup") return;
    this.props = list;
    this.cases = null;
    this.envelope = null;
    this.rest = this.restShape();
    this.panel();
  },

  // The catwalk under its own weight alone (you standing at the wall), drawn while you place props
  restShape() {
    return Physics.solveBeam({
      length: this.L, elements: this.elements, EI: this.EI, selfWeight: this.selfWeight, force: this.force, props: this.props, loadNode: 1,
    }).w;
  },

  toggleProp(node) {
    if (this.isRusty(node)) {
      labMessage("No footing there: the corroded span can't take a prop.");
      Sound.play("error");
      return;
    }
    let list = this.props.includes(node) ? this.props.filter((n) => n !== node) : [...this.props, node];
    if (list.length > this.maxProps) list = list.slice(1);
    Sound.play("place");
    labLog(`Props at ${list.map((n) => `${((n - 1) * 0.25).toFixed(2)} m`).join(", ") || "none"}`);
    this.setProps(list);
  },

  // One FEAScript solve per load position (nodes 2..17); node 1 is the wall
  solveCases() {
    const t0 = performance.now();
    const props = this.props;
    // cases[j]: you standing on node j (j = 1 is the wall: self-weight only)
    this.cases = [null];
    for (let j = 1; j <= this.elements + 1; j++) {
      const { w } = Physics.solveBeam({
        length: this.L, elements: this.elements, EI: this.EI, selfWeight: this.selfWeight, force: this.force, props, loadNode: j,
      });
      this.cases.push(w);
    }
    this.envelope = new Array(this.elements + 1).fill(0).map((_, i) => Math.max(...this.cases.slice(1).map((w) => Math.abs(w[i]))));
    const ms = performance.now() - t0;
    const env = Math.max(...this.envelope);
    console.log(`[Critical Mesh] The Gantry: ${this.elements + 1} FEAScript beam solves in ${ms.toFixed(1)} ms · max sag ${(env * 100).toFixed(2)} cm`);
    labLog(`${this.elements + 1} beam load cases · ${ms.toFixed(0)} ms · max sag ${(env * 100).toFixed(1)} cm`, this.over(env) ? "warn" : "");
    return env;
  },

  simulate() {
    const env = this.solveCases();
    Sound.play("scan");
    labMessage(
      this.over(env)
        ? `MESH: WITH THIS SETUP THE CATWALK SAGS <b>${(env * 100).toFixed(1)} CM</b> SOMEWHERE ALONG THE WALK. LIMIT ${Math.round(this.limit * 100)} CM. YOU WOULD GET WET.`
        : `MESH: MAX SAG <b>${(env * 100).toFixed(1)} CM</b>. WITHIN THE ${Math.round(this.limit * 100)} CM LIMIT. SAFE TO CROSS.`,
      "mesh",
    );
    this.panel();
  },

  beginWalk(auto = false) {
    if (this.phase !== "setup") return;
    // Already over the limit before the first step: say so instead of an instant splash
    const restSag = Math.max(...this.rest.map(Math.abs));
    if (this.over(restSag)) {
      const worst = this.rest.reduce((b, w, i) => (Math.abs(w) > Math.abs(this.rest[b]) ? i : b), 0);
      labMessage(
        `Don't step on it yet: under its own weight the catwalk already sags <b>${(restSag * 100).toFixed(1)} cm</b> at ${((worst * this.L) / this.elements).toFixed(2)} m. ` +
          "Move a prop further out to hold up the free end.",
        "mesh",
      );
      Sound.play("error");
      return;
    }
    if (!this.cases) this.solveCases();
    this.auto = auto;
    this.phase = "walking";
    this.engX = 0.05;
    this.walks++;
    labMessage(`Walking. If the catwalk sags more than <b>${Math.round(this.limit * 100)} cm</b> anywhere, you fall in. <kbd>←</kbd> <kbd>→</kbd> to step, <b>BACK</b> or <kbd>Esc</kbd> to change the props.`);
    this.panel();
  },

  // Step back off the catwalk to change the props; an abandoned walk doesn't count as a try
  stopWalk() {
    if (this.phase !== "walking") return;
    this.phase = "setup";
    this.engX = 0.05;
    this.auto = false;
    this.walks--;
    labMessage("Back at the wall. Move the props (click under the catwalk), then <b>WALK</b> again.");
    this.panel();
  },

  // Deflection shape with the engineer standing at x (interpolated between load cases)
  shapeAt(x) {
    const f = clamp((x / this.L) * this.elements + 1, 1, this.elements + 1);
    const j0 = Math.floor(f);
    const j1 = Math.min(this.elements + 1, j0 + 1);
    const a = f - j0;
    return this.cases[j0].map((w, i) => w * (1 - a) + this.cases[j1][i] * a);
  },

  deflAtPx(shape, px) {
    const s = clamp(((px - PX0) / 160) * this.elements, 0, this.elements);
    const i = Math.min(this.elements - 1, Math.floor(s));
    const a = s - i;
    return shape[i] * (1 - a) + shape[i + 1] * a;
  },

  // A fresh → / D press starts the walk, like the WALK button
  key(k) {
    if (this.phase === "setup" && (k === "arrowright" || k === "d")) this.beginWalk();
    else if (k === "escape") this.stopWalk();
  },

  click(px, py) {
    if (this.phase !== "setup" && this.phase !== "walking") return;
    if (px < PX0 + 4 || px > PX0 + 162 || py < this.deckY - 6) return;
    this.stopWalk();
    this.toggleProp(clamp(Math.round(((px - PX0) / 160) * this.elements) + 1, 2, this.elements + 1));
  },

  hover(px, py) {
    this.hoverNode = (this.phase === "setup" || this.phase === "walking") && px > PX0 + 4 && px < PX0 + 162 && py > this.deckY - 6
      ? clamp(Math.round(((px - PX0) / 160) * this.elements) + 1, 2, this.elements + 1)
      : null;
  },

  frame(now, dt) {
    const g = Lab.ctx;
    let shape = null;
    if (this.phase === "walking") {
      let dir = 0;
      if (KEYS.has("arrowleft") || KEYS.has("a")) this.auto = false;
      if (KEYS.has("arrowright") || KEYS.has("d") || this.auto) dir += 1;
      if (KEYS.has("arrowleft") || KEYS.has("a")) dir -= 1;
      if (dir) {
        this.engX = clamp(this.engX + dir * 0.9 * dt, 0.05, this.L + 0.1);
        this.walkT += dt;
        this.creakT -= dt;
        if (this.creakT <= 0) {
          this.creakT = 0.45;
          Sound.play("creak");
        }
      }
      shape = this.shapeAt(Math.min(this.engX, this.L));
      const sag = Math.max(...shape.map(Math.abs));
      if (this.over(sag)) {
        const worst = shape.reduce((b, w, i) => (Math.abs(w) > Math.abs(shape[b]) ? i : b), 0);
        const at = (worst * this.L) / this.elements;
        const where = at > this.rust[0] - 0.13 && at < this.rust[1] + 0.13 ? " on the rusty span" : at > this.L - 0.13 ? " at the free end" : "";
        this.phase = "fallen";
        this.auto = false;
        this.fall = { x: this.engX, y: 0, vy: 0, t: 0 };
        Sound.play("splash");
        labLog(`Catwalk overloaded at x = ${this.engX.toFixed(2)} m · sag ${(sag * 100).toFixed(1)} cm`, "bad");
        labMessage(`<span class="hot">SPLASH!</span> With you at ${this.engX.toFixed(2)} m, the catwalk sagged <b>${(sag * 100).toFixed(1)} cm</b> at ${at.toFixed(2)} m${where}, over the ${Math.round(this.limit * 100)} cm limit. Try other props.`);
        showBanner("SPLASH!", "flow", false, "labBanner");
      } else if (this.engX >= this.L - 0.02) {
        this.phase = "done";
        Sound.play("success");
        store.flags.gantryFirstTry = this.walks === 1;
        saveStore();
        showBanner("DELIVERED!", "green", false, "labBanner");
        labLog(`Spool delivered · max sag ${(Math.max(...this.envelope) * 100).toFixed(1)} cm`);
        setTimeout(() => endInterlude("gantry", true), 1200);
      }
    } else if (this.phase === "fallen") {
      shape = this.shapeAt(Math.min(this.fall.x, this.L));
      this.fall.t += dt;
      this.fall.vy += 180 * dt;
      this.fall.y += this.fall.vy * dt;
      if (this.fall.t > 1.6) {
        // Back at the wall, ready for another try
        this.phase = "setup";
        this.fall = null;
        this.engX = 0.05;
        this.walkT = 0;
        this.panel();
        labMessage("Dried off? Move the props (click under the catwalk), <b>SIMULATE</b> for free, then <b>WALK</b> or <kbd>→</kbd> to try again.");
      }
    } else if (this.phase === "done") shape = this.shapeAt(this.L);
    if (!shape) shape = this.rest;
    this.draw(g, now, dt, shape);
  },

  draw(g, now, dt, shape) {
    const deck = this.deckY;
    g.fillStyle = "#121217";
    g.fillRect(0, 0, CW, CH);
    // dim east store wall and lights
    g.fillStyle = "#1a1d26";
    g.fillRect(0, 0, CW, 92);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = Math.floor(now / 700 + i) % 5 ? "#f7d54a" : "#8f7200";
      g.fillRect(28 + i * 28, 6, 2, 1);
    }
    drawText(g, "EAST STORE >", 196, 30, "#77756d", { align: "right" });
    drawText(g, "EI=4000 (RUST 1400)  q=120N/M  F=1000N", 2, 120, "#77756d");
    drawText(g, "SAG ×9", 198, 120, "#4d4d55", { align: "right" });

    // coolant channel
    for (let y = 92; y < 116; y++) {
      g.fillStyle = y < 94 ? "#a8d8ff" : y < 100 ? "#3576bf" : y < 108 ? "#245592" : "#173a68";
      g.fillRect(0, y, CW, 1);
    }
    for (let i = 0; i < 24; i++) {
      const x = (i * 29 + now * 0.025) % CW;
      g.fillStyle = "#7dbaf0";
      g.fillRect(Math.floor(x), 96 + (i % 5) * 3, 3, 1);
    }

    // wall (clamped end)
    g.fillStyle = "#0e0e12";
    g.fillRect(0, 20, PX0, 72);
    for (let y = 21; y < 92; y++)
      for (let x = 0; x < PX0 - 1; x++) {
        g.fillStyle = (x + y) % 6 === 0 ? "#4d4d55" : (Math.floor(y / 6) + Math.floor(x / 10)) % 2 ? "#6b6f78" : "#5d6069";
        g.fillRect(x, y, 1, 1);
      }
    // landing on the far side
    g.fillStyle = "#0e0e12";
    g.fillRect(182, deck - 1, 18, 40);
    g.fillStyle = "#6b6f78";
    g.fillRect(183, deck, 17, 3);
    g.fillStyle = "#4d4d55";
    g.fillRect(186, deck + 3, 3, 33);

    // allowed sag and envelope
    const limY = deck + Math.round(this.limit * this.sagScale);
    for (let x = PX0; x <= PX0 + 160; x += 4) {
      g.fillStyle = "#c8003f";
      g.fillRect(x, limY + 1, 2, 1);
    }
    drawText(g, `LIMIT ${Math.round(this.limit * 100)}CM`, PX0 + 2, limY + 3, "#ff5c8d");
    if (this.envelope) {
      for (let px = PX0; px <= PX0 + 160; px++) {
        if (px % 3) continue;
        const env = this.deflAtPx(this.envelope, px);
        g.fillStyle = this.over(env) ? "#ff5c8d" : "#e6c230";
        g.fillRect(px, deck + 1 + Math.round(Math.min(env, 0.1) * this.sagScale), 1, 1);
      }
    }

    // node ticks (possible prop positions)
    if (this.phase === "setup")
      for (let n = 2; n <= this.elements + 1; n++) {
        g.fillStyle = this.isRusty(n) ? "#8a3a2a" : n === this.hoverNode ? "#2fcf93" : "#4d4d55";
        g.fillRect(Math.round(this.nodeX(n)), 90, 1, 2);
      }

    // prop
    const drawProp = (node, col) => {
      const x = Math.round(this.nodeX(node));
      const y = deck + 3 + Math.round(Math.min(0.1, -this.deflAtPx(shape, x)) * this.sagScale);
      g.fillStyle = "#0e0e12";
      g.fillRect(x - 2, y, 5, 92 - y + 6);
      g.fillStyle = col;
      g.fillRect(x - 1, y, 3, 92 - y + 6);
      g.fillRect(x - 3, 92 + 4, 7, 2);
    };
    if (this.hoverNode && !this.props.includes(this.hoverNode)) {
      g.globalAlpha = 0.4;
      drawProp(this.hoverNode, this.isRusty(this.hoverNode) ? "#ff5c8d" : "#2fcf93");
      g.globalAlpha = 1;
    }
    for (const n of this.props) drawProp(n, "#2fcf93");

    // deck, following the FEAScript deflection
    for (let px = PX0; px <= PX0 + 160; px++) {
      const w = this.deflAtPx(shape, px);
      const y = deck + Math.round(Math.min(0.1, -w) * this.sagScale);
      const over = this.over(Math.abs(w));
      const rusty = (px - PX0) / 40 > this.rust[0] && (px - PX0) / 40 < this.rust[1];
      g.fillStyle = "#0e0e12";
      g.fillRect(px, y - 1, 1, 5);
      g.fillStyle = over ? "#ff5c8d" : rusty ? (px % 3 ? "#8a5a32" : "#c87533") : "#8c8a82";
      g.fillRect(px, y, 1, 2);
      g.fillStyle = "#4d4d55";
      g.fillRect(px, y + 2, 1, 1);
      // railing
      if ((px - PX0) % 8 === 0) {
        g.fillStyle = "#6b6f78";
        g.fillRect(px, y - 8, 1, 7);
      }
      g.fillStyle = "#6b6f78";
      g.fillRect(px, y - 8, 1, 1);
    }

    // engineer with the spool
    const ex = this.phase === "fallen" ? this.fall.x : this.engX;
    const epx = Math.round(PX0 + Math.min(ex, this.L + 0.1) * 40);
    let epy = deck + Math.round(Math.min(0.1, -this.deflAtPx(shape, clamp(epx, PX0, PX0 + 160))) * this.sagScale);
    if (ex > this.L) epy = deck;
    if (this.phase === "fallen") {
      epy += Math.round(this.fall.y);
      if (epy < 96) g.drawImage(sprite("engCarry", false), epx - 4, epy - 13);
      else if (Math.random() < 0.5) burst(epx, 93, 3, ["#a8d8ff", "#fdfaf2", "#5aa2ec"], 1.2, -1.5);
    } else {
      const frame = this.phase === "walking" && (KEYS.has("arrowright") || KEYS.has("d") || KEYS.has("arrowleft") || KEYS.has("a"))
        ? (Math.floor(this.walkT * 8) % 2 ? "engCarry1" : "engCarry")
        : "engCarry";
      g.drawImage(sprite(frame, KEYS.has("arrowleft") || KEYS.has("a")), epx - 4, epy - 13);
      g.drawImage(sprite("spool"), epx - 4, epy - 22);
      if (this.cases && this.phase === "walking") {
        const maxSag = Math.max(...shape.map(Math.abs));
        drawTag(g, `MAX SAG ${(maxSag * 100).toFixed(1)}CM`, epx - 24, epy - 34, maxSag > this.limit * 0.8 ? "#ff5c8d" : "#fdfaf2", { minX: 0, maxX: CW });
      }
    }
    drawParticles(g, dt);
  },
};

// ════════════════════════════════════════════════════════════════
//  COLD POUR · eikonal solidification front
// ════════════════════════════════════════════════════════════════

const Pour = {
  nx: 16,
  ny: 8,
  riser: { x: 2.0, y: 1.72, r: 0.42 },
  edgeNames: ["BOTTOM", "LEFT", "TOP", "RIGHT"],

  start() {
    this.chilled = [false, false, false, false];
    this.sims = 3;
    this.result = null;
    this.anim = null;
    this.final = false;
    this.done = false;
    this.ni = 2 * this.nx + 1;
    this.nj = 2 * this.ny + 1;
    this.stencil = makeStencil(this.ni, this.nj, 4, 2, PW, PH);
    this.img = null;
    this.fieldCanvas = document.createElement("canvas");
    this.fieldCanvas.width = PW;
    this.fieldCanvas.height = PH;
    this.fctx = this.fieldCanvas.getContext("2d");
    this.img = this.fctx.createImageData(PW, PH);
    $("labObjective").innerHTML = "Chill mould walls so the <b>riser</b> is the last part to freeze";
    $("labPhysicsNote").innerHTML =
      "|∇φ| = 1 with φ = 0 on chilled walls and zero gradient elsewhere. φ(x, y) is the freezing time; the maximum of φ is where porosity collects. 16 × 8 quadratic elements.";
    labMessage("Toggle which mould walls are <b>chilled</b> (click the buttons or the walls). Then <b>SIMULATE</b> (3 left) or <b>CAST</b> for real.");
    this.panel();
  },

  panel() {
    const busy = (this.anim && !this.anim.finished) || this.done;
    labPanel(
      `<h3>MOULD WALLS</h3>
       <div class="edge-grid">
         ${WALL_ORDER.map((k) => [this.edgeNames[k], k]).map(([n, k]) => `<button class="px-btn small ${this.chilled[k] ? "flow" : "dark"}" data-act="e${k}" ${busy ? "disabled" : ""}>${n}: ${this.chilled[k] ? "CHILL" : "WARM"}</button>`).join("")}
       </div>
       <div class="stat"><span>Simulations left</span><b>${this.sims}</b></div>
       <div class="stat"><span>Last result</span><b class="${this.result ? (this.result.ok ? "good" : "hot") : ""}">${this.result ? (this.result.ok ? "RISER LAST ✓" : "POROSITY IN PLATE") : "–"}</b></div>
       <div class="actions" style="margin-top:.7rem">
         <button class="px-btn flow" data-act="sim" ${busy || this.sims <= 0 ? "disabled" : ""}>SIMULATE</button>
         <button class="px-btn heat" data-act="cast" ${busy ? "disabled" : ""}>CAST ▶</button>
       </div>
       <div class="tool-help">A chilled wall starts the solid front at φ = 0. A warm wall lets the front slide along it (zero gradient).</div>`,
      {
        e0: () => this.toggle(0), e1: () => this.toggle(1), e2: () => this.toggle(2), e3: () => this.toggle(3),
        sim: () => this.run(false), cast: () => this.run(true),
      },
    );
  },

  toggle(k) {
    if ((this.anim && !this.anim.finished) || this.done) return;
    this.chilled[k] = !this.chilled[k];
    this.anim = null;
    this.panel();
  },

  click(px, py) {
    const inX = px >= PX0 && px <= PX0 + PW;
    const inY = py >= PY0 && py <= PY0 + PH;
    if (inX && Math.abs(py - (PY0 + PH)) < 8) this.toggle(0);
    else if (inY && Math.abs(px - PX0) < 8) this.toggle(1);
    else if (inX && Math.abs(py - PY0) < 8) this.toggle(2);
    else if (inY && Math.abs(px - (PX0 + PW)) < 8) this.toggle(3);
  },

  hover() {},

  run(final) {
    if (!this.chilled.some(Boolean)) {
      labMessage("MESH: NO WALL IS CHILLED. THE FRONT HAS NOWHERE TO START. CHILL AT LEAST ONE WALL.", "meshAlarm");
      Sound.play("error");
      return;
    }
    if (!final) this.sims--;
    labMessage(final ? "Casting... the front moves in from the chilled walls." : "MESH: SOLVING THE EIKONAL EQUATION...", final ? "ella" : "mesh");
    this.final = final;
    this.anim = { t0: performance.now() + 60, pending: true };
    this.panel();
    // Let the message paint before the solve blocks the main thread
    setTimeout(() => {
      const r = Physics.solveFront({ chilled: this.chilled, nx: this.nx, ny: this.ny });
      const max = Math.max(...r.phi);
      const lastIdx = r.phi.map((v, i) => i).filter((i) => r.phi[i] >= max - 0.04);
      const ok = lastIdx.every((i) => Math.hypot(r.X[i] - this.riser.x, r.Y[i] - this.riser.y) <= this.riser.r);
      const cx = lastIdx.reduce((s, i) => s + r.X[i], 0) / lastIdx.length;
      const cy = lastIdx.reduce((s, i) => s + r.Y[i], 0) / lastIdx.length;
      this.result = { ...r, max, lastIdx, ok, cx, cy };
      labLog(`${final ? "CAST" : "Simulation"} · walls ${this.edgeNames.filter((_, k) => this.chilled[k]).join("+")} · solve ${r.ms.toFixed(0)} ms · last to freeze at φ = ${max.toFixed(2)}`, ok ? "" : "warn");
      this.anim = { t0: performance.now(), dur: final ? 5200 : 3200 };
      Sound.play("pour");
    }, 60);
  },

  frame(now, dt) {
    const g = Lab.ctx;
    g.fillStyle = "#121217";
    g.fillRect(0, 0, CW, CH);
    drawText(g, "MOULD  4M × 2M  (TOP VIEW)", 4, 3, "#77756d");
    drawText(g, "EIKONAL", CW - 4, 3, "#e6c230", { align: "right" });

    // walls: chilled = ice blocks, warm = refractory brick
    const wall = (x, y, w, h, k) => {
      for (let v = 0; v < h; v++)
        for (let u = 0; u < w; u++) {
          const c = this.chilled[k]
            ? ((u + v) % 5 === 0 ? "#fdfaf2" : (u * 3 + v) % 4 ? "#a8d8ff" : "#5aa2ec")
            : ((Math.floor((y + v) / 3) + Math.floor((x + u) / 6)) % 2 ? "#6a2a22" : "#4a1c18");
          g.fillStyle = c;
          g.fillRect(x + u, y + v, 1, 1);
        }
    };
    wall(PX0 - 6, PY0 + PH, PW + 12, 6, 0);
    wall(PX0 - 6, PY0 - 6, 6, PH + 6, 1);
    wall(PX0 - 6, PY0 - 6, PW + 12, 6, 2);
    wall(PX0 + PW, PY0 - 6, 6, PH + 12, 3);
    this.edgeNames.forEach((n, k) => {
      const lbl = this.chilled[k] ? "CHILL" : "WARM";
      const col = this.chilled[k] ? "#a8d8ff" : "#c87533";
      if (k === 0) drawText(g, `${n} ${lbl}`, CW / 2, PY0 + PH + 9, col, { align: "center" });
      if (k === 2) drawText(g, `${n} ${lbl}`, CW / 2, PY0 - 15, col, { align: "center" });
      if (k === 1) [...lbl].forEach((ch, i) => drawText(g, ch, 6, PY0 + 20 + i * 8, col));
      if (k === 3) [...lbl].forEach((ch, i) => drawText(g, ch, CW - 9, PY0 + 20 + i * 8, col));
    });

    // field
    const p0 = PX0;
    const q0 = PY0;
    if (this.result && this.anim && !this.anim.pending) {
      const k = clamp((now - this.anim.t0) / this.anim.dur, 0, 1);
      const tau = k * this.result.max * 1.04;
      const d = this.img.data;
      const tick = Math.floor(now / 110);
      for (let p = 0; p < PW * PH; p++) {
        const phi = stencilSample(this.result.grid, this.stencil, p);
        let c;
        if (phi < tau) {
          const band = Math.min(NBANDS - 1, Math.floor((phi / this.result.max) * NBANDS));
          c = FRONT[band];
          if (Math.abs(phi - tau) < 0.03) c = [253, 250, 242];
        } else {
          const u = p % PW;
          const v = (p / PW) | 0;
          const n = (u * 7 + v * 13 + tick) % 9;
          c = HEAT[n < 2 ? 12 : n < 5 ? 11 : 10];
        }
        const o = p * 4;
        d[o] = c[0];
        d[o + 1] = c[1];
        d[o + 2] = c[2];
        d[o + 3] = 255;
      }
      this.fctx.putImageData(this.img, 0, 0);
      g.drawImage(this.fieldCanvas, p0, q0);
      if (k >= 1) {
        // porosity where the metal froze last
        for (const i of this.result.lastIdx) {
          const [x, y] = toPx(this.result.X[i], this.result.Y[i]);
          drawRing(g, x, y, 2, Math.floor(now / 250) % 2 ? "#0e0e12" : "#ff5c8d");
        }
        if (!this.anim.reported) this.report();
      }
    } else {
      // molten pool, before the front starts
      const tick = Math.floor(now / 110);
      for (let v = 0; v < PH; v += 2)
        for (let u = 0; u < PW; u += 2) {
          const n = (u * 7 + v * 13 + tick) % 9;
          g.fillStyle = HEAT_HEX[n < 2 ? 12 : n < 5 ? 11 : 10];
          g.fillRect(p0 + u, q0 + v, 2, 2);
        }
    }

    // riser
    const [rx, ry] = toPx(this.riser.x, this.riser.y);
    drawRing(g, rx, ry, Math.round(this.riser.r * PPM), "#2fcf93", { dash: 3, gap: 2, phase: now / 150, outline: "#0e0e12" });
    drawTag(g, "RISER", rx - 11, ry - 6, "#2fcf93");
    drawParticles(g, dt);
  },

  report() {
    this.anim.reported = true;
    const r = this.result;
    if (r.ok) {
      Sound.play("success");
      burst(...toPx(this.riser.x, this.riser.y), 30, ["#2fcf93", "#e6c230", "#fdfaf2"], 1);
    } else Sound.play("error");
    labMessage(
      r.ok
        ? `MESH: THE LAST METAL TO FREEZE (φ = ${r.max.toFixed(2)}) IS INSIDE THE RISER. POROSITY GOES INTO THE RISER, NOT THE PLATE.`
        : `MESH: THE LAST METAL FREEZES AT (${r.cx.toFixed(1)}, ${r.cy.toFixed(1)}), OUTSIDE THE RISER. THAT IS WHERE THE POROSITY ENDS UP.`,
      r.ok ? "mesh" : "meshAlarm",
    );
    if (this.final) {
      this.done = true;
      store.flags.pourOk = r.ok;
      store.flags.pourPorosity = r.ok ? null : { x: r.cx, y: r.cy };
      saveStore();
      showBanner(r.ok ? "CLEAN CAST!" : "POROUS CAST", r.ok ? "green" : "heat", false, "labBanner");
      setTimeout(() => endInterlude("pour", r.ok), 2200);
    }
    this.anim.finished = true;
    this.panel();
  },
};

// ════════════════════════════════════════════════════════════════
//  PUMP ROOM · Stokes flow
// ════════════════════════════════════════════════════════════════

const Pump = {
  nx: 12,
  ny: 6,
  stages: [
    { clog: { x: 2.0, y: 1.0 }, need: 0.4 },
    { clog: { x: 0.7, y: 0.5 }, need: 0.4 },
  ],
  attemptsPerStage: 4,
  wallNames: ["BOTTOM", "LEFT", "TOP", "RIGHT"],

  start() {
    this.stage = 0;
    this.walls = [0, 0, 0, 0];
    this.attempts = this.attemptsPerStage;
    this.flow = null;
    this.tracers = [];
    this.flushed = false;
    this.done = false;
    this.ni = 2 * this.nx + 1;
    this.nj = 2 * this.ny + 1;
    this.stencil = makeStencil(this.ni, this.nj, 4, 2, PW, PH);
    this.fieldCanvas = document.createElement("canvas");
    this.fieldCanvas.width = PW;
    this.fieldCanvas.height = PH;
    this.fctx = this.fieldCanvas.getContext("2d");
    this.img = this.fctx.createImageData(PW, PH);
    this.debris = this.makeDebris();
    $("labPhysicsNote").innerHTML =
      "Steady Stokes flow, viscosity 1: −∇p + ∇²u = 0, ∇·u = 0. The walls are moving belts (constantVelocity). Taylor-Hood Q2-Q1 elements, 12 × 6.";
    this.intro();
  },

  intro() {
    const s = this.stages[this.stage];
    $("labObjective").innerHTML = `Clog ${this.stage + 1} of 2 · flow at the clog ≥ <b>${s.need.toFixed(2)}</b> · at most <b>2</b> belts`;
    labMessage(
      this.stage === 0
        ? "Set the wall belts (◀ ▶ / ▲ ▼), then <b>RUN PUMPS</b>. The first clog sits right in the middle of the manifold."
        : "One down. The second clog is jammed low in the left corner. Think about how to make the coolant swirl there.",
      this.stage === 0 ? "mesh" : "tri", // the setup is a rule (MESH); the swirl hint is physics (Tri)
    );
    this.panel();
  },

  makeDebris() {
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 7;
      pts.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.8, c: ["#5c3a26", "#8a5a32", "#4d4d4d", "#6b6f78"][i % 4], vx: 0, vy: 0 });
    }
    return pts;
  },

  panel() {
    const busy = this.flushed || this.done;
    const arrows = (k) => (k % 2 === 0 ? ["◀", "■", "▶"] : ["▼", "■", "▲"]);
    labPanel(
      `<h3>BELT ROLLERS</h3>
       <div class="belt-grid">
         ${WALL_ORDER.map((k) => [this.wallNames[k], k])
           .map(
             ([n, k]) =>
               `<span>${n}</span>${[-1, 0, 1]
                 .map((v, i) => `<button class="px-btn small ${this.walls[k] === v ? (v ? "flow" : "") : "dark"}" data-act="w${k}_${v}" ${busy ? "disabled" : ""}>${arrows(k)[i]}</button>`)
                 .join("")}`,
           )
           .join("")}
       </div>
       <div class="stat"><span>Belts running</span><b>${this.walls.filter(Boolean).length} / 2</b></div>
       <div class="stat"><span>Attempts left</span><b>${this.attempts}</b></div>
       <div class="stat"><span>Flow at clog</span><b class="${this.flow ? (this.flow.atClog >= this.stages[this.stage].need ? "good" : "hot") : ""}">${this.flow ? this.flow.atClog.toFixed(2) : "–"} / ${this.stages[this.stage].need.toFixed(2)}</b></div>
       <div class="actions" style="margin-top:.7rem">
         <button class="px-btn flow wide" data-act="run" ${busy || this.attempts <= 0 ? "disabled" : ""}>RUN PUMPS</button>
       </div>`,
      Object.fromEntries([
        ["run", () => this.run()],
        ...this.wallNames.flatMap((_, k) => [-1, 0, 1].map((v) => [`w${k}_${v}`, () => this.setWall(k, v)])),
      ]),
    );
  },

  setWall(k, v) {
    const next = [...this.walls];
    next[k] = v;
    if (next.filter(Boolean).length > 2) {
      labMessage("MESH: PUMP POWER EXCEEDED. AT MOST TWO BELTS CAN RUN AT ONCE. STOP ONE FIRST.", "meshAlarm");
      Sound.play("error");
      return;
    }
    this.walls = next;
    this.panel();
  },

  click() {},
  hover() {},

  run() {
    if (!this.walls.some(Boolean)) {
      labMessage("MESH: ALL BELTS ARE STOPPED. NOTHING WILL MOVE.", "mesh");
      Sound.play("error");
      return;
    }
    this.attempts--;
    labMessage("MESH: SOLVING STOKES FLOW...", "mesh");
    this.panel();
    setTimeout(() => {
      const f = Physics.solveFlow({ walls: this.walls, nx: this.nx, ny: this.ny });
      const s = this.stages[this.stage];
      let sum = 0;
      let n = 0;
      f.X.forEach((x, i) => {
        if (Math.hypot(x - s.clog.x, f.Y[i] - s.clog.y) < 0.3) {
          sum += f.speed[i];
          n++;
        }
      });
      f.atClog = sum / n;
      this.flow = f;
      this.renderFlow();
      this.tracers = Array.from({ length: 160 }, () => this.newTracer());
      Sound.play("pump");
      labLog(`Pumps ${this.walls.join(" ")} · solve ${f.ms.toFixed(0)} ms · flow at clog ${f.atClog.toFixed(3)}`, f.atClog >= s.need ? "" : "warn");
      if (f.atClog >= s.need) {
        this.flushed = true;
        labMessage(`MESH: FLOW AT THE CLOG ${f.atClog.toFixed(2)}. ABOVE ${s.need.toFixed(2)}. FLUSHING.`, "mesh");
        setTimeout(() => this.cleared(), 2600);
      } else if (this.attempts <= 0) {
        labMessage(`Flow at the clog only reached ${f.atClog.toFixed(2)}. We're out of pump time. We'll have to run the shift with a half-blocked manifold.`, "ella");
        this.done = true;
        store.flags.pumpOk = false;
        saveStore();
        setTimeout(() => endInterlude("pump", false), 2600);
      } else {
        labMessage(`Flow at the clog: <b>${f.atClog.toFixed(2)}</b>, need ${s.need.toFixed(2)}. The coolant moves, but not where it matters. Try another combination.`);
      }
      this.panel();
    }, 60);
  },

  cleared() {
    Sound.play("success");
    showBanner("FLUSHED!", "flow", false, "labBanner");
    if (this.stage === 0) {
      this.stage = 1;
      this.walls = [0, 0, 0, 0];
      this.attempts = this.attemptsPerStage;
      this.flow = null;
      this.flushed = false;
      this.debris = this.makeDebris();
      this.intro();
    } else {
      this.done = true;
      store.flags.pumpOk = true;
      saveStore();
      this.panel();
      setTimeout(() => endInterlude("pump", true), 1400);
    }
  },

  renderFlow() {
    renderBands(this.fctx, this.img, this.flow.s, this.stencil, { palette: FLOW, norm: (s) => s / 1.05, mode: "bands", grain: false });
  },

  newTracer() {
    return { x: rand(0.05, 3.95), y: rand(0.05, 1.95), age: 0, life: rand(1.5, 4) };
  },

  frame(now, dt) {
    const g = Lab.ctx;
    g.fillStyle = "#121217";
    g.fillRect(0, 0, CW, CH);
    drawText(g, "COOLANT MANIFOLD  (SIDE VIEW)", 4, 3, "#77756d");
    drawText(g, "STOKES", CW - 4, 3, "#5aa2ec", { align: "right" });

    if (this.flow) g.drawImage(this.fieldCanvas, PX0, PY0);
    else {
      g.fillStyle = "#0f1d36";
      g.fillRect(PX0, PY0, PW, PH);
    }

    // belts on the walls, with animated chevrons
    const belt = (k) => {
      const v = this.walls[k];
      const horiz = k % 2 === 0;
      const x0 = k === 1 ? PX0 - 6 : k === 3 ? PX0 + PW : PX0 - 6;
      const y0 = k === 0 ? PY0 + PH : k === 2 ? PY0 - 6 : PY0 - 6;
      const w = horiz ? PW + 12 : 6;
      const h = horiz ? 6 : PH + 12;
      g.fillStyle = "#0e0e12";
      g.fillRect(x0, y0, w, h);
      g.fillStyle = v ? "#3a3a42" : "#26262c";
      g.fillRect(x0 + 1, y0 + 1, w - 2, h - 2);
      const shift = v ? Math.floor((now / 40) * v) : 0;
      g.fillStyle = v ? "#5aa2ec" : "#4d4d55";
      if (horiz) for (let x = 2; x < w - 2; x++) { if ((((x - shift) % 6) + 6) % 6 < 2) g.fillRect(x0 + x, y0 + 2, 1, 2); }
      else for (let y = 2; y < h - 2; y++) { if ((((y + shift) % 6) + 6) % 6 < 2) g.fillRect(x0 + 2, y0 + y, 2, 1); }
    };
    [0, 1, 2, 3].forEach(belt);

    // tracers advected by the FEAScript velocity field
    if (this.flow) {
      for (const t of this.tracers) {
        const u = sampleNodal(this.flow.u, this.ni, this.nj, 4, 2, t.x, t.y);
        const v = sampleNodal(this.flow.v, this.ni, this.nj, 4, 2, t.x, t.y);
        t.x += u * dt * 1.2;
        t.y += v * dt * 1.2;
        t.age += dt;
        if (t.age > t.life || t.x < 0 || t.x > 4 || t.y < 0 || t.y > 2) Object.assign(t, this.newTracer());
        const [px, py] = toPx(t.x, t.y);
        g.fillStyle = Math.hypot(u, v) > 0.35 ? "#f2fbff" : "#a8d8ff";
        g.fillRect(px, py, 1, 1);
      }
    }

    // the clog, washed away when the flow is strong enough
    const s = this.stages[this.stage];
    const [cx, cy] = toPx(s.clog.x, s.clog.y);
    for (const d of this.debris) {
      if (this.flushed && this.flow) {
        const x = s.clog.x + d.dx / PPM;
        const y = s.clog.y - d.dy / PPM;
        d.vx += sampleNodal(this.flow.u, this.ni, this.nj, 4, 2, x, y) * dt * 30;
        d.vy -= sampleNodal(this.flow.v, this.ni, this.nj, 4, 2, x, y) * dt * 30;
        d.dx += d.vx * dt;
        d.dy += d.vy * dt;
      }
      g.fillStyle = d.c;
      g.fillRect(Math.round(cx + d.dx), Math.round(cy + d.dy), 2, 2);
    }
    if (!this.flushed) {
      drawRing(g, cx, cy, 12, "#f7a21b", { dash: 2, gap: 2, phase: now / 120 });
      drawTag(g, "CLOG", cx - 8, cy + 14, "#f7a21b");
    }
    drawParticles(g, dt);
  },
};

function endInterlude(type, ok) {
  // Ignore late timers from an interlude the player has already left
  if (Lab.current !== { gantry: Gantry, pour: Pour, pump: Pump }[type] || !$("scr-lab").classList.contains("active")) return;
  const step = CAMPAIGN[G.step];
  const texts = {
    gantry: ok
      ? store.flags.gantryFirstTry
        ? "First walk, no swim. The spare spool is yours: +1 copper next shift."
        : "Spool delivered. A little wet, but delivered."
      : "",
    pour: ok ? "Clean cast. The riser took all the porosity." : "The cast is porous: the next Plate starts with an extra crack where the metal froze last.",
    pump: ok ? "Both clogs flushed. Ella slips you a spare coolant cartridge: +1 coolant." : "The manifold is still half-blocked. No spare cartridge.",
  };
  openModal(
    `<h2 class="${ok ? "green" : "heat"}">${ok ? "DONE" : "SETBACK"}</h2>
     <p style="font-family:var(--font-pixel);color:var(--cream)">${step.title.toUpperCase()}</p>
     <p>${texts[type]}</p>
     <div class="modal-actions"><button class="px-btn" data-act="next">CONTINUE ▶</button></div>`,
    {
      next: () => {
        closeModal();
        completeStep(G.step, ok ? 3 : 1);
        Lab.finish(ok);
      },
    },
  );
}
