// Il·lustracions de categoria (SVG en línia, estil de l'app).
// L'SVG fa servir stroke="currentColor" perquè s'adapti al color del tile:
// tinta sobre beix quan no està seleccionat, beix sobre vermell quan ho està.
// Les claus coincideixen amb els id de CATEGORIES a impostor-paraules.js.

const svg = (inner) =>
  `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const CATEGORY_ICONS = {
  menjar: svg(`<path d="M12 28 Q32 9 52 28"/><line x1="12" y1="28" x2="52" y2="28"/><circle cx="25" cy="22" r="1.3" fill="currentColor" stroke="none"/><circle cx="33" cy="19" r="1.3" fill="currentColor" stroke="none"/><circle cx="40" cy="22" r="1.3" fill="currentColor" stroke="none"/><path d="M13 36 q4.75 -5 9.5 0 t9.5 0 t9.5 0 t9.5 0"/><path d="M14 43 H50 V46 Q50 50 46 50 H18 Q14 50 14 46 Z"/>`),

  animals: svg(`<path d="M21 20 L16 9 28 16"/><path d="M43 20 L48 9 36 16"/><circle cx="32" cy="36" r="16"/><circle cx="26" cy="34" r="1.8" fill="currentColor" stroke="none"/><circle cx="38" cy="34" r="1.8" fill="currentColor" stroke="none"/><path d="M32 39 v2"/><path d="M19 36 H10 M19 41 H10"/><path d="M45 36 H54 M45 41 H54"/>`),

  casa: svg(`<path d="M11 31 L32 13 53 31"/><path d="M16 31 V51 H48 V31"/><path d="M27 51 V40 H37 V51"/>`),

  mon: svg(`<circle cx="32" cy="32" r="20"/><ellipse cx="32" cy="32" rx="20" ry="7.5"/><ellipse cx="32" cy="32" rx="7.5" ry="20"/>`),

  esports: svg(`<path d="M22 13 H42 V25 Q42 37 32 37 Q22 37 22 25 Z"/><path d="M22 17 Q11 17 12.5 25 Q14 30 22 30"/><path d="M42 17 Q53 17 51.5 25 Q50 30 42 30"/><line x1="32" y1="37" x2="32" y2="45"/><path d="M23 45 H41 L44 53 H20 Z"/>`),
};
