// ============================================================
// confirma.js — pregunta abans de fer una cosa que no es pot desfer
// (p. ex. sortir d'una partida a mitges). Finestra per sobre del joc.
//   if (await confirma({ text, yes, no })) { ... }
// ============================================================

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
