/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · game.js
 *  Shift state and turn logic: roll → carry → mount → solve → check
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

// ─── Small utilities ───
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const toPx = (x, y) => [Math.round(PX0 + x * PPM), Math.round(PY0 + (PLATE.maxY - y) * PPM)];

// ─── Shift state ───
const G = {
  mode: "arcade", // "campaign" | "arcade"
  step: 0, // campaign step index
  level: null,
  diff: DIFFICULTY.normal,
  kBase: K_ALLOY,
  bc: { ...DEFAULT_BC },
  limit: 400,
  qPerPip: 500,
  mutateEvery: 3,
  targeted: false,
  target: 0,
  starsAt: [],
  sources: [], // { x, y, pips, q, born }
  legacy: [], // { x, y, q, pips }
  brackets: [], // { x, y }
  weak: [], // { x, y, r, cracks, born }
  copper: [], // { x, y, r, born }
  crates: [], // { x, y, item, born, expires }
  crateRule: null,
  nextMut: null,
  tools: {},
  toolsStart: {},
  turn: 0,
  placed: 0,
  phase: "idle", // idle | rolling | carrying | over
  armed: null, // "copper" | "scan"
  carrying: null, // pips of the cell in the engineer's hands
  lastRoll: null,
  field: null,
  gridFrom: null,
  gridTo: null,
  gridT0: 0,
  displayGrid: new Float64Array(NI * NJ).fill(T_AMB),
  maxT: T_AMB,
  peakT: T_AMB,
  quotaMet: false,
  scanGhost: null,
  hover: null,
  warnedHot: false,
  solveMs: [],
  shake: 0,
  flash: 0,
  meltdown: false,
  endReason: "",
};

const output = () => G.sources.reduce((s, c) => s + c.pips, 0);

function boardForSolve(extra = null) {
  return {
    kBase: G.kBase,
    sources: [...G.legacy, ...G.sources, ...(extra ? [extra] : [])],
    weak: G.weak,
    copper: G.copper,
  };
}

function makeCrack(x, y, born = performance.now()) {
  // Random-walk crack lines inside the crack radius (pixel offsets)
  const rpx = WEAK_R * PPM;
  const lines = [];
  const arms = 3 + Math.floor(Math.random() * 2);
  for (let a = 0; a < arms; a++) {
    let px = 0;
    let py = 0;
    let ang = (a / arms) * Math.PI * 2 + rand(-0.5, 0.5);
    const len = Math.floor(rand(10, rpx - 2));
    for (let s = 0; s < len; s++) {
      ang += rand(-0.55, 0.55);
      px += Math.cos(ang);
      py += Math.sin(ang);
      if (Math.hypot(px, py) > rpx - 2) break;
      lines.push([Math.round(px), Math.round(py)]);
      if (Math.random() < 0.12) {
        const bx = Math.round(px + rand(-2, 2));
        const by = Math.round(py + rand(-2, 2));
        if (Math.hypot(bx, by) < rpx - 2) lines.push([bx, by]);
      }
    }
  }
  return { x, y, r: WEAK_R, cracks: lines, born };
}

// Why a cell can't be mounted at (x, y), or null if it can
function mountBlocker(x, y) {
  const e = 1e-9;
  if (x < SOURCE_R - e || x > PLATE.maxX - SOURCE_R + e || y < SOURCE_R - e || y > PLATE.maxY - SOURCE_R + e)
    return "too close to the edge";
  for (const s of [...G.sources, ...G.legacy]) if (Math.hypot(s.x - x, s.y - y) < 2 * SOURCE_R - e) return "it overlaps another cell";
  for (const b of G.brackets) if (Math.hypot(b.x - x, b.y - y) < SOURCE_R + BRACKET_R - e) return "a bracket is in the way";
  const p = G.bc.pipe;
  if (p && Math.hypot(p.x - x, p.y - y) < SOURCE_R + p.r - e) return "the bypass pipe is in the way";
  return null;
}

const snapMount = (x, y) => [clamp(x, SOURCE_R, PLATE.maxX - SOURCE_R), clamp(y, SOURCE_R, PLATE.maxY - SOURCE_R)];

function anyMountSpot() {
  for (let x = SOURCE_R; x <= PLATE.maxX - SOURCE_R + 1e-9; x += 0.05)
    for (let y = SOURCE_R; y <= PLATE.maxY - SOURCE_R + 1e-9; y += 0.05) if (!mountBlocker(x, y)) return true;
  return false;
}

