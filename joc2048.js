// ============================================================
// 2048 — joc d'un sol jugador.
//
// Graella 4×4. Es llisca en una direcció i totes les fitxes es desplacen;
// dues d'iguals que xoquen es fusionen sumant-se. Després de cada
// moviment vàlid apareix una fitxa nova (2 o 4) en una casella buida a
// l'atzar. Objectiu: arribar a 2048 (pots continuar). Fi quan no queden
// moviments.
//
// Animació: cada fitxa és un element absolut posicionat per transform
// (translate) segons la seva casella; en moure, la transició CSS del
// transform fa que LLISQUI fins a la nova posició (com les peces dels
// escacs). En fusionar-se, les dues fitxes llisquen a la casella de
// fusió i la resultant fa un pop; les fitxes noves apareixen amb pop un
// cop acabat el desplaçament.
//
// Controls: mòbil amb gestos de lliscar (sense fer scroll de pàgina);
// ordinador amb les tecles de fletxa.
//
// Estètica: fons beix; fitxa de beix (--paper-2) a corall com més gran;
// número sempre llegible (tinta o crema). Cap negre. Cap sense scroll.
// ============================================================

import { getRecord, setRecord } from './records.js';

const SIZE = 4;
const MOVE_MS = 130; // ha de coincidir amb la transició CSS de .g2048-tile

// Índexs de cada línia segons la direcció (les fitxes es mouen cap al
// primer índex de cada llista).
function buildLines() {
  const rowsLR = [], colsTB = [];
  for (let r = 0; r < SIZE; r++) {
    const row = [];
    for (let c = 0; c < SIZE; c++) row.push(r * SIZE + c);
    rowsLR.push(row);
  }
  for (let c = 0; c < SIZE; c++) {
    const col = [];
    for (let r = 0; r < SIZE; r++) col.push(r * SIZE + c);
    colsTB.push(col);
  }
  return {
    left:  rowsLR,
    right: rowsLR.map(l => l.slice().reverse()),
    up:    colsTB,
    down:  colsTB.map(l => l.slice().reverse()),
  };
}
const LINES = buildLines();

// Aparença de la fitxa segons el valor: de beix (petits) a corall
// (grans); número en tinta per als clars i crema per als foscos.
function tileVisual(v) {
  const p2 = [0xF4, 0xE8, 0xD2], coral = [0xE4, 0x57, 0x2E];
  const t = Math.min(1, Math.max(0, (Math.log2(v) - 1) / 10)); // 2→0 ... 2048→1
  const mix = p2.map((a, i) => Math.round(a + (coral[i] - a) * t));
  const len = String(v).length;
  return {
    bg: `rgb(${mix[0]},${mix[1]},${mix[2]})`,
    fg: t > 0.32 ? 'var(--paper)' : 'var(--ink)',
    fs: len >= 4 ? 'clamp(17px,6vmin,30px)'
      : len === 3 ? 'clamp(21px,7vmin,34px)'
      : 'clamp(26px,8.6vmin,40px)',
  };
}

// Calcula el resultat d'un moviment a partir de la llista de fitxes
// (objectes { id, val, idx }). FUNCIÓ PURA: no toca el DOM ni l'estat.
// Retorna:
//   changed     -> el moviment fa alguna cosa
//   gained      -> punts sumats (valor de cada fusió)
//   target      -> Map id -> casella destí (per animar el desplaçament)
//   finalTiles  -> nou estat de fitxes [{ id, val, idx }] (fusions fetes,
//                  absorbides ja excloses; cada fitxa es fusiona 1 cop)
//   absorbedIds -> Set d'ids de fitxes absorbides en fusions
function computeMove(tiles, dir) {
  const byIdx = new Map();
  tiles.forEach(t => byIdx.set(t.idx, t));
  const target = new Map();      // id -> idx destí
  const mergedSurv = new Set();  // ids de supervivents que ja han fusionat
  const merges = [];
  const finalTiles = [];
  let gained = 0;

  LINES[dir].forEach(idxs => {
    const lineTiles = idxs.map(i => byIdx.get(i)).filter(Boolean);
    let pos = 0;     // següent casella lliure de la línia
    let last = null; // darrera fitxa col·locada (candidata a fusió)
    lineTiles.forEach(t => {
      if (last && !mergedSurv.has(last.id) && last.val === t.val) {
        // fusió: t llisca fins a la casella del supervivent (last)
        target.set(t.id, target.get(last.id));
        mergedSurv.add(last.id);
        const newVal = last.val * 2;
        gained += newVal;
        merges.push({ survivorId: last.id, absorbedId: t.id });
        const ft = finalTiles.find(f => f.id === last.id);
        if (ft) ft.val = newVal; // el supervivent dobla el valor
      } else {
        const to = idxs[pos++];
        target.set(t.id, to);
        finalTiles.push({ id: t.id, val: t.val, idx: to });
        last = t;
      }
    });
  });

  const absorbedIds = new Set(merges.map(m => m.absorbedId));
  const changed = merges.length > 0 || tiles.some(t => target.get(t.id) !== t.idx);
  return { changed, gained, target, finalTiles, absorbedIds };
}

