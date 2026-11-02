/**
 * ════════════════════════════════════════════════════════════════
 *  FEM Blocks · missions.js
 *  Nine short missions, each about one idea of the finite element
 *  method. Every goal is checked on the real FEAScript result.
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

// ─── Tiny helpers to write starting workspaces ───
const B = {
  bar: (len = 1, n = 10, order = "linear") => ({ type: "fem_bar", fields: { LEN: len, N: n, ORDER: order } }),
  plate: (w = 4, h = 2, nx = 8, ny = 4, order = "quadratic") => ({ type: "fem_plate", fields: { W: w, H: h, NX: nx, NY: ny, ORDER: order } }),
  material: (mat) => ({ type: "fem_material", fields: { MAT: mat } }),
  heatAll: (q) => ({ type: "fem_heat_all", fields: { Q: q } }),
  heater: (x, y, r, q) => ({ type: "fem_heater", fields: { X: x, Y: y, R: r, Q: q } }),
  temp: (edge, T) => ({ type: "fem_edge_temp", fields: { EDGE: edge, T } }),
  air: (edge, Tair, h) => ({ type: "fem_edge_air", fields: { EDGE: edge, TAIR: Tair, H: h } }),
  insulate: (edge) => ({ type: "fem_edge_insulate", fields: { EDGE: edge } }),
  slide: (edge, U) => ({ type: "fem_wall_slide", fields: { EDGE: edge, U } }),
  still: (edge) => ({ type: "fem_wall_still", fields: { EDGE: edge } }),
  solve: (method = "lusolve") => ({ type: "fem_solve", fields: { METHOD: method } }),
  show: (mesh = false) => ({ type: "fem_show", fields: { MESH: mesh } }),
  probe: (x, y) => ({ type: "fem_probe", fields: { X: x, Y: y } }),
  start: (edge) => ({ type: "fem_front_start", fields: { EDGE: edge } }),
  glide: (edge) => ({ type: "fem_front_slide", fields: { EDGE: edge } }),
};

// Chain blocks with "next" links
function chain(list) {
  if (!list.length) return undefined;
  const [first, ...rest] = list;
  const block = { ...first };
  const next = chain(rest);
  if (next) block.next = { block: next };
  return block;
}

// A NEW SIMULATION block holding `inside`, plus loose blocks waiting on the side
function startWorkspace(physics, inside, loose = []) {
  const blocks = [{ type: "fem_sim", x: 24, y: 24, fields: { PHYSICS: physics }, inputs: { DO: { block: chain(inside) } } }];
  loose.forEach((b, i) => blocks.push({ ...b, x: 470, y: 40 + i * 70 }));
  return { blocks: { languageVersion: 0, blocks } };
}

const hasEdge = (spec, e, kind) => spec.edges[e] && (!kind || spec.edges[e].kind === kind);

const MISSIONS = [
  {
    id: "hello",
    title: "Hello, heat!",
    text: "Hi, I'm <b>Tri</b>, and I solve physics with FEAScript! (I'm a triangle, <i>not</i> a tortilla chip. Please don't dip me in salsa.) Here's a metal bar, 1 m long. Let's dip its left end in boiling water (100 °C) and its right end in ice (0 °C). How warm is the middle?",
    goal: "Snap the two orange <b>keep the edge at</b> blocks into the simulation, one for each end, and press <b>Run</b>.",
    hint: "Drag each orange block until it clicks in, just above <b>SOLVE IT!</b>. Set one to <i>left</i> and 100 °C, the other to <i>right</i> and 0 °C.",
    start: () => startWorkspace("heat", [B.bar(1, 10), B.solve(), B.show()], [B.temp("left", 100), B.temp("right", 0)]),
    check: (r) =>
      r.dim === "1D" && hasEdge(r.spec, "left", "temp") && hasEdge(r.spec, "right", "temp") && r.spec.edges.left.T !== r.spec.edges.right.T,
    success:
      "A perfectly <b>straight line</b>! With no heat made inside the bar, the temperature drops evenly from the hot end to the cold end. Hover over the picture: halfway along, it's exactly halfway between the two.",
  },
  {
    id: "wire",
    title: "A warm wire",
    text: "Electricity flowing through a wire warms it from the inside. In the equation that's <b>Q</b>, heat made inside. Both ends of this wire are held at 20 °C. Add some Q and watch the straight line bend!",
    goal: "Make the middle of the wire reach <b>50 °C</b> or more.",
    hint: "Snap the red <b>warm it ALL OVER</b> block in and run it. Not hot enough? Make Q bigger... or make the wire out of something that conducts badly (try <i>Material</i>).",
    start: () => startWorkspace("heat", [B.bar(1, 10), B.temp("left", 20), B.temp("right", 20), B.solve(), B.show()], [B.heatAll(100)]),
    check: (r) => r.dim === "1D" && (r.spec.heatAll.length > 0 || r.spec.heaters.length > 0) && r.max >= 50,
    success:
      "That hill is a <b>parabola</b>. Heat made in the middle has to walk all the way to an end to escape, so the middle gets hottest. Did you find the other trick? A smaller <b>k</b> means heat walks slower, so it piles up more.",
  },
  {
    id: "plate",
    title: "Into 2D",
    text: "Now a flat plate, 4 m wide and 2 m tall. Its bottom edge sits on a hot stove at 100 °C. Let's put ice along the top edge. The left and right sides have no blocks... what do you think happens there?",
    goal: "Put the top edge at <b>0 °C</b>, run it, then <b>hover</b> over the picture to read temperatures.",
    hint: "The loose orange block already says 0 °C: set it to <i>top</i> and snap it in.",
    start: () => startWorkspace("heat", [B.plate(4, 2, 8, 4), B.temp("bottom", 100), B.solve(), B.show(true)], [B.temp("top", 0)]),
    check: (r) => r.dim === "2D" && hasEdge(r.spec, "bottom", "temp") && hasEdge(r.spec, "top", "temp"),
    success:
      "Stripes! Heat flows straight up from the stove to the ice. The sides have no block, so they're <b>insulated</b>: no heat leaks out sideways, and the stripes stay perfectly flat. The thin lines show the <b>mesh</b>: 32 pieces, 153 nodes.",
  },
  {
    id: "blanket",
    title: "The magic blanket",
    text: "This plate sits on a 100 °C stove, and the wind cools its top. What if heat couldn't escape anywhere at all, except back into the stove?",
    goal: "Make the <b>whole plate</b> the same temperature: the hottest and coolest points less than 1 °C apart.",
    hint: "Heat is escaping through the top. Swap the air block for a blanket: drag the air block out to the toolbox (that deletes it), and use the brown <b>blanket</b> block on the top edge instead.",
    start: () => startWorkspace("heat", [B.plate(4, 2, 8, 4), B.temp("bottom", 100), B.air("top", 20, 10), B.solve(), B.show()], [B.insulate("top")]),
    check: (r) => r.dim === "2D" && r.physics === "heat" && r.max - r.min < 1,
    success:
      "The whole plate is 100 °C! With blankets everywhere else, heat has nowhere to go, so the plate fills up until it's as hot as the stove. Then nothing flows any more: that's what <b>steady state</b> means.",
  },
  {
    id: "highway",
    title: "Heat highway",
    text: "Stove at the bottom, wind on top. My thermometer near the top edge reads only about 24 °C. The plate is made of a bad conductor (k = 1), so the wind wins. Pick a better material!",
    goal: "Make the thermometer near the top (y ≥ 1.5 m) read more than <b>90 °C</b>.",
    hint: "Try different materials from <i>Material</i>. Which ones are heat highways? Steel isn't quite enough...",
    start: () =>
      startWorkspace("heat", [B.plate(4, 2, 8, 4), B.temp("bottom", 100), B.air("top", 20, 10), B.solve(), B.show(), B.probe(2, 1.9)], [B.material("wood")]),
    check: (r) => r.physics === "heat" && r.probes.some((p) => p.y >= 1.5 && p.v > 90),
    success:
      "Copper and aluminium are <b>heat highways</b>: heat races up from the stove faster than the wind can blow it away. That's why good pans are made of them (and their handles of wood!).",
  },
  {
    id: "chip",
    title: "Cool the chip",
    text: "A computer chip in the middle of this plate makes 5000 W/m³ of heat. (A <i>computer</i> chip. Not a tortilla chip. Not me!) Only the top edge touches air, and right now the chip is <b>way</b> too hot. Change anything you like, except the chip itself!",
    goal: "Keep the hottest point below <b>40 °C</b>, with the heater still at power 5000 or more and size 0.3 m or more.",
    hint: "Two ideas: a metal plate spreads the heat out, and more wind (a bigger h) or more air-cooled edges carry it away. You'll probably need both!",
    start: () => startWorkspace("heat", [B.plate(4, 2, 8, 4), B.heater(2, 1, 0.3, 5000), B.air("top", 20, 10), B.solve(), B.show()]),
    check: (r) => r.physics === "heat" && r.spec.heaters.some((h) => h.q >= 5000 && h.r >= 0.3) && r.max < 40,
    success:
      "Chip saved! You did what engineers do with a <b>heat sink</b>: spread the heat out with a good conductor, then hand it to moving air. Your laptop has one inside.",
  },
  {
    id: "pieces",
    title: "More pieces, better answer",
    text: "FEM answers are approximate, because the shape is cut into pieces. This plate is cut into only 2 × 1 big pieces, and there's a small heater with a thermometer on top. Is 2 × 1 enough?",
    goal: "Cut the plate into at least <b>16 × 8</b> pieces and run it. Watch the thermometer.",
    hint: "Change the numbers in the PLATE block (run once first, so you can compare). Then look at <i>The math</i> tab.",
    start: () =>
      startWorkspace("heat", [B.plate(4, 2, 2, 1, "linear"), B.heater(1, 1, 0.25, 5000), B.temp("bottom", 20), B.solve(), B.show(true), B.probe(1, 1)]),
    check: (r) => r.dim === "2D" && r.elements >= 128 && r.probes.length > 0,
    success:
      "See the difference? The computer only checks a few points inside each piece. With 2 × 1 huge pieces it missed the little heater completely, and with medium pieces it can even guess too much heat. With more pieces the answer settles down. More pieces = a better answer, but also more equations to solve: engineers look for the right balance.",
  },
  {
    id: "honey",
    title: "Stir the honey",
    text: "Time for something new: <b>flow</b>! This box is full of honey: super thick and slow. Three walls hold still. Make the top wall slide like a conveyor belt and see what the honey does.",
    goal: "Make the <b>top wall slide</b> and run the flow.",
    hint: "Snap the blue <b>slide the top wall</b> block in, above SOLVE IT!.",
    start: () =>
      startWorkspace("flow", [B.plate(1, 1, 12, 12), B.still("bottom"), B.still("left"), B.still("right"), B.solve(), B.show()], [B.slide("top", 1)]),
    check: (r) => r.physics === "flow" && Object.values(r.spec.walls).some((w) => w.kind === "slide" && w.U !== 0),
    success:
      "A whirlpool! The sliding lid drags the honey along, the honey bumps into the wall and turns around. This is the famous <b>lid-driven cavity</b>, one of the first tests every flow solver has to pass.",
  },
  {
    id: "freeze",
    title: "Last to freeze",
    physics: "front",
    target: { x: 1.75, y: 1.75, r: 0.45 },
    text: "A tray of water goes into the freezer. Ice grows inward from every wall that touches something cold, at the same speed everywhere. The last drop to freeze traps a little air bubble. Right now all four walls are cold, so the bubble ends up in the middle.",
    goal: "Make the last drop freeze in the <b>top-right corner</b>, inside the red circle.",
    hint: "The ice should arrive at the top-right corner last, so it must start far away from it. Swap the <b>start</b> blocks on the top and right edges for the <b>slide along</b> blocks on the side.",
    start: () =>
      startWorkspace("front", [B.plate(2, 2, 12, 12), B.start("bottom"), B.start("left"), B.start("top"), B.start("right"), B.solve(), B.show()], [B.glide("top"), B.glide("right")]),
    check: (r) => r.physics === "front" && r.dim === "2D" && Math.hypot(r.last.x - 1.75, r.last.y - 1.75) <= 0.45,
    success:
      "The ice started at the bottom and left walls and met last in the top-right corner. The answer φ is the <b>arrival time</b> of the ice, and it's simply the distance to the nearest cold wall. Ice cubes, castings and even forest fires spread like this.",
  },
  {
    id: "free",
    title: "Free play",
    text: "You've got every block now. Build anything: a hot wire, a cold room, a swirly tank, ice growing on a long bar, a plate with three heaters... Try to surprise me!",
    goal: "No goal: experiment! Tip: <b>Save</b> keeps your blocks in a file.",
    hint: "Ideas: two heaters side by side. A long, thin plate cooled at one end. A flow where the top and bottom walls slide in opposite directions.",
    start: () => startWorkspace("heat", [B.plate(4, 2, 12, 6), B.temp("bottom", 100), B.air("top", 20, 10), B.solve(), B.show()]),
    check: null,
    success: "",
  },
];
