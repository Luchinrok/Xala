// ============================================================
// ranking.js — rànquing general per joc (Supabase, taula «punts» i vista
// «millors»: la millor puntuació de cada mòbil per joc i variant).
//
// · submitScore(joc, variant, punts): l'envia. Sense connexió o sense nom,
//   es guarda al mòbil i s'envia més tard (en tornar la xarxa o en posar nom).
// · openRanking({ joc, title, variants, variant, fmt }): mostra el rànquing en
//   una finestra per sobre del joc, amb una pestanya per variant.
// La clau és la «publishable» (pública): pot anar dins l'app.
// ============================================================

const URL = 'https://fpnzlfxlpjovldlrxtav.supabase.co/rest/v1';
const KEY = 'sb_publishable_-mPBmnwKvDFa6JL3j5U5Xw_FzBFVBzb';
const LS = { name: 'xala:nom', device: 'xala:aparell', queue: 'xala:pendents' };

const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* */ } };

export const getName = () => get(LS.name) || '';
export function setName(n) {
  const clean = String(n || '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (clean.length < 2) return false;
  set(LS.name, clean);
  flush();
  return true;
}
function device() {
  let d = get(LS.device);
  if (!d) {
    const a = new Uint8Array(12);
    (crypto && crypto.getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.random() * 256; }));
    d = Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
    set(LS.device, d);
  }
  return d;
}
const queue = () => { try { return JSON.parse(get(LS.queue)) || []; } catch (e) { return []; } };
const saveQueue = (q) => set(LS.queue, JSON.stringify(q.slice(-40)));

// Guarda la puntuació per enviar (només la millor pendent de cada joc i variant).
export function submitScore(joc, variant, punts) {
  if (!Number.isFinite(punts) || punts <= 0) return;
  const q = queue();
  const i = q.findIndex(x => x.joc === joc && x.variant === (variant || ''));
  if (i >= 0) { if (q[i].punts >= punts) return flush(); q.splice(i, 1); }
  q.push({ joc, variant: variant || '', punts: Math.round(punts) });
  saveQueue(q);
  flush();
}

let flushing = false;
export async function flush() {
  if (flushing || !getName() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  flushing = true;
  try {
    let q = queue();
    for (const item of [...q]) {
      const res = await fetch(`${URL}/punts`, {
        method: 'POST',
        headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ ...item, nom: getName(), aparell: device() }),
      });
      // 201: enviada; 400: no vàlida (no cal tornar-ho a provar). Altres: més tard.
      if (res.ok || res.status === 400) { q = q.filter(x => x !== item); saveQueue(q); }
      else break;
    }
  } catch (e) { /* sense xarxa: es tornarà a provar */ } finally { flushing = false; }
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', flush);
  setTimeout(flush, 3000);
}

const filt = (joc, variant) => `joc=eq.${encodeURIComponent(joc)}&variant=eq.${encodeURIComponent(variant || '')}`;

// La meva millor puntuació (pel nom) i la meva posició: 1 + quants en tenen més.
export async function fetchMine(joc, variant, name) {
  if (!name) return null;
  const res = await fetch(`${URL}/millors?select=nom,punts&${filt(joc, variant)}&nom=eq.${encodeURIComponent(name)}&order=punts.desc&limit=1`, { headers: { apikey: KEY } });
  if (!res.ok) return null;
  const [me] = await res.json();
  if (!me) return null;
  const c = await fetch(`${URL}/millors?select=nom&${filt(joc, variant)}&punts=gt.${me.punts}`, { headers: { apikey: KEY, Prefer: 'count=exact', Range: '0-0' } });
  const total = +((c.headers.get('Content-Range') || '').split('/')[1]);
  return { ...me, pos: Number.isFinite(total) ? total + 1 : null };
}

