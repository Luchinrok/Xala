// ============================================================
// Sembra — joc per a 1 o 2 jugadors (del tipus mancala).
//
// Tria un forat teu: les seves llavors es van deixant d'una en una cap a la
// dreta. Si l'última cau al teu graner, tornes a tirar; si cau en un forat
// teu buit, et quedes les del davant. Guanya qui en té més al graner.
// La lògica i la màquina són a sembra-motor.js.
// ============================================================

import { newGame, moves, play, clone, winner, aiMove, store, pitsOf } from './sembra-motor.js';
import { getRecord, setRecord } from './records.js';
import { namesField, bindNames, nameOr, turnText, winText } from './noms.js';

const NAMES = { cpu: ['Tu', 'Màquina'], '2p': ['Corall', 'Verd'] };
const STEP_MS = 140, AI_PAUSE = 600;

export default {
  id: 'sembra',
  title: 'Sembra',
  tagline: 'Sembra les llavors i omple el graner',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,
  instructions: [
    'Cadascú té 6 forats a la seva banda (al principi, amb 4 llavors cadascun) i un graner a la dreta.',
    'Al teu torn, toca un forat teu: les llavors s\'hi agafen totes i es van deixant d\'una en una cap a la dreta, també al teu graner (al de l\'altre no).',
    'Si l\'última llavor cau al teu graner, tornes a tirar. Si cau en un forat teu que era buit i el de davant té llavors, te les quedes totes.',
    'Quan una banda es queda sense llavors s\'acaba, i cadascú es queda les que té. Guanya qui en té més al graner.',
  ],

  mount(root, { goHome }) {
    let mode = '2p'; // sempre comença a 2 jugadors
    let level = ['easy', 'normal', 'hard'].includes(getRecord('sembra:level')) ? getRecord('sembra:level') : 'normal';
    let g = null, shown = null, busy = false, timers = [];
    const isCpu = () => mode === 'cpu';
    const nm = (p) => (isCpu() ? NAMES.cpu[p] : nameOr(p, NAMES['2p'][p]));
    // «Graner corall» o, amb nom, «Graner corall, Marta»
    const storeLabel = (p) => `Graner ${p ? 'verd' : 'corall'}${!isCpu() && nameOr(p, '') ? `, ${nm(p)}` : ''}`;
    function stop() { timers.forEach(clearTimeout); timers = []; }
    function leave() { stop(); goHome(); }
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

    function screenConfig() {
      stop();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Sembra</p>
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
        ${isCpu() ? '' : namesField(NAMES['2p'], ['var(--accent)', 'var(--ok)'])}
        <p class="muted" style="margin-top:12px">${isCpu() ? 'Tu jugues a baix (corall) i comences; la màquina, a dalt (verd).' : 'Un jugador a baix (corall), que comença, i l\'altre a dalt (verd).'}</p>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { mode = b.dataset.mode; screenConfig(); }; });
      root.querySelectorAll('[data-level]').forEach(b => { b.onclick = () => { level = b.dataset.level; setRecord('sembra:level', level); screenConfig(); }; });
      bindNames(root);
      root.querySelector('#start').onclick = begin;
    }

    function begin() {
      stop();
      g = newGame(); shown = g.b.slice(); busy = false;
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back" data-guard>‹ Enrere</button>
          <div class="chess-score" id="score"></div>
        </div>
        <p aria-live="polite" class="c4-turn" id="turn"></p>
        <div class="sb-board" id="board"></div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#board').addEventListener('click', (e) => {
        const pit = e.target.closest('[data-i]');
        if (pit) tap(+pit.dataset.i);
      });
      render();
    }

    const human = () => g && !g.over && !busy && !(isCpu() && g.turn === 1);
    function tap(i) { if (human() && moves(g).includes(i)) go(i); }

    // juga i ensenya la sembra llavor a llavor
    function go(i) {
      busy = true;
      const before = g.b.slice();
      const mover = g.turn;
      const last = play(g, i);
      shown = before.slice();
      shown[i] = 0;
      render(mover);
      last.path.forEach((k, n) => later(() => { shown[k]++; render(mover, k); }, (n + 1) * STEP_MS));
      later(() => {
        shown = g.b.slice(); // captura i, si s'acaba, el recompte final
        busy = false;
        render();
        if (g.over) { finish(); return; }
        if (isCpu() && g.turn === 1) later(cpu, AI_PAUSE);
      }, (last.path.length + 1) * STEP_MS + (last.capture ? 250 : 0));
    }
    function cpu() {
      if (!root.isConnected || g.over) return;
      const i = aiMove(g, level);
      if (i !== null) go(i);
    }

    function pit(i, hot) {
      const n = shown[i];
      const mine = pitsOf(0).includes(i) ? 0 : 1;
      const can = human() && g.turn === mine && n > 0;
      const dots = Array.from({ length: Math.min(n, 12) }, (_, k) => {
        // en espiral, una mica amunt (a baix hi ha el número)
        const a = k * 2.4, r = 4 + 3.6 * Math.sqrt(k);
        return `<span class="sb-seed" style="left:calc(50% + ${(Math.cos(a) * r).toFixed(1)}px);top:calc(42% + ${(Math.sin(a) * r * 0.85).toFixed(1)}px)"></span>`;
      }).join('');
      const lastFrom = g.last && g.last.from === i && !busy ? ' sb-last' : '';
      return `<button class="sb-pit sb-p${mine}${can ? ' sb-can' : ''}${hot === i ? ' sb-hot' : ''}${lastFrom}" data-i="${i}" aria-label="Forat amb ${n} llavors">
        <span class="sb-seeds">${dots}</span><b>${n}</b></button>`;
    }
    function render(mover, hot) {
      // tauler dret (ocupa la pantalla): corall a la dreta, de baix a dalt, i el seu
      // graner a dalt; verd a l'esquerra, de dalt a baix, i el seu graner a baix
      const rows = [0, 1, 2, 3, 4, 5].map(r => pit(7 + r, hot) + pit(5 - r, hot)).join('');
      root.querySelector('#board').innerHTML = `
        <div class="sb-store sb-p0${hot === 6 ? ' sb-hot' : ''}" aria-label="${storeLabel(0)}: ${shown[6]}"><b>${shown[6]}</b></div>
        ${rows}
        <div class="sb-store sb-p1${hot === 13 ? ' sb-hot' : ''}" aria-label="${storeLabel(1)}: ${shown[13]}"><b>${shown[13]}</b></div>`;
      const [a, b] = [nm(0), nm(1)];
      const sc = root.querySelector('#score');
      sc.innerHTML = `<span class="dot-p" style="background:var(--accent)"></span> ${shown[6]} – ${shown[13]} <span class="dot-p" style="background:var(--ok)"></span>`;
      sc.setAttribute('aria-label', `${a} ${shown[6]}, ${b} ${shown[13]}`);
      if (g.over) return;
      const extra = !busy && g.last && g.last.path[g.last.path.length - 1] === store(g.turn) ? ' · torna a tirar!' : '';
      const cap = !busy && g.last && g.last.capture ? ` · s'ha quedat ${g.last.capture.n} llavors!` : '';
      const who = isCpu() ? (g.turn === 0 ? 'El teu torn' : 'Pensa la màquina…') : turnText(g.turn, `Torn del ${NAMES['2p'][g.turn]}`);
      root.querySelector('#turn').innerHTML = `<b class="${g.turn ? 'p2' : 'p1'}">${who}</b>${extra}${cap}`;
    }

    function finish() {
      stop();
      const w = winner(g);
      const title = w === null ? 'Empat!' : isCpu() ? (w === 0 ? 'Has guanyat!' : 'Guanya la màquina') : winText(w, `Guanya el ${NAMES['2p'][w]}!`);
      root.querySelector('#turn').innerHTML = `<b class="${w === 1 ? 'p2' : 'p1'}">${title}</b>`;
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="--stack-gap:8px">
          <h2 style="color:${w === 1 ? 'var(--ok)' : 'var(--accent)'}">${title}</h2>
          <p class="muted">${nm(0)} ${g.b[6]} – ${g.b[13]} ${nm(1)}</p>
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
