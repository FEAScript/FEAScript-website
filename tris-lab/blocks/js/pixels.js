/**
 * ════════════════════════════════════════════════════════════════
 *  FEM Blocks · pixels.js
 *  Pixel art drawn from character maps: block icons (as SVG data
 *  URIs, so Blockly can show them) and Tri, the mascot robot
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

const PIX = {
  ".": null,
  K: "#1d1d1d", // outline
  W: "#ffffff",
  w: "#e8e3d4",
  G: "#d4aa00", // FEAScript gold
  Y: "#f6d54a",
  D: "#8f7200",
  R: "#c8003f", // heat
  r: "#ff5c8d",
  O: "#f2731d",
  o: "#ffb347",
  B: "#0086d4", // flow
  b: "#7fd0ff",
  N: "#00a86b", // structure
  n: "#7be0b5",
  P: "#7a4fd1",
  p: "#c3a8ff",
  S: "#8c8a82", // steel
  s: "#c9c6bd",
  T: "#b07a3c", // wood
  t: "#e0b27a",
  C: "#c87533", // copper
  c: "#f0a868",
};

// ─── Block icons (12 × 12) ───
const ICONS = {
  sim: [
    "....KKKK....",
    "....KwwK....",
    "....KwwK....",
    "....KwwK....",
    "...KwwwwK...",
    "..KwwwwwwK..",
    "..KbbbbbbK..",
    ".KbBbbbBbbK.",
    ".KbbbBbbbbK.",
    ".KbBbbbbBbK.",
    "..KKKKKKKK..",
    "............",
  ],
  bar: [
    "............",
    "............",
    "............",
    "............",
    "KKKKKKKKKKKK",
    "KsWsssssssSK",
    "KsssssssssSK",
    "KSSSSSSSSSSK",
    "KKKKKKKKKKKK",
    "K..K..K..K.K",
    "............",
    "............",
  ],
  plate: [
    "KKKKKKKKKKKK",
    "KsWsKsssKssK",
    "KsssKsssKssK",
    "KKKKKKKKKKKK",
    "KsssKsssKssK",
    "KsssKsssKssK",
    "KKKKKKKKKKKK",
    "KsssKsssKssK",
    "KSSSKSSSKSSK",
    "KKKKKKKKKKKK",
    "............",
    "............",
  ],
  material: [
    "............",
    "KKKKKKKKKKKK",
    "KccCKccccCcK",
    "KCCCKCCCCCCK",
    "KKKKKKKKKKKK",
    "KcCKcccCKccK",
    "KCCKCCCCKCCK",
    "KKKKKKKKKKKK",
    "KccCKccccCcK",
    "KCCCKCCCCCCK",
    "KKKKKKKKKKKK",
    "............",
  ],
  heater: [
    ".....K......",
    "....KoK.....",
    "....KoK..K..",
    "...KooOK.KK.",
    "..KoOoOK.KoK",
    "..KOoYOOKKoK",
    ".KOoYYYOOoOK",
    ".KORYWYYOOOK",
    ".KRRYYYYORRK",
    "..KRRRRRRRK.",
    "...KKKKKKK..",
    "............",
  ],
  hot: [
    "....KKK.....",
    "...KWWWK....",
    "...KWrWK....",
    "...KWrWK....",
    "...KWrWK....",
    "...KWRWK....",
    "...KWRWK....",
    "..KRRRRRK...",
    ".KRRrRRRRK..",
    ".KRRRRRRRK..",
    "..KRRRRRK...",
    "...KKKKK....",
  ],
  cold: [
    "....KKK.....",
    "...KWWWK....",
    "...KWWWK....",
    "...KWWWK....",
    "...KWbWK....",
    "...KWBWK....",
    "...KWBWK....",
    "..KBBBBBK...",
    ".KBBbBBBBK..",
    ".KBBBBBBBK..",
    "..KBBBBBK...",
    "...KKKKK....",
  ],
  air: [
    "............",
    ".KKKKKKKK...",
    "........bK..",
    "........bK..",
    ".KKKKKKKK...",
    "............",
    ".KKKKKKKKKK.",
    "..........bK",
    ".....KK...bK",
    "......KKKKK.",
    ".KKKKK......",
    "............",
  ],
  insulate: [
    "............",
    ".KKKKKKKKKK.",
    ".KtTtTtTtTK.",
    ".KTtTtTtTtK.",
    ".KtTtTtTtTK.",
    ".KTtTtTtTtK.",
    ".KtTtTtTtTK.",
    ".KTtTtTtTtK.",
    ".KtTtTtTtTK.",
    ".KKKKKKKKKK.",
    "............",
    "............",
  ],
  solve: [
    "...K.KK.K...",
    "..KGKGGKGK..",
    "...KGGGGK...",
    ".KKGGKKGGKK.",
    "KGGGK..KGGGK",
    ".KGGK..KGGK.",
    "KGGGK..KGGGK",
    ".KKGGKKGGKK.",
    "...KGGGGK...",
    "..KGKGGKGK..",
    "...K.KK.K...",
    "............",
  ],
  show: [
    "............",
    "...KKKKKK...",
    "..KwwwwwwK..",
    ".KwRwwwBwwK.",
    ".KwwwwwwwwK.",
    ".KwGwwwwKwK.",
    ".KwwwwwKwwK.",
    ".KwwNwwwwK..",
    "..KwwwwwK...",
    "...KKKKK....",
    "............",
    "............",
  ],
  probe: [
    "............",
    ".KKKKKKKKK..",
    ".KwwwwwwwK..",
    ".KwKKKKKwK..",
    ".KwKNnNKwK..",
    ".KwKKKKKwK..",
    ".KwwwwwwwK..",
    ".KwRwGwBwK..",
    ".KwwwwwwwK..",
    ".KKKKKKKKK..",
    "............",
    "............",
  ],
  slide: [
    "............",
    "............",
    "......K.....",
    "......KK....",
    "KKKKKKKbK...",
    "KbbbbbbbbK..",
    "KBBBBBBBBBK.",
    "KKKKKKKBK...",
    "......KK....",
    "......K.....",
    "............",
    "............",
  ],
  wall: [
    "............",
    "KKKKKKKKKKKK",
    "KssSKssSKssK",
    "KKKKKKKKKKKK",
    "KsSKssSKssSK",
    "KKKKKKKKKKKK",
    "KssSKssSKssK",
    "KKKKKKKKKKKK",
    "KsSKssSKssSK",
    "KKKKKKKKKKKK",
    "............",
    "............",
  ],
  ice: [
    ".....K......",
    "..K..K..K...",
    "...KbKbK....",
    "....KWK.....",
    ".KKbWWWbKK..",
    "..bWWbWWb...",
    ".KKbWWWbKK..",
    "....KWK.....",
    "...KbKbK....",
    "..K..K..K...",
    ".....K......",
    "............",
  ],
  glide: [
    "............",
    "............",
    "..........K.",
    "..........KK",
    "KKKKKKKKKKKK",
    "...........K",
    "KKKKKKKKKKKK",
    "..........KK",
    "..........K.",
    "SSSSSSSSSSSS",
    "ssssssssssss",
    "............",
  ],
  flow: [
    "............",
    "...KKKKK....",
    "..KbbbbbK...",
    ".KbKKKKKbK..",
    ".KbK...KbK..",
    ".KbK.KKKbKK.",
    ".KbK..KbbbK.",
    ".KbK...KbK..",
    "..KbKKKKK...",
    "...KbbbbK...",
    "....KKKK....",
    "............",
  ],
};

// A character map as an SVG data URI (crisp squares, any size)
function iconUri(name) {
  const map = ICONS[name];
  const h = map.length;
  const w = map[0].length;
  let rects = "";
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const col = PIX[map[y][x]];
      if (col) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col}"/>`;
    }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ─── Tri, the robot of Tri's Lab (pixel art) ───
// Tri's body is the FEAScript logo triangle (same points, same tilt), drawn on a 36 × 35 pixel grid and
// meshed into 4 × 4-pixel elements. The same drawing is the Tri's Lab logo (assets/tris-lab-icon.svg),
// the Tri's Lab page hero and the mascot in this app. The hop and the blink are CSS (class "lab-tri").
// Faces: [x, y, w, h, colour] pixel rectangles; "E" = eye white, "K" = ink
const TRI_FACES = {
  idle: { eyes: [[16, 16, 3, 3, "E"], [22, 16, 3, 3, "E"], [17, 17, 2, 2, "K"], [23, 17, 2, 2, "K"]], mouth: [[18, 22, 1, 1], [19, 23, 4, 1], [23, 22, 1, 1]] },
  blink: { eyes: [[16, 18, 3, 1, "K"], [22, 18, 3, 1, "K"]], mouth: [[18, 22, 1, 1], [19, 23, 4, 1], [23, 22, 1, 1]] },
  happy: {
    eyes: [[16, 18, 1, 1, "K"], [17, 17, 1, 1, "K"], [18, 18, 1, 1, "K"], [22, 18, 1, 1, "K"], [23, 17, 1, 1, "K"], [24, 18, 1, 1, "K"]],
    mouth: [[17, 22, 1, 1], [18, 23, 6, 1], [19, 24, 4, 1], [24, 22, 1, 1]],
  },
  think: { eyes: [[16, 16, 3, 3, "E"], [22, 16, 3, 3, "E"], [17, 16, 2, 1, "K"], [23, 16, 2, 1, "K"]], mouth: [[19, 23, 4, 1]] },
  oops: { eyes: [[16, 16, 3, 3, "E"], [22, 16, 3, 3, "E"], [17, 17, 1, 1, "K"], [23, 17, 1, 1, "K"]], mouth: [[20, 22, 2, 2]] },
};

const TRI_COL = { body: "#d4aa00", mesh: "#f6d54a", ink: "#1d1d1d", E: "#ffffff", K: "#1d1d1d", blush: "#ff5c8d" };
const TRI_W = 36;
const TRI_H = 35;

// Pixels of the body: centres inside the FEAScript triangle (in its own coordinates, 8 units per pixel)
const triBody = (() => {
  const P = [[17, 254], [190, 82], [253, 317]];
  const side = (a, b, x, y) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const inside = new Uint8Array(TRI_W * TRI_H);
  for (let r = 0; r < TRI_H; r++)
    for (let c = 0; c < TRI_W; c++) {
      const x = -6 + (c + 0.5) * 8;
      const y = 58 + (r + 0.5) * 8;
      const s1 = side(P[0], P[1], x, y);
      const s2 = side(P[1], P[2], x, y);
      const s3 = side(P[2], P[0], x, y);
      if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) inside[r * TRI_W + c] = 1;
    }
  return inside;
})();

// Rows of equal-colour pixels → a few <rect>s
function triRects(pixels) {
  let out = "";
  for (let r = 0; r < TRI_H; r++) {
    let c = 0;
    while (c < TRI_W) {
      const col = pixels[r * TRI_W + c];
      let e = c + 1;
      while (e < TRI_W && pixels[r * TRI_W + e] === col) e++;
      if (col) out += `<rect x="${c}" y="${r}" width="${e - c}" height="1" fill="${col}"/>`;
      c = e;
    }
  }
  return out;
}

function triSvg(face = "idle") {
  const F = TRI_FACES[face] || TRI_FACES.idle;
  const at = (c, r) => (c >= 0 && c < TRI_W && r >= 0 && r < TRI_H ? triBody[r * TRI_W + c] : 0);
  // Body: a one-pixel black edge, gold inside, a lighter line every 4 pixels (the elements)
  const body = new Array(TRI_W * TRI_H).fill(null);
  for (let r = 0; r < TRI_H; r++)
    for (let c = 0; c < TRI_W; c++) {
      if (!at(c, r)) continue;
      const edge = !at(c - 1, r) || !at(c + 1, r) || !at(c, r - 1) || !at(c, r + 1);
      body[r * TRI_W + c] = edge ? TRI_COL.ink : c % 4 === 2 || r % 4 === 1 ? TRI_COL.mesh : TRI_COL.body;
    }
  const px = (list, colour) => list.map(([x, y, w, h, k]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colour || TRI_COL[k]}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -1 ${TRI_W} ${TRI_H + 1}" shape-rendering="crispEdges">
  <g class="tri-feet" fill="${TRI_COL.ink}"><rect x="11" y="27" width="1" height="3"/><rect x="10" y="30" width="3" height="1"/><rect x="25" y="30" width="1" height="3"/><rect x="24" y="33" width="3" height="1"/></g>
  <g class="tri-up">
    ${triRects(body)}
    ${px([[13, 21, 2, 1], [26, 21, 2, 1]], TRI_COL.blush)}
    <g class="tri-eyes">${px(F.eyes)}</g>
    ${px(F.mouth, TRI_COL.ink)}
  </g>
</svg>`;
}
