/**
 * ════════════════════════════════════════════════════════════════
 *  FEM Blocks · app.js
 *  Workspace, missions, the math card, running FEAScript, saving
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

const $ = (id) => document.getElementById(id);

// FEAScript release the missions are built against. Pinned so that a push to FEAScript-core cannot
// change them; bump it on purpose and replay every mission.
const FEASCRIPT_VERSION = "0.3.1";
const FEASCRIPT_URLS = [
  `https://cdn.jsdelivr.net/npm/feascript@${FEASCRIPT_VERSION}/dist/feascript.esm.js`,
  `https://cdn.jsdelivr.net/gh/FEAScript/FEAScript-core@${FEASCRIPT_VERSION}/dist/feascript.esm.js`,
];

// ─── Progress, kept in this browser ───
const STORE_KEY = "femBlocks.v1";
const store = (() => {
  const def = { mission: 0, done: {}, saved: {}, sound: true };
  try {
    return { ...def, ...(JSON.parse(localStorage.getItem(STORE_KEY)) || {}) };
  } catch (e) {
    return def;
  }
})();
function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    // Storage can be unavailable (private mode, file://); everything still works
  }
}

// ─── Little sounds (WebAudio, no files) ───
const Sound = {
  ctx: null,
  tone(freq, dur, { delay = 0, type = "square", vol = 0.04, slide = 0 } = {}) {
    if (!store.sound) return;
    try {
      this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) {
      // No audio: fine
    }
  },
  play(name) {
    if (name === "snap") this.tone(660, 0.05, { vol: 0.03, type: "triangle" });
    if (name === "run") this.tone(300, 0.18, { slide: 500, vol: 0.03 });
    if (name === "win") [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, { delay: i * 0.08, vol: 0.035, type: "triangle" }));
    if (name === "oops") this.tone(180, 0.2, { slide: -60, vol: 0.04, type: "sawtooth" });
  },
};

// ─── Tri, the mascot (click him for a joke) ───
const TRI_JOKES = [
  "I'm a triangle, not a tortilla chip. Please stop reaching for the salsa.",
  "Nachos have cheese. I have <b>nodes</b>.",
  "Am I crunchy? No. Am I meshed into finite elements? Very.",
  "Someone tried to dip me in guacamole once. I solved the heat equation on it instead.",
  "Tortilla chips are made of corn. I'm made of 4 × 4-pixel elements.",
  "My favourite chip? The one in a computer. I just helped you cool one down!",
  "I don't melt at 100 °C. A tortilla chip just gets… very crispy.",
  "Fun fact: a triangle is the simplest finite element there is. Tortilla chips are just showing off.",
  "If you put me in a bag with other chips, I'll organise them into a mesh.",
];

const Tri = {
  joke: 0,
  face: "idle",
  until: 0,
  shown: null,
  set(face, ms = 2600) {
    this.face = face;
    this.until = performance.now() + ms;
    this.draw();
  },
  // The same drawing as the Tri's Lab logo; CSS makes him hop and blink
  draw() {
    if (this.face === this.shown) return;
    this.shown = this.face;
    $("mascot").innerHTML = triSvg(this.face).replace("<svg ", '<svg class="lab-tri" ');
  },
  start() {
    this.draw();
    $("mascot").title = "Click me!";
    $("mascot").addEventListener("click", () => {
      toast(TRI_JOKES[this.joke++ % TRI_JOKES.length]);
      this.set(this.joke % 3 ? "happy" : "think", 2200);
    });
    setInterval(() => {
      if (this.face !== "idle" && performance.now() > this.until) {
        this.face = "idle";
        this.draw();
      }
    }, 200);
  },
};

function toast(html, cls = "") {
  const el = $("toast");
  el.innerHTML = html;
  el.className = `fb-toast on ${cls}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.className = "fb-toast"), 4200);
}

// ─── App state ───
let FEA = null;
let workspace = null;
let lastRes = null;
// A link can open a mission by its id (?mission=pieces), e.g. from the tutorials; otherwise resume the last one
const linkedMission = MISSIONS.findIndex((m) => m.id === new URLSearchParams(location.search).get("mission"));
let mission = linkedMission >= 0 ? linkedMission : Math.min(store.mission, MISSIONS.length - 1);
let showingHint = false;
let probeHistory = [];

// ─── Missions ───
function renderMissionList() {
  $("missionList").innerHTML = MISSIONS.map(
    (m, i) =>
      `<button type="button" class="fb-mchip ${i === mission ? "on" : ""} ${store.done[m.id] ? "done" : ""}" data-m="${i}" role="tab" aria-selected="${i === mission}" title="${m.title}">${store.done[m.id] ? "✓" : i + 1}</button>`,
  ).join("");
  $("missionList").querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => openMission(Number(b.dataset.m))));
}

function renderMissionText() {
  const m = MISSIONS[mission];
  $("missionKicker").textContent = mission === MISSIONS.length - 1 ? "SANDBOX" : `MISSION ${mission + 1} OF ${MISSIONS.length - 1}`;
  $("missionTitle").textContent = m.title;
  $("missionText").innerHTML = showingHint ? `<b>Hint:</b> ${m.hint}` : m.text;
  $("missionGoal").innerHTML = `<span>${store.done[m.id] ? "✓ Done!" : "Goal"}</span> ${m.goal}`;
  $("missionGoal").classList.toggle("done", !!store.done[m.id]);
  $("btnHint").textContent = showingHint ? "◀ Back" : "💡 Hint";
}

function openMission(i, { fresh = false, saveCurrent = true } = {}) {
  // Not on the first open: the workspace is still empty, and saving it would wipe the mission's blocks
  if (workspace && saveCurrent) saveWorkspace();
  mission = i;
  store.mission = i;
  saveStore();
  showingHint = false;
  probeHistory = [];
  const m = MISSIONS[i];
  // An empty save (e.g. one wiped by older versions on load) falls back to the starting blocks
  const saved = !fresh && store.saved[m.id];
  loadWorkspace(saved?.blocks?.blocks?.length ? saved : m.start());
  lastRes = null;
  Results.clear();
  $("femExplain").innerHTML = femExplainHtml(null);
  renderMissionList();
  renderMissionText();
  Tri.set("happy", 1200);
}

function loadWorkspace(json) {
  Blockly.Events.disable();
  try {
    workspace.clear();
    Blockly.serialization.workspaces.load(json, workspace);
  } catch (e) {
    console.warn("Could not load the blocks", e);
    workspace.clear();
    Blockly.serialization.workspaces.load(MISSIONS[mission].start(), workspace);
  }
  Blockly.Events.enable();
  workspace.scrollCenter();
  refresh();
}

function saveWorkspace() {
  store.saved[MISSIONS[mission].id] = Blockly.serialization.workspaces.save(workspace);
  saveStore();
}

// ─── The math card ───
const MATH = {
  heat: {
    label: "Heat",
    eq: (dim) =>
      dim === "1D"
        ? `<span class="op">−</span><span class="op">d/dx</span>(<span data-term="k">k</span> <span class="op">d</span><span data-term="T">T</span><span class="op">/dx</span>) <span class="op">=</span> <span data-term="Q">Q</span>`
        : `<span class="op">−∇·(</span><span data-term="k">k</span> <span class="op">∇</span><span data-term="T">T</span><span class="op">) =</span> <span data-term="Q">Q</span>`,
    terms: [
      { term: "T", sym: "T", name: "temperature", desc: "the answer: the colours in the picture", from: ["fem_show", "fem_probe"] },
      { term: "k", sym: "k", name: "conductivity", desc: "how easily heat travels (k = 1 if you don't choose)", from: ["fem_material", "fem_material_k"] },
      { term: "Q", sym: "Q", name: "heat made inside", desc: "heaters (Q = 0 if there are none)", from: ["fem_heater", "fem_heat_all"] },
      { term: "dirichlet", sym: "T = T₀", name: "fixed-temperature edge", desc: "keep the edge at…", from: ["fem_edge_temp"] },
      { term: "robin", sym: "−k ∂T/∂n = h(T − T<sub>air</sub>)", name: "air cooling", desc: "air cools the edge", from: ["fem_edge_air"] },
      { term: "neumann", sym: "∂T/∂n = 0", name: "insulated edge", desc: "blanket, or no block at all", from: ["fem_edge_insulate"] },
    ],
  },
  front: {
    label: "Front",
    eq: () => `<span class="op">|∇</span><span data-term="phi">φ</span><span class="op">| = 1</span>`,
    terms: [
      { term: "phi", sym: "φ", name: "arrival time", desc: "the answer: when the front reaches each point (the colours)", from: ["fem_show", "fem_probe"] },
      { term: "speed", sym: "|∇φ| = 1", name: "same speed everywhere", desc: "the front moves 1 metre for every unit of time", from: [] },
      { term: "start", sym: "φ = 0", name: "where it starts", desc: "start the front at…", from: ["fem_front_start"] },
      { term: "slide", sym: "∂φ/∂n = 0", name: "where it only slides", desc: "slide along, or no block", from: ["fem_front_slide"] },
    ],
  },
  flow: {
    label: "Flow",
    eq: () =>
      `<span class="op">−μ∇²</span><span data-term="u">u</span> <span class="op">+ ∇</span><span data-term="p">p</span> <span class="op">= 0,  ∇·</span><span data-term="u">u</span> <span class="op">= 0</span>`,
    terms: [
      { term: "u", sym: "u", name: "velocity", desc: "the answer: how fast and which way the fluid moves", from: ["fem_show", "fem_probe"] },
      { term: "p", sym: "p", name: "pressure", desc: "the push inside the fluid (FEAScript finds it too)", from: [] },
      { term: "mu", sym: "μ", name: "viscosity", desc: "how thick the fluid is (here μ = 1, like very thick honey)", from: [] },
      { term: "wall", sym: "u = U", name: "sliding wall", desc: "slide the wall", from: ["fem_wall_slide"] },
      { term: "still", sym: "u = 0", name: "still wall", desc: "hold the wall still, or no block", from: ["fem_wall_still"] },
    ],
  },
};

let selectedType = null;
let selectedId = null;
let lastCode = "";

// Light up the lines of code written by the selected block
function highlightCodeLines(scroll = false) {
  document.querySelectorAll("#code .ln.hl").forEach((el) => el.classList.remove("hl"));
  if (!selectedId) return 0;
  const lines = document.querySelectorAll(`#code .ln[data-b~="${CSS.escape(selectedId)}"]`);
  lines.forEach((el) => el.classList.add("hl"));
  if (scroll && lines[0] && $("code").offsetParent) {
    const box = $("code");
    box.scrollTop = Math.max(0, lines[0].offsetTop - box.offsetTop - 40);
  }
  return lines.length;
}

function renderMath(spec) {
  const physics = spec?.physics || "heat";
  const M = MATH[physics];
  const dim = spec?.shape?.dim || "2D";
  const used = new Set((spec?.blocks || []).map((b) => b.type));
  $("mathPhys").textContent = M.label;
  $("mathPhys").dataset.physics = physics;
  $("mathEq").innerHTML = M.eq(dim);
  $("mathTerms").innerHTML = M.terms
    .map(
      (t) =>
        `<div class="fb-term ${t.from.some((f) => used.has(f)) ? "used" : ""}" data-term="${t.term}"><span class="sym">${t.sym}</span><span class="what"><b>${t.name}</b> ${t.desc}</span></div>`,
    )
    .join("");
  highlightTerm();
}

function highlightTerm() {
  const term = selectedType ? BLOCK_INFO[selectedType]?.term : null;
  document.querySelectorAll(".fb-math [data-term]").forEach((el) => el.classList.toggle("hl", !!term && el.dataset.term === term));
  const info = selectedType && BLOCK_INFO[selectedType];
  const box = $("blockExplain");
  if (!info) {
    box.innerHTML = `<p class="fb-pane-note">👆 Click any block to see what it means in the math.</p>`;
    box.style.removeProperty("--bc");
    return;
  }
  const blockDef = Blockly.Blocks[selectedType];
  const colour = blockDef && workspace.getBlocksByType(selectedType)[0]?.getColour();
  if (colour) box.style.setProperty("--bc", colour);
  const nLines = document.querySelectorAll(`#code .ln[data-b~="${CSS.escape(selectedId || "")}"]`).length;
  const codeNote = nLines
    ? `<p class="code-note">This block writes <b>${nLines} line${nLines > 1 ? "s" : ""}</b> of code: see ${nLines > 1 ? "them" : "it"} light up in the <a href="#" data-goto="code">Code</a> tab.</p>`
    : "";
  const femNote =
    info.term === "mesh" || info.term === "solve"
      ? `<p class="code-note">This is about <i>how the computer solves</i> the equation, not the equation itself: see <a href="#" data-goto-fem="1">How it's solved</a> below, after a run.</p>`
      : "";
  box.innerHTML = `<h3>${info.title}</h3><p>${info.words}</p>${info.fun ? `<p class="fun">${info.fun}</p>` : ""}${femNote}${codeNote}`;
  box.querySelector("[data-goto-fem]")?.addEventListener("click", (e) => {
    e.preventDefault();
    $("femExplain").scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  // The explanation lives in The math tab: make the tab blink if it's not open
  const tab = document.querySelector('.fb-tab[data-tab="fem"]');
  if (!tab.classList.contains("on")) {
    tab.classList.remove("ping");
    void tab.offsetWidth;
    tab.classList.add("ping");
  }
  box.querySelector("[data-goto]")?.addEventListener("click", (e) => {
    e.preventDefault();
    selectTab("code");
    highlightCodeLines(true);
  });
}

// ─── Live updates as blocks change ───
let refreshTimer = null;
function refresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    const { spec, problems } = readWorkspace(workspace);
    const built = buildCode(spec);
    lastCode = built.lines.join("\n");
    $("code").innerHTML = highlightCode(built);
    highlightCodeLines();
    renderMath(spec);
    // Warnings sit on the blocks themselves as little "!" bubbles
    workspace.getAllBlocks(false).forEach((b) => b.setWarningText(null));
    for (const p of problems) if (p.block && !p.block.isDisposed()) p.block.setWarningText(p.text.replace(/<[^>]+>/g, ""));
  }, 120);
}

// ─── Run ───
async function run() {
  if (!FEA) return;
  const { spec, problems } = readWorkspace(workspace);
  const errors = problems.filter((p) => p.level === "error");
  if (errors.length) {
    Tri.set("oops");
    Sound.play("oops");
    toast(`<b>Not yet!</b> ${errors[0].text}`, "bad");
    if (errors[0].block) errors[0].block.select();
    return;
  }
  const code = generateCode(spec);
  $("btnRun").classList.add("busy");
  $("runLabel").textContent = "Solving…";
  Tri.set("think", 5000);
  Sound.play("run");
  await new Promise((r) => setTimeout(r, 30)); // let the button repaint
  let result;
  const t0 = performance.now();
  try {
    // Exactly the code shown in the Code tab
    const fn = new Function("FEAScriptModel", `"use strict";\n${code}\nreturn { model, result };`);
    result = fn(FEA.FEAScriptModel).result;
  } catch (e) {
    console.error(e);
    Tri.set("oops");
    Sound.play("oops");
    toast(`<b>The solver got stuck:</b> ${e.message}. Try fewer pieces or different numbers.`, "bad");
    $("btnRun").classList.remove("busy");
    $("runLabel").textContent = "Run";
    return;
  }
  const ms = performance.now() - t0;
  console.log(`[FEM Blocks] FEAScript solve: ${ms.toFixed(1)} ms`);
  $("btnRun").classList.remove("busy");
  $("runLabel").textContent = "Run";

  lastRes = Results.build(spec, result, ms);
  Results.target = MISSIONS[mission].target || null;
  selectTab("picture");
  Results.show(lastRes);
  $("femExplain").innerHTML = femExplainHtml(lastRes);
  drawFemMinis(lastRes);
  checkMission(lastRes, problems);
}

function checkMission(res, problems) {
  const m = MISSIONS[mission];
  const before = probeHistory.length ? probeHistory[probeHistory.length - 1] : null;
  if (res.probes.length) probeHistory.push({ v: res.probes[0].v, elements: res.elements });
  const warn = problems.find((p) => p.level === "warn");
  if (m.check && m.check(res)) {
    const first = !store.done[m.id];
    store.done[m.id] = true;
    saveStore();
    renderMissionList();
    let extra = "";
    if (m.id === "pieces" && before && before.elements !== res.elements)
      extra = ` <br>Your thermometer read <b>${before.v.toFixed(1)} °C</b> with ${before.elements} pieces, and <b>${res.probes[0].v.toFixed(1)} °C</b> with ${res.elements}.`;
    $("missionText").innerHTML = `<b>${first ? "Mission complete!" : "Still works!"}</b> ${m.success}${extra}`;
    $("missionGoal").innerHTML =
      mission < MISSIONS.length - 1
        ? `<span>✓ Done!</span> <button class="fb-btn small" type="button" id="btnNext">Next mission ▶</button>`
        : `<span>✓ Done!</span>`;
    $("missionGoal").classList.add("done");
    $("btnNext")?.addEventListener("click", () => openMission(mission + 1));
    Tri.set("happy", 6000);
    Sound.play("win");
    $("canvasWrap").classList.remove("win");
    void $("canvasWrap").offsetWidth;
    $("canvasWrap").classList.add("win");
    setTimeout(() => $("canvasWrap").classList.remove("win"), 1300);
    return;
  }
  showingHint = false;
  renderMissionText();
  if (!spec_hasShow(res.spec)) toast("Solved! Tip: add a <b>SHOW</b> block at the end, so the picture is part of your program.");
  else if (warn) toast(`Solved, but: ${warn.text}`);
  else if (m.check) toast("Solved! Not quite the goal yet. Read the goal again, or try the 💡 Hint.");
  else toast("Solved! Hover over the picture to read the values.");
  Tri.set(m.check ? "think" : "happy", 2500);
}

const spec_hasShow = (spec) => !!spec.show;

// ─── Tabs ───
function selectTab(name) {
  document.querySelectorAll(".fb-tab").forEach((t) => {
    t.classList.toggle("on", t.dataset.tab === name);
    if (t.dataset.tab === name) t.classList.remove("ping");
  });
  document.querySelectorAll(".fb-pane").forEach((p) => p.classList.toggle("on", p.dataset.pane === name));
  if (name === "fem") drawFemMinis(lastRes);
  if (name === "code") highlightCodeLines(true);
  if (name === "picture" && Results.res) Results.draw();
}

// ─── Save / open ───
function saveFile() {
  const data = { app: "FEM Blocks", version: 1, mission: MISSIONS[mission].id, blocks: Blockly.serialization.workspaces.save(workspace) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `fem-blocks-${MISSIONS[mission].id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Saved! Open the file again any time with <b>Open</b>.");
}

function openFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      loadWorkspace(data.blocks || data);
      toast("Blocks loaded.");
    } catch (e) {
      Tri.set("oops");
      toast("That file doesn't look like FEM Blocks.", "bad");
    }
  };
  reader.readAsText(file);
}

// ─── Theme: follow the FEAScript website toggle ───
const isDark = () => document.documentElement.getAttribute("data-theme") === "dark" || (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
function applyTheme() {
  if (!workspace) return;
  workspace.setTheme(isDark() ? THEMES.dark : THEMES.light);
  if (lastRes) Results.draw();
}

// ─── Boot ───
async function loadFEAScript() {
  for (const url of FEASCRIPT_URLS) {
    try {
      return await import(url);
    } catch (e) {
      console.warn(`Could not load FEAScript from ${url}`, e);
    }
  }
  return null;
}

async function boot() {
  Tri.start();
  Results.init();
  // Measure block text with the pixel font, not a fallback
  try {
    await Promise.race([document.fonts.load('17px "Jersey 10"'), new Promise((r) => setTimeout(r, 2500))]);
  } catch (e) {
    // Fonts unavailable: Blockly falls back to Roboto Mono
  }
  workspace = Blockly.inject("workspace", {
    toolbox: TOOLBOX,
    renderer: "pixel",
    theme: isDark() ? THEMES.dark : THEMES.light,
    grid: { spacing: 16, length: 2, colour: "rgba(140, 138, 130, 0.35)", snap: true },
    zoom: { controls: true, wheel: false, startScale: 0.9, maxScale: 1.6, minScale: 0.5 },
    move: { scrollbars: true, drag: true, wheel: true },
    trashcan: true,
    sounds: false,
  });
  workspace.addChangeListener((e) => {
    if (e.type === Blockly.Events.SELECTED) {
      const b = e.newElementId && workspace.getBlockById(e.newElementId);
      selectedType = b ? b.type : null;
      selectedId = b ? b.id : null;
      highlightTerm();
      highlightCodeLines(true);
      return;
    }
    if (e.isUiEvent) return;
    if (e.type === Blockly.Events.BLOCK_MOVE && e.newParentId) Sound.play("snap");
    refresh();
    clearTimeout(boot.saveTimer);
    boot.saveTimer = setTimeout(saveWorkspace, 400);
  });
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // Buttons
  $("btnRun").addEventListener("click", run);
  $("btnHint").addEventListener("click", () => {
    showingHint = !showingHint;
    renderMissionText();
    Tri.set(showingHint ? "think" : "idle", 3000);
  });
  $("btnReset").addEventListener("click", () => {
    if (confirm("Put the starting blocks of this mission back? Your changes to it will be lost.")) openMission(mission, { fresh: true });
  });
  $("btnSave").addEventListener("click", saveFile);
  $("btnOpen").addEventListener("click", () => $("fileInput").click());
  $("fileInput").addEventListener("change", (e) => {
    if (e.target.files[0]) openFile(e.target.files[0]);
    e.target.value = "";
  });
  $("btnSound").addEventListener("click", () => {
    store.sound = !store.sound;
    saveStore();
    $("btnSound").textContent = store.sound ? "♪ On" : "♪ Off";
  });
  $("btnSound").textContent = store.sound ? "♪ On" : "♪ Off";
  $("btnCopy").addEventListener("click", () => {
    navigator.clipboard?.writeText(lastCode).then(() => toast("Code copied. Paste it into your own page with FEAScript!"));
  });
  document.querySelectorAll(".fb-tab").forEach((t) => t.addEventListener("click", () => selectTab(t.dataset.tab)));
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  });

  openMission(mission, { saveCurrent: false });

  FEA = await loadFEAScript();
  if (!FEA) {
    $("runLabel").textContent = "FEAScript could not load";
    toast("FEAScript could not be loaded. Check your internet connection and reload the page.", "bad");
    return;
  }
  FEA.logSystem?.("none");
  $("feaVersion").textContent = FEA.printVersion || "";
  $("btnRun").disabled = false;
  $("runLabel").textContent = "Run";
}

boot();