export async function fetchTop(joc, variant, limit = 10) {
  const q = `select=nom,punts&joc=eq.${encodeURIComponent(joc)}&variant=eq.${encodeURIComponent(variant || '')}&order=punts.desc,creat.asc&limit=${limit}`;
  const res = await fetch(`${URL}/millors?${q}`, { headers: { apikey: KEY } });
  if (!res.ok) throw new Error('rànquing ' + res.status);
  return res.json();
}

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const rankingButton = (id = 'rank', extra = '') => `<button class="btn btn--outline" id="${id}" ${extra}>🏆 Rànquing</button>`;

// Finestra del rànquing. variants: [{ id, name }] (pot ser buida).
export function openRanking({ joc, title, variants = [], variant, fmt = (p) => p }) {
  let cur = variant !== undefined ? variant : (variants[0] ? variants[0].id : '');
  const box = document.createElement('div');
  box.className = 'rank-overlay';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', `Rànquing de ${title}`);
  document.body.appendChild(box);
  const close = () => { box.remove(); document.removeEventListener('keydown', onEsc); };
  const onEsc = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onEsc);

  async function render() {
    const name = getName(), pend = queue().length;
    box.innerHTML = `
      <div class="rank-sheet">
        <div class="rank-head">
          <div><p class="kicker">Rànquing</p><h2>${esc(title)}</h2></div>
          <button class="btn btn--outline rank-close" id="rk-close" aria-label="Tanca">✕</button>
        </div>
        ${variants.length > 1 ? `<div class="rank-tabs">${variants.map(v => `<button class="btn ${v.id === cur ? 'btn--accent' : 'btn--outline'}" data-v="${v.id}">${esc(v.name)}</button>`).join('')}</div>` : ''}
        <ol class="rank-list" id="rk-list"><li class="muted">Carregant…</li></ol>
        <form class="rank-name" id="rk-form">
          <label for="rk-nom">${name ? 'El teu nom al rànquing' : 'Posa\'t un nom per sortir al rànquing'}</label>
          <div class="rank-name__row">
            <input id="rk-nom" maxlength="16" autocomplete="nickname" placeholder="Un nom o un sobrenom" value="${esc(name)}">
            <button class="btn btn--accent" type="submit">Desa</button>
          </div>
          <p class="muted" id="rk-msg">${pend ? `Tens ${pend} ${pend === 1 ? 'puntuació' : 'puntuacions'} per enviar${name ? ' (quan hi hagi connexió)' : ''}.` : 'Millor un sobrenom que el nom real.'}</p>
        </form>
      </div>`;
    box.querySelector('#rk-close').onclick = close;
    box.querySelectorAll('[data-v]').forEach(b => { b.onclick = () => { cur = b.dataset.v; render(); }; });
    box.querySelector('#rk-form').onsubmit = (e) => {
      e.preventDefault();
      const ok = setName(box.querySelector('#rk-nom').value);
      box.querySelector('#rk-msg').textContent = ok ? 'Desat!' : 'El nom ha de tenir entre 2 i 16 lletres.';
      if (ok) setTimeout(render, 900);
    };
    const list = box.querySelector('#rk-list');
    try {
      // els 10 primers i, si no hi ets, la teva posició a sota
      const [rows, mine] = await Promise.all([fetchTop(joc, cur, 10), fetchMine(joc, cur, name).catch(() => null)]);
      if (!box.isConnected) return;
      const row = (pos, r, me) => `<li class="${me ? 'rank-me' : ''}"><span class="rank-pos">${pos ?? '–'}</span><span class="rank-nom">${esc(r.nom)}</span><span class="rank-pts">${esc(fmt(r.punts))}</span></li>`;
      const inTop = rows.some(r => r.nom === name);
      list.innerHTML = rows.length
        ? rows.map((r, i) => row(i + 1, r, r.nom === name)).join('')
          + (mine && !inTop ? `<li class="rank-gap" aria-hidden="true">···</li>${row(mine.pos, mine, true)}` : '')
        : '<li class="muted">Encara no hi ha ningú. Sigues el primer!</li>';
    } catch (e) {
      if (box.isConnected) list.innerHTML = '<li class="muted">Sense connexió: el rànquing es veu quan hi ha internet.</li>';
    }
  }
  render();
}
