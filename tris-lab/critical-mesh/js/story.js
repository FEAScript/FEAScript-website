/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · story.js
 *  Cast, campaign (10 shifts + 3 engineering interludes) and dialogue
 * ════════════════════════════════════════════════════════════════
 *
 *  A dialogue line is [speaker, text] or [speaker, text, condition(flags)].
 *  "{target}" in a line is replaced by the shift's quota.
 */
"use strict";

const SPEAKERS = {
  eleni: { name: "ELENI MAKRI", role: "Chief Engineer", sprite: "eleni", cls: "" },
  mesh: { name: "MESH", role: "Plate monitor", sprite: "mesh", cls: "mesh" },
  meshAlarm: { name: "MESH", role: "Plate monitor", sprite: "meshAlarm", cls: "mesh" },
  voss: { name: "A. VOSS", role: "The Consortium", sprite: "voss", cls: "" },
  narr: { name: "ATHENS, 2089", role: "", sprite: "dome", cls: "narr" },
  news: { name: "ATHENS DAILY", role: "Morning edition", sprite: "news", cls: "news" },
};

// Physics colours of FEAScript, used to colour-code the interludes
const PHYSICS = {
  heat: { label: "HEAT CONDUCTION", model: "heatConductionScript", color: "#ff5c8d" },
  structure: { label: "BEAM BENDING", model: "eulerBernoulliBeamScript", color: "#2fcf93" },
  front: { label: "FRONT PROPAGATION", model: "frontPropagationScript", color: "#e6c230" },
  flow: { label: "CREEPING FLOW", model: "creepingFlowScript", color: "#5aa2ec" },
};

