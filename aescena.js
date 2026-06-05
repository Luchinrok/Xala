// ============================================================
// A escena! — actuar i endevinar amb un gir
//
// A cada torn surt una paraula (animal, acció o objecte) i un MODE:
// MÍMICA o SO. Qui actua l'ha de representar NOMÉS amb gestos o NOMÉS
// amb sons, i la resta ho endevina.
//
// Flux: configuració -> passa el mòbil -> revelació secreta (mode +
//       paraula) -> actuació (mode visible, paraula oculta) -> següent.
// Reaprofita les paraules de l'impostor (CATEGORIES).
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';

// Tipus de paraula i de quines categories surten.
const TYPES = [
  { key: 'animals', label: 'Animal', name: 'Animals', cats: ['animals'] },
  { key: 'accions', label: 'Acció', name: 'Accions', cats: ['accions'] },
  { key: 'objectes', label: 'Objecte', name: 'Objectes', cats: ['casa', 'eines', 'tecnologia', 'roba', 'transport', 'menjar'] },
];

const wordsOf = (id) => {
  const c = CATEGORIES.find(x => x.id === id);
  return c ? c.words.map(w => w.word) : [];
};

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default {
  id: 'aescena',
  title: 'A escena!',
  tagline: 'Fes mímica o so i que ho endevinin',
  accent: '#E4572E',
  color: '#F4E8D2',
  ready: true,

  instructions: [
    'A cada torn surt una paraula i un mode a l’atzar: MÍMICA o SO.',
    'Passa el mòbil a qui actua; la paraula només la veu ell.',
    'Representa-la NOMÉS amb gestos o NOMÉS amb sons, sense parlar.',
    'La resta ho endevina: "Encertat!" suma un punt i "Passa" en treu una de nova.',
  ],

  mount(root, { goHome }) {
    const state = {
      enabled: { animals: true, accions: true, objectes: true },
      bag: [],
      bagKey: null,
      word: null,
      typeLabel: null,
      mode: null,
      score: 0,
    };

    const enabledKeys = () => Object.keys(state.enabled).filter(k => state.enabled[k]);

    // ---------- bossa de paraules (sense repetir) ----------
    function buildBag() {
      const seen = new Set();
      const pool = [];
      TYPES.forEach(t => {
        if (!state.enabled[t.key]) return;
        t.cats.forEach(cid => wordsOf(cid).forEach(w => {
          const k = w.toLowerCase();
          if (!seen.has(k)) { seen.add(k); pool.push({ word: w, type: t.label }); }
        }));
      });
      return shuffle(pool);
    }

    function drawTurn() {
      const key = enabledKeys().sort().join(',');
      if (state.bagKey !== key || state.bag.length === 0) {
        state.bag = buildBag();
        state.bagKey = key;
      }
      const pick = state.bag.pop();
      state.word = pick.word;
      state.typeLabel = pick.type;
      state.mode = Math.random() < 0.5 ? 'MÍMICA' : 'SO';
    }

    function startTurn() {
      drawTurn();
      screenPass();
    }

    // ---------- 1) configuració ----------
    function screenSetup() {
      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker">A escena!</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>

        <div class="panel">
          <p class="label">Què pot sortir?</p>
          ${TYPES.map(t => `
            <div class="switch-row" style="margin-top:18px">
              <span class="switch-label">${t.name}</span>
              <button class="switch" data-type="${t.key}" role="switch" aria-checked="${state.enabled[t.key]}" aria-label="${t.name}"></button>
            </div>`).join('')}
        </div>
        <p class="muted" style="margin-top:12px">A cada torn, mímica o so a l'atzar.</p>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = goHome;

      root.querySelectorAll('[data-type]').forEach(b => {
        b.onclick = () => {
          const key = b.dataset.type;
          // mínim 1: no permetis desactivar l'últim actiu
          if (state.enabled[key] && enabledKeys().length === 1) return;
          state.enabled[key] = !state.enabled[key];
          b.setAttribute('aria-checked', String(state.enabled[key]));
        };
      });

      root.querySelector('#go').onclick = () => { state.score = 0; startTurn(); };
    }

    // ---------- 2) passa el mòbil ----------
    function screenPass() {
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker">Torn nou</p>
        <h2 style="font-size:26px;margin:6px 0 18px">Passa el mòbil<br>a qui actua</h2>
        <div class="reveal-card tap-hint" id="card">
          <div class="word" style="font-size:28px">Toca per veure<br>la paraula</div>
        </div>
        <div class="spacer"></div>
        <p class="muted center">Que la resta no la vegi!</p>
      `;
      root.querySelector('#home').onclick = goHome;
      root.querySelector('#card').onclick = screenReveal;
    }

    // ---------- 3) revelació secreta (només qui actua) ----------
    function screenReveal() {
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker center">Només qui actua</p>
        <div class="ae-mode-wrap"><span class="ae-mode">${state.mode}</span></div>
        <div class="reveal-card" id="card">
          <div class="who">${state.typeLabel}</div>
          <div class="word">${state.word}</div>
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" style="margin-top:18px">Som-hi!</button>
      `;
      root.querySelector('#home').onclick = goHome;
      root.querySelector('#go').onclick = screenAct;
    }

    // ---------- 4) actuació (ho mira tothom) ----------
    function screenAct() {
      const hint = state.mode === 'MÍMICA' ? 'Només gestos, sense parlar!' : 'Només sons, sense paraules!';
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker center">A actuar!</p>
        <div class="ae-mode-big">${state.mode}</div>
        <p class="muted center">${hint}</p>
        <div class="spacer"></div>
        <p class="ae-score center">Encerts: <strong id="score">${state.score}</strong></p>
        <div class="stack" style="margin-top:14px">
          <button class="btn btn--accent" id="ok">Encertat!</button>
          <button class="btn btn--outline" id="pass">Passa</button>
        </div>
      `;
      root.querySelector('#home').onclick = goHome;
      root.querySelector('#ok').onclick = () => { state.score++; startTurn(); };
      root.querySelector('#pass').onclick = () => { startTurn(); };
    }

    screenSetup();
  },
};
