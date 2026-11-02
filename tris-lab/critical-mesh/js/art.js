/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · art.js
 *  Original pixel art drawn in code: palette, sprites, pixel fonts
 *  and small drawing helpers
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

const PAL = {
  k: "#0e0e12", y: "#d4aa00", Y: "#f7d54a", o: "#8f7200", s: "#e0a77a", S: "#b97a52",
  h: "#3a2418", H: "#5c3a26", w: "#fdfaf2", e: "#1d1d1d", g: "#5aa2ec", G: "#2b2b2b",
  c: "#f7e7b7", b: "#2c3b6b", B: "#1b2a4a", r: "#c8003f", R: "#ff5c8d", m: "#8a3a2a",
  n: "#8c8a82", N: "#4d4d4d", l: "#c9c6bd", z: "#2fcf93", Z: "#0d3b2c", q: "#7be0b8",
  u: "#b0b4bc", U: "#6b6f78", f: "#f2731d", F: "#fbb03b", a: "#5aa2ec", A: "#a8d8ff",
  p: "#c87533", P: "#e8a070", d: "#8a5a32", D: "#b07a46",
};

// Engineer body parts, combined into animation frames below
const ENG_HEAD = ["..kkkk..", ".kYYYYk.", "kYYYYYyk", ".kkkkkkk", ".kssesk.", ".kssssk."];
const ENG_BODY = ["..kffk..", ".kfccfk.", "kffccffk"];

