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
  ella: { name: "ELLA MENTZ", role: "Chief Engineer", sprite: "ella", cls: "" },
  tri: { name: "TRI", role: "Physics guide", sprite: "tri", cls: "" },
  mesh: { name: "MESH", role: "Plate monitor", sprite: "mesh", cls: "mesh" },
  meshAlarm: { name: "MESH", role: "Plate monitor", sprite: "meshAlarm", cls: "mesh" },
  diverge: { name: "M. DI VERGE", role: "The Consortium", sprite: "diverge", cls: "" },
  narr: { name: "NODESSA, 2089", role: "Narrator", sprite: "dome", cls: "narr" },
  news: { name: "NODESSA DAILY", role: "Morning edition", sprite: "news", cls: "news" },
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
      ["narr", "Nine years after the Grid Collapse, Nodessa runs on a single machine: the Heatworks."],
      ["narr", "Under its glass dome lies the Plate, a 40 × 20 metre slab of alloy studded with thermo-cells. Each cell turns heat into power. Too much heat, and the Plate melts."],
      ["news", "HEATWORKS HITS NINE YEARS WITHOUT A BLACKOUT. City engineers hiring for the night shift."],
      ["narr", "Tonight is your first night shift."],
      ["ella", "You must be the new night engineer. Ella Mentz, chief of the Heatworks. Don't touch anything shiny yet."],
      ["ella", "That's the Plate. My father designed it the year the grid collapsed. We mount thermo-cells on it. Every cell makes power, and every cell pours heat into the alloy."],
      ["mesh", "GOOD EVENING. I AM MESH, THE PLATE MONITOR. AFTER EVERY CHANGE I SOLVE THE STEADY-STATE HEAT EQUATION ON 2145 FINITE ELEMENT NODES. IT TAKES ME ABOUT FIFTY MILLISECONDS."],
      ["tri", "Hi! I'm Tri, the FEAScript triangle robot. And no, I'm not a tortilla chip, whatever the night crew says. Gale Mentz built me to explain the physics: MESH does the maths, I tell you what it means."],
      ["ella", "MESH is fast, and it never lies. And Tri is... well, Tri is Tri. Mention heat and you'll get a lecture."],
      ["mesh", "THE ROUTINE: ROLL THE DIE FOR A CELL, CARRY IT ONTO THE PLATE, MOUNT IT. WALK WITH WASD OR THE ARROW KEYS, MOUNT WITH SPACE, OR CLICK WHERE YOU WANT IT."],
      ["tri", "The coolant pipe holds the bottom edge at 20 °C. The top edge breathes into the air. The sides are insulated, so no heat escapes there."],
      ["mesh", "IF ANY POINT PASSES THE CRITICAL LIMIT, THE PLATE MELTS AND THE SHIFT IS LOST. REACH THE QUOTA, THEN PRESS DELIVER, OR KEEP ROLLING FOR MORE STARS."],
      ["tri", "The equation is on the panel to your right: −∇·(k∇T) = Q. Q is the heat your cells pour in, k is how easily the alloy passes it on, and T is the temperature you get. The panel shows all three under your boots. I keep Field Notes on everything you meet: press N to read them."],
      ["tri", "Isn't it beautiful? One equation for the whole Plate!"],
      ["mesh", "IT IS 2145 EQUATIONS. ONE PER NODE. I COUNTED."],
    ],
    win: ["ella", "Not bad for a first night. The Plate is still in one piece, and so are you."],
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
      ["ella", "Quota's up, and the air under the dome is 40 °C tonight."],
      ["tri", "The top edge of the Plate convects into that air, so it sheds less heat than usual."],
      ["mesh", "BOUNDARY CONDITION UPDATED: TOP EDGE, CONVECTION h = 0.1 TO T∞ = 40 °C. THE FIELD WILL SHIFT ACCORDINGLY."],
      ["ella", "And before you start: you walk on that Plate, and the Plate is hot. Your suit can take a lot, but not forever."],
      ["mesh", "SUIT WARNING: METAL ABOVE HALF THE CRITICAL LIMIT GLOWS RED. STAND ON IT AND YOUR SUIT HEATS UP. A FULL GAUGE MEANS EVACUATION THROUGH THE AIRLOCK, MINUS ONE HEART."],
      ["tri", "MESH computes the temperature at its nodes. Under your boots it blends the nearest nodes together: that's interpolation."],
      ["mesh", "TECHNICALLY, A QUADRATIC SHAPE FUNCTION."],
      ["tri", "That's what I said, just with fewer capital letters."],
      ["mesh", "I RECOMMEND NOT STANDING ON A CELL YOU HAVE JUST MOUNTED. IT IS THE HOTTEST SPOT AROUND."],
      ["mesh", "SUPPLY DRONES DROP CRATES EVERY FEW MOUNTS. TONIGHT THEY CARRY SUIT PATCHES: ONE HEART EACH. CRATES DO NOT WAIT."],
    ],
    win: ["ella", "Boots still on, Plate still solid. You're getting the rhythm."],
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
      ["tri", "Did you notice? Cells near the coolant pipe run cold. Heat flows downhill, straight into the pipe."],
      ["tri", "Cells near the top have nowhere to dump their heat. Same power, much higher temperature."],
      ["ella", "Bad news: the day crew bolted three mounting brackets along the floor. Fewer cold spots tonight."],
      ["tri", "The heat equation is linear: a roll of 6 puts six times the heat of a roll of 1 into the Plate."],
      ["mesh", "RECOMMENDATION: SAVE COLD POSITIONS FOR HIGH ROLLS."],
      ["tri", "It's superposition, really: the heat fields of all your cells simply add up."],
      ["mesh", "OR YOU CAN LET ME ADD THEM UP. I AM FASTER."],
      ["ella", "The day crew never bolts anything without a work order. I didn't sign one. Funny."],
    ],
    win: ["ella", "You're learning to read the heat. That's the whole job, really."],
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
      ["diverge", "Director Max Di Verge, Consortium for Civic Energy. As of this morning, I oversee this facility."],
      ["diverge", "The quota stays. The maintenance budget doesn't. Your Plate is old, engineer. Work around it."],
      ["mesh", "ALERT. ALLOY FATIGUE DETECTED. EVERY THIRD MOUNT, A ZONE OF THE PLATE WILL CRACK. CONDUCTIVITY INSIDE A CRACK DROPS TO 15 PERCENT."],
      ["tri", "Cracked metal can't carry heat away, so a cell sitting in a crack cooks itself."],
      ["mesh", "I MARK WHERE THE NEXT CRACK WILL FORM WITH AN AMBER RING AND COUNT DOWN THE MOUNTS. STAY CLEAR OF IT."],
      ["tri", "A crack is only a patch of low k. Fascinating, really."],
      ["mesh", "IT IS NOT FASCINATING. IT IS A FIRE HAZARD."],
    ],
    win: ["ella", "Cracks every third mount... Twenty years on this Plate and it never fatigued that fast. Odd."],
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
      ["ella", "I raided my father's old locker. Welding rods. He used them to patch the Plate in the first winter after the Collapse."],
      ["mesh", "WELDING: STAND INSIDE A CRACK AND PRESS SPACE, OR CLICK THE CRACK. HOLD STILL FOR TWO SECONDS. CRACKS TEND TO FORM NEXT TO HOT CELLS: WATCH YOUR SUIT."],
      ["mesh", "A WELDED ZONE RETURNS TO FULL CONDUCTIVITY. I WILL RE-SOLVE THE FIELD THE MOMENT THE WELD COOLS."],
      ["mesh", "PERSONAL NOTE: GALE MENTZ WROTE MY FIRST SOLVER. HE ALSO WELDED BADLY. HIS JOINTS ARE STILL IN MY LOGS."],
      ["ella", "...He did. Get to work, both of you."],
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
      ["ella", "I ordered copper inlays for the Plate. Di Verge's people left the spools in the east store, on the far side of the old catwalk."],
      ["ella", "That catwalk hangs over the coolant channel, bolted to the wall at one end and nothing at the other. It sags like a hammock."],
      ["tri", "The catwalk is a 4 metre cantilever: fixed at the wall, free at the end, sagging under its own weight. Between 2.25 and 3 metres it's corroded, so its bending stiffness EI drops to a third."],
      ["tri", "MESH treats it as an Euler-Bernoulli beam, EI(x) d⁴w/dx⁴ = q(x): w is the sag, q is the load. It solves one load case for every spot you stand on."],
      ["tri", "Fun fact: Euler and Bernoulli worked this out in the 1700s!"],
      ["mesh", "FUN FACT: THEY DID NOT HAVE TO WALK ON IT."],
      ["mesh", "TWO STEEL PROPS AVAILABLE. THE RUSTY SECTION HAS NO FOOTINGS. IF THE CATWALK SAGS MORE THAN 4 CENTIMETRES ANYWHERE, YOU FALL IN."],
      ["ella", "Hint from an old engineer: the obvious spots aren't the best ones. Simulate first."],
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
      ["tri", "Copper conducts heat five times better than our alloy, so an inlay spreads the heat of a hot cluster, or leads a cell's heat down toward the pipe."],
      ["mesh", "LAYING AN INLAY DOES NOT COST A TURN. CLICK WHERE YOU WANT IT."],
      ["ella", "You crossed that catwalk on the first try. I put the spare spool in your kit.", (f) => f.gantryFirstTry],
      ["tri", "In the equation, copper only changes k: 10 instead of the alloy's 2. MESH adds every inlay to the conductivity field k(x, y) and solves again."],
      ["diverge", "Copper. From whose budget, Chief Mentz?"],
      ["ella", "From mine, Director. The one you cut."],
    ],
    win: ["ella", "Di Verge came down to the floor today. He never comes to the floor. He stood by the control terminal for an hour."],
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
      ["news", "CONSORTIUM UNVEILS 'SINGULARITY', A PRIVATE REACTOR FOR NODESSA. 'The Heatworks is a relic,' says Director Di Verge."],
      ["diverge", "We salvaged an old furnace from the east wing. It stays bolted to the middle of your Plate. It makes no power for you. Only heat."],
      ["ella", "He's dumping a furnace onto a fatigued Plate. Brilliant."],
      ["mesh", "NEW PERMISSION: FEA SCAN. BEFORE YOU MOUNT, I CAN SOLVE A WHAT-IF CASE AND REPORT THE PEAK TEMPERATURE. THREE SCANS AVAILABLE."],
      ["ella", "Engineers don't guess. They simulate. Use the scans when the roll is big and the Plate is crowded."],
    ],
    win: ["ella", "Rookie... MESH sent me its fatigue log. The cracks aren't random. Someone is writing them into the Plate's control firmware. Keep this between us."],
  },
  // ───────────────────────────── 9 · interlude: front propagation
  {
    type: "pour",
    physics: "front",
    title: "Cold Pour",
    blurb: "The new plate is cast on site. Make the riser freeze last.",
    story: [
      ["narr", "At dawn a Consortium truck backs into the Heatworks with a ladle of molten alloy. Di Verge has ordered a new Plate, cast on site, tonight."],
      ["ella", "Cheap alloy, rushed pour. If we have to live with it, at least let's cast it properly."],
      ["tri", "Metal shrinks as it freezes. Whatever freezes last ends up full of holes: porosity. The riser on the mould is there to take that hit. Make the riser the last thing to freeze."],
      ["tri", "The freezing front follows the eikonal equation, |∇φ| = 1, where φ is the time each point freezes. The chilled mould walls freeze first and the front moves in from there."],
      ["mesh", "I CAN SIMULATE THREE POURS BEFORE THE ALLOY COOLS. THEN YOU CAST FOR REAL."],
    ],
  },
  // ───────────────────────────── 10
  {
    type: "shift",
    title: "Alone on the Night Shift",
    blurb: "Ella is suspended. A brittle new Plate with a pipe through it (Gmsh mesh).",
    kBase: 1.4, limitFactor: 1.45, mutateEvery: 3, target: 12, stars: [12, 16, 21],
    preWeak: [[2.4, 0.7]],
    porosityFromPour: true,
    pipe: true,
    tools: { copper: 2, scan: 2, reroll: 1, rod: 1, vent: 1 },
    crates: { every: 3, pool: ["copper", "medkit", "rod", "scan"] },
    story: [
      ["news", "HEATWORKS CHIEF SUSPENDED FOR 'INSUBORDINATION'. Director Di Verge: 'Sentiment is not engineering.'"],
      ["diverge", "Chief Mentz has been relieved of duty. You report to me now, engineer. And to the quota."],
      ["mesh", "PRIVATE CHANNEL. ELLA ASKED ME TO LOOK AFTER YOU. I SOLVE PDES. I AM NOT SURE HOW TO LOOK AFTER PEOPLE. I WILL TRY."],
      ["mesh", "THE NEW ALLOY CONDUCTS 1.4 INSTEAD OF 2. EVERY CELL RUNS HOTTER. CRITICAL LIMIT RAISED FOR THIS ALLOY. ONE CRACK WAS ALREADY IN THE CASTING."],
      ["tri", "The new Plate has a coolant bypass pipe drilled through it. Its wall stays at coolant temperature: a cold island in the middle of the alloy."],
      ["tri", "A plate with a hole isn't a rectangle, so MESH imported a Gmsh mesh: quadratic quadrilaterals and five boundaries. The pipe wall is boundary 4."],
      ["mesh", "YOUR POUR LEFT POROSITY WHERE THE CASTING FROZE LAST. I HAVE MARKED IT AS A SECOND CRACK.", (f) => !f.pourOk],
      ["mesh", "YOUR POUR WAS CLEAN. THE RISER TOOK ALL THE POROSITY. ELLA WOULD SAY: GOOD WORK.", (f) => f.pourOk],
      ["mesh", "ELLA LEFT YOU A SIDE VENT KEY. WALK TO THE LEFT OR RIGHT WALL AND OPEN IT: THAT INSULATED EDGE BECOMES A CONVECTIVE BOUNDARY. I WILL REBUILD THE MODEL. ONE KEY ONLY."],
    ],
    win: ["mesh", "SHIFT COMPLETE. ELLA SENT A MESSAGE THROUGH MY MAINTENANCE PORT: 'TELL THE ROOKIE I SAW. MEET ME IN THE PUMP ROOM.'"],
  },
  // ───────────────────────────── 11 · interlude: creeping flow
  {
    type: "pump",
    physics: "flow",
    title: "Pump Room",
    blurb: "Flush the clogs in the coolant manifold. Stokes flow.",
    story: [
      ["narr", "Under the Heatworks, in the humming dark of the pump room, Ella is waiting with a torch and a stack of printouts."],
      ["ella", "I'm not supposed to be here, so let's be quick. Someone dumped debris into the coolant manifold. Two clogs. If they stay, the pipe starves and the Plate cooks."],
      ["tri", "The manifold walls are belt rollers. Drive them and the coolant moves. It's thick and slow down here, so it's pure Stokes flow: no inertia, perfectly predictable."],
      ["tri", "This is creeping flow: MESH solves velocity and pressure together on Taylor-Hood elements."],
      ["mesh", "PUMP LIMIT: AT MOST TWO WALLS CAN BE DRIVEN AT ONCE."],
      ["tri", "Down here the coolant is thick and slow: perfect Stokes flow!"],
      ["mesh", "IT IS THICK BECAUSE NOBODY HAS CLEANED THIS ROOM SINCE THE GRID COLLAPSE."],
      ["ella", "Flush both clogs and I'll get you a spare coolant cartridge for tomorrow. You'll need it."],
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
      ["ella", "So it's Di Verge. If the Plate melts, the city blames public engineering, and the council buys SINGULARITY. He needs a meltdown, and he needs it on our watch."],
      ["mesh", "THE SABOTAGE HAS ESCALATED. CRACKS NOW FORM EVERY 2 MOUNTS AND TARGET THE HOTTEST CELL ON THE PLATE. THE RING TURNS RED WHEN IT IS AIMED."],
      ["ella", "Then we don't give him one."],
      ["mesh", "COOLANT CARTRIDGE: FLASH-FREEZES THE STRONGEST CELL ON THE PLATE. YOU LOSE ITS OUTPUT, BUT IT MAY SAVE THE PLATE."],
      ["ella", "The pump room is flushed. There's a second cartridge in your kit.", (f) => f.pumpOk],
      ["mesh", "THE MANIFOLD IS STILL HALF-BLOCKED. COOLANT REACHES THE PLATE AT 45 °C INSTEAD OF 20. THE BOTTOM BOUNDARY CONDITION IS WARMER: EVERYTHING RUNS HOTTER.", (f) => !f.pumpOk],
    ],
    win: ["ella", "We have the logs now. Tomorrow is the festival. Di Verge will try one last time, in front of the whole city."],
  },
  // ───────────────────────────── 13
  {
    type: "shift",
    title: "Critical Mesh",
    blurb: "Festival night. Everything at once. Light up Nodessa.",
    kBase: K_ALLOY, limitFactor: 1.1, mutateEvery: 3, targeted: true, target: 13, stars: [13, 17, 21],
    brackets: [[1.2, 0.3], [2.8, 0.3]],
    preWeak: [[2.0, 1.4]],
    legacy: [[0.6, 1.4, 2]],
    airT: 30,
    tools: { coolant: 1, copper: 2, scan: 2, reroll: 1, rod: 2, vent: 1 },
    crates: { every: 3, pool: ["medkit", "rod", "copper", "scan"] },
    story: [
      ["news", "FESTIVAL OF LIGHTS TONIGHT. Every district on the grid. Council to vote on SINGULARITY at midnight."],
      ["narr", "Festival night. Every light in Nodessa is on, every grid in the city leans on the Heatworks, and the dome is a warm 30 °C."],
      ["diverge", "The whole city is watching tonight, engineer. I need {target} megawatts from your Plate. Anything less, and the council will know exactly who failed them."],
      ["ella", "Brackets on the floor. Cracks everywhere. His furnace in the corner. Fatigue every three mounts, aimed at your hottest cell. He's built the perfect meltdown."],
      ["mesh", "PROBABILITY OF SUCCESS: NOT COMPUTED. I ONLY SOLVE PARTIAL DIFFERENTIAL EQUATIONS. BUT I HAVE WATCHED YOU WORK."],
      ["ella", "Everything you've learned, rookie. Read the heat. Run the numbers. Don't get greedy. Let's light up Nodessa."],
    ],
    win: ["ella", "Look at that skyline. Every light is on."],
  },
];

