// ============================================================
// Endevina-la — mòbil al front (estil Heads Up)
//
// Flux: configuració -> preparació (+permís sensor) -> 3·2·1 ->
//       joc (sensor o, de reserva, mode botons) -> resultats.
// Inclinar AMUNT = encertada · inclinar AVALL = passa.
// Reaprofita les paraules i icones de l'impostor.
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { openCategoryScreen, categoriesLabel } from './category-select.js';
import { drawFromBag } from './word-bag.js';
import { t } from './i18n.js';

// --- Orientació del dispositiu (es juga amb el mòbil EN HORITZONTAL) ---
// L'app va bloquejada en vertical (manifest), però el joc es juga amb el
// mòbil de costat al front. Per això girem el contingut de les pantalles de
// joc 90° amb CSS i, segons cap a quin costat s'hagi tombat el mòbil, triem
// el SENTIT del gir i el SIGNE de la inclinació perquè el text quedi dret i
// inclinar el TOP del mòbil cap amunt sigui sempre "encertat".
//
// Detecció de la inclinació (fàcil de tocar). `up = valor[axis] * sign`:
//   up >= threshold  -> AMUNT (encertada)
//   up <= -threshold -> AVALL (passa)
//   |up| <= neutral  -> tornat a pla, a punt per al gest següent
const TILT = {
  axis: 'gamma',     // eix dominant amb el mòbil de costat ('gamma' o 'beta')
  threshold: 45,     // graus per registrar un gest
  neutral: 20,       // cal tornar dins ±neutral abans del gest següent
  signA: -1,         // signe d'AMUNT a l'orientació 90°  (un costat)
  signB: +1,         // signe d'AMUNT a l'orientació 270°/-90° (l'altre costat)
};

// Gir CSS (graus) que deixa el text dret a cada costat landscape.
const ROT = {
  degA: 90,          // orientació 90°
  degB: -90,         // orientació 270°/-90°
};

const SENSOR_WAIT = 1500;  // ms d'espera d'una lectura abans de caure al mode botons

// Angle d'orientació normalitzat (0/90/180/270). Prova les APIs en ordre i
// cau amb gràcia si cap no està disponible.
function orientationAngle() {
  const so = screen.orientation;
  if (so && typeof so.angle === 'number') return so.angle;
  if (typeof window.orientation === 'number') return ((window.orientation % 360) + 360) % 360;
  if (window.matchMedia && window.matchMedia('(orientation: landscape)').matches) return 90;
  return 0;
}

// Costat cap on està tombat el mòbil: 'B' a 270°/-90°, si no 'A'
// (el cas vertical/bloquejat cau a 'A' per defecte).
function landscapeSide() {
  return orientationAngle() === 270 ? 'B' : 'A';
}

