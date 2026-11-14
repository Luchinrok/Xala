// ============================================================
// Mat en 2 — problemes d'escacs per a un sol jugador.
//
// Sempre juguen les blanques (a baix) i fan mat en dues jugades.
// Es veu marcada l'última jugada del rival. Si la primera jugada és
// bona, les negres responen amb la millor defensa (la que deixa menys
// mats) i toca rematar. Una jugada dolenta es desfà i s'hi torna.
//
// Problemes: mat2-problemes.js (Lichess, CC0), verificats amb el motor.
// Hi ha un «problema del dia» (el mateix per a tothom) i un botó per
// compartir el problema com a imatge amb un enllaç que l'obre directe.
// ============================================================

import { applyMove, inCheck, findKing, genLegal } from './escacs.js';
import { parseFen, findMove, sq, uciOf, matingMoves, forcesMateIn2, bestDefence, isMate } from './mat2-motor.js';
import PROBLEMES from './mat2-problemes.js';
import { getRecord, setRecord } from './records.js';

const GLYPH = {
  w: { P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔' },
  b: { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' },
};
const LEVELS = [
  { id: 'easy', name: 'Fàcil' },
  { id: 'normal', name: 'Mitjà' },
  { id: 'hard', name: 'Difícil' },
  { id: 'few', name: 'Poques peces' }, // com els de les revistes: 9 peces o menys
];
// Tots els problemes en una sola llista: el número (#) és la posició aquí.
// Els de poques peces van al final perquè els enllaços #mat-N d'abans no canviïn.
const ALL = [...PROBLEMES.easy, ...PROBLEMES.normal, ...PROBLEMES.hard, ...PROBLEMES.few];
const OFFSET = {
  easy: 0,
  normal: PROBLEMES.easy.length,
  hard: PROBLEMES.easy.length + PROBLEMES.normal.length,
  few: PROBLEMES.easy.length + PROBLEMES.normal.length + PROBLEMES.hard.length,
};
const levelOf = (n) => (n >= OFFSET.few ? 'few' : n >= OFFSET.hard ? 'hard' : n >= OFFSET.normal ? 'normal' : 'easy');

const SITE = 'https://luchinrok.github.io/Xala/';
const linkFor = (n) => `${SITE}#mat-${n + 1}`;

// ---------- dates i problema del dia ----------
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
// El mateix problema per a tothom cada dia, saltant per la llista
// (97 no divideix 450, així es recorren tots abans de repetir).
function dailyIndex(iso = today()) {
  return ((dayNumber(iso) * 97) % ALL.length + ALL.length) % ALL.length;
}

// ---------- progrés desat ----------
function nextIn(level) {
  const n = getRecord('mat2:next:' + level);
  return Number.isInteger(n) ? n % PROBLEMES[level].length : 0;
}
function streakInfo() {
  const s = getRecord('mat2:streak') || {};
  const t = today();
  const alive = s.last === t || (s.last && dayNumber(t) - dayNumber(s.last) === 1);
  return { doneToday: s.last === t, n: alive ? s.n || 0 : 0 };
}
function markDailySolved() {
  const s = getRecord('mat2:streak') || {};
  const t = today();
  if (s.last === t) return;
  const n = s.last && dayNumber(t) - dayNumber(s.last) === 1 ? (s.n || 0) + 1 : 1;
  setRecord('mat2:streak', { last: t, n });
}

export default {
  id: 'mat2',
  title: 'Mat en 2',
  tagline: 'Blanques juguen i guanyen',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Juguen les blanques i poden fer escac i mat en dues jugades, facin el que facin les negres.',
    'La jugada que acaben de fer les negres surt marcada en groc.',
    'Toca una peça i després la casella on la vols moure. Si l\'encertes, les negres es defensen i et toca rematar.',
    'Tria un nivell i fes-ne tants com vulguis. A més, cada dia hi ha un problema nou, el mateix per a tothom: repta els amics!',
  ],

  mount(root, { goHome }) {
    let level = getRecord('mat2:level') || 'easy';
    if (!PROBLEMES[level]) level = 'easy';

    let num = 0;            // número global del problema (0..449)
    let isDaily = false;
    let pos = null;
    let lastMove = null;    // [de, a] de l'última jugada (per marcar-la)
    let stage = 0;          // 0: primera jugada, 1: resposta negra, 2: el mat, 3: acabat
    let selected = null;
    let targets = [];
    let busy = false;
    let errors = 0;
    let hints = 0;          // 0 cap, 1 peça, 2 peça i casella
    let sawSolution = false;
    let startPos = null;    // posició del problema (per tornar-hi)
    let alive = true;       // es posa a false en sortir (talla els temporitzadors)

    const later = (fn, ms) => setTimeout(() => { if (alive) fn(); }, ms);

    // ---------- 1) pantalla d'inici ----------
    function screenConfig() {
      const st = streakInfo();
      const dailyNum = dailyIndex();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Mat en 2</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Blanques juguen i fan mat en 2</h2>

        <button class="mat2-daily" id="daily">
          <span class="mat2-daily__k">Problema del dia · #${dailyNum + 1}</span>
          <span class="mat2-daily__t">${st.doneToday ? 'Fet! Demà, un de nou' : 'Resol el d\'avui'}</span>
          <span class="mat2-daily__s">${st.n ? (st.n === 1 ? 'Ratxa: 1 dia' : `Ratxa: ${st.n} dies seguits`) : 'Fes-ne un cada dia i fes ratxa'}</span>
        </button>

        <p class="label" style="margin:26px 0 12px">Problemes sense límit</p>
        <div class="btn-row" id="levels">
          ${LEVELS.filter(l => l.id !== 'few').map(l => `<button class="btn ${level === l.id ? 'btn--accent' : 'btn--outline'}" data-level="${l.id}">${l.name}</button>`).join('')}
        </div>
        <button class="btn ${level === 'few' ? 'btn--accent' : 'btn--outline'}" data-level="few" style="margin-top:12px">Poques peces</button>
        <p class="muted center" style="margin-top:12px">Problema ${nextIn(level) + 1} de ${PROBLEMES[level].length}</p>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = () => { alive = false; goHome(); };
      root.querySelector('#daily').onclick = () => startPuzzle(dailyNum, true);
      root.querySelectorAll('[data-level]').forEach(b => {
        b.onclick = () => { level = b.dataset.level; setRecord('mat2:level', level); screenConfig(); };
      });
      root.querySelector('#start').onclick = () => startPuzzle(OFFSET[level] + nextIn(level), false);
    }

    // ---------- 2) el problema ----------
    function startPuzzle(n, daily) {
      num = n;
      isDaily = daily;
      const [fen, last] = ALL[n];
      startPos = parseFen(fen);
      pos = startPos;
      lastMove = [sq(last.slice(0, 2)), sq(last.slice(2, 4))];
      stage = 0; selected = null; targets = []; busy = false;
      errors = 0; hints = 0; sawSolution = false;
      screenBoard();
    }

    function headerLabel() {
      if (isDaily) return 'Problema del dia';
      const lv = levelOf(num);
      return `${LEVELS.find(l => l.id === lv).name} · ${num - OFFSET[lv] + 1}/${PROBLEMES[lv].length}`;
    }

    function screenBoard() {
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score">${headerLabel()}</div>
        </div>
        <p aria-live="polite" class="kicker center mat2-status" id="status"></p>
        <div class="chess-board mat2-board" id="board"></div>
        <div id="controls" class="btn-row" style="margin-top:16px">
          <button class="btn btn--outline" id="hint">Pista</button>
          <button class="btn btn--outline" id="share">Repta</button>
        </div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = () => { stage = 3; screenConfig(); };
      root.querySelector('#hint').onclick = giveHint;
      root.querySelector('#share').onclick = () => sharePuzzle(num);
      root.querySelector('#board').addEventListener('click', (e) => {
        const b = e.target.closest('.sq');
        if (b) handleClick(+b.dataset.r, +b.dataset.c);
      });
      setStatus('Blanques juguen i fan mat en 2');
      renderBoard();
    }

    function keyMove() {
      // la solució desada; si ja s'ha jugat la primera, el mat que toqui
      if (stage === 0) return findMove(pos, ALL[num][2].split(' ')[0]);
      return matingMoves(pos)[0] || null;
    }

    function renderBoard(flash) {
      const el = root.querySelector('#board');
      if (!el) return;
      const check = inCheck(pos, pos.turn);
      const king = check ? findKing(pos.board, pos.turn) : null;
      const hint = hints && stage !== 3 && pos.turn === 'w' ? keyMove() : null;
      let html = '';
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = pos.board[r][c];
          const at = (s) => s && s[0] === r && s[1] === c;
          let cls = (r + c) % 2 === 0 ? 'sq--light' : 'sq--dark';
          if (lastMove && (at(lastMove[0]) || at(lastMove[1]))) cls += ' sq--last';
          if (at(selected)) cls += ' sq--sel';
          if (king && at(king)) cls += ' sq--check';
          if (hint && (at(hint.fr) || (hints > 1 && at(hint.to)))) cls += ' sq--hint';
          if (flash && at(flash)) cls += ' sq--wrong';
          let inner = p ? `<span class="piece">${GLYPH[p.c][p.t]}</span>` : '';
          if (targets.some(m => at(m.to))) inner += p ? '<span class="dot dot--cap"></span>' : '<span class="dot"></span>';
          if (c === 0) inner += `<span class="coord coord--rank">${8 - r}</span>`;
          if (r === 7) inner += `<span class="coord coord--file">${'abcdefgh'[c]}</span>`;
          const label = `${'abcdefgh'[c]}${8 - r}${p ? ' ' + pieceName(p) : ''}`;
          html += `<button class="sq ${cls}" data-r="${r}" data-c="${c}" aria-label="${label}">${inner}</button>`;
        }
      }
      el.innerHTML = html;
    }

    function pieceName(p) {
      const n = { K: 'rei', Q: 'dama', R: 'torre', B: 'alfil', N: 'cavall', P: 'peó' }[p.t];
      return `${n} ${p.c === 'w' ? 'blanc' : 'negre'}`;
    }

    function setStatus(txt) {
      const s = root.querySelector('#status');
      if (s) s.textContent = txt;
    }

    function handleClick(r, c) {
      if (busy || stage === 1 || stage === 3 || pos.turn !== 'w') return;
      const cell = pos.board[r][c];
      if (selected) {
        if (selected[0] === r && selected[1] === c) { selected = null; targets = []; renderBoard(); return; }
        const mv = targets.find(m => m.to[0] === r && m.to[1] === c);
        if (mv) {
          selected = null; targets = [];
          if (mv.promo) { askPromotion(mv); return; }
          tryMove(mv);
          return;
        }
      }
      if (cell && cell.c === 'w') {
        selected = [r, c];
        targets = genLegal(pos).filter(m => m.fr[0] === r && m.fr[1] === c);
      } else {
        selected = null; targets = [];
      }
      renderBoard();
    }

    // La jugada del jugador: es fa, i es comprova si és bona.
    function tryMove(mv) {
      const before = pos;
      const ok = stage === 0 ? forcesMateIn2(before, mv) : isMate(applyMove(before, mv));
      play(mv, () => {
        if (stage === 2) {
          if (ok) { solved(); return; }
          wrong(before, mv, 'Això no és mat. Torna-hi!');
          return;
        }
        if (!ok) { wrong(before, mv, 'No, així s\'escapen. Torna-hi!'); return; }
        stage = 1;
        hints = 0;
        root.querySelector('#hint').textContent = 'Pista';
        setStatus('Bona! Les negres es defensen…');
        later(() => {
          play(bestDefence(pos), () => {
            stage = 2;
            setStatus('Ara, el mat!');
          });
        }, 650);
      });
    }

    function wrong(before, mv, msg) {
      errors++;
      setStatus(msg);
      busy = true;
      renderBoard(mv.to);
      later(() => {
        pos = before;
        lastMove = stage === 0 ? [sq(ALL[num][1].slice(0, 2)), sq(ALL[num][1].slice(2, 4))] : prevLast;
        busy = false;
        renderBoard();
      }, 800);
    }

    let prevLast = null;
    // Fa una jugada al tauler amb una petita animació.
    function play(mv, done) {
      prevLast = lastMove;
      const mover = pos.turn;
      pos = applyMove(pos, mv);
      lastMove = [mv.fr, mv.to];
      busy = true;
      renderBoard();
      slide(mv, mover, () => { busy = false; done(); });
    }

    function slide(mv, mover, done) {
      const board = root.querySelector('#board');
      const size = board ? board.clientWidth / 8 : 0;
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!size || reduce) { done(); return; }
      const dest = board.children[mv.to[0] * 8 + mv.to[1]];
      const piece = dest && dest.querySelector('.piece');
      if (piece) piece.style.visibility = 'hidden';
      const fly = document.createElement('div');
      fly.className = 'anim-piece';
      fly.textContent = GLYPH[mover][mv.promo ? 'P' : mv.t];
      fly.style.width = fly.style.height = size + 'px';
      fly.style.transform = `translate(${mv.fr[1] * size}px, ${mv.fr[0] * size}px)`;
      board.appendChild(fly);
      void fly.offsetWidth;
      fly.style.transform = `translate(${mv.to[1] * size}px, ${mv.to[0] * size}px)`;
      let end = false;
      const finish = () => {
        if (end) return; end = true;
        if (piece) piece.style.visibility = '';
        fly.remove();
        done();
      };
      fly.addEventListener('transitionend', finish);
      setTimeout(finish, 420);
    }

    function askPromotion(mv) {
      const names = { Q: 'Dama', R: 'Torre', B: 'Alfil', N: 'Cavall' };
      const overlay = document.createElement('div');
      overlay.className = 'promo-overlay';
      overlay.innerHTML = `
        <div class="promo-dialog">
          <p class="promo-title">Corona el peó</p>
          <div class="promo-opts">
            ${['Q', 'R', 'B', 'N'].map(t => `
              <button class="promo-opt" data-t="${t}" aria-label="${names[t]}">
                <span class="promo-glyph">${GLYPH.w[t]}</span>
                <span class="promo-name">${names[t]}</span>
              </button>`).join('')}
          </div>
        </div>`;
      root.appendChild(overlay);
      overlay.querySelectorAll('.promo-opt').forEach(b => {
        b.onclick = () => { overlay.remove(); tryMove({ ...mv, promo: b.dataset.t }); };
      });
    }

    // Pista: primer la peça que s'ha de moure; després, també on.
    function giveHint() {
      if (stage === 3 || busy || pos.turn !== 'w') return;
      if (hints >= 2) { showSolution(); return; }
      hints++;
      if (hints === 2) root.querySelector('#hint').textContent = 'Solució';
      selected = null; targets = [];
      setStatus(hints === 1 ? 'Mira aquesta peça…' : '…i mou-la aquí.');
      renderBoard();
    }

    function showSolution() {
      sawSolution = true;
      selected = null; targets = [];
      const mv = keyMove();
      if (!mv) return;
      if (stage === 0) {
        play(mv, () => {
          stage = 1;
          later(() => play(bestDefence(pos), () => {
            stage = 2;
            later(() => play(matingMoves(pos)[0], solved), 500);
          }), 500);
        });
      } else {
        play(mv, solved);
      }
    }

    function solved() {
      stage = 3;
      selected = null; targets = [];
      renderBoard();
      const clean = !sawSolution;
      if (clean && isDaily) markDailySolved();
      if (!isDaily) {
        const lv = levelOf(num);
        const i = num - OFFSET[lv];
        if (i === nextIn(lv)) setRecord('mat2:next:' + lv, (i + 1) % PROBLEMES[lv].length);
      }
      if (clean) setRecord('mat2:solved', (getRecord('mat2:solved') || 0) + 1);
      setStatus('Escac i mat');

      const title = !clean ? 'Aquesta era la solució' : errors === 0 && hints === 0 ? 'Mat! A la primera' : 'Mat!';
      const sub = !clean
        ? 'Mira-la bé i prova el següent.'
        : errors === 0 && hints === 0 ? 'Ni un error. Molt bé!'
        : `${errors ? `${errors} ${errors === 1 ? 'intent fallat' : 'intents fallats'}` : 'Amb pista'}, però l'has trobat.`;
      const st = streakInfo();
      root.querySelector('#controls').innerHTML = '';
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="margin-top:16px">
          <h2 style="font-size:30px;color:var(--accent)">${title}</h2>
          <p class="muted">${sub}${isDaily && st.n ? ` Ratxa: ${st.n} ${st.n === 1 ? 'dia' : 'dies'}.` : ''}</p>
        </div>
        <div class="stack" style="margin-top:16px">
          <button class="btn btn--accent" id="next">Següent problema</button>
          <button class="btn btn--outline" id="share2">Repta un amic</button>
          <button class="btn btn--outline" id="home">Sortir</button>
        </div>
      `;
      box.querySelector('#next').onclick = () => {
        if (isDaily) { startPuzzle(OFFSET[level] + nextIn(level), false); return; }
        const lv = levelOf(num);
        startPuzzle(OFFSET[lv] + (num - OFFSET[lv] + 1) % PROBLEMES[lv].length, false);
      };
      box.querySelector('#share2').onclick = () => sharePuzzle(num);
      box.querySelector('#home').onclick = () => { alive = false; goHome(); };
    }

    // ---------- 3) compartir: imatge del problema + enllaç ----------
    async function sharePuzzle(n) {
      const url = linkFor(n);
      const text = `Blanques juguen i fan mat en 2. Ets capaç? Problema #${n + 1} de Xala!`;
      let file = null;
      try {
        const blob = await drawPuzzle(n);
        file = new File([blob], `xala-mat-en-2-${n + 1}.png`, { type: 'image/png' });
      } catch (e) { /* sense imatge: compartim només el text */ }
      try {
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: `${text} ${url}` });
          return;
        }
        if (navigator.share) { await navigator.share({ text, url }); return; }
      } catch (e) {
        if (e && e.name === 'AbortError') return; // l'usuari ho ha cancel·lat
      }
      // Sense menú de compartir (ordinador): baixa la imatge i copia l'enllaç.
      if (file) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
      try { await navigator.clipboard.writeText(`${text} ${url}`); setStatus('Enllaç copiat!'); } catch (e) { /* res */ }
    }

    async function drawPuzzle(n) {
      try { await Promise.all([document.fonts.load('800 60px "Bricolage Grotesque"'), document.fonts.load('500 30px "Hanken Grotesk"')]); } catch (e) { /* lletra del sistema */ }
      const css = getComputedStyle(document.documentElement);
      const col = (v, d) => (css.getPropertyValue(v) || d).trim();
      const paper = col('--paper', '#FBF3E4'), paper2 = col('--paper-2', '#F4E8D2');
      const ink = col('--ink', '#20180F'), coral = col('--coral', '#E4572E');
      const W = 1080, H = 1350, B = 880, x0 = (W - B) / 2, y0 = 250, s = B / 8;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      g.fillStyle = paper; g.fillRect(0, 0, W, H);
      // fons de punts, com l'app
      g.fillStyle = 'rgba(32,24,15,.07)';
      for (let y = 20; y < H; y += 36) for (let x = 20; x < W; x += 36) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
      g.fillStyle = ink; g.textAlign = 'center';
      g.font = '800 64px "Bricolage Grotesque", system-ui, sans-serif';
      g.fillText('Blanques juguen', W / 2, 120);
      g.fillStyle = coral;
      g.fillText('i fan mat en 2', W / 2, 196);
      // tauler amb ombra «enfonsable»
      g.fillStyle = ink; g.fillRect(x0 - 4, y0 - 4 + 12, B + 8, B + 8);
      g.fillRect(x0 - 4, y0 - 4, B + 8, B + 8);
      const p = parseFen(ALL[n][0]);
      const last = ALL[n][1];
      const lm = [sq(last.slice(0, 2)), sq(last.slice(2, 4))];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          g.fillStyle = (r + c) % 2 === 0 ? paper2 : coral;
          g.fillRect(x0 + c * s, y0 + r * s, s, s);
          if (lm.some(q => q[0] === r && q[1] === c)) { g.fillStyle = 'rgba(255,200,40,.55)'; g.fillRect(x0 + c * s, y0 + r * s, s, s); }
          const x = p.board[r][c];
          if (x) {
            g.fillStyle = ink;
            g.font = `${Math.round(s * 0.78)}px "Segoe UI Symbol", "Noto Sans Symbols2", "Apple Symbols", serif`;
            g.textBaseline = 'middle';
            g.fillText(GLYPH[x.c][x.t] + '︎', x0 + c * s + s / 2, y0 + r * s + s / 2 + s * 0.04);
            g.textBaseline = 'alphabetic';
          }
        }
      }
      g.fillStyle = ink;
      g.font = '800 46px "Bricolage Grotesque", system-ui, sans-serif';
      g.textAlign = 'left';
      g.fillText('Xala!', x0, H - 82);
      g.font = '500 30px "Hanken Grotesk", system-ui, sans-serif';
      g.textAlign = 'right';
      g.fillText(`Problema #${n + 1} · luchinrok.github.io/Xala`, x0 + B, H - 86);
      return new Promise((ok, ko) => cv.toBlob(b => (b ? ok(b) : ko(new Error('toBlob'))), 'image/png'));
    }

    // Enllaç compartit (#mat-N): obre directament aquell problema.
    const m = /^#mat-(\d+)$/.exec(location.hash);
    if (m && +m[1] >= 1 && +m[1] <= ALL.length) {
      try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) { /* res */ }
      startPuzzle(+m[1] - 1, +m[1] - 1 === dailyIndex());
    } else {
      screenConfig();
    }
  },
};

export { dailyIndex, ALL as PROBLEMES_TOTS };
