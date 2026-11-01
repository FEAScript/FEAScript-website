/**
 * ════════════════════════════════════════════════════════════════
 *  FEM Blocks · blocks.js
 *  The pixel renderer, the themes and every block in the toolbox
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

// ─── Pixel renderer: square corners and stepped notches ───
class PixelConstants extends Blockly.blockRendering.ConstantProvider {
  constructor() {
    super();
    this.CORNER_RADIUS = 0;
    this.FIELD_BORDER_RECT_RADIUS = 0;
    this.NOTCH_WIDTH = 16;
    this.NOTCH_HEIGHT = 8;
    this.NOTCH_OFFSET_LEFT = 16;
    this.TAB_WIDTH = 8;
    this.TAB_HEIGHT = 16;
    this.TAB_OFFSET_FROM_TOP = 6;
    this.MIN_BLOCK_HEIGHT = 32;
    this.SMALL_PADDING = 4;
    this.MEDIUM_PADDING = 8;
    this.LARGE_PADDING = 12;
    this.FIELD_BORDER_RECT_HEIGHT = 22;
    this.FIELD_DROPDOWN_BORDER_RECT_HEIGHT = 22;
    this.START_HAT_HEIGHT = 12;
    this.START_HAT_WIDTH = 96;
    this.STATEMENT_INPUT_NOTCH_OFFSET = 16;
    this.STATEMENT_BOTTOM_SPACER = 8;
  }

  // Notch on the top edge (pathLeft, left → right) and bottom edge (pathRight, right → left)
  makeNotch() {
    return {
      type: this.SHAPES.NOTCH,
      width: 16,
      height: 8,
      pathLeft: "v 4 h 4 v 4 h 8 v -4 h 4 v -4",
      pathRight: "v 4 h -4 v 4 h -8 v -4 h -4 v -4",
    };
  }

  // Puzzle tab for value inputs: a little staircase
  makePuzzleTab() {
    return {
      type: this.SHAPES.PUZZLE,
      width: 8,
      height: 16,
      pathDown: () => "v 2 h -4 v 4 h -4 v 4 h 4 v 4 h 4 v 2",
      pathUp: () => "v -2 h -4 v -4 h -4 v -4 h 4 v -4 h 4 v -2",
    };
  }

  // A stepped "hat" on the start block
  makeStartHat() {
    return {
      height: 12,
      width: 96,
      path: "v -4 h 8 v -4 h 8 v -4 h 64 v 4 h 8 v 4 h 8 v 4",
    };
  }
}

class PixelRenderer extends Blockly.thrasos.Renderer {
  makeConstants_() {
    return new PixelConstants();
  }
}
Blockly.blockRendering.register("pixel", PixelRenderer);

// ─── Themes (light and dark follow the FEAScript website toggle) ───
const FONT_STYLE = { family: '"Jersey 10", "Roboto Mono", monospace', weight: "400", size: 17 };
const THEMES = {
  light: Blockly.Theme.defineTheme("femblocks-light", {
    base: Blockly.Themes.Classic,
    fontStyle: FONT_STYLE,
    startHats: true,
    componentStyles: {
      workspaceBackgroundColour: "#fdfaf2",
      toolboxBackgroundColour: "#f6efd9",
      toolboxForegroundColour: "#1d1d1d",
      flyoutBackgroundColour: "#efe5c7",
      flyoutForegroundColour: "#1d1d1d",
      flyoutOpacity: 0.97,
      scrollbarColour: "#d4aa00",
      scrollbarOpacity: 0.6,
      insertionMarkerColour: "#1d1d1d",
      insertionMarkerOpacity: 0.25,
      cursorColour: "#d4aa00",
    },
  }),
  dark: Blockly.Theme.defineTheme("femblocks-dark", {
    base: Blockly.Themes.Classic,
    fontStyle: FONT_STYLE,
    startHats: true,
    componentStyles: {
      workspaceBackgroundColour: "#1b1b1f",
      toolboxBackgroundColour: "#222226",
      toolboxForegroundColour: "#e6e3da",
      flyoutBackgroundColour: "#2a2a30",
      flyoutForegroundColour: "#e6e3da",
      flyoutOpacity: 0.97,
      scrollbarColour: "#e6c230",
      scrollbarOpacity: 0.5,
      insertionMarkerColour: "#ffffff",
      insertionMarkerOpacity: 0.3,
      cursorColour: "#e6c230",
    },
  }),
};

// ─── Block colours (white text on every one) ───
const COL = {
  start: "#6a4bc4",
  shape: "#00875a",
  material: "#a85a26",
  heat: "#c8003f",
  edge: "#b86e00",
  flow: "#0072b5",
  front: "#2c6f8f",
  solve: "#3a3a44",
  show: "#23808d",
};

const MATERIALS = [
  ["copper", 400],
  ["aluminium", 237],
  ["steel", 50],
  ["glass", 1],
  ["brick", 0.7],
  ["wood", 0.15],
  ["foam", 0.03],
];
const K_OF = Object.fromEntries(MATERIALS);

const EDGES = [
  ["bottom", "bottom"],
  ["left", "left"],
  ["top", "top"],
  ["right", "right"],
];

const icon = (name) => ({ type: "field_image", src: iconUri(name), width: 24, height: 24, alt: "" });
const num = (name, value, min, max, precision) => ({ type: "field_number", name, value, min, max, precision });
const edge = (name = "EDGE") => ({ type: "field_dropdown", name, options: EDGES });
const stmt = (colour) => ({ previousStatement: "fem", nextStatement: "fem", colour });

Blockly.common.defineBlocksWithJsonArray([
  {
    type: "fem_sim",
    message0: "%1 NEW SIMULATION of %2",
    args0: [icon("sim"), { type: "field_dropdown", name: "PHYSICS", options: [["heat", "heat"], ["flow", "flow"], ["front", "front"]] }],
    message1: "%1",
    args1: [{ type: "input_statement", name: "DO", check: "fem" }],
    colour: COL.start,
    tooltip: "Every simulation starts here. Put the other blocks inside.",
  },
  {
    type: "fem_bar",
    message0: "%1 BAR %2 m long, cut into %3 %4 pieces",
    args0: [
      icon("bar"),
      num("LEN", 1, 0.1, 100, 0.01),
      num("N", 10, 1, 200, 1),
      { type: "field_dropdown", name: "ORDER", options: [["straight", "linear"], ["curvy", "quadratic"]] },
    ],
    ...stmt(COL.shape),
    tooltip: "A 1D shape: a thin bar, like a metal rod or a wall seen from the side.",
  },
  {
    type: "fem_plate",
    message0: "%1 PLATE %2 m wide, %3 m tall",
    args0: [icon("plate"), num("W", 4, 0.1, 100, 0.01), num("H", 2, 0.1, 100, 0.01)],
    message1: "cut into %1 × %2 %3 pieces",
    args1: [num("NX", 8, 1, 60, 1), num("NY", 4, 1, 60, 1), { type: "field_dropdown", name: "ORDER", options: [["curvy", "quadratic"], ["straight", "linear"]] }],
    ...stmt(COL.shape),
    tooltip: "A 2D shape: a flat rectangle, cut into a grid of pieces (elements).",
  },
  {
    type: "fem_material",
    message0: "%1 made of %2",
    args0: [icon("material"), { type: "field_dropdown", name: "MAT", options: MATERIALS.map(([m, k]) => [`${m} (k = ${k})`, m]) }],
    ...stmt(COL.material),
    tooltip: "What the shape is made of. This sets k, the conductivity.",
  },
  {
    type: "fem_material_k",
    message0: "%1 made of a material with k = %2",
    args0: [icon("material"), num("K", 1, 0.001, 10000, 0.001)],
    ...stmt(COL.material),
    tooltip: "Type your own conductivity k, in W/(m·K).",
  },
  {
    type: "fem_heat_all",
    message0: "%1 warm it ALL OVER with Q = %2",
    args0: [icon("heater"), num("Q", 100, -100000, 100000, 0.01)],
    ...stmt(COL.heat),
    tooltip: "Heat made inside every bit of the shape, like electricity warming a wire.",
  },
  {
    type: "fem_heater",
    message0: "%1 HEATER at x %2 y %3",
    args0: [icon("heater"), num("X", 2, -1000, 1000, 0.01), num("Y", 1, -1000, 1000, 0.01)],
    message1: "size %1 m, power Q = %2",
    args1: [num("R", 0.3, 0.01, 100, 0.01), num("Q", 5000, -1000000, 1000000, 0.01)],
    ...stmt(COL.heat),
    tooltip: "A round heater inside a plate (on a bar, only x counts).",
  },
  {
    type: "fem_edge_temp",
    message0: "%1 keep the %2 edge at %3 °C",
    args0: [icon("hot"), edge(), num("T", 100, -273.15, 10000, 0.01)],
    ...stmt(COL.edge),
    tooltip: "This edge is held at a fixed temperature, like touching ice or a hot stove.",
  },
  {
    type: "fem_edge_air",
    message0: "%1 air cools the %2 edge",
    args0: [icon("air"), edge()],
    message1: "air at %1 °C, wind h = %2",
    args1: [num("TAIR", 20, -273.15, 10000, 0.01), num("H", 10, 0, 100000, 0.01)],
    ...stmt(COL.edge),
    tooltip: "Air flows past this edge and carries heat away. Bigger h means more wind.",
  },
  {
    type: "fem_edge_insulate",
    message0: "%1 wrap the %2 edge in a blanket",
    args0: [icon("insulate"), edge()],
    ...stmt(COL.edge),
    tooltip: "No heat gets through this edge (insulated).",
  },
  {
    type: "fem_wall_slide",
    message0: "%1 slide the %2 wall at speed %3",
    args0: [icon("slide"), edge(), num("U", 1, -100, 100, 0.01)],
    ...stmt(COL.flow),
    tooltip: "This wall moves sideways like a conveyor belt and drags the fluid with it.",
  },
  {
    type: "fem_wall_still",
    message0: "%1 hold the %2 wall still",
    args0: [icon("wall"), edge()],
    ...stmt(COL.flow),
    tooltip: "A wall that doesn't move. Fluid touching it stops.",
  },
  {
    type: "fem_front_start",
    message0: "%1 start the front at the %2 edge",
    args0: [icon("ice"), edge()],
    ...stmt(COL.front),
    tooltip: "The front (like ice growing from a cold wall) starts here, at time 0.",
  },
  {
    type: "fem_front_slide",
    message0: "%1 let the front slide along the %2 edge",
    args0: [icon("glide"), edge()],
    ...stmt(COL.front),
    tooltip: "Nothing starts at this edge: the front just slides along it.",
  },
  {
    type: "fem_solve",
    message0: "%1 SOLVE IT! with %2",
    args0: [icon("solve"), { type: "field_dropdown", name: "METHOD", options: [["LU (exact)", "lusolve"], ["frontal (exact)", "frontal"]] }],
    ...stmt(COL.solve),
    tooltip: "Build all the equations and let FEAScript solve them.",
  },
  {
    type: "fem_show",
    message0: "%1 SHOW the picture %2 with the mesh",
    args0: [icon("show"), { type: "field_checkbox", name: "MESH", checked: false }],
    ...stmt(COL.show),
    tooltip: "Paint the answer in colours. Tick the box to see the pieces (the mesh).",
  },
  {
    type: "fem_probe",
    message0: "%1 MEASURE at x %2 y %3",
    args0: [icon("probe"), num("X", 2, -1000, 1000, 0.01), num("Y", 1, -1000, 1000, 0.01)],
    ...stmt(COL.show),
    tooltip: "Put a thermometer (or a speed meter, for flow) at a point.",
  },
]);

const TOOLBOX = {
  kind: "categoryToolbox",
  contents: [
    { kind: "category", name: "Start", colour: COL.start, contents: [{ kind: "block", type: "fem_sim" }] },
    {
      kind: "category",
      name: "Shape",
      colour: COL.shape,
      contents: [
        { kind: "block", type: "fem_bar" },
        { kind: "block", type: "fem_plate" },
      ],
    },
    {
      kind: "category",
      name: "Material",
      colour: COL.material,
      contents: [
        { kind: "block", type: "fem_material" },
        { kind: "block", type: "fem_material_k" },
      ],
    },
    {
      kind: "category",
      name: "Heat",
      colour: COL.heat,
      contents: [
        { kind: "block", type: "fem_heater" },
        { kind: "block", type: "fem_heat_all" },
      ],
    },
    {
      kind: "category",
      name: "Edges",
      colour: COL.edge,
      contents: [
        { kind: "block", type: "fem_edge_temp" },
        { kind: "block", type: "fem_edge_air" },
        { kind: "block", type: "fem_edge_insulate" },
      ],
    },
    {
      kind: "category",
      name: "Flow",
      colour: COL.flow,
      contents: [
        { kind: "block", type: "fem_wall_slide" },
        { kind: "block", type: "fem_wall_still" },
      ],
    },
    {
      kind: "category",
      name: "Front",
      colour: COL.front,
      contents: [
        { kind: "block", type: "fem_front_start" },
        { kind: "block", type: "fem_front_slide" },
      ],
    },
    {
      kind: "category",
      name: "Solve & see",
      colour: COL.solve,
      contents: [
        { kind: "block", type: "fem_solve" },
        { kind: "block", type: "fem_show" },
        { kind: "block", type: "fem_probe" },
      ],
    },
  ],
};

// ─── What every block means: shown in the physics card ───
// term: the part of the equation the block controls
const BLOCK_INFO = {
  fem_sim: {
    term: null,
    title: "New simulation",
    words:
      "This is where every simulation starts. Choose <b>heat</b> to see how warmth spreads through solid things, <b>flow</b> to see how a thick liquid like honey moves, or <b>front</b> to see something spread at a steady speed, like ice growing in a tray of water. Everything else goes inside.",
  },
  fem_bar: {
    term: "mesh",
    title: "A bar, cut into pieces",
    words:
      "A computer can't think about every single point of a bar: there are infinitely many! So we cut it into small pieces called <b>elements</b>. The temperature is only worked out at the ends of each piece (the <b>nodes</b>), and in between it's drawn as a straight or a curvy line.",
    fun: "More pieces = a better answer, but more equations to solve.",
  },
  fem_plate: {
    term: "mesh",
    title: "A plate, cut into pieces",
    words:
      "The plate is cut into a grid of little rectangles called <b>elements</b>. Their corners (and, for curvy pieces, the middles of their sides) are the <b>nodes</b>. The computer finds the temperature at every node, one equation each. This cut-up shape is called a <b>mesh</b>.",
    fun: "That's the F and the E in FEM: the Finite Element Method.",
  },
  fem_material: {
    term: "k",
    title: "Conductivity k",
    words:
      "<b>k</b> says how easily heat travels through a material. Copper (k = 400) is a heat highway: heat zooms through. Wood (k = 0.15) and foam (k = 0.03) are muddy paths: heat crawls. That's why pans are metal and their handles are wood!",
    fun: "With no material block, FEAScript uses k = 1.",
  },
  fem_material_k: {
    term: "k",
    title: "Your own k",
    words: "Type any conductivity you like. Try a really big one and a really tiny one, and compare the pictures.",
  },
  fem_heat_all: {
    term: "Q",
    title: "Heat made inside: Q",
    words:
      "<b>Q</b> is heat made inside the material itself, in watts for every cubic metre. An electric wire, a battery or even a compost heap all make their own heat. More Q pushes the temperature up.",
    fun: "Try a negative Q: that's a fridge inside the material!",
  },
  fem_heater: {
    term: "Q",
    title: "A heater: Q in a circle",
    words:
      "A heater puts <b>Q</b> into a round spot and nowhere else. The heat then spreads out from it. Where it can go depends on k and on the edges.",
    fun: "You can use as many heaters as you like. Their effects add up.",
  },
  fem_edge_temp: {
    term: "dirichlet",
    title: "Fixed temperature",
    words:
      "This edge is told exactly what temperature to be, like a pot touching boiling water (100 °C) or a can sitting in ice (0 °C). However much heat arrives, the edge stays at that temperature.",
    fun: "Grown-up name: a Dirichlet boundary condition.",
  },
  fem_edge_air: {
    term: "robin",
    title: "Cooling by air",
    words:
      "Air flowing past carries heat away, but only as much as the edge is hotter than the air. <b>h</b> is how windy it is: h = 5 is a calm room, h = 50 is a strong fan. That's why blowing on hot soup cools it faster.",
    fun: "Grown-up name: a Robin (or convection) boundary condition.",
  },
  fem_edge_insulate: {
    term: "neumann",
    title: "An insulated edge",
    words:
      "A blanket lets no heat through, so heat that reaches this edge has to turn back. Fun secret: edges without any block are insulated already! This block just makes it clear.",
    fun: "Grown-up name: a Neumann (zero-flux) boundary condition.",
  },
  fem_wall_slide: {
    term: "wall",
    title: "A sliding wall",
    words:
      "This wall moves like a conveyor belt. The fluid touching it sticks to it and gets dragged along, and the fluid next to that gets dragged a little less, and so on. That's how stirring works!",
  },
  fem_wall_still: {
    term: "still",
    title: "A wall that holds still",
    words: "Fluid touching a wall can't slip past it: its speed there is zero. Walls without a block also hold still.",
  },
  fem_front_start: {
    term: "start",
    title: "Where the front starts",
    words:
      "The front starts on this edge at time zero (φ = 0), like ice forming on a cold wall. From there it moves inward at the same speed in every direction, so <b>φ</b> at any point is simply the time it takes to arrive there.",
    fun: "Grown-up name: a Dirichlet condition, φ = 0.",
  },
  fem_front_slide: {
    term: "slide",
    title: "A wall where nothing starts",
    words:
      "This edge isn't cold, so no front starts here. The front coming from elsewhere just slides along it. Edges without a block do the same.",
    fun: "Grown-up name: a zero-gradient (Neumann) condition, ∂φ/∂n = 0.",
  },
  fem_solve: {
    term: "solve",
    title: "Solve it!",
    words:
      "Now the magic. FEAScript writes one equation for every node of your mesh, all linked together. It puts them in one giant table, <b>K · T = F</b>, and solves them all at once. LU and frontal are two ways of doing that exactly.",
    fun: "A plate with 8 × 4 curvy pieces already has 153 equations. A computer solves them in well under a second.",
  },
  fem_show: {
    term: "T",
    title: "The picture",
    words:
      "Paints the answer: every colour is a temperature (or a speed). Hover over the picture to read it. Tick the box to see the mesh: the pieces your shape was cut into.",
  },
  fem_probe: {
    term: "T",
    title: "Measure a point",
    words: "Puts a thermometer (or a speed meter) at a point and writes the value on the picture. Great for checking missions!",
  },
};
