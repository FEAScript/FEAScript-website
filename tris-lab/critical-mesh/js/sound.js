/**
 * ════════════════════════════════════════════════════════════════
 *  Critical Mesh · sound.js
 *  Tiny WebAudio synth: every sound effect is generated, no files
 * ════════════════════════════════════════════════════════════════
 */
"use strict";

const Sound = {
  ctx: null,

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },

  tone(freq, dur, { type = "square", vol = 0.05, slide = 0, delay = 0 } = {}) {
    const ac = this.ensure();
    if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  noise(dur, { vol = 0.08, delay = 0, freq = 1500 } = {}) {
    const ac = this.ensure();
    if (!ac) return;
    const t = ac.currentTime + delay;
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(ac.destination);
    src.start(t);
  },

  play(name) {
    if (!store.settings.sound) return;
    const arp = (notes, step, opts) => notes.forEach((f, i) => this.tone(f, opts.dur || 0.1, { ...opts, delay: i * step }));
    switch (name) {
      case "click": this.tone(660, 0.05, { vol: 0.03 }); break;
      case "tick": this.noise(0.03, { vol: 0.05, freq: 3000 }); break;
      case "step": this.noise(0.02, { vol: 0.015, freq: 700 }); break;
      case "land": this.tone(220, 0.08, { vol: 0.05 }); this.tone(440, 0.1, { vol: 0.04, delay: 0.06 }); break;
      case "place": this.tone(150, 0.16, { vol: 0.07, slide: -90 }); this.noise(0.08, { vol: 0.05, freq: 900 }); break;
      case "warn": this.tone(880, 0.12, { vol: 0.05 }); this.tone(660, 0.12, { vol: 0.05, delay: 0.14 }); break;
      case "crack": this.noise(0.35, { vol: 0.12, freq: 4000 }); this.tone(90, 0.3, { vol: 0.05, slide: -40, type: "sawtooth" }); break;
      case "melt": this.noise(1.4, { vol: 0.2, freq: 2500 }); this.tone(220, 1.2, { vol: 0.07, slide: -190, type: "sawtooth" }); break;
      case "bank": arp([523, 659, 784, 1046], 0.08, { vol: 0.04, dur: 0.12 }); break;
      case "star": this.tone(1046, 0.1, { vol: 0.04 }); this.tone(1568, 0.16, { vol: 0.035, delay: 0.07 }); break;
      case "freeze": arp([1568, 1318, 1046, 784], 0.05, { vol: 0.03, type: "triangle", dur: 0.09 }); this.noise(0.4, { vol: 0.05, freq: 6000 }); break;
      case "scan": this.tone(1200, 0.25, { vol: 0.03, slide: 600, type: "sine" }); break;
      case "copper": this.tone(330, 0.1, { vol: 0.05, type: "triangle" }); this.tone(495, 0.14, { vol: 0.04, delay: 0.08, type: "triangle" }); break;
      case "type": this.tone(1500 + Math.random() * 300, 0.015, { vol: 0.012 }); break;
      case "error": this.tone(140, 0.15, { vol: 0.06, type: "sawtooth" }); break;
      case "quota": arp([392, 523, 659, 784, 1046], 0.06, { vol: 0.04 }); break;
      case "pickup": arp([784, 988, 1318], 0.05, { vol: 0.04, type: "triangle", dur: 0.08 }); break;
      case "note": arp([659, 880, 1175], 0.07, { vol: 0.03, type: "triangle", dur: 0.1 }); break;
      case "drop": this.tone(300, 0.25, { vol: 0.03, slide: -200, type: "triangle" }); this.noise(0.1, { vol: 0.05, delay: 0.22, freq: 600 }); break;
      case "hurt": this.tone(200, 0.2, { vol: 0.06, slide: -120, type: "sawtooth" }); this.noise(0.15, { vol: 0.06, freq: 1200 }); break;
      case "sizzle": this.noise(0.08, { vol: 0.02, freq: 5000 }); break;
      case "weld": this.noise(0.06, { vol: 0.03, freq: 7000 }); this.tone(2400 + Math.random() * 600, 0.03, { vol: 0.01 }); break;
      case "welded": arp([660, 880, 1320], 0.06, { vol: 0.04, type: "square", dur: 0.1 }); break;
      case "splash": this.noise(0.8, { vol: 0.15, freq: 1800 }); this.tone(400, 0.5, { vol: 0.04, slide: -300, type: "sine" }); break;
      case "creak": this.tone(110 + Math.random() * 40, 0.18, { vol: 0.025, slide: 30, type: "sawtooth" }); break;
      case "pump": this.tone(70, 0.6, { vol: 0.06, slide: 40, type: "sawtooth" }); break;
      case "pour": this.noise(1.2, { vol: 0.08, freq: 900 }); break;
      case "success": arp([523, 659, 784, 1046, 1318], 0.07, { vol: 0.04, dur: 0.12 }); break;
    }
  },
};
