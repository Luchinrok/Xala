// ============================================================
// Prova del motor d'escacs — variant CAPTURA DEL REI.
// Executa:  node escacs.test.mjs   (o  npm test)
//
// Regla: es pot fer qualsevol moviment legal de la peça (encara que deixi
// el propi rei amenaçat). La partida s'acaba quan algú CAPTURA el rei
// contrari: qui el captura guanya. "Escac" només és un avís.
// ============================================================

import {
  initialPos, genLegal, genPseudo, applyMove, inCheck,
  findKing, kingMissing, canCaptureKing, pickAIMove,
} from './escacs.js';

let failures = 0;
function check(cond, msg) {
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
  if (!cond) failures++;
}

const sq = (s) => [8 - parseInt(s[1], 10), s.charCodeAt(0) - 97];
function empty(turn) {
  return { board: Array.from({ length: 8 }, () => Array(8).fill(null)), turn, castling: { wK: false, wQ: false, bK: false, bQ: false }, ep: null };
}
function set(pos, s, c, t) { const [r, cc] = sq(s); pos.board[r][cc] = { c, t }; }
function find(pos, fromS, toS) {
  const f = sq(fromS), t = sq(toS);
  return genLegal(pos).find(m => m.fr[0] === f[0] && m.fr[1] === f[1] && m.to[0] === t[0] && m.to[1] === t[1]);
}

// ---------- 1) Capturar el rei acaba la partida (i es pot guanyar) ----------
console.log('1) Captura del rei:');
{
  // Dama blanca a e7, rei negre a e8 -> les blanques poden capturar el rei.
  const p = empty('w');
  set(p, 'a1', 'w', 'K');
  set(p, 'e7', 'w', 'Q');
  set(p, 'e8', 'b', 'K');
  const cap = find(p, 'e7', 'e8');
  check(!!cap && cap.cap === 'K', 'genLegal inclou la captura del rei (De7xe8)');
  const after = applyMove(p, cap);
  check(findKing(after.board, 'b') === null, 'després de la captura, el rei negre ja no hi és');
  check(kingMissing(after) === 'b', 'kingMissing detecta que falten les negres -> guanyen les blanques');
}

// ---------- 2) Es pot moure deixant el propi rei amenaçat ----------
console.log('\n2) Moure encara que el rei quedi en escac (sense restricció):');
{
  // Rei blanc e1, cavall blanc e2, torre negra e8: el cavall està "clavat"
  // a l'escacs normal; aquí SÍ que es pot moure.
  const p = empty('w');
  set(p, 'e1', 'w', 'K');
  set(p, 'e2', 'w', 'N');
  set(p, 'e8', 'b', 'R');
  set(p, 'a8', 'b', 'K');
  const knightMoves = genLegal(p).filter(m => m.fr[0] === sq('e2')[0] && m.fr[1] === sq('e2')[1]);
  check(knightMoves.length > 0, 'el cavall clavat pot moure igualment (no es filtra per escac)');
  // i el resultat deixa el rei blanc amenaçat per la torre
  const mv = knightMoves[0];
  const after = applyMove(p, mv);
  check(inCheck(after, 'w'), 'després de moure el cavall, el rei blanc queda en escac (permès)');
}

// ---------- 3) Avís d'escac (informatiu) ----------
console.log('\n3) Avís d\'escac:');
{
  const p = empty('w');
  set(p, 'e1', 'w', 'K');
  set(p, 'e8', 'b', 'R'); // torre negra mira el rei blanc per la columna e
  set(p, 'a8', 'b', 'K');
  check(inCheck(p, 'w') === true, 'inCheck avisa que el rei blanc està amenaçat');
}

// ---------- 4) La IA captura el rei rival si pot ----------
console.log('\n4) La IA captura el rei si pot:');
{
  // Negres a moure: dama negra a e2, rei blanc a e1 -> ha de capturar-lo.
  for (const depth of [1, 2, 3]) {
    const p = empty('b');
    set(p, 'h8', 'b', 'K');
    set(p, 'e2', 'b', 'Q');
    set(p, 'e1', 'w', 'K');
    const mv = pickAIMove(p, depth);
    const capturesKing = mv && mv.cap === 'K' && mv.to[0] === sq('e1')[0] && mv.to[1] === sq('e1')[1];
    check(capturesKing, `a profunditat ${depth}, la IA juga De2xe1 (captura el rei)`);
  }
}

// ---------- 5) La IA evita deixar el seu rei capturable ----------
console.log('\n5) La IA no penja el seu rei si pot evitar-ho:');
{
  // Negres a moure. Rei negre a e8. Torre blanca a a7 (controla la 7a fila):
  // si el rei va a e7/d7/f7 el captura la torre. Té caselles segures (d8/f8).
  // A més, una dama negra ben lluny per tenir més opcions no suïcides.
  const p = empty('b');
  set(p, 'e8', 'b', 'K');
  set(p, 'h1', 'b', 'Q');
  set(p, 'a7', 'w', 'R');
  set(p, 'a1', 'w', 'K');
  let safe = true;
  for (let i = 0; i < 20; i++) {
    const mv = pickAIMove(p, 2);
    const after = applyMove(p, mv);
    if (canCaptureKing(after)) { safe = false; break; } // les blanques podrien prendre el rei
  }
  check(safe, 'en 20 tries, la IA (depth 2) mai deixa el rei negre capturable');
}

console.log(failures === 0 ? '\n✔ TOTES LES PROVES PASSEN' : `\n✘ ${failures} PROVA(ES) FALLIDA(ES)`);
process.exit(failures === 0 ? 0 : 1);
