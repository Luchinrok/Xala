// ============================================================
// Prova del motor d'escacs: detecció d'ESCAC I MAT.
// Executa:  node escacs.test.mjs   (o  npm test)
//
// Juga el "mat del boig" (1. f3 e5 2. g4 Dh4#) i comprova que, a l'inici
// del torn de les blanques, NO hi ha cap moviment legal i el rei blanc
// està en escac => escac i mat amb les blanques com a perdedores.
// Inclou un cas d'ofegat (sense escac i sense moviments => taules) i un
// control de perft per a la generació de moviments.
// ============================================================

import { initialPos, genLegal, applyMove, inCheck } from './escacs.js';

let failures = 0;
function check(cond, msg) {
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
  if (!cond) failures++;
}

// Converteix "e2" -> [fila, columna] del tauler intern (fila 0 = 8a).
const sq = (s) => [8 - parseInt(s[1], 10), s.charCodeAt(0) - 97];

// Fa el moviment from->to si és LEGAL (només els legals; un moviment és
// legal si, després de fer-lo, el propi rei no queda en escac).
function move(pos, fromS, toS) {
  const f = sq(fromS), t = sq(toS);
  const m = genLegal(pos).find(x => x.fr[0] === f[0] && x.fr[1] === f[1] && x.to[0] === t[0] && x.to[1] === t[1]);
  if (!m) throw new Error(`Moviment inexistent o il·legal: ${fromS}${toS} (torn ${pos.turn})`);
  return applyMove(pos, m);
}

// Classifica la posició a l'inici del torn de qui ha de moure.
function status(pos) {
  const legal = genLegal(pos);
  const chk = inCheck(pos, pos.turn);
  if (legal.length === 0) return chk ? { end: 'mate', loser: pos.turn } : { end: 'stalemate' };
  return { end: null, legal: legal.length, check: chk };
}

// ---------- 1) Mat del boig: 1. f3 e5 2. g4 Dh4# ----------
console.log('Mat del boig (1. f3 e5 2. g4 Dh4#):');
let pos = initialPos();
pos = move(pos, 'f2', 'f3');   // 1. f3
pos = move(pos, 'e7', 'e5');   //    e5
pos = move(pos, 'g2', 'g4');   // 2. g4
pos = move(pos, 'd8', 'h4');   //    Dh4#

const s = status(pos);
check(pos.turn === 'w', 'després de Dh4# han de moure les blanques');
check(inCheck(pos, 'w'), 'el rei blanc està en escac');
check(genLegal(pos).length === 0, `les blanques no tenen cap moviment legal (n=${genLegal(pos).length})`);
check(s.end === 'mate', 'la posició es classifica com a ESCAC I MAT');
check(s.end === 'mate' && s.loser === 'w', 'perden les blanques (guanyen les negres)');

// ---------- 2) Ofegat: sense escac i sense moviments => taules ----------
// Negres: rei a h8. Blanques: rei f7, dama g6. Negres a moure, ofegades.
console.log('\nOfegat (taules):');
function emptyBoard() {
  return { board: Array.from({ length: 8 }, () => Array(8).fill(null)), turn: 'b', castling: { wK: false, wQ: false, bK: false, bQ: false }, ep: null };
}
const st = emptyBoard();
const put = (s2, c, t) => { const [r, cc] = sq(s2); st.board[r][cc] = { c, t }; };
put('h8', 'b', 'K');
put('f7', 'w', 'K');
put('g6', 'w', 'Q');
const so = status(st);
check(!inCheck(st, 'b'), 'el rei negre NO està en escac');
check(genLegal(st).length === 0, `les negres no tenen cap moviment legal (n=${genLegal(st).length})`);
check(so.end === 'stalemate', 'la posició es classifica com a TAULES (ofegat)');

// ---------- 3) Perft (control de la generació de moviments) ----------
console.log('\nPerft (control):');
function perft(p, d) { if (d === 0) return 1; let n = 0; for (const m of genLegal(p)) n += perft(applyMove(p, m), d - 1); return n; }
const p0 = initialPos();
check(perft(p0, 1) === 20, 'perft(1) = 20');
check(perft(p0, 2) === 400, 'perft(2) = 400');
check(perft(p0, 3) === 8902, 'perft(3) = 8902');

console.log(failures === 0 ? '\n✔ TOTES LES PROVES PASSEN' : `\n✘ ${failures} PROVA(ES) FALLIDA(ES)`);
process.exit(failures === 0 ? 0 : 1);
