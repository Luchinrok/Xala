// ============================================================
// musica.js — música de fons de festa, feta amb Web Audio (sense fitxers).
// Un bucle alegre i suau: baix, arpegi de marimba, una melodia que canvia
// cada vuit compassos i un xec-xec de maraca. Es pot apagar; la preferència
// es guarda a localStorage ('xala:musica' = '0' vol dir apagada).
//
//   const music = createMusic({ alive: () => root.isConnected });
//   music.start()   (des d'un toc: iOS només deixa sonar després d'un gest)
//   music.stop() · music.toggle() · music.isOn()
// ============================================================

const KEY = 'xala:musica';
const BPM = 104;
const STEP = 60 / BPM / 2; // corxera
const VOL = 0.16;

// Fa major: I – vi – IV – V (Fa, Rem, Si♭, Do), en notes MIDI
const CHORDS = [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]];
const ARP = [0, 1, 2, 1, 3, 2, 1, 2];
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

export function createMusic({ alive = () => true } = {}) {
  let ctx = null, master = null, noise = null, timer = null;
  let step = 0, next = 0, seed = 1;

  const isOn = () => { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } };
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      const soft = ctx.createBiquadFilter();
      soft.type = 'lowpass'; soft.frequency.value = 5200;
      master = ctx.createGain(); master.gain.value = 0;
      master.connect(soft).connect(ctx.destination);
      // soroll blanc curt per a la maraca
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else if (timer) ctx.resume();
      });
      return true;
    } catch (e) { ctx = null; return false; }
  }

  // una nota amb atac ràpid i caiguda (to de marimba o de baix)
  function note(midi, t, { type = 'sine', gain = 0.1, decay = 0.3, partial = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = hz(midi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + decay + 0.05);
    if (partial) { // un harmònic agut i curt: sona a fusta
      const o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.frequency.value = hz(midi) * 4; g2.gain.setValueAtTime(gain * partial, t);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o2.connect(g2).connect(master); o2.start(t); o2.stop(t + 0.08);
    }
  }
  function shaker(t, gain) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = 'highpass'; f.frequency.value = 6500;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(g).connect(master); s.start(t);
  }

  // melodia d'un compàs: notes de l'acord o de la pentatònica, amb silencis
  let tune = [];
  function newTune() {
    const pent = [65, 67, 69, 72, 74, 77];
    tune = Array.from({ length: 8 }, () => Array.from({ length: 8 }, (_, k) => (k % 2 === 0 && rnd() < 0.55 ? pent[Math.floor(rnd() * pent.length)] : 0)));
  }

  function schedule(i, t) {
    const bar = Math.floor(i / 8), k = i % 8, chord = CHORDS[bar % 4];
    if (k === 0 && bar % 8 === 0) newTune();
    if (k === 0 || k === 4) note(chord[0] - 12, t, { type: 'triangle', gain: 0.32, decay: 0.45 });
    if (k === 6) note(chord[2] - 12, t, { type: 'triangle', gain: 0.22, decay: 0.3 });
    const tones = [...chord, chord[0] + 12];
    note(tones[ARP[k]] + 12, t, { gain: 0.07, decay: 0.28, partial: 0.5 });
    const m = bar % 8 >= 2 ? tune[bar % 8][k] : 0; // els dos primers compassos, sense melodia
    if (m) note(m, t, { type: 'triangle', gain: 0.1, decay: 0.4 });
    if (k % 2 === 1) shaker(t, 0.05); else if (k === 2 || k === 6) shaker(t, 0.025);
  }

  function tick() {
    if (!alive()) { stop(); return; }
    while (next < ctx.currentTime + 0.15) { schedule(step, next); next += STEP; step++; }
  }

  function start() {
    if (!isOn() || !ensure()) return;
    try { ctx.resume(); } catch (e) {}
    if (timer) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(VOL, now + 1.2);
    next = now + 0.08; step = 0;
    timer = setInterval(tick, 30);
  }
  function stop() {
    clearInterval(timer); timer = null;
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.25);
  }
  function toggle() {
    const on = !isOn();
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    if (on) start(); else stop();
    return on;
  }
  return { start, stop, toggle, isOn };
}
