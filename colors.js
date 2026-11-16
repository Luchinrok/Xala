// ============================================================
// Uneix colors — joc d'un sol jugador (del tipus Flow).
//
// Arrossega el dit des d'un punt per fer un camí fins a l'altre punt del
// mateix color. Els camins no es poden creuar (si en tallas un, es talla) i
// cal omplir totes les caselles. Nivells de colors-motor.js (sempre tenen solució).
// ============================================================

import { makeLevel, isSolved, neigh, TIERS, tierOf } from './colors-motor.js';
import { getRecord, setRecord } from './records.js';

const PALETTE = ['#E4572E', '#2E9E4F', '#2F6FD6', '#F2B705', '#7A3BBF', '#F28C28', '#E85D9E', '#1FA3A3', '#8A5A2B'];

export default {
  id: 'colors',
  title: 'Uneix colors',
  tagline: 'Uneix cada parella i omple el tauler',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,
  instructions: [
    'Hi ha parelles de punts del mateix color. Arrossega el dit des d\'un punt fins a l\'altre per unir-los amb un camí.',
    'Els camins van de casella en casella (no en diagonal) i no es poden creuar: si passes per sobre d\'un altre camí, el talles.',
    'Per guanyar, totes les parelles han d\'estar unides i no pot quedar cap casella buida.',
    'Per desfer un tros, torna enrere amb el dit o comença de nou des d\'un dels punts.',
  ],

  mount(root, { goHome }) {
    const nextOf = (t) => Math.min(t.to, Math.max(t.from, getRecord('colors:' + t.id) || t.from));
    let tier = TIERS.find(t => t.id === getRecord('colors:tier')) || TIERS[0];
    let lv = nextOf(tier), L = null, paths = null, cur = null, done = false;
    let canvas = null, ctx = null, cell = 0;
    function leave() { window.removeEventListener('resize', fit); goHome(); }

    function screenConfig() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Uneix colors</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Uneix cada parella i omple el tauler</h2>
        <p class="label" style="margin:0 0 12px">Mida</p>
        <div class="pz-tiers cl-tiers">
          ${TIERS.map(t => `<button class="btn ${tier.id === t.id ? 'btn--accent' : 'btn--outline'}" data-t="${t.id}">${t.name}<small>${nextOf(t) - t.from} de ${t.to - t.from + 1}</small></button>`).join('')}
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">${nextOf(tier) > tier.from ? 'Continua' : 'Comença'}</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => { tier = TIERS.find(t => t.id === b.dataset.t); setRecord('colors:tier', tier.id); screenConfig(); }; });
      root.querySelector('#start').onclick = () => { lv = nextOf(tier); begin(); };
    }

    function begin() {
      tier = tierOf(lv);
      L = makeLevel(lv);
      paths = Array.from({ length: L.k }, () => []);
      cur = null; done = false;
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score">${tier.name} · ${lv - tier.from + 1}</div>
        </div>
        <p class="traca-status" id="status" aria-live="polite">Uneix les parelles</p>
        <div class="cl-board" id="board"><canvas id="cv" role="img" aria-label="Tauler de ${L.n} per ${L.n}"></canvas></div>
        <div class="btn-row" id="controls" style="margin-top:14px">
          <button class="btn btn--outline" id="reset">Torna-hi</button>
        </div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#reset').onclick = begin;
      canvas = root.querySelector('#cv'); ctx = canvas.getContext('2d');
      wire();
      window.addEventListener('resize', fit);
      fit();
    }
    function fit() {
      if (!canvas || !canvas.isConnected) return;
      const w = canvas.parentElement.clientWidth, dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.height = Math.round(w * dpr);
      canvas.style.width = canvas.style.height = w + 'px';
      cell = canvas.width / L.n;
      draw();
    }

    // ---------- dibuixar camins amb el dit ----------
    const owner = (i) => paths.findIndex(p => p.includes(i));
    const isDot = (i) => L.dots.has(i);
    const complete = (c) => { const p = paths[c]; return p.length > 1 && isDot(p[p.length - 1]) && L.dots.get(p[p.length - 1]) === c && p[p.length - 1] !== p[0]; };
    function wire() {
      const at = (e) => {
        const r = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - r.left) / r.width * L.n), y = Math.floor((e.clientY - r.top) / r.height * L.n);
        return x < 0 || y < 0 || x >= L.n || y >= L.n ? null : y * L.n + x;
      };
      canvas.addEventListener('pointerdown', (e) => {
        if (done) return;
        e.preventDefault();
        const i = at(e);
        if (i === null) return;
        if (isDot(i)) { const c = L.dots.get(i); paths[c] = [i]; cur = c; }
        else { const c = owner(i); if (c < 0) return; paths[c] = paths[c].slice(0, paths[c].indexOf(i) + 1); cur = c; }
        draw();
      });
      canvas.addEventListener('pointermove', (e) => {
        if (cur === null) return;
        const i = at(e);
        if (i === null) return;
        const p = paths[cur], last = p[p.length - 1];
        if (i === last) return;
        // el dit s'ha mogut ràpid: només s'accepten veïns
        if (!neigh(L.n, last).includes(i)) return;
        const back = p.indexOf(i);
        if (back >= 0) { paths[cur] = p.slice(0, back + 1); draw(); return; } // tornar enrere
        if (complete(cur)) return; // ja arriba a l'altre punt
        if (isDot(i) && L.dots.get(i) !== cur) return; // un punt d'un altre color: no es pot
        const other = owner(i);
        if (other >= 0) paths[other] = paths[other].slice(0, paths[other].indexOf(i)); // talla l'altre camí
        p.push(i);
        if (navigator.vibrate && isDot(i)) navigator.vibrate(15);
        draw();
      });
      const end = () => { if (cur === null) return; cur = null; check(); };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      canvas.addEventListener('pointerleave', end);
    }

    function draw() {
      if (!ctx) return;
      const n = L.n, s = cell;
      ctx.fillStyle = '#20180F'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // caselles i el color tènue dels camins
      for (let i = 0; i < n * n; i++) {
        const x = (i % n) * s, y = Math.floor(i / n) * s;
        const c = owner(i);
        ctx.fillStyle = '#FBF3E4'; ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
        if (c >= 0) { ctx.fillStyle = PALETTE[c] + '40'; ctx.fillRect(x + 1, y + 1, s - 2, s - 2); }
      }
      // camins
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      paths.forEach((p, c) => {
        if (p.length < 2) return;
        ctx.strokeStyle = PALETTE[c]; ctx.lineWidth = s * 0.34;
        ctx.beginPath();
        p.forEach((i, k) => { const x = (i % n + 0.5) * s, y = (Math.floor(i / n) + 0.5) * s; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
      });
      // punts
      for (const [i, c] of L.dots) {
        const x = (i % n + 0.5) * s, y = (Math.floor(i / n) + 0.5) * s;
        ctx.fillStyle = PALETTE[c]; ctx.strokeStyle = '#20180F'; ctx.lineWidth = Math.max(2, s * 0.05);
        ctx.beginPath(); ctx.arc(x, y, s * 0.33, 0, 7); ctx.fill(); ctx.stroke();
      }
      const joined = paths.filter((_, c) => complete(c)).length;
      const filled = new Set(paths.flat()).size;
      const st = root.querySelector('#status');
      if (st && !done) st.textContent = `${joined} de ${L.k} unides · ${Math.round(filled / (n * n) * 100)}% ple`;
    }

    function check() {
      draw();
      if (paths.every((_, c) => complete(c)) && !isSolved(L, paths)) { root.querySelector('#status').textContent = 'Totes unides! Ara omple les caselles buides'; return; }
      if (!isSolved(L, paths)) return;
      done = true;
      if (lv + 1 > (getRecord('colors:' + tier.id) || tier.from) && lv < tier.to) setRecord('colors:' + tier.id, lv + 1);
      if (lv === tier.to) setRecord('colors:' + tier.id, tier.to + 1);
      root.querySelector('#status').textContent = 'Tot ple!';
      root.querySelector('#controls').style.display = 'none';
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="--stack-gap:6px">
          <h2 style="color:var(--accent)">Nivell ${lv - tier.from + 1} fet!</h2>
          <p class="muted">${tier.name}</p>
        </div>
        <div class="stack">
          <button class="btn btn--accent" id="next">Següent</button>
          <button class="btn btn--outline" id="home">Sortir</button>
        </div>`;
      box.querySelector('#next').onclick = () => { lv = Math.min(150, lv + 1); if (tierOf(lv) !== tier) setRecord('colors:tier', tierOf(lv).id); begin(); };
      box.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
