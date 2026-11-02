/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · ui.js
 *  Screens, HUD, story player, campaign map, modals and end screens
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

// ─── Screens and layout ───
function show(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === screenId));
  // Top bar: back to where you came from (shifts and interludes), and the mesh view (shifts)
  $("menuBtn").classList.toggle("hidden", screenId !== "scr-game" && screenId !== "scr-lab");
  $("menuBtn").textContent = screenId === "scr-game" && G.mode !== "campaign" ? "≡ TITLE" : "≡ MAP";
  $("meshBtn").classList.toggle("hidden", screenId !== "scr-game");
  if (screenId === "scr-game") requestAnimationFrame(() => fitCanvas($("board"), $("boardWrap")));
  if (screenId === "scr-lab") requestAnimationFrame(() => fitCanvas($("lab"), $("labWrap")));
  KEYS.clear();
  window.scrollTo(0, 0);
}

// Integer pixel scaling where possible, so the pixel art stays crisp
function fitCanvas(canvas, wrap) {
  const avail = wrap.clientWidth - 20;
  const hAvail = Math.max(300, window.innerHeight - 300);
  let s = Math.floor(Math.min(avail / CW, hAvail / CH));
  if (s < 2) s = Math.max(1, Math.min(avail / CW, 2));
  canvas.style.width = `${Math.round(CW * s)}px`;
  canvas.style.height = `${Math.round(CH * s)}px`;
}

function boardCoords(evt) {
  const rect = $("board").getBoundingClientRect();
  const px = ((evt.clientX - rect.left) / rect.width) * CW;
  const py = ((evt.clientY - rect.top) / rect.height) * CH;
  const x = (px - PX0) / PPM;
  const y = PLATE.maxY - (py - PY0) / PPM;
  return { x, y, inside: x >= 0 && x <= PLATE.maxX && y >= 0 && y <= PLATE.maxY };
}

// Plate status, rules and warnings come from MESH unless another speaker is given (Tri only explains physics)
function message(html, face = "mesh") {
  $("msg").innerHTML = html;
  paintSprite($("msgFace"), SPEAKERS[face]?.sprite || face);
}

function logLine(text, cls = "") {
  const log = $("log");
  const div = document.createElement("div");
  div.textContent = `[T+${String(G.turn).padStart(2, "0")}] ${text}`;
  if (cls) div.className = cls;
  log.appendChild(div);
  while (log.children.length > 5) log.removeChild(log.firstChild);
}

function showBanner(text, cls = "", stay = false, id = "banner") {
  const b = $(id);
  b.className = "banner";
  void b.offsetWidth;
  b.textContent = text;
  b.className = `banner ${cls} ${stay ? "stay" : "show"}`;
}

const clearBanner = (id = "banner") => ($(id).className = "banner");

// ─── HUD ───
function updateLevelHead() {
  if (G.mode === "campaign") {
    const L = G.level;
    const n = shiftNumber(G.step);
    $("lvlTitle").innerHTML = `<small>SHIFT ${n}/10</small>${L.title.toUpperCase()}`;
    const bits = [`Deliver <b>${G.target} MW</b>`, `limit <b>${G.limit} °C</b>`];
    if (G.mutateEvery) bits.push(`cracks every <b>${G.mutateEvery}</b> mounts${G.targeted ? " (aimed!)" : ""}`);
    if (G.kBase !== K_ALLOY) bits.push(`alloy k = <b>${G.kBase}</b>`);
    $("objective").innerHTML = bits.join(" · ");
  } else {
    $("lvlTitle").innerHTML = `<small>${G.diff.label}</small>ENDLESS SHIFT`;
    $("objective").innerHTML = `Mount as many cells as you dare · limit <b>${G.limit} °C</b> · cracks every <b>3</b> mounts · bank before it melts`;
  }
}

// Output gauge: green fill up to the output, a tick per star target (1, 2 and 3 stars above it)
function renderOutputGauge(out) {
  const top = Math.ceil(G.starsAt[G.starsAt.length - 1] * 1.15);
  const at = (mw) => Math.min(1, mw / top);
  const c = $("outBar");
  const g = c.getContext("2d");
  const W = c.width;
  g.fillStyle = "#0e0e12";
  g.fillRect(0, 0, W, 9);
  g.fillStyle = "#1b1f2e";
  g.fillRect(1, 1, W - 2, 7);
  const n = Math.round(at(out) * (W - 2));
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 4 === 0 ? "#1f9e70" : "#2fcf93";
    g.fillRect(1 + i, 1, 1, 7);
  }
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.fillRect(1, 2, n, 1);
  for (const s of G.starsAt) {
    g.fillStyle = out >= s ? "#f7d54a" : "#fdfaf2";
    g.fillRect(Math.round(1 + at(s) * (W - 2)) - 1, 0, 1, 9);
  }
  $("outMaxLbl").textContent = `${top} MW`;

  const key = `${G.starsAt.join(",")}|${G.starsAt.filter((s) => out >= s).length}`;
  const stars = $("outStars");
  if (stars.dataset.key === key) return;
  stars.dataset.key = key;
  stars.innerHTML = G.starsAt
    .map(
      (s, i) =>
        `<span class="${out >= s ? "on" : ""}" style="left:${(at(s) * 100).toFixed(1)}%">` +
        `<i class="row">${`<canvas class="px" data-s="${out >= s ? "star" : "starOff"}"></canvas>`.repeat(i + 1)}</i><b>${s}</b></span>`,
    )
    .join("");
  stars.querySelectorAll("canvas[data-s]").forEach((cv) => paintSprite(cv, cv.dataset.s));
}

