// ============================================================
// word-bag.js — bossa de paraules compartida i persistent
//
// Cada joc treu paraules d'una bossa BARREJADA que NO repeteix cap
// element fins haver esgotat tota la bossa de les categories triades.
// La bossa viu a escala de MÒDUL: es manté durant tota la sessió
// (encara que surtis del joc i hi tornis a entrar) i només es torna a
// barrejar quan s'ha esgotat o quan canvia la selecció de categories
// (és a dir, quan canvia la clau). Quan s'esgota, es torna a omplir i
// barrejar de nou.
//
// La fa servir L'impostor, Endevina-la i A escena!.
// ============================================================

// clau (joc + categories) -> array d'elements pendents (es va buidant)
const bags = new Map();

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Treu el següent element de la bossa identificada per `key`.
// `buildPool` retorna l'array COMPLET d'elements de les categories
// triades; només es crida quan cal omplir la bossa (primer ús o
// esgotada): aleshores es barreja una sola vegada. Mentre quedin
// elements, no es torna a barrejar ni es repeteix res.
export function drawFromBag(key, buildPool) {
  let bag = bags.get(key);
  if (!bag || bag.length === 0) {
    bag = shuffle(buildPool());
    bags.set(key, bag);
  }
  return bag.pop();
}
