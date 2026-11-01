/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · scene.js
 *  The shift scene (plate, boundary conditions, items, engineer),
 *  particles and the main animation loop
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

const particles = [];
const shimmer = [];

function burst(x, y, n, colors, speed = 1, lift = 0) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = rand(0.3, 1.2) * speed;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v + lift,
      life: rand(0.5, 1.1),
      age: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      g: lift ? 0 : 0.04,
    });
  }
}

function drawParticles(g, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age > p.life) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += p.g * dt * 60;
    g.globalAlpha = 1 - p.age / p.life;
    g.fillStyle = p.color;
    g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }
  g.globalAlpha = 1;
}

const Scene = {
  canvas: null,
  ctx: null,
  fieldCanvas: null,
  fieldCtx: null,
  fieldImg: null,
  fieldDirty: true,

  init() {
    this.canvas = $("board");
    this.ctx = this.canvas.getContext("2d");
    this.fieldCanvas = document.createElement("canvas");
    this.fieldCanvas.width = PW;
    this.fieldCanvas.height = PH;
    this.fieldCtx = this.fieldCanvas.getContext("2d");
    this.fieldImg = this.fieldCtx.createImageData(PW, PH);
  },

  renderField(flicker = false) {
    const span = G.limit - T_AMB;
    renderBands(this.fieldCtx, this.fieldImg, G.displayGrid, PLATE_STENCIL, {
      palette: HEAT,
      norm: (T) => (T - T_AMB) / span,
      mode: store.settings.view,
      flicker,
    });
  },

  // ─── Boundary conditions drawn as scenery ───
  drawBackdrop(g, now) {
    g.fillStyle = "#121217";
    g.fillRect(0, 0, CW, CH);

    // Air above the plate (convection)
    g.fillStyle = "#1a1d26";
    g.fillRect(0, 0, CW, PY0 - 3);
    for (let i = 0; i < 18; i++) {
      const x = (i * 37 + now * 0.004 * (1 + (i % 3))) % CW;
      const y = 4 + ((i * 53) % (PY0 - 10));
      g.fillStyle = i % 4 === 0 ? "#2c3346" : "#232838";
      g.fillRect(Math.floor(x), y, 2, 1);
    }
    drawText(g, `AIR  h=${G.bc.airH}  T=${G.bc.airT}°C`, 4, 3, G.bc.airT > T_AMB ? "#f7a21b" : "#77756d");
    drawText(g, "CONVECTION", CW - 4, 3, "#4d4d55", { align: "right" });

    // Insulated side walls (or open vents)
    for (const [x0, open] of [[PX0 - 15, G.bc.ventLeft], [PX0 + PW + 3, G.bc.ventRight]]) {
      g.fillStyle = "#0e0e12";
      g.fillRect(x0 - 1, PY0 - 3, 14, PH + 5);
      if (open) {
        for (let v = 0; v < PH + 3; v++) {
          g.fillStyle = v % 4 < 2 ? "#4d4d55" : "#1a1d26";
          g.fillRect(x0, PY0 - 2 + v, 12, 1);
        }
        for (let i = 0; i < 6; i++) {
          const yy = PY0 + ((i * 17 + now * 0.05) % PH);
          g.fillStyle = "#a8d8ff";
          g.fillRect(x0 + 2 + ((i * 5) % 8), Math.floor(yy), 2, 1);
        }
        [..."VENT"].forEach((ch, i) => drawText(g, ch, x0 + 4, PY0 + 24 + i * 8, "#5aa2ec"));
        continue;
      }
      for (let v = 0; v < PH + 3; v++)
        for (let u = 0; u < 12; u++) {
          const wave = (v + Math.abs((u % 6) - 3)) % 6;
          g.fillStyle = wave === 0 ? "#b88f2a" : wave === 3 ? "#e8d59c" : "#d9c27f";
          g.fillRect(x0 + u, PY0 - 2 + v, 1, 1);
        }
      [..."INSULATED"].forEach((ch, i) => drawText(g, ch, x0 + 4, PY0 + 4 + i * 8, "#3a2418", { shadow: null }));
    }

    // Coolant pipe along the bottom, water flowing to the right
    const py = PIPE_Y;
    const rows = ["#0e0e12", "#a8d8ff", "#5aa2ec", "#4a8fd6", "#3576bf", "#2c64a8", "#245592", "#1d477d", "#173a68", "#122f56", "#0b2240", "#0e0e12"];
    rows.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(2, py + i, CW - 4, 1);
    });
    for (let i = 0; i < 26; i++) {
      const x = ((i * 23 + now * 0.03) % (CW - 8)) + 4;
      g.fillStyle = i % 3 === 0 ? "#cfe9ff" : "#7dbaf0";
      g.fillRect(Math.floor(x), py + 4 + (i % 4), i % 3 === 0 ? 3 : 2, 1);
    }
    for (let x = 10; x < CW - 6; x += 32) {
      g.fillStyle = "#0e0e12";
      g.fillRect(x, py, 3, 12);
      g.fillStyle = "#6b6f78";
      g.fillRect(x + 1, py + 1, 1, 10);
    }
    drawText(g, `COOLANT  T=${G.bc.coolantT}°C  >>>`, CW / 2, py + 14, G.bc.coolantT > T_AMB ? "#f7a21b" : "#5aa2ec", { align: "center" });

    // Airlock hatch under the spawn point
    const [hx] = toPx(ENGINEER.hatch.x, 0);
    g.drawImage(sprite("hatch"), hx - 5, py + 2);
  },

  drawPlate(g, now) {
    g.fillStyle = "#0e0e12";
    g.fillRect(PX0 - 2, PY0 - 2, PW + 4, PH + 4);
    g.fillStyle = "#4d4d55";
    g.fillRect(PX0 - 1, PY0 - 1, PW + 2, 1);
    g.drawImage(this.fieldCanvas, PX0, PY0);

    if (store.settings.mesh && Physics.unstructured) {
      // The Gmsh mesh: one dot per node
      g.fillStyle = "rgba(253, 250, 242, 0.22)";
      const { X, Y } = Physics.bypass;
      for (let n = 0; n < X.length; n++) {
        const [px, py] = toPx(X[n], Y[n]);
        g.fillRect(Math.min(px, PX0 + PW - 1), Math.min(py, PY0 + PH - 1), 1, 1);
      }
    } else if (store.settings.mesh) {
      // The finite element mesh: 32 × 16 quadratic elements, 5 px each
      g.fillStyle = "rgba(253, 250, 242, 0.13)";
      for (let i = 1; i < PLATE.nx; i++) g.fillRect(PX0 + i * 5, PY0, 1, PH);
      for (let j = 1; j < PLATE.ny; j++) g.fillRect(PX0, PY0 + j * 5, PW, 1);
    }

    // Coolant bypass pipe through the plate (a hole in the Gmsh mesh)
    if (G.bc.pipe) {
      const [cx, cy] = toPx(G.bc.pipe.x, G.bc.pipe.y);
      const r = Math.round(G.bc.pipe.r * PPM);
      drawDisc(g, cx, cy, r, "#0e0e12");
      drawDisc(g, cx, cy, r - 2, "#245592");
      drawDisc(g, cx, cy, r - 5, "#173a68");
      for (let i = 0; i < 6; i++) {
        const a = now / 400 + (i * Math.PI) / 3;
        g.fillStyle = "#a8d8ff";
        g.fillRect(Math.round(cx + Math.cos(a) * (r - 6)), Math.round(cy + Math.sin(a) * (r - 6)), 1, 1);
      }
      drawRing(g, cx, cy, r, "#6b6f78");
      drawTag(g, `BYPASS ${G.bc.coolantT}°C`, cx - 22, cy + r + 2, "#5aa2ec");
    }

    // Ruler ticks every 0.5 m
    for (let i = 0; i <= 8; i++) {
      g.fillStyle = i % 2 === 0 ? "#8c8a82" : "#4d4d55";
      g.fillRect(PX0 + i * 20 - (i === 8 ? 1 : 0), PY0 - 3, 1, i % 2 === 0 ? 2 : 1);
    }

    // Frame glows when close to the limit
    const t = (G.maxT - T_AMB) / (G.limit - T_AMB);
    if (t > 0.75 && G.phase !== "over" && Math.floor(now / (t > 0.9 ? 180 : 400)) % 2 === 0) {
      g.fillStyle = t > 0.9 ? "#c8003f" : "#f2731d";
      g.fillRect(PX0 - 2, PY0 - 2, PW + 4, 1);
      g.fillRect(PX0 - 2, PY0 + PH + 1, PW + 4, 1);
      g.fillRect(PX0 - 2, PY0 - 2, 1, PH + 4);
      g.fillRect(PX0 + PW + 1, PY0 - 2, 1, PH + 4);
    }
  },

  // Heat rising off the top edge, proportional to the local edge temperature
  drawShimmer(g, dt) {
    if (G.field) {
      for (let k = 0; k < 3; k++) {
        const x = Math.random() * PLATE.maxX;
        const t = (sampleGrid(G.displayGrid, x, PLATE.maxY) - T_AMB) / (G.limit - T_AMB);
        if (Math.random() < t * 1.4)
          shimmer.push({ x: PX0 + x * PPM, y: PY0 - 3, age: 0, life: rand(0.6, 1.3), band: Math.min(12, Math.max(5, Math.round(t * 12) + 2)), ph: rand(0, 6) });
      }
    }
    for (let i = shimmer.length - 1; i >= 0; i--) {
      const s = shimmer[i];
      s.age += dt;
      if (s.age > s.life) {
        shimmer.splice(i, 1);
        continue;
      }
      g.globalAlpha = 1 - s.age / s.life;
      g.fillStyle = HEAT_HEX[s.band];
      g.fillRect(Math.round(s.x + Math.sin(s.ph + s.age * 7) * 1.5), Math.round(s.y - s.age * 18), 1, 2);
    }
    g.globalAlpha = 1;
  },

  drawItems(g, now) {
    // Copper inlays
    for (const c of G.copper) {
      const [cx, cy] = toPx(c.x, c.y);
      const rp = Math.round(c.r * PPM);
      const age = (now - c.born) / 400;
      g.globalAlpha = 0.45;
      drawRing(g, cx, cy, rp - 6, "#c87533");
      drawRing(g, cx, cy, rp - 12, "#e8a070");
      g.globalAlpha = 1;
      drawRing(g, cx, cy, age < 1 ? Math.round(rp + (1 - age) * 8) : rp, "#e8a070", { outline: "#5c2a0e" });
      g.drawImage(sprite("copper"), cx - 5, cy - 5);
    }

    // Cracks
    for (const w of G.weak) {
      const [cx, cy] = toPx(w.x, w.y);
      const n = Math.floor(w.cracks.length * clamp((now - w.born) / 500, 0, 1));
      for (let i = 0; i < n; i++) {
        const [dx, dy] = w.cracks[i];
        g.fillStyle = "#06070b";
        g.fillRect(cx + dx, cy + dy, 1, 1);
        g.fillStyle = "rgba(168, 216, 255, 0.35)";
        g.fillRect(cx + dx + 1, cy + dy, 1, 1);
      }
      drawRing(g, cx, cy, Math.round(w.r * PPM), "#5aa2ec", { dash: 3, gap: 3, phase: -now / 160 });
    }

    // Forecast of the next crack (red when it is aimed at your hottest cell)
    if (G.nextMut && G.phase !== "over") {
      const [cx, cy] = toPx(G.nextMut.x, G.nextMut.y);
      const rp = Math.round(WEAK_R * PPM);
      const left = turnsToMutation();
      const urgent = left === 1;
      const on = Math.floor(now / (urgent ? 200 : 500)) % 2 === 0;
      const col = G.nextMut.targeted ? "#ff5c8d" : "#f7a21b";
      if (on || !urgent) drawRing(g, cx, cy, rp, col, { dash: 1, gap: 2, phase: now / 120 });
      if (on) {
        g.fillStyle = "#0e0e12";
        g.fillRect(cx - 4, cy - 4, 9, 9);
        drawText(g, "!", cx - 1, cy - 2, col, { shadow: null });
      }
      drawText(g, `${left}`, cx + rp - 4, cy - rp + 1, col);
    }

    // Mounting brackets
    for (const b of G.brackets) {
      const [cx, cy] = toPx(b.x, b.y);
      drawDisc(g, cx, cy, 11, "#0e0e12");
      drawDisc(g, cx, cy, 10, "#4d4d55");
      drawDisc(g, cx, cy, 8, "#6b6f78");
      g.fillStyle = "#565a63";
      for (let i = -8; i <= 8; i += 3) g.fillRect(cx + i, cy - 8 + Math.abs(i) / 3, 1, 16 - (Math.abs(i) * 2) / 3);
      g.drawImage(sprite("bolt"), cx - 3, cy - 3);
    }

    // Old furnace: heat without output
    for (const f of G.legacy) {
      const [cx, cy] = toPx(f.x, f.y);
      drawRing(g, cx, cy, 12, "#8a1f2a", { outline: "#0e0e12" });
      g.drawImage(sprite("furnace"), cx - 4, cy - 4);
      if (Math.floor(now / 150) % 3 === 0) {
        g.fillStyle = "#fbe68a";
        g.fillRect(cx, cy + 1, 1, 1);
      }
      drawTag(g, "FURNACE", cx - 14, cy + 13, "#ff5c8d");
    }

    // Thermo-cells
    for (const s of G.sources) {
      const [cx, cy] = toPx(s.x, s.y);
      const age = (now - s.born) / 300;
      const r = age < 1 ? Math.round(12 + (1 - age) * 10) : 12;
      drawRing(g, cx, cy, r, "#fdfaf2", { dash: 4, gap: 2, phase: now / 140, outline: "#0e0e12" });
      drawCell(g, cx, cy, s.pips, now);
    }

    // Supply crates (drop in from above, then wait a few mounts)
    for (const c of G.crates) {
      const [cx, cy] = toPx(c.x, c.y);
      const fall = clamp((now - c.born) / 700, 0, 1);
      const yOff = Math.round((1 - fall * fall) * -40);
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(cx - 4, cy + 4, 9, 2);
      g.drawImage(sprite("crate"), cx - 4, cy - 4 + yOff);
      if (fall >= 1) {
        const bob = Math.floor(now / 300) % 2;
        g.drawImage(sprite(CRATE_ITEMS[c.item].sprite), cx - 5, cy - 18 - bob);
        const left = c.expires - G.turn;
        drawText(g, String(left), cx + 6, cy - 4, left === 1 ? "#ff5c8d" : "#f7d54a");
      }
    }

    // FEA scan ghost
    if (G.scanGhost && G.phase === "carrying") {
      const [cx, cy] = toPx(G.scanGhost.x, G.scanGhost.y);
      const col = G.scanGhost.ok ? "#2fcf93" : "#ff5c8d";
      drawRing(g, cx, cy, 12, col, { dash: 2, gap: 2, phase: now / 100 });
      drawTag(g, `SCAN ${Math.round(G.scanGhost.max)}°C`, cx - 18, cy - 23, col);
    }
  },

  // Where the carried cell would go (under the engineer, or under the mouse)
  drawGhosts(g, now) {
    if (G.phase === "over") return;
    if (G.carrying != null && !G.armed) {
      const [sx, sy] = snapMount(Engineer.x, Engineer.y);
      const [cx, cy] = toPx(sx, sy);
      drawRing(g, cx, cy, 12, mountBlocker(sx, sy) ? "#ff5c8d" : "#7be0b8", { dash: 1, gap: 3, phase: now / 120 });
    }
    const h = G.hover;
    if (!h) return;
    const [hx, hy] = toPx(h.x, h.y);
    if (G.armed === "copper") drawRing(g, hx, hy, Math.round(COPPER_R * PPM), "#e8a070", { dash: 2, gap: 2, phase: now / 90 });
    else if (G.carrying != null) {
      const [sx, sy] = snapMount(h.x, h.y);
      const [cx, cy] = toPx(sx, sy);
      const ok = !mountBlocker(sx, sy);
      drawRing(g, cx, cy, 12, G.armed === "scan" ? "#2fcf93" : ok ? "#fdfaf2" : "#ff5c8d", { dash: 2, gap: 2, phase: now / 90 });
      if (ok && G.armed !== "scan") {
        g.globalAlpha = 0.45;
        drawCell(g, cx, cy, G.carrying, now, { badge: false });
        g.globalAlpha = 1;
      }
    }
    // Temperature probe: the FEA solution interpolated at the cursor
    const T = sampleGrid(G.displayGrid, h.x, h.y);
    drawTag(g, `${Math.round(T)}°C`, hx + 6, hy > PY0 + PH - 12 ? hy - 12 : hy + 5, "#fdfaf2");
  },

  drawHotspot(g, now) {
    if (!G.field || G.maxT - T_AMB < 1) return;
    const [hx, hy] = toPx(G.field.maxX, G.field.maxY);
    g.fillStyle = Math.floor(now / 300) % 2 === 0 ? "#fdfaf2" : "#0e0e12";
    g.fillRect(hx - 3, hy, 2, 1);
    g.fillRect(hx + 2, hy, 2, 1);
    g.fillRect(hx, hy - 3, 1, 2);
    g.fillRect(hx, hy + 2, 1, 2);
    const t = (G.maxT - T_AMB) / (G.limit - T_AMB);
    const col = t > 0.85 ? "#ff5c8d" : t > 0.6 ? "#f7a21b" : "#fdfaf2";
    if (!G.hover || Math.hypot(G.hover.x - G.field.maxX, G.hover.y - G.field.maxY) > 1.2)
      drawTag(g, `MAX ${Math.round(G.maxT)}°C`, hx + 5, clamp(hy - 13, PY0 + 1, PY0 + PH - 10), col);
  },

  // Hearts in the top-left corner of the scene
  drawHearts(g) {
    for (let i = 0; i < Engineer.maxHearts; i++) g.drawImage(sprite(i < Engineer.hearts ? "heart" : "heartOff"), 4 + i * 8, 12);
  },

  frame(now, dt) {
    const g = this.ctx;
    if (G.gridTo) {
      // Animate the temperature field from the previous solve to the new one
      const k = clamp((now - G.gridT0) / 650, 0, 1);
      if (k < 1 || this.fieldDirty) {
        const e = 1 - Math.pow(1 - k, 3);
        for (let i = 0; i < G.displayGrid.length; i++) G.displayGrid[i] = G.gridFrom[i] + (G.gridTo[i] - G.gridFrom[i]) * e;
        this.fieldDirty = k < 1;
        this.renderField();
      } else if (G.meltdown) this.renderField(true);
    }
    Game.update(dt);

    const sx = G.shake > 0.2 ? Math.round(rand(-G.shake, G.shake)) : 0;
    const sy = G.shake > 0.2 ? Math.round(rand(-G.shake, G.shake)) : 0;
    G.shake *= 0.9;
    g.setTransform(1, 0, 0, 1, sx, sy);
    this.drawBackdrop(g, now);
    this.drawPlate(g, now);
    this.drawShimmer(g, dt);
    this.drawItems(g, now);
    this.drawHotspot(g, now);
    this.drawGhosts(g, now);
    Engineer.draw(g, now);
    drawParticles(g, dt);
    this.drawHearts(g);
    if (G.flash > 0.01) {
      g.fillStyle = `rgba(255, 248, 220, ${G.flash})`;
      g.fillRect(-10, -10, CW + 20, CH + 20);
      G.flash *= 0.9;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    drawGauge(now);
    drawSuitGauge();
    Codex.probe(now);
  },
};

