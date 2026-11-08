// ============================================================
// La Traca — joc de paraules per a un sol jugador.
//
// Set lletres en set petards. Es fan paraules de 4 lletres o més amb aquestes
// lletres, repetint-les tant com calgui. Cada paraula fa avançar la metxa; si
// una paraula fa servir les set lletres és un «esclat» i val més punts.
// Hi ha un repte del dia i la resta es poden jugar sense límit.
//
// Paraules: traca-reptes.js (Softcatalà, GPL/LGPL), que es carrega en obrir
// el joc perquè la portada no hagi d'esperar el fitxer.
// ============================================================

import { getRecord, setRecord } from './records.js';

const MIN_LEN = 4;
const SITE = 'https://luchinrok.github.io/Xala/';

// Rangs: percentatge dels punts de les paraules comunes.
const RANKS = [
  { at: 0, name: 'Espurna' },
  { at: 5, name: 'Bengala' },
  { at: 15, name: 'Petard' },
  { at: 30, name: 'Coet' },
  { at: 50, name: 'Traca' },
  { at: 75, name: 'Castell de focs' },
];

// Sense accents, sense punt volat i la ç com a c.
export function norm(w) {
  return w.normalize('NFD').replace(/[̀-ͯ·]/g, '').replace(/ç/g, 'c').toLowerCase();
}
const usesAll = (n, letters) => [...letters].every(l => n.includes(l));
// 4 lletres, 1 punt; cada lletra de més, 1 punt més; un esclat, 7 més.
export function pointsFor(n, letters) {
  return n.length - MIN_LEN + 1 + (usesAll(n, letters) ? 7 : 0);
}
export function rankFor(pct) {
  let r = RANKS[0];
  for (const x of RANKS) if (pct >= x.at) r = x;
  return r;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
// El mateix repte per a tothom cada dia (97 i 365 no tenen divisors comuns:
// es recorren tots abans de repetir).
export function dailyIndex(total, iso = today()) {
  return ((dayNumber(iso) * 97) % total + total) % total;
}

export default {
  id: 'traca',
  title: 'La Traca',
  tagline: 'Fes paraules i encén la metxa',
  accent: '#E4572E',
  color: 'var(--accent)',
  ready: true,

  instructions: [
    'Fes paraules de 4 lletres o més amb els set petards. Pots repetir les lletres tant com vulguis.',
    'No cal posar accents, i la C també val per a la Ç.',
    'Cada paraula fa avançar la metxa. Si fa servir les set lletres, és un esclat i val 7 punts més.',
    'Cada dia hi ha un repte nou, i en tens molts més per jugar sense límit.',
    'Tria la teva variant (central, valencià o balear): només valen les formes generals i les de la teva variant.',
    'Amb teclat: escriu la paraula i prem Enter.',
    'Paraules del diccionari de Softcatalà.',
  ],

  mount(root, { goHome }) {
    let REPTES = null;
    let num = 0;
    let isDaily = false;
    let letters = '';
    let order = [];        // ordre dels petards a la pantalla
    let words = new Map(); // normalitzada -> com s'escriu
    let goal = 1;          // punts de les paraules comunes
    let found = [];        // normalitzades, de més nova a més antiga
    let current = '';
    let statusTimer = null;

    const saveKey = () => 'traca:' + num;
    // Variant del català: només valen les formes generals i les d'aquesta variant.
    const VARIANTS = [['c', 'Central'], ['v', 'Valencià'], ['b', 'Balear']];
    let variant = getRecord('traca:variant');
    if (!VARIANTS.some(([id]) => id === variant)) variant = 'c';

    function leave() {
      document.removeEventListener('keydown', onKey);
      goHome();
    }

    // ---------- 1) inici ----------
    async function start() {
      root.innerHTML = '<button class="back" id="back">‹ Enrere</button><p class="muted center" style="margin-top:40px">Preparant els petards…</p>';
      root.querySelector('#back').onclick = leave;
      try {
        REPTES = (await import('./traca-reptes.js')).default;
      } catch (e) {
        if (!root.isConnected) return;
        root.innerHTML = `<button class="back" id="back">‹ Enrere</button>
          <p class="muted center" style="margin:40px 0 20px">No s'han pogut carregar les paraules. Mira la connexió.</p>
          <button class="btn btn--accent" id="retry">Torna-hi</button>`;
        root.querySelector('#back').onclick = leave;
        root.querySelector('#retry').onclick = start;
        return;
      }
      if (root.isConnected) screenConfig();
    }

    function nextFree() {
      const n = getRecord('traca:next');
      return Number.isInteger(n) ? n % REPTES.length : 0;
    }

    function dailyStreak() {
      const s = getRecord('traca:streak') || {};
      const t = today();
      const alive = s.last === t || (s.last && dayNumber(t) - dayNumber(s.last) === 1);
      return { doneToday: s.last === t, n: alive ? s.n || 0 : 0 };
    }

    function screenConfig() {
      document.removeEventListener('keydown', onKey);
      const st = dailyStreak();
      const dn = dailyIndex(REPTES.length);
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">La Traca</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Fes paraules i encén la metxa</h2>

        <button class="mat2-daily" id="daily">
          <span class="mat2-daily__k">Repte del dia · #${dn + 1}</span>
          <span class="mat2-daily__t">${st.doneToday ? 'Encesa! Continua-la' : 'Encén la d\'avui'}</span>
          <span class="mat2-daily__s">${st.n ? (st.n === 1 ? 'Ratxa: 1 dia' : `Ratxa: ${st.n} dies seguits`) : 'Arriba a Bengala cada dia i fes ratxa'}</span>
        </button>

        <p class="label" style="margin:26px 0 12px">Reptes sense límit</p>
        <p class="muted">Repte ${nextFree() + 1} de ${REPTES.length}</p>

        <p class="label" style="margin:26px 0 12px">La teva variant</p>
        <div class="btn-row" id="variants">
          ${VARIANTS.map(([id, name]) => `<button class="btn ${variant === id ? 'btn--accent' : 'btn--outline'}" data-mode="${id}">${name}</button>`).join('')}
        </div>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelector('#daily').onclick = () => openPuzzle(dn, true);
      root.querySelector('#start').onclick = () => openPuzzle(nextFree(), false);
      root.querySelectorAll('#variants [data-mode]').forEach(b => {
        b.onclick = () => { variant = b.dataset.mode; setRecord('traca:variant', variant); screenConfig(); };
      });
    }

    // ---------- 2) el repte ----------
    function openPuzzle(n, daily) {
      num = n;
      isDaily = daily;
      const [set, nCommon, list] = REPTES[n];
      letters = set;
      order = shuffled([...set]);
      words = new Map();
      goal = 0;
      list.split(' ').forEach((entry, i) => {
        // «paraula~v»: només val en les variants indicades (c, v, b)
        const [w, only] = entry.split('~');
        if (only && !only.includes(variant)) return;
        const k = norm(w);
        words.set(k, w);
        if (i < nCommon) goal += pointsFor(k, letters);
      });
      goal = Math.max(goal, 1);
      const saved = getRecord(saveKey());
      found = Array.isArray(saved) ? saved.filter(k => words.has(k)) : [];
      current = '';
      screenGame();
    }

    function shuffled(a) {
      const out = a.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }

    const score = () => found.reduce((s, k) => s + pointsFor(k, letters), 0);
    const pct = () => Math.min(100, Math.round(score() / goal * 100));

    function screenGame() {
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="rank"></div>
        </div>
        <div class="traca-fuse" id="fuse" role="img">
          <span class="traca-fuse__burnt" id="burnt"></span>
          <span class="traca-fuse__spark" id="spark" aria-hidden="true"></span>
        </div>
        <p class="traca-info" id="info"></p>
        <div class="traca-word" id="word" aria-live="polite"></div>
        <p class="traca-status" id="status" aria-live="polite"></p>
        <div class="traca-petards" id="petards"></div>
        <div class="btn-row" style="margin-top:18px">
          <button class="btn btn--outline" id="del">Esborra</button>
          <button class="btn btn--outline" id="mix">Barreja</button>
          <button class="btn btn--accent" id="fire">Encén</button>
        </div>
        <div class="traca-found" id="found"></div>
        <div class="btn-row" style="margin-top:18px">
          <button class="btn btn--outline" id="share">Repta</button>
          <button class="btn btn--outline" id="next">Un altre</button>
        </div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#del').onclick = delLetter;
      root.querySelector('#mix').onclick = () => { order = shuffled(order); renderPetards(); };
      root.querySelector('#fire').onclick = submit;
      root.querySelector('#share').onclick = share;
      root.querySelector('#next').onclick = () => {
        const n = isDaily ? nextFree() : (num + 1) % REPTES.length;
        if (!isDaily) setRecord('traca:next', n);
        openPuzzle(n, false);
      };
      document.removeEventListener('keydown', onKey);
      document.addEventListener('keydown', onKey);
      renderPetards();
      renderWord();
      renderProgress();
      renderFound();
    }

    function renderPetards() {
      const box = root.querySelector('#petards');
      box.innerHTML = order.map(l =>
        `<button class="traca-petard" data-l="${l}" aria-label="Lletra ${l.toUpperCase()}"><span>${l.toUpperCase()}</span></button>`).join('');
      box.querySelectorAll('.traca-petard').forEach(b => {
        b.onclick = (e) => {
          addLetter(b.dataset.l);
          // amb el dit o el ratolí no es queda enfocat: així Enter sempre encén
          if (e.detail > 0) b.blur();
        };
      });
    }

    function renderWord() {
      const el = root.querySelector('#word');
      if (el) el.textContent = current.toUpperCase();
    }

    function renderProgress() {
      const p = pct();
      const r = rankFor(p);
      root.querySelector('#rank').textContent = r.name;
      root.querySelector('#burnt').style.width = p + '%';
      root.querySelector('#spark').style.left = p + '%';
      root.querySelector('#fuse').setAttribute('aria-label', `Metxa encesa al ${p} per cent. Rang: ${r.name}.`);
      const nxt = RANKS.find(x => x.at > p);
      root.querySelector('#info').textContent = `${score()} ${score() === 1 ? 'punt' : 'punts'}${nxt ? ` · Pròxim: ${nxt.name}` : ' · Has arribat al final!'}`;
    }

    function renderFound() {
      const el = root.querySelector('#found');
      const list = found.slice().sort((a, b) => a.localeCompare(b));
      el.innerHTML = `
        <p class="label" style="margin:22px 0 10px">${found.length} ${found.length === 1 ? 'paraula' : 'paraules'}</p>
        <div class="traca-list">${list.map(k =>
          `<span class="traca-chip${usesAll(k, letters) ? ' traca-chip--esclat' : ''}">${words.get(k)}</span>`).join('')}</div>`;
    }

    function setStatus(txt, good) {
      const el = root.querySelector('#status');
      if (!el) return;
      el.textContent = txt;
      el.classList.toggle('traca-status--good', !!good);
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => { if (el.isConnected) el.textContent = ''; }, 1800);
    }

    function addLetter(l) {
      if (current.length >= 20) return;
      current += l;
      renderWord();
    }
    function delLetter() {
      current = current.slice(0, -1);
      renderWord();
    }

    function submit() {
      const w = current;
      current = '';
      renderWord();
      if (!w) return;
      if (w.length < MIN_LEN) { setStatus('Com a mínim, 4 lletres'); return; }
      if (found.includes(w)) { setStatus('Aquesta ja la tens'); return; }
      if (!words.has(w)) { setStatus('No la tenim al diccionari'); return; }
      const before = rankFor(pct());
      found.unshift(w);
      setRecord(saveKey(), found);
      const pts = pointsFor(w, letters);
      const after = rankFor(pct());
      if (isDaily && pct() >= 5) markDaily();
      if (usesAll(w, letters)) setStatus(`Esclat! +${pts}`, true);
      else if (after !== before) setStatus(`${after.name}! +${pts}`, true);
      else setStatus(`${words.get(w)} +${pts}`, true);
      popPetards();
      renderProgress();
      renderFound();
    }

    function markDaily() {
      const s = getRecord('traca:streak') || {};
      const t = today();
      if (s.last === t) return;
      const n = s.last && dayNumber(t) - dayNumber(s.last) === 1 ? (s.n || 0) + 1 : 1;
      setRecord('traca:streak', { last: t, n });
    }

    function popPetards() {
      const box = root.querySelector('#petards');
      box.classList.remove('pop');
      void box.offsetWidth;
      box.classList.add('pop');
    }

    function onKey(e) {
      if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') {
        // Enter sobre un botó enfocat fa la seva feina; si no, encén.
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        submit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        delLetter();
      } else if (e.key.length === 1) {
        const l = norm(e.key);
        if (!/^[a-z]$/.test(l)) return;
        if (letters.includes(l)) addLetter(l);
        else setStatus(`La ${l.toUpperCase()} no hi és`);
      }
    }

    async function share() {
      const r = rankFor(pct());
      const text = `La Traca${isDaily ? ' del dia' : ''} #${num + 1}: ${found.length} ${found.length === 1 ? 'paraula' : 'paraules'} i ${score()} ${score() === 1 ? 'punt' : 'punts'}. Arribo a ${r.name}. Em superes?`;
      try {
        if (navigator.share) { await navigator.share({ text, url: SITE }); return; }
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
      try {
        await navigator.clipboard.writeText(`${text} ${SITE}`);
        setStatus('Copiat! Enganxa-ho on vulguis', true);
      } catch (e) {
        setStatus('No s\'ha pogut compartir');
      }
    }

    start();
  },
};
