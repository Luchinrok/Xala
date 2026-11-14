// ============================================================
// Pinzellada — joc d'un sol jugador (del tipus «pinta el laberint»).
//
// Llisca el dit: la bola corre en aquella direcció fins que topa amb una
// paret, i pinta les caselles per on passa. Pinta tot el laberint per passar
// de nivell. Els nivells surten de pinzellada-motor.js (sempre tenen solució).
// ============================================================

import { makeLevel, newGame, move, won, TIERS, tierOf } from './pinzellada-motor.js';
import { getRecord, setRecord } from './records.js';

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const PAINTS = ['#E4572E', '#1F8A70', '#7A3BBF', '#F28C28', '#2F6FD6'];
const CELL_MS = 34; // temps per casella quan llisca

export default {
  id: 'pinzellada',
  title: 'Pinzellada',
  tagline: 'Llisca la bola i pinta tot el laberint',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Llisca el dit cap a una direcció: la bola hi corre fins que topa amb una paret.',
    'Les caselles per on passa queden pintades. Pinta-les totes per passar de nivell.',
    'Cada nivell té solució. Si t\'encalles, toca «Torna-hi».',
    'Amb teclat: les fletxes (o W, A, S, D).',
  ],

  mount(root, { goHome }) {
    // on es va de cada dificultat: 'pinzellada:<id>' = el nivell següent per fer
    const nextOf = (t) => Math.min(t.to, Math.max(t.from, getRecord('pinzellada:' + t.id) || (t.id === 'facil' ? getRecord('pinzellada:nivell') || 1 : t.from)));
    let tier = TIERS.find(t => t.id === getRecord('pinzellada:tier')) || TIERS[0];
    let n = nextOf(tier);
    let g = null, canvas = null, ctx = null, px = 0, colors = null;
    let anim = null; // { cells, i, t0 }
    let raf = 0;

    function stop() {
      cancelAnimationFrame(raf); raf = 0;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', fit);
    }
    function leave() { stop(); goHome(); }

    // ---------- 1) tria de dificultat ----------
    function screenConfig() {
      stop();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Pinzellada</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Llisca la bola i pinta tot el laberint</h2>
        <p class="label" style="margin:0 0 12px">Dificultat</p>
        <div class="pz-tiers" id="tiers">
          ${TIERS.map(t => {
            const done = nextOf(t) - t.from, total = t.to - t.from + 1;
            return `<button class="btn ${tier.id === t.id ? 'btn--accent' : 'btn--outline'}" data-tier="${t.id}">${t.name}<small>${done} de ${total}</small></button>`;
          }).join('')}
        </div>
        <p class="muted center" style="margin-top:12px">Nivell ${nextOf(tier) - tier.from + 1} de ${tier.name.toLowerCase()} · tauler de ${makeLevel(nextOf(tier)).cols}×${makeLevel(nextOf(tier)).rows}</p>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:28px">${nextOf(tier) > tier.from ? 'Continua' : 'Comença'}</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-tier]').forEach(b => {
        b.onclick = () => { tier = TIERS.find(t => t.id === b.dataset.tier); setRecord('pinzellada:tier', tier.id); screenConfig(); };
      });
      root.querySelector('#start').onclick = () => { n = nextOf(tier); begin(); };
    }

    // ---------- 2) un nivell ----------
    function begin() {
      stop();
      tier = tierOf(n);
      const lv = makeLevel(n);
      g = newGame(lv);
      anim = null;
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score">${tier.name} · ${n - tier.from + 1}</div>
        </div>
        <p class="traca-status" id="status" aria-live="polite">Llisca per moure la bola</p>
        <div class="pz-board" id="board" style="--ar:${lv.cols / lv.rows}"><canvas id="cv" role="img" aria-label="Laberint de ${lv.cols} per ${lv.rows}"></canvas></div>
        <div class="btn-row" id="controls" style="margin-top:14px">
          <button class="btn btn--outline" id="retry">Torna-hi</button>
          ${n > tier.from ? '<button class="btn btn--outline" id="prev">‹ Anterior</button>' : ''}
        </div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#retry').onclick = begin;
      const prev = root.querySelector('#prev');
      if (prev) prev.onclick = () => { n--; begin(); };
      canvas = root.querySelector('#cv');
      ctx = canvas.getContext('2d');
      const css = getComputedStyle(document.documentElement);
      const v = (k, d) => (css.getPropertyValue(k) || d).trim();
      colors = { paper: v('--paper', '#FBF3E4'), paper2: v('--paper-2', '#F4E8D2'), ink: v('--ink', '#20180F'), paint: PAINTS[(n - 1) % PAINTS.length] };
      wireSwipe(root.querySelector('#board'));
      document.addEventListener('keydown', onKey);
      window.addEventListener('resize', fit);
      fit();
    }

    function fit() {
      if (!canvas || !canvas.isConnected) return;
      const w = canvas.parentElement.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      const h = w * g.level.rows / g.level.cols;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      px = canvas.width / g.level.cols;
      draw();
    }

    function go(d) {
      if (!g || anim || won(g)) return;
      const from = [...g.pos];
      const before = g.painted.map(r => [...r]);
      const cells = move(g, d);
      if (!cells.length) return;
      setStatus('');
      anim = { from, cells, before, t0: performance.now() };
      raf = requestAnimationFrame(tick);
    }
    function tick(now) {
      if (!canvas || !canvas.isConnected) { stop(); return; }
      // el temps del fotograma pot ser una mica anterior al del toc: mai negatiu
      const k = Math.max(0, Math.min(anim.cells.length, (now - anim.t0) / CELL_MS));
      draw(k);
      if (k < anim.cells.length) { raf = requestAnimationFrame(tick); return; }
      anim = null; draw();
      if (won(g)) finish();
    }

    function onKey(e) {
      if (!root.isConnected) { stop(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (KEYS[e.key]) { e.preventDefault(); go(KEYS[e.key]); }
    }
    function wireSwipe(el) {
      let sx = 0, sy = 0, down = false;
      el.addEventListener('pointerdown', (e) => { down = true; sx = e.clientX; sy = e.clientY; e.preventDefault(); });
      el.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
        down = false; // una lliscada per gest
        go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      });
      const end = () => { down = false; };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }
    function setStatus(t) { const el = root.querySelector('#status'); if (el) el.textContent = t; }

    // ---------- dibuix ----------
    // k: quantes caselles de la lliscada en curs ja s'han recorregut (amb decimals)
    function draw(k) {
      if (!ctx || !g) return;
      const { paper, paper2, ink, paint } = colors;
      const L = g.level;
      const moving = anim && k !== undefined;
      const done = moving ? Math.floor(k) : 0;
      ctx.fillStyle = ink; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
        if (!L.open[r][c]) continue;
        let p = g.painted[r][c];
        if (moving && p && !anim.before[r][c]) p = anim.cells.slice(0, done).some(([rr, cc]) => rr === r && cc === c);
        ctx.fillStyle = p ? paint : paper;
        ctx.fillRect(c * px - 0.5, r * px - 0.5, px + 1, px + 1);
        if (!p) { ctx.fillStyle = paper2; ctx.beginPath(); ctx.arc(c * px + px / 2, r * px + px / 2, px * 0.08, 0, 7); ctx.fill(); }
      }
      // la bola
      let br, bc;
      if (moving) {
        const path = [anim.from, ...anim.cells];
        const i = Math.min(path.length - 1, Math.floor(k)), f = k - Math.floor(k);
        const a = path[i], b = path[Math.min(path.length - 1, i + 1)];
        br = a[0] + (b[0] - a[0]) * f; bc = a[1] + (b[1] - a[1]) * f;
      } else [br, bc] = g.pos;
      ctx.fillStyle = '#FFC828'; ctx.strokeStyle = ink; ctx.lineWidth = Math.max(2, px * 0.08);
      ctx.beginPath(); ctx.arc(bc * px + px / 2, br * px + px / 2, px * 0.34, 0, 7); ctx.fill(); ctx.stroke();
    }

    // ---------- nivell fet ----------
    function finish() {
      stop();
      if (n + 1 > nextOf(tier) && n < tier.to) setRecord('pinzellada:' + tier.id, n + 1);
      if (n === tier.to) setRecord('pinzellada:' + tier.id, tier.to + 1);
      setStatus('Tot pintat!');
      root.querySelector('#controls').style.display = 'none';
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="--stack-gap:8px">
          <h2 style="color:var(--accent)">${n === tier.to ? `${tier.name}: tot fet!` : `Nivell ${n - tier.from + 1} fet!`}</h2>
          <p class="muted">${g.moves} ${g.moves === 1 ? 'lliscada' : 'lliscades'}</p>
        </div>
        <div class="stack">
          <button class="btn btn--accent" id="next">Següent</button>
          <button class="btn btn--outline" id="home">Sortir</button>
        </div>`;
      box.querySelector('#next').onclick = () => { n = Math.min(300, n + 1); if (n > tier.to && tierOf(n) !== tier) setRecord('pinzellada:tier', tierOf(n).id); begin(); };
      box.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
