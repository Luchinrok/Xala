// ============================================================
// Endevina-la — mòbil al front (estil Heads Up)
//
// Flux: configuració -> preparació (+permís sensor) -> 3·2·1 ->
//       joc (sensor o, de reserva, mode botons) -> resultats.
// Inclinar AMUNT = encertada · inclinar AVALL = passa.
// Reaprofita les paraules i icones de l'impostor.
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { CATEGORY_ICONS } from './category-icons.js';

// --- Paràmetres del sensor (fàcils de canviar) ---
// Amb el mòbil en horitzontal al front, l'eix dominant sol ser 'gamma'.
// AMUNT = encertada, AVALL = passa. La detecció fa servir `up = valor * upSign`:
//   up >= threshold  -> AMUNT (encertada)
//   up <= -threshold -> AVALL (passa)
// Si en un mòbil real surt invertit, canvia upSign a +1 (o prova axis: 'beta').
const ORIENT = {
  axis: 'gamma',     // eix dominant ('gamma' o 'beta')
  threshold: 45,     // graus per registrar un gest
  neutral: 20,       // cal tornar dins ±neutral abans del gest següent
  upSign: -1,        // signe de l'eix quan s'inclina AMUNT (encertada)
};
const SENSOR_WAIT = 1500;  // ms d'espera d'una lectura abans de caure al mode botons

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default {
  id: 'endevinala',
  title: 'Endevina-la',
  tagline: 'Mòbil al front i a fer el préssec',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Un jugador es posa el mòbil al front, sense mirar la paraula.',
    'La resta li fa mímica, sons o pistes perquè l’endevini.',
    'Inclina el mòbil amunt quan l’encertes i avall per passar a la següent.',
    'Compteu quantes n’encerteu abans que s’acabi el temps.',
  ],

  mount(root, { goHome }) {
    const state = {
      categoryIds: [CATEGORIES[0].id],
      duration: 60,
      mode: 'sensor',
      deck: [],
      deckIndex: 0,
      score: 0,
      results: [],
      over: false,
    };

    // recursos vius durant una ronda
    let orientHandler = null;
    let timerIv = null;
    let sensorWaitTo = null;

    function cleanup() {
      if (orientHandler) { window.removeEventListener('deviceorientation', orientHandler); orientHandler = null; }
      if (timerIv) { clearInterval(timerIv); timerIv = null; }
      if (sensorWaitTo) { clearTimeout(sensorWaitTo); sensorWaitTo = null; }
    }

    function leaveHome() { cleanup(); goHome(); }

    // ---------- 1) configuració ----------
    function screenSetup() {
      cleanup();
      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker">Endevina-la</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la ronda</h2>

        <p class="label" style="margin:0 0 12px">Categories</p>
        <div class="cat-grid" id="cats">
          ${CATEGORIES.map(c => `
            <button class="cat-tile ${state.categoryIds.includes(c.id) ? 'on' : ''}" data-cat="${c.id}">
              <span class="cat-tile__icon">${CATEGORY_ICONS[c.id] || ''}</span>
              <span class="cat-tile__name">${c.name}</span>
            </button>`).join('')}
        </div>

        <p class="label" style="margin:24px 0 12px">Durada</p>
        <div class="btn-row" id="durs">
          ${[30, 60, 90].map(d => `
            <button class="btn ${state.duration === d ? 'btn--accent' : 'btn--outline'}" data-dur="${d}">${d} s</button>
          `).join('')}
        </div>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" style="margin-top:28px">Som-hi</button>
      `;

      root.querySelector('#back').onclick = leaveHome;

      root.querySelectorAll('[data-cat]').forEach(b => {
        b.onclick = () => {
          const id = b.dataset.cat;
          const i = state.categoryIds.indexOf(id);
          if (i >= 0) {
            if (state.categoryIds.length > 1) { state.categoryIds.splice(i, 1); b.classList.remove('on'); }
          } else {
            state.categoryIds.push(id);
            b.classList.add('on');
          }
        };
      });

      root.querySelectorAll('[data-dur]').forEach(b => {
        b.onclick = () => {
          state.duration = parseInt(b.dataset.dur, 10);
          root.querySelectorAll('[data-dur]').forEach(x => {
            const on = parseInt(x.dataset.dur, 10) === state.duration;
            x.className = 'btn ' + (on ? 'btn--accent' : 'btn--outline');
          });
        };
      });

      root.querySelector('#go').onclick = screenReady;
    }

    // ---------- 2) preparació + permís ----------
    function screenReady() {
      cleanup();
      root.innerHTML = `
        <button class="back" id="back">‹ Configuració</button>
        <p class="kicker">Endevina-la</p>
        <div class="spacer"></div>
        <div class="panel center stack">
          <h2 style="font-size:28px">Posa't el mòbil al front en horitzontal</h2>
          <p class="muted">Subjecta'l al front amb la pantalla cap als altres. Inclina amunt per encertar i avall per passar.</p>
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="activate" style="margin-top:24px">Activa i comença</button>
      `;
      root.querySelector('#back').onclick = screenSetup;
      root.querySelector('#activate').onclick = activate;
    }

    async function activate() {
      let mode = 'buttons';
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        // iOS 13+: cal demanar permís dins del gest de l'usuari
        try {
          const res = await DOE.requestPermission();
          mode = res === 'granted' ? 'sensor' : 'buttons';
        } catch (e) {
          mode = 'buttons';
        }
      } else if (DOE) {
        mode = 'sensor'; // no cal permís
      } else {
        mode = 'buttons'; // no hi ha sensor
      }
      screenCountdown(mode);
    }

    // ---------- 3) compte enrere 3·2·1 ----------
    function screenCountdown(mode) {
      cleanup();
      let n = 3;
      root.innerHTML = `
        <p class="kicker center">A punt...</p>
        <div class="spacer"></div>
        <div class="big-timer" id="count">${n}</div>
        <div class="spacer"></div>
      `;
      const el = root.querySelector('#count');
      const iv = setInterval(() => {
        n--;
        if (n <= 0) { clearInterval(iv); startPlay(mode); }
        else { el.textContent = n; }
      }, 1000);
      timerIv = iv; // perquè cleanup() l'aturi si cal
    }

    // ---------- prepara i arrenca la ronda ----------
    function startPlay(mode) {
      cleanup();
      state.mode = mode;
      const pool = CATEGORIES
        .filter(c => state.categoryIds.includes(c.id))
        .flatMap(c => c.words.map(w => w.word));
      state.deck = shuffle(pool);
      state.deckIndex = 0;
      state.score = 0;
      state.results = [];
      state.over = false;

      if (mode === 'sensor') screenPlaySensor();
      else screenPlayButtons();

      startTimer();
    }

    function startTimer() {
      let remaining = state.duration;
      const paint = () => { const t = root.querySelector('#timer'); if (t) t.textContent = Math.max(0, remaining); };
      paint();
      timerIv = setInterval(() => {
        remaining--;
        paint(); // torna a buscar #timer cada tic (pot canviar de pantalla a mig joc)
        if (remaining <= 0) finish();
      }, 1000);
    }

    // marca una paraula i avança
    function register(ok) {
      if (state.over) return;
      if (state.deckIndex >= state.deck.length) return;
      const word = state.deck[state.deckIndex];
      state.results.push({ word, ok });
      if (ok) state.score++;
      const sEl = root.querySelector('#score');
      if (sEl) sEl.textContent = state.score;
      flash(ok);
      state.deckIndex++;
      if (state.deckIndex >= state.deck.length) { finish(); return; }
      const wEl = root.querySelector('#word');
      if (wEl) wEl.textContent = state.deck[state.deckIndex];
    }

    function flash(ok) {
      const layer = root.querySelector('#flash');
      if (!layer) return;
      layer.className = 'flash-layer show ' + (ok ? 'ok' : 'no');
      setTimeout(() => { layer.className = 'flash-layer'; }, 220);
    }

    // ---------- 4) joc amb sensor ----------
    function screenPlaySensor() {
      const first = state.deck[state.deckIndex] || '';
      root.innerHTML = `
        <div class="flash-layer" id="flash"></div>
        <div class="play" id="play">
          <div class="play__top">
            <span class="play__timer" id="timer">${state.duration}</span>
            <span class="play__score" id="score">0</span>
          </div>
          <div class="play__word" id="word">${first}</div>
          <div class="play__foot">
            <span class="play__hint">Amunt = encertada · Avall = passa</span>
            <button class="btn--link" id="tobtns">El sensor no respon? Mode botons</button>
          </div>
        </div>
      `;
      root.querySelector('#tobtns').onclick = () => {
        // continua la mateixa ronda en mode botons (atura només el sensor, no el temps)
        if (orientHandler) { window.removeEventListener('deviceorientation', orientHandler); orientHandler = null; }
        if (sensorWaitTo) { clearTimeout(sensorWaitTo); sensorWaitTo = null; }
        state.mode = 'buttons';
        screenPlayButtons();
      };

      let armed = true;
      let gotReading = false;
      orientHandler = (e) => {
        let v = e[ORIENT.axis];
        if (v == null) v = e.beta; // recurs si l'eix triat no dona dada
        if (v == null) return;
        gotReading = true;
        const up = v * ORIENT.upSign; // up>0 quan s'inclina amunt
        if (armed) {
          if (up >= ORIENT.threshold) { armed = false; register(true); }      // amunt = encertada
          else if (up <= -ORIENT.threshold) { armed = false; register(false); } // avall = passa
        } else if (Math.abs(up) <= ORIENT.neutral) {
          armed = true; // tornat a pla: a punt per al gest següent
        }
      };
      window.addEventListener('deviceorientation', orientHandler);

      // si no arriba cap lectura, el sensor no va: passa al mode botons
      sensorWaitTo = setTimeout(() => {
        if (!gotReading && !state.over) {
          window.removeEventListener('deviceorientation', orientHandler);
          orientHandler = null;
          state.mode = 'buttons';
          screenPlayButtons();
        }
      }, SENSOR_WAIT);
    }

    // ---------- 5) mode botons (reserva) ----------
    function screenPlayButtons() {
      const cur = state.deck[state.deckIndex] || '';
      const left = root.querySelector('#timer') ? root.querySelector('#timer').textContent : state.duration;
      root.innerHTML = `
        <div class="flash-layer" id="flash"></div>
        <div class="play play--btns" id="play">
          <button class="zone zone--ok" id="ok">▲ Encertada</button>
          <div class="zone-mid">
            <span class="play__timer" id="timer">${left}</span>
            <span class="play__score" id="score">${state.score}</span>
            <div class="play__word play__word--mid" id="word">${cur}</div>
          </div>
          <button class="zone zone--pass" id="pass">▼ Passa</button>
        </div>
      `;
      root.querySelector('#ok').onclick = () => register(true);
      root.querySelector('#pass').onclick = () => register(false);
    }

    // ---------- 6) resultats ----------
    function finish() {
      if (state.over) return;
      state.over = true;
      cleanup();
      const rows = state.results.map(r =>
        `<div class="res-row ${r.ok ? 'res-row--ok' : 'res-row--no'}">
           <span class="res-row__mark">${r.ok ? '✓' : '✗'}</span>${r.word}
         </div>`).join('');
      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker">Resultats</p>
        <h2 style="font-size:34px;margin:6px 0 4px"><span style="color:var(--accent)">${state.score}</span> encertades</h2>
        <p class="muted" style="margin-bottom:18px">${state.results.length} paraules en joc</p>
        ${rows ? `<div class="stack" style="--stack-gap:8px">${rows}</div>` : '<p class="muted">Cap paraula. Torna-ho a provar!</p>'}
        <div class="stack" style="margin-top:24px">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      root.querySelector('#back').onclick = leaveHome;
      root.querySelector('#home').onclick = leaveHome;
      root.querySelector('#again').onclick = () => screenCountdown(state.mode);
    }

    screenSetup();
  },
};
