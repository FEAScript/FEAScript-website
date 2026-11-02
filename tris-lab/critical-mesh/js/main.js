/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · main.js
 *  Input wiring and boot (loads FEAScript, runs the sanity check)
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

const isActive = (id) => $(id).classList.contains("active");

// ─── Board (shift) ───
function wireBoard() {
  const board = $("board");
  board.addEventListener("mousemove", (e) => {
    const p = boardCoords(e);
    G.hover = p.inside ? p : null;
  });
  board.addEventListener("mouseleave", () => (G.hover = null));
  board.addEventListener("click", (e) => {
    const p = boardCoords(e);
    if (p.inside) Game.boardClick(p.x, p.y);
  });

  $("rollBtn").addEventListener("click", () => Game.roll());
  $("bankBtn").addEventListener("click", () => Game.bank());
  $("restartBtn").addEventListener("click", restart);
  $("placeBtn").addEventListener("click", () => {
    if (G.carrying == null) return;
    const [x, y] = snapMount(parseFloat($("mx").value) / SCALE, parseFloat($("my").value) / SCALE); // inputs are in metres
    Engineer.walkTo(x, y, "mount");
  });
  $("meshBtn").addEventListener("click", () => {
    store.settings.mesh = !store.settings.mesh;
    if (store.settings.mesh) Codex.unlock("mesh");
    saveStore();
    updateHUD();
  });
  // Top bar ≡ MENU, shown during shifts and interludes
  $("menuBtn").addEventListener("click", () => {
    Sound.play("click");
    if (isActive("scr-lab")) {
      Lab.current = null;
      openMap();
    } else G.mode === "campaign" ? openMap() : openTitle();
  });
  // The equation panel stays open or closed across shifts and interludes
  for (const id of ["eqPanel", "labEqPanel"])
    $(id).addEventListener("toggle", () => {
      store.settings.equationOpen = $(id).open;
      saveStore();
    });
  // Click a term or an edge of the live equation to read its Field Note
  $("eqPanel").addEventListener("click", (e) => {
    const el = e.target.closest("[data-term], [data-edge]");
    const id = el && TERM_NOTE[el.dataset.term || el.dataset.edge];
    if (id && Codex.has(id)) Codex.open(id);
  });
}

// ─── Interlude canvas ───
function wireLab() {
  const lab = $("lab");
  lab.addEventListener("click", (e) => {
    const { px, py } = labCoords(e);
    Lab.current?.click(px, py);
  });
  lab.addEventListener("mousemove", (e) => {
    const { px, py } = labCoords(e);
    Lab.current?.hover(px, py);
  });

}

// ─── Menus ───
function wireMenus() {
  $("btnCampaign").addEventListener("click", () => {
    Sound.play("click");
    openMap();
  });
  $("btnArcade").addEventListener("click", () => {
    Sound.play("click");
    startArcade();
  });
  $("btnScores").addEventListener("click", () => openScores());
  $("btnHelp2").addEventListener("click", openHelp);
  $("btnNotes").addEventListener("click", () => Codex.open());
  $("mapNotes").addEventListener("click", () => Codex.open());
  $("noteToast").addEventListener("click", () => Codex.open($("noteToast").dataset.note));
  // "FIELD NOTE ▸" buttons anywhere (lab panel, equation panel)
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-open-note]");
    if (!b) return;
    e.preventDefault();
    Codex.open(b.dataset.openNote || null);
  });
  Codex.updateCounts();
  $("helpBtn").addEventListener("click", openHelp);
  $("mapBack").addEventListener("click", openTitle);
  $("homeLink").addEventListener("click", (e) => {
    e.preventDefault();
    if (FEA) {
      Lab.current = null;
      openTitle();
    }
  });
  $("soundBtn").addEventListener("click", () => setSound(!store.settings.sound));
  document.querySelectorAll("#diffSeg button").forEach((b) =>
    b.addEventListener("click", () => {
      Sound.play("click");
      setDifficulty(b.dataset.diff);
    }),
  );
  $("dialog").addEventListener("click", () => Story.next());
  $("storySkip").addEventListener("click", (e) => {
    e.stopPropagation();
    Story.skip();
  });
  $("modal").addEventListener("click", (e) => {
    if (e.target === $("modal") && $("modalCard").querySelector('[data-act="close"]')) closeModal();
  });
  window.addEventListener("resize", () => {
    fitCanvas($("board"), $("boardWrap"));
    fitCanvas($("lab"), $("labWrap"));
  });
}

