// ============================================================
// mat2-motor.js — utilitats per als problemes de «Mat en 2».
// Llegeix FEN cap al format de posició d'escacs.js i comprova
// mats en 1 i en 2 amb el mateix motor (genLegal / applyMove).
// ============================================================

import { genLegal, applyMove, inCheck } from './escacs.js';

// "rnbqkbnr/... w KQkq e3 0 1" -> { board, turn, castling, ep }
export function parseFen(fen) {
  const [placement, turn, cast, ep] = fen.trim().split(/\s+/);
  const board = placement.split('/').map(row => {
    const out = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) out.push(null);
      else out.push({ c: ch === ch.toUpperCase() ? 'w' : 'b', t: ch.toUpperCase() });
    }
    return out;
  });
  const c = cast || '-';
  return {
    board,
    turn: turn === 'b' ? 'b' : 'w',
    castling: { wK: c.includes('K'), wQ: c.includes('Q'), bK: c.includes('k'), bQ: c.includes('q') },
    ep: ep && ep !== '-' ? sq(ep) : null,
  };
}

export function toFen(pos) {
  const rows = pos.board.map(row => {
    let s = '', e = 0;
    for (const x of row) {
      if (!x) { e++; continue; }
      if (e) { s += e; e = 0; }
      s += x.c === 'w' ? x.t : x.t.toLowerCase();
    }
    return s + (e || '');
  });
  const k = pos.castling;
  const cast = (k.wK ? 'K' : '') + (k.wQ ? 'Q' : '') + (k.bK ? 'k' : '') + (k.bQ ? 'q' : '') || '-';
  return `${rows.join('/')} ${pos.turn} ${cast} ${pos.ep ? name(pos.ep) : '-'}`;
}

// "e2" <-> [fila, columna] (fila 0 = 8a)
export const sq = (s) => [8 - parseInt(s[1], 10), s.charCodeAt(0) - 97];
export const name = ([r, c]) => String.fromCharCode(97 + c) + (8 - r);

// Jugada en format UCI ("e2e4", "e7e8q") -> moviment legal o null.
export function findMove(pos, uci) {
  const f = sq(uci.slice(0, 2)), t = sq(uci.slice(2, 4));
  const promo = uci[4] ? uci[4].toUpperCase() : null;
  const m = genLegal(pos).find(x => x.fr[0] === f[0] && x.fr[1] === f[1] && x.to[0] === t[0] && x.to[1] === t[1]);
  if (!m) return null;
  return promo ? { ...m, promo } : m;
}
export const uciOf = (m) => name(m.fr) + name(m.to) + (m.promo && m.promo !== 'Q' ? m.promo.toLowerCase() : (m.promo ? 'q' : ''));

// Gira el tauler i els colors: un problema de negres passa a ser de blanques.
export function mirror(pos) {
  const board = pos.board.slice().reverse().map(row => row.map(x => (x ? { c: x.c === 'w' ? 'b' : 'w', t: x.t } : null)));
  const k = pos.castling;
  return {
    board,
    turn: pos.turn === 'w' ? 'b' : 'w',
    castling: { wK: k.bK, wQ: k.bQ, bK: k.wK, bQ: k.wQ },
    ep: pos.ep ? [7 - pos.ep[0], pos.ep[1]] : null,
  };
}
export const mirrorUci = (u) => u[0] + (9 - +u[1]) + u[2] + (9 - +u[3]) + (u[4] || '');

// Coronacions: el motor només genera la de dama; afegim les altres
// perquè el jugador pugui fer una subcoronació si cal.
function withPromos(moves) {
  const out = [];
  for (const m of moves) {
    if (m.promo) for (const p of ['Q', 'R', 'B', 'N']) out.push({ ...m, promo: p });
    else out.push(m);
  }
  return out;
}
export const legalMoves = (pos) => withPromos(genLegal(pos));

export function isMate(pos) {
  return genLegal(pos).length === 0 && inCheck(pos, pos.turn);
}

// Jugades que fan mat immediat.
export function matingMoves(pos) {
  return legalMoves(pos).filter(m => isMate(applyMove(pos, m)));
}

// Una jugada `m` és bona si, faci el que faci el rival, hi ha mat a la
// jugada següent (i el rival té alguna jugada: si no, seria mat en 1).
export function forcesMateIn2(pos, m) {
  const p1 = applyMove(pos, m);
  const replies = legalMoves(p1);
  if (!replies.length) return isMate(p1);
  return replies.every(r => matingMoves(applyMove(p1, r)).length > 0);
}

// La millor defensa: la resposta que deixa menys mats possibles.
export function bestDefence(pos) {
  let best = null, bestN = Infinity;
  for (const r of legalMoves(pos)) {
    const n = matingMoves(applyMove(pos, r)).length;
    if (n < bestN || (n === bestN && Math.random() < 0.5)) { best = r; bestN = n; }
  }
  return best;
}