// ─── Backdrops for the title and story screens: a real FEAScript solution, "breathing" ───
let showcaseGrid = null;
const backdropImg = new Map();
function animateBackdropCanvas(canvas, now) {
  if (!showcaseGrid) return;
  const tick = Math.floor(now / 120);
  if (tick === canvas._lastTick) return;
  canvas._lastTick = tick;
  const g = canvas.getContext("2d");
  if (!backdropImg.has(canvas)) backdropImg.set(canvas, g.createImageData(PW, PH));
  const s = 0.8 + 0.2 * Math.sin(now / 1400);
  const grid = showcaseGrid.map((T) => T_AMB + (T - T_AMB) * s);
  renderBands(g, backdropImg.get(canvas), grid, PLATE_STENCIL, { palette: HEAT, norm: (T) => (T - T_AMB) / 240, mode: "glow" });
}

// ─── Main loop ───
let lastFrame = performance.now();
function mainLoop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  const active = (id) => $(id).classList.contains("active");
  if (active("scr-game")) Scene.frame(now, dt);
  if (active("scr-lab") && Lab.current) Lab.current.frame(now, dt);
  if (active("scr-title")) {
    drawTitleLogo($("titleLogo"), now / 1000);
    animateBackdropCanvas($("titleBg"), now);
  }
  if (active("scr-story")) animateBackdropCanvas($("storyBg"), now);
  requestAnimationFrame(mainLoop);
}
