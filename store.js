// ============================================================
// store.js — memòria compartida entre jocs (localStorage)
// Desa i recupera la llista de noms de jugadors perquè es
// recordin d'una partida a la següent i entre jocs.
// ============================================================

const KEY = 'xala_players';

// Retorna un array de noms (strings). Mai llança: si falla o no
// hi ha res desat, torna un array buit.
export function getPlayers() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => typeof n === 'string');
  } catch (e) {
    return [];
  }
}

// Desa un array de noms. Mai llança.
export function setPlayers(names) {
  try {
    const clean = Array.isArray(names) ? names.filter((n) => typeof n === 'string') : [];
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch (e) {
    /* sense persistència: continuem igualment */
  }
}