const ENDING = [
  ["narr", "At midnight the festival lights are still burning. Under the dome, the Plate glows orange: steady, whole, and holding."],
  ["mesh", "FATIGUE LOG. FIRMWARE TRACES. DIRECTOR'S TERMINAL ID. TRANSMITTED TO THE CITY COUNCIL. TRANSMITTED TO THE PRESS. TRANSMITTED TO EVERYONE."],
  ["diverge", "This is... a misunderstanding. The Consortium will... I need to make a call."],
  ["ella", "Make it from the lobby, Director. Security is waiting for you there."],
  ["news", "SINGULARITY VOTE CANCELLED. CONSORTIUM DIRECTOR ARRESTED. 'The Heatworks stays public,' says reinstated chief Ella Mentz."],
  ["ella", "Go home and get some sleep, Chief Engineer. Yes, that's you now. I'm taking a desk job: someone has to rewrite the firmware."],
  ["mesh", "GALE MENTZ'S LAST COMMENT IN MY SOURCE CODE SAYS: 'KEEP THE CITY WARM, NOT HOT.' I THINK YOU UNDERSTOOD IT. STEADY STATE REACHED."],
  ["tri", "Steady state. My favourite kind of state."],
];

const MELTDOWN_QUOTES = [
  ["ella", "Well, that's a puddle. We'll scrape the slag off and try again."],
  ["ella", "Every engineer melts one Plate. Some of us melt a dozen. Again."],
  ["mesh", "PEAK TEMPERATURE EXCEEDED THE CRITICAL LIMIT. I DID SOLVE IT CORRECTLY, FOR THE RECORD."],
  ["ella", "Greed is a heat source too, rookie. Bank earlier next time."],
];

const EVAC_QUOTES = [
  ["ella", "Three times through the airlock? Your boots are toast. Go to the infirmary and try that shift again."],
  ["mesh", "SUIT INTEGRITY LOST. RECOMMENDATION: STAND ON BLUE, NOT ON WHITE."],
];

const TOOL_INFO = {
  copper: { name: "COPPER", sprite: "copper", help: "Click where to lay a copper inlay (k = 10). You'll walk there and lay it. SPACE lays it where you stand." },
  scan: { name: "FEA SCAN", sprite: "scan", help: "Click a spot: MESH solves a what-if case and reports the peak temperature, without mounting." },
  coolant: { name: "COOLANT", sprite: "coolant", help: "Flash-freeze the strongest cell on the Plate. It is removed." },
  reroll: { name: "RE-ROLL", sprite: "reroll", help: "Roll the die again for the cell you are carrying." },
  rod: { name: "WELD", sprite: "rod", help: "Stand inside a crack and press SPACE (or click the crack) to weld it shut. Takes 2 s; moving cancels." },
  vent: { name: "SIDE VENT", sprite: "vent", help: "Stand next to the left or right wall and use it: that insulated edge becomes a convective edge (h = 0.3) for the rest of the shift." },
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
