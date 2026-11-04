// ============================================================
// board-keys.js — jugar als taulers amb teclat.
// El tauler rep el focus (un sol pas de tabulador) i porta un cursor:
// fletxes per moure'l, Enter o Espai per actuar. El focus és al
// contenidor, així sobreviu quan el joc refà les caselles.
//   keyboardGrid(el, { rows, cols, label, start, activate, move, leave,
//                      key, describe })
//     start: [r,c] o funció; activate(r,c): Enter/Espai;
//     move(r,c): en moure el cursor; leave(): en perdre el focus;
//     key(e,r,c): altres tecles, retorna true si l'ha gestionada;
//     describe(r,c): text per al lector de pantalla.
//   Retorna { cursor(), announce(text) }.
// ============================================================

let keyboardLast = false;
window.addEventListener('keydown', () => { keyboardLast = true; }, true);
window.addEventListener('pointerdown', () => { keyboardLast = false; }, true);

// Si la persona va amb teclat, porta-hi el focus (en canviar de pantalla
// el focus es perd i tornaria a començar des de dalt de tot).
export function focusIfKeyboard(el) {
  if (el && keyboardLast) el.focus();
}

const STEP = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

export function keyboardGrid(el, opts) {
  const { rows, cols, label } = opts;
  let cur = typeof opts.start === 'function' ? opts.start() : (opts.start || [0, 0]);
  let active = false;

  el.tabIndex = 0;
  el.setAttribute('role', 'application');
  el.setAttribute('aria-label', label);
  const live = document.createElement('span');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  el.insertAdjacentElement('afterend', live);
  const announce = (txt) => { live.textContent = txt; };

  function paint() {
    const old = el.querySelector(':scope > .kb-cursor');
    if (old) old.classList.remove('kb-cursor');
    if (!active) return;
    const cell = el.children[cur[0] * cols + cur[1]];
    if (cell) cell.classList.add('kb-cursor');
  }
  function show() {
    active = true;
    paint();
    if (opts.move) opts.move(cur[0], cur[1]);
    if (opts.describe) announce(opts.describe(cur[0], cur[1]));
  }
  function hide() {
    if (!active) return;
    active = false;
    paint();
    if (opts.leave) opts.leave();
  }

  // Els jocs refan les caselles sovint: el cursor s'hi torna a pintar.
  new MutationObserver(paint).observe(el, { childList: true });

  el.addEventListener('focus', () => { if (keyboardLast) show(); });
  el.addEventListener('blur', hide);
  el.addEventListener('pointerdown', hide);
  el.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target !== el) return;
    const step = STEP[e.key];
    if (step) {
      e.preventDefault();
      cur = [
        Math.min(rows - 1, Math.max(0, cur[0] + step[0])),
        Math.min(cols - 1, Math.max(0, cur[1] + step[1])),
      ];
      show();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (e.repeat) return;
      if (!active) { show(); return; }
      opts.activate(cur[0], cur[1]);
      return;
    }
    if (opts.key && opts.key(e, cur[0], cur[1])) e.preventDefault();
  });

  focusIfKeyboard(el);
  return { cursor: () => cur, announce };
}