const SPRITES = {
  // ─── Portraits (16 × 16) ───
  // Chief Engineer Eleni Makri: gold hard hat, goggles, hi-vis jacket
  eleni: [
    "....kkkkkkkk....",
    "...kYYYYYYyyk...",
    "..kYGGGGGGGGyk..",
    "..kYGgaGGgaGyk..",
    ".kkkkkkkkkkkkkk.",
    ".kyyyyyyyyyyyyok",
    "..khssssssssShk.",
    "..khswessweSShk.",
    "..khssssssssShk.",
    "..khhssssssSShk.",
    "...khssmmssShk..",
    "....kSsssssSk...",
    "...kkfkSSSSkfkk.",
    "..kffcfkkkkfcffk",
    ".kfffcfffffffcfk",
    ".kfffcfffffffcfk",
  ],
  // MESH, the Plate's monitor AI
  mesh: [
    "..kkkkkkkkkkkk..",
    ".kuuuuuuuuuuuuk.",
    ".kuZZZZZZZZZZuUk",
    ".kuZZZZZZZZZZuUk",
    ".kuZZzzZZZzzZuUk",
    ".kuZZzzZZZzzZuUk",
    ".kuZZZZZZZZZZuUk",
    ".kuZZZZZZZZZZuUk",
    ".kuZZzZZZZZzZuUk",
    ".kuZZZzzzzzZZuUk",
    ".kuZZZZZZZZZZuUk",
    ".kuuuuuuuurRuuUk",
    ".kUUUUUUUUUUUUUk",
    "..kkkkkUUkkkkkk.",
    "....kNNNNNNk....",
    "...kkkkkkkkkk...",
  ],
  meshAlarm: [
    "..kkkkkkkkkkkk..",
    ".kuuuuuuuuuuuuk.",
    ".kummmmmmmmmmuUk",
    ".kummmmmmmmmmuUk",
    ".kummRmmmmRmmuUk",
    ".kummmRmmRmmmuUk",
    ".kummmmmmmmmmuUk",
    ".kummmmmmmmmmuUk",
    ".kummmRRRRmmmuUk",
    ".kummRmmmmRmmuUk",
    ".kummmmmmmmmmuUk",
    ".kuuuuuuuurRuuUk",
    ".kUUUUUUUUUUUUUk",
    "..kkkkkUUkkkkkk.",
    "....kNNNNNNk....",
    "...kkkkkkkkkk...",
  ],
  // Director Aurelian Voss of the Consortium
  voss: [
    ".....kkkkkk.....",
    "....knnnnlnk....",
    "...knnlllllnk...",
    "...knlsssssnk...",
    "...knssssssSk...",
    "...kGGGsGGGSk...",
    "...kGwGsGwGSk...",
    "...kssssssSSk...",
    "...kssssssSSk...",
    "....kssmmmSk....",
    ".....kssSSk.....",
    "...kkwkSSkwkk...",
    "..kNNwwkkwwNNk..",
    ".kNNNNwrrwNNNNk.",
    ".kNNNNwrrwNNNNk.",
    ".kNNNNNrrNNNNNk.",
  ],
  // The Heatworks dome (narrator)
  dome: [
    "................",
    "......kkkk......",
    "....kkAAAAkk....",
    "...kAAaAAAAAk...",
    "..kAaAAAAAAAAk..",
    "..kAAAAAAAAAAk..",
    ".kAAAAAAAAAAAAk.",
    ".kAAAAffffAAAAk.",
    ".kAAAfFYYFfAAAk.",
    "kkkkkkkkkkkkkkkk",
    "kNNNNNNNNNNNNNNk",
    "kNUNNUNNUNNUNNUk",
    "kNNNNNNNNNNNNNNk",
    "kkkkkkkkkkkkkkkk",
    "kaaaaaaaaaaaaaak",
    "kkkkkkkkkkkkkkkk",
  ],
  // Athens Daily (newspaper headlines between shifts)
  news: [
    "................",
    "..kkkkkkkkkkkk..",
    "..kccccccccccNk.",
    "..kckkkkkkkkcNk.",
    "..kccccccccccNk.",
    "..kcNNNcNNNNcNk.",
    "..kccccccccccNk.",
    "..kcNNcrrrrNcNk.",
    "..kcNNcrrrrccNk.",
    "..kcNNcrrrrNcNk.",
    "..kccccccccccNk.",
    "..kcNNNcNNNNcNk.",
    "..kccccccccccNk.",
    "..kcNNNNcNNNcNk.",
    "..kkkkkkkkkkkkNk",
    "...NNNNNNNNNNNN.",
  ],

  // ─── The engineer (8 × 13), facing right ───
  eng0: [...ENG_HEAD, ...ENG_BODY, "kfffffsk", ".kbbbbk.", ".kbkkbk.", ".kk..kk."],
  eng1: [...ENG_HEAD, ...ENG_BODY, "kfffffsk", ".kbbbbk.", "kbk..kbk", "kk....kk"],
  eng2: [...ENG_HEAD, ...ENG_BODY, "ksfffffk", ".kbbbbk.", "..kbbk..", "..kkkk.."],
  engCarry: [...ENG_HEAD, "kskffksk", "kfkcckfk", ".kfccfk.", ".kfffffk", ".kbbbbk.", ".kbkkbk.", ".kk..kk."],
  engCarry1: [...ENG_HEAD, "kskffksk", "kfkcckfk", ".kfccfk.", ".kfffffk", ".kbbbbk.", "kbk..kbk", "kk....kk"],

  // ─── Items ───
  furnace: [
    "..kkkkk..",
    ".kNNNNNk.",
    "kNnnnnnNk",
    "kNkkkkkNk",
    "kNkfFfkNk",
    "kNkFYFkNk",
    "kNkkkkkNk",
    ".kNNNNNk.",
    "..kkkkk..",
  ],
  bolt: ["..kkk..", ".kluuk.", "kluuuUk", "kuuNuUk", "kuuuUUk", ".kUUUk.", "..kkk.."],
  crate: ["kkkkkkkkk", "kDdDdDdDk", "kdDdyDdDk", "kDdyYydDk", "kdyYYYydk", "kDdyYydDk", "kdDdyDdDk", "kDdDdDdDk", "kkkkkkkkk"],
  heart: [".kk.kk.", "kRrkrrk", "krrrrrk", ".krrrk.", "..krk..", "...k..."],
  heartOff: [".kk.kk.", "kNNkNNk", "kNNNNNk", ".kNNNk.", "..kNk..", "...k..."],
  hatch: ["kkkkkkkkkkk", "kUuuuuuuuUk", "kuNNNNNNNuk", "kuNkkkkkNuk", "kuNNNNNNNuk", "kUuuuuuuuUk", "kkkkkkkkkkk"],
  spool: ["..kkkkk..", ".kpPPPpk.", "kpPkkkPpk", "kPkpppkPk", "kPkpkpkPk", "kPkpppkPk", "kpPkkkPpk", ".kpPPPpk.", "..kkkkk.."],

  // ─── Tool icons (11 × 11) ───
  coolant: [
    ".....a.....",
    "...a.A.a...",
    "....aAa....",
    ".a...A...a.",
    "..aa.A.aa..",
    "AAAAAwAAAAA",
    "..aa.A.aa..",
    ".a...A...a.",
    "....aAa....",
    "...a.A.a...",
    ".....a.....",
  ],
  copper: [
    "...........",
    ".pppppppp..",
    ".pPPPPPPp..",
    ".pP....Pp..",
    ".pP.pp.Pp..",
    ".pP.pP.Pp..",
    ".pP.PP.Pp..",
    ".pP....Pp..",
    ".pPPPPPPPpp",
    ".pppppppppp",
    "...........",
  ],
  scan: [
    "...zzzzz...",
    "..z.....z..",
    ".z...z...z.",
    "z....z....z",
    "z...qzq...z",
    "zzzzzqzzzzz",
    "z...qzq...z",
    "z....z....z",
    ".z...z...z.",
    "..z.....z..",
    "...zzzzz...",
  ],
  reroll: [
    "....kkkkk..",
    "...kcccck..",
    "..kcckcck.y",
    "..kcccccky.",
    "..kckccck..",
    "..kcccck...",
    "...kkkk.yy.",
    "y.......y..",
    ".y.....y...",
    "..yyyyy....",
    "...........",
  ],
  rod: [
    "........kk.",
    ".......kYFk",
    "......kuFk.",
    ".....kuk...",
    "....kuk....",
    "...kuk.....",
    "..kuk......",
    ".kuk.......",
    "kUk........",
    "kk.........",
    "...........",
  ],
  medkit: [
    "...........",
    ".kkkkkkkkk.",
    ".kwwwwwwwk.",
    ".kwwwrwwwk.",
    ".kwwwrwwwk.",
    ".kwrrrrrwk.",
    ".kwwwrwwwk.",
    ".kwwwrwwwk.",
    ".kwwwwwwwk.",
    ".kkkkkkkkk.",
    "...........",
  ],
  vent: [
    "kkkkkkkkkkk",
    "kUUUUUUUUUk",
    "kNNNNNNNNNk",
    "kUUUUUUUUUk",
    "kNNNNNNNNNk",
    "kUUUUUUUUUk",
    "kNNNNNNNNNk",
    "kkkkkkkkkkk",
    "...........",
    ".A..A..A..A",
    "A..A..A..A.",
  ],
  star: ["...k...", "..kYk..", "kkkYkkk", "kYYYYyk", ".kYyyk.", ".kykyk.", "kk...kk"],
  starOff: ["...k...", "..kNk..", "kkkNkkk", "kNNNNNk", ".kNNNk.", ".kNkNk.", "kk...kk"],
};

