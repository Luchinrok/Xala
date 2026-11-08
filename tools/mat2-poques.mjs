// ============================================================
// tools/mat2-poques.mjs — afegeix a mat2-problemes.js una tanda de
// problemes de mat en 2 amb poques peces (com els de les revistes i Facebook).
//   node tools/mat2-poques.mjs [màxim de peces] [quants]
// Llegeix la base de dades de puzzles de Lichess (domini públic, CC0) en
// streaming, es queda els «mateIn2» amb poques peces i els verifica amb el
// motor d'escacs.js: mat en 2 forçat, sense mat en 1 i una sola primera jugada.
// ============================================================

import fs from 'node:fs';
import zlib from 'node:zlib';
import { Readable } from 'node:stream';
import { applyMove } from '../escacs.js';
import { parseFen, toFen, findMove, mirror, mirrorUci, matingMoves, forcesMateIn2, legalMoves } from '../mat2-motor.js';
import PROBLEMES from '../mat2-problemes.js';

const MAXP = +(process.argv[2] || 9);
const WANT = +(process.argv[3] || 150);
const pieces = (fen) => (fen.split(' ')[0].match(/[a-zA-Z]/g) || []).length;

const known = new Set(Object.values(PROBLEMES).flat().map(p => p[0]));
const found = [];
let lines = 0, cands = 0;

// El fitxer comença amb un bloc «skippable» de 12 bytes que el descompressor de Node no entén.
const res = await fetch('https://database.lichess.org/lichess_db_puzzle.csv.zst', { headers: { Range: 'bytes=12-' } });
const dec = zlib.createZstdDecompress();
Readable.fromWeb(res.body).pipe(dec);
let buf = '';
let done = false;
const finish = () => {
  if (done) return;
  done = true;
  found.sort((a, b) => a[3] - b[3]);
  const all = { ...PROBLEMES, few: found };
  const body = `// ============================================================
// mat2-problemes.js — problemes de «Mat en 2» (generat; no editar a mà).
// Font: base de dades de puzzles de Lichess (domini públic, CC0),
// https://database.lichess.org/#puzzles. Cada problema s'ha verificat
// amb el motor d'escacs.js: mat en 2 forçat, sense mat en 1 i amb una
// sola primera jugada guanyadora. Sempre juguen les blanques.
// Format: [FEN, última jugada del rival (UCI), solució (UCI), puntuació]
// «few»: posicions amb ${MAXP} peces o menys (tools/mat2-poques.mjs).
// ============================================================

export default ${JSON.stringify(all).replace(/\],\[/g, '],\n[')};
`;
  fs.writeFileSync(new URL('../mat2-problemes.js', import.meta.url), body);
  console.log(`\n${found.length} problemes de ${MAXP} peces o menys (de ${cands} candidats en ${lines} línies)`);
  process.exit(0);
};
dec.on('error', (e) => { console.error('error de descompressió:', e.message); finish(); });
dec.on('end', finish);
dec.on('data', (d) => {
  if (done) return;
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const row = buf.slice(0, i); buf = buf.slice(i + 1); lines++;
    if (!row.includes('mateIn2')) continue;
    const [, fen, moves, rating, rd, pop, plays] = row.split(',');
    if (pieces(fen) > MAXP || +pop < 80 || +plays < 300 || +rd > 100) continue;
    cands++;
    let pos = parseFen(fen);
    const mv = moves.split(' ');
    const first = findMove(pos, mv[0]);
    if (!first) continue;
    pos = applyMove(pos, first);
    let last = mv[0], sol = mv.slice(1);
    if (pos.turn === 'b') { pos = mirror(pos); last = mirrorUci(last); sol = sol.map(mirrorUci); }
    if (matingMoves(pos).length) continue;
    const key = findMove(pos, sol[0]);
    if (!key || !forcesMateIn2(pos, key)) continue;
    if (legalMoves(pos).filter(m => forcesMateIn2(pos, m)).length !== 1) continue;
    const f = toFen(pos);
    if (known.has(f)) continue;
    known.add(f);
    found.push([f, last, sol.join(' '), +rating]);
    process.stdout.write(`\r${found.length}/${WANT} (${lines} línies)`);
    if (found.length >= WANT) { finish(); return; }
  }
});
