// ============================================================
// Bomba de paraules — patata calenta
//
// Surt un repte i una bomba amb metxa que fa tic-tac. Els jugadors es
// passen el mòbil i cadascú diu una cosa que encaixi amb el repte abans
// de passar-lo. La bomba peta en un temps a l'atzar i amagat: qui la
// tingui a la mà, perd.
//
// Flux: configuració (durada de la metxa) -> ronda (repte + bomba que
//       fa tic-tac accelerat) -> explosió (BOOM! + vibració + so).
// ============================================================

// Rangs de durada de la metxa (segons), triats a l'atzar i ocults.
const RANGES = {
  curt:  [10, 20],
  mitja: [20, 35],
  llarg: [35, 55],
};

// Reptes curts i variats (es trien sense repetir fins esgotar-los).
const CHALLENGES = [
  'Un nom de noi', 'Un nom de noia', 'Un nom d’avi o àvia', 'Un cognom',
  'Un animal de la selva', 'Un animal de granja', 'Un animal marí', 'Un insecte',
  'Un ocell', 'Un rèptil', 'Un animal que salta', 'Un animal molt lent',
  'Un animal molt ràpid', 'Una raça de gos', 'Un animal amb banyes', 'Un peix',
  'Una fruita', 'Una verdura', 'Un menjar dolç', 'Un menjar picant',
  'Un menjar ràpid', 'Un postre', 'Una beguda', 'Una beguda calenta',
  'Un tipus de formatge', 'Un tipus de pa', 'Una salsa', 'Una espècia o condiment',
  'Una cosa que es menja al cine', 'Una cosa que es menja a l’estiu',
  'Una cosa que es beu amb canya', 'Un plat típic', 'Una pizza diferent',
  'Una marca de cotxes', 'Una marca de roba', 'Una marca de mòbils',
  'Una marca d’esport', 'Una marca de menjar', 'Una xarxa social', 'Una app del mòbil',
  'Una cosa de color vermell', 'Una cosa de color blau', 'Una cosa de color groc',
  'Una cosa de color verd', 'Una cosa de color negre', 'Una cosa de color blanc',
  'Una cosa de color rosa', 'Una cosa de color taronja', 'Una cosa de color marró',
  'Una pel·lícula d’acció', 'Una pel·lícula de por', 'Una pel·lícula d’animació',
  'Una sèrie de televisió', 'Un personatge de Disney', 'Un superheroi',
  'Un personatge de dibuixos', 'Un personatge de conte', 'Un dibuix animat',
  'Una cançó famosa', 'Un cantant', 'Un grup de música', 'Un instrument musical',
  'Un futbolista', 'Un equip de futbol', 'Un esport', 'Un esport d’hivern',
  'Una professió', 'Una professió perillosa', 'Una eina', 'Un electrodomèstic',
  'Un mitjà de transport', 'Una cosa que vola', 'Una cosa que té rodes',
  'Una cosa que neda', 'Una cosa que rebota', 'Una cosa que fa soroll',
  'Una cosa que fa llum', 'Una cosa que llueix de nit', 'Una cosa que crema',
  'Una cosa que es fon', 'Una cosa que es congela', 'Una cosa que punxa',
  'Una cosa que pica', 'Una cosa que fa olor', 'Una cosa que fa pessigolles',
  'Una cosa rodona', 'Una cosa quadrada', 'Una cosa transparent', 'Una cosa suau',
  'Una cosa aspra', 'Una cosa que pesa molt', 'Una cosa més alta que tu',
  'Una cosa que cap a la butxaca', 'Una cosa que es trenca fàcil',
  'Una cosa que es plega', 'Una cosa que es pot inflar', 'Una cosa de fusta',
  'Una cosa de metall', 'Una cosa de plàstic', 'Una cosa de vidre', 'Un material',
  'Un país d’Europa', 'Un país d’Àsia', 'Un país d’Amèrica', 'Un país d’Àfrica',
  'Una capital', 'Una ciutat famosa', 'Un riu famós', 'Una muntanya',
  'Un monument famós', 'Un lloc per anar de vacances', 'Una illa',
  'Un color', 'Una flor', 'Un arbre', 'Una cosa que es troba al cel',
  'Una part del cos', 'Una cosa que hi ha al bany', 'Una cosa que hi ha a la cuina',
  'Una cosa que hi ha a l’escola', 'Una cosa que hi ha en un parc',
  'Una cosa que hi ha en un hospital', 'Una cosa que hi ha al cotxe',
  'Una cosa que es porta al cap', 'Una cosa que es porta als peus', 'Un accessori',
  'Un tipus de barret', 'Una joguina', 'Un joc de taula', 'Un videojoc',
  'Un joc d’ordinador', 'Una cosa que fan els nens', 'Un ball',
  'Una cosa que es regala', 'Una cosa que es comparteix', 'Una cosa que mai prestaries',
  'Una cosa que es perd sovint', 'Una cosa que tothom té', 'Una cosa cara',
  'Una cosa barata', 'Una cosa antiga', 'Una cosa moderna', 'Un invent important',
  'Un mes de l’any', 'Un dia de la setmana', 'Una estació de l’any',
  'Una festa o celebració', 'Un menjar d’esmorzar', 'Un dinosaure', 'Un monstre',
  'Una cosa que fa por', 'Una cosa que t’espanta', 'Un personatge històric',
  'Una cosa que es veu al zoo', 'Una cosa que es fa amb les mans',
  'Una cosa que es talla', 'Una cosa que es penja a la paret',
];