function updateHUD() {
  const t = (G.maxT - T_AMB) / (G.limit - T_AMB);
  $("turn").textContent = G.turn;
  $("rollVal").textContent = G.lastRoll ?? "–";
  $("qNext").textContent = G.carrying ? `Q = ${showQ(G.carrying * G.qPerPip)} (${G.carrying} pip${G.carrying > 1 ? "s" : ""})` : "–";
  const mt = $("maxT");
  mt.textContent = `${G.maxT.toFixed(1)} °C`;
  mt.className = t > 0.85 ? "hot" : t > 0.6 ? "warm" : "";
  $("limitLbl").textContent = `limit ${G.limit} °C`;
  $("alarm").className = `alarm ${t > 0.85 ? "hot" : t > 0.6 ? "warm" : ""}`;

  const campaign = G.mode === "campaign";
  $("bestRow").classList.toggle("hidden", campaign);
  $("outGauge").classList.toggle("hidden", !campaign);
  if (campaign) {
    const out = output();
    $("scoreLbl").textContent = "Output";
    $("score").textContent = `${out} MW`;
    $("score").className = out >= G.target ? "good" : "";
    renderOutputGauge(out);
  } else {
    $("scoreLbl").textContent = "Score (cells placed)";
    $("score").textContent = G.placed;
    $("score").className = "";
    $("bestLbl").textContent = `Best (${G.diff.label.toLowerCase()})`;
    $("best").textContent = store.scores[store.settings.difficulty][0]?.score ?? 0;
  }

  // Hearts
  const hb = $("hearts");
  if (hb.children.length !== Engineer.maxHearts) {
    hb.innerHTML = "";
    for (let i = 0; i < Engineer.maxHearts; i++) {
      const c = document.createElement("canvas");
      c.className = "px";
      hb.appendChild(c);
    }
  }
  [...hb.children].forEach((c, i) => paintSprite(c, i < Engineer.hearts ? "heart" : "heartOff"));

  const busy = G.phase === "rolling" || G.phase === "over";
  $("rollBtn").disabled = G.phase !== "idle";
  const bankBtn = $("bankBtn");
  bankBtn.innerHTML = campaign ? "DELIVER <kbd>B</kbd>" : "BANK <kbd>B</kbd>";
  bankBtn.disabled = G.phase !== "idle" || (campaign ? output() < G.target : G.placed === 0);
  $("placeBtn").disabled = G.phase !== "carrying";
  $("restartBtn").disabled = G.phase === "rolling";

  document.querySelectorAll(".tool").forEach((btn) => {
    const name = btn.dataset.tool;
    const n = G.tools[name] || 0;
    btn.querySelector(".cnt").textContent = `×${n}`;
    let usable = n > 0 && !busy;
    if (name === "reroll" || name === "scan") usable = usable && G.phase === "carrying";
    if (name === "coolant") usable = usable && G.sources.length > 0;
    btn.disabled = !usable;
    btn.classList.toggle("armed", G.armed === name);
  });
  const nTools = document.querySelectorAll(".tool").length;
  $("toolHelp").innerHTML = G.armed
    ? TOOL_INFO[G.armed].help
    : `Tools don't use up a turn. Hotkeys <kbd>1</kbd>–<kbd>${Math.max(1, nTools)}</kbd>, <kbd>Esc</kbd> cancels.`;
  $("meshBtn").textContent = `${store.settings.mesh ? "HIDE" : "SHOW"} MESH`;
  $("diffChip").textContent = DIFFICULTY[store.settings.difficulty].label;
}

function buildTools() {
  const box = $("tools");
  box.innerHTML = "";
  const names = TOOL_ORDER.filter((n) => n in G.toolsStart);
  $("toolsPanel").classList.toggle("hidden", names.length === 0);
  names.forEach((name, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool";
    btn.dataset.tool = name;
    btn.dataset.key = String(i + 1);
    btn.title = `${TOOL_INFO[name].help} (key ${i + 1})`;
    const c = document.createElement("canvas");
    c.className = "px";
    paintSprite(c, TOOL_INFO[name].sprite);
    btn.appendChild(c);
    const label = document.createElement("span");
    label.innerHTML = `${TOOL_INFO[name].name}<span class="cnt"></span>`;
    btn.appendChild(label);
    btn.addEventListener("click", () => Game.arm(name));
    box.appendChild(btn);
  });
}

