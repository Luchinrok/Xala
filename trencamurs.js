// ============================================================
// Totxos — joc d'un sol jugador (fitxer trencamurs.js; es deia Trencamurs) (del tipus «pala i maons»).
//
// Mou la pala amb el dit perquè la pilota no caigui i rebota-la contra el mur
// fins que no en quedi cap maó. Els maons foscos s'han de tocar dues vegades.
// Tres vides; cada mur net, un de nou més dur.
// ============================================================

import { getRecord, setRecord } from './records.js';

const W = 300, H = 420;
const PY = 392, PH = 10, BR = 6;
const COLS = 7, BW = (W - 20 - (COLS - 1) * 4) / COLS, BH = 15, TOP = 46;
const LEVELS = {
  easy: { name: 'Fàcil', pw: 72, speed: 3.8 },
  normal: { name: 'Normal', pw: 58, speed: 4.4 },
  hard: { name: 'Difícil', pw: 48, speed: 5 },
};
const STEP = 1000 / 60, SUB = 4;
const ROWCOL = ['#E4572E', '#FFC828', '#1F8A70', '#E4572E', '#FFC828', '#1F8A70', '#E4572E'];

export default {
  id: 'trencamurs',
  title: 'Totxos',
  tagline: 'Rebota la pilota i trenca el mur',
  accent: '#E4572E',
  color: 'var(--accent)',
  ready: true,

  instructions: [
    'Toca la pantalla per llançar la pilota i mou la pala lliscant el dit.',
    'La pilota rebota a les parets, a la pala i als maons. Cada maó que trenques suma punts.',
    'Si toques la pilota amb la punta de la pala, surt més de costat.',
    'Els maons foscos s\'han de tocar dues vegades. Tens tres vides; quan trenques tot el mur, en surt un altre.',
    'Amb teclat: fletxes per moure la pala i Espai per llançar.',
  ],

  mount(root, { goHome }) {
    let level = getRecord('trencamurs:level');
    if (!LEVELS[level]) level = 'normal';
    let canvas = null, ctx = null, scale = 1, colors = null;
    let raf = 0, last = 0, acc = 0, keys = { l: false, r: false };
    let s = null;

    const best = () => getRecord('trencamurs:' + level) || 0;
    function stop() {
      cancelAnimationFrame(raf); raf = 0;
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKey);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('resize', fit);
    }
    function leave() { stop(); goHome(); }

    // ---------- 1) inici ----------
    function screenConfig() {
      stop();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Totxos</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Rebota la pilota i trenca el mur</h2>
        <p class="label" style="margin:0 0 12px">Dificultat</p>
        <div class="btn-row" id="levels">
          ${Object.entries(LEVELS).map(([id, l]) => `<button class="btn ${level === id ? 'btn--accent' : 'btn--outline'}" data-level="${id}">${l.name}</button>`).join('')}
        </div>
        <p class="muted center" style="margin-top:12px">Rècord: ${best()}</p>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-level]').forEach(b => {
        b.onclick = () => { level = b.dataset.level; setRecord('trencamurs:level', level); screenConfig(); };
      });
      root.querySelector('#start').onclick = begin;
    }

    // ---------- 2) partida ----------
    function begin() {
      stop();
      const L = LEVELS[level];
      s = { L, px: W / 2, lives: 3, score: 0, wall: 1, bricks: [], ball: null, stuck: true, over: false, flash: 0 };
      buildWall();
      resetBall();
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score"></div>
        </div>
        <p class="traca-status" id="status" aria-live="polite">Toca per llançar la pilota</p>
        <div class="drac-board" id="board" style="--ar:${W / H}"><canvas id="cv" role="img" aria-label="La pala, la pilota i el mur"></canvas></div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      canvas = root.querySelector('#cv');
      ctx = canvas.getContext('2d');
      const css = getComputedStyle(document.documentElement);
      const v = (n, d) => (css.getPropertyValue(n) || d).trim();
      colors = { paper: v('--paper', '#FBF3E4'), paper2: v('--paper-2', '#F4E8D2'), ink: v('--ink', '#20180F'), coral: v('--coral', '#E4572E') };
      wirePointer(root.querySelector('#board'));
      document.addEventListener('keydown', onKey);
      document.addEventListener('keyup', onKey);
      document.addEventListener('visibilitychange', onHide);
      window.addEventListener('resize', fit);
      fit();
      renderScore();
      last = performance.now(); acc = 0;
      raf = requestAnimationFrame(loop);
    }

    // Cada mur nou té una fila més (fins a 7) i més maons durs.
    function buildWall() {
      const rows = Math.min(7, 3 + s.wall);
      s.bricks = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
        // forats en forma de dibuix a partir del segon mur
        if (s.wall > 1 && (r + c * (s.wall + 1)) % (s.wall + 4) === 0) continue;
        const hard = s.wall > 1 && r < s.wall - 1;
        s.bricks.push({ x: 10 + c * (BW + 4), y: TOP + r * (BH + 4), hp: hard ? 2 : 1, col: hard ? null : ROWCOL[r] });
      }
    }
    function resetBall() {
      s.stuck = true;
      s.ball = { x: s.px, y: PY - BR - 1, vx: 0, vy: 0 };
    }
    function launch() {
      if (!s || s.over || !s.stuck) return;
      s.stuck = false;
      const sp = speed(), a = (Math.random() - 0.5) * 0.6;
      s.ball.vx = sp * Math.sin(a); s.ball.vy = -sp * Math.cos(a);
      setStatus('');
    }
    const speed = () => Math.min(7, s.L.speed + (s.wall - 1) * 0.35);

    function wirePointer(el) {
      const move = (e) => {
        const r = canvas.getBoundingClientRect();
        s.px = Math.max(s.L.pw / 2, Math.min(W - s.L.pw / 2, (e.clientX - r.left) / r.width * W));
      };
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); move(e); launch(); });
      el.addEventListener('pointermove', move);
    }
    function onKey(e) {
      if (!root.isConnected) { stop(); return; }
      const down = e.type === 'keydown';
      if (e.key === 'ArrowLeft') { keys.l = down; e.preventDefault(); }
      else if (e.key === 'ArrowRight') { keys.r = down; e.preventDefault(); }
      else if (e.key === ' ' && down && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); launch(); }
    }
    function onHide() {
      // si s'amaga l'app, la pilota torna a la pala (sense perdre cap vida)
      if (document.hidden && s && !s.over && !s.stuck) { resetBall(); setStatus('Toca per continuar'); }
    }

    function fit() {
      if (!canvas || !canvas.isConnected) return;
      const w = canvas.parentElement.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(w * H / W * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = (w * H / W) + 'px';
      scale = canvas.width / W;
      draw();
    }

    function loop(now) {
      if (!canvas || !canvas.isConnected) { stop(); return; }
      acc += Math.min(100, now - last); last = now;
      while (acc >= STEP) { update(); acc -= STEP; }
      draw();
      if (s.over) return;
      raf = requestAnimationFrame(loop);
    }

    function update() {
      if (s.flash) s.flash--;
      if (keys.l) s.px = Math.max(s.L.pw / 2, s.px - 6);
      if (keys.r) s.px = Math.min(W - s.L.pw / 2, s.px + 6);
      const b = s.ball;
      if (s.stuck) { b.x = s.px; b.y = PY - BR - 1; return; }
      for (let i = 0; i < SUB; i++) {
        b.x += b.vx / SUB; b.y += b.vy / SUB;
        if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); }
        if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); }
        if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy); }
        // pala: l'angle de sortida depèn d'on toca
        const half = s.L.pw / 2;
        if (b.vy > 0 && b.y + BR >= PY && b.y + BR <= PY + PH + 6 && b.x >= s.px - half - BR && b.x <= s.px + half + BR) {
          const off = Math.max(-1, Math.min(1, (b.x - s.px) / half));
          const a = off * 1.05, sp = speed();
          b.vx = sp * Math.sin(a); b.vy = -sp * Math.cos(a);
          b.y = PY - BR;
        }
        // maons: rebota pel costat on s'endinsa menys
        for (const k of s.bricks) {
          if (k.hp <= 0) continue;
          const nx = Math.max(k.x, Math.min(b.x, k.x + BW)), ny = Math.max(k.y, Math.min(b.y, k.y + BH));
          if ((b.x - nx) ** 2 + (b.y - ny) ** 2 > BR * BR) continue;
          const ox = Math.min(b.x + BR - k.x, k.x + BW - (b.x - BR));
          const oy = Math.min(b.y + BR - k.y, k.y + BH - (b.y - BR));
          if (ox < oy) b.vx = b.x < k.x + BW / 2 ? -Math.abs(b.vx) : Math.abs(b.vx);
          else b.vy = b.y < k.y + BH / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
          k.hp--;
          s.score += k.hp ? 5 : 10;
          renderScore();
          break;
        }
      }
      s.bricks = s.bricks.filter(k => k.hp > 0);
      if (!s.bricks.length) {
        s.wall++; s.score += 50; buildWall(); resetBall(); renderScore();
        setStatus(`Mur ${s.wall}! Toca per llançar`);
        return;
      }
      if (b.y > H + 20) {
        s.lives--; s.flash = 20; renderScore();
        if (navigator.vibrate) navigator.vibrate(40);
        if (s.lives <= 0) { s.over = true; setTimeout(gameOver, 300); return; }
        resetBall(); setStatus('Toca per llançar la pilota');
      }
    }

    function renderScore() {
      const el = root.querySelector('#score');
      if (el) el.textContent = `${'♥'.repeat(Math.max(0, s.lives))} · ${s.score}`;
    }
    function setStatus(t) { const el = root.querySelector('#status'); if (el) el.textContent = t; }

    // ---------- dibuix ----------
    function draw() {
      if (!ctx || !s) return;
      const { paper, paper2, ink, coral } = colors;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = s.flash % 6 > 2 ? 'rgba(228,87,46,.18)' : paper;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = paper2;
      for (let y = 10; y < H; y += 20) for (let x = 10; x < W; x += 20) { ctx.beginPath(); ctx.arc(x, y, 1.1, 0, 7); ctx.fill(); }
      ctx.lineWidth = 1.8; ctx.strokeStyle = ink;
      for (const k of s.bricks) {
        ctx.fillStyle = k.col || (k.hp > 1 ? ink : '#6A5A48');
        rr(k.x, k.y, BW, BH, 3); ctx.fill(); ctx.stroke();
        if (!k.col && k.hp === 1) { // esquerdat
          ctx.strokeStyle = paper; ctx.beginPath(); ctx.moveTo(k.x + BW * 0.3, k.y + 2); ctx.lineTo(k.x + BW * 0.5, k.y + BH / 2); ctx.lineTo(k.x + BW * 0.4, k.y + BH - 2); ctx.stroke(); ctx.strokeStyle = ink;
        }
      }
      // pala
      ctx.fillStyle = ink; rr(s.px - s.L.pw / 2, PY, s.L.pw, PH, 5); ctx.fill();
      ctx.fillStyle = coral; rr(s.px - s.L.pw / 2 + 4, PY + 3, s.L.pw - 8, PH - 6, 2); ctx.fill();
      // pilota
      ctx.fillStyle = '#FFC828'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, BR, 0, 7); ctx.fill(); ctx.stroke();
    }
    function rr(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    // ---------- 3) final ----------
    function gameOver() {
      if (!root.isConnected) return;
      stop();
      const pts = s.score, record = pts > best();
      if (record) setRecord('trencamurs:' + level, pts);
      setStatus('Sense vides!');
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="margin-top:14px;--stack-gap:8px">
          <h2 style="font-size:28px;color:var(--accent)">${record && pts ? 'Nou rècord!' : 'Fi de la partida'}</h2>
          <p class="muted">${pts} punts · mur ${s.wall}${record || !best() ? '' : ` · Rècord: ${best()}`}</p>
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
