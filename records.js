// ============================================================
// records.js — millors marques dels jocs d'un sol jugador.
// Desa i recupera rècords a localStorage sota una sola clau.
//   getRecord(id)        -> el valor desat (qualsevol JSON) o null
//   setRecord(id, value) -> el desa
// L'id és lliure: p. ex. 'memory:normal' o 'penjat'.
// Mai llança: si no hi ha localStorage, simplement no persisteix.
// ============================================================

const KEY = 'xala_records';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return (obj && typeof obj === 'object') ? obj : {};
  } catch (e) {
    return {};
  }
}

function writeAll(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* sense persistència */ }
}

export function getRecord(id) {
  const v = readAll()[id];
  return v === undefined ? null : v;
}

export function setRecord(id, value) {
  const all = readAll();
  all[id] = value;
  writeAll(all);
}