// ─── Keyboard ───
function wireKeys() {
  const MOVE = ["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d"];
  document.addEventListener("keyup", (e) => KEYS.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => KEYS.clear());
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") {
      if (e.key === "Enter") $("modalCard").querySelector(".px-btn")?.click();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === "m") return setSound(!store.settings.sound);
    if (k === "n" && !isActive("scr-story")) {
      if ($("modal").classList.contains("open")) {
        if ($("notePage")) closeModal();
      } else Codex.open();
      return;
    }
    if ($("modal").classList.contains("open")) {
      if (k === "escape" && $("modalCard").querySelector('[data-act="close"]')) closeModal();
      return;
    }
    if (isActive("scr-story")) {
      if (k === " " || k === "enter") {
        e.preventDefault();
        Story.next();
      }
      if (k === "escape") Story.skip();
      return;
    }
    const inGame = isActive("scr-game");
    const inLab = isActive("scr-lab");
    if (!inGame && !inLab) return;
    if (MOVE.includes(k) || k === " ") e.preventDefault();
    if (MOVE.includes(k)) KEYS.add(k);
    if (inLab && !e.repeat) Lab.current?.key?.(k);
    if (!inGame) return;
    if (e.repeat && !MOVE.includes(k)) return;
    if (k === "r") Game.roll();
    else if (k === "b") Game.bank();
    else if (k === " " || k === "e") Game.action();
    else if (k === "g") $("meshBtn").click();
    else if (k === "escape") {
      G.armed = null;
      Engineer.target = null;
      updateHUD();
    } else if (/^[1-6]$/.test(k)) {
      const btn = document.querySelector(`.tool[data-key="${k}"]`);
      if (btn && !btn.disabled) btn.click();
    }
  });
}

// ─── Boot ───
function bootLine(line, cls = "") {
  const div = document.createElement("div");
  div.innerHTML = line;
  if (cls) div.className = cls;
  $("bootLog").appendChild(div);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  Scene.init();
  wireBoard();
  wireLab();
  wireMenus();
  wireKeys();
  setDifficulty(store.settings.difficulty);
  setSound(store.settings.sound);
  paintSprite($("msgFace"), "ella");
  requestAnimationFrame(mainLoop);

  bootLine(`<span class="dim">HEATWORKS OS 9.2 · night shift terminal</span>`);
  bootLine("&gt; loading FEAScript finite element core ...");
  if (!(await loadFEAScript())) {
    bootLine("&gt; FEAScript could not be loaded. Check your internet connection and reload.", "err");
    return;
  }
  bootLine(`&gt; FEAScript <b>${FEA.printVersion}</b> online <span class="dim">(${new URL(feaUrl).host})</span>`, "ok");
  console.log("FEAScript version:", FEA.printVersion);
  if (FEA.logSystem) FEA.logSystem("none");
  await wait(150);

  Physics.init();
  bootLine(`&gt; plate mesh: ${PLATE.nx} × ${PLATE.ny} quadratic quads · ${NI * NJ} nodes · ${showLen(PLATE.maxX)} m × ${showLen(PLATE.maxY)} m`);
  try {
    await Physics.prepareMeshes();
    bootLine(`&gt; Gmsh mesh imported: plate-bypass.msh · ${Physics.bypass.nodes} nodes`);
  } catch (err) {
    console.warn("Could not import the Gmsh mesh; shift 8 will use the structured plate", err);
    bootLine("&gt; Gmsh mesh import failed; using the structured plate", "err");
  }
  await wait(120);

  // Sanity check: an empty plate must sit at exactly 20 °C everywhere
  const empty = Physics.solveHeat({ kBase: K_ALLOY, sources: [], weak: [], copper: [] }, "boot sanity check", false);
  const ok = Math.abs(empty.max - T_AMB) < 1e-6;
  console.log(`[Critical Mesh] Sanity check, empty plate: max T = ${empty.max.toFixed(6)} °C ${ok ? "✓" : "✗"}`);
  bootLine(`&gt; sanity check: empty plate max T = ${empty.max.toFixed(2)} °C ${ok ? "✓" : "✗ (expected 20)"} · solve ${empty.ms.toFixed(0)} ms`, ok ? "ok" : "err");
  await wait(120);

  // A real solve for the title backdrop
  const showcase = Physics.solveHeat(
    {
      kBase: K_ALLOY,
      sources: [
        { x: 0.7, y: 1.3, q: 1500 },
        { x: 1.6, y: 0.5, q: 2500 },
        { x: 2.3, y: 1.45, q: 1200 },
        { x: 3.2, y: 0.8, q: 2400 },
        { x: 3.55, y: 1.5, q: 900 },
      ],
      weak: [{ x: 2.6, y: 1.0, r: WEAK_R }],
      copper: [],
    },
    "title showcase",
    false,
  );
  showcaseGrid = showcase.grid;
  bootLine(`&gt; solve timing ${showcase.ms.toFixed(0)} ms (budget 1000 ms) ✓`, "ok");
  bootLine("&gt; beam · front propagation · creeping flow modules ready");
  bootLine(`&gt; MESH monitor ready. <span class="dim">Good evening, engineer.</span>`);

  $("btnCampaign").disabled = false;
  $("btnArcade").disabled = false;
}

boot();
