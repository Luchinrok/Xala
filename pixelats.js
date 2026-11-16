// ============================================================
// Pixelats — joc d'un sol jugador (del tipus nonograma).
//
// Cada fila i columna diu quins blocs de caselles s'han de pintar, en ordre.
// Pinta (tocant o arrossegant el dit) i, si vols, marca amb ✕ les que segur
// que van buides. Quan totes les files i columnes quadren, surt el dibuix.
// Els dibuixos són a pixelats-dibuixos.js (tots es resolen sense endevinar).
// ============================================================

import { LEVELS } from './pixelats-dibuixos.js';
import { parse, rowClues, colClues, clues, solved } from './pixelats-motor.js';
import { getRecord, setRecord } from './records.js';

const doneKey = (lv, i) => `pixelats:${lv}:${i}`;

export default {
  id: 'pixelats',
  title: 'Pixelats',
  tagline: 'Pinta les caselles i descobreix el dibuix',
  accent: '#E4572E',
  color: 'var(--accent)',
  ready: true,
  instructions: [
    'Els números de cada fila i de cada columna diuen quants blocs de caselles pintades hi ha, en ordre. «3 1» vol dir: tres seguides, almenys un buit, i una.',
    'Toca una casella per pintar-la, o arrossega el dit per pintar-ne unes quantes. Torna a tocar-la per esborrar-la.',
    'Amb el botó ✕ marques les caselles que segur que van buides: ajuda a pensar.',
    'Quan una fila o una columna quadra, els seus números es tornen grisos. Quan quadra tot, surt el dibuix. Cap dibuix no cal endevinar-lo: es pot resoldre pensant.',
  ],

  mount(root, { goHome }) {
    let lv = LEVELS[getRecord('pixelats:level')] ? getRecord('pixelats:level') : 'easy';
    let idx = 0, pic = null, rc = null, cc = null, cells = null, marks = null, mode = 'fill', over = false;
    const isDone = (l, i) => !!getRecord(doneKey(l, i));
    const nextOf = (l) => { const k = LEVELS[l].pics.findIndex((_, i) => !isDone(l, i)); return k < 0 ? 0 : k; };
    function leave() { goHome(); }

    // ---------- 1) tria ----------
    function screenConfig() {
      const L = LEVELS[lv];
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Pixelats</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Pinta les caselles i descobreix el dibuix</h2>
        <p class="label" style="margin:0 0 12px">Dificultat</p>
        <div class="btn-row">
          ${Object.entries(LEVELS).map(([id, l]) => `<button class="btn ${lv === id ? 'btn--accent' : 'btn--outline'}" data-lv="${id}">${l.name}</button>`).join('')}
        </div>
        <p class="label" style="margin:18px 0 10px">Dibuixos</p>
        <div class="px-list">
          ${L.pics.map((p, i) => `<button class="px-item${isDone(lv, i) ? ' is-done' : ''}" data-i="${i}" aria-label="Dibuix ${i + 1}${isDone(lv, i) ? `: ${p.name}` : ''}">${isDone(lv, i) ? mini(parse(p.rows)) : `<span>${i + 1}</span>`}</button>`).join('')}
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">${L.pics.some((_, i) => isDone(lv, i)) ? 'Continua' : 'Comença'}</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-lv]').forEach(b => { b.onclick = () => { lv = b.dataset.lv; setRecord('pixelats:level', lv); screenConfig(); }; });
      root.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => begin(+b.dataset.i); });
      root.querySelector('#start').onclick = () => begin(nextOf(lv));
    }
    // miniatura d'un dibuix fet
    function mini(p) {
      const n = p.length;
      return `<svg viewBox="0 0 ${n} ${n}" aria-hidden="true">${p.map((row, r) => row.map((v, c) => (v ? `<rect x="${c}" y="${r}" width="1.02" height="1.02"/>` : '')).join('')).join('')}</svg>`;
    }

    // ---------- 2) partida ----------
    function begin(i) {
      idx = i; over = false; mode = 'fill';
      pic = parse(LEVELS[lv].pics[i].rows);
      rc = rowClues(pic); cc = colClues(pic);
      const n = pic.length;
      cells = Array.from({ length: n }, () => Array(n).fill(false));
      marks = Array.from({ length: n }, () => Array(n).fill(false));
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score">${LEVELS[lv].name} · ${i + 1}/${LEVELS[lv].pics.length}</div>
        </div>
        <p class="traca-status" id="status" aria-live="polite">Pinta les caselles</p>
        <div class="px-board px-${n}" id="board" style="--n:${n}"></div>
        <div class="btn-row" id="controls" style="margin-top:14px">
          <button class="btn btn--accent" id="fill" aria-pressed="true">■ Pinta</button>
          <button class="btn btn--outline" id="cross" aria-pressed="false">✕ Buida</button>
        </div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#fill').onclick = () => setMode('fill');
      root.querySelector('#cross').onclick = () => setMode('cross');
      build();
      wire(root.querySelector('#board'));
    }
    function setMode(m) {
      mode = m;
      root.querySelector('#fill').className = 'btn ' + (m === 'fill' ? 'btn--accent' : 'btn--outline');
      root.querySelector('#cross').className = 'btn ' + (m === 'cross' ? 'btn--accent' : 'btn--outline');
      root.querySelector('#fill').setAttribute('aria-pressed', String(m === 'fill'));
      root.querySelector('#cross').setAttribute('aria-pressed', String(m === 'cross'));
    }

    // graella: cantonada, pistes de columna, i per a cada fila la seva pista i les caselles
    function build() {
      const n = pic.length;
      let h = '<div class="px-corner"></div>';
      for (let c = 0; c < n; c++) h += `<div class="px-cc" data-cc="${c}">${cc[c].map(x => `<span>${x}</span>`).join('')}</div>`;
      for (let r = 0; r < n; r++) {
        h += `<div class="px-rc" data-rc="${r}">${rc[r].join('-')}</div>`; // «2-1», que no sembli 21
        for (let c = 0; c < n; c++) {
          const edge = (c % 5 === 4 && c < n - 1 ? ' px-er' : '') + (r % 5 === 4 && r < n - 1 ? ' px-eb' : '');
          h += `<button class="px-cell${edge}" data-r="${r}" data-c="${c}" aria-label="Fila ${r + 1}, columna ${c + 1}"></button>`;
        }
      }
      root.querySelector('#board').innerHTML = h;
      paint();
    }
    function paint() {
      const n = pic.length;
      root.querySelectorAll('.px-cell').forEach(el => {
        const r = +el.dataset.r, c = +el.dataset.c;
        el.classList.toggle('on', cells[r][c]);
        el.classList.toggle('x', !cells[r][c] && marks[r][c]);
      });
      for (let r = 0; r < n; r++) root.querySelector(`[data-rc="${r}"]`).classList.toggle('ok', JSON.stringify(clues(cells[r])) === JSON.stringify(rc[r]));
      for (let c = 0; c < n; c++) root.querySelector(`[data-cc="${c}"]`).classList.toggle('ok', JSON.stringify(clues(cells.map(row => row[c]))) === JSON.stringify(cc[c]));
    }

    // tocar o arrossegar: la primera casella decideix si s'omple o s'esborra
    function wire(el) {
      let drawing = null;
      const at = (e) => {
        const t = document.elementFromPoint(e.clientX, e.clientY);
        const cell = t && t.closest && t.closest('.px-cell');
        return cell ? [+cell.dataset.r, +cell.dataset.c] : null;
      };
      const apply = (rc2) => {
        if (!rc2 || over) return;
        const [r, c] = rc2;
        if (mode === 'fill') { cells[r][c] = drawing; if (drawing) marks[r][c] = false; }
        else { if (!cells[r][c]) marks[r][c] = drawing; }
        paint();
      };
      el.addEventListener('pointerdown', (e) => {
        const p = at(e);
        if (!p || over) return;
        e.preventDefault();
        const [r, c] = p;
        drawing = mode === 'fill' ? !cells[r][c] : !marks[r][c];
        apply(p);
      });
      el.addEventListener('pointermove', (e) => { if (drawing !== null) apply(at(e)); });
      const end = () => { if (drawing !== null) { drawing = null; check(); } };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('pointerleave', end);
      // teclat: Enter pinta, X marca buida
      el.addEventListener('keydown', (e) => {
        const cell = e.target.closest('.px-cell');
        if (!cell || over) return;
        const r = +cell.dataset.r, c = +cell.dataset.c;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cells[r][c] = !cells[r][c]; marks[r][c] = false; paint(); check(); }
        else if (e.key === 'x' || e.key === 'X') { e.preventDefault(); if (!cells[r][c]) marks[r][c] = !marks[r][c]; paint(); }
      });
    }

    function check() {
      if (!solved(cells, rc, cc)) return;
      over = true;
      setRecord(doneKey(lv, idx), 1);
      const p = LEVELS[lv].pics[idx];
      root.querySelector('#board').classList.add('px-won');
      root.querySelectorAll('.px-cell.x').forEach(el => el.classList.remove('x'));
      root.querySelector('#status').textContent = `És ${p.name}!`;
      root.querySelector('#controls').style.display = 'none';
      const last = idx + 1 >= LEVELS[lv].pics.length;
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="--stack-gap:6px">
          <h2 style="color:var(--accent)">És ${p.name}!</h2>
          <p class="muted">${LEVELS[lv].pics.filter((_, i) => isDone(lv, i)).length} de ${LEVELS[lv].pics.length} dibuixos de ${LEVELS[lv].name.toLowerCase()}</p>
        </div>
        <div class="stack">
          <button class="btn btn--accent" id="next">${last ? 'Dibuixos' : 'Següent'}</button>
          <button class="btn btn--outline" id="home">Sortir</button>
        </div>`;
      box.querySelector('#next').onclick = () => (last ? screenConfig() : begin(idx + 1));
      box.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