function drawGauge(now) {
  const c = $("gauge");
  const g = c.getContext("2d");
  const W = c.width;
  g.fillStyle = "#0e0e12";
  g.fillRect(0, 0, W, 9);
  g.fillStyle = "#1b1f2e";
  g.fillRect(1, 1, W - 2, 7);
  const t = clamp((G.maxT - T_AMB) / (G.limit - T_AMB), 0, 1);
  const n = Math.round(t * (W - 2));
  for (let i = 0; i < n; i++) {
    g.fillStyle = HEAT_HEX[Math.min(NBANDS - 1, Math.floor((i / (W - 2)) * NBANDS))];
    g.fillRect(1 + i, 1, 1, 7);
    if (i % 4 === 0) {
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(1 + i, 1, 1, 7);
    }
  }
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.fillRect(1, 2, n, 1);
  g.fillStyle = "#0e0e12";
  for (let k = 1; k < 4; k++) g.fillRect(Math.round(1 + (k * (W - 2)) / 4), 6, 1, 2);
  g.fillStyle = t > 0.85 && Math.floor(now / 250) % 2 === 0 ? "#ff5c8d" : "#c8003f";
  g.fillRect(W - 2, 0, 2, 9);
}

function drawSuitGauge() {
  const c = $("suit");
  const g = c.getContext("2d");
  const W = c.width;
  g.fillStyle = "#0e0e12";
  g.fillRect(0, 0, W, 5);
  g.fillStyle = "#26262c";
  g.fillRect(1, 1, W - 2, 3);
  g.fillStyle = Engineer.suit > 0.7 ? "#ff5c8d" : "#f7a21b";
  g.fillRect(1, 1, Math.round((W - 2) * Math.min(1, Engineer.suit)), 3);
  $("feetT").textContent = `${Math.round(Engineer.feetT)} °C`;
  $("feetT").className = (Engineer.feetT - T_AMB) / (G.limit - T_AMB) > ENGINEER.safeBand ? "hot" : "";
}

// ─── Modals ───
function openModal(html, wire = {}) {
  $("modalCard").innerHTML = html;
  $("modalCard").classList.remove("wide");
  $("modal").classList.add("open");
  KEYS.clear();
  $("modalCard")
    .querySelectorAll("[data-act]")
    .forEach((el) =>
      el.addEventListener("click", () => {
        Sound.play("click");
        wire[el.dataset.act]?.();
      }),
    );
  const first = $("modalCard").querySelector("input, .px-btn");
  if (first) setTimeout(() => first.focus(), 50);
}
const closeModal = () => $("modal").classList.remove("open");

function quoteHtml(who, text, canvasId) {
  return `<div class="quote"><canvas class="px" id="${canvasId}" width="16" height="16"></canvas><div><small>${SPEAKERS[who].name}</small>${text}</div></div>`;
}

function statsHtml(extra = []) {
  const avg = G.solveMs.length ? G.solveMs.reduce((a, b) => a + b, 0) / G.solveMs.length : 0;
  const rows = [
    ["Cells mounted", G.placed],
    ["Peak temperature", `${G.peakT.toFixed(1)} °C`],
    ["Critical limit", `${G.limit} °C`],
    ["Hearts left", `${Math.max(0, Engineer.hearts)} / ${Engineer.maxHearts}`],
    ["FEAScript solves", G.solveMs.length],
    ["Avg solve time", `${avg.toFixed(0)} ms`],
    ...extra,
  ];
  return `<div class="stats-grid">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>`;
}

function starsHtml(n) {
  return `<div class="big-stars">${[0, 1, 2]
    .map((i) => `<canvas class="px ${i < n ? "pop" : ""}" data-star="${i < n ? "star" : "starOff"}" style="animation-delay:${0.25 + i * 0.3}s"></canvas>`)
    .join("")}</div>`;
}

function paintModalSprites(starCount = 0) {
  $("modalCard")
    .querySelectorAll("canvas[data-star]")
    .forEach((c) => paintSprite(c, c.dataset.star));
  for (let i = 0; i < starCount; i++) setTimeout(() => Sound.play("star"), 300 + i * 300);
}

// ─── Campaign progress ───
const shiftNumber = (step) => CAMPAIGN.slice(0, step + 1).filter((s) => s.type === "shift").length;

function completeStep(i, stars) {
  store.stars[i] = Math.max(store.stars[i] || 0, stars);
  store.unlocked = Math.max(store.unlocked, Math.min(CAMPAIGN.length, i + 2));
  if (i === CAMPAIGN.length - 1) store.finished = true;
  saveStore();
}