export { computeMove };

export default {
  id: '2048',
  title: '2048',
  tagline: 'Ajunta els números fins al 2048',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,

  instructions: [
    'Llisca amunt, avall, esquerra o dreta (o fletxes) per moure totes les fitxes.',
    'Dues fitxes amb el mateix número que xoquen es fusionen i se sumen.',
    'Cada moviment apareix una fitxa nova (2 o 4) en una casella buida.',
    'Arriba a 2048; s\'acaba quan no queden moviments possibles.',
  ],

  mount(root, { goHome }) {
    const state = {
      tiles: [],   // { id, val, idx }
      grid: new Array(SIZE * SIZE).fill(0),
      score: 0,
      won: false,
    };
    const tileEls = new Map(); // id -> element exterior
    let nextId = 1;
    let animating = false;
    let keyHandler = null;
    let resizeHandler = null;

    function cleanup() {
      if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
      if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null; }
    }
    function leave() { cleanup(); goHome(); }

    const best = () => getRecord('joc2048') || 0;

    // ---------- 1) configuració ----------
    function screenConfig() {
      cleanup();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">2048</p>
        <h2 style="font-size:30px;margin:6px 0 14px">Ajunta fins a 2048</h2>
        <p class="muted" style="margin-bottom:8px">Llisca (o fletxes) per moure les fitxes. Dues d'iguals es fusionen i se sumen. Arriba a 2048!</p>
        <button class="btn btn--outline" id="record" style="margin-top:8px">Rècord</button>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelector('#record').onclick = screenRecords;
      root.querySelector('#start').onclick = beginGame;
    }

    // ---------- rècord ----------
    function screenRecords() {
      cleanup();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">2048</p>
        <h2 style="font-size:30px;margin:6px 0 18px">Rècord</h2>
        <div class="panel center stack" style="margin-top:8px">
          <p class="muted">Millor puntuació</p>
          <h2 style="font-size:44px;color:var(--accent)">${best()}</h2>
        </div>
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
    }

    // ---------- arrenca la partida ----------
    function beginGame() {
      cleanup();
      state.tiles = [];
      state.grid = new Array(SIZE * SIZE).fill(0);
      state.score = 0;
      state.won = false;
      tileEls.clear();
      nextId = 1;
      animating = false;
      spawnTile();
      spawnTile();
      screenGame();
    }

    // Afegeix una fitxa a una casella buida a l'atzar; retorna l'objecte.
    function spawnTile() {
      const empties = [];
      for (let i = 0; i < state.grid.length; i++) if (state.grid[i] === 0) empties.push(i);
      if (!empties.length) return null;
      const idx = empties[Math.floor(Math.random() * empties.length)];
      const val = Math.random() < 0.9 ? 2 : 4;
      const tile = { id: nextId++, val, idx };
      state.grid[idx] = val;
      state.tiles.push(tile);
      return tile;
    }

    // ---------- 2) joc ----------
    function screenGame() {
      const slotsHtml = Array.from({ length: SIZE * SIZE }, () => '<span class="g2048-slot"></span>').join('');
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <div class="g2048-head">
          <span class="kicker">Punts: <b id="score">${state.score}</b></span>
          <span class="kicker">Rècord: <b id="best">${best()}</b></span>
        </div>
        <p class="g2048-win" id="win" style="display:${state.won ? 'block' : 'none'}">Has fet 2048!</p>
        <div class="g2048-board">
          <div class="g2048-layer" id="layer">${slotsHtml}</div>
        </div>
      `;
      root.querySelector('#back').onclick = screenConfig;

      // crea els elements de les fitxes existents (sense animació d'entrada
      // per a les inicials: pop suau)
      const slots = slotRects();
      state.tiles.forEach(t => addTileEl(t, slots, true));

      bindInput();
    }

    // Rectangles (x, y, mida) de cada casella, llegits dels slots de fons.
    function slotRects() {
      return Array.from(root.querySelectorAll('.g2048-slot'))
        .map(s => ({ x: s.offsetLeft, y: s.offsetTop, w: s.offsetWidth }));
    }

    function tileTransform(slots, idx) {
      const p = slots[idx] || { x: 0, y: 0 };
      return `translate(${p.x}px, ${p.y}px)`;
    }

    function setTileVisual(el, val) {
      const v = tileVisual(val);
      const inner = el.firstChild;
      inner.style.background = v.bg;
      inner.style.color = v.fg;
      inner.style.fontSize = v.fs;
      inner.textContent = val;
    }

    function positionTile(el, slots, idx) {
      const p = slots[idx] || { x: 0, y: 0, w: 0 };
      el.style.width = p.w + 'px';
      el.style.height = p.w + 'px';
      el.style.transform = tileTransform(slots, idx);
    }

    function makeTileEl(tile, slots) {
      const el = document.createElement('span');
      el.className = 'g2048-tile';
      el.dataset.id = tile.id;
      const inner = document.createElement('span');
      inner.className = 'g2048-tile__inner';
      el.appendChild(inner);
      setTileVisual(el, tile.val);
      el.style.transition = 'none'; // posiciona sense animar
      positionTile(el, slots, tile.idx);
      return el;
    }

    function addTileEl(tile, slots, isNew) {
      const el = makeTileEl(tile, slots);
      root.querySelector('#layer').appendChild(el);
      tileEls.set(tile.id, el);      // registra l'element per poder-lo animar/treure
      void el.offsetWidth;          // reflux: fixa la posició inicial
      el.style.transition = '';      // torna a la transició del CSS
      if (isNew) popInner(el, 'pop-in');
    }

    // (re)dispara una animació de pop a l'inner
    function popInner(el, cls) {
      const inner = el.firstChild;
      if (!inner) return;
      inner.classList.remove('pop', 'pop-in');
      void inner.offsetWidth;
      inner.classList.add(cls);
    }

    function bindInput() {
      const board = root.querySelector('.g2048-board');
      let sx = 0, sy = 0, tracking = false;
      board.addEventListener('touchstart', (e) => {
        const t = e.touches[0]; sx = t.clientX; sy = t.clientY; tracking = true;
      }, { passive: true });
      board.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
      board.addEventListener('touchend', (e) => {
        if (!tracking) return;
        tracking = false;
        const t = e.changedTouches[0];
        const dx = t.clientX - sx, dy = t.clientY - sy;
        const ax = Math.abs(dx), ay = Math.abs(dy);
        if (Math.max(ax, ay) < 24) return;
        if (ax > ay) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
      }, { passive: true });

      keyHandler = (e) => {
        const dir = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key];
        if (dir) { e.preventDefault(); move(dir); }
      };
      document.addEventListener('keydown', keyHandler);

      // reposiciona (sense animar) si canvia la mida de la finestra
      resizeHandler = () => {
        const slots = slotRects();
        state.tiles.forEach(t => {
          const el = tileEls.get(t.id);
          if (!el) return;
          el.style.transition = 'none';
          positionTile(el, slots, t.idx);
          void el.offsetWidth;
          el.style.transition = '';
        });
      };
      window.addEventListener('resize', resizeHandler);
    }

    function rebuildGrid() {
      state.grid = new Array(SIZE * SIZE).fill(0);
      state.tiles.forEach(t => { state.grid[t.idx] = t.val; });
    }

    // ---------- moviment animat ----------
    function move(dir) {
      if (animating) return;
      const { changed, gained, target, finalTiles, absorbedIds } = computeMove(state.tiles, dir);
      if (!changed) return;
      animating = true;

      const slots = slotRects();
      // 1) totes les fitxes (també les absorbides) llisquen al seu destí
      state.tiles.forEach(t => {
        const el = tileEls.get(t.id);
        if (el) el.style.transform = tileTransform(slots, target.get(t.id));
      });
      state.score += gained;
      updateScore();

      // 2) en acabar el desplaçament: aplica l'estat real, fusions i nova
      setTimeout(() => {
        // treu els elements de les fitxes absorbides
        absorbedIds.forEach(id => {
          const el = tileEls.get(id);
          if (el && el.parentNode) el.parentNode.removeChild(el);
          tileEls.delete(id);
        });
        // l'estat passa a ser exactament el resultat calculat
        state.tiles = finalTiles;
        // actualitza els elements supervivents que han canviat de valor (pop)
        finalTiles.forEach(t => {
          const el = tileEls.get(t.id);
          if (!el) return;
          const inner = el.firstChild;
          if (inner && inner.textContent !== String(t.val)) {
            setTileVisual(el, t.val);
            popInner(el, 'pop');
          }
        });
        rebuildGrid();

        // fitxa nova (apareix amb pop un cop acabat el desplaçament)
        const nt = spawnTile();
        if (nt) addTileEl(nt, slots, true);

        if (!state.won && state.tiles.some(t => t.val >= 2048)) {
          state.won = true;
          const w = root.querySelector('#win');
          if (w) w.style.display = 'block';
        }

        animating = false;
        if (isGameOver()) screenGameOver();
      }, MOVE_MS + 20);
    }

    function updateScore() {
      const sc = root.querySelector('#score');
      if (sc) sc.textContent = state.score;
    }

    function isGameOver() {
      if (state.grid.includes(0)) return false;
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const v = state.grid[r * SIZE + c];
          if (c < SIZE - 1 && state.grid[r * SIZE + c + 1] === v) return false;
          if (r < SIZE - 1 && state.grid[(r + 1) * SIZE + c] === v) return false;
        }
      }
      return true;
    }

    // ---------- 3) fi del joc ----------
    function screenGameOver() {
      cleanup();
      const prev = best();
      const isRecord = state.score > prev;
      if (isRecord) setRecord('joc2048', state.score);
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center">Final</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:32px;color:var(--accent)">Sense moviments!</h2>
          ${isRecord ? '<p class="kicker" style="color:var(--accent)">Nou rècord!</p>' : ''}
          <p class="muted">Puntuació</p>
          <h2 style="font-size:40px">${state.score}</h2>
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
