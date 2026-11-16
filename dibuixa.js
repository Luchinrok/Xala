// ============================================================
// Dibuixa-ho! — joc de grup (del tipus «dibuixa i endevina»), un sol mòbil.
//
// Per torns, un jugador mira la paraula en secret i la dibuixa al mòbil amb el
// dit; els altres miren com dibuixa i criden què és. Qui l'encerta i qui
// dibuixa guanyen un punt cadascun. Les paraules són les de L'impostor (les
// categories que es poden dibuixar).
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { openCategoryScreen, categoriesLabel } from './category-select.js';
import { getPlayers, setPlayers } from './store.js';
import { drawFromBag } from './word-bag.js';
import { t } from './i18n.js';
import { getRecord, setRecord } from './records.js';

// categories que es poden dibuixar (sense marques, famosos, pel·lícules…)
const DRAWABLE = ['infantil', 'menjar', 'animals', 'casa', 'transport', 'roba', 'natura', 'eines', 'objectes', 'esports', 'professions', 'cos', 'accions', 'musica'];
const COLORS = ['#20180F', '#E4572E', '#1F8A70', '#2F6FD6', '#FFC828'];
const D = (k, v) => t('dibuixa.' + k, v);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default {
  id: 'dibuixa',
  title: 'Dibuixa-ho!',
  tagline: 'Dibuixa la paraula i que l\'endevinin',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,

  instructions: [
    'Per torns, un jugador mira en secret la paraula que li toca i la dibuixa al mòbil amb el dit. No es pot escriure ni parlar!',
    'Els altres miren el dibuix i criden què és. Qui dibuixa toca «L\'han endevinada!» i tria qui l\'ha encertat.',
    'Qui l\'encerta i qui dibuixa guanyen un punt cadascun. Si la paraula és massa difícil, es pot passar a una altra.',
    'Quan s\'acaba el temps o algú l\'encerta, passa el mòbil al següent. Guanya qui té més punts al final.',
  ],

  mount(root, { goHome }) {
    const saved = getPlayers();
    const state = {
      names: saved.length ? saved.slice(0, 12) : ['', '', ''],
      categoryIds: (getRecord('dibuixa:cats') || DRAWABLE).filter(id => DRAWABLE.includes(id)),
      secs: [60, 90, 120].includes(getRecord('dibuixa:secs')) ? getRecord('dibuixa:secs') : 90,
      rounds: [1, 2, 3].includes(getRecord('dibuixa:rounds')) ? getRecord('dibuixa:rounds') : 1,
    };
    while (state.names.length < 3) state.names.push('');
    let game = null, timer = null;

    const bagKey = () => 'dibuixa:' + state.categoryIds.slice().sort().join(',');
    const pool = () => {
      const seen = new Set(), out = [];
      CATEGORIES.filter(c => state.categoryIds.includes(c.id)).forEach(c => c.words.forEach(w => {
        const k = w.word.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(w.word); }
      }));
      return out;
    };
    const nextWord = () => drawFromBag(bagKey(), pool);

    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function leave() { stop(); goHome(); }

    // ---------- 1) preparació ----------
    const filled = () => state.names.every(n => n && n.trim());
    function screenSetup() {
      stop();
      root.innerHTML = `
        <button class="back" id="back">${t('nav.home')}</button>
        <p class="kicker">${t('game.dibuixa.title')}</p>
        <h2 style="font-size:30px;margin:6px 0 18px">${D('setupTitle')}</h2>
        <p class="label" style="margin:0 0 12px">${t('common.players')}</p>
        <div class="stack" id="names" style="--stack-gap:8px"></div>
        <button class="btn btn--outline" id="addp" style="margin-top:12px">${t('common.addPlayer')}</button>
        <p class="label" style="margin:22px 0 12px">${t('common.categories')}</p>
        <button class="btn btn--outline" id="cats">${categoriesLabel(state.categoryIds, DRAWABLE)}</button>
        <p class="label" style="margin:22px 0 12px">${D('time')}</p>
        <div class="btn-row">${[60, 90, 120].map(s => `<button class="btn ${state.secs === s ? 'btn--accent' : 'btn--outline'}" data-secs="${s}">${s} s</button>`).join('')}</div>
        <p class="label" style="margin:22px 0 12px">${D('rounds')}</p>
        <div class="btn-row">${[1, 2, 3].map(r => `<button class="btn ${state.rounds === r ? 'btn--accent' : 'btn--outline'}" data-rounds="${r}">${r}</button>`).join('')}</div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" style="margin-top:24px">${t('common.lets')}</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700"></p>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelector('#addp').onclick = () => { state.names.push(''); renderNames(); };
      root.querySelector('#cats').onclick = () => openCategoryScreen(root, { categoryIds: state.categoryIds, kicker: t('game.dibuixa.title'), onBack: () => { setRecord('dibuixa:cats', state.categoryIds); screenSetup(); }, allowedIds: DRAWABLE });
      root.querySelectorAll('[data-secs]').forEach(b => { b.onclick = () => { state.secs = +b.dataset.secs; setRecord('dibuixa:secs', state.secs); screenSetup(); }; });
      root.querySelectorAll('[data-rounds]').forEach(b => { b.onclick = () => { state.rounds = +b.dataset.rounds; setRecord('dibuixa:rounds', state.rounds); screenSetup(); }; });
      root.querySelector('#go').onclick = () => { if (canGo()) start(); };
      renderNames();
    }
    const canGo = () => state.names.length >= 2 && filled() && state.categoryIds.length > 0;
    function updateGo() {
      const go = root.querySelector('#go'), warn = root.querySelector('#warn'), add = root.querySelector('#addp');
      if (go) go.disabled = !canGo();
      if (add) add.disabled = state.names.length >= 12 || !filled();
      if (warn) warn.textContent = !filled() ? t('common.fillAllNames') : !state.categoryIds.length ? t('common.pickCategory') : '';
    }
    function renderNames() {
      const box = root.querySelector('#names');
      const canDelete = state.names.length > 2;
      box.innerHTML = state.names.map((nm, i) => `
        <div class="name-row">
          <input class="input" type="text" autocomplete="off" maxlength="16" aria-label="${t('common.playerN', { n: i + 1 })}" placeholder="${t('common.namePlaceholder')}" value="${esc(nm || '')}" data-i="${i}">
          ${canDelete ? `<button class="name-del" data-del="${i}" aria-label="${t('common.removeAria')}">×</button>` : ''}
        </div>`).join('');
      box.querySelectorAll('input').forEach(el => { el.oninput = () => { state.names[+el.dataset.i] = el.value; setPlayers(state.names); updateGo(); }; });
      box.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => { state.names.splice(+b.dataset.del, 1); setPlayers(state.names); renderNames(); }; });
      updateGo();
    }

    // ---------- 2) torns ----------
    function start() {
      const names = state.names.map(s => s.trim());
      setPlayers(names);
      game = { names, score: names.map(() => 0), turn: 0, total: names.length * state.rounds };
      handoff();
    }
    const drawerIdx = () => game.turn % game.names.length;

    // passa el mòbil: targeta gran amb el nom; en tocar-la es veu la paraula
    function handoff() {
      stop();
      const name = game.names[drawerIdx()];
      let word = nextWord(), shown = false;
      root.innerHTML = `
        <div class="chess-top"><button class="back" id="quit">${t('nav.setup')}</button><p class="kicker" style="margin:0 0 18px">${D('turnN', { n: game.turn + 1, total: game.total })}</p></div>
        <p class="muted center" style="margin:0 0 10px">${t('common.passMobileTo')}</p>
        <div class="reveal-card tap-hint dx-card" id="card" role="button" tabindex="0"></div>
        <div class="spacer"></div>
        <div id="nextWrap" style="margin-top:18px"></div>`;
      const card = root.querySelector('#card');
      const cover = () => { card.className = 'reveal-card tap-hint dx-card'; card.innerHTML = `<div class="word">${esc(name)}</div><div class="who">${D('tapWord')}</div>`; };
      const reveal = () => {
        card.className = 'reveal-card dx-card';
        card.innerHTML = `<div class="who">${D('drawThis')}</div><div class="word">${esc(word)}</div><div class="who">${D('onlyYou')}</div>`;
        root.querySelector('#nextWrap').innerHTML = `<div class="stack" style="--stack-gap:10px">
          <button class="btn btn--accent" id="draw">${D('start')}</button>
          <button class="btn btn--outline" id="other">${D('otherWord')}</button></div>`;
        root.querySelector('#draw').onclick = () => drawScreen(word);
        root.querySelector('#other').onclick = () => { word = nextWord(); reveal(); };
      };
      card.onclick = () => { shown = !shown; shown ? reveal() : cover(); };
      card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.onclick(); } };
      root.querySelector('#quit').onclick = screenSetup;
      cover();
    }

    // ---------- 3) dibuixar ----------
    function drawScreen(word) {
      let left = state.secs;
      root.innerHTML = `
        <div class="dx-top">
          <span class="dx-time" id="time">${left}</span>
          <button class="dx-peek" id="peek" type="button">👁 ${D('holdWord')}</button>
        </div>
        <div class="dx-board" id="board"><canvas id="cv" aria-label="${D('canvas')}"></canvas></div>
        <div class="dx-tools">
          ${COLORS.map((c, i) => `<button class="dx-color${i === 0 ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="${D('color')} ${i + 1}"></button>`).join('')}
          <button class="dx-tool" id="thick" aria-label="${D('thick')}">●</button>
          <button class="dx-tool" id="undo" aria-label="${D('undo')}">↶</button>
          <button class="dx-tool" id="clear" aria-label="${D('clear')}">🗑</button>
        </div>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn btn--accent" id="got">${D('guessed')}</button>
          <button class="btn btn--outline" id="pass">${D('pass')}</button>
        </div>`;
      const cv = root.querySelector('#cv'), ctx = cv.getContext('2d');
      let strokes = [], cur = null, color = COLORS[0], width = 6;
      const fit = () => {
        const w = cv.parentElement.clientWidth, h = cv.parentElement.clientHeight, dpr = window.devicePixelRatio || 1;
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
        redraw();
      };
      const redraw = () => {
        const k = cv.width / 1000; // coordenades en una amplada de 1000 (no depèn de la mida)
        ctx.fillStyle = '#FFFDF8'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const s of strokes) {
          ctx.strokeStyle = s.c; ctx.lineWidth = s.w * k * 2.5;
          ctx.beginPath(); s.p.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
          if (s.p.length === 1) ctx.lineTo(s.p[0][0] * k + 0.1, s.p[0][1] * k);
          ctx.stroke();
        }
      };
      const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 1000, (e.clientY - r.top) / r.width * 1000]; };
      cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cur = { c: color, w: width, p: [pos(e)] }; strokes.push(cur); redraw(); });
      cv.addEventListener('pointermove', (e) => { if (!cur) return; cur.p.push(pos(e)); redraw(); });
      const end = () => { cur = null; };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', end);
      root.querySelectorAll('.dx-color').forEach(b => { b.onclick = () => { color = b.dataset.c; root.querySelectorAll('.dx-color').forEach(x => x.classList.toggle('on', x === b)); }; });
      const thick = root.querySelector('#thick');
      thick.onclick = () => { width = width === 6 ? 14 : width === 14 ? 3 : 6; thick.style.fontSize = width === 14 ? '26px' : width === 3 ? '10px' : '17px'; };
      root.querySelector('#undo').onclick = () => { strokes.pop(); redraw(); };
      root.querySelector('#clear').onclick = () => { strokes = []; redraw(); };
      // la paraula, només mentre es manté premut (que no la vegin els altres)
      const peek = root.querySelector('#peek');
      const show = (e) => { e.preventDefault(); peek.textContent = word; peek.classList.add('on'); };
      const hide = () => { peek.textContent = `👁 ${D('holdWord')}`; peek.classList.remove('on'); };
      peek.addEventListener('pointerdown', show); peek.addEventListener('pointerup', hide); peek.addEventListener('pointerleave', hide); peek.addEventListener('pointercancel', hide);
      root.querySelector('#got').onclick = () => { stop(); whoGuessed(word); };
      root.querySelector('#pass').onclick = () => { word = nextWord(); strokes = []; redraw(); hide(); };
      fit();
      window.addEventListener('resize', fit, { once: true });
      stop();
      timer = setInterval(() => {
        if (!root.isConnected) { stop(); return; }
        left--;
        const el = root.querySelector('#time');
        if (el) { el.textContent = left; el.classList.toggle('dx-hurry', left <= 10); }
        if (left <= 0) { stop(); if (navigator.vibrate) navigator.vibrate(200); result(null, word); }
      }, 1000);
    }

    // ---------- 4) qui l'ha endevinada ----------
    function whoGuessed(word) {
      const d = drawerIdx();
      root.innerHTML = `
        <p class="kicker center">${esc(word)}</p>
        <h2 class="center" style="font-size:26px;margin:8px 0 16px">${D('whoGuessed')}</h2>
        <div class="ll-pick">${game.names.map((n, i) => (i === d ? '' : `<button class="btn btn--outline" data-g="${i}">${esc(n)}</button>`)).join('')}</div>
        <div class="spacer"></div>
        <button class="btn btn--outline" id="none">${D('nobody')}</button>`;
      root.querySelectorAll('[data-g]').forEach(b => { b.onclick = () => result(+b.dataset.g, word); });
      root.querySelector('#none').onclick = () => result(null, word);
    }
    function result(guesser, word) {
      stop();
      const d = drawerIdx();
      if (guesser !== null) { game.score[guesser]++; game.score[d]++; }
      game.turn++;
      const last = game.turn >= game.total;
      root.innerHTML = `
        <p class="kicker center">${guesser === null ? D('timeUp') : D('point')}</p>
        <h2 class="center" style="font-size:28px;margin:8px 0 6px">${D('wasWord', { word: esc(word) })}</h2>
        <p class="muted center">${guesser === null ? D('noPoints') : D('bothScore', { a: esc(game.names[guesser]), b: esc(game.names[d]) })}</p>
        <div class="stack dx-scores" style="--stack-gap:6px;margin-top:18px">
          ${game.names.map((n, i) => ({ n, s: game.score[i] })).sort((a, b) => b.s - a.s).map(x => `<div class="ll-row"><span>${esc(x.n)}</span><b>${x.s}</b></div>`).join('')}
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="next" style="margin-top:18px">${last ? t('common.results') : D('nextTurn')}</button>`;
      root.querySelector('#next').onclick = () => (last ? finish() : handoff());
    }

    // ---------- 5) final ----------
    function finish() {
      const rank = game.names.map((n, i) => ({ n, s: game.score[i] })).sort((a, b) => b.s - a.s);
      const top = rank.filter(x => x.s === rank[0].s);
      root.innerHTML = `
        <p class="kicker center">${t('common.final')}</p>
        <h2 class="center" style="font-size:24px;margin:8px 0 4px">${top.length > 1 ? t('common.tieWinPlural') : t('common.winSingular')}</h2>
        <p class="center" style="font-family:var(--font-display);font-weight:800;font-size:36px;color:var(--accent);margin:4px 0 16px">${top.map(x => esc(x.n)).join(' · ')}</p>
        <div class="stack" style="--stack-gap:6px">${rank.map(x => `<div class="ll-row"><span>${esc(x.n)}</span><b>${x.s}</b></div>`).join('')}</div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:18px;--stack-gap:12px">
          <button class="btn btn--accent" id="again">${t('common.anotherGame')}</button>
          <button class="btn btn--outline" id="home">${t('common.backHome')}</button>
        </div>`;
      root.querySelector('#again').onclick = start;
      root.querySelector('#home').onclick = leave;
    }

    screenSetup();
  },
};