// 3×5 pixel font for labels drawn on canvases
const FONT3 = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
  E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
  I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
  Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
  Y: "101101010010010", Z: "111001010100111",
  0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110",
  4: "101101111001001", 5: "111100110001110", 6: "011100111101111", 7: "111001010010010",
  8: "111101111101111", 9: "111101111001110",
  ".": "000000000000010", ",": "000000000010100", ":": "000010000010000", "-": "000000111000000",
  "=": "000111000111000", "°": "010101010000000", "/": "001001010100100", "!": "010010010000010",
  "?": "110001010000010", "%": "101001010100101", "+": "000010111010000", "(": "010100100100010",
  ")": "010001001001010", "×": "000101010101000", "<": "001010100010001", ">": "100010001010100",
  "^": "010101000000000", " ": "000000000000000",
};

// 5×7 font for the title logo
const FONT5 = {
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
};

// Heat ramp: cold alloy → FEAScript heat red → gold → cream white-hot (index 12 = past the limit)
const HEAT_HEX = [
  "#1b1f2e", "#232c4a", "#2c3b6b", "#3b3f8a", "#5b2f8c", "#8a1f74", "#c8003f",
  "#e8402c", "#f2731d", "#f7a21b", "#f7c531", "#fbe68a", "#fff8dc",
];
// Flow ramp (coolant speed), FEAScript flow blue
const FLOW_HEX = [
  "#0b1424", "#0f1d36", "#132a4c", "#173a63", "#1d4b7c", "#245d95",
  "#2d71ad", "#3a86c4", "#5aa2ec", "#7dbaf0", "#a8d8ff", "#d6efff", "#f2fbff",
];
// Solidified metal ramp (front propagation), dark steel → FEAScript gold
const FRONT_HEX = [
  "#2a2a30", "#33333a", "#3d3c42", "#48464a", "#545150", "#615c55",
  "#6f6858", "#7f765a", "#91845a", "#a39256", "#b89f48", "#d4aa00", "#e6c230",
];
const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const HEAT = HEAT_HEX.map(hexToRgb);
const FLOW = FLOW_HEX.map(hexToRgb);
const FRONT = FRONT_HEX.map(hexToRgb);
const NBANDS = 12;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

