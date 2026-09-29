/**
 * Tiny synthesised sound effects.
 *
 * No audio files ship with the game, so rather than stay silent the feedback
 * cues are generated with the Web Audio API - a couple of quick oscillator
 * notes each. It costs nothing to download and gives pickups, deliveries and
 * the star screen some life. Honours the sound setting and fails quietly on
 * browsers that block audio until a user gesture.
 */

import { Save } from "./SaveManager";

let ctx = null;

function context() {
    if (ctx) return ctx;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
    } catch {
        ctx = null;
    }
    return ctx;
}

// Play one note. freq in Hz, dur in seconds, type is an oscillator shape.
function note(freq, start, dur, gain = 0.15, type = "triangle") {
    const ac = context();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ac.currentTime + start;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
}

// A short rising or falling arpeggio.
function arp(freqs, step = 0.07, gain = 0.14, type = "triangle") {
    freqs.forEach((f, i) => note(f, i * step, step * 2.2, gain, type));
}

export const Sfx = {

    // The browser only lets audio start after a tap; call this from the first
    // pointer event so later cues are ready.
    unlock() {
        const ac = context();
        if (ac && ac.state === "suspended") ac.resume().catch(() => {});
    },

    enabled() {
        return Save.getSetting("sound") !== false;
    },

    play(name) {
        if (!this.enabled()) return;
        switch (name) {
            case "pickup":   note(880, 0, 0.12, 0.12, "sine"); break;
            case "deliver":  arp([660, 880, 1046], 0.06, 0.14); break;
            case "coin":     note(1180, 0, 0.09, 0.10, "square"); note(1560, 0.05, 0.09, 0.08, "square"); break;
            case "flower":   arp([784, 988], 0.05, 0.10, "sine"); break;
            case "golden":   arp([784, 1046, 1318], 0.06, 0.15, "triangle"); break;
            case "star":     arp([1046, 1318, 1568], 0.05, 0.12, "sine"); break;
            case "boost":    arp([523, 659, 784, 1046], 0.05, 0.12, "sawtooth"); break;
            case "bump":     note(150, 0, 0.18, 0.16, "sawtooth"); break;
            case "extinguish": arp([500, 380, 260], 0.06, 0.14, "sine"); break;
            case "life":     arp([659, 880, 1046, 1318], 0.06, 0.14); break;
            case "win":      arp([523, 659, 784, 1046, 1318], 0.09, 0.16); break;
            case "lose":     arp([494, 415, 330, 262], 0.11, 0.16, "sine"); break;
            case "tap":      note(600, 0, 0.05, 0.06, "square"); break;
            default: break;
        }
    }
};
