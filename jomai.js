// ============================================================
// Jo mai… — joc de grup, un sol mòbil.
//
// Surt una frase («Jo mai… he cantat en un karaoke»). Qui sí que ho ha fet,
// abaixa un dit. Amb el comptador de dits, cadascú en té 5: es toquen els noms
// dels que ho han fet i qui es queda sense dits, queda fora. Guanya l'últim.
// També es pot jugar només amb les frases. Frases a jomai-frases.js (en català).
// ============================================================

import { SUAU, ATREVIT } from './jomai-frases.js';
import { getPlayers, setPlayers } from './store.js';
import { drawFromBag } from './word-bag.js';
import { confirma } from './confirma.js';
import { t } from './i18n.js';
import { getRecord, setRecord } from './records.js';

const J = (k, v) => t('jomai.' + k, v);
const FINGERS = 5;
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default {
  id: 'jomai',
  title: 'Jo mai…',
  tagline: 'Si tu sí que ho has fet, abaixa un dit',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,
  instructions: [
    'Surt una frase que comença per «Jo mai…». Qui sí que ho ha fet, ho ha de reconèixer!',
    'Amb el comptador de dits, cadascú comença amb 5 dits. Toqueu els noms dels que ho heu fet: cadascun perd un dit.',
    'Qui es queda sense dits, queda fora. Guanya l\'últim que en té.',
    'Tria el to: suau (per a tothom) o atrevit (secrets i enamoraments). També podeu jugar només amb les frases.',
  ],

  mount(root, { goHome }) {
    const saved = getPlayers();
    const state = {
      names: saved.length ? saved.slice(0, 12) : ['', '', ''],
      bold: getRecord('jomai:bold') === true,
      fingers: getRecord('jomai:fingers') !== false,
    };
    while (state.names.length < 3) state.names.push('');
    let game = null;
    const pool = () => (state.bold ? [...SUAU, ...ATREVIT] : SUAU);
    const next = () => drawFromBag('jomai:' + (state.bold ? 'atrevit' : 'suau'), pool);
    function leave() { goHome(); }

    // ---------- 1) preparació ----------
    const filled = () => state.names.every(n => n && n.trim());
    const canGo = () => !state.fingers || (state.names.length >= 2 && filled());
    function screenSetup() {
      root.innerHTML = `
        <button class="back" id="back">${t('nav.home')}</button>
        <p class="kicker">${t('game.jomai.title')}</p>
        <h2 style="font-size:30px;margin:6px 0 18px">${J('setupTitle')}</h2>
        <p class="label" style="margin:0 0 12px">${J('tone')}</p>
        <div class="btn-row">
          <button class="btn ${!state.bold ? 'btn--accent' : 'btn--outline'}" data-bold="0">${J('mild')}</button>
          <button class="btn ${state.bold ? 'btn--accent' : 'btn--outline'}" data-bold="1">${J('bold')}</button>
        </div>
        <p class="label" style="margin:20px 0 12px">${J('howPlay')}</p>
        <div class="btn-row">
          <button class="btn ${state.fingers ? 'btn--accent' : 'btn--outline'}" data-f="1">${J('withFingers')}</button>
          <button class="btn ${!state.fingers ? 'btn--accent' : 'btn--outline'}" data-f="0">${J('onlyCards')}</button>
        </div>
        ${state.fingers ? `
        <p class="label" style="margin:20px 0 12px">${t('common.players')}</p>
        <div class="stack" id="names" style="--stack-gap:8px"></div>
        <button class="btn btn--outline" id="addp" style="margin-top:12px">${t('common.addPlayer')}</button>` : ''}
        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" style="margin-top:24px">${t('common.lets')}</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700"></p>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-bold]').forEach(b => { b.onclick = () => { state.bold = b.dataset.bold === '1'; setRecord('jomai:bold', state.bold); screenSetup(); }; });
      root.querySelectorAll('[data-f]').forEach(b => { b.onclick = () => { state.fingers = b.dataset.f === '1'; setRecord('jomai:fingers', state.fingers); screenSetup(); }; });
      root.querySelector('#go').onclick = () => { if (canGo()) start(); };
      if (state.fingers) {
        root.querySelector('#addp').onclick = () => { state.names.push(''); renderNames(); };
        renderNames();
      } else updateGo();
    }
    function updateGo() {
      const go = root.querySelector('#go'), warn = root.querySelector('#warn'), add = root.querySelector('#addp');
      if (go) go.disabled = !canGo();
      if (add) add.disabled = state.names.length >= 12 || !filled();
      if (warn) warn.textContent = state.fingers && !filled() ? t('common.fillAllNames') : '';
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

    // ---------- 2) les frases ----------
    function start() {
      const names = state.fingers ? state.names.map(s => s.trim()) : [];
      if (names.length) setPlayers(names);
      game = { names, left: names.map(() => FINGERS), n: 0 };
      card();
    }
    const alive = () => game.names.map((_, i) => i).filter(i => game.left[i] > 0);
    async function askQuit() {
      if (await confirma({ text: t('common.leaveGame'), yes: t('common.leave'), no: t('common.keepPlaying') })) screenSetup();
    }
    function card() {
      const phrase = next();
      game.n++;
      const who = new Set();
      root.innerHTML = `
        <div class="chess-top"><button class="back" id="quit">${t('nav.setup')}</button><p class="kicker" style="margin:0 0 18px">${J('cardN', { n: game.n })}</p></div>
        <div class="jm-card">
          <p class="jm-pre">${J('prefix')}</p>
          <p class="jm-text">${esc(phrase)}</p>
        </div>
        ${game.names.length ? `
          <p class="muted center" style="margin:14px 0 8px">${J('tapWho')}</p>
          <div class="jm-players">${alive().map(i => `<button class="jm-p" data-p="${i}" aria-pressed="false"><span>${esc(game.names[i])}</span><small>${fingers(game.left[i])}</small></button>`).join('')}</div>` : ''}
        <div class="spacer"></div>
        <button class="btn btn--accent" id="next" style="margin-top:18px">${J('next')}</button>`;
      root.querySelector('#quit').onclick = askQuit;
      root.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => {
        const i = +b.dataset.p;
        if (who.has(i)) who.delete(i); else who.add(i);
        b.classList.toggle('on', who.has(i));
        b.setAttribute('aria-pressed', String(who.has(i)));
        b.querySelector('small').textContent = fingers(game.left[i] - (who.has(i) ? 1 : 0));
      }; });
      root.querySelector('#next').onclick = () => {
        const outNow = [];
        for (const i of who) { game.left[i]--; if (game.left[i] === 0) outNow.push(game.names[i]); }
        const rest = alive();
        if (game.names.length && rest.length <= 1) return finish(rest);
        if (outNow.length) return outScreen(outNow);
        card();
      };
    }
    const fingers = (n) => (n > 0 ? Array(n).fill('●').join(' ') : '—');

    function outScreen(names) {
      root.innerHTML = `
        <div class="jm-card jm-card--out">
          <p class="jm-text">${names.map(n => J('out', { name: esc(n) })).join('<br>')}</p>
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="next" style="margin-top:18px">${J('next')}</button>`;
      root.querySelector('#next').onclick = card;
    }
    function finish(rest) {
      const w = rest.length ? game.names[rest[0]] : null;
      root.innerHTML = `
        <p class="kicker center">${t('common.final')}</p>
        <h2 class="center" style="font-size:24px;margin:8px 0 4px">${t('common.winSingular')}</h2>
        <p class="center" style="font-family:var(--font-display);font-weight:800;font-size:38px;color:var(--accent);margin:4px 0 16px">${w ? esc(w) : '—'}</p>
        <p class="muted center">${J('rounds', { n: game.n })}</p>
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
