// ============================================================
// Sopa de lletres — joc d'un sol jugador.
//
// Les paraules surten de les categories triades (reaprofita CATEGORIES;
// només cal la paraula). Per a la graella es normalitzen: majúscules,
// sense accents ni espais (p. ex. "PINGÜÍ" -> "PINGUI"). Es col·loquen
// en horitzontal, vertical i diagonal, endavant i enrere, podent
// encreuar-se; la resta de caselles s'omplen amb lletres a l'atzar.
//
// Selecció: s'arrossega el dit (o el ratolí) de la primera a l'última
// lletra en línia recta; si coincideix amb una paraula (en qualsevol
// sentit) es marca com a trobada (caselles en corall, paraula ratllada).
//
// Estètica: fons i caselles beix (--paper); lletres en tinta (--ink);
// trobades en corall (--accent). Cap negre. La graella cap sense scroll.
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { openCategoryScreen, categoriesLabel } from './category-select.js';
import { getRecord, setRecord } from './records.js';

// Dificultat: mida de la graella i nombre de paraules.
const LEVELS = {
  easy:   { label: 'Fàcil',   N: 8,  count: 6  },
  normal: { label: 'Normal',  N: 11, count: 9  },
  hard:   { label: 'Difícil', N: 13, count: 12 },
};

// Les 8 direccions (horitzontal, vertical i diagonal, endavant i enrere).
const DIRS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const fmtTime = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

// Normalitza per a la graella: majúscules, sense accents ni res que no
// sigui A–Z ("PINGÜÍ" -> "PINGUI", "Ç" -> "C").
function norm(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z]/g, '');
}

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const randLetter = () => ALPHA[Math.floor(Math.random() * 26)];

// Intenta col·locar `word` a la graella (cel·les buides o amb la mateixa
// lletra: permet encreuar). Retorna les caselles o null si no hi cap.
function tryPlace(grid, N, word) {
  const L = word.length;
  for (let t = 0; t < 400; t++) {
    const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
    const r = Math.floor(Math.random() * N);
    const c = Math.floor(Math.random() * N);
    const er = r + dr * (L - 1), ec = c + dc * (L - 1);
    if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
    const cells = [];
    let ok = true;
    for (let k = 0; k < L; k++) {
      const rr = r + dr * k, cc = c + dc * k;
      const cur = grid[rr][cc];
      if (cur && cur !== word[k]) { ok = false; break; }
      cells.push([rr, cc]);
    }
    if (ok) return cells;
  }
  return null;
}

// Construeix la graella: col·loca fins a `count` paraules de `pool` i
// omple la resta amb lletres a l'atzar. Retorna { grid, placed }.
function buildGrid(N, count, pool) {
  const grid = Array.from({ length: N }, () => Array(N).fill(''));
  const placed = [];
  for (const w of shuffle(pool)) {
    if (placed.length >= count) break;
    const cells = tryPlace(grid, N, w.norm);
    if (!cells) continue;
    for (let k = 0; k < w.norm.length; k++) {
      const [r, c] = cells[k];
      grid[r][c] = w.norm[k];
    }
    placed.push({ text: w.text, norm: w.norm, cells, found: false });
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!grid[r][c]) grid[r][c] = randLetter();
    }
  }
  return { grid, placed };
}

