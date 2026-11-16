// ============================================================
// Gira-les — joc per a 1 o 2 jugadors (del tipus Reversi).
//
// Posa una fitxa de manera que tanqui fitxes de l'altre en ratlla (recta o
// diagonal) entre la nova i una de teva: es giren totes i passen a ser teves.
// Si no pots posar, passes. Guanya qui acaba amb més fitxes.
// La lògica i la màquina són a girales-motor.js.
// ============================================================

import { N, newGame, moves, flips, play, count, winner, aiMove } from './girales-motor.js';
import { getRecord, setRecord } from './records.js';

const NAMES = { cpu: ['Tu', 'Màquina'], '2p': ['Negres', 'Blanques'] };
const AI_PAUSE = 650;

export default {
  id: 'girales',
  title: 'Gira-les',
  tagline: 'Encercla les fitxes de l\'altre i gira-les',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,
  instructions: [
    'Cadascú té un color: negres i blanques. Comencen les negres.',
    'Posa una fitxa de manera que entre la nova i una altra de teva quedin, en ratlla, fitxes de l\'altre (recte o en diagonal). Totes aquestes es giren i passen a ser teves.',
    'Els puntets marquen on pots posar. Si no pots posar enlloc, passes el torn.',
    'S\'acaba quan ningú no pot posar. Guanya qui té més fitxes. Les cantonades valen or: no es poden girar mai.',
  ],

  mount(root, { goHome }) {
    let mode = '2p'; // sempre comença a 2 jugadors
    let level = ['easy', 'normal', 'hard'].includes(getRecord('girales:level')) ? getRecord('girales:level') : 'normal';
    let g = null, aiTimer = null, flipped = [];
    const isCpu = () => mode === 'cpu';
    function stop() { if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; } }
    function leave() { stop(); goHome(); }

    function screenConfig() {
      stop();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Gira-les</p>
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
        <p class="muted" style="margin-top:12px">${isCpu() ? 'Tu portes les negres i comences; la màquina, les blanques.' : 'Un jugador porta les negres i comença; l\'altre, les blanques.'}</p>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { mode = b.dataset.mode; setRecord('girales:mode', mode); screenConfig(); }; });
      root.querySelectorAll('[data-level]').forEach(b => { b.onclick = () => { level = b.dataset.level; setRecord('girales:level', level); screenConfig(); }; });
      root.querySelector('#start').onclick = begin;
    }

    function begin() {
      stop();
      g = newGame(); flipped = [];
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score"></div>
        </div>
        <p aria-live="polite" class="c4-turn" id="turn"></p>
        <div class="gr-board" id="board" role="grid" aria-label="Tauler de 8 per 8"></div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#board').addEventListener('click', (e) => {
        const c = e.target.closest('[data-i]');
        if (c) tap(+c.dataset.i);
      });
      render();
    }

    const human = () => g && !g.over && !(isCpu() && g.turn === 1);
    function tap(i) {
      if (!human() || !flips(g.board, i, g.turn).length) return;
      commit(i);
    }
    function commit(i) {
      const before = g.turn;
      flipped = play(g, i);
      render(before);
      if (g.over) { finish(); return; }
      if (isCpu() && g.turn === 1) { stop(); aiTimer = setTimeout(cpu, AI_PAUSE); }
    }
    function cpu() {
      aiTimer = null;
      if (!root.isConnected || g.over) return;
      const i = aiMove(g, level);
      if (i !== null) commit(i);
    }

    function render(mover) {
      const legal = human() ? new Set(moves(g.board, g.turn)) : new Set();
      let html = '';
      for (let i = 0; i < N * N; i++) {
        const v = g.board[i];
        const cls = ['gr-cell'];
        if (g.last === i) cls.push('gr-last');
        if (legal.has(i)) cls.push('gr-can');
        const piece = v === null ? (legal.has(i) ? '<span class="gr-dot"></span>' : '')
          : `<span class="gr-piece gr-p${v}${flipped.includes(i) ? ' gr-flip' : ''}"></span>`;
        const lab = v === null ? (legal.has(i) ? 'pots posar-hi' : 'buida') : (v === 0 ? 'negra' : 'blanca');
        html += `<button class="${cls.join(' ')}" data-i="${i}" aria-label="Fila ${Math.floor(i / N) + 1}, columna ${i % N + 1}: ${lab}">${piece}</button>`;
      }
      root.querySelector('#board').innerHTML = html;
      const [a, b] = NAMES[mode];
      const sc = root.querySelector('#score');
      sc.innerHTML = `<span class="gr-mini gr-p0"></span> ${count(g.board, 0)} – ${count(g.board, 1)} <span class="gr-mini gr-p1"></span>`;
      sc.setAttribute('aria-label', `${a} ${count(g.board, 0)}, ${b} ${count(g.board, 1)}`);
      if (g.over) return;
      const who = isCpu() ? (g.turn === 0 ? 'El teu torn' : 'Pensa la màquina…') : `Torn de les ${NAMES['2p'][g.turn].toLowerCase()}`;
      const pass = g.passed && mover !== undefined ? `${isCpu() ? (g.turn === 0 ? 'La màquina passa' : 'No pots posar: passes') : `Les ${NAMES['2p'][1 - g.turn].toLowerCase()} passen`} · ` : '';
      root.querySelector('#turn').innerHTML = `${pass}<b class="${g.turn ? 'p2' : 'p1'}">${who}</b>`;
    }

    function finish() {
      stop();
      const w = winner(g), a = count(g.board, 0), b = count(g.board, 1);
      const title = w === null ? 'Empat!' : isCpu() ? (w === 0 ? 'Has guanyat!' : 'Guanya la màquina') : `Guanyen les ${NAMES['2p'][w].toLowerCase()}!`;
      root.querySelector('#turn').innerHTML = `<b>${title}</b>`;
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="--stack-gap:8px">
          <h2 style="color:var(--accent)">${title}</h2>
          <p class="muted">${NAMES[mode][0]} ${a} – ${b} ${NAMES[mode][1]}</p>
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