const CAMPAIGN = [
  // ───────────────────────────── 1
  {
    type: "shift",
    title: "Cold Start",
    blurb: "Your first night shift. Walk, roll, mount and deliver.",
    kBase: K_ALLOY, limitFactor: 1.25, mutateEvery: 0, target: 10, stars: [10, 18, 26],
    tools: {},
    tutorial: true,
    story: [
      ["narr", "Nine years after the Grid Collapse, Athens runs on a single machine: the Heatworks."],
      ["narr", "Under its glass dome lies the Plate, a 4 × 2 metre slab of alloy studded with thermo-cells. Each cell turns heat into power. Too much heat, and the Plate melts."],
      ["news", "HEATWORKS HITS NINE YEARS WITHOUT A BLACKOUT. City engineers hiring for the night shift."],
      ["narr", "Tonight is your first night shift."],
      ["eleni", "You must be the new night engineer. Eleni Makri, chief of the Heatworks. Don't touch anything shiny yet."],
      ["eleni", "That's the Plate. My father designed it the year the grid collapsed. We mount thermo-cells on it. Every cell makes power, and every cell pours heat into the alloy."],
      ["mesh", "GOOD EVENING. I AM MESH, THE PLATE MONITOR. AFTER EVERY CHANGE I SOLVE THE STEADY-STATE HEAT EQUATION ON 2145 FINITE ELEMENT NODES. IT TAKES ME ABOUT FIFTY MILLISECONDS."],
      ["eleni", "MESH is fast, and it never lies. Here's the routine: roll the die for a cell, carry it onto the Plate, and mount it. Walk with WASD or the arrow keys, mount with SPACE. Or just click where you want it."],
      ["eleni", "The coolant pipe holds the bottom edge at 20 °C. The top edge breathes into the air. The sides are insulated, so no heat escapes there."],
      ["eleni", "If any point passes the critical limit, the Plate melts and the shift is lost. Reach the quota, then press DELIVER. Keep rolling only if you're feeling lucky."],
      ["mesh", "MY EQUATION IS ON THE PANEL TO YOUR RIGHT: −∇·(k∇T) = Q. I SHOW k, T AND Q UNDER YOUR BOOTS. I KEEP FIELD NOTES ON EVERYTHING YOU MEET. PRESS N TO READ THEM WHEN YOU HAVE A SECOND. THE PLATE WAITS FOR YOU."],
    ],
    win: ["eleni", "Not bad for a first night. The Plate is still in one piece, and so are you."],
  },
  // ───────────────────────────── 2
  {
    type: "shift",
    title: "Hot Feet",
    blurb: "Heat wave: 40 °C air. The floor is the field; red cooks your boots.",
    kBase: K_ALLOY, limitFactor: 1, mutateEvery: 0, target: 14, stars: [14, 20, 25],
    airT: 40,
    tools: {},
    crates: { every: 3, pool: ["medkit"] },
    story: [
      ["news", "SUMMER HEAT WAVE: CITY DEMAND UP 30 %. Heatworks asked to raise output."],
      ["eleni", "Quota's up, and the air under the dome is 40 °C tonight. The top edge of the Plate convects into that air, so it sheds less heat than usual."],
      ["mesh", "BOUNDARY CONDITION UPDATED: TOP EDGE, CONVECTION h = 1 TO T∞ = 40 °C. THE FIELD WILL SHIFT ACCORDINGLY."],
      ["eleni", "And before you start: you walk on that Plate, and the Plate is hot. Your suit can take a lot, but not forever."],
      ["eleni", "Anything glowing red or brighter is above half the critical limit. Stand on it and your suit heats up. Fill the gauge and you'll be hauled out through the airlock, minus one heart."],
      ["mesh", "TEMPERATURE UNDER YOUR BOOTS IS READ FROM MY SOLUTION, INTERPOLATED BETWEEN NODES. I RECOMMEND NOT STANDING ON A CELL YOU HAVE JUST MOUNTED."],
      ["eleni", "Supply drones drop crates every few mounts. Tonight they carry suit patches: grab one and you get a heart back. Crates don't wait, so be quick."],
    ],
    win: ["eleni", "Boots still on, Plate still solid. You're getting the rhythm."],
  },
  // ───────────────────────────── 3
  {
    type: "shift",
    title: "The Cold Floor",
    blurb: "Brackets block the coolest spots. Save the floor for big rolls.",
    kBase: K_ALLOY, limitFactor: 1, mutateEvery: 0, target: 14, stars: [14, 20, 25],
    brackets: [[0.9, 0.3], [2.0, 0.3], [3.1, 0.3]],
    tools: {},
    crates: { every: 3, pool: ["medkit", "reroll"] },
    story: [
      ["eleni", "Did you notice? Cells near the coolant pipe run cold. Heat flows downhill, straight into the pipe."],
      ["eleni", "Cells near the top have nowhere to dump their heat. Same power, much higher temperature."],
      ["eleni", "Bad news: the day crew bolted three mounting brackets along the floor. Fewer cold spots tonight."],
      ["mesh", "RECOMMENDATION: SAVE COLD POSITIONS FOR HIGH ROLLS. A ROLL OF 6 PUTS SIX TIMES THE HEAT OF A ROLL OF 1 INTO THE PLATE."],
      ["eleni", "The day crew never bolts anything without a work order. I didn't sign one. Funny."],
    ],
    win: ["eleni", "You're learning to read the heat. That's the whole job, really."],
  },
  // ───────────────────────────── 4
  {
    type: "shift",
    title: "Fatigue",
    blurb: "The alloy starts to crack. Cracked metal traps heat.",
    kBase: K_ALLOY, limitFactor: 1, mutateEvery: 3, target: 12, stars: [12, 17, 22],
    tools: {},
    crates: { every: 3, pool: ["medkit", "reroll"] },
    story: [
      ["news", "COUNCIL VOTES 7–6: HEATWORKS MANAGEMENT HANDED TO THE CONSORTIUM FOR CIVIC ENERGY. 'A temporary measure,' says mayor."],
      ["voss", "Director Aurelian Voss, Consortium for Civic Energy. As of this morning, I oversee this facility."],
      ["voss", "The quota stays. The maintenance budget doesn't. Your Plate is old, engineer. Work around it."],
      ["mesh", "ALERT. ALLOY FATIGUE DETECTED. EVERY THIRD MOUNT, A ZONE OF THE PLATE WILL CRACK. CONDUCTIVITY INSIDE A CRACK DROPS TO 15 PERCENT."],
      ["eleni", "Cracked metal can't carry heat away. A cell sitting in a crack cooks itself. MESH marks where the next crack will form with an amber ring and counts down. Stay clear of it."],
    ],
    win: ["eleni", "Cracks every third mount... Twenty years on this Plate and it never fatigued that fast. Odd."],
  },
  // ───────────────────────────── 5
  {
    type: "shift",
    title: "The Welder",
    blurb: "Welding rods close cracks, if you dare to stand in the heat.",
    kBase: K_ALLOY, limitFactor: 1, mutateEvery: 3, target: 13, stars: [13, 18, 23],
    tools: { rod: 2 },
    crates: { every: 3, pool: ["rod", "medkit", "reroll"] },
    story: [
      ["eleni", "I raided my father's old locker. Welding rods. He used them to patch the Plate in the first winter after the Collapse."],
      ["eleni", "Stand inside a crack and press SPACE, or just click the crack. Hold still for two seconds and the crack is gone. Cracks love to form next to hot cells, so watch your suit."],
      ["mesh", "A WELDED ZONE RETURNS TO FULL CONDUCTIVITY. I WILL RE-SOLVE THE FIELD THE MOMENT THE WELD COOLS."],
      ["mesh", "PERSONAL NOTE: YANNIS MAKRI WROTE MY FIRST SOLVER. HE ALSO WELDED BADLY. HIS JOINTS ARE STILL IN MY LOGS."],
      ["eleni", "...He did. Get to work, both of you."],
    ],
    win: ["mesh", "NOTE: TONIGHT'S FATIGUE EVENTS DO NOT MATCH ANY KNOWN WEAR MODEL. LOGGING FOR LATER ANALYSIS."],
  },
  // ───────────────────────────── 6 · interlude: beam
  {
    type: "gantry",
    physics: "structure",
    title: "The Gantry",
    blurb: "Two props, a corroded beam, a 4 cm sag limit. Then walk it.",
    story: [
      ["eleni", "I ordered copper inlays for the Plate. Voss's people left the spools in the east store, on the far side of the old catwalk."],
      ["eleni", "That catwalk hangs over the coolant channel, bolted to the wall at one end and nothing at the other. It sags like a hammock."],
      ["mesh", "THE CATWALK IS A 4 METRE CANTILEVER WITH ITS OWN WEIGHT, AND A CORRODED SECTION BETWEEN 2.25 AND 3 METRES WHERE THE BENDING STIFFNESS EI DROPS TO A THIRD."],
      ["mesh", "I SOLVE IT AS AN EULER-BERNOULLI BEAM, EI(x) d⁴w/dx⁴ = q(x), WITH ONE LOAD CASE FOR EVERY POSITION YOU STAND ON."],
      ["eleni", "We have two steel props. The footings under the rusty section are gone, so no props there. If the catwalk sags more than 4 centimetres anywhere, you're swimming."],
      ["eleni", "Hint from an old engineer: the obvious spots aren't the best ones. Simulate first."],
    ],
  },
  // ───────────────────────────── 7
  {
    type: "shift",
    title: "Copper Veins",
    blurb: "Copper inlays spread heat. Lay them where it hurts.",
    kBase: K_ALLOY, limitFactor: 1, mutateEvery: 3, target: 14, stars: [14, 19, 24],
    tools: { copper: 2, rod: 1 },
    bonus: { flag: "gantryFirstTry", tool: "copper", note: "+1 copper (gantry crossed first try)" },
    crates: { every: 3, pool: ["copper", "medkit", "rod"] },
    story: [
      ["eleni", "Copper conducts heat five times better than our alloy. Lay an inlay under a hot cluster to spread the heat, or bridge a cell down toward the pipe."],
      ["eleni", "Laying one doesn't cost a turn. Click where you want it and you'll walk over and set it."],
      ["eleni", "You crossed that catwalk on the first try. I put the spare spool in your kit.", (f) => f.gantryFirstTry],
      ["mesh", "COPPER CONDUCTIVITY: 10. PLATE ALLOY: 2. I WILL ADD BOTH TO THE CONDUCTIVITY FIELD k(x, y)."],
      ["voss", "Copper. From whose budget, Chief Makri?"],
      ["eleni", "From mine, Director. The one you cut."],
    ],
    win: ["eleni", "Voss came down to the floor today. He never comes to the floor. He stood by the control terminal for an hour."],
  },
  // ───────────────────────────── 8
  {
    type: "shift",
    title: "Run the Numbers",
    blurb: "An old furnace squats mid-plate. Scan before you mount.",
    kBase: K_ALLOY, limitFactor: 1, mutateEvery: 3, target: 12, stars: [12, 17, 22],
    legacy: [[2.0, 1.0, 2]],
    tools: { scan: 3, copper: 1, rod: 1 },
    crates: { every: 3, pool: ["scan", "medkit", "rod"] },
    story: [
      ["news", "CONSORTIUM UNVEILS 'HELIOS', A PRIVATE REACTOR FOR ATHENS. 'The Heatworks is a relic,' says Director Voss."],
      ["voss", "We salvaged an old furnace from the east wing. It stays bolted to the middle of your Plate. It makes no power for you. Only heat."],
      ["eleni", "He's dumping a furnace onto a fatigued Plate. Brilliant."],
      ["mesh", "NEW PERMISSION: FEA SCAN. BEFORE YOU MOUNT, I CAN SOLVE A WHAT-IF CASE AND REPORT THE PEAK TEMPERATURE. THREE SCANS AVAILABLE."],
      ["eleni", "Engineers don't guess. They simulate. Use the scans when the roll is big and the Plate is crowded."],
    ],
    win: ["eleni", "Rookie... MESH sent me its fatigue log. The cracks aren't random. Someone is writing them into the Plate's control firmware. Keep this between us."],
  },
  // ───────────────────────────── 9 · interlude: front propagation
  {
    type: "pour",
    physics: "front",
    title: "Cold Pour",
    blurb: "The new plate is cast on site. Make the riser freeze last.",
    story: [
      ["narr", "At dawn a Consortium truck backs into the Heatworks with a ladle of molten alloy. Voss has ordered a new Plate, cast on site, tonight."],
      ["eleni", "Cheap alloy, rushed pour. If we have to live with it, at least let's cast it properly."],
      ["eleni", "Metal shrinks as it freezes. Whatever freezes last ends up full of holes: porosity. The riser on the mould is there to take that hit. Make the riser the last thing to freeze."],
      ["mesh", "SOLIDIFICATION FRONT: EIKONAL EQUATION |∇φ| = 1. φ IS THE TIME AT WHICH EACH POINT FREEZES. CHILLED MOULD WALLS START THE FRONT."],
      ["mesh", "I CAN SIMULATE THREE POURS BEFORE THE ALLOY COOLS. THEN YOU CAST FOR REAL."],
    ],
  },
  // ───────────────────────────── 10
  {
    type: "shift",
    title: "Alone on the Night Shift",
    blurb: "Eleni is suspended. A brittle new Plate with a pipe through it (Gmsh mesh).",
    kBase: 1.4, limitFactor: 1.45, mutateEvery: 3, target: 12, stars: [12, 16, 21],
    preWeak: [[2.4, 0.7]],
    porosityFromPour: true,
    pipe: true,
    tools: { copper: 2, scan: 2, reroll: 1, rod: 1, vent: 1 },
    crates: { every: 3, pool: ["copper", "medkit", "rod", "scan"] },
    story: [
      ["news", "HEATWORKS CHIEF SUSPENDED FOR 'INSUBORDINATION'. Director Voss: 'Sentiment is not engineering.'"],
      ["voss", "Chief Makri has been relieved of duty. You report to me now, engineer. And to the quota."],
      ["mesh", "PRIVATE CHANNEL. ELENI ASKED ME TO LOOK AFTER YOU. I SOLVE PDES. I AM NOT SURE HOW TO LOOK AFTER PEOPLE. I WILL TRY."],
      ["mesh", "THE NEW ALLOY CONDUCTS 1.4 INSTEAD OF 2. EVERY CELL RUNS HOTTER. CRITICAL LIMIT RAISED FOR THIS ALLOY. ONE CRACK WAS ALREADY IN THE CASTING."],
      ["mesh", "THE NEW PLATE HAS A COOLANT BYPASS PIPE DRILLED THROUGH IT. ITS WALL STAYS AT COOLANT TEMPERATURE: A COLD ISLAND IN THE MIDDLE OF THE ALLOY."],
      ["mesh", "A PLATE WITH A HOLE IS NOT A RECTANGLE, SO I IMPORTED A GMSH MESH: QUADRATIC QUADRILATERALS, FIVE BOUNDARIES. THE PIPE WALL IS BOUNDARY 4."],
      ["mesh", "YOUR POUR LEFT POROSITY WHERE THE CASTING FROZE LAST. I HAVE MARKED IT AS A SECOND CRACK.", (f) => !f.pourOk],
      ["mesh", "YOUR POUR WAS CLEAN. THE RISER TOOK ALL THE POROSITY. ELENI WOULD SAY: GOOD WORK.", (f) => f.pourOk],
      ["mesh", "ELENI LEFT YOU A SIDE VENT KEY. WALK TO THE LEFT OR RIGHT WALL AND OPEN IT: THAT INSULATED EDGE BECOMES A CONVECTIVE BOUNDARY. I WILL REBUILD THE MODEL. ONE KEY ONLY."],
    ],
    win: ["mesh", "SHIFT COMPLETE. ELENI SENT A MESSAGE THROUGH MY MAINTENANCE PORT: 'TELL THE ROOKIE I SAW. MEET ME IN THE PUMP ROOM.'"],
  },
  // ───────────────────────────── 11 · interlude: creeping flow
  {
    type: "pump",
    physics: "flow",
    title: "Pump Room",
    blurb: "Flush the clogs in the coolant manifold. Stokes flow.",
    story: [
      ["narr", "Under the Heatworks, in the humming dark of the pump room, Eleni is waiting with a torch and a stack of printouts."],
      ["eleni", "I'm not supposed to be here, so let's be quick. Someone dumped debris into the coolant manifold. Two clogs. If they stay, the pipe starves and the Plate cooks."],
      ["eleni", "The manifold walls are belt rollers. Drive them and the coolant moves. It's thick and slow down here, so it's pure Stokes flow: no inertia, perfectly predictable."],
      ["mesh", "CREEPING FLOW. I SOLVE VELOCITY AND PRESSURE TOGETHER ON TAYLOR-HOOD ELEMENTS. THE PUMPS CAN DRIVE AT MOST TWO WALLS AT ONCE."],
      ["eleni", "Flush both clogs and I'll get you a spare coolant cartridge for tomorrow. You'll need it."],
    ],
  },
  // ───────────────────────────── 12
  {
    type: "shift",
    title: "Coolant Reserve",
    blurb: "The cracks are hunting your hottest cell.",
    kBase: K_ALLOY, limitFactor: 1.1, mutateEvery: 2, targeted: true, target: 12, stars: [12, 16, 20],
    coolantT: (f) => (f.pumpOk ? T_AMB : 45),
    tools: { coolant: 1, reroll: 2, scan: 2, copper: 1, rod: 1, vent: 1 },
    bonus: { flag: "pumpOk", tool: "coolant", note: "+1 coolant (pump room flushed)" },
    crates: { every: 3, pool: ["rod", "medkit", "coolant", "scan"] },
    story: [
      ["mesh", "PRIVATE CHANNEL. I HAVE TRACED THE FATIGUE COMMANDS. THEY ORIGINATE FROM THE DIRECTOR'S TERMINAL."],
      ["eleni", "So it's Voss. If the Plate melts, the city blames public engineering, and the council buys HELIOS. He needs a meltdown, and he needs it on our watch."],
      ["mesh", "THE SABOTAGE HAS ESCALATED. CRACKS NOW FORM EVERY 2 MOUNTS AND TARGET THE HOTTEST CELL ON THE PLATE. THE RING TURNS RED WHEN IT IS AIMED."],
      ["eleni", "Then we don't give him one. The coolant cartridge flash-freezes the strongest cell. You lose its output, but it might save the Plate."],
      ["eleni", "The pump room is flushed. There's a second cartridge in your kit.", (f) => f.pumpOk],
      ["mesh", "THE MANIFOLD IS STILL HALF-BLOCKED. COOLANT REACHES THE PLATE AT 45 °C INSTEAD OF 20. THE BOTTOM BOUNDARY CONDITION IS WARMER: EVERYTHING RUNS HOTTER.", (f) => !f.pumpOk],
    ],
    win: ["eleni", "We have the logs now. Tomorrow is the festival. Voss will try one last time, in front of the whole city."],
  },
  // ───────────────────────────── 13
  {
    type: "shift",
    title: "Critical Mesh",
    blurb: "Festival night. Everything at once. Light up Athens.",
    kBase: K_ALLOY, limitFactor: 1.1, mutateEvery: 3, targeted: true, target: 13, stars: [13, 17, 21],
    brackets: [[1.2, 0.3], [2.8, 0.3]],
    preWeak: [[2.0, 1.4]],
    legacy: [[0.6, 1.4, 2]],
    airT: 30,
    tools: { coolant: 1, copper: 2, scan: 2, reroll: 1, rod: 2, vent: 1 },
    crates: { every: 3, pool: ["medkit", "rod", "copper", "scan"] },
    story: [
      ["news", "FESTIVAL OF LIGHTS TONIGHT. Every district on the grid. Council to vote on HELIOS at midnight."],
      ["narr", "Festival night. Every light in Athens is on, every grid in the city leans on the Heatworks, and the dome is a warm 30 °C."],
      ["voss", "The whole city is watching tonight, engineer. I need {target} megawatts from your Plate. Anything less, and the council will know exactly who failed them."],
      ["eleni", "Brackets on the floor. Cracks everywhere. His furnace in the corner. Fatigue every three mounts, aimed at your hottest cell. He's built the perfect meltdown."],
      ["mesh", "PROBABILITY OF SUCCESS: NOT COMPUTED. I ONLY SOLVE PARTIAL DIFFERENTIAL EQUATIONS. BUT I HAVE WATCHED YOU WORK."],
      ["eleni", "Everything you've learned, rookie. Read the heat. Run the numbers. Don't get greedy. Let's light up Athens."],
    ],
    win: ["eleni", "Look at that skyline. Every light is on."],
  },
];

