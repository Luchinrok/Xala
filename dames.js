// ============================================================
// Dames (draughts) — 2 jugadors al mateix mòbil o 1 jugador contra la màquina.
// Tauler 8×8, es juga a les caselles fosques. Cada jugador comença amb 12
// fitxes a les 3 primeres files.
//
// Regles (internacionals bàsiques):
//  · Les fitxes normals avancen en diagonal una casella cap endavant; capturen
//    saltant una fitxa rival cap a una casella buida (endavant o enrere).
//  · Captura OBLIGATÒRIA i ENCADENADA: si pots capturar, has de fer-ho, i has
//    de continuar mentre la mateixa fitxa pugui seguir capturant.
//  · Coronació: la fitxa que arriba a l'última fila es fa DAMA (mou i captura
//    en diagonal a qualsevol distància).
//  · Guanya qui deixa el rival sense fitxes o sense moviments.
//
// IA (jugador 2): minimax amb poda alfa-beta; respecta la captura obligatòria.
// Jugador 1 = corall (--accent, a baix); Jugador 2 / màquina = verd (--ok, a
// dalt). Les dames porten un anell. Cap negre.
// ============================================================

const DARK = (r, c) => (r + c) % 2 === 1;
const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const other = (p) => (p === 1 ? 2 : 1);
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

const cloneBoard = (b) => b.map(row => row.map(cell => (cell ? { c: cell.c, k: cell.k } : null)));

function initialBoard() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if (DARK(r, c)) b[r][c] = { c: 2, k: false };
  for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if (DARK(r, c)) b[r][c] = { c: 1, k: false };
  return b;
}

// Salts de captura immediats d'una fitxa (un sol salt). Retorna [{to, cap}].
function captureSteps(board, r, c) {
  const pc = board[r][c];
  if (!pc) return [];
  const opp = other(pc.c);
  const steps = [];
  if (!pc.k) {
    for (const [dr, dc] of DIAG) {
      const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
      if (inB(lr, lc) && board[mr][mc] && board[mr][mc].c === opp && !board[lr][lc]) steps.push({ to: [lr, lc], cap: [mr, mc] });
    }
  } else {
    for (const [dr, dc] of DIAG) {
      let rr = r + dr, cc = c + dc;
      while (inB(rr, cc) && !board[rr][cc]) { rr += dr; cc += dc; }
      if (inB(rr, cc) && board[rr][cc] && board[rr][cc].c === opp) {
        let lr = rr + dr, lc = cc + dc;
        while (inB(lr, lc) && !board[lr][lc]) { steps.push({ to: [lr, lc], cap: [rr, cc] }); lr += dr; lc += dc; }
      }
    }
  }
  return steps;
}

// Moviments simples (sense captura) d'una fitxa. Retorna [{to}].
function simpleSteps(board, r, c) {
  const pc = board[r][c];
  if (!pc) return [];
  const steps = [];
  if (!pc.k) {
    const dirs = pc.c === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]; // endavant segons el bàndol
    for (const [dr, dc] of dirs) { const rr = r + dr, cc = c + dc; if (inB(rr, cc) && !board[rr][cc]) steps.push({ to: [rr, cc] }); }
  } else {
    for (const [dr, dc] of DIAG) { let rr = r + dr, cc = c + dc; while (inB(rr, cc) && !board[rr][cc]) { steps.push({ to: [rr, cc] }); rr += dr; cc += dc; } }
  }
  return steps;
}

function countPieces(board, player) {
  let n = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const pc = board[r][c]; if (pc && pc.c === player) n++; }
  return n;
}

function playerHasCapture(board, player) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const pc = board[r][c];
    if (pc && pc.c === player && captureSteps(board, r, c).length) return true;
  }
  return false;
}

// Corona la fitxa a `pos` si un peó ha arribat a la seva última fila.
function promoteInPlace(board, pos, player) {
  const pc = board[pos[0]][pos[1]];
  if (pc && !pc.k && ((player === 1 && pos[0] === 0) || (player === 2 && pos[0] === 7))) pc.k = true;
}

