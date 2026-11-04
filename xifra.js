// ============================================================
// La Xifra — joc de càlcul per a un sol jugador.
//
// Sis fitxes amb números i un objectiu. Es tria una fitxa, una operació i una
// altra fitxa, i el resultat es converteix en una fitxa nova. Quantes menys
// fitxes fas servir per arribar a l'objectiu, més estrelles.
// Hi ha un repte del dia i la resta es poden jugar sense límit, per nivells.
// ============================================================

import { LEVELS, makePuzzle, solve, starsFor, dayNumber } from './xifra-motor.js';
import { getRecord, setRecord } from './records.js';
import { focusIfKeyboard } from './board-keys.js';

const SITE = 'https://luchinrok.github.io/Xala/';
const OPS = ['+', '−', '×', '÷'];
const OP_NAME = { '+': 'més', '−': 'menys', '×': 'per', '÷': 'entre' };

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const starsText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

export default {
  id: 'xifra',
  title: 'La Xifra',
  tagline: 'Arriba al número amb poques fitxes',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Has d\'arribar a l\'objectiu combinant les fitxes: toca una fitxa, una operació i una altra fitxa.',
    'El resultat es converteix en una fitxa nova, i pots continuar calculant amb ella.',
    'Sempre amb nombres enters i positius, i les divisions han de ser exactes.',
    'Quantes menys fitxes facis servir, més estrelles. No cal fer-les servir totes.',
    'Cada dia hi ha un repte nou, i per nivells en tens tants com vulguis.',
  ],

  mount(root, { goHome }) {
    let level = getRecord('xifra:level');
    if (!LEVELS[level]) level = 'easy';

    let puzzle = null;
    let isDaily = false;
    let num = 0;
    let tiles = [];      // { id, v, count } fitxes disponibles
    let nextId = 0;
    let sel = null;      // id de la primera fitxa triada
    let op = null;       // operació triada
    let history = [];    // { tiles, line } per poder desfer
    let done = false;
    let lastFocus = null;

    const key = () => (isDaily ? `xifra:d:${today()}` : `xifra:${level}:${num}`);
    const nextIn = (lv) => { const n = getRecord('xifra:next:' + lv); return Number.isInteger(n) ? n : 0; };

    function streakInfo() {
      const s = getRecord('xifra:streak') || {};
      const t = today();
      const alive = s.last === t || (s.last && dayNumber(t) - dayNumber(s.last) === 1);
      return { doneToday: s.last === t, n: alive ? s.n || 0 : 0 };
    }
    function markDaily() {
      const s = getRecord('xifra:streak') || {};
      const t = today();
      if (s.last === t) return;
      const n = s.last && dayNumber(t) - dayNumber(s.last) === 1 ? (s.n || 0) + 1 : 1;
      setRecord('xifra:streak', { last: t, n });
    }

    // ---------- 1) inici ----------
    function screenConfig() {
      const st = streakInfo();
      const best = getRecord(`xifra:d:${today()}`);
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">La Xifra</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Arriba al número amb poques fitxes</h2>

        <button class="mat2-daily" id="daily">
          <span class="mat2-daily__k">Repte del dia</span>
          <span class="mat2-daily__t">${st.doneToday ? `Fet! ${best ? starsText(best) : ''}` : 'Resol el d\'avui'}</span>
          <span class="mat2-daily__s">${st.n ? (st.n === 1 ? 'Ratxa: 1 dia' : `Ratxa: ${st.n} dies seguits`) : 'Fes-ne un cada dia i fes ratxa'}</span>
        </button>

        <p class="label" style="margin:26px 0 12px">Reptes sense límit</p>
        <div class="btn-row" id="levels">
          ${Object.entries(LEVELS).map(([id, l]) => `<button class="btn ${level === id ? 'btn--accent' : 'btn--outline'}" data-level="${id}">${l.name}</button>`).join('')}
        </div>
        <p class="muted center" style="margin-top:12px">Repte ${nextIn(level) + 1}</p>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = goHome;
      root.querySelector('#daily').onclick = () => openDaily();
      root.querySelectorAll('[data-level]').forEach(b => {
        b.onclick = () => { level = b.dataset.level; setRecord('xifra:level', level); screenConfig(); };
      });
      root.querySelector('#start').onclick = () => openFree(nextIn(level));
    }

    function openDaily() {
      isDaily = true;
      num = dayNumber(today());
      begin(makePuzzle('normal', num));
    }
    function openFree(n) {
      isDaily = false;
      num = n;
      begin(makePuzzle(level, n));
    }

    function begin(p) {
      puzzle = p;
      nextId = 0;
      tiles = p.tiles.map(v => ({ id: nextId++, v, count: 1 }));
      sel = null; op = null; history = []; done = false;
      screenGame();
    }

    // ---------- 2) el repte ----------
    function screenGame() {
      const label = isDaily ? 'Repte del dia' : `${LEVELS[level].name} · ${num + 1}`;
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score">${label}</div>
        </div>
        <div class="xifra-target">
          <span class="xifra-target__k">Objectiu</span>
          <span class="xifra-target__n" id="target">${puzzle.target}</span>
          <span class="xifra-target__s">${starsText(3)} amb ${puzzle.minTiles} fitxes</span>
        </div>
        <p class="traca-status" id="status" aria-live="polite"></p>
        <div class="xifra-tiles" id="tiles"></div>
        <div class="xifra-ops" id="ops">
          ${OPS.map(o => `<button class="xifra-op" data-op="${o}" aria-label="${OP_NAME[o]}">${o}</button>`).join('')}
        </div>
        <div class="xifra-steps" id="steps"></div>
        <div id="controls" class="btn-row" style="margin-top:14px">
          <button class="btn btn--outline" id="undo">Desfés</button>
          <button class="btn btn--outline" id="reset">Reinicia</button>
          <button class="btn btn--outline" id="solution">Solució</button>
        </div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#undo').onclick = undo;
      root.querySelector('#reset').onclick = reset;
      root.querySelector('#solution').onclick = showSolution;
      root.querySelector('#tiles').addEventListener('click', (e) => {
        const b = e.target.closest('.xifra-tile');
        if (b) tapTile(+b.dataset.id);
      });
      root.querySelector('#ops').addEventListener('click', (e) => {
        const b = e.target.closest('.xifra-op');
        if (b) tapOp(b.dataset.op);
      });
      setStatus('Toca una fitxa per començar');
      render();
    }

    function render() {
      const box = root.querySelector('#tiles');
      if (!box) return;
      const hadFocus = document.activeElement && document.activeElement.classList.contains('xifra-tile');
      box.innerHTML = tiles.map(t =>
        `<button class="xifra-tile${t.count > 1 ? ' xifra-tile--new' : ''}${t.id === sel ? ' on' : ''}" data-id="${t.id}"
          aria-pressed="${t.id === sel}" aria-label="${t.v}${t.count > 1 ? `, resultat de ${t.count} fitxes` : ''}"${done ? ' disabled' : ''}>${t.v}</button>`).join('');
      root.querySelectorAll('.xifra-op').forEach(b => {
        const on = b.dataset.op === op;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
        b.disabled = done;
      });
      root.querySelector('#steps').innerHTML = history.map(h => `<span class="xifra-step">${h.line}</span>`).join('');
      if (hadFocus || lastFocus != null) {
        const target = box.querySelector(`[data-id="${lastFocus}"]`) || box.querySelector('.xifra-tile');
        focusIfKeyboard(target);
      }
    }

    function setStatus(txt, good) {
      const el = root.querySelector('#status');
      if (!el) return;
      el.textContent = txt;
      el.classList.toggle('traca-status--good', !!good);
    }

    function tapTile(id) {
      if (done) return;
      lastFocus = id;
      if (sel == null) {
        sel = id;
        setStatus('Ara, una operació');
      } else if (sel === id) {
        sel = null; op = null;
        setStatus('Toca una fitxa');
      } else if (!op) {
        sel = id; // encara no hi ha operació: canvia de fitxa
        setStatus('Ara, una operació');
      } else {
        apply(id);
        return;
      }
      render();
    }

    function tapOp(o) {
      if (done) return;
      if (sel == null) { setStatus('Primer, tria una fitxa'); return; }
      op = op === o ? null : o;
      setStatus(op ? 'Ara, l\'altra fitxa' : 'Ara, una operació');
      render();
    }

    function apply(id) {
      const a = tiles.find(t => t.id === sel);
      const b = tiles.find(t => t.id === id);
      let r = null;
      if (op === '+') r = a.v + b.v;
      else if (op === '×') r = a.v * b.v;
      else if (op === '−') {
        if (a.v <= b.v) { setStatus('Ha de quedar un número positiu'); return; }
        r = a.v - b.v;
      } else if (op === '÷') {
        if (b.v === 0 || a.v % b.v !== 0) { setStatus('La divisió ha de ser exacta'); return; }
        r = a.v / b.v;
      }
      history.push({ tiles: tiles.map(t => ({ ...t })), line: `${a.v} ${op} ${b.v} = ${r}` });
      const fresh = { id: nextId++, v: r, count: a.count + b.count };
      tiles = tiles.map(t => (t.id === b.id ? fresh : t)).filter(t => t.id !== a.id);
      sel = null; op = null;
      lastFocus = fresh.id;
      if (r === puzzle.target) { render(); finish(fresh.count); return; }
      if (tiles.length === 1) setStatus('No queden fitxes. Desfés o reinicia');
      else setStatus(`${r}! Continua`);
      render();
    }

    function undo() {
      if (done || !history.length) return;
      tiles = history.pop().tiles;
      sel = null; op = null;
      setStatus('Desfet');
      render();
    }
    function reset() {
      if (done) return;
      begin(puzzle);
    }

    // ---------- 3) final ----------
    function goNext() {
      if (isDaily) { openFree(nextIn(level)); return; }
      openFree(num + 1);
    }

    function endBox(title, sub, canShare) {
      root.querySelector('#controls').style.display = 'none';
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="margin-top:14px;--stack-gap:8px">
          <h2 style="font-size:28px;color:var(--accent)">${title}</h2>
          <p class="muted">${sub}</p>
        </div>
        <div class="stack" style="margin-top:14px;--stack-gap:12px">
          <button class="btn btn--accent" id="next">Següent repte</button>
          ${canShare ? '<button class="btn btn--outline" id="share">Repta un amic</button>' : ''}
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>`;
      box.querySelector('#next').onclick = goNext;
      box.querySelector('#home').onclick = goHome;
      focusIfKeyboard(box.querySelector('#next'));
    }

    function advanceFree() {
      if (!isDaily && num === nextIn(level)) setRecord('xifra:next:' + level, num + 1);
    }

    function finish(used) {
      done = true;
      const stars = starsFor(used, puzzle.minTiles);
      const prev = getRecord(key()) || 0;
      if (stars > prev) setRecord(key(), stars);
      if (isDaily) markDaily();
      advanceFree();
      render();
      setStatus(starsText(stars), true);
      const sub = stars === 3
        ? `Amb ${used} fitxes. Millor impossible!`
        : `Amb ${used} fitxes. Es pot fer amb ${puzzle.minTiles}.`;
      endBox('La Xifra!', sub, true);
      const share = root.querySelector('#share');
      if (share) share.onclick = () => shareResult(stars, used);
    }

    function showSolution() {
      if (done) return;
      done = true;
      advanceFree();
      const sol = solve(puzzle.tiles, puzzle.target);
      history = [];
      render();
      root.querySelector('#steps').innerHTML = sol.steps.map(s => `<span class="xifra-step">${s.a} ${s.op} ${s.b} = ${s.r}</span>`).join('');
      setStatus('Aquesta és la manera més curta');
      endBox('La solució', `${puzzle.target} amb ${sol.tiles} fitxes. El proper és teu!`, false);
    }

    async function shareResult(stars, used) {
      const text = `La Xifra${isDaily ? ' del dia' : ''}: arribar a ${puzzle.target}. Jo ho he fet amb ${used} fitxes, ${starsText(stars)}. Em superes?`;
      try {
        if (navigator.share) { await navigator.share({ text, url: SITE }); return; }
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
      try {
        await navigator.clipboard.writeText(`${text} ${SITE}`);
        setStatus('Copiat! Enganxa-ho on vulguis', true);
      } catch (e) {
        setStatus('No s\'ha pogut compartir');
      }
    }

    screenConfig();
  },
};