export default {
  id: 'sopa',
  title: 'Sopa de lletres',
  tagline: 'Troba les paraules amagades',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Tria les categories d\'on surten les paraules i la dificultat.',
    'Busca a la graella les paraules de la llista.',
    'Poden estar en horitzontal, vertical o diagonal, i del dret o del revés.',
    'Llisca el dit de la primera a l\'última lletra per marcar-les.',
  ],

  mount(root, { goHome }) {
    const state = {
      categoryIds: [],     // cap categoria per defecte
      level: 'normal',
      N: 11,
      grid: [],            // N×N lletres
      placed: [],          // { text, norm, cells, found }
      cellEls: [],         // N×N elements de casella
      selCells: [],        // selecció en curs
      seconds: 0,
    };
    let timerId = null;
    let board = null;
    let dragging = false;
    let startRC = null;

    function cleanup() {
      if (timerId) { clearInterval(timerId); timerId = null; }
      dragging = false;
      startRC = null;
    }
    function leave() { cleanup(); goHome(); }

    // ---------- paraules de les categories triades ----------
    // Només paraules d'un sol mot que, normalitzades, càpiguen a la
    // graella (3..N lletres); sense duplicats.
    function buildPool(maxLen) {
      const seen = new Set();
      const out = [];
      CATEGORIES.filter(c => state.categoryIds.includes(c.id)).forEach(c => {
        c.words.forEach(w => {
          const original = w.word;
          if (/\s/.test(original.trim())) return; // descarta expressions de més d'un mot
          const n = norm(original);
          if (n.length < 3 || n.length > maxLen) return;
          if (seen.has(n)) return;
          seen.add(n);
          out.push({ text: original, norm: n });
        });
      });
      return out;
    }

    // ---------- 1) configuració ----------
    function screenConfig() {
      cleanup();
      const levelOpts = ['easy', 'normal', 'hard'];
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Sopa de lletres</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>

        <p class="label" style="margin:0 0 12px">Categories</p>
        <button class="btn btn--outline" id="cats">${categoriesLabel(state.categoryIds)}</button>

        <p class="label" style="margin:24px 0 12px">Dificultat</p>
        <div class="btn-row" id="levels">
          ${levelOpts.map(k => `<button class="btn ${state.level === k ? 'btn--accent' : 'btn--outline'}" data-level="${k}">${LEVELS[k].label}</button>`).join('')}
        </div>
        <p class="muted" id="lvinfo" style="margin-top:12px"></p>

        <button class="btn btn--outline" id="record" style="margin-top:14px">Rècord</button>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700;display:none">Tria almenys una categoria.</p>
      `;
      const info = () => {
        const el = root.querySelector('#lvinfo');
        if (el) { const L = LEVELS[state.level]; el.textContent = `Graella ${L.N}×${L.N} · ${L.count} paraules`; }
      };
      info();
      updateStart();

      root.querySelector('#back').onclick = leave;

      root.querySelector('#cats').onclick = () => {
        openCategoryScreen(root, { categoryIds: state.categoryIds, kicker: 'Sopa de lletres', onBack: screenConfig });
      };

      root.querySelectorAll('[data-level]').forEach(b => {
        b.onclick = () => {
          state.level = b.dataset.level;
          root.querySelectorAll('[data-level]').forEach(x => {
            x.className = 'btn ' + (x.dataset.level === state.level ? 'btn--accent' : 'btn--outline');
          });
          info();
        };
      });

      root.querySelector('#record').onclick = screenRecords;
      root.querySelector('#start').onclick = () => {
        if (state.categoryIds.length === 0) { updateStart(); return; }
        beginGame();
      };
    }

    // Habilita "Comença" només si hi ha alguna categoria triada.
    function updateStart() {
      const has = state.categoryIds.length > 0;
      const go = root.querySelector('#start');
      const warn = root.querySelector('#warn');
      if (go) go.disabled = !has;
      if (warn) warn.style.display = has ? 'none' : 'block';
    }

    // ---------- rècord: millor temps per dificultat ----------
    const recordId = (level) => `sopa:${level}`;

    function screenRecords() {
      cleanup();
      const rows = ['easy', 'normal', 'hard'].map(lv => {
        const r = getRecord(recordId(lv));
        const txt = r ? fmtTime(r.time) : '—';
        return `<div class="btn btn--outline" style="display:flex;justify-content:space-between;cursor:default;text-align:left">
          <span>${LEVELS[lv].label}</span><span style="color:var(--accent)">${txt}</span></div>`;
      }).join('');
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Sopa de lletres</p>
        <h2 style="font-size:30px;margin:6px 0 14px">Rècord</h2>
        <p class="muted" style="margin-bottom:12px">Millor temps de cada dificultat</p>
        <div class="stack" style="--stack-gap:8px">${rows}</div>
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
    }

    // ---------- arrenca la partida ----------
    function beginGame() {
      cleanup();
      const L = LEVELS[state.level];
      state.N = L.N;
      const pool = buildPool(L.N);
      const { grid, placed } = buildGrid(L.N, L.count, pool);
      state.grid = grid;
      state.placed = placed;
      state.seconds = 0;
      screenGame();
    }

    // ---------- 2) joc ----------
    function screenGame() {
      const N = state.N;
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <div class="sopa-head"><span class="kicker">Temps: <b id="time">0:00</b></span></div>
        <div class="sopa-board" id="board" style="--n:${N}"></div>
        <div class="sopa-words" id="words"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;

      board = root.querySelector('#board');
      renderBoard();
      renderWords();
      wirePointer();

      startTimer();
    }

    function renderBoard() {
      board.innerHTML = '';
      state.cellEls = [];
      for (let r = 0; r < state.N; r++) {
        const row = [];
        for (let c = 0; c < state.N; c++) {
          const d = document.createElement('div');
          d.className = 'sopa-cell';
          d.textContent = state.grid[r][c];
          board.appendChild(d);
          row.push(d);
        }
        state.cellEls.push(row);
      }
      // pinta les paraules ja trobades (en tornar a entrar a la pantalla)
      state.placed.forEach(w => {
        if (w.found) w.cells.forEach(([r, c]) => state.cellEls[r][c].classList.add('found'));
      });
    }

    function renderWords() {
      const box = root.querySelector('#words');
      box.innerHTML = state.placed.map((w, i) =>
        `<span class="sopa-word ${w.found ? 'found' : ''}" data-i="${i}">${w.text}</span>`).join('');
    }

    // ---------- selecció (tàctil + ratolí) ----------
    // Coordenada de casella a partir d'un punt de la pantalla.
    function cellFromPoint(x, y) {
      const rect = board.getBoundingClientRect();
      const c = Math.floor((x - rect.left) / (rect.width / state.N));
      const r = Math.floor((y - rect.top) / (rect.height / state.N));
      if (r < 0 || r >= state.N || c < 0 || c >= state.N) return null;
      return [r, c];
    }

    // Línia recta de `start` cap a `end`, ajustada a una de les 8
    // direccions (és indulgent amb el dit: tria l'eix dominant).
    function lineCells(start, end) {
      const [sr, sc] = start, [er, ec] = end;
      const dr = er - sr, dc = ec - sc;
      const adr = Math.abs(dr), adc = Math.abs(dc);
      if (adr === 0 && adc === 0) return [[sr, sc]];
      let dirR, dirC, len;
      if (adc > 2 * adr) { dirR = 0; dirC = Math.sign(dc); len = adc; }
      else if (adr > 2 * adc) { dirR = Math.sign(dr); dirC = 0; len = adr; }
      else { dirR = Math.sign(dr); dirC = Math.sign(dc); len = Math.max(adr, adc); }
      const cells = [];
      for (let k = 0; k <= len; k++) {
        const rr = sr + dirR * k, cc = sc + dirC * k;
        if (rr < 0 || rr >= state.N || cc < 0 || cc >= state.N) break;
        cells.push([rr, cc]);
      }
      return cells;
    }

    function clearSel() {
      state.selCells.forEach(([r, c]) => state.cellEls[r][c].classList.remove('sel'));
      state.selCells = [];
    }
    function showSel(cells) {
      clearSel();
      cells.forEach(([r, c]) => state.cellEls[r][c].classList.add('sel'));
      state.selCells = cells;
    }

    function wirePointer() {
      board.addEventListener('pointerdown', (e) => {
        const rc = cellFromPoint(e.clientX, e.clientY);
        if (!rc) return;
        dragging = true;
        startRC = rc;
        showSel([rc]);
        try { board.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      });
      board.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const rc = cellFromPoint(e.clientX, e.clientY);
        if (!rc) return;
        showSel(lineCells(startRC, rc));
        e.preventDefault();
      });
      const end = (e) => {
        if (!dragging) return;
        dragging = false;
        checkSelection();
        clearSel();
        e.preventDefault();
      };
      board.addEventListener('pointerup', end);
      board.addEventListener('pointercancel', end);
    }

    // Comprova si la selecció actual és una paraula (en qualsevol sentit).
    function checkSelection() {
      if (state.selCells.length < 3) return;
      const s = state.selCells.map(([r, c]) => state.grid[r][c]).join('');
      const rev = s.split('').reverse().join('');
      for (const w of state.placed) {
        if (w.found) continue;
        if (w.norm === s || w.norm === rev) { markFound(w); break; }
      }
    }

    function markFound(w) {
      w.found = true;
      w.cells.forEach(([r, c]) => state.cellEls[r][c].classList.add('found'));
      const item = root.querySelector(`.sopa-word[data-i="${state.placed.indexOf(w)}"]`);
      if (item) item.classList.add('found');
      if (state.placed.length > 0 && state.placed.every(p => p.found)) {
        stopTimer();
        screenEnd();
      }
    }

    // ---------- temporitzador ----------
    function startTimer() {
      state.seconds = 0;
      paintTime();
      timerId = setInterval(() => { state.seconds++; paintTime(); }, 1000);
    }
    function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
    function paintTime() {
      const el = root.querySelector('#time');
      if (el) el.textContent = fmtTime(state.seconds);
    }

    // ---------- 3) final ----------
    function screenEnd() {
      cleanup();
      const id = recordId(state.level);
      const prev = getRecord(id);
      const isRecord = !prev || state.seconds < prev.time;
      if (isRecord) setRecord(id, { time: state.seconds });
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center">Final</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:34px;color:var(--accent)">Completada!</h2>
          ${isRecord ? '<p class="kicker" style="color:var(--accent)">Nou rècord!</p>' : ''}
          <p class="muted">${LEVELS[state.level].label} · ${state.placed.length} paraules</p>
          <p class="muted">Temps: <b>${fmtTime(state.seconds)}</b></p>
        </div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:20px">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#again').onclick = beginGame;
      root.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