// Totes les cadenes de captura completes des de (r,c). Cada resultat:
// { path:[[r,c]...landings], caps:[[r,c]...], board (final sense coronar), end }.
function captureChains(board, r, c) {
  const steps = captureSteps(board, r, c);
  if (!steps.length) return [];
  const out = [];
  for (const st of steps) {
    const nb = cloneBoard(board);
    nb[st.to[0]][st.to[1]] = nb[r][c];
    nb[r][c] = null;
    nb[st.cap[0]][st.cap[1]] = null;
    const sub = captureChains(nb, st.to[0], st.to[1]);
    // s.path ja comença a st.to (la casella d'arribada d'AQUEST salt), així que
    // s'ha de conservar sencera: [origen, st.to, ...següents arribades]. (Abans
    // es feia slice(1) i es perdien les caselles intermèdies -> lliscava recte.)
    if (!sub.length) out.push({ path: [[r, c], st.to], caps: [st.cap], board: nb, end: st.to });
    else for (const s of sub) out.push({ path: [[r, c], ...s.path], caps: [st.cap, ...s.caps], board: s.board, end: s.end });
  }
  return out;
}

// Moviments legals de `player`: si hi ha captures, NOMÉS captures (obligatòria).
function genMoves(board, player) {
  const caps = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const pc = board[r][c];
    if (pc && pc.c === player) for (const ch of captureChains(board, r, c)) caps.push({ from: [r, c], ...ch, capture: true });
  }
  if (caps.length) { for (const m of caps) promoteInPlace(m.board, m.end, player); return caps; }
  const simples = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const pc = board[r][c];
    if (pc && pc.c === player) for (const st of simpleSteps(board, r, c)) {
      const nb = cloneBoard(board);
      nb[st.to[0]][st.to[1]] = nb[r][c]; nb[r][c] = null;
      promoteInPlace(nb, st.to, player);
      simples.push({ from: [r, c], path: [[r, c], st.to], caps: [], board: nb, end: st.to, capture: false });
    }
  }
  return simples;
}

// Avaluació (positiu = bo per a `ai`): material + avançament dels peons.
function evaluate(board, ai) {
  let s = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const pc = board[r][c];
    if (!pc) continue;
    let v = pc.k ? 250 : 100;
    if (!pc.k) v += (pc.c === 1 ? (7 - r) : r) * 6; // com més a prop de coronar, millor
    s += pc.c === ai ? v : -v;
  }
  return s;
}

// Profunditat de cerca segons dificultat (Fàcil fluixa, Difícil més forta).
const DEPTHS = { easy: 2, normal: 4, hard: 7 };

function minimax(board, player, ai, depth, alpha, beta) {
  const moves = genMoves(board, player);
  if (!moves.length) return player === ai ? -1e6 - depth : 1e6 + depth; // qui no pot moure, perd
  if (depth === 0) return evaluate(board, ai);
  if (player === ai) {
    let best = -Infinity;
    for (const m of moves) { const v = minimax(m.board, other(player), ai, depth - 1, alpha, beta); if (v > best) best = v; if (best > alpha) alpha = best; if (alpha >= beta) break; }
    return best;
  }
  let best = Infinity;
  for (const m of moves) { const v = minimax(m.board, other(player), ai, depth - 1, alpha, beta); if (v < best) best = v; if (best < beta) beta = best; if (alpha >= beta) break; }
  return best;
}

// Millor moviment de la màquina (`ai`) segons el nivell. La profunditat i el
// marge de tria varien: Fàcil juga sovint subòptim (marge ampli, poca cerca),
// Difícil tria sempre la millor (marge 0, cerca profunda). Sempre respecta la
// captura obligatòria (genMoves ja retorna només captures si n'hi ha).
function aiBestMove(board, ai, level = 'normal') {
  const moves = genMoves(board, ai);
  if (!moves.length) return null;
  for (let i = moves.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [moves[i], moves[j]] = [moves[j], moves[i]]; }
  const depth = DEPTHS[level] || DEPTHS.normal;
  const margin = level === 'easy' ? 120 : level === 'hard' ? 0 : 30;
  const scored = moves.map(m => ({ m, s: minimax(m.board, other(ai), ai, depth - 1, -Infinity, Infinity) }));
  let best = -Infinity;
  for (const x of scored) if (x.s > best) best = x.s;
  const pool = scored.filter(x => x.s >= best - margin);
  return pool[Math.floor(Math.random() * pool.length)].m;
}

