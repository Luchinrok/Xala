// ============================================================
// Petards amagats — joc d'un sol jugador (del tipus «busca les mines»).
//
// Destapa caselles sense fer petar cap petard. Cada número diu quants petards
// hi ha a les vuit caselles del voltant. Mantén el dit (o tria «Marca») per
// posar-hi una bandera. Es guanya quan s'han destapat totes les caselles
// sense petard.
// ============================================================

import { newGame, reveal, chord, toggleFlag, flags, count } from './petards-motor.js';
import { getRecord, setRecord } from './records.js';

const LEVELS = {
  easy: { name: 'Fàcil', rows: 9, cols: 8, mines: 10 },
  normal: { name: 'Normal', rows: 12, cols: 9, mines: 18 },
  hard: { name: 'Difícil', rows: 14, cols: 10, mines: 30 },
};
const HOLD_MS = 420; // mantenir el dit: bandera
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default {
  id: 'petards',
  title: 'Petards amagats',
  tagline: 'Destapa-ho tot sense fer petar res',
  accent: '#E4572E',
  color: 'var(--accent)',
  ready: true,

  instructions: [
    'Toca una casella per destapar-la. El primer toc és sempre segur.',
    'Cada número diu quants petards hi ha a les vuit caselles del voltant.',
    'Mantén el dit sobre una casella (o tria «Marca») per posar-hi una bandera on creus que hi ha un petard.',
    'Toca un número que ja té totes les banderes al voltant per destapar de cop la resta de caselles del voltant.',
    'Guanyes quan has destapat totes les caselles sense petard. Si en destapes un: patapam!',
  ],

  mount(root, { goHome }) {
    let level = getRecord('petards:level');
    if (!LEVELS[level]) level = 'easy';
    let g = null, markMode = false, timer = null, secs = 0, started = false;

    const best = () => getRecord('petards:' + level) || 0;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function leave() { stop(); goHome(); }

    // ---------- 1) inici ----------
    function screenConfig() {
      stop();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Petards amagats</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Destapa-ho tot sense fer petar res</h2>
        <p class="label" style="margin:0 0 12px">Dificultat</p>
        <div class="btn-row" id="levels">
          ${Object.entries(LEVELS).map(([id, l]) => `<button class="btn ${level === id ? 'btn--accent' : 'btn--outline'}" data-level="${id}">${l.name}</button>`).join('')}
        </div>
        <p class="muted center" style="margin-top:12px">${LEVELS[level].cols}×${LEVELS[level].rows} · ${LEVELS[level].mines} petards${best() ? ` · Rècord: ${fmt(best())}` : ''}</p>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-level]').forEach(b => {
        b.onclick = () => { level = b.dataset.level; setRecord('petards:level', level); screenConfig(); };
      });
      root.querySelector('#start').onclick = begin;
    }

    // ---------- 2) partida ----------
    function begin() {
      stop();
      const L = LEVELS[level];
      g = newGame(L.rows, L.cols, L.mines);
      markMode = false; secs = 0; started = false;
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score"></div>
        </div>
        <p class="traca-status" id="status" aria-live="polite">Toca una casella per començar</p>
        <div class="pt-board" id="board" style="--cols:${L.cols}" role="grid" aria-label="Tauler de ${L.cols} per ${L.rows}"></div>
        <div class="btn-row" id="controls" style="margin-top:14px">
          <button class="btn btn--accent" id="dig" aria-pressed="true">Destapa</button>
          <button class="btn btn--outline" id="mark" aria-pressed="false">⚑ Marca</button>
        </div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#dig').onclick = () => setMode(false);
      root.querySelector('#mark').onclick = () => setMode(true);
      wireBoard(root.querySelector('#board'));
      render();
    }

    function setMode(m) {
      markMode = m;
      const dig = root.querySelector('#dig'), mark = root.querySelector('#mark');
      dig.className = 'btn ' + (m ? 'btn--outline' : 'btn--accent'); dig.setAttribute('aria-pressed', String(!m));
      mark.className = 'btn ' + (m ? 'btn--accent' : 'btn--outline'); mark.setAttribute('aria-pressed', String(m));
    }

    // Un toc destapa (o marca, en mode «Marca»); mantenir el dit posa bandera.
    function wireBoard(el) {
      let hold = null, held = false;
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      el.addEventListener('pointerdown', (e) => {
        const cell = e.target.closest('.pt-cell');
        if (!cell || g.over) return;
        held = false;
        hold = setTimeout(() => { held = true; act(+cell.dataset.r, +cell.dataset.c, true); if (navigator.vibrate) navigator.vibrate(20); }, HOLD_MS);
      });
      const cancel = () => { clearTimeout(hold); hold = null; };
      el.addEventListener('pointerup', cancel);
      el.addEventListener('pointercancel', cancel);
      el.addEventListener('pointerleave', cancel);
      el.addEventListener('click', (e) => {
        const cell = e.target.closest('.pt-cell');
        if (!cell || held) { held = false; return; }
        act(+cell.dataset.r, +cell.dataset.c, markMode);
      });
      // teclat: Enter destapa, F (o Espai en mode Marca) posa bandera
      el.addEventListener('keydown', (e) => {
        const cell = e.target.closest('.pt-cell');
        if (cell && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); act(+cell.dataset.r, +cell.dataset.c, true); }
      });
    }

    function act(r, c, flag) {
      if (!g || g.over) return;
      let res;
      if (flag) { if (!toggleFlag(g, r, c)) return; res = 'flag'; }
      else if (g.open[r][c]) res = chord(g, r, c);
      else res = reveal(g, r, c);
      if (!res) return;
      if (!started && res !== 'flag') {
        started = true;
        timer = setInterval(() => { secs++; renderScore(); }, 1000);
        setStatus('');
      }
      render();
      if (res === 'boom' || res === 'win') end(res === 'win');
    }

    function renderScore() {
      const s = root.querySelector('#score');
      if (s) s.textContent = `⚑ ${g.mines - flags(g)} · ${fmt(secs)}`;
    }

    function render() {
      const el = root.querySelector('#board');
      if (!el) return;
      // es manté el focus de teclat sobre la mateixa casella després de redibuixar
      const f = document.activeElement && document.activeElement.closest && document.activeElement.closest('.pt-cell');
      const keep = f ? [f.dataset.r, f.dataset.c] : null;
      let html = '';
      for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
        let cls = 'pt-cell', inner = '', label = 'tapada';
        if (g.open[r][c]) {
          const n = count(g, r, c);
          cls += ' pt-open';
          if (n) { inner = n; cls += ' pt-n' + n; }
          label = n ? `${n}` : 'buida';
        } else if (g.over && g.mine[r][c]) {
          cls += ' pt-mine' + (g.boom && g.boom[0] === r && g.boom[1] === c ? ' pt-boom' : '') + (g.won ? ' pt-safe' : '');
          inner = '<span class="pt-petard"></span>';
          label = 'petard';
        } else if (g.flag[r][c]) {
          cls += ' pt-flag' + (g.over ? ' pt-wrong' : '');
          inner = '⚑'; label = 'bandera';
        }
        html += `<button class="${cls}" data-r="${r}" data-c="${c}" aria-label="Fila ${r + 1}, columna ${c + 1}: ${label}">${inner}</button>`;
      }
      el.innerHTML = html;
      if (keep) { const k = el.querySelector(`.pt-cell[data-r="${keep[0]}"][data-c="${keep[1]}"]`); if (k) k.focus(); }
      renderScore();
    }

    function setStatus(t) { const el = root.querySelector('#status'); if (el) el.textContent = t; }

    // ---------- 3) final ----------
    function end(won) {
      stop();
      const record = won && (!best() || secs < best());
      if (record) setRecord('petards:' + level, secs);
      // en guanyar, els petards que quedaven es marquen sols
      if (won) for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) if (g.mine[r][c]) g.flag[r][c] = false;
      render();
      setStatus(won ? 'Tots els petards trobats!' : 'Patapam!');
      root.querySelector('#controls').style.display = 'none';
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="margin-top:14px;--stack-gap:8px">
          <h2 style="font-size:28px;color:var(--accent)">${record ? 'Nou rècord!' : won ? 'Ho has aconseguit!' : 'Has fet petar un petard'}</h2>
          <p class="muted">${won ? `${fmt(secs)}${record || !best() ? '' : ` · Rècord: ${fmt(best())}`}` : 'Torna-hi: el primer toc és sempre segur.'}</p>
        </div>
        <div class="stack" style="margin-top:14px;--stack-gap:12px">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Sortir</button>
        </div>`;
      box.querySelector('#again').onclick = begin;
      box.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