function endShiftWin() {
  const out = output();
  const stars = Game.starsEarned(out);
  const i = G.step;
  completeStep(i, stars);
  const last = i === CAMPAIGN.length - 1;
  const [who, text] = G.level.win;
  openModal(
    `<h2 class="green">SHIFT COMPLETE</h2>
     <p>Delivered <b>${out} MW</b> (quota ${G.target} MW).</p>
     ${starsHtml(stars)}
     ${quoteHtml(who, text, "qFace")}
     ${statsHtml()}
     <div class="modal-actions">
       ${last ? `<button class="px-btn" data-act="ending">▶ EPILOGUE</button>` : `<button class="px-btn" data-act="next">CONTINUE ▶</button>`}
       <button class="px-btn dark" data-act="retry">↺ RETRY</button>
       <button class="px-btn dark" data-act="map">MAP</button>
     </div>`,
    {
      next: () => {
        closeModal();
        startStep(i + 1);
      },
      ending: () => {
        closeModal();
        playEnding();
      },
      retry: () => {
        closeModal();
        startStep(i, { skipStory: true });
      },
      map: () => {
        closeModal();
        openMap();
      },
    },
  );
  paintSprite($("qFace"), SPEAKERS[who].sprite);
  paintModalSprites(stars);
}

function endShiftFail() {
  const evac = G.endReason === "evacuated";
  const pool = evac ? EVAC_QUOTES : MELTDOWN_QUOTES;
  const [who, text] = pool[Math.floor(Math.random() * pool.length)];
  openModal(
    `<h2 class="heat">${evac ? "EVACUATED" : "MELTDOWN"}</h2>
     <p>${evac ? "Your suit gave out and you were carried off the Plate." : `The Plate passed <b>${G.limit} °C</b>.`} Shift lost with <b>${output()} MW</b> of ${G.target} MW delivered.</p>
     ${quoteHtml(who, text, "qFace")}
     ${statsHtml()}
     <div class="modal-actions">
       <button class="px-btn heat" data-act="retry">↺ TRY AGAIN</button>
       <button class="px-btn dark" data-act="map">MAP</button>
     </div>`,
    {
      retry: () => {
        closeModal();
        startStep(G.step, { skipStory: true });
      },
      map: () => {
        closeModal();
        openMap();
      },
    },
  );
  paintSprite($("qFace"), SPEAKERS[who].sprite);
}

function endArcade(banked) {
  const diffKey = store.settings.difficulty;
  const score = banked ? G.placed : 0;
  const list = store.scores[diffKey];
  const qualifies = banked && score > 0 && (list.length < 10 || score > list[list.length - 1].score);
  const lost = G.endReason === "evacuated" ? "Your suit gave out." : `The Plate passed <b>${G.limit} °C</b> after ${G.placed} cells.`;
  const head = banked
    ? `<h2 class="gold">BANKED: ${score}</h2><p>You banked <b>${score}</b> cell${score === 1 ? "" : "s"} with the Plate at ${G.maxT.toFixed(1)} °C (limit ${G.limit} °C).</p>`
    : `<h2 class="heat">${G.endReason === "evacuated" ? "EVACUATED" : "MELTDOWN"}</h2><p>${lost} Unbanked cells are lost. Score: <b>0</b>.</p>`;
  const entry = qualifies
    ? `<p>New high score! Sign the log:</p><input class="initials" id="initials" maxlength="3" value="${store.lastInitials || "ENG"}" aria-label="Your initials" />`
    : "";
  let saved = false;
  let savedRank = -1;
  const saveScore = () => {
    if (!qualifies || saved) return savedRank;
    saved = true;
    const name = (($("initials")?.value || "ENG").toUpperCase().replace(/[^A-Z0-9]/g, "") || "ENG").slice(0, 3);
    store.lastInitials = name;
    const rec = { name, score, peak: Math.round(G.peakT), date: new Date().toISOString().slice(0, 10), id: Date.now() };
    list.push(rec);
    list.sort((a, b) => b.score - a.score || a.peak - b.peak);
    list.splice(10);
    saveStore();
    savedRank = list.indexOf(rec);
    return savedRank;
  };
  openModal(
    `${head}${entry}${statsHtml()}
     <div class="modal-actions">
       <button class="px-btn ${banked ? "" : "heat"}" data-act="again">↺ PLAY AGAIN</button>
       <button class="px-btn dark" data-act="scores">HIGH SCORES</button>
       <button class="px-btn dark" data-act="title">TITLE</button>
     </div>`,
    {
      again: () => {
        saveScore();
        closeModal();
        startArcade();
      },
      scores: () => openScores(diffKey, saveScore()),
      title: () => {
        saveScore();
        openTitle();
      },
    },
  );
}

