// ============================================================
// Marro — joc tradicional per a 1 o 2 jugadors (nou fitxes).
//
// Primer es posen les fitxes; després es mouen a un punt veí; amb 3 fitxes,
// volen. Tres en ratlla («marro») treu una fitxa de l'altre. La lògica i la
// màquina són a marro-motor.js.
// ============================================================

import { newGame, moves, play, POS, ADJ, phaseOf, alive, removable, aiMove } from './marro-motor.js';
import { getRecord, setRecord } from './records.js';
import { namesField, bindNames, nameOr, turnText, winText, de } from './noms.js';

const NAMES = { cpu: ['Tu', 'Màquina'], '2p': ['Corall', 'Verd'] };
const COLORS = ['var(--accent)', 'var(--ok)'];
const AI_PAUSE = 600;

export default {
  id: 'marro',
  title: 'Marro',
  tagline: 'El joc de les nou fitxes',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,
  instructions: [
    'Cadascú té 9 fitxes. Primer, per torns, les poseu als punts buits del tauler.',
    'Quan ja les heu posades totes, per torns es mou una fitxa a un punt veí que estigui buit (seguint les ratlles).',
    'Si fas tres en ratlla (un «marro»), treus una fitxa de l\'altre, que no sigui en un marro seu si pot ser.',
    'Qui es queda amb només 3 fitxes pot «volar»: moure-les a qualsevol punt buit.',
    'Perd qui es queda amb menys de 3 fitxes o no pot moure. A 1 jugador, la màquina fa el verd.',
  ],

  mount(root, { goHome }) {
    let mode = '2p'; // sempre comença a 2 jugadors
    let level = ['easy', 'normal', 'hard'].includes(getRecord('marro:level')) ? getRecord('marro:level') : 'normal';
    let g = null, sel = null, pending = null, aiTimer = null;
    const isCpu = () => mode === 'cpu';
    const nm = (p) => (isCpu() ? NAMES.cpu[p] : nameOr(p, NAMES['2p'][p]));
    function stop() { if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; } }
    function leave() { stop(); goHome(); }

    // ---------- 1) configuració ----------
    function screenConfig() {
      stop();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Marro</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>
        <p class="label" style="margin:0 0 12px">Mode</p>
        <div class="btn-row">
          <button class="btn ${isCpu() ? 'btn--accent' : 'btn--outline'}" data-mode="cpu">1 jugador</button>
          <button class="btn ${!isCpu() ? 'btn--accent' : 'btn--outline'}" data-mode="2p">2 jugadors</button>
        </div>
        ${isCpu() ? `<p class="label" style="margin:18px 0 12px">Dificultat</p>
        <div class="btn-row">
          ${[['easy', 'Fàcil'], ['normal', 'Normal'], ['hard', 'Difícil']].map(([id, n]) => `<button class="btn ${level === id ? 'btn--accent' : 'btn--outline'}" data-level="${id}">${n}</button>`).join('')}
        </div>` : ''}
        ${isCpu() ? '' : namesField(NAMES['2p'], COLORS)}
        <p class="muted" style="margin-top:12px">${isCpu() ? 'Tu fas el corall i comences; la màquina, el verd.' : 'Un jugador fa el corall i comença; l\'altre, el verd.'} Tres en ratlla treu una fitxa de l'altre.</p>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { mode = b.dataset.mode; setRecord('marro:mode', mode); screenConfig(); }; });
      root.querySelectorAll('[data-level]').forEach(b => { b.onclick = () => { level = b.dataset.level; setRecord('marro:level', level); screenConfig(); }; });
      bindNames(root);
      root.querySelector('#start').onclick = begin;
    }

    // ---------- 2) partida ----------
    function begin() {
      stop();
      g = newGame(); sel = null; pending = null;
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back" data-guard>‹ Enrere</button>
          <div class="chess-score" id="score"></div>
        </div>
        <p aria-live="polite" class="c4-turn" id="turn"></p>
        <div class="mr-hand" id="hand1"></div>
        <div class="mr-board" id="board"></div>
        <div class="mr-hand" id="hand0"></div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#board').addEventListener('click', (e) => {
        const pt = e.target.closest('[data-p]');
        if (pt) tap(+pt.dataset.p);
      });
      render();
    }

    const human = () => g && !g.over && !(isCpu() && g.turn === 1);

    // Un toc: posar, triar fitxa, triar destí o triar quina fitxa treure.
    function tap(p) {
      if (!human()) return;
      const legal = moves(g);
      if (pending) { // ha fet marro: tria quina fitxa de l'altre treu
        const m = legal.find(x => x.from === pending.from && x.to === pending.to && x.take === p);
        if (m) { pending = null; sel = null; commit(m); }
        return;
      }
      const ph = phaseOf(g, g.turn);
      if (ph === 'place') return go(legal.filter(m => m.to === p));
      if (g.board[p] === g.turn) { sel = legal.some(m => m.from === p) ? p : null; render(); return; }
      if (sel !== null) go(legal.filter(m => m.from === sel && m.to === p));
    }
    // si la jugada fa marro, primer cal triar quina fitxa es treu
    function go(opts) {
      if (!opts.length) return;
      if (opts[0].take === null) { sel = null; commit(opts[0]); return; }
      pending = { from: opts[0].from, to: opts[0].to };
      render();
    }
    function commit(m) {
      play(g, m);
      render();
      if (g.over) { finish(); return; }
      if (isCpu() && g.turn === 1) { stop(); aiTimer = setTimeout(cpu, AI_PAUSE); }
    }
    function cpu() {
      aiTimer = null;
      if (!root.isConnected || g.over) return;
      const m = aiMove(g, level);
      if (m) commit(m);
    }

    // ---------- dibuix ----------
    function render() {
      const S = 44, P = 22, size = S * 6 + P * 2, at = (i) => [P + POS[i][0] * S, P + POS[i][1] * S];
      const legal = human() ? moves(g) : [];
      let targets = [], takes = [];
      if (pending) takes = legal.filter(m => m.from === pending.from && m.to === pending.to).map(m => m.take);
      else if (sel !== null) targets = legal.filter(m => m.from === sel).map(m => m.to);
      else if (human() && phaseOf(g, g.turn) === 'place') targets = [...new Set(legal.map(m => m.to))];
      const movable = human() && !pending && phaseOf(g, g.turn) !== 'place' ? new Set(legal.map(m => m.from)) : new Set();
      // amb un marro a mig fer, la fitxa ja es veu al seu lloc nou
      const shown = g.board.slice();
      if (pending) { if (pending.from !== null) shown[pending.from] = null; shown[pending.to] = g.turn; }
      const last = g.last ? [g.last.from, g.last.to].filter(x => x !== null) : [];
      let svg = '';
      // quadrats i ratlles
      for (const r of [0, 1, 2]) { const a = P + r * S, w = (6 - 2 * r) * S; svg += `<rect x="${a}" y="${a}" width="${w}" height="${w}" class="mr-line" fill="none"/>`; }
      for (const k of [1, 3, 5, 7]) { const [x1, y1] = at(k), [x2, y2] = at(k + 16); svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mr-line"/>`; }
      for (let i = 0; i < 24; i++) {
        const [x, y] = at(i), v = shown[i];
        const cls = ['mr-pt'];
        if (last.includes(i)) cls.push('mr-last');
        if (targets.includes(i)) cls.push('mr-target');
        if (takes.includes(i)) cls.push('mr-take');
        if (sel === i) cls.push('mr-sel');
        if (movable.has(i)) cls.push('mr-can');
        const label = v === null ? 'buit' : `fitxa ${de(nm(v))}`;
        svg += `<g data-p="${i}" class="${cls.join(' ')}" role="button" tabindex="0" aria-label="Punt ${i + 1}: ${label}">
          <circle cx="${x}" cy="${y}" r="20" class="mr-hit"/>
          ${v === null ? `<circle cx="${x}" cy="${y}" r="${targets.includes(i) ? 7 : 5}" class="mr-dot"/>` : `<circle cx="${x}" cy="${y}" r="15" class="mr-stone" fill="${COLORS[v]}"/>`}
        </g>`;
      }
      root.querySelector('#board').innerHTML = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Tauler del marro">${svg}</svg>`;
      root.querySelectorAll('#board [data-p]').forEach(el => el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(+el.dataset.p); }
      }));
      // fitxes per posar de cadascú
      for (const p of [0, 1]) {
        const h = root.querySelector('#hand' + p);
        h.innerHTML = g.hand[p] ? Array.from({ length: g.hand[p] }, () => `<span class="mr-mini" style="background:${COLORS[p]}"></span>`).join('') : '';
        h.setAttribute('aria-label', `${nm(p)}: ${g.hand[p]} per posar`);
      }
      const [a, b] = [nm(0), nm(1)];
      const sc = root.querySelector('#score');
      sc.innerHTML = `<span class="dot-p" style="background:var(--accent)"></span> ${alive(g, 0)} – ${alive(g, 1)} <span class="dot-p" style="background:var(--ok)"></span>`;
      sc.setAttribute('aria-label', `Fitxes: ${a} ${alive(g, 0)}, ${b} ${alive(g, 1)}`);
      if (g.over) return;
      const who = isCpu() ? (g.turn === 0 ? 'El teu torn' : 'Pensa la màquina…') : turnText(g.turn, `Torn del ${NAMES['2p'][g.turn]}`);
      const ph = phaseOf(g, g.turn);
      const what = pending ? 'Marro! Tria una fitxa de l\'altre per treure-la'
        : !human() ? '' : ph === 'place' ? 'posa una fitxa' : ph === 'fly' ? (sel === null ? 'tria una fitxa: pots volar!' : 'on vols volar?') : (sel === null ? 'tria una fitxa per moure' : 'on la mous?');
      root.querySelector('#turn').innerHTML = `<b class="${g.turn ? 'p2' : 'p1'}">${pending ? what : who}</b>${!pending && what ? ` · ${what}` : ''}`;
    }

    // ---------- 3) final ----------
    function finish() {
      stop();
      const w = g.winner;
      const title = w === null ? 'Taules!' : isCpu() ? (w === 0 ? 'Has guanyat!' : 'Guanya la màquina') : winText(w, `Guanya el ${NAMES['2p'][w]}!`);
      root.querySelector('#turn').innerHTML = `<b class="${w === 1 ? 'p2' : 'p1'}">${title}</b>`;
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="--stack-gap:8px">
          <h2 style="color:${w === 1 ? 'var(--ok)' : w === null ? 'var(--ink)' : 'var(--accent)'}">${title}</h2>
          <p class="muted">${w === null ? '60 moviments sense treure cap fitxa' : `Fitxes: ${nm(0)} ${alive(g, 0)} – ${alive(g, 1)} ${nm(1)}`}</p>
        </div>
        <div class="stack">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Sortir</button>
        </div>`;
      box.querySelector('#again').onclick = begin;
      box.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
