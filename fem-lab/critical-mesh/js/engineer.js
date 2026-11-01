/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · engineer.js
 *  The player character: walks on the Plate, carries cells, welds
 *  cracks and picks up crates. The FEA temperature field is the
 *  terrain: standing on hot metal heats the suit.
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

const KEYS = new Set();

const Engineer = {
  x: ENGINEER.hatch.x,
  y: ENGINEER.hatch.y,
  facing: 1,
  moving: false,
  walkT: 0,
  target: null, // { x, y, action } for click-to-move
  suit: 0, // 0..1, overheats at 1
  hearts: 3,
  maxHearts: 3,
  stun: 0,
  invuln: 0,
  weld: null, // { crack, t }
  feetT: T_AMB,
  stepTimer: 0,

  reset(hearts) {
    this.x = ENGINEER.hatch.x;
    this.y = ENGINEER.hatch.y;
    this.facing = 1;
    this.target = null;
    this.suit = 0;
    this.hearts = hearts;
    this.maxHearts = hearts;
    this.stun = 0;
    this.invuln = 0;
    this.weld = null;
  },

  walkTo(x, y, action = null) {
    this.target = { x: clampX(x), y: clampY(y), action };
    this.weld = null;
  },

  update(dt) {
    if (this.stun > 0) {
      this.stun -= dt;
      this.moving = false;
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);

    // Keyboard movement overrides click-to-move
    let dx = 0;
    let dy = 0;
    if (KEYS.has("arrowleft") || KEYS.has("a")) dx -= 1;
    if (KEYS.has("arrowright") || KEYS.has("d")) dx += 1;
    if (KEYS.has("arrowup") || KEYS.has("w")) dy += 1;
    if (KEYS.has("arrowdown") || KEYS.has("s")) dy -= 1;
    if (dx || dy) {
      this.target = null;
      this.weld = null;
    } else if (this.target) {
      const tx = this.target.x - this.x;
      const ty = this.target.y - this.y;
      const dist = Math.hypot(tx, ty);
      if (dist < 0.03) {
        const action = this.target.action;
        this.target = null;
        if (action) Game.engineerArrived(action);
      } else {
        dx = tx / dist;
        dy = ty / dist;
        const step = ENGINEER.speed * dt;
        if (step > dist) {
          dx *= dist / step;
          dy *= dist / step;
        }
      }
    }
    const len = Math.hypot(dx, dy);
    this.moving = len > 0.01 && !this.weld;
    if (this.moving) {
      const k = len > 1 ? 1 / len : 1;
      this.x = clampX(this.x + dx * k * ENGINEER.speed * dt);
      this.y = clampY(this.y + dy * k * ENGINEER.speed * dt);
      if (Math.abs(dx) > 0.05) this.facing = dx > 0 ? 1 : -1;
      this.walkT += dt;
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.28;
        Sound.play("step");
      }
    }

    // Welding: stand still inside the crack
    if (this.weld) {
      const c = this.weld.crack;
      if (!G.weak.includes(c) || Math.hypot(this.x - c.x, this.y - c.y) > c.r) this.weld = null;
      else {
        this.weld.t += dt;
        if (Math.random() < dt * 14) Sound.play("weld");
        if (Math.random() < 0.6) {
          const [px, py] = toPx(this.x + 0.08 * this.facing, this.y);
          burst(px, py + 1, 2, ["#fff8dc", "#f7c531", "#a8d8ff"], 0.6);
        }
        if (this.weld.t >= ENGINEER.weldTime) {
          this.weld = null;
          Game.finishWeld(c);
        }
      }
    }

    // Suit heat from the FEA temperature under the boots
    if (G.field) {
      this.feetT = sampleGrid(G.displayGrid, this.x, this.y);
      const t = (this.feetT - T_AMB) / (G.limit - T_AMB);
      if (t > ENGINEER.safeBand && this.invuln <= 0 && G.phase !== "over") {
        const u = Math.min(1, (t - ENGINEER.safeBand) / (1 - ENGINEER.safeBand));
        this.suit += (ENGINEER.heatRate + ENGINEER.heatRateHot * u) * dt * (this.weld ? 1.3 : 1);
        if (Math.random() < dt * 6) {
          Sound.play("sizzle");
          const [px, py] = toPx(this.x, this.y);
          burst(px + rand(-3, 3), py - 2, 1, ["#c9c6bd", "#8c8a82"], 0.25, -0.4);
        }
        if (this.suit >= 1) Game.suitOverheat();
      } else {
        this.suit = Math.max(0, this.suit - ENGINEER.coolRate * dt);
      }
    }
  },

  draw(g, now) {
    const [px, py] = toPx(this.x, this.y);
    const flip = this.facing < 0;
    const carrying = G.carrying != null;
    let name;
    if (carrying) name = this.moving && Math.floor(this.walkT * 8) % 2 ? "engCarry1" : "engCarry";
    else if (this.moving) name = ["eng1", "eng0", "eng2", "eng0"][Math.floor(this.walkT * 9) % 4];
    else name = "eng0";
    const bob = !this.moving && Math.floor(now / 500) % 2 ? 1 : 0;

    // shadow
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(px - 3, py, 7, 2);

    const blink = this.invuln > 0 && Math.floor(now / 80) % 2 === 0;
    if (!blink && this.stun <= 0) {
      g.drawImage(sprite(name, flip), px - 4, py - 12 + bob);
      if (this.suit > 0.6 && Math.floor(now / 120) % 2 === 0) {
        // overheating: red tint on the suit
        g.fillStyle = "rgba(255, 60, 60, 0.45)";
        g.fillRect(px - 3, py - 6 + bob, 6, 5);
      }
    } else if (this.stun > 0) {
      g.drawImage(sprite("eng0", flip), px - 4, py - 12);
    }

    // Carried cell above the head
    if (carrying) drawCell(g, px, py - 18 + bob, G.carrying, now, { badge: false });

    // Suit gauge
    if (this.suit > 0.02) {
      g.fillStyle = "#0e0e12";
      g.fillRect(px - 6, py + 3, 13, 3);
      g.fillStyle = this.suit > 0.7 ? "#ff5c8d" : "#f7a21b";
      g.fillRect(px - 5, py + 4, Math.round(11 * Math.min(1, this.suit)), 1);
    }

    // Weld progress
    if (this.weld) {
      const k = this.weld.t / ENGINEER.weldTime;
      g.fillStyle = "#0e0e12";
      g.fillRect(px - 6, py - (carrying ? 26 : 18), 13, 3);
      g.fillStyle = "#a8d8ff";
      g.fillRect(px - 5, py - (carrying ? 25 : 17), Math.round(11 * k), 1);
    }
  },
};

const clampX = (x) => Math.max(0.06, Math.min(PLATE.maxX - 0.06, x));
const clampY = (y) => Math.max(0.06, Math.min(PLATE.maxY - 0.06, y));

function crackAt(x, y) {
  return G.weak.find((w) => Math.hypot(x - w.x, y - w.y) < w.r) || null;
}