const rotDeg = () => (landscapeSide() === 'B' ? ROT.degB : ROT.degA);
const tiltSign = () => (landscapeSide() === 'B' ? TILT.signB : TILT.signA);

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
      categoryIds: [],
      duration: 60,
      mode: 'sensor',
      current: null,   // paraula que es mostra ara
      score: 0,
      results: [],
      over: false,
    };

    // Bossa barrejada i persistent (word-bag.js): no repeteix cap paraula
    // fins esgotar la bossa de les categories triades; es manté durant tota
    // la sessió i, quan s'esgota a mig joc, es torna a barrejar.
    const bagKey = () => 'endevinala:' + state.categoryIds.slice().sort().join(',');
    function buildPool() {
      const seen = new Set();
      const out = [];
      CATEGORIES.filter(c => state.categoryIds.includes(c.id)).forEach(c => {
        c.words.forEach(w => {
          const k = w.word.toLowerCase();
          if (!seen.has(k)) { seen.add(k); out.push(w.word); }
        });
      });
      return out;
    }
    const nextWord = () => drawFromBag(bagKey(), buildPool);

    // recursos vius durant una ronda
    let orientHandler = null;
    let timerIv = null;
    let sensorWaitTo = null;
    let orientWatch = null;

    // Embolcalla el contingut d'una pantalla de JOC perquè es vegi recte amb
    // el mòbil en horitzontal: caixa fixa girada 90° (segons l'orientació).
    function landWrap(inner, withFlash = true) {
      const flash = withFlash ? '<div class="flash-layer" id="flash"></div>' : '';
      return `<div class="land-stage">${flash}<div class="land-stage__inner" id="landinner" style="--land-rot:${rotDeg()}deg">${inner}</div></div>`;
    }
    // Embolcalla el contingut d'una pantalla de JOC VERTICAL (mode botons, de
    // reserva): es juga amb el mòbil dret, així que NO es gira res.
    function vertWrap(inner, withFlash = true) {
      const flash = withFlash ? '<div class="flash-layer" id="flash"></div>' : '';
      return `<div class="vert-stage">${flash}<div class="vert-stage__inner">${inner}</div></div>`;
    }
    function applyRotation() {
      const inner = root.querySelector('#landinner');
      if (inner) inner.style.setProperty('--land-rot', rotDeg() + 'deg');
    }
    // Reajusta el gir si el mòbil canvia de costat enmig de la partida.
    function startOrientWatch() {
      stopOrientWatch();
      orientWatch = () => applyRotation();
      window.addEventListener('orientationchange', orientWatch);
      if (screen.orientation && screen.orientation.addEventListener) {
        screen.orientation.addEventListener('change', orientWatch);
      }
    }
    function stopOrientWatch() {
      if (!orientWatch) return;
      window.removeEventListener('orientationchange', orientWatch);
      if (screen.orientation && screen.orientation.removeEventListener) {
        screen.orientation.removeEventListener('change', orientWatch);
      }
      orientWatch = null;
    }

    function cleanup() {
      if (orientHandler) { window.removeEventListener('deviceorientation', orientHandler); orientHandler = null; }
      if (timerIv) { clearInterval(timerIv); timerIv = null; }
      if (sensorWaitTo) { clearTimeout(sensorWaitTo); sensorWaitTo = null; }
      stopOrientWatch();
    }

    function leaveHome() { cleanup(); goHome(); }

    // ---------- 1) configuració ----------
    function screenSetup() {
      cleanup();
      root.innerHTML = `
        <button class="back" id="back">${t('nav.home')}</button>
        <p class="kicker">${t('game.endevinala.title')}</p>
        <h2 style="font-size:30px;margin:6px 0 22px">${t('endevinala.setupTitle')}</h2>

        <p class="label" style="margin:0 0 12px">${t('common.categories')}</p>
        <button class="btn btn--outline" id="cats">${categoriesLabel(state.categoryIds)}</button>

        <p class="label" style="margin:24px 0 12px">${t('endevinala.duration')}</p>
        <div class="btn-row" id="durs">
          ${[30, 60, 90].map(d => `
            <button class="btn ${state.duration === d ? 'btn--accent' : 'btn--outline'}" data-dur="${d}">${t('endevinala.durSec', { n: d })}</button>
          `).join('')}
        </div>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" style="margin-top:28px">${t('common.lets')}</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700;display:none">${t('common.pickCategory')}</p>
      `;

      root.querySelector('#back').onclick = leaveHome;
      updateGo();

      root.querySelector('#cats').onclick = () => {
        openCategoryScreen(root, { categoryIds: state.categoryIds, kicker: t('game.endevinala.title'), onBack: screenSetup });
      };

      root.querySelectorAll('[data-dur]').forEach(b => {
        b.onclick = () => {
          state.duration = parseInt(b.dataset.dur, 10);
          root.querySelectorAll('[data-dur]').forEach(x => {
            const on = parseInt(x.dataset.dur, 10) === state.duration;
            x.className = 'btn ' + (on ? 'btn--accent' : 'btn--outline');
          });
        };
      });

      root.querySelector('#go').onclick = () => {
        if (state.categoryIds.length === 0) { updateGo(); return; }
        screenReady();
      };
    }

    // Habilita "Som-hi" només si hi ha alguna categoria triada.
    function updateGo() {
      const has = state.categoryIds.length > 0;
      const go = root.querySelector('#go');
      const warn = root.querySelector('#warn');
      if (go) go.disabled = !has;
      if (warn) warn.style.display = has ? 'none' : 'block';
    }

    // ---------- 2) preparació + permís ----------
    function screenReady() {
      cleanup();
      root.innerHTML = `
        <button class="back" id="back">${t('nav.setup')}</button>
        <p class="kicker">${t('game.endevinala.title')}</p>
        <div class="spacer"></div>
        <div class="panel center stack">
          <h2 style="font-size:28px">${t('endevinala.readyTitle')}</h2>
          <p class="muted">${t('endevinala.readySub')}</p>
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="activate" style="margin-top:24px">${t('endevinala.activate')}</button>
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
      // El compte enrere segueix l'orientació del joc que ve a continuació:
      // horitzontal abans del mode sensor, vertical abans del mode botons.
      const inner = `
        <p class="kicker center">${t('endevinala.countReady')}</p>
        <div class="spacer"></div>
        <div class="big-timer" id="count">${n}</div>
        <div class="spacer"></div>
      `;
      if (mode === 'sensor') {
        root.innerHTML = landWrap(inner, false);
        startOrientWatch();
      } else {
        root.innerHTML = vertWrap(inner, false);
      }
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
      state.current = nextWord();
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

    // marca una paraula i avança (treu la següent de la bossa persistent)
    function register(ok) {
      if (state.over) return;
      if (!state.current) return;
      const word = state.current;
      state.results.push({ word, ok });
      if (ok) state.score++;
      const sEl = root.querySelector('#score');
      if (sEl) sEl.textContent = state.score;
      flash(ok);
      state.current = nextWord();
      const wEl = root.querySelector('#word');
      if (wEl) wEl.textContent = state.current;
    }

    function flash(ok) {
      const layer = root.querySelector('#flash');
      if (!layer) return;
      layer.className = 'flash-layer show ' + (ok ? 'ok' : 'no');
      setTimeout(() => { layer.className = 'flash-layer'; }, 220);
    }

    // ---------- 4) joc amb sensor ----------
    function screenPlaySensor() {
      const first = state.current || '';
      root.innerHTML = landWrap(`
        <div class="play" id="play">
          <div class="play__top">
            <span class="play__timer" id="timer">${state.duration}</span>
            <span class="play__score" id="score">0</span>
          </div>
          <div class="play__word" id="word">${first}</div>
          <div class="play__foot">
            <span class="play__hint">${t('endevinala.upDown')}</span>
            <button class="btn--link" id="tobtns">${t('endevinala.toButtons')}</button>
          </div>
        </div>
      `);
      startOrientWatch();
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
        let v = e[TILT.axis];
        if (v == null) v = e.beta; // recurs si l'eix triat no dona dada
        if (v == null) return;
        gotReading = true;
        // El signe es llegeix en viu: si el mòbil canvia de costat, el gest
        // amunt/avall continua sent correcte (mai s'inverteix).
        const up = v * tiltSign(); // up>0 quan el TOP del mòbil va cap al sostre
        if (armed) {
          if (up >= TILT.threshold) { armed = false; register(true); }      // amunt = encertada
          else if (up <= -TILT.threshold) { armed = false; register(false); } // avall = passa
        } else if (Math.abs(up) <= TILT.neutral) {
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
      const cur = state.current || '';
      const left = root.querySelector('#timer') ? root.querySelector('#timer').textContent : state.duration;
      // Mode botons: es juga amb el mòbil en VERTICAL, sense girar res.
      root.innerHTML = vertWrap(`
        <div class="play play--btns" id="play">
          <button class="zone zone--ok" id="ok">${t('endevinala.zoneOk')}</button>
          <div class="zone-mid">
            <span class="play__timer" id="timer">${left}</span>
            <span class="play__score" id="score">${state.score}</span>
            <div class="play__word play__word--mid" id="word">${cur}</div>
          </div>
          <button class="zone zone--pass" id="pass">${t('endevinala.zonePass')}</button>
        </div>
      `);
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
        <button class="back" id="back">${t('nav.home')}</button>
        <p class="kicker">${t('common.results')}</p>
        <h2 style="font-size:34px;margin:6px 0 4px"><span style="color:var(--accent)">${state.score}</span> ${t('endevinala.hitsSuffix')}</h2>
        <p class="muted" style="margin-bottom:18px">${t('endevinala.wordsInPlay', { n: state.results.length })}</p>
        ${rows ? `<div class="stack" style="--stack-gap:8px">${rows}</div>` : `<p class="muted">${t('endevinala.noWords')}</p>`}
        <div class="stack" style="margin-top:24px">
          <button class="btn btn--accent" id="again">${t('endevinala.another')}</button>
          <button class="btn btn--outline" id="home">${t('common.backHome')}</button>
        </div>
      `;
      root.querySelector('#back').onclick = screenSetup;
      root.querySelector('#home').onclick = leaveHome;
      root.querySelector('#again').onclick = () => screenCountdown(state.mode);
    }

    screenSetup();
  },
};