const ENDING = [
  ["narr", "At midnight the festival lights are still burning. Under the dome, the Plate glows orange: steady, whole, and holding."],
  ["mesh", "FATIGUE LOG. FIRMWARE TRACES. DIRECTOR'S TERMINAL ID. TRANSMITTED TO THE CITY COUNCIL. TRANSMITTED TO THE PRESS. TRANSMITTED TO EVERYONE."],
  ["voss", "This is... a misunderstanding. The Consortium will... I need to make a call."],
  ["eleni", "Make it from the lobby, Director. Security is waiting for you there."],
  ["news", "HELIOS VOTE CANCELLED. CONSORTIUM DIRECTOR ARRESTED. 'The Heatworks stays public,' says reinstated chief Eleni Makri."],
  ["eleni", "Go home and get some sleep, Chief Engineer. Yes, that's you now. I'm taking a desk job: someone has to rewrite the firmware."],
  ["mesh", "YANNIS MAKRI'S LAST COMMENT IN MY SOURCE CODE SAYS: 'KEEP THE CITY WARM, NOT HOT.' I THINK YOU UNDERSTOOD IT. STEADY STATE REACHED."],
];

const MELTDOWN_QUOTES = [
  ["eleni", "Well, that's a puddle. We'll scrape the slag off and try again."],
  ["eleni", "Every engineer melts one Plate. Some of us melt a dozen. Again."],
  ["mesh", "PEAK TEMPERATURE EXCEEDED THE CRITICAL LIMIT. I DID SOLVE IT CORRECTLY, FOR THE RECORD."],
  ["eleni", "Greed is a heat source too, rookie. Bank earlier next time."],
];

