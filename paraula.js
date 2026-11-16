// ============================================================
// La paraula del dia — joc d'un sol jugador (del tipus «endevina la paraula»).
//
// Una paraula de 5 lletres cada dia, la mateixa per a tothom, en 6 intents.
// Verd: lletra al seu lloc; groc: hi és però en un altre lloc; gris: no hi és.
// Els accents no compten. Es pot compartir el resultat sense desvelar la paraula
// i, un cop feta, practicar amb paraules a l'atzar.
// ============================================================

import { LEN, TRIES, norm, isValid, pretty, dayNumber, wordOfDay, randomWord, score, keyStates, shareText } from './paraula-motor.js';
import { getRecord, setRecord } from './records.js';

const ROWS = ['qwertyuiop', 'asdfghjklç', '⌫zxcvbnm↵'];
const LINK = 'https://luchinrok.github.io/Xala/';
// icona de retorn per a «Envia» (la paraula no hi cabia a les pantalles petites)
const ENTER = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M20 5v6a3 3 0 0 1-3 3H5"/><path d="M9 10l-4 4 4 4"/></svg>';
// icona d'esborrar (com la dels teclats dels mòbils)
const BACK = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M21 5H9l-6 7 6 7h12z"/><path d="M17 9l-5 6M12 9l5 6"/></svg>';

