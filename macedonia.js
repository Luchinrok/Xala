// ============================================================
// Macedònia — joc d'un sol jugador (del tipus «ajunta fruites»).
//
// Deixa caure fruites dins el bol. Quan dues d'iguals es toquen, s'ajunten en
// la fruita següent, més grossa (i sumen punts). Si el bol s'omple per sobre
// de la ratlla, s'acaba. Física amb Matter.js (vendor/matter.min.js).
// ============================================================

import { getRecord, setRecord } from './records.js';

const W = 300, H = 420, WALL = 10, LINE = 74;
// de la més petita a la més grossa: nom, radi i color
const FRUITS = [
  { name: 'cirera', r: 11, c: '#B3122B' },
  { name: 'maduixa', r: 15, c: '#E4572E' },
  { name: 'raïm', r: 20, c: '#7A3BBF' },
  { name: 'mandarina', r: 25, c: '#F28C28' },
  { name: 'llimona', r: 30, c: '#FFC828' },
  { name: 'poma', r: 36, c: '#5FAD41' },
  { name: 'préssec', r: 42, c: '#F4A07E' },
  { name: 'pera', r: 49, c: '#C9D84A' },
  { name: 'pinya', r: 56, c: '#E8B33A' },
  { name: 'meló', r: 64, c: '#A8CF7A' },
  { name: 'síndria', r: 72, c: '#1F8A70' },
];
const STEP = 1000 / 60;

// ---------- partida desada (com a Encaixa!): es pot continuar ----------
const SAVE_KEY = 'xala:macedonia:partida';
function loadSave() {
  try { const g = JSON.parse(localStorage.getItem(SAVE_KEY)); return g && Array.isArray(g.fruits) ? g : null; } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } }

let matterReady = null;
function loadMatter() {
  if (window.Matter) return Promise.resolve(window.Matter);
  if (!matterReady) {
    matterReady = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = './vendor/matter.min.js';
      s.onload = () => (window.Matter ? ok(window.Matter) : ko(new Error('Matter')));
      s.onerror = () => { matterReady = null; s.remove(); ko(new Error('Matter')); };
      document.head.appendChild(s);
    });
  }
  return matterReady;
}

