// ============================================================
// Gira la gravetat — joc per a dos (del tipus «corre i gira la gravetat»).
//
// El mòbil, pla a la taula entre els dos. Cadascú té la seva meitat (la de
// dalt, girada cap a l'altre jugador). Els dos corredors avancen sols pel
// mateix recorregut; toca la teva meitat per girar la gravetat i passar del
// terra al sostre. Si caus per un forat, perds la ronda.
// ============================================================

const W = 300, LANE = 165, MID = 12, H = LANE * 2 + MID;
const TILE = 25, EDGE = 10, R = 9, RX = 70;
const GRAV = 0.55, MAXV = 9;
const STEP = 1000 / 60;
import { getRecord, setRecord } from './records.js';

const KEY = 'gravetat';
// la màquina: quant mira endavant (en passos) i quant tarda a reaccionar
const AI = {
  easy: { name: 'Fàcil', look: [4, 9], delay: [6, 16], miss: 0.12 },
  normal: { name: 'Normal', look: [7, 12], delay: [2, 8], miss: 0.04 },
  hard: { name: 'Difícil', look: [9, 13], delay: [0, 2], miss: 0 },
};
const PLAYERS = [
  { name: 'Corall', c: '#E4572E' },
  { name: 'Verd', c: '#1F8A70' },
];

// recorregut compartit: per a cada columna, si hi ha terra i sostre
function makeCourse(seed) {
  let s = seed >>> 0 || 7;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const floor = [], ceil = [];
  const push = (f, c, n) => { for (let i = 0; i < n; i++) { floor.push(f); ceil.push(c); } };
  push(true, true, 14);
  return {
    floor, ceil,
    ensure(i) {
      while (floor.length <= i + 4) {
        const k = floor.length;
        const safe = 4 + Math.floor(rnd() * 3) + Math.min(4, Math.floor(k / 140));
        push(true, true, safe);
        const len = 2 + Math.floor(rnd() * Math.min(4, 2 + k / 120));
        if (rnd() < 0.5) push(false, true, len); else push(true, false, len);
      }
    },
  };
}