// Sprite → offscreen canvas (cached); flipped copies for left-facing frames
const spriteCache = new Map();
function sprite(name, flip = false) {
  const key = flip ? `${name}:flip` : name;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const rows = SPRITES[name];
  const c = document.createElement("canvas");
  c.width = rows[0].length;
  c.height = rows.length;
  const g = c.getContext("2d");
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === "." || !PAL[ch]) return;
      g.fillStyle = PAL[ch];
      g.fillRect(flip ? c.width - 1 - x : x, y, 1, 1);
    }),
  );
  spriteCache.set(key, c);
  return c;
}

function paintSprite(canvas, name) {
  const s = sprite(name);
  canvas.width = s.width;
  canvas.height = s.height;
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, s.width, s.height);
  g.drawImage(s, 0, 0);
}

// Pixel ring offsets, sorted by angle so rings can be dashed and animated
const ringCache = new Map();
function ring(r) {
  if (ringCache.has(r)) return ringCache.get(r);
  const pts = [];
  for (let dy = -r - 1; dy <= r + 1; dy++)
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      if (Math.abs(Math.hypot(dx, dy) - r) < 0.5) pts.push([dx, dy, Math.atan2(dy, dx)]);
    }
  pts.sort((a, b) => a[2] - b[2]);
  ringCache.set(r, pts);
  return pts;
}

function drawRing(g, cx, cy, r, color, { dash = 0, gap = 0, phase = 0, outline = null } = {}) {
  if (r < 1) return;
  if (outline) {
    g.fillStyle = outline;
    for (const [dx, dy] of ring(r + 1)) g.fillRect(cx + dx, cy + dy, 1, 1);
    for (const [dx, dy] of ring(r - 1)) g.fillRect(cx + dx, cy + dy, 1, 1);
  }
  g.fillStyle = color;
  const period = dash + gap;
  ring(r).forEach(([dx, dy], i) => {
    if (dash && (((i + Math.floor(phase)) % period) + period) % period >= dash) return;
    g.fillRect(cx + dx, cy + dy, 1, 1);
  });
}

function drawDisc(g, cx, cy, r, color) {
  g.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8));
    g.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
  }
}

function textWidth(str) {
  return String(str).length * 4 - 1;
}

function drawText(g, str, x, y, color, { shadow = "#0e0e12", align = "left" } = {}) {
  str = String(str).toUpperCase();
  if (align === "center") x -= Math.floor(textWidth(str) / 2);
  if (align === "right") x -= textWidth(str);
  const paint = (ox, oy, col) => {
    g.fillStyle = col;
    [...str].forEach((ch, i) => {
      const glyph = FONT3[ch] || FONT3["?"];
      for (let p = 0; p < 15; p++) if (glyph[p] === "1") g.fillRect(x + ox + i * 4 + (p % 3), y + oy + Math.floor(p / 3), 1, 1);
    });
  };
  if (shadow) paint(1, 1, shadow);
  paint(0, 0, color);
}