export default {
  id: 'macedonia',
  title: 'Macedònia',
  tagline: 'Ajunta fruites iguals i fes-les créixer',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Mou el dit per sobre del bol per triar on cau la fruita, i aixeca\'l per deixar-la caure.',
    'Quan dues fruites iguals es toquen, s\'ajunten en la següent, més grossa: de la cirera fins a la síndria.',
    'Cada fruita nova suma punts: com més grossa, més punts.',
    'Si les fruites passen de la ratlla de dalt una estona, s\'acaba la partida.',
  ],

  mount(root, { goHome }) {
    let M = null, engine = null, canvas = null, ctx = null, scale = 1, colors = null;
    let raf = 0, last = 0, acc = 0;
    let s = null;

    const best = () => getRecord('macedonia') || 0;
    function stop() {
      if (s && !s.over && engine) save(); // en sortir, es desa on era
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
        <p class="kicker">Macedònia</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Ajunta fruites iguals i fes-les créixer</h2>
        <div class="mc-chain" aria-label="De la cirera a la síndria">
          ${FRUITS.map(f => `<span class="mc-dot" style="--c:${f.c};--s:${Math.round(10 + f.r * 0.28)}px" title="${f.name}"></span>`).join('')}
        </div>
        <p class="muted center" style="margin-top:12px">De la cirera a la síndria · Rècord: ${best()}</p>
        <div class="spacer"></div>
        ${loadSave()
          ? `<button class="btn btn--accent" id="continue" style="margin-top:28px">Continuar partida</button>
             <button class="btn btn--outline" id="start" style="margin-top:12px">Nova partida</button>`
          : '<button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>'}
      `;
      root.querySelector('#back').onclick = leave;
      const go = (resume) => {
        root.querySelectorAll('.btn').forEach(b => { b.disabled = true; });
        loadMatter().then((m) => { M = m; begin(resume ? loadSave() : null); }).catch(() => {
          root.querySelectorAll('.btn').forEach(b => { b.disabled = false; });
          root.querySelector('.muted').textContent = 'No s\'ha pogut carregar el joc. Torna-ho a provar.';
        });
      };
      root.querySelector('#start').onclick = () => go(false);
      const c = root.querySelector('#continue');
      if (c) c.onclick = () => go(true);
    }

    // ---------- 2) partida ----------
    const pick = () => Math.floor(Math.random() * 5);
    function begin(saved) {
      s = null; stop();
      if (!saved) clearSave();
      engine = M.Engine.create({ positionIterations: 8, velocityIterations: 6 });
      engine.gravity.y = 1;
      const wall = { isStatic: true, friction: 0.4, restitution: 0.1 };
      M.Composite.add(engine.world, [
        M.Bodies.rectangle(W / 2, H + WALL / 2 - WALL, W, WALL * 2, wall),
        M.Bodies.rectangle(-WALL / 2 + WALL, H / 2, WALL * 2, H * 2, wall),
        M.Bodies.rectangle(W + WALL / 2 - WALL, H / 2, WALL * 2, H * 2, wall),
      ]);
      s = { x: W / 2, cur: pick(), next: pick(), score: 0, wait: 0, danger: 0, over: false, pops: [], merging: new Set(), biggest: 0, tick: 0 };
      if (saved) {
        Object.assign(s, { cur: saved.cur, next: saved.next, score: saved.score, biggest: saved.biggest || 0 });
        for (const f of saved.fruits) { const b = fruit(f.l, f.x, f.y); M.Body.setAngle(b, f.a || 0); }
      }
      M.Events.on(engine, 'collisionStart', onCollide);
      M.Events.on(engine, 'collisionActive', onCollide);
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score">${s.score}</div>
        </div>
        <p class="traca-status" id="status" aria-live="polite">Mou el dit i deixa anar per tirar</p>
        <div class="drac-board mc-board" id="board" style="--ar:${W / H}"><canvas id="cv" role="img" aria-label="El bol de fruites"></canvas></div>
        <div class="mc-chain mc-chain--game" id="chain" aria-label="Evolució: de la cirera a la síndria">
          ${FRUITS.map((f, i) => `<span class="mc-dot" data-i="${i}" style="--c:${f.c};--s:${Math.round(9 + f.r * 0.24)}px" title="${f.name}"></span>`).join('')}
        </div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      canvas = root.querySelector('#cv');
      ctx = canvas.getContext('2d');
      const css = getComputedStyle(document.documentElement);
      const v = (n, d) => (css.getPropertyValue(n) || d).trim();
      colors = { paper: v('--paper', '#FBF3E4'), paper2: v('--paper-2', '#F4E8D2'), ink: v('--ink', '#20180F'), coral: v('--coral', '#E4572E') };
      wirePointer(root.querySelector('#board'));
      markChain();
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onHide);
      window.addEventListener('resize', fit);
      fit();
      last = performance.now(); acc = 0;
      raf = requestAnimationFrame(loop);
    }

    const clampX = (x, lvl) => Math.max(WALL + FRUITS[lvl].r, Math.min(W - WALL - FRUITS[lvl].r, x));
    function wirePointer(el) {
      const toX = (e) => { const r = canvas.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
      let down = false;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); down = true; s.x = clampX(toX(e), s.cur); });
      el.addEventListener('pointermove', (e) => { if (down || e.pointerType === 'mouse') s.x = clampX(toX(e), s.cur); });
      el.addEventListener('pointerup', (e) => { if (!down) return; down = false; s.x = clampX(toX(e), s.cur); drop(); });
      el.addEventListener('pointercancel', () => { down = false; });
    }
    function onKey(e) {
      if (!root.isConnected) { stop(); return; }
      if (e.key === 'ArrowLeft') { s.x = clampX(s.x - 12, s.cur); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { s.x = clampX(s.x + 12, s.cur); e.preventDefault(); }
      else if ((e.key === ' ' || e.key === 'ArrowDown') && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); drop(); }
    }

    function fruit(lvl, x, y) {
      const b = M.Bodies.circle(x, y, FRUITS[lvl].r, { restitution: 0.12, friction: 0.25, frictionStatic: 0.4, density: 0.0012, label: 'fruit' });
      b.lvl = lvl; b.born = engine.timing.timestamp;
      M.Composite.add(engine.world, b);
      return b;
    }

    function drop() {
      if (!s || s.over || s.wait > 0) return;
      fruit(s.cur, clampX(s.x, s.cur), LINE - 34);
      s.cur = s.next; s.next = pick();
      s.x = clampX(s.x, s.cur);
      s.wait = 28; // una mica d'espera entre fruites
      setStatus('');
    }

    // dues fruites iguals es toquen: s'ajunten en la següent
    function onCollide(ev) {
      for (const { bodyA: a, bodyB: b } of ev.pairs) {
        if (a.label !== 'fruit' || b.label !== 'fruit' || a.lvl !== b.lvl) continue;
        if (s.merging.has(a.id) || s.merging.has(b.id)) continue;
        s.merging.add(a.id); s.merging.add(b.id);
        s.pops.push([a, b]);
      }
    }
    function doMerges() {
      for (const [a, b] of s.pops) {
        M.Composite.remove(engine.world, [a, b]);
        const x = (a.position.x + b.position.x) / 2, y = (a.position.y + b.position.y) / 2;
        const lvl = a.lvl + 1;
        if (lvl < FRUITS.length) {
          const n = fruit(lvl, x, y);
          M.Body.setVelocity(n, { x: 0, y: -1 });
          n.pop = 10;
          if (lvl > s.biggest) { s.biggest = lvl; markChain(); }
        }
        s.score += lvl < FRUITS.length ? (lvl + 1) * (lvl + 2) / 2 : 100; // dues síndries: desapareixen i fan festa
        if (navigator.vibrate) navigator.vibrate(12);
      }
      if (s.pops.length) { root.querySelector('#score').textContent = s.score; s.merging.clear(); s.pops = []; }
    }

    // l'evolució de sota: les fruites ja aconseguides, plenes; les altres, esvaïdes
    function markChain() {
      root.querySelectorAll('#chain .mc-dot').forEach(d => d.classList.toggle('mc-dot--got', +d.dataset.i <= Math.max(4, s.biggest)));
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
      if (!s.over) raf = requestAnimationFrame(loop);
    }

    function save() {
      const fruits = M.Composite.allBodies(engine.world).filter(b => b.label === 'fruit')
        .map(b => ({ l: b.lvl, x: Math.round(b.position.x * 10) / 10, y: Math.round(b.position.y * 10) / 10, a: Math.round(b.angle * 100) / 100 }));
      try { localStorage.setItem(SAVE_KEY, JSON.stringify({ fruits, cur: s.cur, next: s.next, score: s.score, biggest: s.biggest })); } catch (e) { /* */ }
    }
    function onHide() { if (document.hidden && s && !s.over) save(); }

    function update() {
      M.Engine.update(engine, STEP);
      if (++s.tick % 90 === 0) save(); // cada segon i mig
      doMerges();
      if (s.wait) s.wait--;
      // ple: alguna fruita quieta per sobre de la ratlla durant dos segons
      const fr = M.Composite.allBodies(engine.world).filter(b => b.label === 'fruit');
      fr.forEach(b => { if (b.pop) b.pop--; });
      const over = fr.some(b => engine.timing.timestamp - b.born > 1200 && b.position.y - FRUITS[b.lvl].r < LINE && Math.abs(b.velocity.y) < 0.6);
      s.danger = over ? s.danger + 1 : Math.max(0, s.danger - 2);
      if (s.danger > 120) { s.over = true; setTimeout(gameOver, 400); }
    }

    function setStatus(t) { const el = root.querySelector('#status'); if (el) el.textContent = t; }

    // ---------- dibuix ----------
    function draw() {
      if (!ctx || !s) return;
      const { paper, paper2, ink, coral } = colors;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      // la ratlla de dalt (parpelleja si hi ha perill)
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = s.danger > 0 && Math.floor(s.danger / 8) % 2 ? coral : 'rgba(32,24,15,.3)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(WALL, LINE); ctx.lineTo(W - WALL, LINE); ctx.stroke();
      ctx.restore();
      // parets del bol
      ctx.fillStyle = paper2; ctx.fillRect(0, 0, WALL, H); ctx.fillRect(W - WALL, 0, WALL, H); ctx.fillRect(0, H - WALL, W, WALL);
      // guia i fruita a punt de caure
      if (!s.over) {
        ctx.strokeStyle = 'rgba(32,24,15,.15)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s.x, LINE - 34); ctx.lineTo(s.x, H - WALL); ctx.stroke();
        if (s.wait < 14) drawFruit(s.cur, s.x, LINE - 34, 0, 1);
      }
      for (const b of M.Composite.allBodies(engine.world)) if (b.label === 'fruit') drawFruit(b.lvl, b.position.x, b.position.y, b.angle, b.pop ? 1 + b.pop * 0.02 : 1);
      // la següent, petita, a dalt a la dreta
      ctx.fillStyle = ink; ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('Després', W - 18, 18);
      drawFruit(s.next, W - 30, 38, 0, Math.min(1, 14 / FRUITS[s.next].r));
      ctx.textAlign = 'left';
    }

    function drawFruit(lvl, x, y, ang, k) {
      const { ink, paper } = colors;
      const f = FRUITS[lvl], r = f.r * k;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = f.c; ctx.strokeStyle = ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke();
      // síndria: ratlles; llimona i mandarina: puntets
      if (f.name === 'síndria') {
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = r * 0.12;
        for (const dx of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(dx * r, 0, r * 0.12, r * 0.85, 0, 0, 7); ctx.stroke(); }
      }
      // brillantor
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.13, -0.6, 0, 7); ctx.fill();
      // full i cua
      ctx.strokeStyle = ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.08, -r - Math.max(4, r * 0.22)); ctx.stroke();
      ctx.fillStyle = '#5FAD41';
      ctx.beginPath(); ctx.ellipse(r * 0.22, -r - Math.max(3, r * 0.16), Math.max(4, r * 0.24), Math.max(2, r * 0.1), -0.5, 0, 7); ctx.fill(); ctx.stroke();
      // ulls i somriure (de festa)
      if (r > 14) {
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.05, Math.max(1.4, r * 0.07), 0, 7); ctx.arc(r * 0.28, -r * 0.05, Math.max(1.4, r * 0.07), 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      }
      ctx.restore();
    }

    // ---------- 3) final ----------
    function gameOver() {
      clearSave();
      if (!root.isConnected) return;
      stop();
      const pts = s.score, record = pts > best();
      if (record) setRecord('macedonia', pts);
      setStatus('El bol vessa!');
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="margin-top:14px;--stack-gap:8px">
          <h2 style="font-size:28px;color:var(--accent)">${record && pts ? 'Nou rècord!' : 'Fi de la partida'}</h2>
          <p class="muted">${pts} punts · la més grossa: ${FRUITS[s.biggest].name}${record || !best() ? '' : ` · Rècord: ${best()}`}</p>
        </div>
        <div class="stack" style="margin-top:14px;--stack-gap:12px">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>`;
      box.querySelector('#again').onclick = () => begin(null);
      box.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
