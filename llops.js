// ============================================================
// Llops — joc de grup (del tipus «homes llop»), un sol mòbil, offline.
//
// El mòbil reparteix els papers en secret i fa de narrador. De nit, amb el
// mòbil al mig de la taula, cada paper obre els ulls al seu torn i tria en
// silenci: els llops una víctima, la vident algú per saber si és llop, el
// metge algú per salvar. De dia es debat i es vota qui surt del poble.
// Guanya el poble si no queda cap llop; els llops, si són tants com els altres.
// ============================================================

import { getPlayers, setPlayers } from './store.js';
import { confirma } from './confirma.js';
import { t, getLang } from './i18n.js';
import { getRecord, setRecord } from './records.js';

const MIN = 5, MAX = 16;
const ROLE_KEY = { wolf: 'roleWolf', seer: 'roleSeer', doctor: 'roleDoctor', villager: 'roleVillager' };
const DESC_KEY = { wolf: 'descWolf', seer: 'descSeer', doctor: 'descDoctor', villager: 'descVillager' };
const L = (k, v) => t('llops.' + k, v);
const wolvesFor = (n) => (n <= 6 ? 1 : n <= 10 ? 2 : 3);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

export default {
  id: 'llops',
  title: 'Llops',
  tagline: 'Descobriu els llops abans que us mengin',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'De 5 a 16 jugadors. El mòbil reparteix els papers en secret: llops, vilatans i, si voleu, una vident i un metge.',
    'De nit, poseu el mòbil al mig. Tothom tanca els ulls i el mòbil va cridant cada paper: els llops trien una víctima, la vident descobreix si algú és llop i el metge salva algú.',
    'De dia, tothom obre els ulls: el mòbil diu qui ha mort. Debateu i voteu qui creieu que és llop: surt del poble i es descobreix el seu paper.',
    'Guanya el poble si no queda cap llop. Guanyen els llops si arriben a ser tants com la resta.',
    'Toqueu el mòbil en silenci i sense mirar quan no us toca: si no, es descobreix qui és qui!',
  ],

  mount(root, { goHome }) {
    const saved = getPlayers();
    const opts = Object.assign({ seer: true, doctor: true, voice: true }, getRecord('llops:opts') || {});
    const state = { names: (saved.length ? saved.slice(0, MAX) : []).concat(Array(Math.max(0, MIN - saved.length)).fill('')) };
    let g = null, timer = null;

    // capçalera de les pantalles de partida: tornar a preparar el poble i el títol
    const top = (k) => `<div class="chess-top"><button class="back" id="quit">${t('nav.setup')}</button><p class="kicker" style="margin:0 0 18px">${k}</p></div>`;
    const wireTop = () => {
      const q = root.querySelector('#quit');
      if (q) q.onclick = async () => { if (!g || await confirma({ text: t('common.leaveGame'), yes: t('common.leave'), no: t('common.keepPlaying') })) screenConfig(); };
      root.querySelectorAll('.ll-repeat').forEach(b => { b.onclick = () => { if (lastSaid) say(...lastSaid); }; });
    };
    const repeatBtn = () => (opts.voice ? `<button class="ll-repeat" type="button">🔊 ${L('repeat')}</button>` : '');

    function stop() {
      if (timer) { clearTimeout(timer); timer = null; }
      try { speechSynthesis.cancel(); } catch (e) { /* */ }
      if (clipAudio) { clipAudio.onended = null; clipAudio.pause(); clipAudio = null; }
    }
    function leave() { stop(); goHome(); }

    // narrador: mostra el text gran i, si es vol, el diu en veu alta
    // La millor veu del mòbil per a l'idioma: primer les naturals («Natural», «Neural»,
    // «Enhanced», «Premium», les de Google), després qualsevol de l'idioma.
    function bestVoice(lang) {
      const vs = (speechSynthesis.getVoices() || []).filter(x => x.lang && x.lang.toLowerCase().replace('_', '-').startsWith(lang.slice(0, 2)));
      if (!vs.length) return null;
      const score = (x) => (/natural|neural|enhanced|premium|wavenet/i.test(x.name) ? 4 : 0) + (/google/i.test(x.name) ? 2 : 0)
        + (x.lang.toLowerCase().replace('_', '-') === lang.toLowerCase() ? 1 : 0) + (x.localService ? 0 : 1);
      return vs.sort((a, b) => score(b) - score(a))[0];
    }
    if (typeof speechSynthesis !== 'undefined') try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; } catch (e) { /* */ }

    // Veu gravada (la Txell, en català): veu-llops/ca/<id>.mp3, una després de l'altra.
    let clipAudio = null;
    function playClips(ids) {
      let k = 0;
      const next = () => {
        if (k >= ids.length) return;
        clipAudio = new Audio(`./veu-llops/ca/${ids[k++]}.mp3`);
        clipAudio.onended = next;
        clipAudio.play().catch(() => {});
      };
      next();
    }
    let lastSaid = null; // per al botó «Torna-ho a dir»
    function say(text, clips) {
      lastSaid = [text, clips];
      if (!opts.voice) return;
      if (clipAudio) { clipAudio.onended = null; clipAudio.pause(); clipAudio = null; }
      if (clips && clips.length && getLang() === 'ca') {
        try { speechSynthesis.cancel(); } catch (e) { /* */ }
        playClips(clips);
        return;
      }
      if (typeof speechSynthesis === 'undefined') return;
      try {
        speechSynthesis.cancel();
        const lang = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB', fr: 'fr-FR', it: 'it-IT', de: 'de-DE', pt: 'pt-PT' }[getLang()] || 'ca-ES';
        const v = bestVoice(lang);
        // frase a frase, amb una mica de pausa i una mica més a poc a poc: sona menys a robot
        const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
        parts.forEach((part, i) => {
          const u = new SpeechSynthesisUtterance(part);
          u.lang = lang; if (v) u.voice = v;
          u.rate = 0.92; u.pitch = 0.95;
          speechSynthesis.speak(u);
        });
      } catch (e) { /* sense veu */ }
    }

    // ---------- 1) configuració ----------
    const filled = () => state.names.every(n => n && n.trim());
    function screenConfig() {
      stop();
      const n = state.names.length, w = wolvesFor(n);
      root.innerHTML = `
        <button class="back" id="back">${t('nav.home')}</button>
        <p class="kicker">${t('game.llops.title')}</p>
        <h2 style="font-size:30px;margin:6px 0 18px">${L('setup')}</h2>
        <p class="label" style="margin:0 0 12px">${t('common.players')}</p>
        <div class="stack" id="names" style="--stack-gap:8px"></div>
        <button class="btn btn--outline" id="addp" style="margin-top:12px">${t('common.addPlayer')}</button>
        <div class="ll-opts">
          <label class="ll-opt"><input type="checkbox" id="o-seer" ${opts.seer ? 'checked' : ''}> ${L('useSeer')}</label>
          <label class="ll-opt"><input type="checkbox" id="o-doctor" ${opts.doctor ? 'checked' : ''}> ${L('useDoctor')}</label>
          <label class="ll-opt"><input type="checkbox" id="o-voice" ${opts.voice ? 'checked' : ''}> ${L('voice')}</label>
        </div>
        <p class="muted" id="comp" style="margin-top:10px"></p>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:20px">${t('common.start')}</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700"></p>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelector('#addp').onclick = () => { state.names.push(''); renderNames(); };
      for (const k of ['seer', 'doctor', 'voice']) root.querySelector('#o-' + k).onchange = (e) => { opts[k] = e.target.checked; setRecord('llops:opts', opts); comp(); };
      root.querySelector('#start').onclick = () => { if (canStart()) deal(); };
      renderNames();
    }
    function comp() {
      const n = state.names.length, w = wolvesFor(n);
      const extras = (opts.seer ? 1 : 0) + (opts.doctor ? 1 : 0);
      const el = root.querySelector('#comp');
      if (el) el.textContent = L('composition', { w, v: Math.max(0, n - w - extras), s: opts.seer ? ' · ' + L('roleSeer') : '', d: opts.doctor ? ' · ' + L('roleDoctor') : '' });
    }
    const canStart = () => state.names.length >= MIN && filled();
    function updateButtons() {
      const s = root.querySelector('#start'), add = root.querySelector('#addp'), warn = root.querySelector('#warn');
      if (s) s.disabled = !canStart();
      if (add) add.disabled = state.names.length >= MAX || !filled();
      if (warn) warn.textContent = state.names.length < MIN ? L('minPlayers', { n: MIN }) : !filled() ? t('common.fillAllNames') : '';
      comp();
    }
    function renderNames() {
      const box = root.querySelector('#names');
      const canDelete = state.names.length > MIN;
      box.innerHTML = state.names.map((nm, i) => `
        <div class="name-row">
          <input class="input" type="text" autocomplete="off" maxlength="16" aria-label="${t('common.playerN', { n: i + 1 })}" placeholder="${t('common.namePlaceholder')}" value="${esc(nm || '')}" data-i="${i}">
          ${canDelete ? `<button class="name-del" data-del="${i}" aria-label="${t('common.removeAria')}">×</button>` : ''}
        </div>`).join('');
      box.querySelectorAll('input').forEach(el => { el.oninput = () => { state.names[+el.dataset.i] = el.value; setPlayers(state.names); updateButtons(); }; });
      box.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => { state.names.splice(+b.dataset.del, 1); setPlayers(state.names); renderNames(); }; });
      updateButtons();
    }

    // ---------- 2) repartiment ----------
    function deal() {
      const names = state.names.map(s => s.trim());
      setPlayers(names);
      const n = names.length, w = wolvesFor(n);
      const roles = [...Array(w).fill('wolf'), ...(opts.seer ? ['seer'] : []), ...(opts.doctor ? ['doctor'] : [])];
      while (roles.length < n) roles.push('villager');
      const shuffled = shuffle(roles);
      g = { players: names.map((name, i) => ({ name, role: shuffled[i], alive: true })), night: 0, lastSaved: null };
      showRole(0);
    }
    // Com a L'impostor: una targeta gran amb el nom; un toc la gira i ensenya el paper,
    // un altre toc l'amaga. El botó per passar surt quan ja s'ha vist.
    function showRole(i) {
      stop();
      const p = g.players[i];
      const last = i + 1 >= g.players.length;
      const others = p.role === 'wolf' ? g.players.filter(q => q.role === 'wolf' && q !== p).map(q => q.name) : [];
      root.innerHTML = `
        ${top(`${L('roles')} · ${i + 1}/${g.players.length}`)}
        <p class="muted center" style="margin:0 0 10px">${t('common.passMobileTo')}</p>
        <div class="reveal-card tap-hint ll-reveal-card" id="card" role="button" tabindex="0" aria-label="${esc(p.name)}: ${L('seeRole')}"></div>
        <div class="spacer"></div>
        <div id="nextWrap" style="margin-top:18px"></div>`;
      const card = root.querySelector('#card');
      let shown = false, seen = false;
      const cover = () => {
        card.className = 'reveal-card tap-hint ll-reveal-card';
        card.innerHTML = `<div class="word">${esc(p.name)}</div><div class="who">${seen ? L('tapHide') : L('seeRole')}</div>`;
      };
      const reveal = () => {
        card.className = `reveal-card ll-reveal-card ll-card--${p.role}`;
        card.innerHTML = `<div class="who">${L('youAre')}</div><div class="word">${L(ROLE_KEY[p.role])}</div>
          <div class="who" style="font-weight:600">${L(DESC_KEY[p.role])}</div>
          ${others.length ? `<div class="who ll-wolves">${L('otherWolves', { names: others.map(esc).join(', ') })}</div>` : ''}`;
      };
      const toggle = () => {
        shown = !shown;
        if (shown) {
          reveal();
          if (!seen) {
            seen = true;
            root.querySelector('#nextWrap').innerHTML = `<button class="btn btn--accent" id="next">${last ? L('allReady') : L('hideRole')}</button>`;
            root.querySelector('#next').onclick = () => (last ? night() : showRole(i + 1));
          }
        } else cover();
      };
      card.onclick = toggle;
      card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
      cover();
      wireTop();
    }

    // ---------- 3) nit ----------
    const alive = () => g.players.filter(p => p.alive);
    const hasRole = (r) => alive().some(p => p.role === r);
    function narrate(title, text, { pick = null, onDone, auto = 0, clip = null } = {}) {
      stop();
      root.innerHTML = `
        ${top(title)}
        <div class="ll-night"><p class="ll-say">${text}</p>${repeatBtn()}<div id="pick"></div><div id="res"></div></div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" ${pick ? 'disabled' : ''}>${L('done')}</button>`;
      say(text, clip ? [clip] : null);
      wireTop();
      const go = root.querySelector('#go');
      go.onclick = () => onDone(go.dataset.v === undefined ? null : +go.dataset.v);
      if (pick) {
        root.querySelector('#pick').innerHTML = `<div class="ll-pick">${pick.map(i => `<button class="btn btn--outline" data-v="${i}">${esc(g.players[i].name)}</button>`).join('')}</div>`;
        root.querySelectorAll('#pick [data-v]').forEach(b => { b.onclick = () => {
          root.querySelectorAll('#pick [data-v]').forEach(x => { x.className = 'btn ' + (x === b ? 'btn--accent' : 'btn--outline'); });
          go.dataset.v = b.dataset.v; go.disabled = false;
          if (pick.onPick) pick.onPick(+b.dataset.v);
        }; });
      }
      // paper que ja no hi és: el pas dura igual però continua sol (que no es noti)
      if (auto) { go.style.visibility = 'hidden'; timer = setTimeout(() => onDone(null), auto); }
    }
    function night() {
      g.night++;
      const tonight = { victim: null, saved: null };
      const steps = [];
      steps.push(() => narrate(L('night', { n: g.night }), L('nightStart'), { onDone: next, clip: 'nit' }));
      // llops
      const preys = alive().map(p => g.players.indexOf(p)).filter(i => g.players[i].role !== 'wolf');
      steps.push(() => narrate(L('night', { n: g.night }), L('wolvesWake'), { clip: 'llops-obriu', pick: preys, onDone: (v) => { tonight.victim = v; next(); } }));
      steps.push(() => narrate(L('night', { n: g.night }), L('wolvesSleep'), { onDone: next, clip: 'llops-tanqueu' }));
      // vident
      if (opts.seer) {
        const seerAlive = hasRole('seer');
        const others = alive().map(p => g.players.indexOf(p)).filter(i => g.players[i].role !== 'seer');
        if (seerAlive) {
          const pick = others.slice();
          // una sola consulta per nit: un cop triat, la resta queda bloquejada
          pick.onPick = (v) => { root.querySelectorAll('#pick [data-v]').forEach(x => { x.disabled = +x.dataset.v !== v; }); const p = g.players[v]; root.querySelector('#res').innerHTML = `<p class="ll-seen ${p.role === 'wolf' ? 'is-wolf' : ''}">${esc(p.role === 'wolf' ? L('seerIs', { name: p.name }) : L('seerIsNot', { name: p.name }))}</p>`; };
          steps.push(() => narrate(L('night', { n: g.night }), L('seerWake'), { pick, onDone: next, clip: 'vident-obre' }));
        } else steps.push(() => narrate(L('night', { n: g.night }), L('seerWake'), { clip: 'vident-obre', onDone: next, auto: 6000 + Math.random() * 3000 }));
        steps.push(() => narrate(L('night', { n: g.night }), L('seerSleep'), { onDone: next, clip: 'vident-tanca' }));
      }
      // metge
      if (opts.doctor) {
        if (hasRole('doctor')) {
          const pick = alive().map(p => g.players.indexOf(p)).filter(i => i !== g.lastSaved);
          steps.push(() => narrate(L('night', { n: g.night }), L('doctorWake'), { clip: 'metge-obre', pick, onDone: (v) => { tonight.saved = v; next(); } }));
        } else steps.push(() => narrate(L('night', { n: g.night }), L('doctorWake'), { clip: 'metge-obre', onDone: next, auto: 5000 + Math.random() * 3000 }));
        steps.push(() => narrate(L('night', { n: g.night }), L('doctorSleep'), { onDone: next, clip: 'metge-tanca' }));
      }
      let k = 0;
      function next() { if (k < steps.length) steps[k++](); else dawn(tonight); }
      next();
    }

    // ---------- 4) dia ----------
    function dawn(tn) {
      g.lastSaved = tn.saved;
      let msg;
      if (tn.victim !== null && tn.victim !== tn.saved) {
        const p = g.players[tn.victim]; p.alive = false;
        msg = `${L('killed', { name: esc(p.name) })}<br><span class="muted">${L('wasRole', { role: L(ROLE_KEY[p.role]) })}</span>`;
      } else msg = L('saved');
      stop();
      root.innerHTML = `
        ${top(L('day', { n: g.night }))}
        <div class="ll-day"><p class="ll-say">${L('dawn')}</p><p class="ll-news">${msg}</p>${repeatBtn()}</div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="go">${L('debate')}</button>`;
      say(`${L('dawn')} ${msg.replace(/<[^>]+>/g, ' ')}`, ['dia', tn.victim !== null && tn.victim !== tn.saved ? 'victima' : 'ningu']);
      root.querySelector('#go').onclick = () => (checkWin() || vote());
      wireTop();
    }
    function vote() {
      stop();
      const list = alive().map(p => g.players.indexOf(p));
      let chosen = null;
      root.innerHTML = `
        ${top(L('day', { n: g.night }))}
        <h2 class="center" style="font-size:24px;margin:8px 0 6px">${L('voteTitle')}</h2>
        <p class="muted center" style="margin-bottom:14px">${L('voteHelp')}</p>
        <div class="ll-pick">${list.map(i => `<button class="btn btn--outline" data-v="${i}">${esc(g.players[i].name)}</button>`).join('')}</div>
        <button class="btn btn--outline" id="skip" style="margin-top:12px">${L('skipVote')}</button>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" disabled>${L('confirmVote')}</button>`;
      root.querySelectorAll('[data-v]').forEach(b => { b.onclick = () => {
        chosen = +b.dataset.v;
        root.querySelectorAll('[data-v]').forEach(x => { x.className = 'btn ' + (x === b ? 'btn--accent' : 'btn--outline'); });
        root.querySelector('#go').disabled = false;
      }; });
      root.querySelector('#skip').onclick = () => { if (!checkWin()) night(); };
      wireTop();
      root.querySelector('#go').onclick = () => {
        const p = g.players[chosen]; p.alive = false;
        root.innerHTML = `
          ${top(L('day', { n: g.night }))}
          <div class="ll-day"><p class="ll-news">${L('voteOut', { name: esc(p.name) })}<br><span class="muted">${L('wasRole', { role: L(ROLE_KEY[p.role]) })}</span></p>${repeatBtn()}</div>
          <div class="spacer"></div>
          <button class="btn btn--accent" id="go">${t('common.continue')}</button>`;
        say(`${L('voteOut', { name: p.name })} ${L('wasRole', { role: L(ROLE_KEY[p.role]) })}`, ['fora']);
        root.querySelector('#go').onclick = () => { if (!checkWin()) night(); };
        wireTop();
      };
    }
    function checkWin() {
      const a = alive(), w = a.filter(p => p.role === 'wolf').length;
      if (w === 0) { end('village'); return true; }
      if (w >= a.length - w) { end('wolves'); return true; }
      return false;
    }

    // ---------- 5) final ----------
    function end(who) {
      stop();
      const title = who === 'wolves' ? L('winWolves') : L('winVillage');
      say(title, [who === 'wolves' ? 'guanyen-llops' : 'guanya-poble']);
      root.innerHTML = `
        ${top(t('common.final'))}
        <h2 class="center" style="font-size:32px;margin:0 0 16px;color:var(--accent)">${title}</h2>
        <p class="label">${L('reveal')}</p>
        <div class="stack ll-reveal" style="--stack-gap:6px">
          ${g.players.map(p => `<div class="ll-row ${p.alive ? '' : 'is-dead'}"><span>${esc(p.name)}</span><b class="ll-r--${p.role}">${L(ROLE_KEY[p.role])}</b></div>`).join('')}
        </div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:18px;--stack-gap:12px">
          <button class="btn btn--accent" id="again">${t('common.anotherGame')}</button>
          <button class="btn btn--outline" id="home">${t('common.backHome')}</button>
        </div>`;
      root.querySelector('#again').onclick = deal;
      wireTop();
      root.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