function openScores(diffKey = store.settings.difficulty, highlight = -1) {
  const render = (key) => {
    const list = store.scores[key];
    const rows = list.length
      ? list
          .map((r, i) => `<tr class="${key === diffKey && i === highlight ? "me" : ""}"><td>${i + 1}</td><td>${r.name}</td><td>${r.score}</td><td>${r.peak} °C</td><td>${r.date}</td></tr>`)
          .join("")
      : `<tr><td colspan="5" style="color:var(--faint)">No banked shifts yet. Be the first.</td></tr>`;
    openModal(
      `<h2 class="cream">HIGH SCORES</h2>
       <p style="color:var(--muted)">Endless shift · cells banked before meltdown</p>
       <div class="seg score-tabs">${Object.keys(DIFFICULTY)
         .map((k) => `<button type="button" data-act="tab-${k}" class="${k === key ? "on" : ""}">${DIFFICULTY[k].label}</button>`)
         .join("")}</div>
       <table class="scores"><thead><tr><th>#</th><th>NAME</th><th>CELLS</th><th>PEAK</th><th>DATE</th></tr></thead><tbody>${rows}</tbody></table>
       <div class="modal-actions"><button class="px-btn" data-act="close">CLOSE</button></div>`,
      {
        "tab-easy": () => render("easy"),
        "tab-normal": () => render("normal"),
        "tab-hard": () => render("hard"),
        close: () => {
          closeModal();
          if ($("scr-game").classList.contains("active") && G.phase === "over") openTitle();
        },
      },
    );
  };
  render(diffKey);
}

function openHelp() {
  openModal(
    `<h2 class="cream">HOW TO PLAY</h2>
     <div class="help-body">
       <h4>THE PLATE</h4>
       <p>A 40 m × 20 m metal plate. The <b>bottom</b> edge sits on a coolant pipe at 20 °C, the <b>top</b> edge loses heat to the air
       by convection (h = ${showH(H_CONV)}, 20 °C), and the <b>sides</b> are insulated. After every change FEAScript solves the steady-state heat
       equation <code>−∇·(k ∇T) = Q</code> on 32 × 16 quadratic elements.</p>
       <h4>A TURN</h4>
       <p><b>Roll</b> the d6 (<kbd>R</kbd>): it sets the power of your next thermo-cell (Q = pips × ${showQ(DIFFICULTY[store.settings.difficulty].qPerPip)}).
       Walk onto the plate (<kbd>WASD</kbd>/arrows) and press <kbd>SPACE</kbd> to mount it under your feet, or simply <b>click</b> a spot:
       you'll walk there and mount it. Cells are circles of radius ${showLen(SOURCE_R)} m and can't overlap. Pass the critical limit anywhere and it's a <b>meltdown</b>.</p>
       <h4>YOUR SUIT</h4>
       <p>The temperature field is the floor. Standing on metal hotter than half the limit (red or brighter) heats your suit. When the
       suit gauge fills you lose a heart and get hauled back to the airlock. Lose every heart and you're evacuated.</p>
       <h4>CRACKS AND CRATES</h4>
       <p>Every few mounts the alloy cracks: a 0.5 m circle drops to 15 % conductivity. The amber ring shows where the next crack forms
       (red if it's aimed at your hottest cell) and counts down. Supply drones drop crates: walk over them before they vanish.</p>
       <h4>BANK OR PUSH</h4>
       <p><b>Endless shift:</b> score = cells placed. Bank whenever you like; a meltdown or evacuation scores 0.<br />
       <b>Campaign:</b> reach the quota in MW (1 pip = 1 MW), then <b>Deliver</b>. More output earns up to three stars; at three stars the shift is delivered automatically.</p>
       <h4>TOOLS</h4>
       <p><b>Copper</b> lays a k = 10 inlay. <b>FEA scan</b> solves a what-if case. <b>Coolant</b> removes the strongest cell.
       <b>Re-roll</b> rolls the die again. <b>Weld</b> closes a crack you stand in (2 s). <b>Side vent</b> (stand by a side wall)
       turns that insulated edge into a convective boundary, so FEAScript re-solves with new boundary conditions. Tools don't use a turn.</p>
       <h4>KEYS</h4>
       <p><kbd>WASD</kbd>/arrows walk · <kbd>SPACE</kbd>/<kbd>E</kbd> mount/weld · <kbd>R</kbd> roll · <kbd>B</kbd> bank/deliver ·
       <kbd>1</kbd>–<kbd>6</kbd> tools · <kbd>Esc</kbd> cancel · <kbd>G</kbd> show the mesh · <kbd>N</kbd> field notes · <kbd>M</kbd> sound</p>
       <h4>MORE PHYSICS</h4>
       <p>Three campaign interludes use other FEAScript models: an <b>Euler-Bernoulli beam</b> (The Gantry), the <b>eikonal front
       propagation</b> model (Cold Pour) and <b>creeping Stokes flow</b> (Pump Room).</p>
       <h4>THE EQUATION AND FIELD NOTES</h4>
       <p>The <b>EQUATION</b> panel shows what FEAScript is solving, with the values of <i>k</i>, <i>T</i> and <i>Q</i> under your
       cursor (or your boots) and the condition on every edge. Terms light up when you change them. As you play, Tri writes
       <b>Field Notes</b> about the physics you meet. Press <kbd>N</kbd> to read them (the shift pauses while you do), or click a term.</p>
     </div>
     <div class="modal-actions"><button class="px-btn" data-act="close">GOT IT</button></div>`,
    { close: closeModal },
  );
}