export default {
  id: 'gravetat',
  title: 'Gira la gravetat',
  tagline: 'Corre pel terra i pel sostre',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Deixeu el mòbil pla a la taula, entre els dos. Cadascú juga a la meitat que té davant (la de dalt surt girada).',
    'Els dos corredors avancen sols pel mateix camí. Toca la teva meitat de pantalla per girar la gravetat: el teu corredor passa del terra al sostre, o al revés.',
    'Només pots girar quan toques terra o sostre. Si caus per un forat, perds la ronda.',
    'Cada vegada va més de pressa. Guanya qui aguanta més.',
  ],

  mount(root, { goHome }) {
    let canvas = null, ctx = null, scale = 1, colors = null;
    let raf = 0, last = 0, acc = 0;
    let s = null;
    const wins = [0, 0];
    let cpu = getRecord(KEY + ':mode') !== '2p';
    let level = AI[getRecord(KEY + ':level')] ? getRecord(KEY + ':level') : 'normal';
    const names = () => (cpu ? ['Tu', 'Màquina'] : PLAYERS.map(p => p.name));

    function stop() {
      cancelAnimationFrame(raf); raf = 0;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', fit);
    }
    function leave() { stop(); goHome(); }

    function screenConfig() {
      stop();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Gira la gravetat</p>
        <h2 style="font-size:30px;margin:6px 0 16px">Corre pel terra i pel sostre</h2>
        <p class="label" style="margin:0 0 12px">Mode</p>
        <div class="btn-row">
          <button class="btn ${cpu ? 'btn--accent' : 'btn--outline'}" data-mode="cpu">1 jugador</button>
          <button class="btn ${!cpu ? 'btn--accent' : 'btn--outline'}" data-mode="2p">2 jugadors</button>
        </div>
        ${cpu ? `<p class="label" style="margin:18px 0 12px">Dificultat</p>
        <div class="btn-row">
          ${Object.entries(AI).map(([id, a]) => `<button class="btn ${level === id ? 'btn--accent' : 'btn--outline'}" data-level="${id}">${a.name}</button>`).join('')}
        </div>` : ''}
        <p class="muted" style="margin-top:12px">${cpu ? 'Tu corres a baix; la màquina, a dalt. Toca la pantalla per girar la gravetat.' : 'Deixeu el mòbil pla a la taula, entre els dos. Cadascú toca la meitat que té davant per girar la gravetat del seu corredor.'}</p>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { cpu = b.dataset.mode === 'cpu'; setRecord(KEY + ':mode', cpu ? 'cpu' : '2p'); screenConfig(); }; });
      root.querySelectorAll('[data-level]').forEach(b => { b.onclick = () => { level = b.dataset.level; setRecord(KEY + ':level', level); screenConfig(); }; });
      root.querySelector('#start').onclick = () => { wins[0] = wins[1] = 0; begin(); };
    }

    function begin() {
      stop();
      s = {
        course: makeCourse(Date.now() & 0xffffff), scroll: 0, frame: 0, count: 180, over: false, winner: null,
        p: [0, 1].map(() => ({ y: LANE - EDGE - R, vy: 0, g: 1, alive: true, dist: 0, flip: 0, plan: -1 })),
      };
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score">${names()[0]} ${wins[0]} – ${wins[1]} ${names()[1]}</div>
        </div>
        <div class="drac-board gv-board" id="board" style="--ar:${W / H}"><canvas id="cv" role="img" aria-label="Dos corredors, un a cada meitat"></canvas></div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      canvas = root.querySelector('#cv');
      ctx = canvas.getContext('2d');
      const css = getComputedStyle(document.documentElement);
      const v = (n, d) => (css.getPropertyValue(n) || d).trim();
      colors = { paper: v('--paper', '#FBF3E4'), paper2: v('--paper-2', '#F4E8D2'), ink: v('--ink', '#20180F') };
      // cada dit, a la seva meitat (es poden tocar alhora)
      root.querySelector('#board').addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        flip(cpu || e.clientY - r.top > r.height / 2 ? 0 : 1); // a 1 jugador, tota la pantalla és teva
      });
      document.addEventListener('keydown', onKey);
      window.addEventListener('resize', fit);
      fit();
      last = performance.now(); acc = 0;
      raf = requestAnimationFrame(loop);
    }

    function onKey(e) {
      if (!root.isConnected) { stop(); return; }
      if (e.target instanceof HTMLButtonElement) return;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); flip(0); }
      else if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') { e.preventDefault(); flip(1); }
    }

    function fit() {
      if (!canvas || !canvas.isConnected) return;
      const w = canvas.parentElement.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * H / W * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = (w * H / W) + 'px';
      scale = canvas.width / W;
      draw();
    }

    const floorY = LANE - EDGE, ceilY = EDGE;
    function grounded(p) { return p.vy === 0 && (p.y === floorY - R || p.y === ceilY + R); }
    function flip(i) {
      if (!s || s.over || s.count > 0) return;
      if (cpu && i === 1 && !flip.ai) return; // la màquina juga sola
      const p = s.p[i];
      if (!p.alive || !grounded(p)) return;
      p.g = -p.g; p.vy = 0; p.flip = 8;
      p.y += p.g * 1; // es desenganxa
    }

    function loop(now) {
      if (!canvas || !canvas.isConnected) { stop(); return; }
      acc += Math.min(100, now - last); last = now;
      while (acc >= STEP) { update(); acc -= STEP; }
      draw();
      if (!s.over) raf = requestAnimationFrame(loop);
    }

    function has(arr, x) { const i = Math.floor(x / TILE); s.course.ensure(i); return arr[i]; }
    function update() {
      if (s.count > 0) { s.count--; return; }
      s.frame++;
      const speed = Math.min(5.6, 2.4 + s.frame * 0.0012);
      s.scroll += speed;
      const x0 = s.scroll + RX - R + 2, x1 = s.scroll + RX + R - 2;
      if (cpu) think(speed);
      for (const p of s.p) {
        if (!p.alive) continue;
        if (p.flip) p.flip--;
        p.vy = Math.max(-MAXV, Math.min(MAXV, p.vy + GRAV * p.g));
        p.y += p.vy;
        p.dist = s.scroll;
        // terra (si va cap avall) o sostre (si va cap amunt), només si hi ha peça sota els peus
        if (p.g > 0 && p.y + R >= floorY && p.y + R <= floorY + 10 && (has(s.course.floor, x0) || has(s.course.floor, x1))) { p.y = floorY - R; p.vy = 0; }
        if (p.g < 0 && p.y - R <= ceilY && p.y - R >= ceilY - 10 && (has(s.course.ceil, x0) || has(s.course.ceil, x1))) { p.y = ceilY + R; p.vy = 0; }
        if (p.y - R > LANE + 4 || p.y + R < -4) p.alive = false;
      }
      const alive = s.p.map(p => p.alive);
      if (!alive[0] || !alive[1]) {
        s.over = true;
        s.winner = alive[0] ? 0 : alive[1] ? 1 : null;
        if (s.winner != null) wins[s.winner]++;
        if (navigator.vibrate) navigator.vibrate(50);
        setTimeout(roundOver, 500);
      }
    }

    // La màquina: si veu un forat a la seva superfície una mica endavant, gira
    // (amb un retard i, segons la dificultat, de tant en tant s'equivoca).
    const R2 = (a) => a[0] + Math.random() * (a[1] - a[0]);
    function think(speed) {
      const p = s.p[1], A = AI[level];
      if (!p.alive) return;
      if (p.plan >= 0) { if (--p.plan < 0) { flip.ai = true; flip(1); flip.ai = false; } return; }
      if (!grounded(p)) return;
      const surf = p.g > 0 ? s.course.floor : s.course.ceil;
      const ahead = speed * R2(A.look);
      for (let x = s.scroll + RX - R + 2; x <= s.scroll + RX + R + ahead; x += TILE / 2) {
        if (!has(surf, x)) {
          if (Math.random() < A.miss) { p.plan = 999; return; } // aquesta no la veu
          p.plan = Math.round(R2(A.delay));
          return;
        }
      }
    }

    // ---------- dibuix ----------
    function draw() {
      if (!ctx || !s) return;
      const { paper, ink } = colors;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = ink; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // jugador 1 a baix; jugador 2 a dalt, girat 180° (el veu dret des de l'altra banda)
      drawLane(0, scale, 0, (LANE + MID) * scale, 0);
      drawLane(1, scale, W * scale, LANE * scale, Math.PI);
      // ratlla del mig
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = paper;
      for (let x = 4; x < W; x += 16) ctx.fillRect(x, LANE + MID / 2 - 1, 8, 2);
    }

    function drawLane(i, k, tx, ty, rot) {
      const { paper, paper2, ink } = colors;
      const P = PLAYERS[i], p = s.p[i];
      ctx.setTransform(k, 0, 0, k, tx, ty);
      ctx.rotate(rot);
      ctx.fillStyle = paper; ctx.fillRect(0, 0, W, LANE);
      // terra i sostre, peça a peça
      const first = Math.floor(s.scroll / TILE), off = s.scroll - first * TILE;
      s.course.ensure(first + Math.ceil(W / TILE) + 2);
      // terra: bloc de tinta amb vora clara; forat: buit vermell amb punxes,
      // perquè es vegi de lluny on no es pot trepitjar
      for (let j = 0; j <= Math.ceil(W / TILE) + 1; j++) {
        const x = j * TILE - off, col = first + j;
        for (const [has, y0, dir] of [[s.course.floor[col], LANE - EDGE, 1], [s.course.ceil[col], 0, -1]]) {
          if (has) {
            ctx.fillStyle = ink; ctx.fillRect(x, y0, TILE + 0.5, EDGE);
            ctx.fillStyle = P.c; // vora de color: la superfície on es corre
            ctx.fillRect(x, dir > 0 ? y0 : y0 + EDGE - 3, TILE + 0.5, 3);
          } else {
            ctx.fillStyle = 'rgba(210, 31, 31, .16)';
            ctx.fillRect(x, dir > 0 ? y0 - 26 : 0, TILE + 0.5, EDGE + 26);
            ctx.fillStyle = '#D21F1F';
            ctx.beginPath(); // punxes a la vora del forat
            for (let k = 0; k < 2; k++) {
              const sx = x + k * TILE / 2, base = dir > 0 ? LANE : 0, tip = dir > 0 ? LANE - 12 : 12;
              ctx.moveTo(sx, base); ctx.lineTo(sx + TILE / 4, tip); ctx.lineTo(sx + TILE / 2, base);
            }
            ctx.fill();
          }
        }
      }
      // el corredor: un quadrat amb ulls que mira endavant i cap on tira la gravetat
      if (p.alive || s.over) {
        ctx.save();
        ctx.translate(RX, p.y);
        if (p.g < 0) ctx.scale(1, -1);
        ctx.fillStyle = P.c; ctx.strokeStyle = ink; ctx.lineWidth = 2;
        const sq = p.flip ? 1 - p.flip * 0.03 : 1;
        rr(-R, -R * sq, R * 2, R * 2 * sq, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = paper;
        ctx.beginPath(); ctx.arc(2, -3, 3, 0, 7); ctx.arc(7, -3, 3, 0, 7); ctx.fill();
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(3, -3, 1.4, 0, 7); ctx.arc(8, -3, 1.4, 0, 7); ctx.fill();
        // cames que corren
        const t = Math.floor(s.frame / 5) % 2;
        ctx.fillStyle = ink; ctx.fillRect(-5 + t * 3, R - 1, 4, 3); ctx.fillRect(2 - t * 3, R - 1, 4, 3);
        ctx.restore();
      }
      // textos de la franja
      ctx.fillStyle = ink; ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(p.dist / TILE)} m`, W - 8, LANE - EDGE - 6);
      ctx.textAlign = 'center';
      if (s.count > 0) {
        ctx.font = '800 54px "Bricolage Grotesque", system-ui, sans-serif';
        ctx.fillText(String(Math.ceil(s.count / 60)), W / 2, LANE / 2 + 18);
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.fillText('Toca la teva meitat per girar', W / 2, LANE / 2 + 40);
      } else if (s.over) {
        ctx.font = '800 26px "Bricolage Grotesque", system-ui, sans-serif';
        ctx.fillStyle = s.winner === i ? P.c : ink;
        ctx.fillText(s.winner == null ? 'Empat!' : s.winner === i ? 'Guanyes!' : 'Has caigut', W / 2, LANE / 2 + 8);
      }
      ctx.textAlign = 'left';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    function rr(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function roundOver() {
      if (!root.isConnected) return;
      stop(); draw();
      const [na, nb] = names();
      root.querySelector('#score').textContent = `${na} ${wins[0]} – ${wins[1]} ${nb}`;
      const w = s.winner;
      const title = w == null ? 'Empat!' : cpu ? (w === 0 ? 'Has guanyat!' : 'Guanya la màquina') : `Guanya el ${PLAYERS[w].name}!`;
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="--stack-gap:8px">
          <h2 style="color:${w == null ? 'var(--ink)' : PLAYERS[w].c}">${title}</h2>
          <p class="muted">${Math.floor(s.scroll / TILE)} metres · ${na} ${wins[0]} – ${wins[1]} ${nb}</p>
        </div>
        <div class="stack">
          <button class="btn btn--accent" id="again">Revenja</button>
          <button class="btn btn--outline" id="home">Sortir</button>
        </div>`;
      box.querySelector('#again').onclick = begin;
      box.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