// Text on a dark tag, kept inside [minX, maxX]
function drawTag(g, str, x, y, color, { bg = "#0e0e12", minX = PX0, maxX = PX0 + PW } = {}) {
  const w = textWidth(str) + 4;
  x = Math.max(minX, Math.min(maxX - w, x));
  g.fillStyle = bg;
  g.fillRect(x, y, w, 9);
  drawText(g, str, x + 2, y + 2, color, { shadow: null });
}

// Die face, procedural 15 × 15
function drawDie(canvas, pips, { tint = "#f7e7b7", jitter = 0 } = {}) {
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, 15, 15);
  const o = jitter;
  g.fillStyle = "#0e0e12";
  g.fillRect(1 + o, 0, 13, 15);
  g.fillRect(0 + o, 1, 15, 13);
  g.fillStyle = "#b9a774";
  g.fillRect(1 + o, 1, 13, 13);
  g.fillStyle = tint;
  g.fillRect(1 + o, 1, 12, 12);
  g.fillStyle = "#fffbe8";
  g.fillRect(2 + o, 2, 3, 1);
  g.fillRect(2 + o, 2, 1, 3);
  const P = {
    1: [[6, 6]],
    2: [[3, 3], [9, 9]],
    3: [[3, 3], [6, 6], [9, 9]],
    4: [[3, 3], [9, 3], [3, 9], [9, 9]],
    5: [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]],
    6: [[3, 3], [9, 3], [3, 6], [9, 6], [3, 9], [9, 9]],
  }[pips] || [];
  g.fillStyle = pips === 6 ? "#c8003f" : "#1d1d1d";
  for (const [x, y] of P) g.fillRect(x + o, y, 2, 2);
}

// Thermo-cell, 9 × 9: steel body with a glowing core coloured by power, plus a power badge
const CELL_GLOW = [null, "#f7c531", "#f7a21b", "#f2731d", "#e8402c", "#c8003f", "#ff5c8d"];
function drawCell(g, cx, cy, pips, now, { badge = true } = {}) {
  const glow = CELL_GLOW[pips] || CELL_GLOW[1];
  const pulse = Math.floor(now / 260 + cx) % 2;
  g.fillStyle = "#0e0e12";
  g.fillRect(cx - 3, cy - 4, 7, 9);
  g.fillRect(cx - 4, cy - 3, 9, 7);
  g.fillStyle = "#4d4d55";
  g.fillRect(cx - 3, cy - 3, 7, 7);
  g.fillStyle = "#8c8a82";
  g.fillRect(cx - 3, cy - 3, 7, 1);
  g.fillStyle = glow;
  g.fillRect(cx - 2, cy - 2, 5, 5);
  g.fillStyle = pulse ? "#fff8dc" : "#fbe68a";
  g.fillRect(cx - 1, cy - 1, 3, 3);
  if (badge) {
    g.fillStyle = "#0e0e12";
    g.fillRect(cx + 6, cy - 12, 5, 7);
    drawText(g, String(pips), cx + 7, cy - 11, glow, { shadow: null });
  }
}

// Title logo in the 5×7 font, gradient from white-hot to heat red
function drawTitleLogo(canvas, t) {
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, canvas.width, canvas.height);
  const lines = [
    { text: "CRITICAL", y: 2 },
    { text: "MESH", y: 12 },
  ];
  const lit = [];
  for (const { text, y } of lines) {
    const w = text.length * 6 - 1;
    const x0 = Math.floor((canvas.width - w) / 2);
    [...text].forEach((ch, i) =>
      FONT5[ch].forEach((row, ry) =>
        [...row].forEach((c, rx) => {
          if (c === "#") lit.push([x0 + i * 6 + rx, y + ry, ry]);
        }),
      ),
    );
  }
  g.fillStyle = "#0e0e12";
  for (const [x, y] of lit) {
    g.fillRect(x - 1, y - 1, 3, 3);
    g.fillRect(x + 1, y + 1, 1, 1);
  }
  for (const [x, y, ry] of lit) {
    const wave = Math.sin(t * 3 + x * 0.35) * 0.9;
    const idx = Math.max(6, Math.min(12, Math.round(12 - ry * 1.05 + wave)));
    g.fillStyle = HEAT_HEX[idx];
    g.fillRect(x, y, 1, 1);
  }
}
