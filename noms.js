// ============================================================
// noms.js — noms dels dos jugadors als jocs per a dos.
//
// Els noms es desen una sola vegada (xala:noms2) i serveixen per a tots
// els jocs per a dos. Si un nom és buit, el joc fa servir el de sempre
// («Corall», «Blanques», «Jugador 1»…).
//
//   namesField(labels, colors) -> HTML dels dos camps (pantalla de configuració)
//   bindNames(root)            -> desa els noms mentre s'escriuen
//   playerName(i)              -> el nom del jugador i (0 o 1), o ''
//   nameOr(i, fallback)        -> el nom, o el text de sempre si no n'hi ha
//   turnText(i, fallback)      -> «Marta, et toca» o el text de sempre
//   winText(i, fallback)       -> «Guanya Marta!» o el text de sempre
//   de(nom)                    -> «de Marta» / «d'Anna»
// Els noms no poden tenir < > & " ` (es treuen), així es poden posar tal qual
// dins d'HTML, d'atributs entre cometes dobles i d'aria-label.
// ============================================================

const KEY = 'xala:noms2';
const MAX = 14;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? [String(v[0] || ''), String(v[1] || '')] : ['', ''];
  } catch (e) {
    return ['', ''];
  }
}
function write(names) {
  try { localStorage.setItem(KEY, JSON.stringify(names)); } catch (e) { /* sense persistència */ }
}

const clean = (s) => String(s).replace(/[<>&"`]/g, '');
export const playerName = (i) => clean(read()[i]).trim().slice(0, MAX);
export const nameOr = (i, fallback) => playerName(i) || fallback;
export const turnText = (i, fallback) => (playerName(i) ? `${playerName(i)}, et toca` : fallback);
// «de» davant d'un nom, amb apòstrof si cal: de('Marta') → «de Marta», de('Anna') → «d'Anna».
export const de = (name) => (/^h?[aeiouàèéíòóúAEIOUÀÈÉÍÒÓÚ]/.test(name) && !/^h?[iuIU][aeiouàèéíòóú]/.test(name) ? `d'${name}` : `de ${name}`);
export const winText = (i, fallback) => (playerName(i) ? `Guanya ${playerName(i)}!` : fallback);

// labels: el nom de sempre de cada jugador (fa de placeholder), p. ex. ['Corall', 'Verd'].
// colors: el color de la fitxa de cada jugador (opcional), es veu com un punt al costat.
export function namesField(labels, colors = []) {
  const names = read();
  return `
    <p class="label" style="margin:18px 0 12px">Noms (opcional)</p>
    <div class="duo-names">
      ${[0, 1].map((i) => `
        <label class="duo-name">
          ${colors[i] ? `<span class="duo-name__dot" style="background:${colors[i]}" aria-hidden="true"></span>` : ''}
          <input class="input" data-duo-name="${i}" maxlength="${MAX}" autocomplete="off" autocapitalize="words"
            enterkeyhint="done" placeholder="${esc(labels[i])}" aria-label="Nom: ${esc(labels[i])}" value="${esc(names[i])}">
        </label>`).join('')}
    </div>`;
}

export function bindNames(root) {
  root.querySelectorAll('[data-duo-name]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const names = read();
      if (/[<>&"`]/.test(inp.value)) inp.value = clean(inp.value);
      names[+inp.dataset.duoName] = inp.value.slice(0, MAX);
      write(names);
    });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
  });
}