// ─── Story player ───
const Story = {
  lines: [],
  i: 0,
  typing: false,
  full: "",
  timer: null,
  onDone: null,

  play(kicker, title, lines, onDone, color = null) {
    this.lines = lines.filter((l) => !l[2] || l[2](store.flags));
    this.i = 0;
    this.onDone = onDone;
    $("storyKicker").textContent = kicker;
    $("storyKicker").style.color = color || "";
    $("storyTitle").textContent = title;
    show("scr-story");
    this.render();
  },

  render() {
    const [who, raw] = this.lines[this.i];
    const sp = SPEAKERS[who];
    const text = raw.replace("{target}", String(G.target));
    paintSprite($("portrait"), sp.sprite);
    $("who").innerHTML = `${sp.name}${sp.role ? `<small>${sp.role}</small>` : ""}`;
    const el = $("dialogText");
    el.className = `text ${sp.cls}`;
    this.full = text;
    this.typing = true;
    let n = 0;
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      n += 2;
      el.textContent = text.slice(0, n);
      if (n % 6 === 0) Sound.play("type");
      if (n >= text.length) this.finish();
    }, 22);
  },

  finish() {
    clearInterval(this.timer);
    this.typing = false;
    $("dialogText").textContent = this.full;
  },

  next() {
    if (!$("scr-story").classList.contains("active")) return;
    if (this.typing) return this.finish();
    this.i++;
    if (this.i >= this.lines.length) return this.skip();
    this.render();
  },

  skip() {
    clearInterval(this.timer);
    const done = this.onDone;
    this.onDone = null;
    if (done) done();
  },
};

// ─── Flow between screens ───
function openTitle() {
  closeModal();
  show("scr-title");
}

function openMap() {
  const box = $("chapters");
  box.innerHTML = "";
  CAMPAIGN.forEach((step, i) => {
    const locked = i + 1 > store.unlocked;
    const isShift = step.type === "shift";
    const phys = PHYSICS[isShift ? "heat" : step.physics];
    const card = document.createElement("button");
    card.type = "button";
    card.className = `chapter px-panel ${isShift ? "" : "interlude"} ${locked ? "locked" : ""} ${i + 1 === store.unlocked && !store.stars[i] ? "current" : ""}`;
    card.style.setProperty("--phys", phys.color);
    const stars = store.stars[i] || 0;
    card.innerHTML = `<span class="num">${isShift ? `SHIFT ${shiftNumber(i)}` : "INTERLUDE"} · <span class="phys-name">${phys.label}</span></span>
      <canvas class="thumb px" width="80" height="40"></canvas>
      <span class="name">${step.title.toUpperCase()}</span>
      <span class="desc">${locked ? "Complete the previous step to unlock." : step.blurb}</span>
      ${isShift ? `<span class="stars">${[0, 1, 2].map((k) => `<canvas class="px" data-s="${k < stars ? "star" : "starOff"}"></canvas>`).join("")}</span>` : `<span class="stars done-tag">${stars ? (stars >= 3 ? "✓ SOLVED" : "✓ DONE") : ""}</span>`}`;
    card.querySelectorAll("canvas[data-s]").forEach((c) => paintSprite(c, c.dataset.s));
    drawThumb(card.querySelector(".thumb"), step);
    if (!locked)
      card.addEventListener("click", () => {
        Sound.play("click");
        startStep(i);
      });
    box.appendChild(card);
  });
  show("scr-map");
}

