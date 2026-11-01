/**
 * ════════════════════════════════════════════════════════════════
 *  FEM Blocks · results.js
 *  Paints FEAScript's nodal solution as pixel art: heat maps for
 *  plates, a coloured bar and a graph for bars, and a speed map
 *  with drifting tracer particles for flow
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

const HEAT_PAL = ["#2b2d6e", "#3a4fa8", "#3a7fd0", "#3bb0d8", "#5fd0c0", "#a6e08a", "#f2e05a", "#f8b13a", "#f27a24", "#e04a2b", "#b81d3f", "#fff1c9"];
const FLOW_PAL = ["#14183a", "#1d2a63", "#223f8f", "#2457b5", "#2a72cf", "#3a8fe0", "#55aaea", "#74c2f0", "#98d7f5", "#bde8f8", "#def5fb", "#ffffff"];
// Front: ice-white where the front arrives first, deep blue where it arrives last
const FRONT_PAL = ["#ffffff", "#e3f6fb", "#c4ecf6", "#a2dff0", "#80cfe8", "#62bbdd", "#4aa4cf", "#3a8bbd", "#2f72a6", "#285b8c", "#224571", "#1c3358"];
const WATER = [24, 58, 107];
const PX_FONT = '"Jersey 10", "Roboto Mono", monospace';

const flatten = (vec) => Array.from(vec, (v) => (Array.isArray(v) ? v[0] : v));

// Nodes of a structured mesh → a regular grid (values[i * nj + j]), any node order
function toGrid(X, Y, values, dim) {
  const key = (v) => Math.round(v * 1e8);
  const xs = [...new Set(X.map(key))].sort((a, b) => a - b);
  const ix = new Map(xs.map((k, i) => [k, i]));
  if (dim === "1D") {
    const grid = new Float64Array(xs.length);
    const index = new Int32Array(xs.length);
    X.forEach((x, n) => {
      grid[ix.get(key(x))] = values[n];
      index[ix.get(key(x))] = n;
    });
    return { ni: xs.length, nj: 1, grid, index, xs: xs.map((k) => k / 1e8), ys: [0] };
  }
  const ys = [...new Set(Y.map(key))].sort((a, b) => a - b);
  const iy = new Map(ys.map((k, j) => [k, j]));
  const ni = xs.length;
  const nj = ys.length;
  const grid = new Float64Array(ni * nj);
  const index = new Int32Array(ni * nj).fill(-1);
  for (let n = 0; n < X.length; n++) {
    const g = ix.get(key(X[n])) * nj + iy.get(key(Y[n]));
    grid[g] = values[n];
    index[g] = n;
  }
  return { ni, nj, grid, index, xs: xs.map((k) => k / 1e8), ys: ys.map((k) => k / 1e8) };
}

// Bilinear sample at (x, y) on a uniform grid
function sample(G, x, y, W, H) {
  const fi = Math.max(0, Math.min(G.ni - 1.000001, (x / W) * (G.ni - 1)));
  const i = Math.floor(fi);
  const a = fi - i;
  if (G.nj === 1) return G.grid[i] * (1 - a) + G.grid[Math.min(G.ni - 1, i + 1)] * a;
  const fj = Math.max(0, Math.min(G.nj - 1.000001, (y / H) * (G.nj - 1)));
  const j = Math.floor(fj);
  const b = fj - j;
  const g = G.grid;
  const nj = G.nj;
  return g[i * nj + j] * (1 - a) * (1 - b) + g[(i + 1) * nj + j] * a * (1 - b) + g[i * nj + j + 1] * (1 - a) * b + g[(i + 1) * nj + j + 1] * a * b;
}

const bandColour = (pal, t) => pal[Math.max(0, Math.min(pal.length - 1, Math.floor(t * pal.length)))];
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const fmt = (v) => {
  if (Math.abs(v) < 0.005) v = 0; // no "−0.00"
  return Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
};

const Results = {
  canvas: null,
  ctx: null,
  res: null, // the last solved case (see build())
  view: null, // geometry of the current picture, for hover
  anim: 0,
  tracers: [],

  init() {
    this.canvas = $("result");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.addEventListener("mousemove", (e) => this.hover(e));
    this.canvas.addEventListener("mouseleave", () => ($("hoverTip").className = "fb-tip"));
    window.addEventListener("resize", () => this.res && this.draw());
  },

  // FEAScript result + block description → everything the picture and the missions need
  build(spec, result, ms) {
    const S = spec.shape;
    const dim = S.dim;
    const W = dim === "1D" ? S.L : S.W;
    const H = dim === "1D" ? 0 : S.H;
    const X = Array.from(result.nodesCoordinates.nodesXCoordinates);
    const Y = dim === "1D" ? X.map(() => 0) : Array.from(result.nodesCoordinates.nodesYCoordinates);
    let values;
    let u = null;
    let v = null;
    if (spec.physics === "flow") {
      u = flatten(result.fields.u);
      v = flatten(result.fields.v);
      values = u.map((ui, i) => Math.hypot(ui, v[i]));
    } else values = flatten(result.solutionVector).slice(0, X.length); // T for heat, φ for the front
    const G = toGrid(X, Y, values, dim);
    const res = {
      spec,
      physics: spec.physics,
      dim,
      W,
      H,
      X,
      Y,
      values,
      G,
      U: u && toGrid(X, Y, u, dim),
      V: v && toGrid(X, Y, v, dim),
      ms,
      max: Math.max(...values),
      min: Math.min(...values),
      nodes: X.length,
      unknowns: spec.physics === "flow" ? flatten(result.solutionVector).length : X.length,
      elements: dim === "1D" ? S.nx : S.nx * S.ny,
      order: spec.physics === "flow" ? "quadratic" : S.order,
    };
    res.at = (x, y) => sample(G, x, y, W, H);
    let last = 0;
    values.forEach((v, i) => v > values[last] && (last = i));
    res.last = { x: X[last], y: Y[last], v: values[last] }; // where the front arrives last
    res.probes = spec.probes.map((p) => ({ x: p.x, y: p.y, v: res.at(p.x, p.y) }));
    return res;
  },

  show(res) {
    this.res = res;
    this.tracers = [];
    $("resultEmpty").hidden = true;
    this.canvas.hidden = false;
    this.draw();
    this.legend();
    cancelAnimationFrame(this.anim);
    if (res.physics === "flow") this.animate();
    if (res.physics === "front") this.animateFront();
  },

  clear() {
    this.res = null;
    cancelAnimationFrame(this.anim);
    this.canvas.hidden = true;
    $("resultEmpty").hidden = false;
    $("legend").innerHTML = "";
    $("summary").innerHTML = "";
  },

  // ─── Layout: a low-resolution field image, drawn at an integer scale ───
  layout() {
    const r = this.res;
    const avail = Math.max(240, $("canvasWrap").clientWidth - 8);
    const m = r.dim === "1D" ? 30 : 20; // margin for edge strips and labels (low-res px)
    let fw;
    let fh;
    if (r.dim === "1D") {
      fw = 150;
      fh = 12;
    } else {
      const aspect = r.H / r.W;
      fw = 150;
      fh = Math.round(fw * aspect);
      if (fh > 110) {
        fh = 110;
        fw = Math.max(20, Math.round(fh / aspect));
      }
      fh = Math.max(8, fh);
    }
    const totalW = fw + 2 * m;
    const totalH = r.dim === "1D" ? fh + 2 * m + 78 : fh + 2 * m;
    const s = Math.max(2, Math.floor(avail / totalW));
    return { m, fw, fh, s, totalW, totalH };
  },

  draw() {
    const r = this.res;
    const L = this.layout();
    const { m, fw, fh, s } = L;
    const c = this.canvas;
    c.width = L.totalW * s;
    c.height = L.totalH * s;
    c.style.width = `${L.totalW * s}px`;
    c.style.height = `${L.totalH * s}px`;
    this.ctx.imageSmoothingEnabled = false;
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    this.dark = dark;
    const x0 = m * s;
    const y0 = m * s;
    this.view = { x0, y0, w: fw * s, h: fh * s, s, m, fw, fh };

    // The value at every low-res pixel, sampled once
    this.cells = new Float64Array(fw * fh);
    for (let py = 0; py < fh; py++)
      for (let px = 0; px < fw; px++) {
        const x = ((px + 0.5) / fw) * r.W;
        const y = r.dim === "1D" ? 0 : (1 - (py + 0.5) / fh) * r.H;
        this.cells[py * fw + px] = r.at(x, y);
      }

    // Everything drawn on top of the field lives on its own layer
    const ov = document.createElement("canvas");
    ov.width = c.width;
    ov.height = c.height;
    const g = ov.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#1d1d1d";
    g.fillRect(x0 - s, y0 - s, fw * s + 2 * s, s);
    g.fillRect(x0 - s, y0 + fh * s, fw * s + 2 * s, s);
    g.fillRect(x0 - s, y0 - s, s, fh * s + 2 * s);
    g.fillRect(x0 + fw * s, y0 - s, s, fh * s + 2 * s);
    if (r.spec.show?.mesh) this.drawMesh(g);
    if (r.physics === "heat") this.drawEdges(g, dark);
    else if (r.physics === "flow") this.drawWalls(g, dark);
    else this.drawFronts(g, dark);
    if (r.physics === "flow") this.drawArrows(g);
    if (r.dim === "1D") this.drawGraph(g, dark);
    if (r.physics === "front") this.drawTarget(g);
    this.drawProbes(g);
    this.overlay = ov;

    this.paint(Infinity);
    this.base = this.ctx.getImageData(0, 0, c.width, c.height);
  },

  // Background, field and overlay. For the front, t is the time shown: later points are still water
  paint(t) {
    const r = this.res;
    const g = this.ctx;
    const { x0, y0, fw, fh, s } = this.view;
    g.fillStyle = this.dark ? "#1b1b1f" : "#fdfaf2";
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const pal = r.physics === "flow" ? FLOW_PAL : r.physics === "front" ? FRONT_PAL : HEAT_PAL;
    const span = r.max - r.min || 1;
    const img = new ImageData(fw, fh);
    for (let k = 0; k < fw * fh; k++) {
      const val = this.cells[k];
      let rgb;
      if (val > t) rgb = WATER; // not reached yet
      else if (t - val < span * 0.025) rgb = [255, 255, 255]; // the front itself
      else rgb = hexRgb(bandColour(pal, (val - r.min) / span));
      img.data.set([rgb[0], rgb[1], rgb[2], 255], k * 4);
    }
    const off = document.createElement("canvas");
    off.width = fw;
    off.height = fh;
    off.getContext("2d").putImageData(img, 0, 0);
    g.drawImage(off, x0, y0, fw * s, fh * s);
    g.drawImage(this.overlay, 0, 0);
  },

  // Element edges (thin lines) and nodes (dots)
  drawMesh(g) {
    const r = this.res;
    const { x0, y0, w, h, s } = this.view;
    const S = r.spec.shape;
    g.fillStyle = "rgba(20, 20, 24, 0.75)";
    for (let e = 0; e <= S.nx; e++) g.fillRect(Math.round(x0 + (e / S.nx) * w), y0, 1, h);
    if (r.dim === "2D") for (let e = 0; e <= S.ny; e++) g.fillRect(x0, Math.round(y0 + (e / S.ny) * h), w, 1);
    g.fillStyle = "#ffffff";
    const d = Math.max(2, Math.round(s * 0.8));
    for (let n = 0; n < r.X.length; n++) {
      const px = x0 + (r.X[n] / r.W) * w;
      const py = r.dim === "1D" ? y0 + h / 2 : y0 + (1 - r.Y[n] / r.H) * h;
      g.fillRect(Math.round(px - d / 2), Math.round(py - d / 2), d, d);
    }
  },

  // What happens at each edge, drawn as a strip outside the shape
  drawEdges(g, dark) {
    const r = this.res;
    const { x0, y0, w, h, s } = this.view;
    const t = 4 * s; // strip thickness
    const gap = 2 * s;
    const sides = r.dim === "1D" ? ["left", "right"] : ["bottom", "left", "top", "right"];
    for (const e of sides) {
      const c = r.spec.edges[e] || { kind: "insulate", auto: true };
      let rect;
      if (e === "bottom") rect = [x0, y0 + h + gap, w, t];
      if (e === "top") rect = [x0, y0 - gap - t, w, t];
      if (e === "left") rect = [x0 - gap - t, y0, t, h];
      if (e === "right") rect = [x0 + w + gap, y0, t, h];
      const [rx, ry, rw, rh] = rect;
      if (c.kind === "temp") {
        g.fillStyle = bandColour(HEAT_PAL, (c.T - r.min) / (r.max - r.min || 1));
        g.fillRect(rx, ry, rw, rh);
      } else if (c.kind === "air") {
        g.fillStyle = dark ? "#2a3a4a" : "#d8eef8";
        g.fillRect(rx, ry, rw, rh);
        g.fillStyle = "#3bb0d8";
        const vertical = rh > rw;
        for (let k = 0; k < (vertical ? rh : rw); k += 6 * s)
          vertical ? g.fillRect(rx + s, ry + k, 2 * s, 3 * s) : g.fillRect(rx + k, ry + s, 3 * s, 2 * s);
      } else {
        g.fillStyle = c.auto ? (dark ? "#3a3326" : "#efe0bd") : dark ? "#6b4b2a" : "#d8a868";
        g.fillRect(rx, ry, rw, rh);
        g.fillStyle = c.auto ? (dark ? "#4d4433" : "#e0cc9c") : "#b07a3c";
        for (let k = 0; k < Math.max(rw, rh); k += 3 * s) g.fillRect(rh > rw ? rx : rx + k, rh > rw ? ry + k : ry, s, s);
      }
      // Label
      const txt = c.kind === "temp" ? `${fmt(c.T)} °C` : c.kind === "air" ? `air ${fmt(c.Tair)} °C` : c.auto ? "" : "blanket";
      if (!txt) continue;
      g.font = `${Math.round(7.4 * s)}px ${PX_FONT}`;
      g.fillStyle = dark ? "#e6e3da" : "#333333";
      g.textBaseline = "middle";
      if (e === "bottom" || e === "top") {
        g.textAlign = "center";
        g.fillText(txt, rx + rw / 2, e === "bottom" ? ry + rh + 5 * s : ry - 5 * s);
      } else {
        g.save();
        g.translate(e === "left" ? rx - 5 * s : rx + rw + 5 * s, ry + rh / 2);
        if (r.dim === "2D") g.rotate(e === "left" ? -Math.PI / 2 : Math.PI / 2);
        g.textAlign = "center";
        g.fillText(txt, 0, r.dim === "1D" ? -9 * s : 0);
        g.restore();
      }
    }
  },

  drawWalls(g, dark) {
    const r = this.res;
    const { x0, y0, w, h, s } = this.view;
    const t = 4 * s;
    const gap = 2 * s;
    for (const e of ["bottom", "left", "top", "right"]) {
      const wl = r.spec.walls[e];
      const slide = wl && wl.kind === "slide" && wl.U !== 0;
      let rect;
      if (e === "bottom") rect = [x0, y0 + h + gap, w, t];
      if (e === "top") rect = [x0, y0 - gap - t, w, t];
      if (e === "left") rect = [x0 - gap - t, y0, t, h];
      if (e === "right") rect = [x0 + w + gap, y0, t, h];
      const [rx, ry, rw, rh] = rect;
      g.fillStyle = slide ? "#0072b5" : dark ? "#55555c" : "#8c8a82";
      g.fillRect(rx, ry, rw, rh);
      if (slide) {
        // Belt chevrons pointing the way it moves
        g.fillStyle = "#ffffff";
        const vertical = rh > rw;
        const dir = Math.sign(wl.U);
        for (let k = 3 * s; k < (vertical ? rh : rw) - 3 * s; k += 8 * s) {
          if (vertical) {
            const cy = dir > 0 ? ry + rh - k : ry + k;
            g.fillRect(rx + s, cy, 2 * s, s);
            g.fillRect(rx, cy + dir * s, s, s);
            g.fillRect(rx + 3 * s, cy + dir * s, s, s);
          } else {
            const cx = dir > 0 ? rx + k : rx + rw - k;
            g.fillRect(cx, ry + s, s, 2 * s);
            g.fillRect(cx - dir * s, ry, s, s);
            g.fillRect(cx - dir * s, ry + 3 * s, s, s);
          }
        }
      }
    }
  },

  // Front: ice on the edges where it starts, plain walls where it slides
  drawFronts(g, dark) {
    const r = this.res;
    const { x0, y0, w, h, s } = this.view;
    const t = 4 * s;
    const gap = 2 * s;
    const sides = r.dim === "1D" ? ["left", "right"] : ["bottom", "left", "top", "right"];
    for (const e of sides) {
      const start = r.spec.fronts[e]?.kind === "start";
      let rect;
      if (e === "bottom") rect = [x0, y0 + h + gap, w, t];
      if (e === "top") rect = [x0, y0 - gap - t, w, t];
      if (e === "left") rect = [x0 - gap - t, y0, t, h];
      if (e === "right") rect = [x0 + w + gap, y0, t, h];
      const [rx, ry, rw, rh] = rect;
      g.fillStyle = start ? "#bfeaf6" : dark ? "#55555c" : "#c9c6bd";
      g.fillRect(rx, ry, rw, rh);
      if (start) {
        g.fillStyle = "#ffffff";
        for (let k = s; k < Math.max(rw, rh) - s; k += 5 * s) rh > rw ? g.fillRect(rx + s, ry + k, 2 * s, 2 * s) : g.fillRect(rx + k, ry + s, 2 * s, 2 * s);
        g.font = `${Math.round(7.4 * s)}px ${PX_FONT}`;
        g.fillStyle = dark ? "#e6e3da" : "#333333";
        g.textAlign = "center";
        g.textBaseline = "middle";
        if (e === "bottom" || e === "top") g.fillText("starts here", rx + rw / 2, e === "bottom" ? ry + rh + 6 * s : ry - 6 * s);
        else {
          g.save();
          g.translate(e === "left" ? rx - 6 * s : rx + rw + 6 * s, ry + rh / 2);
          if (r.dim === "2D") g.rotate(e === "left" ? -Math.PI / 2 : Math.PI / 2);
          g.fillText("starts here", 0, r.dim === "1D" ? -10 * s : 0);
          g.restore();
        }
      }
    }
  },

  // A mission's target circle, and a marker where the front arrives last
  drawTarget(g) {
    const r = this.res;
    const { x0, y0, w, h, s } = this.view;
    const P = (x, y) => [x0 + (x / r.W) * w, r.dim === "1D" ? y0 + h / 2 : y0 + (1 - y / r.H) * h];
    if (this.target && r.dim === "2D") {
      const [cx, cy] = P(this.target.x, this.target.y);
      const R = (this.target.r / r.W) * w;
      g.fillStyle = "#c8003f";
      for (let a = 0; a < 48; a += 2) {
        const ang = (a / 48) * Math.PI * 2;
        g.fillRect(Math.round(cx + R * Math.cos(ang) - s), Math.round(cy + R * Math.sin(ang) - s), 2 * s, 2 * s);
      }
    }
    const [lx, ly] = P(r.last.x, r.last.y);
    g.fillStyle = "#1d1d1d";
    g.fillRect(Math.round(lx - 3 * s), Math.round(ly - s), 6 * s, 2 * s);
    g.fillRect(Math.round(lx - s), Math.round(ly - 3 * s), 2 * s, 6 * s);
    g.fillStyle = "#ffdf3a";
    g.fillRect(Math.round(lx - 2 * s), Math.round(ly - s / 2), 4 * s, s);
    g.fillRect(Math.round(lx - s / 2), Math.round(ly - 2 * s), s, 4 * s);
    g.font = `${Math.round(7.4 * s)}px ${PX_FONT}`;
    const txt = "last";
    const tw = g.measureText(txt).width + 4 * s;
    let bx = lx + 4 * s;
    if (bx + tw > x0 + w) bx = lx - 4 * s - tw;
    const by = Math.min(Math.max(y0, ly - 4 * s), y0 + h - 8 * s);
    g.fillStyle = "#1d1d1d";
    g.fillRect(bx, by, tw, 8 * s);
    g.fillStyle = "#ffdf3a";
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(txt, bx + 2 * s, by + 4 * s);
  },

  // Velocity arrows on a coarse grid
  drawArrows(g) {
    const r = this.res;
    const { x0, y0, w, h, s } = this.view;
    const nxA = 9;
    const nyA = Math.max(3, Math.round((nxA * r.H) / r.W));
    const umax = r.max || 1;
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = Math.max(1, s * 0.6);
    for (let i = 0; i < nxA; i++)
      for (let j = 0; j < nyA; j++) {
        const x = ((i + 0.5) / nxA) * r.W;
        const y = ((j + 0.5) / nyA) * r.H;
        const ux = sample(r.U, x, y, r.W, r.H);
        const uy = sample(r.V, x, y, r.W, r.H);
        const sp = Math.hypot(ux, uy);
        if (sp < umax * 0.02) continue;
        const len = (4 + 6 * Math.min(1, sp / umax)) * s;
        const px = x0 + (x / r.W) * w;
        const py = y0 + (1 - y / r.H) * h;
        const dx = (ux / sp) * len;
        const dy = (-uy / sp) * len;
        g.beginPath();
        g.moveTo(px - dx / 2, py - dy / 2);
        g.lineTo(px + dx / 2, py + dy / 2);
        g.stroke();
        g.fillRect(Math.round(px + dx / 2 - s), Math.round(py + dy / 2 - s), 2 * s, 2 * s);
      }
  },

  // Bar: a T(x) graph under the coloured bar
  drawGraph(g, dark) {
    const r = this.res;
    const { x0, y0, w, h, s } = this.view;
    const gy0 = y0 + h + 22 * s;
    const gh = 56 * s;
    const lo = Math.min(r.min, 0);
    const hi = r.max === lo ? lo + 1 : r.max;
    const Y = (v) => gy0 + gh - ((v - lo) / (hi - lo)) * gh;
    const ink = dark ? "#e6e3da" : "#333333";
    g.fillStyle = dark ? "#55555c" : "#c9c6bd";
    for (let k = 0; k <= 4; k++) g.fillRect(x0, Math.round(gy0 + (k / 4) * gh), w, 1);
    g.fillStyle = ink;
    g.fillRect(x0, gy0, s, gh + s);
    g.fillRect(x0, gy0 + gh, w, s);
    // Line through the nodes, then the nodes themselves
    const pts = r.G.xs.map((x, i) => [x0 + (x / r.W) * w, Y(r.G.grid[i])]);
    g.strokeStyle = "#c8003f";
    g.lineWidth = Math.max(2, s);
    g.beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.stroke();
    pts.forEach(([px, py], i) => {
      g.fillStyle = "#1d1d1d";
      g.fillRect(Math.round(px - 2 * s), Math.round(py - 2 * s), 4 * s, 4 * s);
      g.fillStyle = bandColour(r.physics === "front" ? FRONT_PAL : HEAT_PAL, (r.G.grid[i] - r.min) / (r.max - r.min || 1));
      g.fillRect(Math.round(px - s), Math.round(py - s), 2 * s, 2 * s);
    });
    g.font = `${Math.round(6.8 * s)}px ${PX_FONT}`;
    g.fillStyle = ink;
    g.textBaseline = "middle";
    g.textAlign = "right";
    const unit = r.physics === "front" ? "" : " °C";
    g.fillText(`${fmt(hi)}${unit}`, x0 - 2 * s, gy0);
    g.fillText(`${fmt(lo)}${unit}`, x0 - 2 * s, gy0 + gh);
    g.textAlign = "center";
    g.fillText("x = 0", x0, gy0 + gh + 6 * s);
    g.fillText(`x = ${fmt(r.W)} m`, x0 + w, gy0 + gh + 6 * s);
    g.fillText(`${r.physics === "front" ? "arrival time" : "temperature"} along the bar (each square is a node)`, x0 + w / 2, gy0 - 6 * s);
  },

  drawProbes(g) {
    const r = this.res;
    const { x0, y0, w, h, s } = this.view;
    for (const p of r.probes) {
      const px = Math.round(x0 + (p.x / r.W) * w);
      const py = Math.round(r.dim === "1D" ? y0 + h / 2 : y0 + (1 - p.y / r.H) * h);
      g.fillStyle = "#1d1d1d";
      g.fillRect(px - 2 * s, py - 2 * s, 4 * s, 4 * s);
      g.fillStyle = "#ffffff";
      g.fillRect(px - s, py - s, 2 * s, 2 * s);
      const txt = r.physics === "flow" ? `speed ${fmt(p.v)}` : r.physics === "front" ? `time ${fmt(p.v)}` : `${fmt(p.v)} °C`;
      g.font = `${Math.round(7.4 * s)}px ${PX_FONT}`;
      const tw = g.measureText(txt).width + 4 * s;
      let bx = px + 3 * s;
      if (bx + tw > x0 + w) bx = px - 3 * s - tw;
      const by = Math.max(y0, py - 10 * s);
      g.fillStyle = "#1d1d1d";
      g.fillRect(bx, by, tw, 8 * s);
      g.fillStyle = "#ffffff";
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.fillText(txt, bx + 2 * s, by + 4 * s);
    }
  },

  // Tracer particles carried by the velocity field
  animate() {
    const r = this.res;
    const { x0, y0, w, h, s } = this.view;
    const g = this.ctx;
    if (!this.tracers.length)
      for (let k = 0; k < 160; k++) this.tracers.push({ x: Math.random() * r.W, y: Math.random() * r.H, age: Math.random() * 200 });
    const step = () => {
      if (this.res !== r) return;
      g.putImageData(this.base, 0, 0);
      const dt = (0.02 * r.W) / (r.max || 1);
      g.fillStyle = "#fff1c9";
      for (const p of this.tracers) {
        const ux = sample(r.U, p.x, p.y, r.W, r.H);
        const uy = sample(r.V, p.x, p.y, r.W, r.H);
        p.x += ux * dt;
        p.y += uy * dt;
        p.age++;
        if (p.x < 0 || p.x > r.W || p.y < 0 || p.y > r.H || p.age > 260) {
          p.x = Math.random() * r.W;
          p.y = Math.random() * r.H;
          p.age = 0;
        }
        g.fillRect(Math.round(x0 + (p.x / r.W) * w - s / 2), Math.round(y0 + (1 - p.y / r.H) * h - s / 2), s, s);
      }
      this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  },

  // The front grows from where it starts until the last point is reached, then starts over
  animateFront() {
    const r = this.res;
    const grow = 3200;
    const hold = 1600;
    const t0 = performance.now();
    const step = (now) => {
      if (this.res !== r) return;
      const k = ((now - t0) % (grow + hold)) / grow;
      this.paint(r.min + Math.min(1, k) * (r.max - r.min) * 1.001);
      this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  },

  hover(e) {
    const r = this.res;
    if (!r || !this.view) return;
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.canvas.width / rect.width;
    const cx = (e.clientX - rect.left) * scale;
    const cy = (e.clientY - rect.top) * scale;
    const { x0, y0, w, h } = this.view;
    const tip = $("hoverTip");
    const x = ((cx - x0) / w) * r.W;
    const y = r.dim === "1D" ? 0 : (1 - (cy - y0) / h) * r.H;
    const inside = cx >= x0 && cx <= x0 + w && (r.dim === "1D" ? cy >= y0 - 4 && cy <= y0 + h + 4 : cy >= y0 && cy <= y0 + h);
    if (!inside) {
      tip.className = "fb-tip";
      return;
    }
    const val = r.at(x, y);
    tip.innerHTML =
      r.physics === "flow"
        ? `x ${x.toFixed(2)}, y ${y.toFixed(2)} m<br><b>speed ${fmt(val)}</b>`
        : r.physics === "front"
          ? `x ${x.toFixed(2)}${r.dim === "2D" ? `, y ${y.toFixed(2)}` : ""} m<br><b>arrival time φ = ${fmt(val)}</b>`
          : `x ${x.toFixed(2)}${r.dim === "2D" ? `, y ${y.toFixed(2)}` : ""} m<br><b>T = ${fmt(val)} °C</b>`;
    tip.style.left = `${e.clientX - rect.left + 14}px`;
    tip.style.top = `${e.clientY - rect.top + 10}px`;
    tip.className = "fb-tip on";
  },

  legend() {
    const r = this.res;
    if (r.physics === "front") {
      $("legend").innerHTML = `<span>first ${fmt(r.min)}</span>
        <span class="fb-legend-bar">${FRONT_PAL.map((c) => `<i style="background:${c}"></i>`).join("")}</span>
        <span>${fmt(r.max)} last</span>`;
      const where = r.dim === "1D" ? `x = ${fmt(r.last.x)}` : `(${fmt(r.last.x)}, ${fmt(r.last.y)})`;
      $("summary").innerHTML = `The front reaches <b>${where}</b> last, at time <b>φ = ${fmt(r.last.v)}</b> · <b>${r.unknowns}</b> unknowns solved in <b>${r.ms.toFixed(0)} ms</b>`;
      return;
    }
    const pal = r.physics === "flow" ? FLOW_PAL : HEAT_PAL;
    const unit = r.physics === "flow" ? "" : " °C";
    $("legend").innerHTML = `<span>${r.physics === "flow" ? "slow" : "cold"} ${fmt(r.min)}${unit}</span>
      <span class="fb-legend-bar">${pal.map((c) => `<i style="background:${c}"></i>`).join("")}</span>
      <span>${fmt(r.max)}${unit} ${r.physics === "flow" ? "fast" : "hot"}</span>`;
    const what = r.physics === "flow" ? "Fastest" : "Hottest";
    const what2 = r.physics === "flow" ? "slowest" : "coolest";
    $("summary").innerHTML = `${what} <b>${fmt(r.max)}${unit}</b> · ${what2} <b>${fmt(r.min)}${unit}</b> · <b>${r.unknowns}</b> unknowns solved in <b>${r.ms.toFixed(0)} ms</b>`;
  },
};

// ─── "How it's solved": the four steps of the finite element method, with this run's numbers ───
function femExplainHtml(res) {
  if (!res) return `<p class="fb-pane-note">Run a simulation, and this part shows how FEAScript solved it, step by step.</p>`;
  const S = res.spec.shape;
  const curvy = res.order === "quadratic";
  const pieces = res.dim === "1D" ? `${S.nx} pieces` : `${S.nx} × ${S.ny} = ${S.nx * S.ny} pieces`;
  const flow = res.physics === "flow";
  const front = res.physics === "front";
  return `
    <ol class="fb-steps">
      <li><b>Cut.</b> Your ${res.dim === "1D" ? "bar" : "plate"} was cut into ${pieces} called <b>elements</b>.
        <canvas class="px fb-mini" id="miniMesh"></canvas></li>
      <li><b>Nodes.</b> The ${curvy ? "corners and middles" : "corners"} of the pieces are <b>${res.nodes} nodes</b> (the red dots).
        ${flow ? "Each node has a speed left-right and a speed up-down, and the corner nodes also have a pressure: that's" : front ? "Each one has one unknown arrival time φ: that's" : "Each one has one unknown temperature: that's"}
        <b>${res.unknowns} unknowns</b>. Inside a piece, the answer is drawn as a ${curvy ? "curvy" : "straight"} shape between its nodes.</li>
      <li><b>Equations.</b> FEAScript turns ${flow ? "the flow equations" : front ? "|∇φ| = 1" : "−∇·(k∇T) = Q"} into one equation per unknown and stacks them into
        one giant table, <b>K · ${flow ? "u" : front ? "Δφ" : "T"} = F</b>. A piece only touches its neighbours, so most of K is zeros.
        ${front ? "The eikonal equation is <b>nonlinear</b>, so one table isn't enough: FEAScript starts from a smoother, easier version and switches the real equation on in 5 steps, re-building and solving the table a few times in each (Newton-Raphson)." : ""}
        ${flow ? "" : `Here is your K: every dark pixel is a number that isn't zero.<canvas class="px fb-mini" id="miniK"></canvas>`}</li>
      <li><b>Solve.</b> ${res.spec.solver?.method === "frontal" ? "The frontal solver" : "LU"} solved all ${res.unknowns} equations at once in
        <b>${res.ms.toFixed(0)} ms</b>. Then the picture is painted from the node values.</li>
    </ol>`;
}

// Mini drawings for the "How it's solved" tab
function drawFemMinis(res) {
  if (!res) return;
  const S = res.spec.shape;
  const mesh = $("miniMesh");
  if (mesh) {
    const W = 160;
    const H = res.dim === "1D" ? 16 : Math.max(16, Math.min(90, Math.round((W * res.H) / res.W)));
    mesh.width = W + 8;
    mesh.height = H + 8;
    const g = mesh.getContext("2d");
    g.fillStyle = "#f6efd9";
    g.fillRect(0, 0, mesh.width, mesh.height);
    g.fillStyle = "#c9c6bd";
    g.fillRect(4, 4, W, H);
    g.fillStyle = "#1d1d1d";
    for (let e = 0; e <= S.nx; e++) g.fillRect(4 + Math.round((e / S.nx) * (W - 1)), 4, 1, H);
    if (res.dim === "2D") for (let e = 0; e <= S.ny; e++) g.fillRect(4, 4 + Math.round((e / S.ny) * (H - 1)), W, 1);
    else {
      g.fillRect(4, 4, W, 1);
      g.fillRect(4, 3 + H, W, 1);
    }
    g.fillStyle = "#c8003f";
    for (let n = 0; n < res.X.length; n++) {
      const px = 4 + Math.round((res.X[n] / res.W) * (W - 1));
      const py = res.dim === "1D" ? 4 + H / 2 : 4 + Math.round((1 - res.Y[n] / res.H) * (H - 1));
      g.fillRect(px - 1, py - 1, 2, 2);
    }
  }
  const kc = $("miniK");
  if (kc) {
    // Sparsity of K: nodes of the same element are coupled
    const N = res.nodes;
    const size = Math.min(N, 300);
    const f = size / N;
    kc.width = size;
    kc.height = size;
    const g = kc.getContext("2d");
    g.fillStyle = "#fdfaf2";
    g.fillRect(0, 0, size, size);
    g.fillStyle = "#1d1d1d";
    const p = res.order === "quadratic" ? 2 : 1;
    const G = res.G;
    const elems = [];
    if (res.dim === "1D") for (let e = 0; e < S.nx; e++) elems.push(Array.from({ length: p + 1 }, (_, a) => G.index[e * p + a]));
    else
      for (let ex = 0; ex < S.nx; ex++)
        for (let ey = 0; ey < S.ny; ey++) {
          const list = [];
          for (let a = 0; a <= p; a++) for (let b = 0; b <= p; b++) list.push(G.index[(ex * p + a) * G.nj + ey * p + b]);
          elems.push(list);
        }
    const dot = Math.max(1, Math.ceil(f));
    for (const list of elems) for (const i of list) for (const j of list) if (i >= 0 && j >= 0) g.fillRect(Math.floor(i * f), Math.floor(j * f), dot, dot);
  }
}