// Exports nominals del motor (per a proves; el navegador només usa el default).
export { initialBoard, genMoves, captureSteps, simpleSteps, playerHasCapture, aiBestMove, evaluate };

export default {
  id: 'dames',
  title: 'Dames',
  tagline: 'Menja\'t totes les fitxes',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,

  instructions: [
    'Toca una fitxa teva: s\'il·luminen els moviments i captures legals.',
    'Captura obligatòria: si pots menjar, has de fer-ho (i encadenar).',
    'Una fitxa que arriba al fons es fa dama (mou en diagonal a distància).',
    'Guanya qui deixa el rival sense fitxes o sense moviments.',
  ],

  mount(root, { goHome }) {
    const state = {
      mode: '2p',            // 'cpu' | '2p' (per defecte 2 jugadors)
      diff: 'normal',        // 'easy' | 'normal' | 'hard' (només mode cpu)
      board: initialBoard(),
      turn: 1,               // 1 = corall (baix), 2 = verd/màquina (dalt)
      over: false,
      animating: false,
      confirming: false,
    };
    let selected = null;     // [r,c] de la fitxa triada
    let targets = [];        // [{to,cap}] destinacions de la fitxa triada
    let mustContinue = null; // [r,c] si cal encadenar captura amb la mateixa fitxa
    let aiTimer = null;
    const AI_PAUSE = 600;

    function clearAiTimer() { if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; } }
    function leave() { clearAiTimer(); goHome(); }

    const isCpu = () => state.mode === 'cpu';
    const colorClass = (p) => (p === 1 ? 'p1' : 'p2');
    function playerName(p) {
      if (isCpu()) return p === 1 ? 'Tu' : 'La màquina';
      return p === 1 ? 'Jugador 1' : 'Jugador 2';
    }

    // ---------- 1) configuració ----------
    function screenConfig() {
      clearAiTimer();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Dames</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>

        <p class="label" style="margin:0 0 12px">Mode</p>
        <div class="btn-row" id="modes">
          <button class="btn ${state.mode === 'cpu' ? 'btn--accent' : 'btn--outline'}" data-mode="cpu">1 jugador</button>
          <button class="btn ${state.mode === '2p' ? 'btn--accent' : 'btn--outline'}" data-mode="2p">2 jugadors</button>
        </div>

        <div id="diffWrap" style="${state.mode === 'cpu' ? '' : 'display:none'}">
          <p class="label" style="margin:24px 0 12px">Dificultat</p>
          <div class="btn-row" id="diffs">
            <button class="btn ${state.diff === 'easy' ? 'btn--accent' : 'btn--outline'}" data-diff="easy">Fàcil</button>
            <button class="btn ${state.diff === 'normal' ? 'btn--accent' : 'btn--outline'}" data-diff="normal">Normal</button>
            <button class="btn ${state.diff === 'hard' ? 'btn--accent' : 'btn--outline'}" data-diff="hard">Difícil</button>
          </div>
        </div>

        <p class="muted" id="modeinfo" style="margin-top:12px"></p>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      const info = () => {
        const el = root.querySelector('#modeinfo');
        if (el) el.textContent = isCpu()
          ? 'Tu jugues amb les fitxes corall; la màquina, amb les verdes.'
          : 'Jugador 1 amb les fitxes corall i jugador 2 amb les verdes.';
      };
      info();
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { state.mode = b.dataset.mode; screenConfig(); }; });
      root.querySelectorAll('[data-diff]').forEach(b => { b.onclick = () => { state.diff = b.dataset.diff; screenConfig(); }; });
      root.querySelector('#start').onclick = beginGame;
    }

    // ---------- arrenca la partida ----------
    function beginGame() {
      clearAiTimer();
      state.board = initialBoard();
      state.turn = 1;
      state.over = false;
      state.animating = false;
      state.confirming = false;
      selected = null; targets = []; mustContinue = null;
      screenGame();
    }

    // ---------- 2) joc ----------
    function screenGame() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Dames</p>
        <p class="dm-turn" id="turn"></p>
        <div class="dm-board" id="dmboard"></div>
        <div id="controls" class="center" style="margin-top:12px"></div>
        <div id="result"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      const boardEl = root.querySelector('#dmboard');
      boardEl.addEventListener('click', (e) => {
        const cell = e.target.closest('.dm-cell');
        if (cell) onCellClick(parseInt(cell.dataset.r, 10), parseInt(cell.dataset.c, 10));
      });
      renderBoard();
      paintTurn();
      resetControls();
    }

    function interactive() {
      return !state.over && !state.animating && !state.confirming && (!isCpu() || state.turn === 1);
    }

    // Passos legals de la fitxa (r,c) segons l'estat (captura obligatòria/encadenada).
    function stepsFor(r, c) {
      if (mustContinue) return captureSteps(state.board, r, c);
      return playerHasCapture(state.board, state.turn) ? captureSteps(state.board, r, c) : simpleSteps(state.board, r, c);
    }

    function renderBoard() {
      const boardEl = root.querySelector('#dmboard');
      if (!boardEl) return;
      const canPlay = interactive();
      let html = '';
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const dark = DARK(r, c);
          const pc = state.board[r][c];
          const isSel = selected && selected[0] === r && selected[1] === c;
          const tgt = targets.find(t => t.to[0] === r && t.to[1] === c);
          let selectable = false;
          if (canPlay && pc && pc.c === state.turn) selectable = mustContinue ? (mustContinue[0] === r && mustContinue[1] === c) : stepsFor(r, c).length > 0;
          let cls = 'dm-cell ' + (dark ? 'dark' : 'light');
          if (isSel) cls += ' sel';
          else if (selectable) cls += ' can';
          let inner = '';
          if (pc) inner += `<div class="dm-piece ${colorClass(pc.c)}${pc.k ? ' king' : ''}"></div>`;
          if (tgt) inner += tgt.cap ? '<div class="dm-cap"></div>' : '<div class="dm-dot"></div>';
          html += `<div class="${cls}" data-r="${r}" data-c="${c}">${inner}</div>`;
        }
      }
      boardEl.innerHTML = html;
    }

    function paintTurn() {
      const el = root.querySelector('#turn');
      if (!el) return;
      const cls = colorClass(state.turn);
      let txt;
      if (isCpu()) txt = state.turn === 1 ? 'El teu torn' : 'La màquina pensa…';
      else txt = `Torn del ${playerName(state.turn)}`;
      const cap = interactive() && (mustContinue || playerHasCapture(state.board, state.turn));
      el.innerHTML = `<b class="${cls}">${txt}</b>${cap ? ' · captura obligatòria' : ''}`;
    }

    // ---------- interacció ----------
    function onCellClick(r, c) {
      if (!interactive()) return;
      if (selected && targets.some(t => t.to[0] === r && t.to[1] === c)) { performStep([r, c]); return; }
      if (mustContinue) return; // bloquejat: cal continuar la captura amb la mateixa fitxa
      const pc = state.board[r][c];
      if (pc && pc.c === state.turn && stepsFor(r, c).length) { selectPiece(r, c); return; }
      selected = null; targets = []; renderBoard();
    }

    function selectPiece(r, c) {
      selected = [r, c];
      targets = stepsFor(r, c).map(s => ({ to: s.to, cap: s.cap || null }));
      renderBoard();
    }

    function applyStepModel(from, to, cap) {
      const b = state.board;
      b[to[0]][to[1]] = b[from[0]][from[1]];
      b[from[0]][from[1]] = null;
      if (cap) b[cap[0]][cap[1]] = null;
    }
    function moveModel(from, to) {
      const b = state.board;
      b[to[0]][to[1]] = b[from[0]][from[1]];
      b[from[0]][from[1]] = null;
    }

    function performStep(to) {
      const tgt = targets.find(t => t.to[0] === to[0] && t.to[1] === to[1]);
      if (!tgt) return;
      const from = selected, cap = tgt.cap || null, mover = state.turn;
      state.animating = true;
      animateMove(from, to, cap ? [cap] : [], () => {
        applyStepModel(from, to, cap);
        if (cap) {
          const more = captureSteps(state.board, to[0], to[1]);
          if (more.length) { // encadena: mateixa fitxa, obligada a seguir
            selected = to; mustContinue = to; targets = more.map(s => ({ to: s.to, cap: s.cap }));
            state.animating = false; renderBoard(); paintTurn(); return;
          }
        }
        promoteInPlace(state.board, to, mover);
        selected = null; targets = []; mustContinue = null;
        state.animating = false; renderBoard();
        endTurn();
      });
    }

    // ---------- animació ----------
    function animateMove(from, to, caps, done, dur) {
      dur = dur || 200;
      const boardEl = root.querySelector('#dmboard');
      if (!boardEl) { done(); return; }
      const size = boardEl.clientWidth / 8;
      const fromCell = boardEl.children[from[0] * 8 + from[1]];
      const pieceEl = fromCell && fromCell.querySelector('.dm-piece');
      caps.forEach(cp => {
        const cell = boardEl.children[cp[0] * 8 + cp[1]];
        const e = cell && cell.querySelector('.dm-piece');
        if (e) { e.style.transition = 'opacity .14s ease, transform .14s ease'; e.style.opacity = '0'; e.style.transform = 'scale(.35)'; }
      });
      if (!pieceEl || !size) { setTimeout(done, 40); return; }
      pieceEl.style.zIndex = '5';
      pieceEl.style.transition = `transform ${dur}ms ease`;
      const dx = (to[1] - from[1]) * size, dy = (to[0] - from[0]) * size;
      requestAnimationFrame(() => { pieceEl.style.transform = `translate(${dx}px, ${dy}px)`; });
      let fired = false;
      const fin = () => { if (fired) return; fired = true; done(); };
      pieceEl.addEventListener('transitionend', fin, { once: true });
      setTimeout(fin, dur + 90);
    }

    // Llisca només la fitxa d'origen a destí (sense tocar la capturada).
    function slidePiece(from, to, dur, done) {
      const boardEl = root.querySelector('#dmboard');
      if (!boardEl) { done(); return; }
      const size = boardEl.clientWidth / 8;
      const cell = boardEl.children[from[0] * 8 + from[1]];
      const pieceEl = cell && cell.querySelector('.dm-piece');
      if (!pieceEl || !size) { setTimeout(done, 30); return; }
      pieceEl.style.zIndex = '5';
      pieceEl.style.transition = `transform ${dur}ms ease`;
      const dx = (to[1] - from[1]) * size, dy = (to[0] - from[0]) * size;
      requestAnimationFrame(() => { pieceEl.style.transform = `translate(${dx}px, ${dy}px)`; });
      let fired = false;
      const fin = () => { if (fired) return; fired = true; done(); };
      pieceEl.addEventListener('transitionend', fin, { once: true });
      setTimeout(fin, dur + 80);
    }

    // Esvaeix la fitxa capturada a `pos` (perquè es vegi quina es menja).
    function fadePiece(pos, dur, done) {
      const boardEl = root.querySelector('#dmboard');
      const cell = boardEl && boardEl.children[pos[0] * 8 + pos[1]];
      const el = cell && cell.querySelector('.dm-piece');
      if (!el) { setTimeout(done, 20); return; }
      el.style.transition = `opacity ${dur}ms ease, transform ${dur}ms ease`;
      el.style.opacity = '0'; el.style.transform = 'scale(.35)';
      let fired = false;
      const fin = () => { if (fired) return; fired = true; done(); };
      el.addEventListener('transitionend', fin, { once: true });
      setTimeout(fin, dur + 70);
    }

    // ---------- torn / fi ----------
    function endTurn() {
      state.turn = other(state.turn);
      selected = null; targets = []; mustContinue = null;
      if (genMoves(state.board, state.turn).length === 0) {
        const loser = state.turn; // qui ha de moure i no pot
        const reason = countPieces(state.board, loser) === 0 ? 'nopieces' : 'nomoves';
        finish(other(loser), reason);
        return;
      }
      renderBoard(); paintTurn();
      if (isCpu() && state.turn === 2) { clearAiTimer(); aiTimer = setTimeout(aiPlay, AI_PAUSE); }
    }

    function aiPlay() {
      aiTimer = null;
      if (state.over) return;
      const move = aiBestMove(state.board, 2, state.diff);
      if (!move) { finish(1, countPieces(state.board, 2) === 0 ? 'nopieces' : 'nomoves'); return; }
      playAISequence(move);
    }

    // Reprodueix la jugada de la màquina SALT A SALT: la fitxa salta, s'esvaeix
    // la fitxa menjada, una pausa curta, i llavors el salt següent, fins acabar
    // la cadena. Així cada captura es veu individualment i clara.
    function playAISequence(move) {
      state.animating = true;
      const JUMP = 170, FADE = 150, PAUSE = 260;
      let i = 0;
      const finalize = () => {
        state.board = move.board; // resultat canònic (amb coronació)
        selected = null; targets = []; mustContinue = null;
        state.animating = false; renderBoard();
        endTurn();
      };
      const nextSegment = () => {
        if (i >= move.path.length - 1) { finalize(); return; }
        const from = move.path[i], to = move.path[i + 1], cap = (move.caps && move.caps[i]) || null;
        slidePiece(from, to, JUMP, () => {
          moveModel(from, to);   // la fitxa ja és a la casella de destí
          renderBoard();         // (la menjada encara hi és)
          i++;
          if (cap) {
            fadePiece(cap, FADE, () => {           // ara desapareix la menjada
              state.board[cap[0]][cap[1]] = null;
              renderBoard();
              if (i < move.path.length - 1) setTimeout(nextSegment, PAUSE); else finalize();
            });
          } else {
            nextSegment(); // moviment simple (sense captura)
          }
        });
      };
      nextSegment();
    }

    // ---------- rendir-se ----------
    function resetControls() {
      const ctl = root.querySelector('#controls');
      if (!ctl) return;
      ctl.innerHTML = `<button class="btn btn--outline" id="resign">Rendir-se</button>`;
      ctl.querySelector('#resign').onclick = askResign;
    }
    function askResign() {
      if (state.over) return;
      state.confirming = true;
      renderBoard();
      const ctl = root.querySelector('#controls');
      if (!ctl) return;
      ctl.innerHTML = `
        <div class="panel center stack" style="margin-top:4px;--stack-gap:12px">
          <p style="font-weight:700">Segur que et vols rendir?</p>
          <div class="btn-row">
            <button class="btn btn--accent" id="ryes">Sí</button>
            <button class="btn btn--outline" id="rno">No</button>
          </div>
        </div>`;
      ctl.querySelector('#ryes').onclick = () => { state.confirming = false; doResign(); };
      ctl.querySelector('#rno').onclick = () => { state.confirming = false; resetControls(); renderBoard(); };
    }
    function doResign() {
      if (state.over) return;
      const loser = isCpu() ? 1 : state.turn; // a 1 jugador es rendeix l'humà (1)
      finish(other(loser), 'resign');
    }

    // ---------- 3) final ----------
    function finish(winner, reason) {
      state.over = true;
      clearAiTimer();
      const ctl = root.querySelector('#controls');
      if (ctl) ctl.innerHTML = '';
      renderBoard();
      const loser = other(winner);
      const humanLoses = isCpu() && loser === 1; // el jugador humà (Tu) perd
      let title;
      if (isCpu()) title = winner === 1 ? 'Has guanyat!' : 'Has perdut!';
      else title = `Guanya el ${playerName(winner)}!`;
      let sub;
      if (reason === 'resign') sub = humanLoses ? 'T\'has rendit.' : `${playerName(loser)} s'ha rendit.`;
      else if (reason === 'nopieces') sub = humanLoses ? 'Et quedes sense fitxes.' : `${playerName(loser)} es queda sense fitxes.`;
      else sub = humanLoses ? 'Et quedes sense moviments.' : `${playerName(loser)} es queda sense moviments.`;
      const el = root.querySelector('#turn');
      if (el) el.innerHTML = `<b class="${colorClass(winner)}">${title}</b>`;
      const result = root.querySelector('#result');
      if (!result) return;
      result.innerHTML = `
        <div class="stack" style="margin-top:18px">
          <p class="muted center">${sub}</p>
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      result.querySelector('#again').onclick = beginGame;
      result.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