// Small preview for each campaign card
function drawThumb(c, step) {
  const g = c.getContext("2d");
  const P = (x, y) => [Math.round(x * 20), Math.round((2 - y) * 20)];
  if (step.type === "gantry") {
    g.fillStyle = "#1a1d26";
    g.fillRect(0, 0, 80, 40);
    g.fillStyle = "#245592";
    g.fillRect(0, 30, 80, 10);
    g.fillStyle = "#6b6f78";
    g.fillRect(0, 8, 6, 22);
    for (let x = 6; x < 76; x++) {
      const s = Math.pow((x - 6) / 70, 2) * 8;
      g.fillStyle = "#8c8a82";
      g.fillRect(x, 16 + Math.round(s), 1, 2);
    }
    g.fillStyle = "#2fcf93";
    g.fillRect(58, 22, 2, 8);
    return;
  }
  if (step.type === "pour") {
    for (let y = 0; y < 40; y++)
      for (let x = 0; x < 80; x++) {
        const d = Math.min(x, 80 - x, 40 - y) / 40;
        g.fillStyle = d < 0.6 ? FRONT_HEX[Math.floor(d * 18)] : HEAT_HEX[11];
        g.fillRect(x, y, 1, 1);
      }
    drawRing(g, 40, 4, 7, "#2fcf93");
    return;
  }
  if (step.type === "pump") {
    g.fillStyle = "#0f1d36";
    g.fillRect(0, 0, 80, 40);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      g.fillStyle = FLOW_HEX[6 + (i % 5)];
      g.fillRect(Math.round(40 + Math.cos(a) * 30), Math.round(20 + Math.sin(a) * 12), 1, 1);
    }
    g.fillStyle = "#8a5a32";
    g.fillRect(38, 18, 4, 4);
    return;
  }
  g.fillStyle = "#1b1f2e";
  g.fillRect(0, 0, 80, 40);
  g.fillStyle = "#245592";
  g.fillRect(0, 38, 80, 2);
  g.fillStyle = "#d9c27f";
  g.fillRect(0, 0, 1, 38);
  g.fillRect(79, 0, 1, 38);
  for (const [x, y] of step.preWeak || []) drawRing(g, ...P(x, y), 10, "#5aa2ec", { dash: 2, gap: 2 });
  for (const [x, y] of step.brackets || []) drawDisc(g, ...P(x, y), 5, "#6b6f78");
  for (const [x, y] of step.legacy || []) {
    const [px, py] = P(x, y);
    drawDisc(g, px, py, 5, "#c8003f");
    g.fillStyle = "#fbe68a";
    g.fillRect(px - 1, py - 1, 3, 3);
  }
  if (step.mutateEvery) drawText(g, `×${step.mutateEvery}`, 2, 2, step.targeted ? "#ff5c8d" : "#f7a21b");
  if (step.kBase !== K_ALLOY) drawText(g, `k${step.kBase}`, 78, 2, "#a9a69c", { align: "right" });
  if (step.crates) g.drawImage(sprite("crate"), 66, 26);
  if (step.pipe) {
    drawDisc(g, ...P(BYPASS_PIPE.x, BYPASS_PIPE.y), 6, "#0e0e12");
    drawDisc(g, ...P(BYPASS_PIPE.x, BYPASS_PIPE.y), 5, "#245592");
  }
}

function startStep(i, { skipStory = false } = {}) {
  closeModal();
  const step = CAMPAIGN[i];
  if (!step) return playEnding();
  G.step = i;
  if (step.type !== "shift") {
    const phys = PHYSICS[step.physics];
    const go = () => Lab.start(i, () => startStep(i + 1));
    if (skipStory) return go();
    return Story.play(`INTERLUDE · ${phys.label}`, step.title.toUpperCase(), step.story, go, phys.color);
  }
  Game.setup("campaign", i);
  const n = shiftNumber(i);
  const begin = () => {
    Game.setup("campaign", i);
    show("scr-game");
    clearBanner();
    showBanner(`SHIFT ${n}`, "gold");
    $("log").innerHTML = "";
    logLine(`Shift ${n} · ${step.title} · FEAScript ${FEA.printVersion} · mesh ${PLATE.nx}×${PLATE.ny} quadratic`);
    if (G.bonusNote) logLine(`Bonus: ${G.bonusNote}`);
    afterSetup();
    message(
      step.tutorial
        ? "Press <b>ROLL</b> (<kbd>R</kbd>) for your first thermo-cell. Then walk onto the Plate and press <kbd>SPACE</kbd>, or just click a spot."
        : `Shift ${n}: deliver <b>${G.target} MW</b> without passing <b>${G.limit} °C</b>. Press <b>ROLL</b> to begin.`,
    );
  };
  if (skipStory) return begin();
  Story.play(`SHIFT ${n} OF 10`, step.title.toUpperCase(), step.story, () => showBriefing(i, begin));
}

function afterSetup() {
  drawDie($("die"), 0, { tint: "#6b6f78" });
  $("eqMain").innerHTML = eqHtml(EQ.heat);
  $("eqPanel").open = store.settings.equationOpen;
  Codex.renderEdges();
  Codex.renderFem(G.field);
  Codex.unlock("heat");
  if (G.bc.pipe) Codex.unlock("gmsh");
  buildTools();
  updateLevelHead();
  updateHUD();
  fitCanvas($("board"), $("boardWrap"));
}

