/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · field.js
 *  Turns FEAScript nodal solutions into pixel art: banded filled
 *  contours with isolines, or a Bayer-dithered "glow"
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

// Precomputed bilinear stencil from an (ni × nj) nodal grid to a (pw × ph) pixel image
function makeStencil(ni, nj, maxX, maxY, pw, ph) {
  const n = pw * ph;
  const idx = new Int32Array(n);
  const wa = new Float32Array(n);
  const wb = new Float32Array(n);
  for (let v = 0; v < ph; v++)
    for (let u = 0; u < pw; u++) {
      const x = ((u + 0.5) / pw) * maxX;
      const y = maxY - ((v + 0.5) / ph) * maxY;
      const fi = (x / maxX) * (ni - 1);
      const fj = (y / maxY) * (nj - 1);
      const i = Math.min(ni - 2, Math.floor(fi));
      const j = Math.min(nj - 2, Math.floor(fj));
      const p = v * pw + u;
      idx[p] = i * nj + j;
      wa[p] = fi - i;
      wb[p] = fj - j;
    }
  return { idx, wa, wb, nj, pw, ph };
}

function stencilSample(grid, st, p) {
  const k = st.idx[p];
  const a = st.wa[p];
  const b = st.wb[p];
  const nj = st.nj;
  return grid[k] * (1 - a) * (1 - b) + grid[k + nj] * a * (1 - b) + grid[k + 1] * (1 - a) * b + grid[k + nj + 1] * a * b;
}

const PLATE_STENCIL = makeStencil(NI, NJ, PLATE.maxX, PLATE.maxY, PW, PH);

// Pseudo-random grain so cold metal reads as brushed alloy
const GRAIN = (() => {
  const a = new Uint8Array(PW * PH);
  let s = 1234567;
  for (let p = 0; p < a.length; p++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    a[p] = (s >> 16) % 9 === 0 || ((p % PW) * 7 + Math.floor(p / PW) * 13) % 23 === 0 ? 1 : 0;
  }
  return a;
})();

/**
 * Render a nodal field into ImageData.
 *  norm(value) → 0..1 (≥ 1 means "past the limit", drawn with the last palette colour)
 *  mode "bands": filled contours with dark isolines; "glow": ordered dithering between bands
 */
function renderBands(ctx2d, img, grid, st, { palette, norm, mode = "bands", grain = true, flicker = false }) {
  const { pw, ph } = st;
  const d = img.data;
  const bands = renderBands.buf && renderBands.buf.length === pw * ph ? renderBands.buf : (renderBands.buf = new Uint8Array(pw * ph));
  for (let p = 0; p < pw * ph; p++) {
    const t = norm(stencilSample(grid, st, p));
    let band;
    if (t >= 1) band = NBANDS;
    else if (t <= 0) band = 0;
    else if (mode === "glow") {
      const lv = t * NBANDS;
      band = Math.floor(lv);
      const u = p % pw;
      const v = (p / pw) | 0;
      if (lv - band > BAYER[(v & 3) * 4 + (u & 3)]) band++;
      band = Math.min(NBANDS - 1, band);
    } else band = Math.floor(t * NBANDS);
    bands[p] = band;
  }
  const tick = Math.floor(performance.now() / 90);
  for (let p = 0; p < pw * ph; p++) {
    const band = bands[p];
    let [r, g, b] = palette[band];
    if (band === NBANDS && flicker && (p + tick) % 3 === 0) [r, g, b] = palette[10];
    if (grain && band <= 1 && pw === PW && GRAIN[p]) {
      r += 7;
      g += 8;
      b += 12;
    }
    if (mode === "bands") {
      const u = p % pw;
      const v = (p / pw) | 0;
      const edge = (u < pw - 1 && bands[p + 1] !== band) || (v < ph - 1 && bands[p + pw] !== band);
      if (edge && band > 0) {
        r *= 0.62;
        g *= 0.62;
        b *= 0.62;
      }
    }
    const o = p * 4;
    d[o] = r;
    d[o + 1] = g;
    d[o + 2] = b;
    d[o + 3] = 255;
  }
  ctx2d.putImageData(img, 0, 0);
}
