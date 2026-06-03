// ============================================================
// L'impostor — joc complet (un sol dispositiu, offline)
//
// Flux: configuració -> repartiment -> debat -> votació -> (continua o final)
// Eliminació: cada votació expulsa un jugador. Si encara queden civils
// suficients i impostors per trobar, la partida continua.
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { CATEGORY_ICONS } from './category-icons.js';
import { getPlayers, setPlayers } from './store.js';

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
    const getName = (i) => (state.names[i] && state.names[i].trim()) || `Jugador ${i + 1}`;
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
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker">L'impostor</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepareu la ronda</h2>

        <div class="panel">
          <p class="label">Impostors</p>
          <div class="stepper" style="margin-top:10px">
            <button id="imp-dec">–</button>
            <span class="val" id="vimp">${state.impostors}</span>
            <button id="imp-inc">+</button>
          </div>
          <div class="switch-row" style="margin-top:22px">
            <span class="switch-label">Pista per a l'impostor</span>
            <button class="switch" id="hint" role="switch" aria-checked="${state.hint}" aria-label="Pista per a l'impostor"></button>
          </div>
        </div>

        <p class="label" style="margin:24px 0 12px">Categories</p>
        <button class="btn btn--outline" id="cats">Categories (${state.categoryIds.length})</button>

        <p class="label" style="margin:24px 0 12px">Jugadors</p>
        <div class="stack" id="names" style="--stack-gap:10px"></div>
        <button class="btn btn--outline" id="addp" style="margin-top:12px">+ Afegeix jugador</button>

        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700;display:none">Cal omplir el nom de tots els jugadors</p>
      `;

      root.querySelector('#back').onclick = goHome;
      root.querySelector('#imp-dec').onclick = () => { state.impostors--; clampImpostors(); };
      root.querySelector('#imp-inc').onclick = () => { state.impostors++; clampImpostors(); };

      const hintSw = root.querySelector('#hint');
      hintSw.onclick = () => {
        state.hint = !state.hint;
        hintSw.setAttribute('aria-checked', String(state.hint));
      };

      root.querySelector('#cats').onclick = () => { readNames(); screenCategories(); };

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

    // ---------- pantalla de categories ----------
    function screenCategories() {
      root.innerHTML = `
        <button class="back" id="back">‹ Configuració</button>
        <p class="kicker">L'impostor</p>
        <h2 style="font-size:30px;margin:6px 0 8px">Categories</h2>
        <p class="muted" style="margin-bottom:18px">Tria'n les que vulguis (mínim 1).</p>
        <div class="cat-grid" id="catgrid">
          ${CATEGORIES.map(c => `
            <button class="cat-tile ${state.categoryIds.includes(c.id) ? 'on' : ''}" data-cat="${c.id}">
              <span class="cat-tile__icon">${CATEGORY_ICONS[c.id] || ''}</span>
              <span class="cat-tile__name">${c.name}</span>
            </button>`).join('')}
        </div>
      `;

      root.querySelector('#back').onclick = screenSetup;
      root.querySelectorAll('[data-cat]').forEach(b => {
        b.onclick = () => {
          const id = b.dataset.cat;
          const i = state.categoryIds.indexOf(id);
          if (i >= 0) {
            // mínim 1: si és l'última seleccionada, no la desactivis
            if (state.categoryIds.length > 1) {
              state.categoryIds.splice(i, 1);
              b.classList.remove('on');
            }
          } else {
            state.categoryIds.push(id);
            b.classList.add('on');
          }
        };
      });
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
          <input class="input" id="name-${i}" type="text" maxlength="16" placeholder="Nom" value="${(nm || '').replace(/"/g, '&quot;')}">
          ${canDelete ? `<button class="name-del" data-del="${i}" aria-label="Treu">×</button>` : ''}
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

    // ---------- prepara la ronda ----------
    function beginRound() {
      const pool = CATEGORIES
        .filter(c => state.categoryIds.includes(c.id))
        .flatMap(c => c.words);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      state.word = pick.word;
      state.wordHint = pick.hint;
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
        <p class="kicker">Repartiment</p>
        <h2 style="font-size:26px;margin:6px 0 18px">Passa el mòbil a<br>${name}</h2>
        <div class="reveal-card tap-hint" id="card">
          <div class="word" style="font-size:28px">Toca per veure<br>el teu paper</div>
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
          ? `<div class="who">Pista: ${state.wordHint}</div>`
          : '';
        card.innerHTML = isImp
          ? `<div class="word">Ets l'impostor</div><div class="who">Dissimula i fes veure que saps la paraula!</div>${impHint}`
          : `<div class="word">${state.word}</div><div class="who">Memoritza-la i no la diguis</div>`;
      };
      const cover = () => {
        card.classList.add('tap-hint');
        card.innerHTML = `<div class="word" style="font-size:28px">Torna a tocar<br>per veure-ho</div>`;
      };

      card.onclick = () => {
        revealed = !revealed;
        if (revealed) {
          showRole();
          if (!hasRevealed) {
            hasRevealed = true;
            nextWrap.innerHTML = `<button class="btn btn--accent" id="next">${isLast ? 'A debatre!' : 'Següent jugador'}</button>`;
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
        <p class="kicker">Debat</p>
        <h2 style="font-size:26px;margin:6px 0 8px">Per torns, una pista</h2>
        <div class="spacer"></div>
        <div class="big-timer" id="timer">${fmt(remaining)}</div>
        <div class="spacer"></div>
        <div class="btn-row" style="margin-top:18px">
          <button class="btn btn--outline" id="pause">Pausa</button>
          <button class="btn btn--accent" id="vote">A votar!</button>
        </div>
      `;

      const tEl = root.querySelector('#timer');
      const interval = setInterval(() => {
        if (!running) return;
        remaining--;
        tEl.textContent = fmt(Math.max(0, remaining));
        if (remaining <= 0) { clearInterval(interval); running = false; tEl.textContent = 'Temps!'; }
      }, 1000);

      root.querySelector('#pause').onclick = (e) => {
        running = !running;
        e.target.textContent = running ? 'Pausa' : 'Continua';
      };
      root.querySelector('#vote').onclick = () => { clearInterval(interval); screenVote(); };
    }

    // ---------- votació ----------
    function screenVote() {
      const alive = [...Array(count()).keys()].filter(i => !state.eliminated.has(i));
      const buttons = alive.map(i => `<button class="btn btn--outline" data-vote="${i}">${getName(i)}</button>`).join('');
      root.innerHTML = `
        <button class="back" id="back">‹ Tornar al debat</button>
        <p class="kicker">Votació</p>
        <h2 style="font-size:28px;margin:6px 0 6px">Qui és l'impostor?</h2>
        <p class="muted" style="margin-bottom:18px">Decidiu en grup i toqueu el sospitós.</p>
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
        <p class="kicker">Expulsat</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:32px;color:var(--accent)">${getName(accused)}</h2>
          <p class="muted">${caught
            ? `Era un impostor! ${impostorsLeft > 1 ? 'Però encara en queden ' + impostorsLeft : 'Encara en queda 1'}.`
            : 'No era l\'impostor. La resta continua jugant.'}</p>
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="cont" style="margin-top:24px">Continua</button>
      `;
      root.querySelector('#cont').onclick = screenDebate;
    }

    // ---------- final ----------
    function screenEnd(outcome) {
      const impostorNames = state.roles.map((v, i) => (v ? getName(i) : null)).filter(Boolean);
      const plural = impostorNames.length > 1;
      root.innerHTML = `
        <p class="kicker">Final</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:34px;color:var(--accent)">${outcome === 'win' ? 'Heu guanyat!' : "L'impostor us ha guanyat"}</h2>
          <hr style="border:none;border-top:2px solid var(--line);width:100%">
          <p class="muted">${plural ? 'Els impostors eren' : "L'impostor era"}</p>
          <h2 style="font-size:30px">${impostorNames.join(' i ')}</h2>
          <p class="muted">La paraula secreta era</p>
          <h2 style="font-size:30px">${state.word}</h2>
        </div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:24px">
          <button class="btn btn--accent" id="again">Una altra ronda</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      root.querySelector('#again').onclick = beginRound;
      root.querySelector('#home').onclick = goHome;
    }

    screenSetup();
  },
};
