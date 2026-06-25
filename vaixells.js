// ============================================================
// Enfonsar els vaixells — 2 jugadors en un sol mòbil (tornar i passar),
// o 1 jugador contra la màquina. Tauler 10×10.
//
// Flux: configuració (mode) -> col·locació de la flota (amb porta de
// passada entre jugadors a 2P) -> combat per torns (tauler de seguiment
// de l'enemic; porta de passada abans de cada torn humà) -> final.
//
// Estètica: aigua/caselles beix (--paper-2), vaixells propis en tinta
// (--ink), tocat en corall (--accent), enfonsat en corall intens, aigua
// fallada amb un punt de tinta. Cap negre. Els taulers caben sense scroll.
// ============================================================

const N = 10;

// Flota de cada jugador: nom i eslora (caselles).
const FLEET = [
  { name: 'Portaavions', size: 5 },
  { name: 'Cuirassat',   size: 4 },
  { name: 'Creuer',      size: 3 },
  { name: 'Submarí',     size: 3 },
  { name: 'Destructor',  size: 2 },
];

function makeBoard() {
  return {
    ships: FLEET.map(f => ({ name: f.name, size: f.size, cells: [], hits: 0 })),
    cellShip: Array.from({ length: N }, () => Array(N).fill(-1)), // -1 aigua
    shots: Array.from({ length: N }, () => Array(N).fill(null)),  // null/'miss'/'hit'
  };
}

const inB = (r, c) => r >= 0 && r < N && c >= 0 && c < N;

// Caselles que ocuparia un vaixell des de (r,c) amb una orientació.
function shipCells(r, c, size, orient) {
  const cells = [];
  for (let i = 0; i < size; i++) cells.push(orient === 'h' ? [r, c + i] : [r + i, c]);
  return cells;
}

// Vàlid si totes són dins i en aigua (el vaixell s'ha de treure abans).
function canPlace(board, cells) {
  return cells.every(([r, c]) => inB(r, c) && board.cellShip[r][c] === -1);
}

function placeShip(board, idx, cells) {
  board.ships[idx].cells = cells;
  cells.forEach(([r, c]) => { board.cellShip[r][c] = idx; });
}

function removeShip(board, idx) {
  board.ships[idx].cells.forEach(([r, c]) => { board.cellShip[r][c] = -1; });
  board.ships[idx].cells = [];
}

function randomFleet(board) {
  board.ships.forEach((_, idx) => removeShip(board, idx));
  board.ships.forEach((ship, idx) => {
    for (let t = 0; t < 1000; t++) {
      const orient = Math.random() < 0.5 ? 'h' : 'v';
      const r = Math.floor(Math.random() * N);
      const c = Math.floor(Math.random() * N);
      const cells = shipCells(r, c, ship.size, orient);
      if (canPlace(board, cells)) { placeShip(board, idx, cells); break; }
    }
  });
}

// Dispara a (r,c). Retorna {result:'miss'|'hit'|'sunk', ship} o null si repetit.
function fireAt(board, r, c) {
  if (board.shots[r][c] != null) return null;
  const idx = board.cellShip[r][c];
  if (idx === -1) { board.shots[r][c] = 'miss'; return { result: 'miss' }; }
  const ship = board.ships[idx];
  ship.hits++;
  board.shots[r][c] = 'hit';
  return { result: ship.hits >= ship.size ? 'sunk' : 'hit', ship };
}

const allSunk = (board) => board.ships.every(s => s.hits >= s.size);

