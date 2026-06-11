// ============================================================
// L'impostor — joc complet (un sol dispositiu, offline)
//
// Flux: configuració -> repartiment -> debat -> votació -> (continua o final)
// Eliminació: cada votació expulsa un jugador. Si encara queden civils
// suficients i impostors per trobar, la partida continua.
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { openCategoryScreen, categoriesLabel } from './category-select.js';
import { getPlayers, setPlayers } from './store.js';
import { drawFromBag } from './word-bag.js';
import { t, tc, joinAnd } from './i18n.js';

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Construeix la llista completa de paraules de les categories triades,
// sense duplicats (per si una mateixa paraula surt a més d'una categoria).
function buildPool(categoryIds) {
  const seen = new Set();
  const out = [];
  CATEGORIES.filter(c => categoryIds.includes(c.id)).forEach(c => {
    c.words.forEach(w => {
      const k = w.word.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(w); }
    });
  });
  return out;
}

export default {
  id: 'impostor',
  title: "L'impostor",
  tagline: 'Descobreix qui no sap la paraula',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,

  instructions: [
    'Tothom rep la mateixa paraula secreta, menys l\u2019impostor (o els impostors).',
    'Passeu-vos el mòbil: cadascú mira el seu paper en secret i prem "Següent jugador".',
    'Per torns, cadascú diu una paraula relacionada amb la secreta: prou subtil perquè l\u2019impostor no l\u2019endevini, però que demostri que la sap.',
    'Voteu un sospitós. Si no l\u2019heu encertat, queda expulsat i la resta continua jugant fins a enxampar l\u2019impostor.',
  ],

  mount(root, { goHome }) {
    // Carrega els noms recordats; si no n'hi ha cap, comença amb 3 caselles buides.
    const saved = getPlayers();
    const initialNames = (Array.isArray(saved) && saved.length) ? saved.slice(0, 12) : ['', '', ''];
    while (initialNames.length < 3) initialNames.push('');

    const state = {
      names: initialNames,
      impostors: 1,
      categoryIds: [CATEGORIES[0].id],
      hint: false,
      word: null,
      wordHint: null,
      roles: [],
      revealIndex: 0,
      eliminated: new Set(),
      timerSec: 180,
    };

    const count = () => state.names.length;
    const getName = (i) => (state.names[i] && state.names[i].trim()) || t('common.playerN', { n: i + 1 });
    const maxImpostors = () => Math.max(1, count() - 2);
    const allFilled = () => state.names.every((n) => (n || '').trim() !== '');
    const save = () => setPlayers(state.names);

    function readNames() {
      for (let i = 0; i < count(); i++) {
        const el = root.querySelector('#name-' + i);
        if (el) state.names[i] = el.value;
      }
    }

    function clampImpostors() {
      state.impostors = Math.min(Math.max(1, state.impostors), maxImpostors());
      const v = root.querySelector('#vimp');
      if (v) v.textContent = state.impostors;
    }

    // ---------- configuració ----------
    function screenSetup() {
      root.innerHTML = `
        <button class="back" id="back">${t('nav.home')}</button>
        <p class="kicker">${t('game.impostor.title')}</p>
        <h2 style="font-size:30px;margin:6px 0 22px">${t('impostor.setupTitle')}</h2>

        <div class="panel">
          <p class="label">${t('impostor.count')}</p>
          <div class="stepper" style="margin-top:10px">
            <button id="imp-dec">–</button>
            <span class="val" id="vimp">${state.impostors}</span>
            <button id="imp-inc">+</button>
          </div>
          <div class="switch-row" style="margin-top:22px">
            <span class="switch-label">${t('impostor.hintSwitch')}</span>
            <button class="switch" id="hint" role="switch" aria-checked="${state.hint}" aria-label="${t('impostor.hintSwitch')}"></button>
          </div>
        </div>

        <p class="label" style="margin:24px 0 12px">${t('common.categories')}</p>
        <button class="btn btn--outline" id="cats">${categoriesLabel(state.categoryIds)}</button>

        <p class="label" style="margin:24px 0 12px">${t('common.players')}</p>
        <div class="stack" id="names" style="--stack-gap:10px"></div>
        <button class="btn btn--outline" id="addp" style="margin-top:12px">${t('common.addPlayer')}</button>

        <button class="btn btn--accent" id="start" style="margin-top:28px">${t('common.start')}</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700;display:none">${t('common.fillAllNames')}</p>
      `;

      root.querySelector('#back').onclick = goHome;
      root.querySelector('#imp-dec').onclick = () => { state.impostors--; clampImpostors(); };
      root.querySelector('#imp-inc').onclick = () => { state.impostors++; clampImpostors(); };

      const hintSw = root.querySelector('#hint');
      hintSw.onclick = () => {
        state.hint = !state.hint;
        hintSw.setAttribute('aria-checked', String(state.hint));
      };

      root.querySelector('#cats').onclick = () => {
        readNames();
        openCategoryScreen(root, { categoryIds: state.categoryIds, kicker: t('game.impostor.title'), onBack: screenSetup });
      };

      root.querySelector('#addp').onclick = () => {
        readNames();
        if (count() >= 12 || !allFilled()) return;
        state.names.push('');
        save();
        clampImpostors();
        renderNames();
        const last = root.querySelector('#name-' + (count() - 1));
        if (last) last.focus();
      };

      root.querySelector('#start').onclick = () => {
        readNames();
        if (!allFilled()) { updateButtons(); return; }
        save();
        beginRound();
      };

      renderNames();
    }

    function updateButtons() {
      const filled = allFilled();
      const add = root.querySelector('#addp');
      const start = root.querySelector('#start');
      const warn = root.querySelector('#warn');
      if (add) add.disabled = count() >= 12 || !filled;
      if (start) start.disabled = !filled;
      if (warn) warn.style.display = filled ? 'none' : 'block';
    }

    function renderNames() {
      const box = root.querySelector('#names');
      const canDelete = count() > 3;
      box.innerHTML = state.names.map((nm, i) => `
        <div class="name-row">
          <input class="input" id="name-${i}" type="text" maxlength="16" placeholder="${t('common.namePlaceholder')}" value="${(nm || '').replace(/"/g, '&quot;')}">
          ${canDelete ? `<button class="name-del" data-del="${i}" aria-label="${t('common.removeAria')}">×</button>` : ''}
        </div>
      `).join('');
      box.querySelectorAll('[data-del]').forEach(b => {
        b.onclick = () => {
          readNames();
          state.names.splice(parseInt(b.dataset.del, 10), 1);
          save();
          clampImpostors();
          renderNames();
        };
      });
      box.querySelectorAll('input.input').forEach((el, i) => {
        el.oninput = () => {
          state.names[i] = el.value;
          save();
          updateButtons();
        };
      });
      updateButtons();
    }

    // Tria la paraula d'una bossa barrejada i persistent (word-bag.js):
    // no repeteix cap paraula fins esgotar la bossa de les categories
    // triades, i la bossa es manté durant tota la sessió.
    function drawWord() {
      const key = 'impostor:' + state.categoryIds.slice().sort().join(',');
      const pick = drawFromBag(key, () => buildPool(state.categoryIds));
      state.word = pick.word;
      state.wordHint = pick.hint;
    }

    // ---------- prepara la ronda ----------
    function beginRound() {
      drawWord();
      const idx = shuffle([...Array(count()).keys()]).slice(0, state.impostors);
      state.roles = Array.from({ length: count() }, (_, i) => idx.includes(i));
      state.revealIndex = 0;
      state.eliminated = new Set();
      screenPass();
    }

    // ---------- repartiment: passa el mòbil ----------
    function screenPass() {
      const name = getName(state.revealIndex);
      root.innerHTML = `
        <p class="kicker">${t('impostor.passKicker')}</p>
        <h2 style="font-size:26px;margin:6px 0 18px">${t('common.passMobileTo')}<br>${name}</h2>
        <div class="reveal-card tap-hint" id="card">
          <div class="word" style="font-size:28px">${t('impostor.tapSeeRole')}</div>
        </div>
        <div class="spacer"></div>
        <div id="nextWrap" style="margin-top:18px"></div>
      `;

      let revealed = false, hasRevealed = false;
      const card = root.querySelector('#card');
      const nextWrap = root.querySelector('#nextWrap');
      const isLast = state.revealIndex >= count() - 1;

      const showRole = () => {
        const isImp = state.roles[state.revealIndex];
        card.classList.remove('tap-hint');
        const impHint = state.hint
          ? `<div class="who">${t('impostor.hintPrefix', { hint: state.wordHint })}</div>`
          : '';
        card.innerHTML = isImp
          ? `<div class="word">${t('impostor.youAre')}</div><div class="who">${t('impostor.impostorSub')}</div>${impHint}`
          : `<div class="word">${state.word}</div><div class="who">${t('impostor.memorize')}</div>`;
      };
      const cover = () => {
        card.classList.add('tap-hint');
        card.innerHTML = `<div class="word" style="font-size:28px">${t('impostor.tapAgain')}</div>`;
      };

      card.onclick = () => {
        revealed = !revealed;
        if (revealed) {
          showRole();
          if (!hasRevealed) {
            hasRevealed = true;
            nextWrap.innerHTML = `<button class="btn btn--accent" id="next">${isLast ? t('impostor.toDebate') : t('impostor.nextPlayer')}</button>`;
            root.querySelector('#next').onclick = () => {
              state.revealIndex++;
              if (state.revealIndex >= count()) screenDebate();
              else screenPass();
            };
          }
        } else {
          cover();
        }
      };
    }

    // ---------- debat ----------
    function screenDebate() {
      let remaining = state.timerSec;
      let running = true;
      const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

      root.innerHTML = `
        <p class="kicker">${t('impostor.debateKicker')}</p>
        <h2 style="font-size:26px;margin:6px 0 8px">${t('impostor.debateTitle')}</h2>
        <div class="spacer"></div>
        <div class="big-timer" id="timer">${fmt(remaining)}</div>
        <div class="spacer"></div>
        <div class="btn-row" style="margin-top:18px">
          <button class="btn btn--outline" id="pause">${t('common.pause')}</button>
          <button class="btn btn--accent" id="vote">${t('impostor.toVote')}</button>
        </div>
      `;

      const tEl = root.querySelector('#timer');
      const interval = setInterval(() => {
        if (!running) return;
        remaining--;
        tEl.textContent = fmt(Math.max(0, remaining));
        if (remaining <= 0) { clearInterval(interval); running = false; tEl.textContent = t('impostor.timeUp'); }
      }, 1000);

      root.querySelector('#pause').onclick = (e) => {
        running = !running;
        e.target.textContent = running ? t('common.pause') : t('common.resume');
      };
      root.querySelector('#vote').onclick = () => { clearInterval(interval); screenVote(); };
    }

    // ---------- votació ----------
    function screenVote() {
      const alive = [...Array(count()).keys()].filter(i => !state.eliminated.has(i));
      const buttons = alive.map(i => `<button class="btn btn--outline" data-vote="${i}">${getName(i)}</button>`).join('');
      root.innerHTML = `
        <button class="back" id="back">${t('nav.debate')}</button>
        <p class="kicker">${t('impostor.voteKicker')}</p>
        <h2 style="font-size:28px;margin:6px 0 6px">${t('impostor.voteTitle')}</h2>
        <p class="muted" style="margin-bottom:18px">${t('impostor.voteSub')}</p>
        <div class="stack" style="--stack-gap:10px">${buttons}</div>
      `;
      root.querySelector('#back').onclick = screenDebate;
      root.querySelectorAll('[data-vote]').forEach(b => {
        b.onclick = () => resolveVote(parseInt(b.dataset.vote, 10));
      });
    }

    // ---------- resol la votació ----------
    function resolveVote(accused) {
      state.eliminated.add(accused);
      const alive = [...Array(count()).keys()].filter(i => !state.eliminated.has(i));
      const impostorsLeft = alive.filter(i => state.roles[i]).length;
      const civiliansLeft = alive.length - impostorsLeft;
      const caught = state.roles[accused];

      if (impostorsLeft === 0) return screenEnd('win');
      if (civiliansLeft <= impostorsLeft) return screenEnd('lose');
      return screenContinue(accused, caught, impostorsLeft);
    }

    // ---------- continua (queden jugadors) ----------
    function screenContinue(accused, caught, impostorsLeft) {
      root.innerHTML = `
        <p class="kicker">${t('impostor.expelled')}</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:32px;color:var(--accent)">${getName(accused)}</h2>
          <p class="muted">${caught
            ? (impostorsLeft > 1 ? t('impostor.caughtMore', { n: impostorsLeft }) : t('impostor.caughtOne'))
            : t('impostor.notImpostor')}</p>
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="cont" style="margin-top:24px">${t('common.continue')}</button>
      `;
      root.querySelector('#cont').onclick = screenDebate;
    }

    // ---------- final ----------
    function screenEnd(outcome) {
      const impostorNames = state.roles.map((v, i) => (v ? getName(i) : null)).filter(Boolean);
      const plural = impostorNames.length > 1;
      root.innerHTML = `
        <p class="kicker">${t('common.final')}</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:34px;color:var(--accent)">${outcome === 'win' ? t('impostor.youWin') : t('impostor.impostorWins')}</h2>
          <hr style="border:none;border-top:2px solid var(--line);width:100%">
          <p class="muted">${plural ? t('impostor.impostorsWere') : t('impostor.impostorWas')}</p>
          <h2 style="font-size:30px">${joinAnd(impostorNames)}</h2>
          <p class="muted">${t('impostor.secretWordWas')}</p>
          <h2 style="font-size:30px">${state.word}</h2>
        </div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:24px">
          <button class="btn btn--accent" id="again">${t('common.anotherRound')}</button>
          <button class="btn btn--outline" id="home">${t('common.backHome')}</button>
        </div>
      `;
      root.querySelector('#again').onclick = beginRound;
      root.querySelector('#home').onclick = goHome;
    }

    screenSetup();
  },
};
