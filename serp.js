// ============================================================
// La Serp — joc d'un sol jugador.
//
// La serp avança sola; es gira lliscant el dit pel tauler, amb els botons de
// sota o amb les fletxes del teclat. Cada petard que es menja la fa créixer.
// S'acaba si xoca amb la paret o amb ella mateixa.
// ============================================================

import { newGame, step, canTurn } from './serp-motor.js';
import { getRecord, setRecord } from './records.js';

const SIZE = 15;
const SPEEDS = {
  slow: { name: 'Lent', ms: 210 },
  normal: { name: 'Normal', ms: 150 },
  fast: { name: 'Ràpid', ms: 100 },
};
const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
};

export default {
  id: 'serp',
  title: 'La Serp',
  tagline: 'Menja, creix i no et mosseguis',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'La serp avança sola. Llisca el dit pel tauler cap on vols que giri, o fes servir els botons de sota.',
    'Cada petard que menja la fa créixer i suma un punt.',
    'S\'acaba si xoca amb la paret o amb la seva pròpia cua.',
    'Tria la velocitat: com més ràpida, més difícil.',
    'Amb teclat: fletxes (o W, A, S, D) per girar i Espai per fer una pausa.',
  ],

  mount(root, { goHome }) {
    let speed = getRecord('serp:speed');
    if (!SPEEDS[speed]) speed = 'normal';

    let g = null;
    let timer = null;
    let queue = [];       // girs pendents (fins a 2, per als girs ràpids)
    let started = false;  // espera el primer gir per començar
    let paused = false;
    let canvas = null, ctx = null, px = 0;
    let colors = null;

    const best = () => getRecord('serp:' + speed) || 0;

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('resize', fit);
    }
    function leave() { stop(); goHome(); }

    // ---------- 1) inici ----------
    function screenConfig() {
      stop();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">La Serp</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Menja, creix i no et mosseguis</h2>
        <p class="label" style="margin:0 0 12px">Velocitat</p>
        <div class="btn-row" id="speeds">
          ${Object.entries(SPEEDS).map(([id, s]) => `<button class="btn ${speed === id ? 'btn--accent' : 'btn--outline'}" data-level="${id}">${s.name}</button>`).join('')}
        </div>
        <p class="muted center" style="margin-top:12px">Rècord: ${best()}</p>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-level]').forEach(b => {
        b.onclick = () => { speed = b.dataset.level; setRecord('serp:speed', speed); screenConfig(); };
      });
      root.querySelector('#start').onclick = begin;
    }

    // ---------- 2) partida ----------
    function begin() {
      stop();
      g = newGame(SIZE);
      queue = []; started = false; paused = false;
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score">0</div>
        </div>
        <p class="traca-status" id="status" aria-live="polite">Llisca o toca una fletxa per començar</p>
        <div class="serp-board" id="board">
          <canvas id="cv" aria-label="Tauler de la serp" role="img"></canvas>
        </div>
        <div class="serp-pad" id="pad">
          <button class="serp-key serp-key--up" data-dir="up" aria-label="Amunt">▲</button>
          <button class="serp-key serp-key--left" data-dir="left" aria-label="Esquerra">◀</button>
          <button class="serp-key serp-key--pause" id="pause" aria-label="Pausa">❚❚</button>
          <button class="serp-key serp-key--right" data-dir="right" aria-label="Dreta">▶</button>
          <button class="serp-key serp-key--down" data-dir="down" aria-label="Avall">▼</button>
        </div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#pause').onclick = togglePause;
      root.querySelectorAll('[data-dir]').forEach(b => {
        // pointerdown: respon a l'instant, sense esperar que s'aixequi el dit
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); turn(b.dataset.dir); });
        b.addEventListener('click', (e) => { if (e.detail === 0) turn(b.dataset.dir); }); // teclat
      });
      canvas = root.querySelector('#cv');
      ctx = canvas.getContext('2d');
      const css = getComputedStyle(document.documentElement);
      const v = (n, d) => (css.getPropertyValue(n) || d).trim();
      colors = { paper: v('--paper', '#FBF3E4'), paper2: v('--paper-2', '#F4E8D2'), ink: v('--ink', '#20180F'), coral: v('--coral', '#E4572E') };
      wireSwipe(root.querySelector('#board'));
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onHide);
      window.addEventListener('resize', fit);
      fit();
    }

    function fit() {
      if (!canvas || !canvas.isConnected) return;
      const w = canvas.parentElement.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(w * dpr);
      canvas.style.width = canvas.style.height = w + 'px';
      px = canvas.width / SIZE;
      draw();
    }

    function turn(dir) {
      if (!g || g.over) return;
      if (paused) togglePause();
      const last = queue.length ? queue[queue.length - 1] : g.dir;
      if (!started) {
        if (dir === 'left') return; // seria mitja volta: la serp mira a la dreta
        started = true;
        g.dir = dir;
        setStatus('');
        timer = setInterval(tick, SPEEDS[speed].ms);
        return;
      }
      if (queue.length < 2 && canTurn(last, dir)) queue.push(dir);
    }

    function tick() {
      if (!canvas || !canvas.isConnected) { stop(); return; }
      if (queue.length) g.dir = queue.shift();
      const r = step(g);
      if (r === 'eat') root.querySelector('#score').textContent = g.eaten;
      draw();
      if (g.over) gameOver();
    }

    function togglePause() {
      if (!g || g.over || !started) return;
      paused = !paused;
      const b = root.querySelector('#pause');
      if (paused) {
        clearInterval(timer); timer = null;
        setStatus('En pausa. Toca una fletxa per continuar');
        b.textContent = '▶'; b.setAttribute('aria-label', 'Continua');
      } else {
        timer = setInterval(tick, SPEEDS[speed].ms);
        setStatus('');
        b.textContent = '❚❚'; b.setAttribute('aria-label', 'Pausa');
      }
    }
    function onHide() { if (document.hidden && started && !paused && g && !g.over) togglePause(); }

    function onKey(e) {
      if (!root.isConnected) { stop(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (KEYS[e.key]) { e.preventDefault(); turn(KEYS[e.key]); }
      else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); togglePause(); }
    }

    // Lliscar: el gir es fa en quan el dit s'ha mogut prou, sense aixecar-lo,
    // i es pot encadenar un altre gir continuant el gest.
    function wireSwipe(el) {
      let sx = 0, sy = 0, down = false;
      el.addEventListener('pointerdown', (e) => { down = true; sx = e.clientX; sy = e.clientY; e.preventDefault(); });
      el.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        sx = e.clientX; sy = e.clientY;
      });
      const end = () => { down = false; };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }

    function setStatus(t) {
      const el = root.querySelector('#status');
      if (el) el.textContent = t;
    }

    // ---------- dibuix ----------
    function draw() {
      if (!ctx || !px) return;
      const { paper, paper2, ink, coral } = colors;
      ctx.fillStyle = paper2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = paper;
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if ((r + c) % 2) ctx.fillRect(c * px, r * px, px, px);
      // menjar: un petard groc amb metxa
      if (g.food) {
        const [r, c] = g.food;
        const x = c * px + px / 2, y = r * px + px / 2;
        ctx.fillStyle = '#FFC828';
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(1.5, px * 0.09);
        ctx.beginPath(); ctx.arc(x, y + px * 0.06, px * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + px * 0.12, y - px * 0.2); ctx.lineTo(x + px * 0.26, y - px * 0.38); ctx.stroke();
      }
      // serp: cos corall amb vora de tinta, cap de tinta amb ulls
      const pad = px * 0.08;
      g.snake.forEach(([r, c], i) => {
        ctx.fillStyle = i === 0 ? ink : coral;
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(1.5, px * 0.08);
        roundRect(c * px + pad, r * px + pad, px - pad * 2, px - pad * 2, px * 0.28);
        ctx.fill();
        if (i) ctx.stroke();
      });
      const [hr, hc] = g.snake[0];
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[g.dir];
      const cx = hc * px + px / 2, cy = hr * px + px / 2;
      ctx.fillStyle = paper;
      for (const s of [-1, 1]) {
        const ex = cx + d[0] * px * 0.16 + (d[1] ? s * px * 0.16 : 0);
        const ey = cy + d[1] * px * 0.16 + (d[0] ? s * px * 0.16 : 0);
        ctx.beginPath(); ctx.arc(ex, ey, px * 0.08, 0, Math.PI * 2); ctx.fill();
      }
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    // ---------- 3) final ----------
    function gameOver() {
      stop();
      const pts = g.eaten;
      const record = pts > best();
      if (record) setRecord('serp:' + speed, pts);
      const full = !g.food;
      setStatus(full ? 'Has omplert tot el tauler!' : 'Patapam!');
      root.querySelector('#pad').style.display = 'none';
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="margin-top:14px;--stack-gap:8px">
          <h2 style="font-size:28px;color:var(--accent)">${record && pts ? 'Nou rècord!' : full ? 'Increïble!' : 'Fi de la partida'}</h2>
          <p class="muted">${pts} ${pts === 1 ? 'petard' : 'petards'}${record || !best() ? '' : ` · Rècord: ${best()}`}</p>
        </div>
        <div class="stack" style="margin-top:14px;--stack-gap:12px">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>`;
      box.querySelector('#again').onclick = begin;
      box.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