function showBriefing(i, begin) {
  const L = CAMPAIGN[i];
  const toolList = TOOL_ORDER.filter((n) => G.tools[n]).map((n) => `${TOOL_INFO[n].name.toLowerCase()} ×${G.tools[n]}`);
  const items = [
    `Deliver at least <b>${G.target} MW</b> (stars at ${G.starsAt.join(" / ")} MW)`,
    `Critical limit <b>${G.limit} °C</b> · cell power Q = ${showQ(G.qPerPip)} per pip`,
    L.mutateEvery ? `Cracks every <b>${L.mutateEvery}</b> mounts${L.targeted ? `, <b>aimed at your hottest cell</b>` : ""}` : "No cracks tonight",
    L.kBase !== K_ALLOY ? `Alloy conductivity <b>k = ${L.kBase}</b>` : `Alloy conductivity k = ${K_ALLOY}`,
    G.bc.airT !== T_AMB ? `Top edge convects to <b>${G.bc.airT} °C</b> air (h = ${showH(G.bc.airH)})` : null,
    G.bc.coolantT !== T_AMB ? `Coolant arrives at <b>${G.bc.coolantT} °C</b>: the bottom edge runs warm` : null,
    G.bc.pipe ? `A coolant <b>bypass pipe</b> runs through the plate (Gmsh mesh, ${Physics.bypass?.nodes || ""} nodes)` : null,
    L.brackets ? `${L.brackets.length} mounting brackets block the floor` : null,
    L.legacy ? "An old furnace adds heat but no output" : null,
    G.weak.length ? `${G.weak.length} existing crack${G.weak.length > 1 ? "s" : ""}` : null,
    L.crates ? `Supply crates every ${L.crates.every} mounts` : null,
    `Suit: <b>${Engineer.maxHearts}</b> hearts`,
    toolList.length ? `Tools: <b>${toolList.join(", ")}</b>` : null,
    G.bonusNote ? `<b>Bonus:</b> ${G.bonusNote}` : null,
  ].filter(Boolean);
  openModal(
    `<h2 class="gold">SHIFT ${shiftNumber(i)}</h2>
     <p style="font-family:var(--font-pixel);color:var(--cream)">${L.title.toUpperCase()}</p>
     <ul class="brief-list">${items.map((t) => `<li><span>${t}</span></li>`).join("")}</ul>
     <div class="modal-actions">
       <button class="px-btn heat" data-act="go">START SHIFT ▶</button>
       <button class="px-btn dark" data-act="map">MAP</button>
     </div>`,
    {
      go: () => {
        closeModal();
        begin();
      },
      map: () => {
        closeModal();
        openMap();
      },
    },
  );
}

function playEnding() {
  Story.play("EPILOGUE", "LIGHTS OF NODESSA", ENDING, () => {
    const total = CAMPAIGN.reduce((s, step, i) => s + (step.type === "shift" ? store.stars[i] || 0 : 0), 0);
    openModal(
      `<h2 class="gold">THE END</h2>
       <p>The Heatworks stays public, and Nodessa keeps its lights on.</p>
       <p style="color:var(--muted)">Campaign stars: <b>${total} / 30</b></p>
       <div class="ending-credits">
         <b>CRITICAL MESH</b><br />
         A heat-conduction game powered by FEAScript<br />
         Physics: <b>FEAScript</b> ${FEA.printVersion}, finite element simulation in JavaScript<br />
         Heat conduction · beam bending · front propagation · creeping flow<br />
         © 2023–2026 FEAScript<br />
         −∇·(k ∇T) = Q
       </div>
       <div class="modal-actions">
         <button class="px-btn" data-act="map">CAMPAIGN MAP</button>
         <button class="px-btn flow" data-act="arcade">∞ ENDLESS SHIFT</button>
       </div>`,
      {
        map: () => {
          closeModal();
          openMap();
        },
        arcade: () => {
          closeModal();
          startArcade();
        },
      },
    );
  });
}

function startArcade() {
  closeModal();
  Game.setup("arcade");
  show("scr-game");
  clearBanner();
  showBanner("ENDLESS SHIFT", "flow");
  $("log").innerHTML = "";
  logLine(`Endless shift · ${G.diff.label} · FEAScript ${FEA.printVersion} · mesh ${PLATE.nx}×${PLATE.ny} quadratic`);
  afterSetup();
  message("Endless shift. Every cell you bank is a point. A meltdown scores zero. Press <b>ROLL</b>.", "mesh");
}

function restart() {
  if (G.phase === "rolling") return;
  Sound.play("click");
  if (G.mode === "campaign") startStep(G.step, { skipStory: true });
  else startArcade();
}

function setDifficulty(key) {
  store.settings.difficulty = key;
  saveStore();
  document.querySelectorAll("#diffSeg button").forEach((b) => b.classList.toggle("on", b.dataset.diff === key));
  $("diffChip").textContent = DIFFICULTY[key].label;
}

function setSound(on) {
  store.settings.sound = on;
  saveStore();
  $("soundBtn").textContent = on ? "♪ ON" : "♪ OFF";
}