const EVAC_QUOTES = [
  ["eleni", "Three times through the airlock? Your boots are toast. Go to the infirmary and try that shift again."],
  ["mesh", "SUIT INTEGRITY LOST. RECOMMENDATION: STAND ON BLUE, NOT ON WHITE."],
];

const TOOL_INFO = {
  copper: { name: "COPPER", sprite: "copper", help: "Click where to lay a copper inlay (k = 10). You'll walk there and lay it. SPACE lays it where you stand." },
  scan: { name: "FEA SCAN", sprite: "scan", help: "Click a spot: MESH solves a what-if case and reports the peak temperature, without mounting." },
  coolant: { name: "COOLANT", sprite: "coolant", help: "Flash-freeze the strongest cell on the Plate. It is removed." },
  reroll: { name: "RE-ROLL", sprite: "reroll", help: "Roll the die again for the cell you are carrying." },
  rod: { name: "WELD", sprite: "rod", help: "Stand inside a crack and press SPACE (or click the crack) to weld it shut. Takes 2 s; moving cancels." },
  vent: { name: "SIDE VENT", sprite: "vent", help: "Stand next to the left or right wall and use it: that insulated edge becomes a convective edge (h = 3) for the rest of the shift." },
};
const TOOL_ORDER = ["copper", "scan", "coolant", "reroll", "rod", "vent"];

const CRATE_ITEMS = {
  copper: { label: "+1 COPPER", sprite: "copper" },
  scan: { label: "+1 FEA SCAN", sprite: "scan" },
  coolant: { label: "+1 COOLANT", sprite: "coolant" },
  reroll: { label: "+1 RE-ROLL", sprite: "reroll" },
  rod: { label: "+1 WELDING ROD", sprite: "rod" },
  medkit: { label: "SUIT PATCHED", sprite: "medkit" },
};