export default {
  id: 'paraula',
  title: 'La paraula del dia',
  tagline: 'Endevina la paraula en sis intents',
  accent: '#E4572E',
  color: 'var(--accent)',
  ready: true,

  instructions: [
    'Cada dia hi ha una paraula nova de 5 lletres, la mateixa per a tothom. Tens 6 intents per endevinar-la.',
    'Escriu una paraula que existeixi i prem ↵. Cada lletra es pinta: verd si és al seu lloc, groc si hi és però en un altre lloc, i gris si no hi és.',
    'Els accents no compten: escriu sense. La ç sí que compta.',
    'Quan l\'encertis, pots compartir el resultat (només els colors, sense la paraula) i practicar amb paraules a l\'atzar.',
  ],

  mount(root, { goHome }) {
    let mode = 'day';            // 'day' | 'free'
    let n = dayNumber();
    let answer = wordOfDay(n);
    let guesses = [], typing = '', over = false, won = false, busy = false;

    const saveKey = () => 'paraula:dia:' + n;
    function load() {
      const st = mode === 'day' ? getRecord(saveKey()) : null;
      guesses = (st && Array.isArray(st.g)) ? st.g : [];
      over = !!(st && st.over); won = !!(st && st.won);
    }
    function save() { if (mode === 'day') setRecord(saveKey(), { g: guesses, over, won }); }
    const stats = () => Object.assign({ played: 0, won: 0, streak: 0, best: 0, last: 0, dist: [0, 0, 0, 0, 0, 0] }, getRecord('paraula:stats') || {});

    function stop() { document.removeEventListener('keydown', onKey); }
    function leave() { stop(); goHome(); }

    function start(m) {
      stop();
      mode = m;
      if (m === 'day') { n = dayNumber(); answer = wordOfDay(n); } else answer = randomWord();
      typing = ''; load();
      if (m === 'free') { guesses = []; over = won = false; }
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score">${m === 'day' ? `Dia ${n}` : 'Pràctica'}</div>
        </div>
        <p class="traca-status" id="status" aria-live="polite"></p>
        <div class="pw-grid" id="grid" role="grid" aria-label="Intents"></div>
        <div class="pw-keys" id="keys"></div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelector('#keys').addEventListener('click', (e) => {
        const k = e.target.closest('[data-k]');
        if (k) press(k.dataset.k);
      });
      document.addEventListener('keydown', onKey);
      render();
      if (over) finish(false);
      else if (m === 'day' && !guesses.length) setStatus('Escriu una paraula de 5 lletres');
    }

    function onKey(e) {
      if (!root.isConnected) { stop(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Enter') { e.preventDefault(); press('↵'); }
      else if (e.key === 'Backspace') { e.preventDefault(); press('⌫'); }
      else if (/^[a-zA-Zçàèéíïòóúü]$/.test(e.key)) press(norm(e.key));
    }

    function press(k) {
      if (over || busy) return;
      if (k === '⌫') typing = typing.slice(0, -1);
      else if (k === '↵') return submit();
      else if ([...typing].length < LEN) typing += k;
      setStatus('');
      renderRow(guesses.length);
    }

    function submit() {
      if ([...typing].length < LEN) { setStatus('Hi falten lletres'); shake(); return; }
      if (!isValid(typing)) { setStatus('Aquesta paraula no és al diccionari'); shake(); return; }
      const g = pretty(typing);
      guesses.push(g); typing = '';
      won = norm(g) === norm(answer);
      over = won || guesses.length >= TRIES;
      save();
      busy = true;
      renderRow(guesses.length - 1, true);
      setTimeout(() => {
        busy = false;
        renderKeys();
        if (over) { if (mode === 'day') record(); finish(true); }
      }, LEN * 180 + 250);
    }

    function record() {
      const st = stats();
      if (st.last === n) return;
      st.played++;
      if (won) {
        st.won++; st.dist[guesses.length - 1]++;
        st.streak = st.lastWon === n - 1 ? st.streak + 1 : 1; // ratxa: dies seguits encertats
        st.lastWon = n;
      } else st.streak = 0;
      st.best = Math.max(st.best, st.streak);
      st.last = n;
      setRecord('paraula:stats', st);
    }

    function setStatus(t) { const el = root.querySelector('#status'); if (el) el.textContent = t; }
    function shake() {
      const row = root.querySelector(`.pw-row[data-r="${guesses.length}"]`);
      if (!row) return;
      row.classList.remove('pw-shake'); void row.offsetWidth; row.classList.add('pw-shake');
    }

    // ---------- dibuix ----------
    function render() {
      const grid = root.querySelector('#grid');
      grid.innerHTML = Array.from({ length: TRIES }, (_, r) => `<div class="pw-row" data-r="${r}" role="row"></div>`).join('');
      for (let r = 0; r < TRIES; r++) renderRow(r);
      renderKeys();
    }
    function renderRow(r, flip) {
      const row = root.querySelector(`.pw-row[data-r="${r}"]`);
      if (!row) return;
      const done = r < guesses.length;
      const word = done ? [...norm(guesses[r])] : r === guesses.length ? [...typing] : [];
      const sc = done ? score(guesses[r], answer) : null;
      row.innerHTML = Array.from({ length: LEN }, (_, i) => {
        const c = word[i] || '';
        const cls = sc ? ` pw-${sc[i]}` : c ? ' pw-typed' : '';
        const label = sc ? `${c.toUpperCase()}: ${{ ok: 'al seu lloc', hi: 'en un altre lloc', no: 'no hi és' }[sc[i]]}` : c.toUpperCase();
        return `<div class="pw-tile${cls}${flip ? ' pw-flip' : ''}" style="${flip ? `animation-delay:${i * 180}ms` : ''}" role="gridcell" aria-label="${label}">${c.toUpperCase()}</div>`;
      }).join('');
    }
    function renderKeys() {
      const ks = keyStates(guesses, answer);
      root.querySelector('#keys').innerHTML = ROWS.map(row => `<div class="pw-krow">${[...row].map(k => {
        const wide = k === '⌫' || k === '↵';
        const lab = k === '⌫' ? 'Esborra' : k === '↵' ? 'Envia' : k.toUpperCase();
        const face = k === '↵' ? ENTER : k === '⌫' ? BACK : k.toUpperCase();
        return `<button class="pw-key${wide ? ' pw-key--wide' : ''}${k === '↵' ? ' pw-key--enter' : ''}${ks[k] ? ' pw-' + ks[k] : ''}" data-k="${k}" aria-label="${lab}">${face}</button>`;
      }).join('')}</div>`).join('');
    }

    // ---------- final ----------
    function finish(fresh) {
      const st = stats();
      const word = pretty(answer);
      setStatus(won ? ['Increïble!', 'Fantàstic!', 'Molt bé!', 'Bé!', 'Uf, per poc!', 'Just a temps!'][guesses.length - 1] : `Era «${word}»`);
      root.querySelector('#keys').style.display = 'none';
      const box = root.querySelector('#endbox');
      const daily = mode === 'day';
      box.innerHTML = `
        <div class="panel center stack" style="--stack-gap:6px">
          <h2 style="color:var(--accent)">${won ? `${word.toUpperCase()}` : `Era ${word.toUpperCase()}`}</h2>
          <p class="muted">${daily ? `Ratxa: ${st.streak} ${st.streak === 1 ? 'dia' : 'dies'} · ${st.won} de ${st.played} encertades` : 'Pràctica'} · <a href="https://dlc.iec.cat/Results?DecEntradaText=${encodeURIComponent(word)}" target="_blank" rel="noopener">Què vol dir?</a></p>
        </div>
        <div class="stack">
          ${daily ? '<button class="btn btn--accent" id="share">Comparteix</button>' : '<button class="btn btn--accent" id="again">Una altra</button>'}
          ${daily ? '<button class="btn btn--outline" id="free">Practica</button>' : '<button class="btn btn--outline" id="day">La del dia</button>'}
          <button class="btn btn--outline" id="home">Sortir</button>
        </div>`;
      const sh = box.querySelector('#share');
      if (sh) sh.onclick = async () => {
        const text = shareText(n, guesses, answer, won) + '\n' + LINK;
        try {
          if (navigator.share) await navigator.share({ text });
          else { await navigator.clipboard.writeText(text); sh.textContent = 'Copiat!'; }
        } catch (e) { /* cancel·lat */ }
      };
      const again = box.querySelector('#again'); if (again) again.onclick = () => start('free');
      const free = box.querySelector('#free'); if (free) free.onclick = () => start('free');
      const day = box.querySelector('#day'); if (day) day.onclick = () => start('day');
      box.querySelector('#home').onclick = leave;
    }

    start('day');
  },
};
