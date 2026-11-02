/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · storage.js
 *  Campaign progress, settings and high scores in localStorage
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

const STORE_KEY = "criticalMesh.v2";

const store = (() => {
  const def = {
    unlocked: 1, // number of campaign steps available
    stars: {}, // step index → best stars
    flags: {}, // story outcomes (gantryFirstTry, pourOk, pourPorosity, pumpOk)
    finished: false,
    notes: [], // unlocked Field Notes
    lastInitials: "ENG",
    scores: { easy: [], normal: [], hard: [] },
    settings: { sound: true, difficulty: "normal", mesh: false, equationOpen: false },
  };
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    return {
      ...def,
      ...s,
      flags: { ...def.flags, ...(s.flags || {}) },
      settings: { ...def.settings, ...(s.settings || {}) },
      scores: { ...def.scores, ...(s.scores || {}) },
      notes: Array.isArray(s.notes) ? s.notes : [],
    };
  } catch (e) {
    return def;
  }
})();

function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    // Storage may be unavailable (private mode, some browsers on file://); the game still works
  }
}
