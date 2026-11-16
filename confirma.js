// ============================================================
// confirma.js — pregunta abans de fer una cosa que no es pot desfer
// (p. ex. sortir d'una partida a mitges). Finestra per sobre del joc.
//   if (await confirma({ text, yes, no })) { ... }
// ============================================================

import { t } from './i18n.js';

export function confirma({ text, yes, no }) {
  return new Promise((resolve) => {
    const box = document.createElement('div');
    box.className = 'rank-overlay';
    box.setAttribute('role', 'alertdialog');
    box.innerHTML = `
      <div class="rank-sheet" style="text-align:center">
        <h2 style="font-size:22px;margin:6px 0 4px">${text}</h2>
        <div class="stack" style="--stack-gap:10px;margin-top:10px">
          <button class="btn btn--accent" data-a="no">${no}</button>
          <button class="btn btn--outline" data-a="yes">${yes}</button>
        </div>
      </div>`;
    const done = (v) => { box.remove(); document.removeEventListener('keydown', esc); resolve(v); };
    const esc = (e) => { if (e.key === 'Escape') done(false); };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]');
      if (b) done(b.dataset.a === 'yes');
      else if (e.target === box) done(false);
    });
    document.addEventListener('keydown', esc);
    document.body.appendChild(box);
    box.querySelector('[data-a="no"]').focus();
  });
}

// ---------- no perdre la partida ----------
// La pantalla d'una partida en marxa porta un element amb data-guard (sovint el
// mateix botó «Enrere»). L'app (app.js) ho mira en tocar «Enrere» o fer el gest
// enrere del mòbil i, si és a mitges, pregunta abans de sortir. Amb el plafó del
// final (#endbox o #result amb contingut) ja no pregunta. Un botó .back amb
// data-safe no fa perdre res (no pregunta). setGuard(fn) hi afegeix una condició.
let guardFn = null;
export function setGuard(fn) { guardFn = fn || null; }
export function guarded() {
  try {
    if (!document.querySelector('#app [data-guard]')) return false;
    if (document.querySelector('#endbox > *, #result > *')) return false;
    return guardFn ? !!guardFn() : true;
  } catch (e) { return false; }
}
export function askLeave() {
  return confirma({ text: t('common.leaveGame'), yes: t('common.leave'), no: t('common.keepPlaying') });
}