export default {
  id: 'vaixells',
  title: 'Enfonsar els vaixells',
  tagline: 'Troba i enfonsa la flota rival',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,

  instructions: [
    'Cada jugador col·loca la seva flota en secret a la graella de 10×10.',
    'Per torns, dispareu a una casella del rival passant-vos el mòbil.',
    '"Aigua" si falles, "Tocat!" o "Enfonsat!" si encertes.',
    'Guanya qui enfonsa primer tota la flota enemiga.',
  ],

  mount(root, { goHome }) {
    const state = {
      mode: '2p',           // 'cpu' | '2p' (per defecte 2 jugadors)
      boards: [null, null],
      current: 0,           // qui dispara
      sel: 0,               // vaixell seleccionat en col·locació
      orient: 'h',          // 'h' | 'v'
      ai: null,             // estat de la màquina (mode cpu)
    };

    // recursos de l'arrossegament/preview de col·locació
    let placeBoardEl = null;
    let prevCells = [];
    let aiTimer = null;   // temporitzadors de la pausa/animació de la màquina

    function clearAiTimer() { if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; } }
    function cleanupPlace() {
      prevCells = [];
      placeBoardEl = null;
      clearAiTimer();
    }
    function leave() { cleanupPlace(); goHome(); }

    // Animació breu d'impacte a una casella (ona + escala del marcador).
    function animateImpact(boardEl, r, c) {
      if (!boardEl) return;
      const cell = boardEl.children[r * N + c];
      if (!cell) return;
      cell.classList.add('vx-impact', 'vx-pop');
      setTimeout(() => { cell.classList.remove('vx-impact', 'vx-pop'); }, 600);
    }

    // Contorn (box-shadow per costats) que delimita cada vaixell sencer: es
    // dibuixa la vora només als costats que NO toquen el mateix vaixell, de
    // manera que dos vaixells adjacents queden separats per les seves vores.
    function shipEdgeShadow(board, r, c) {
      const idx = board.cellShip[r][c];
      if (idx === -1) return '';
      const W = '2.5px', col = 'var(--paper)';
      const same = (rr, cc) => inB(rr, cc) && board.cellShip[rr][cc] === idx;
      const parts = [];
      if (!same(r - 1, c)) parts.push(`inset 0 ${W} 0 0 ${col}`);
      if (!same(r + 1, c)) parts.push(`inset 0 -${W} 0 0 ${col}`);
      if (!same(r, c - 1)) parts.push(`inset ${W} 0 0 0 ${col}`);
      if (!same(r, c + 1)) parts.push(`inset -${W} 0 0 0 ${col}`);
      return parts.join(', ');
    }

    const isCpu = () => state.mode === 'cpu';
    function playerName(i) {
      if (isCpu()) return i === 0 ? 'Tu' : 'La màquina';
      return 'Jugador ' + (i + 1);
    }

    // ============================================================
    // 1) configuració
    // ============================================================
    function screenConfig() {
      cleanupPlace();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Enfonsar els vaixells</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>

        <p class="label" style="margin:0 0 12px">Mode</p>
        <div class="btn-row" id="modes">
          <button class="btn ${state.mode === 'cpu' ? 'btn--accent' : 'btn--outline'}" data-mode="cpu">1 jugador</button>
          <button class="btn ${state.mode === '2p' ? 'btn--accent' : 'btn--outline'}" data-mode="2p">2 jugadors</button>
        </div>
        <p class="muted" id="modeinfo" style="margin-top:12px"></p>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      const info = () => {
        const el = root.querySelector('#modeinfo');
        if (el) el.textContent = isCpu()
          ? 'Jugues contra la màquina al mateix mòbil.'
          : 'Dos jugadors al mateix mòbil: tornar i passar.';
      };
      info();
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-mode]').forEach(b => {
        b.onclick = () => {
          state.mode = b.dataset.mode;
          root.querySelectorAll('[data-mode]').forEach(x => {
            x.className = 'btn ' + (x.dataset.mode === state.mode ? 'btn--accent' : 'btn--outline');
          });
          info();
        };
      });
      root.querySelector('#start').onclick = startSetup;
    }

    // ============================================================
    // porta de passada (només 2 jugadors)
    // ============================================================
    function screenPass(name, sub, onTap) {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <div class="spacer"></div>
        <div class="panel center stack vx-door" id="door">
          <p class="kicker">${sub}</p>
          <h2 style="font-size:28px">Passa el mòbil a<br>${name}</h2>
          <p class="muted">Toca la pantalla quan el tinguis</p>
        </div>
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#door').onclick = onTap;
    }

    // ============================================================
    // 2) col·locació de la flota
    // ============================================================
    function startSetup() {
      state.boards = [makeBoard(), makeBoard()];
      if (isCpu()) {
        randomFleet(state.boards[1]); // la màquina es col·loca a l'atzar
        beginPlacement(0, () => startCombat());
      } else {
        beginPlacement(0, () => {
          screenPass(playerName(1), 'Col·locació', () =>
            beginPlacement(1, () => startCombat()));
        });
      }
    }

    function beginPlacement(player, onDone) {
      state.sel = firstUnplaced(state.boards[player]);
      state.orient = 'h';
      if (isCpu()) screenPlacement(player, onDone);
      else screenPass(playerName(player), 'Col·locació', () => screenPlacement(player, onDone));
    }

    function firstUnplaced(board) {
      const i = board.ships.findIndex(s => s.cells.length === 0);
      return i === -1 ? 0 : i;
    }
    const fleetDone = (board) => board.ships.every(s => s.cells.length > 0);

    function screenPlacement(player, onDone) {
      const board = state.boards[player];
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Col·locació · ${playerName(player)}</p>
        <div class="vx-board vx-board--place" id="pboard"></div>
        <div class="vx-ships" id="ships"></div>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn btn--outline" id="rotate">Girar (${state.orient === 'h' ? 'horitzontal' : 'vertical'})</button>
          <button class="btn btn--outline" id="rand">Col·loca a l'atzar</button>
        </div>
        <button class="btn btn--accent" id="ready" style="margin-top:10px" ${fleetDone(board) ? '' : 'disabled'}>Llest</button>
      `;
      root.querySelector('#back').onclick = screenConfig;
      placeBoardEl = root.querySelector('#pboard');
      renderPlaceBoard(board);
      renderShipList(board);
      wirePlace(board, player, onDone);

      root.querySelector('#rotate').onclick = () => { state.orient = state.orient === 'h' ? 'v' : 'h'; screenPlacement(player, onDone); };
      root.querySelector('#rand').onclick = () => {
        randomFleet(board);
        state.sel = firstUnplaced(board);
        screenPlacement(player, onDone);
      };
      root.querySelector('#ready').onclick = () => { if (fleetDone(board)) onDone(); };
    }

    function renderPlaceBoard(board) {
      placeBoardEl.innerHTML = '';
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const d = document.createElement('div');
          const ship = board.cellShip[r][c] !== -1;
          d.className = 'vx-cell' + (ship ? ' ship' : '');
          if (ship) d.style.boxShadow = shipEdgeShadow(board, r, c);
          d.dataset.r = r; d.dataset.c = c;
          placeBoardEl.appendChild(d);
        }
      }
    }

    function renderShipList(board) {
      const box = root.querySelector('#ships');
      box.innerHTML = board.ships.map((s, i) => {
        const placed = s.cells.length > 0;
        const cls = 'vx-ship' + (i === state.sel ? ' sel' : '') + (placed ? ' placed' : '');
        return `<button class="${cls}" data-ship="${i}">${s.name} <b>${s.size}</b>${placed ? ' ✓' : ''}</button>`;
      }).join('');
      box.querySelectorAll('[data-ship]').forEach(b => {
        b.onclick = () => {
          const i = parseInt(b.dataset.ship, 10);
          state.sel = i;
          if (board.ships[i].cells.length > 0) removeShip(board, i); // recull per recol·locar
          renderPlaceBoard(board);
          renderShipList(board);
          syncReady(board);
        };
      });
    }

    function syncReady(board) {
      const r = root.querySelector('#ready');
      if (r) r.disabled = !fleetDone(board);
    }

    function cellFromPoint(el, x, y) {
      const rect = el.getBoundingClientRect();
      const c = Math.floor((x - rect.left) / (rect.width / N));
      const r = Math.floor((y - rect.top) / (rect.height / N));
      return inB(r, c) ? [r, c] : null;
    }

    function clearPreview() {
      prevCells.forEach(([r, c]) => {
        const el = placeBoardEl.children[r * N + c];
        if (el) el.classList.remove('prev-ok', 'prev-bad');
      });
      prevCells = [];
    }

    function showPreview(board, r, c) {
      clearPreview();
      const ship = board.ships[state.sel];
      if (!ship || ship.cells.length > 0) return;
      const cells = shipCells(r, c, ship.size, state.orient);
      const ok = canPlace(board, cells);
      cells.forEach(([rr, cc]) => {
        if (!inB(rr, cc)) return;
        const el = placeBoardEl.children[rr * N + cc];
        el.classList.add(ok ? 'prev-ok' : 'prev-bad');
        prevCells.push([rr, cc]);
      });
      return ok;
    }

    function wirePlace(board, player, onDone) {
      let lastRC = null;
      const move = (e) => {
        const rc = cellFromPoint(placeBoardEl, e.clientX, e.clientY);
        if (!rc) { clearPreview(); lastRC = null; return; }
        lastRC = rc;
        showPreview(board, rc[0], rc[1]);
        e.preventDefault();
      };
      const down = (e) => {
        placeBoardEl.setPointerCapture && placeBoardEl.setPointerCapture(e.pointerId);
        move(e);
      };
      const up = (e) => {
        const rc = cellFromPoint(placeBoardEl, e.clientX, e.clientY) || lastRC;
        clearPreview();
        if (!rc) return;
        const ship = board.ships[state.sel];
        if (!ship || ship.cells.length > 0) return;
        const cells = shipCells(rc[0], rc[1], ship.size, state.orient);
        if (canPlace(board, cells)) {
          placeShip(board, state.sel, cells);
          renderPlaceBoard(board);
          const next = firstUnplaced(board);
          state.sel = board.ships[next].cells.length === 0 ? next : state.sel;
          renderShipList(board);
          syncReady(board);
        } else {
          flashInvalid(cells);
        }
        e.preventDefault();
      };
      placeBoardEl.addEventListener('pointerdown', down);
      placeBoardEl.addEventListener('pointermove', move);
      placeBoardEl.addEventListener('pointerup', up);
      placeBoardEl.addEventListener('pointercancel', () => clearPreview());
    }

    function flashInvalid(cells) {
      cells.forEach(([r, c]) => {
        if (!inB(r, c)) return;
        const el = placeBoardEl.children[r * N + c];
        if (!el) return;
        el.classList.add('prev-bad');
        setTimeout(() => el.classList.remove('prev-bad'), 260);
      });
    }

    // ============================================================
    // 3) combat per torns
    // ============================================================
    function startCombat() {
      state.current = 0;
      if (isCpu()) state.ai = { stack: [], hitsOnShip: [] };
      nextTurn();
    }

    function nextTurn() {
      if (isCpu()) { screenShoot(0); return; } // a 1P sempre dispares tu primer
      screenPass(playerName(state.current), 'El teu torn', () => screenShoot(state.current));
    }

    // Tauler de seguiment de l'enemic (sense vaixells): es dispara aquí.
    function screenShoot(shooter) {
      clearAiTimer();
      const opp = state.boards[1 - shooter];
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">${playerName(shooter)} dispara</p>
        <p class="vx-status" id="status">Toca una casella per disparar</p>
        <div class="vx-board" id="tboard"></div>
        <div id="ctl" style="margin-top:14px"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      const tb = root.querySelector('#tboard');
      renderTrackBoard(tb, opp, true, (r, c) => fireHuman(shooter, r, c));
    }

    function fireHuman(shooter, r, c) {
      const opp = state.boards[1 - shooter];
      const res = fireAt(opp, r, c);
      if (!res) return; // ja s'hi havia disparat
      const tb = root.querySelector('#tboard');
      renderTrackBoard(tb, opp, false, null); // congela el tauler
      animateImpact(tb, r, c);                // anima on ha caigut el tret
      setStatus(res);
      if (allSunk(opp)) { endGame(shooter); return; }
      const ctl = root.querySelector('#ctl');
      if (isCpu()) {
        ctl.innerHTML = `<button class="btn btn--accent" id="cont">Continua</button>`;
        ctl.querySelector('#cont').onclick = machineTurn;
      } else {
        ctl.innerHTML = `<button class="btn btn--accent" id="cont">Passa el torn</button>`;
        ctl.querySelector('#cont').onclick = () => { state.current = 1 - shooter; nextTurn(); };
      }
    }

    function setStatus(res) {
      const el = root.querySelector('#status');
      if (!el) return;
      if (res.result === 'miss') { el.textContent = 'Aigua'; el.className = 'vx-status'; }
      else if (res.result === 'hit') { el.textContent = 'Tocat!'; el.className = 'vx-status hit'; }
      else { el.textContent = `Enfonsat! ${res.ship.name}`; el.className = 'vx-status hit'; }
    }

    // ---------- torn de la màquina (mode 1 jugador) ----------
    function machineTurn() {
      clearAiTimer();
      const mine = state.boards[0];
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Torn de la màquina</p>
        <p class="vx-status" id="status">La màquina apunta…</p>
        <div class="vx-board" id="oboard"></div>
        <div id="ctl" style="margin-top:14px"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      renderOwnBoard(root.querySelector('#oboard'), mine);

      // Pausa "d'apuntar" perquè es vegi el torn, i després el tret animat.
      aiTimer = setTimeout(() => {
        aiTimer = null;
        const ob = root.querySelector('#oboard');
        if (!ob) return; // s'ha sortit de la pantalla mentrestant
        const [r, c] = aiChooseShot(mine);
        const res = fireAt(mine, r, c);
        aiUpdate(mine, r, c, res);
        renderOwnBoard(ob, mine);
        animateImpact(ob, r, c);
        const el = root.querySelector('#status');
        if (res.result === 'miss') { el.textContent = `La màquina dispara… Aigua`; el.className = 'vx-status'; }
        else if (res.result === 'hit') { el.textContent = `La màquina et toca un vaixell!`; el.className = 'vx-status hit'; }
        else { el.textContent = `La màquina t'enfonsa el ${res.ship.name}!`; el.className = 'vx-status hit'; }

        if (allSunk(mine)) { aiTimer = setTimeout(() => endGame(1), 800); return; }
        // deixa veure l'impacte abans d'oferir continuar
        aiTimer = setTimeout(() => {
          aiTimer = null;
          const ctl = root.querySelector('#ctl');
          if (!ctl) return;
          ctl.innerHTML = `<button class="btn btn--accent" id="cont">Continua</button>`;
          ctl.querySelector('#cont').onclick = () => screenShoot(0);
        }, 550);
      }, 850);
    }

    // IA "buscar i rematar": prova la pila d'objectius; si no, caça per parets.
    function aiChooseShot(board) {
      while (state.ai.stack.length) {
        const [r, c] = state.ai.stack.pop();
        if (inB(r, c) && board.shots[r][c] == null) return [r, c];
      }
      // caça: tauler d'escacs (cel·les no disparades amb (r+c) parell), si no qualsevol
      const free = [], freeParity = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (board.shots[r][c] == null) { free.push([r, c]); if ((r + c) % 2 === 0) freeParity.push([r, c]); }
      }
      const pool = freeParity.length ? freeParity : free;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function aiUpdate(board, r, c, res) {
      const ai = state.ai;
      if (res.result === 'sunk') { ai.stack = []; ai.hitsOnShip = []; return; }
      if (res.result === 'hit') {
        ai.hitsOnShip.push([r, c]);
        if (ai.hitsOnShip.length >= 2) {
          // continua la línia pels dos extrems
          const hs = ai.hitsOnShip;
          const sameRow = hs.every(h => h[0] === hs[0][0]);
          if (sameRow) {
            const row = hs[0][0];
            const cs = hs.map(h => h[1]);
            ai.stack.push([row, Math.min(...cs) - 1], [row, Math.max(...cs) + 1]);
          } else {
            const col = hs[0][1];
            const rs = hs.map(h => h[0]);
            ai.stack.push([Math.min(...rs) - 1, col], [Math.max(...rs) + 1, col]);
          }
        } else {
          ai.stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
        }
      }
    }

    // ============================================================
    // render de taulers
    // ============================================================
    // Tauler de seguiment de l'enemic: només els trets (aigua/tocat/enfonsat).
    function renderTrackBoard(el, board, interactive, onFire) {
      el.innerHTML = '';
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const d = document.createElement('div');
          let cls = 'vx-cell';
          const s = board.shots[r][c];
          if (s === 'miss') cls += ' miss';
          else if (s === 'hit') cls += isSunkCell(board, r, c) ? ' sunk' : ' hit';
          else if (interactive) cls += ' aim';
          d.className = cls;
          el.appendChild(d);
        }
      }
      if (interactive && onFire) {
        let done = false; // un sol tret per torn
        const fire = (e) => {
          if (done) return;
          const rc = cellFromPoint(el, e.clientX, e.clientY);
          if (!rc) return;
          if (board.shots[rc[0]][rc[1]] != null) return; // no es repeteix casella
          e.preventDefault();
          done = true;
          el.removeEventListener('pointerup', fire); // bloqueja més trets fins al torn següent
          onFire(rc[0], rc[1]);
        };
        el.addEventListener('pointerup', fire);
      }
    }

    // El teu propi tauler: vaixells (tinta) + trets rebuts a sobre.
    function renderOwnBoard(el, board) {
      el.innerHTML = '';
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const d = document.createElement('div');
          let cls = 'vx-cell';
          const hasShip = board.cellShip[r][c] !== -1;
          const s = board.shots[r][c];
          if (s === 'hit') cls += isSunkCell(board, r, c) ? ' sunk' : ' hit';
          else if (s === 'miss') cls += ' miss';
          else if (hasShip) cls += ' ship';
          d.className = cls;
          // contorn de cada vaixell (també sota els impactes) per delimitar-lo
          if (hasShip) d.style.boxShadow = shipEdgeShadow(board, r, c);
          el.appendChild(d);
        }
      }
    }

    function isSunkCell(board, r, c) {
      const idx = board.cellShip[r][c];
      return idx !== -1 && board.ships[idx].hits >= board.ships[idx].size;
    }

    // ============================================================
    // 4) final
    // ============================================================
    function endGame(winner) {
      cleanupPlace();
      let title;
      if (isCpu()) title = winner === 0 ? 'Has guanyat!' : 'Has perdut!';
      else title = `Guanya el ${playerName(winner)}!`;
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center">Final</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:36px;color:var(--accent)">${title}</h2>
          <p class="muted">Flota enemiga enfonsada</p>
        </div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:20px">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#again').onclick = startSetup;
      root.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
