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

  professions: svg(`<rect x="12" y="24" width="40" height="27" rx="3"/><path d="M25 24 V19 Q25 16 28 16 H36 Q39 16 39 19 V24"/><line x1="12" y1="37" x2="52" y2="37"/>`),

  transport: svg(`<path d="M12 38 L17 27 Q18 25 20 25 H44 Q46 25 47 27 L52 38"/><path d="M9 38 H55 V46 H9 Z"/><circle cx="21" cy="46" r="4.5"/><circle cx="43" cy="46" r="4.5"/>`),

  roba: svg(`<path d="M25 13 L16 20 L21 28 L25 25 V51 H39 V25 L43 28 L48 20 L39 13 Q32 19 25 13 Z"/>`),

  musica: svg(`<path d="M27 45 V17 L45 13 V41"/><ellipse cx="22" cy="45" rx="6" ry="5"/><ellipse cx="40" cy="41" rx="6" ry="5"/>`),

  natura: svg(`<line x1="32" y1="53" x2="32" y2="30"/><path d="M16 47 Q15 18 47 16 Q46 47 16 47 Z"/>`),

  eines: svg(`<circle cx="32" cy="32" r="10"/><line x1="32" y1="12" x2="32" y2="19"/><line x1="32" y1="45" x2="32" y2="52"/><line x1="12" y1="32" x2="19" y2="32"/><line x1="45" y1="32" x2="52" y2="32"/><line x1="18" y1="18" x2="23" y2="23"/><line x1="41" y1="41" x2="46" y2="46"/><line x1="46" y1="18" x2="41" y2="23"/><line x1="23" y1="41" x2="18" y2="46"/>`),

  tecnologia: svg(`<rect x="14" y="13" width="36" height="25" rx="2"/><path d="M28 38 V44 H36 V38"/><line x1="19" y1="44" x2="45" y2="44"/>`),

  cos: svg(`<circle cx="32" cy="17" r="7"/><line x1="32" y1="24" x2="32" y2="41"/><line x1="19" y1="31" x2="45" y2="31"/><path d="M32 41 L24 54 M32 41 L40 54"/>`),

  marques: svg(`<path d="M30 11 H49 a4 4 0 0 1 4 4 V34 L31 56 a4 4 0 0 1-6 0 L9 40 a4 4 0 0 1 0-6 Z"/><circle cx="43" cy="21" r="3.5"/>`),

  videojocs: svg(`<path d="M20 22 H44 a12 12 0 0 1 0 24 q-6 0 -8-4 H28 q-2 4-8 4 a12 12 0 0 1 0-24 Z"/><line x1="17" y1="34" x2="25" y2="34"/><line x1="21" y1="30" x2="21" y2="38"/><circle cx="42" cy="31" r="2.2" fill="currentColor" stroke="none"/><circle cx="47" cy="36" r="2.2" fill="currentColor" stroke="none"/>`),

  accions: svg(`<circle cx="34" cy="13" r="5"/><path d="M34 19 L31 33 L24 47"/><path d="M31 33 L41 45"/><path d="M34 23 L21 28 M34 23 L47 27"/>`),

  famosos: svg(`<circle cx="32" cy="22" r="11"/><path d="M14 52 Q14 38 32 38 Q50 38 50 52"/><path d="M32 6 L34 12 L40 12 L35 16 L37 22 L32 18 L27 22 L29 16 L24 12 L30 12 Z"/>`),

  pelis: svg(`<rect x="10" y="16" width="44" height="32" rx="3"/><line x1="10" y1="24" x2="54" y2="24"/><line x1="10" y1="40" x2="54" y2="40"/><line x1="18" y1="16" x2="18" y2="24"/><line x1="28" y1="16" x2="28" y2="24"/><line x1="38" y1="16" x2="38" y2="24"/><line x1="48" y1="16" x2="48" y2="24"/><line x1="18" y1="40" x2="18" y2="48"/><line x1="28" y1="40" x2="28" y2="48"/><line x1="38" y1="40" x2="38" y2="48"/><line x1="48" y1="40" x2="48" y2="48"/>`),
};
