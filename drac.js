// ============================================================
// El Drac — joc d'un sol jugador (del tipus «toca per volar»).
//
// Un drac de correfoc vola endavant tot sol. Cada toc el fa pujar d'una
// batzegada; si no toques, cau. Ha de passar pel forat de les torres sense
// tocar-les ni caure a terra. Cada torre passada és un punt.
// ============================================================

import { getRecord, setRecord } from './records.js';

const W = 300, H = 450;          // món lògic (es dibuixa escalat)
const GROUND = H - 38;           // on comença el terra
const DX = 82;                   // posició del drac
const R = 12;                    // radi per als xocs (una mica perdonador)
const TW = 54;                   // amplada de les torres
const GRAV = 0.36, FLAP = -6.4, MAXV = 8.5;
const LEVELS = {
  easy: { name: 'Fàcil', gap: 150, speed: 1.9, space: 185 },
  normal: { name: 'Normal', gap: 128, speed: 2.2, space: 175 },
  hard: { name: 'Difícil', gap: 112, speed: 2.6, space: 165 },
};
const STEP = 1000 / 60;

export default {
  id: 'drac',
  title: 'El Drac',
  tagline: 'Toca per volar entre les torres',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'El drac vola endavant tot sol. Cada toc a la pantalla el fa pujar una mica; si no toques, cau.',
    'Passa pel forat de cada torre sense tocar-la. Cada torre que passes és un punt.',
    'Si toca una torre o cau a terra, s\'acaba la partida.',
    'Amb teclat: Espai o la fletxa amunt.',
  ],

  mount(root, { goHome }) {
    let level = getRecord('drac:level');
    if (!LEVELS[level]) level = 'normal';
    let canvas = null, ctx = null, scale = 1, colors = null;
    let raf = 0, last = 0, acc = 0;
    let s = null; // estat de la partida

    const best = () => getRecord('drac:' + level) || 0;
    function stop() {
      cancelAnimationFrame(raf); raf = 0;
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
        <p class="kicker">El Drac</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Toca per volar entre les torres</h2>
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
        b.onclick = () => { level = b.dataset.level; setRecord('drac:level', level); screenConfig(); };
      });
      root.querySelector('#start').onclick = begin;
    }

    // ---------- 2) partida ----------
    function begin() {
      stop();
      const L = LEVELS[level];
      s = { state: 'ready', y: H * 0.42, v: 0, t: 0, score: 0, towers: [], sparks: [], ground: 0, flapT: 0, L };
      for (let i = 0; i < 3; i++) addTower(W + 80 + i * L.space);
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score">0</div>
        </div>
        <p class="traca-status" id="status" aria-live="polite">Toca per volar</p>
        <div class="drac-board" id="board"><canvas id="cv" role="img" aria-label="El drac i les torres"></canvas></div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      canvas = root.querySelector('#cv');
      ctx = canvas.getContext('2d');
      const css = getComputedStyle(document.documentElement);
      const v = (n, d) => (css.getPropertyValue(n) || d).trim();
      colors = { paper: v('--paper', '#FBF3E4'), paper2: v('--paper-2', '#F4E8D2'), ink: v('--ink', '#20180F'), coral: v('--coral', '#E4572E') };
      root.querySelector('#board').addEventListener('pointerdown', (e) => { e.preventDefault(); flap(); });
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onHide);
      window.addEventListener('resize', fit);
      fit();
      last = performance.now(); acc = 0;
      raf = requestAnimationFrame(loop);
    }

    function addTower(x) {
      const gap = s.L.gap;
      const top = 50 + Math.random() * (GROUND - gap - 100);
      s.towers.push({ x, top, gap, passed: false });
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

    function flap() {
      if (!s || s.state === 'dead') return;
      if (s.state === 'ready') { s.state = 'play'; setStatus(''); }
      s.v = FLAP;
      s.flapT = 10;
      // espurnes de correfoc per la cua
      for (let i = 0; i < 6; i++) s.sparks.push({ x: DX - 16, y: s.y + 4, vx: -1 - Math.random() * 2.5, vy: (Math.random() - 0.3) * 2.4, life: 22 + Math.random() * 14 });
    }

    function onKey(e) {
      if (!root.isConnected) { stop(); return; }
      if (e.key === ' ' || e.key === 'ArrowUp') {
        if (e.target instanceof HTMLButtonElement && e.key === ' ') return;
        e.preventDefault(); flap();
      }
    }
    // si es tanca o s'amaga l'app, el drac s'espera (no mor d'amagat)
    function onHide() { if (document.hidden && s && s.state === 'play') { s.state = 'ready'; s.v = 0; setStatus('Toca per continuar'); } }

    function loop(now) {
      if (!canvas || !canvas.isConnected) { stop(); return; }
      acc += Math.min(100, now - last); last = now;
      while (acc >= STEP) { update(); acc -= STEP; }
      draw();
      raf = requestAnimationFrame(loop);
    }

    function update() {
      s.t++;
      s.sparks.forEach(p => { p.x += p.vx - (s.state === 'play' ? s.L.speed : 0); p.y += p.vy; p.vy += 0.08; p.life--; });
      s.sparks = s.sparks.filter(p => p.life > 0);
      if (s.flapT) s.flapT--;
      if (s.state === 'ready') { s.y = H * 0.42 + Math.sin(s.t / 14) * 6; return; }
      if (s.state === 'dead') {
        // cau fins a terra i llavors surt el resultat
        if (s.y < GROUND - R) { s.v = Math.min(MAXV, s.v + GRAV); s.y = Math.min(GROUND - R, s.y + s.v); }
        else if (!s.ended) { s.ended = true; setTimeout(gameOver, 350); }
        return;
      }
      const speed = s.L.speed + Math.min(1, s.score * 0.02);
      s.ground = (s.ground + speed) % 24;
      s.v = Math.min(MAXV, s.v + GRAV);
      s.y += s.v;
      if (s.y < R) { s.y = R; s.v = 0; } // el cel no mata: només frena
      for (const t of s.towers) {
        t.x -= speed;
        if (!t.passed && t.x + TW < DX - R) { t.passed = true; s.score++; root.querySelector('#score').textContent = s.score; }
      }
      if (s.towers[0].x + TW < -10) { s.towers.shift(); addTower(s.towers[s.towers.length - 1].x + s.L.space); }
      if (s.y + R >= GROUND || s.towers.some(hits)) die();
    }

    // xoc cercle–rectangle amb les dues meitats de la torre
    function hits(t) {
      const rects = [[t.x, 0, TW, t.top], [t.x, t.top + t.gap, TW, GROUND - t.top - t.gap]];
      return rects.some(([x, y, w, h]) => {
        const cx = Math.max(x, Math.min(DX, x + w)), cy = Math.max(y, Math.min(s.y, y + h));
        return (DX - cx) ** 2 + (s.y - cy) ** 2 < R * R;
      });
    }

    function die() {
      s.state = 'dead';
      s.v = Math.min(s.v, 0);
      if (navigator.vibrate) navigator.vibrate(60);
    }

    function setStatus(t) { const el = root.querySelector('#status'); if (el) el.textContent = t; }

    // ---------- dibuix ----------
    function draw() {
      if (!ctx || !s) return;
      const { paper, paper2, ink, coral } = colors;
      const k = scale;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      // banderoles de festa major a dalt
      const off = (s.t * (s.state === 'play' ? 0.4 : 0.15)) % 30;
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, 14); ctx.quadraticCurveTo(W / 2, 30, W, 14); ctx.stroke();
      for (let x = -off; x < W + 30; x += 30) {
        const y = 14 + 16 * (1 - ((x - W / 2) / (W / 2)) ** 2) * 0.55;
        ctx.fillStyle = Math.round((x + off) / 30) % 2 ? coral : '#FFC828';
        ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 14); ctx.closePath(); ctx.fill();
      }
      // torres: blocs de pedra amb el capçal corall a la vora del forat
      for (const t of s.towers) {
        tower(t.x, 0, t.top, true);
        tower(t.x, t.top + t.gap, GROUND - t.top - t.gap, false);
      }
      // terra
      ctx.fillStyle = ink; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = coral;
      for (let x = -s.ground; x < W; x += 24) ctx.fillRect(x, GROUND + 8, 12, 5);
      // espurnes
      for (const p of s.sparks) {
        ctx.globalAlpha = Math.min(1, p.life / 20);
        ctx.fillStyle = p.life % 6 < 3 ? '#FFC828' : coral;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      dragon();
    }

    function tower(x, y, h, fromTop) {
      if (h <= 0) return;
      const { paper2, ink, coral } = colors;
      ctx.fillStyle = paper2; ctx.fillRect(x, y, TW, h);
      ctx.strokeStyle = ink; ctx.lineWidth = 2;
      // filades de pedra
      ctx.beginPath();
      for (let yy = fromTop ? y + h - 22 : y + 22; fromTop ? yy > y : yy < y + h; yy += fromTop ? -22 : 22) { ctx.moveTo(x, yy); ctx.lineTo(x + TW, yy); }
      ctx.stroke();
      ctx.strokeRect(x, y, TW, h);
      // capçal
      const cy = fromTop ? y + h - 14 : y;
      ctx.fillStyle = coral; ctx.fillRect(x - 4, cy, TW + 8, 14); ctx.strokeRect(x - 4, cy, TW + 8, 14);
    }

    function dragon() {
      const { paper, ink, coral } = colors;
      const ang = s.state === 'ready' ? 0 : Math.max(-0.5, Math.min(1.1, s.v * 0.08));
      ctx.save();
      ctx.translate(DX, s.y); ctx.rotate(ang);
      ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.lineJoin = 'round';
      // cua
      ctx.fillStyle = coral;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-22, -2, -26, -10); ctx.lineTo(-20, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      // cos
      ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, 0, 0, 7); ctx.fill(); ctx.stroke();
      // ala (bat amunt i avall)
      const wy = s.flapT > 0 ? 10 : (Math.sin(s.t / 5) > 0 ? -12 : -6);
      ctx.fillStyle = '#FFC828';
      ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(4, -2); ctx.lineTo(-4, wy); ctx.closePath(); ctx.fill(); ctx.stroke();
      // cap amb banyes
      ctx.fillStyle = coral;
      ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(17, -17); ctx.lineTo(19, -9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(16, -2, 9, 8, 0, 0, 7); ctx.fill(); ctx.stroke();
      // ull i morro
      ctx.fillStyle = paper; ctx.beginPath(); ctx.arc(18, -4, 3.2, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(19, -4, 1.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(24, 1, 1, 0, 7); ctx.fill();
      ctx.restore();
    }

    // ---------- 3) final ----------
    function gameOver() {
      if (!root.isConnected || !s) return;
      stop();
      draw();
      const pts = s.score, record = pts > best();
      if (record) setRecord('drac:' + level, pts);
      setStatus('Patapam!');
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="margin-top:14px;--stack-gap:8px">
          <h2 style="font-size:28px;color:var(--accent)">${record && pts ? 'Nou rècord!' : 'Fi del vol'}</h2>
          <p class="muted">${pts} ${pts === 1 ? 'torre' : 'torres'}${record || !best() ? '' : ` · Rècord: ${best()}`}</p>
        </div>
        <div class="stack" style="margin-top:14px;--stack-gap:12px">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>`;
      box.querySelector('#again').onclick = begin;
      box.querySelector('#home').onclick = leave;
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    screenConfig();
  },
};