import { t } from './i18n.js';

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const BOMB_SVG = `
  <svg class="bomb" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="29" cy="40" r="16"/>
    <path d="M36 28 L40 24 L45 29"/>
    <path d="M43 26 Q53 18 49 8" stroke="var(--accent)"/>
    <path d="M49 8 l-3 -1 M49 8 l1 -3 M49 8 l4 1 M49 8 l-1 4" stroke="var(--accent)"/>
  </svg>`;

export default {
  id: 'bomba',
  title: 'Bomba de paraules',
  tagline: 'Digues, passa i resa que no peti',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Surt un repte (per exemple "un animal de la selva") i una bomba amb metxa.',
    'Per torns, cadascú diu una cosa que hi encaixi i passa el mòbil ràpid.',
    'La bomba fa tic-tac i s’accelera; té un temps amagat i a l’atzar.',
    'Quan peta, qui la tingui a la mà perd la ronda.',
  ],

  mount(root, { goHome }) {
    const state = {
      range: 'mitja',
      deck: shuffle(CHALLENGES),
      deckIndex: 0,
      challenge: '',
    };

    // recursos vius durant una ronda
    let tickTimeout = null;
    let explodeTimeout = null;
    let running = false;
    let bombEl = null;
    let audioCtx = null;

    // ---------- àudio (Web Audio API, opcional) ----------
    function initAudio() {
      if (audioCtx) { try { audioCtx.resume(); } catch (e) {} return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) { audioCtx = new AC(); audioCtx.resume(); }
      } catch (e) { audioCtx = null; }
    }
    function playTick() {
      if (!audioCtx) return;
      try {
        const t = audioCtx.currentTime;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'square';
        o.frequency.value = 1100;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        o.connect(g).connect(audioCtx.destination);
        o.start(t);
        o.stop(t + 0.06);
      } catch (e) {}
    }
    function playExplosion() {
      if (!audioCtx) return;
      try {
        const t = audioCtx.currentTime;
        const dur = 0.8;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(35, t + dur);
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(audioCtx.destination);
        o.start(t);
        o.stop(t + dur);
        // ràfega de soroll
        const n = Math.floor(audioCtx.sampleRate * dur);
        const buffer = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const ng = audioCtx.createGain();
        ng.gain.value = 0.5;
        noise.connect(ng).connect(audioCtx.destination);
        noise.start(t);
      } catch (e) {}
    }

    // ---------- gestió de recursos ----------
    function stopTimers() {
      running = false;
      if (tickTimeout) { clearTimeout(tickTimeout); tickTimeout = null; }
      if (explodeTimeout) { clearTimeout(explodeTimeout); explodeTimeout = null; }
    }
    function leaveGame() {
      stopTimers();
      if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; }
      goHome();
    }

    function drawChallenge() {
      if (state.deckIndex >= state.deck.length) { state.deck = shuffle(CHALLENGES); state.deckIndex = 0; }
      state.challenge = state.deck[state.deckIndex++];
    }

    // ---------- 1) configuració ----------
    function screenSetup() {
      stopTimers();
      const opts = [
        { id: 'curt', label: t('bomba.short') },
        { id: 'mitja', label: t('bomba.medium') },
        { id: 'llarg', label: t('bomba.long') },
      ];
      root.innerHTML = `
        <button class="back" id="back">${t('nav.home')}</button>
        <p class="kicker">${t('game.bomba.title')}</p>
        <h2 style="font-size:30px;margin:6px 0 22px">${t('bomba.setupTitle')}</h2>

        <p class="label" style="margin:0 0 12px">${t('bomba.fuse')}</p>
        <div class="btn-row" id="durs">
          ${opts.map(o => `<button class="btn ${state.range === o.id ? 'btn--accent' : 'btn--outline'}" data-range="${o.id}">${o.label}</button>`).join('')}
        </div>
        <p class="muted" style="margin-top:10px">${t('bomba.hiddenTime')}</p>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" style="margin-top:28px">${t('common.start')}</button>
      `;
      root.querySelector('#back').onclick = leaveGame;
      root.querySelectorAll('[data-range]').forEach(b => {
        b.onclick = () => {
          state.range = b.dataset.range;
          root.querySelectorAll('[data-range]').forEach(x => {
            x.className = 'btn ' + (x.dataset.range === state.range ? 'btn--accent' : 'btn--outline');
          });
        };
      });
      root.querySelector('#go').onclick = () => { drawChallenge(); screenRound(); };
    }

    // ---------- 2) ronda ----------
    function screenRound() {
      stopTimers();
      root.innerHTML = `
        <button class="back" id="back">${t('nav.home')}</button>
        <p class="kicker center">${t('bomba.challenge')}</p>
        <div class="bomb-challenge" id="challenge">${state.challenge}</div>
        <div class="bomb-stage">${BOMB_SVG}</div>
        <div id="ctl"></div>
      `;
      bombEl = root.querySelector('.bomb');
      root.querySelector('#back').onclick = leaveGame;

      const ctl = root.querySelector('#ctl');
      ctl.innerHTML = `
        <button class="btn btn--accent" id="start">${t('bomba.lightFuse')}</button>
        <p class="muted center" style="margin-top:10px">${t('bomba.readChallenge')}</p>`;
      root.querySelector('#start').onclick = () => {
        initAudio(); // cal el gest de l'usuari
        ctl.innerHTML = `<p class="bomb-pass center">${t('bomba.sayPass')}</p>`;
        startBomb();
      };
    }

    function startBomb() {
      const [lo, hi] = RANGES[state.range] || RANGES.mitja;
      const total = (lo + Math.random() * (hi - lo)) * 1000; // ms, ocult
      const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      running = true;

      explodeTimeout = setTimeout(explode, total);

      const tick = () => {
        if (!running) return;
        playTick();
        pulseBomb();
        const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
        const frac = Math.min(1, elapsed / total);
        const interval = Math.max(80, 560 - frac * 480); // s'accelera: 560ms -> 80ms
        tickTimeout = setTimeout(tick, interval);
      };
      tick();
    }

    function pulseBomb() {
      if (!bombEl) return;
      bombEl.classList.remove('bomb--tick');
      void bombEl.offsetWidth; // reinicia l'animació
      bombEl.classList.add('bomb--tick');
    }

    // ---------- 3) explosió ----------
    function explode() {
      stopTimers();
      try { if (navigator && navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 600]); } catch (e) {}
      playExplosion();
      screenBoom();
    }

    function screenBoom() {
      root.innerHTML = `
        <button class="back" id="back">${t('nav.home')}</button>
        <div class="boom" id="boom">
          <div class="boom__title">${t('bomba.boom')}</div>
          <div class="boom__sub">${t('bomba.whoLoses')}</div>
        </div>
        <div class="stack" style="margin-top:18px">
          <button class="btn btn--accent" id="again">${t('bomba.anotherChallenge')}</button>
          <button class="btn btn--outline" id="home">${t('common.backHome')}</button>
        </div>
      `;
      root.querySelector('#back').onclick = leaveGame;
      root.querySelector('#home').onclick = leaveGame;
      root.querySelector('#again').onclick = () => { drawChallenge(); screenRound(); };
    }

    screenSetup();
  },
};
