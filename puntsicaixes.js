// ============================================================
// Punts i caixes — joc per a 1 o 2 jugadors, per torns.
//
// Per torns, traceu una ratlla entre dos punts veïns. Qui tanca el quart
// costat d'una caixa se la queda i torna a tirar. Guanya qui té més caixes.
// A 1 jugador, la màquina fa el verd. La lògica és a puntsicaixes-motor.js.
// ============================================================

import { newGame, play, over, aiMove } from './puntsicaixes-motor.js';
import { getRecord, setRecord } from './records.js';

const SIZES = { 3: '3×3', 4: '4×4', 5: '5×5' };
const NAMES = { cpu: ['Tu', 'Màquina'], '2p': ['Corall', 'Verd'] };
const AI_PAUSE = 520;

export default {
  id: 'puntsicaixes',
  title: 'Punts i caixes',
  tagline: 'Tanca caixes i suma punts',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,
  instructions: [
    'Per torns, toqueu entre dos punts veïns per traçar-hi una ratlla.',
    'Qui tanca el quart costat d\'una caixa, se la queda (es pinta del seu color) i torna a tirar.',
    'Compte a traçar el tercer costat d\'una caixa: l\'altre la tancarà!',
    'Guanya qui té més caixes quan s\'omple la quadrícula. A 1 jugador, la màquina fa el verd.',
  ],

  mount(root, { goHome }) {
    let mode = getRecord('puntsicaixes:mode') === '2p' ? '2p' : 'cpu';
    let level = getRecord('puntsicaixes:level') === 'easy' ? 'easy' : 'normal';
    let size = [3, 4, 5].includes(getRecord('puntsicaixes:size')) ? getRecord('puntsicaixes:size') : 4;
    let g = null, aiTimer = null;

    const isCpu = () => mode === 'cpu';
    function stop() { if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; } }
    function leave() { stop(); goHome(); }

    // ---------- 1) configuració ----------
    function screenConfig() {
      stop();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Punts i caixes</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>
        <p class="label" style="margin:0 0 12px">Mode</p>
        <div class="btn-row">
          <button class="btn ${isCpu() ? 'btn--accent' : 'btn--outline'}" data-mode="cpu">1 jugador</button>
          <button class="btn ${!isCpu() ? 'btn--accent' : 'btn--outline'}" data-mode="2p">2 jugadors</button>
        </div>
        ${isCpu() ? `
        <p class="label" style="margin:18px 0 12px">Dificultat</p>
        <div class="btn-row">
          <button class="btn ${level === 'easy' ? 'btn--accent' : 'btn--outline'}" data-level="easy">Fàcil</button>
          <button class="btn ${level === 'normal' ? 'btn--accent' : 'btn--outline'}" data-level="normal">Normal</button>
        </div>` : ''}
        <p class="label" style="margin:18px 0 12px">Mida</p>
        <div class="btn-row">
          ${Object.entries(SIZES).map(([n, l]) => `<button class="btn ${size === +n ? 'btn--accent' : 'btn--outline'}" data-size="${n}">${l}</button>`).join('')}
        </div>
        <p class="muted" style="margin-top:12px">${isCpu() ? 'Tu fas el corall; la màquina, el verd.' : 'Un jugador fa el corall i l\'altre el verd.'}</p>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { mode = b.dataset.mode; setRecord('puntsicaixes:mode', mode); screenConfig(); }; });
      root.querySelectorAll('[data-level]').forEach(b => { b.onclick = () => { level = b.dataset.level; setRecord('puntsicaixes:level', level); screenConfig(); }; });
      root.querySelectorAll('[data-size]').forEach(b => { b.onclick = () => { size = +b.dataset.size; setRecord('puntsicaixes:size', size); screenConfig(); }; });
      root.querySelector('#start').onclick = begin;
    }

    // ---------- 2) partida ----------
    function begin() {
      stop();
      g = newGame(size);
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score"></div>
        </div>
        <p aria-live="polite" class="c4-turn" id="turn"></p>
        <div class="pc-board" id="board"></div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#board').addEventListener('click', (e) => {
        const ln = e.target.closest('[data-e]');
        if (!ln || !interactive()) return;
        move(JSON.parse(ln.dataset.e));
      });
      render();
    }

    const interactive = () => g && !over(g) && !(isCpu() && g.turn === 1);

    function move(e) {
      if (play(g, e) < 0) return;
      render();
      if (over(g)) { finish(); return; }
      if (isCpu() && g.turn === 1) { stop(); aiTimer = setTimeout(cpu, AI_PAUSE); }
    }
    function cpu() {
      aiTimer = null;
      if (!root.isConnected || over(g)) return;
      move(aiMove(g, level));
    }

    // SVG: punts, ratlles (amb una zona de toc gruixuda) i caixes pintades
    function render() {
      const el = root.querySelector('#board');
      if (!el) return;
      const n = g.n, S = 60, P = 18, size2 = n * S + P * 2;
      const at = (r, c) => [P + c * S, P + r * S];
      const pc = (p) => (p === 0 ? 'var(--accent)' : 'var(--ok)');
      const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
      let svg = '';
      // caixes
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const o = g.owner[r][c];
        if (o === null) continue;
        const [x, y] = at(r, c);
        svg += `<rect x="${x + 4}" y="${y + 4}" width="${S - 8}" height="${S - 8}" rx="8" fill="${pc(o)}" opacity=".85"/>`;
        svg += `<text x="${x + S / 2}" y="${y + S / 2 + 8}" text-anchor="middle" class="pc-ini">${NAMES[mode][o][0]}</text>`;
      }
      // ratlles
      const line = (t, r, c) => {
        const [x1, y1] = at(r, c), [x2, y2] = t === 'h' ? at(r, c + 1) : at(r + 1, c);
        const on = (t === 'h' ? g.h : g.v)[r][c];
        const e = JSON.stringify([t, r, c]);
        const last = same(g.last, [t, r, c]);
        return `<g ${on ? '' : `data-e='${e}' class="pc-free" tabindex="0" role="button" aria-label="Ratlla ${t === 'h' ? 'horitzontal' : 'vertical'} ${r + 1}, ${c + 1}"`}>
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="pc-hit"/>
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${on ? 'pc-on' + (last ? ' pc-last' : '') : 'pc-off'}"/>
        </g>`;
      };
      for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) svg += line('h', r, c);
      for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) svg += line('v', r, c);
      // punts
      for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) { const [x, y] = at(r, c); svg += `<circle cx="${x}" cy="${y}" r="6" class="pc-dot"/>`; }
      el.innerHTML = `<svg viewBox="0 0 ${size2} ${size2}" role="img" aria-label="Quadrícula de ${n} per ${n} caixes">${svg}</svg>`;
      el.querySelectorAll('[data-e]').forEach(x => x.addEventListener('keydown', (ev) => {
        if ((ev.key === 'Enter' || ev.key === ' ') && interactive()) { ev.preventDefault(); move(JSON.parse(x.dataset.e)); }
      }));
      const [a, b] = NAMES[mode];
      root.querySelector('#score').textContent = `${a} ${g.score[0]} – ${g.score[1]} ${b}`;
      const turn = root.querySelector('#turn');
      if (!over(g)) turn.innerHTML = isCpu()
        ? (g.turn === 0 ? '<b class="p1">El teu torn</b>' : '<b class="p2">Pensa la màquina…</b>')
        : `Torn del <b class="${g.turn === 0 ? 'p1' : 'p2'}">${NAMES['2p'][g.turn]}</b>`;
    }

    // ---------- 3) final ----------
    function finish() {
      stop();
      const [a, b] = g.score, [na, nb] = NAMES[mode];
      const win = a === b ? null : a > b ? 0 : 1;
      const title = win === null ? 'Empat!' : isCpu() ? (win === 0 ? 'Has guanyat!' : 'Guanya la màquina') : `Guanya el ${NAMES['2p'][win]}!`;
      root.querySelector('#turn').innerHTML = `<b class="${win === 1 ? 'p2' : 'p1'}">${title}</b>`;
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="--stack-gap:8px">
          <h2 style="color:${win === 1 ? 'var(--ok)' : 'var(--accent)'}">${title}</h2>
          <p class="muted">${na} ${a} – ${b} ${nb}</p>
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