const turnsToMutation = () => (G.mutateEvery ? G.mutateEvery - (G.turn % G.mutateEvery) : Infinity);

const Game = {
  // ─── Setup ───
  setup(mode, step = 0) {
    const diff = DIFFICULTY[store.settings.difficulty];
    const L = mode === "campaign" ? CAMPAIGN[step] : null;
    G.mode = mode;
    G.diff = diff;
    G.step = step;
    G.level = L;
    G.kBase = L ? L.kBase : K_ALLOY;
    G.qPerPip = diff.qPerPip;
    G.limit = Math.round(T_AMB + (diff.limit - T_AMB) * (L ? L.limitFactor : 1));
    G.mutateEvery = L ? L.mutateEvery : 3;
    G.targeted = L ? !!L.targeted : false;
    G.target = L ? Math.max(1, Math.round(L.target * diff.targetScale)) : 0;
    G.starsAt = L ? L.stars.map((s) => Math.max(1, Math.round(s * diff.targetScale))) : [];
    G.sources = [];
    G.legacy = (L?.legacy || []).map(([x, y, pips]) => ({ x, y, pips, q: pips * diff.qPerPip }));
    G.brackets = (L?.brackets || []).map(([x, y]) => ({ x, y }));
    G.weak = (L?.preWeak || []).map(([x, y]) => makeCrack(x, y, -1e4));
    if (L?.porosityFromPour && !store.flags.pourOk && store.flags.pourPorosity) {
      const p = store.flags.pourPorosity;
      G.weak.push(makeCrack(clamp(p.x, 0.4, 3.6), clamp(p.y, 0.4, 1.6), -1e4));
    }
    // Boundary conditions for this shift (heat wave, half-blocked coolant, ...)
    G.bc = { ...DEFAULT_BC };
    if (L?.airT) G.bc.airT = L.airT;
    if (L?.coolantT) G.bc.coolantT = typeof L.coolantT === "function" ? L.coolantT(store.flags) : L.coolantT;
    G.bc.pipe = L?.pipe ? BYPASS_PIPE : null;
    Physics.init(G.bc);
    G.copper = [];
    G.crates = [];
    G.crateRule = L ? L.crates || null : { every: 3, pool: ["medkit", "copper", "scan", "reroll", "rod", "coolant"] };
    G.tools = L ? { ...L.tools } : { coolant: 1, rod: 1 };
    G.bonusNote = "";
    if (L?.bonus && store.flags[L.bonus.flag]) {
      G.tools[L.bonus.tool] = (G.tools[L.bonus.tool] || 0) + 1;
      G.bonusNote = L.bonus.note;
    }
    G.toolsStart = { ...G.tools };
    if (G.crateRule) for (const it of G.crateRule.pool) if (it !== "medkit" && !(it in G.toolsStart)) G.toolsStart[it] = 0;
    G.turn = 0;
    G.placed = 0;
    G.phase = "idle";
    G.armed = null;
    G.carrying = null;
    G.lastRoll = null;
    G.quotaMet = false;
    G.scanGhost = null;
    G.warnedHot = false;
    G.solveMs = [];
    G.meltdown = false;
    G.flash = 0;
    G.shake = 0;
    G.endReason = "";
    particles.length = 0;
    Engineer.reset(diff.hearts);
    this.planMutation();

    const r = this.solve(L ? `shift ${shiftNumber(step)} start` : "new run", { animate: false });
    if (!G.legacy.length && !G.weak.length && !G.bc.pipe && G.bc.coolantT === T_AMB && G.bc.airT === T_AMB) {
      // Sanity check: with no heat sources the whole plate must sit at exactly 20 °C
      const ok = Math.abs(r.max - T_AMB) < 1e-6;
      console.log(`[Critical Mesh] Sanity check, empty plate: max T = ${r.max.toFixed(6)} °C ${ok ? "✓" : "✗"}`);
      logLine(`Sanity check · empty plate max T = ${r.max.toFixed(2)} °C ${ok ? "✓" : "✗"}`, ok ? "" : "bad");
    }
    G.peakT = G.maxT;
  },

  // ─── One FEAScript solve of the Plate ───
  solve(label, { animate = true } = {}) {
    let r;
    try {
      r = Physics.solveHeat(boardForSolve(), label);
    } catch (err) {
      console.error(err);
      message(`<span class="hot">Solver error:</span> ${err.message}`);
      throw err;
    }
    G.solveMs.push(r.ms);
    G.gridFrom = animate ? Float64Array.from(G.displayGrid) : r.grid;
    G.gridTo = r.grid;
    G.gridT0 = performance.now();
    if (!animate) G.displayGrid = Float64Array.from(r.grid);
    G.field = r;
    G.maxT = r.max;
    G.peakT = Math.max(G.peakT, r.max);
    Scene.fieldDirty = true;
    $("solveTime").textContent = `${r.ms.toFixed(0)} ms`;
    logLine(`${label} · solve ${r.ms.toFixed(0)} ms · ${r.nodes} nodes · max T ${r.max.toFixed(1)} °C`);
    Codex.renderFem(r);
    if (G.solveMs.length >= 5) Codex.unlock("system");
    scheduleMonitor();
    return r;
  },

  planMutation() {
    if (!G.mutateEvery) {
      G.nextMut = null;
      return;
    }
    let x = rand(0.4, 3.6);
    let y = rand(0.4, 1.6);
    const hot = G.targeted ? this.hottestSource() : null;
    if (hot) {
      x = hot.x + rand(-0.2, 0.2);
      y = hot.y + rand(-0.2, 0.2);
    }
    G.nextMut = { x: clamp(x, 0.4, 3.6), y: clamp(y, 0.4, 1.6), targeted: !!hot };
  },

  hottestSource() {
    if (!G.sources.length || !G.field) return null;
    let best = null;
    let bestT = -Infinity;
    for (const s of G.sources) {
      const T = sampleGrid(G.field.grid, s.x, s.y);
      if (T > bestT) {
        bestT = T;
        best = s;
      }
    }
    return best;
  },

  // ─── Rolling ───
  roll() {
    if (G.phase !== "idle") return;
    if (!anyMountSpot()) {
      message("The Plate is <b>full</b>. There is nowhere left to mount a cell. Bank what you have!");
      Sound.play("error");
      return;
    }
    G.phase = "rolling";
    G.armed = null;
    G.scanGhost = null;
    updateHUD();
    animateRoll(() => {
      const pips = 1 + Math.floor(Math.random() * 6);
      G.lastRoll = pips;
      G.carrying = pips;
      G.phase = "carrying";
      drawDie($("die"), pips);
      Sound.play("land");
      message(
        `You rolled a <b>${pips}</b>: a cell of power <b>${pips * G.qPerPip}</b>. Carry it onto the Plate and press <kbd>SPACE</kbd>, or click where to mount it` +
          (pips >= 5 ? `. Big one: find a <span class="cool">cold</span> spot!` : "."),
        pips >= 5 ? "mesh" : "eleni",
      );
      updateHUD();
    });
  },

  reroll() {
    if (G.phase !== "carrying" || !(G.tools.reroll > 0)) return;
    G.tools.reroll--;
    G.phase = "rolling";
    G.armed = null;
    updateHUD();
    animateRoll(() => {
      const pips = 1 + Math.floor(Math.random() * 6);
      G.lastRoll = pips;
      G.carrying = pips;
      G.phase = "carrying";
      drawDie($("die"), pips);
      Sound.play("land");
      message(`Re-rolled: <b>${pips}</b> (power ${pips * G.qPerPip}). Mount it.`);
      logLine(`Re-roll used · new roll ${pips}`);
      updateHUD();
    });
  },

  // ─── The engineer's action key (SPACE / E) ───
  action() {
    if (G.phase === "over" || G.phase === "rolling") return;
    const { x, y } = Engineer;
    if (G.armed === "copper") return this.layCopper(x, y);
    if (G.armed === "scan") return this.runScan(x, y);
    if (G.carrying != null) return this.mount(x, y);
    const crack = crackAt(x, y);
    if (crack) return this.startWeld(crack);
    if (G.phase === "idle") message("Press <b>ROLL</b> (<kbd>R</kbd>) to get a thermo-cell first.");
  },

  // Click on the board: walk there and do the right thing
  boardClick(x, y) {
    if (G.phase === "over") return;
    if (G.armed === "scan") return this.runScan(x, y);
    if (G.armed === "copper") return Engineer.walkTo(x, y, "copper");
    if (G.carrying != null) {
      const [sx, sy] = snapMount(x, y);
      const why = mountBlocker(sx, sy);
      if (why) {
        message(`Can't mount there: ${why}.`);
        Sound.play("error");
        return;
      }
      return Engineer.walkTo(sx, sy, "mount");
    }
    const crack = crackAt(x, y);
    if (crack && G.tools.rod > 0) return Engineer.walkTo(x, y, "weld");
    Engineer.walkTo(x, y);
  },

  engineerArrived(action) {
    if (action === "mount" && G.carrying != null) this.mount(Engineer.x, Engineer.y);
    else if (action === "copper" && G.armed === "copper") this.layCopper(Engineer.x, Engineer.y);
    else if (action === "weld") {
      const crack = crackAt(Engineer.x, Engineer.y);
      if (crack) this.startWeld(crack);
    }
  },

  // ─── Mounting a cell: the main turn ───
  mount(x, y) {
    if (G.phase !== "carrying" || G.carrying == null) return;
    [x, y] = snapMount(x, y);
    const why = mountBlocker(x, y);
    if (why) {
      message(`Can't mount here: ${why}.`);
      Sound.play("error");
      return;
    }
    const pips = G.carrying;
    G.sources.push({ x, y, pips, q: pips * G.qPerPip, born: performance.now() });
    G.carrying = null;
    G.scanGhost = null;
    G.turn++;
    G.placed++;
    Sound.play("place");
    burst(...toPx(x, y), 14, ["#fff8dc", "#f7c531", "#f2731d"], 0.6);

    // Mutation: every Nth mount a zone of the plate cracks and loses conductivity
    let cracked = null;
    if (G.mutateEvery && G.turn % G.mutateEvery === 0 && G.nextMut) {
      cracked = makeCrack(G.nextMut.x, G.nextMut.y);
      G.weak.push(cracked);
    }

    const r = this.solve(`turn ${G.turn}`);
    G.phase = "idle";
    Codex.pulse("Q");
    Codex.unlock("source");
    if (G.placed >= 6) Codex.unlock("linear");

    if (cracked) {
      Sound.play("crack");
      G.shake = 3;
      burst(...toPx(cracked.x, cracked.y), 22, ["#5aa2ec", "#a8d8ff", "#2c3b6b"], 0.8);
      showBanner("CRACK!", "flow");
      Codex.pulse("k", "cool");
      Codex.unlock("conductivity");
      logLine(
        `Fatigue event at (${cracked.x.toFixed(2)}, ${cracked.y.toFixed(2)}) · k → ${(G.kBase * WEAK_FACTOR).toFixed(2)}` +
          (G.nextMut.targeted ? " · TARGETED" : ""),
        "warn",
      );
      this.planMutation();
    }

    // Crates: expire old ones, drop new ones
    this.tickCrates();

    if (r.max > G.limit) return this.meltdown();

    const t = (r.max - T_AMB) / (G.limit - T_AMB);
    if (t > 0.85 && !G.warnedHot) {
      G.warnedHot = true;
      Sound.play("warn");
    }
    if (t <= 0.85) G.warnedHot = false;

    const margin = G.limit - r.max;
    const crackNote = cracked ? ` <span class="cool">The alloy cracked near (${cracked.x.toFixed(1)}, ${cracked.y.toFixed(1)})!</span>` : "";
    const face = t > 0.85 ? "meshAlarm" : cracked ? "mesh" : "eleni";
    if (G.mode === "campaign") {
      const out = output();
      if (!G.quotaMet && out >= G.target) {
        G.quotaMet = true;
        Sound.play("quota");
        showBanner("QUOTA MET!", "green");
        message(`Quota reached: <b>${out} MW</b>.${crackNote} You can <b>DELIVER</b> now, or push for stars (next at ${this.nextStarAt()} MW).`, "eleni");
      } else {
        const left = G.target - out;
        message(
          `Mounted. Max T <b class="${t > 0.75 ? "hot" : ""}">${r.max.toFixed(1)} °C</b>, ${margin.toFixed(0)} °C below the limit.${crackNote} ` +
            (left > 0 ? `${left} MW to the quota.` : this.nextStarAt() ? `Next star at ${this.nextStarAt()} MW.` : "Every star earned. Deliver!") +
            " Step off the hot cell!",
          face,
        );
      }
    } else {
      message(`Cell ${G.placed} mounted. Max T <b>${r.max.toFixed(1)} °C</b>, ${margin.toFixed(0)} °C to spare.${crackNote} <b>Roll</b> again or <b>bank</b>?`, face);
      if (!anyMountSpot()) {
        message("The Plate is full! Banking your score automatically.");
        setTimeout(() => this.bank(), 900);
      }
    }
    updateHUD();
  },

  nextStarAt() {
    const out = output();
    return G.starsAt.find((s) => s > out) || null;
  },

  starsEarned(out) {
    return G.starsAt.filter((s) => out >= s).length;
  },

  // ─── Crates ───
  tickCrates() {
    const expired = G.crates.filter((c) => G.turn >= c.expires);
    for (const c of expired) burst(...toPx(c.x, c.y), 8, ["#8a5a32", "#b07a46"], 0.5);
    G.crates = G.crates.filter((c) => G.turn < c.expires);
    if (G.crateRule && G.turn % G.crateRule.every === 0) {
      let x;
      let y;
      let tries = 0;
      do {
        x = rand(0.25, PLATE.maxX - 0.25);
        y = rand(0.25, PLATE.maxY - 0.25);
        tries++;
      } while (tries < 40 && Math.hypot(x - Engineer.x, y - Engineer.y) < 1.0);
      const item = G.crateRule.pool[Math.floor(Math.random() * G.crateRule.pool.length)];
      G.crates.push({ x, y, item, born: performance.now(), expires: G.turn + 3 });
      Sound.play("drop");
      logLine(`Supply drone dropped a crate at (${x.toFixed(1)}, ${y.toFixed(1)}) · lasts 3 mounts`);
    }
  },

  pickCrates() {
    for (const c of [...G.crates]) {
      if (performance.now() - c.born < 700) continue;
      if (Math.hypot(c.x - Engineer.x, c.y - Engineer.y) > ENGINEER.reach) continue;
      G.crates = G.crates.filter((k) => k !== c);
      Sound.play("pickup");
      burst(...toPx(c.x, c.y), 12, ["#f7d54a", "#fff8dc"], 0.7, -0.8);
      if (c.item === "medkit") {
        Engineer.hearts = Math.min(Engineer.maxHearts, Engineer.hearts + 1);
        Engineer.suit = 0;
      } else G.tools[c.item] = (G.tools[c.item] || 0) + 1;
      showBanner(CRATE_ITEMS[c.item].label, "gold");
      logLine(`Crate collected: ${CRATE_ITEMS[c.item].label.toLowerCase()}`);
      updateHUD();
    }
  },

  // ─── Suit and hearts ───
  suitOverheat() {
    Engineer.hearts--;
    Engineer.suit = 0;
    Sound.play("hurt");
    G.shake = 4;
    const [px, py] = toPx(Engineer.x, Engineer.y);
    burst(px, py - 6, 20, ["#ff5c8d", "#f7a21b", "#c9c6bd"], 1);
    logLine(`Suit overheated at ${Engineer.feetT.toFixed(0)} °C · hearts left ${Engineer.hearts}`, "bad");
    if (Engineer.hearts <= 0) return this.evacuate();
    showBanner("SUIT OVERHEAT!", "heat");
    message(
      `Your suit overheated on ${Engineer.feetT.toFixed(0)} °C metal. You were hauled back through the airlock. <b>${Engineer.hearts}</b> heart${Engineer.hearts > 1 ? "s" : ""} left. Stay off the red!`,
      "meshAlarm",
    );
    Engineer.x = ENGINEER.hatch.x;
    Engineer.y = ENGINEER.hatch.y;
    Engineer.target = null;
    Engineer.weld = null;
    Engineer.stun = 0.8;
    Engineer.invuln = 2;
    updateHUD();
  },

  evacuate() {
    G.phase = "over";
    G.endReason = "evacuated";
    G.armed = null;
    showBanner("EVACUATED", "heat", true);
    message("<span class=\"hot\">Evacuated!</span> Your suit gave out. The shift is over.", "meshAlarm");
    updateHUD();
    setTimeout(() => (G.mode === "campaign" ? endShiftFail() : endArcade(false)), 1600);
  },

  // ─── Tools ───
  arm(name) {
    if (!(G.tools[name] > 0) || G.phase === "over" || G.phase === "rolling") return;
    if (name === "coolant") return this.useCoolant();
    if (name === "reroll") return this.reroll();
    if (name === "vent") return this.openVent();
    if (name === "rod") {
      const crack = crackAt(Engineer.x, Engineer.y);
      if (crack) return this.startWeld(crack);
      message("Stand inside a crack (or click one) to weld it shut.");
      Sound.play("error");
      return;
    }
    if (name === "scan" && G.phase !== "carrying") {
      message("Roll first: the FEA scan tests the cell you are carrying.");
      Sound.play("error");
      return;
    }
    G.armed = G.armed === name ? null : name;
    Sound.play("click");
    if (G.armed) message(TOOL_INFO[name].help + " <kbd>Esc</kbd> cancels.");
    updateHUD();
  },

  useCoolant() {
    if (!(G.tools.coolant > 0) || !G.sources.length) return;
    // The strongest cell: highest power, ties broken by temperature
    let best = null;
    for (const s of G.sources) {
      const T = sampleGrid(G.field.grid, s.x, s.y);
      if (!best || s.q > best.q || (s.q === best.q && T > best.T)) best = { ...s, T, ref: s };
    }
    G.tools.coolant--;
    G.sources = G.sources.filter((s) => s !== best.ref);
    Sound.play("freeze");
    burst(...toPx(best.x, best.y), 30, ["#a8d8ff", "#fdfaf2", "#5aa2ec"], 1);
    showBanner("FROZEN!", "flow");
    const r = this.solve("coolant");
    Codex.pulse("Q", "cool");
    message(`Coolant flash-froze the ${best.pips}-pip cell at (${best.x.toFixed(1)}, ${best.y.toFixed(1)}). Max T fell to <b>${r.max.toFixed(1)} °C</b>.`);
    if (G.mode === "campaign") G.quotaMet = output() >= G.target;
    updateHUD();
  },

  layCopper(x, y) {
    if (!(G.tools.copper > 0)) return;
    x = clamp(x, 0.2, PLATE.maxX - 0.2);
    y = clamp(y, 0.2, PLATE.maxY - 0.2);
    G.tools.copper--;
    G.copper.push({ x, y, r: COPPER_R, born: performance.now() });
    G.armed = null;
    Sound.play("copper");
    burst(...toPx(x, y), 16, ["#c87533", "#e8a070", "#fbe68a"], 0.7);
    const r = this.solve("copper inlay");
    Codex.pulse("k", "gold");
    Codex.unlock("copper");
    message(`Copper inlay laid at (${x.toFixed(2)}, ${y.toFixed(2)}). Max T is now <b>${r.max.toFixed(1)} °C</b>.`);
    updateHUD();
  },

  runScan(x, y) {
    if (!(G.tools.scan > 0) || G.carrying == null) return;
    [x, y] = snapMount(x, y);
    const why = mountBlocker(x, y);
    if (why) {
      message(`Scan target invalid: ${why}.`);
      Sound.play("error");
      return;
    }
    G.tools.scan--;
    G.armed = null;
    const ghost = { x, y, q: G.carrying * G.qPerPip };
    // A crack due on this mount is part of the what-if case
    const willCrack = G.mutateEvery && (G.turn + 1) % G.mutateEvery === 0 && G.nextMut;
    const board = boardForSolve(ghost);
    if (willCrack) board.weak = [...G.weak, { ...G.nextMut, r: WEAK_R }];
    const r = Physics.solveHeat(board, "FEA scan (what-if)", false);
    G.solveMs.push(r.ms);
    G.scanGhost = { x, y, max: r.max, ok: r.max <= G.limit };
    Sound.play("scan");
    Codex.renderFem(r);
    Codex.unlock("linear");
    logLine(`FEA scan at (${x.toFixed(2)}, ${y.toFixed(2)}) · predicted max T ${r.max.toFixed(1)} °C${willCrack ? " (incl. crack)" : ""}`);
    message(
      `FEA scan: mounting here gives a max T of <b class="${r.max > G.limit ? "hot" : ""}">${r.max.toFixed(1)} °C</b>` +
        (willCrack ? " (including the crack due this turn)" : "") +
        (r.max > G.limit ? `. <span class="hot">That's a meltdown.</span>` : `. Limit is ${G.limit} °C.`),
      "mesh",
    );
    updateHUD();
  },

  // Side vent: turns an insulated side edge into a convective one (a new boundary condition)
  openVent() {
    const side = Engineer.x < 0.5 ? "Left" : Engineer.x > PLATE.maxX - 0.5 ? "Right" : null;
    if (!side) {
      message("Walk to the <b>left or right wall</b> (within 0.5 m) to open its vent.");
      Sound.play("error");
      return;
    }
    if (G.bc[`vent${side}`]) {
      message(`The ${side.toLowerCase()} vent is already open.`);
      return;
    }
    G.tools.vent--;
    G.bc[`vent${side}`] = true;
    Physics.init(G.bc);
    Sound.play("pump");
    showBanner("VENT OPEN!", "flow");
    const r = this.solve(`${side.toLowerCase()} vent opened`);
    Codex.renderEdges();
    Codex.pulse("vent", "cool");
    Codex.unlock("vent");
    logLine(`Boundary ${side === "Left" ? '"1" left' : '"3" right'}: insulated → convection h = ${H_VENT}, T = ${G.bc.airT} °C`);
    message(`The ${side.toLowerCase()} edge now sheds heat by convection (h = ${H_VENT}). MESH rebuilt the boundary conditions: max T <b>${r.max.toFixed(1)} °C</b>.`, "mesh");
    updateHUD();
  },

  startWeld(crack) {
    if (!(G.tools.rod > 0)) {
      message("No welding rods left. Crates sometimes carry them.");
      Sound.play("error");
      return;
    }
    Engineer.weld = { crack, t: 0 };
    Engineer.target = null;
    message("Welding... hold still for 2 seconds. Moving cancels.");
  },

  finishWeld(crack) {
    G.tools.rod--;
    G.weak = G.weak.filter((w) => w !== crack);
    Sound.play("welded");
    showBanner("WELDED!", "green");
    burst(...toPx(crack.x, crack.y), 26, ["#fff8dc", "#a8d8ff", "#f7c531"], 1);
    const r = this.solve("weld");
    Codex.pulse("k", "gold");
    message(`Crack welded shut. Full conductivity restored. Max T is now <b>${r.max.toFixed(1)} °C</b>.`, "mesh");
    if (r.max > G.limit) return this.meltdown();
    updateHUD();
  },

  // ─── Endings ───
  bank() {
    if (G.phase !== "idle") return;
    if (G.mode === "campaign" && output() < G.target) return;
    if (G.mode === "arcade" && G.placed === 0) return;
    G.phase = "over";
    G.endReason = "banked";
    G.armed = null;
    Sound.play("bank");
    for (const s of G.sources) burst(...toPx(s.x, s.y), 10, ["#f7d54a", "#d4aa00", "#fff8dc"], 0.9, -1.2);
    showBanner(G.mode === "campaign" ? "DELIVERED!" : "BANKED!", "gold");
    updateHUD();
    setTimeout(() => (G.mode === "campaign" ? endShiftWin() : endArcade(true)), 1100);
  },

  meltdown() {
    G.phase = "over";
    G.endReason = "meltdown";
    G.meltdown = true;
    G.armed = null;
    Engineer.weld = null;
    Sound.play("melt");
    G.shake = 7;
    G.flash = 1;
    const [hx, hy] = toPx(G.field.maxX, G.field.maxY);
    burst(hx, hy, 90, ["#fff8dc", "#fbe68a", "#f7a21b", "#f2731d", "#c8003f"], 2.2);
    showBanner("MELTDOWN", "heat", true);
    message(`<span class="hot">MELTDOWN!</span> Max temperature ${G.maxT.toFixed(1)} °C passed the ${G.limit} °C limit.`, "meshAlarm");
    logLine(`MELTDOWN · max T ${G.maxT.toFixed(1)} °C > ${G.limit} °C`, "bad");
    updateHUD();
    setTimeout(() => (G.mode === "campaign" ? endShiftFail() : endArcade(false)), 1700);
  },

  // Per-frame update while a shift is running
  update(dt) {
    if ($("modal").classList.contains("open")) return; // reading a note or a briefing pauses the shift
    Engineer.update(dt);
    if (G.phase !== "over") {
      this.pickCrates();
      Codex.watch();
    }
  },
};

function animateRoll(done) {
  const die = $("die");
  let n = 0;
  const frames = 9;
  const step = () => {
    drawDie(die, 1 + Math.floor(Math.random() * 6), { jitter: n % 2 });
    Sound.play("tick");
    n++;
    if (n < frames) setTimeout(step, 45 + n * 9);
    else done();
  };
  step();
}
