// ============================================================
// tools/mat2-varietat.mjs — refà mat2-problemes.js amb problemes variats.
//
// Els puzzles de Lichess surten de partides reals i gairebé tots es
// resolen igual: escac, la defensa tapa o el rei fuig, mat. Aquí es mira
// la «firma» de cada problema (peça de la clau i si fa escac o captura,
// com es defensa el rival, peça que fa mat i el tema de mat de Lichess) i
// se'n deixen entrar pocs de cada firma. Es prefereixen les claus
// tranquil·les (sense escac ni captura) i els sacrificis.
//
//   node tools/mat2-varietat.mjs recull [fitxer.csv]  → llegeix Lichess i desa candidats
//     (sense fitxer, el baixa; però el descompressor de Node s'atura als primers
//     blocs del .zst: millor descomprimir-lo abans, sencer, i passar-ne el .csv)
//   node tools/mat2-varietat.mjs tria     → escriu mat2-problemes.js
//
// Font: base de dades de puzzles de Lichess (domini públic, CC0).
// Cada problema es verifica amb el motor: mat en 2 forçat, sense mat en 1
// i una sola primera jugada guanyadora.
// ============================================================

import fs from 'node:fs';
import zlib from 'node:zlib';
import { Readable } from 'node:stream';
import { applyMove, inCheck } from '../escacs.js';
import { parseFen, toFen, findMove, mirror, mirrorUci, matingMoves, forcesMateIn2, legalMoves } from '../mat2-motor.js';

const CANDS = new URL('./mat2-candidats.json', import.meta.url); // no va a git
const OUT = new URL('../mat2-problemes.js', import.meta.url);
const PER_LEVEL = 150;
const FEW_MAX = 9;

const pieces = (fen) => (fen.split(' ')[0].match(/[a-zA-Z]/g) || []).length;
const MATE_TAGS = ['smotheredMate', 'backRankMate', 'anastasiaMate', 'arabianMate', 'bodenMate', 'doubleBishopMate',
  'dovetailMate', 'hookMate', 'epauletteMate', 'killBoxMate', 'vukovicMate', 'balestraMate', 'blindSwineMate',
  'cornerMate', 'morphysMate', 'operaMate', 'pillsburysMate', 'triangleMate', 'swallowstailMate'];
const SPICE = ['quietMove', 'doubleCheck', 'discoveredAttack', 'promotion', 'underPromotion', 'castling', 'enPassant',
  'deflection', 'attraction', 'interference', 'clearance', 'xRayAttack', 'zugzwang'];

// Firma: com es resol el problema, per no repetir-ne dos d'iguals.
export function firma(fen, sol) {
  const [a, b, c] = sol.split(' ');
  const pos = parseFen(fen);
  const m1 = findMove(pos, a);
  const p1 = pos.board[m1.fr[0]][m1.fr[1]].t;
  const cap1 = !!pos.board[m1.to[0]][m1.to[1]];
  const q1 = applyMove(pos, m1);
  const chk = inCheck(q1, q1.turn);
  const replies = legalMoves(q1);
  const m2 = findMove(q1, b);
  const pd = q1.board[m2.fr[0]][m2.fr[1]].t;
  const capd = !!q1.board[m2.to[0]][m2.to[1]];
  const q2 = applyMove(q1, m2);
  const def = pd === 'K' ? 'K' : capd ? 'x' : chk ? 'tapa' : 'lliure';
  const m3 = findMove(q2, c);
  const p3 = q2.board[m3.fr[0]][m3.fr[1]].t;
  const sac = !cap1 && replies.some(r => r.to[0] === m1.to[0] && r.to[1] === m1.to[1]);
  const quiet = !chk && !cap1;
  return { sig: `${p1}${chk ? '+' : cap1 ? 'x' : '·'}|${def}|${p3}`, quiet, sac, check: chk, promo: !!m1.promo };
}

async function recull() {
  const buckets = new Map(); // firma+tema+banda → quants
  const CAP = 20;
  const out = [];
  const known = new Set();
  let lines = 0, cands = 0;
  let dec;
  if (process.argv[3]) dec = fs.createReadStream(process.argv[3]);
  else {
    const res = await fetch('https://database.lichess.org/lichess_db_puzzle.csv.zst', { headers: { Range: 'bytes=12-' } });
    dec = zlib.createZstdDecompress();
    Readable.fromWeb(res.body).pipe(dec);
  }
  let buf = '';
  await new Promise((resolve) => {
    dec.on('error', (e) => { console.error('\nerror de descompressió:', e.message); resolve(); });
    dec.on('end', resolve);
    dec.on('data', (d) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const row = buf.slice(0, i); buf = buf.slice(i + 1); lines++;
        if (!row.includes('mateIn2')) continue;
        const [, fen, moves, rating, rd, pop, plays, themes] = row.split(',');
        if (+pop < 70 || +plays < 150 || +rd > 110) continue;
        const mv = moves.split(' ');
        if (mv.length !== 4) continue;
        let pos = parseFen(fen);
        const first = findMove(pos, mv[0]);
        if (!first) continue;
        pos = applyMove(pos, first);
        let last = mv[0], sol = mv.slice(1);
        if (pos.turn === 'b') { pos = mirror(pos); last = mirrorUci(last); sol = sol.map(mirrorUci); }
        const f = toFen(pos);
        if (known.has(f)) continue;
        let fi;
        try { fi = firma(f, sol.join(' ')); } catch { continue; }
        const th = themes.split(' ');
        const tag = MATE_TAGS.find(t => th.includes(t)) || '-';
        const few = pieces(f) <= FEW_MAX;
        const band = few ? 'few' : +rating < 1250 ? 'easy' : +rating < 1650 ? 'normal' : 'hard';
        const key = `${band}|${fi.sig}|${tag}`;
        if ((buckets.get(key) || 0) >= CAP) continue;
        // Verificació (la part cara): només per als que encara hi caben.
        if (matingMoves(pos).length) continue;
        const k = findMove(pos, sol[0]);
        if (!k || !forcesMateIn2(pos, k)) continue;
        if (legalMoves(pos).filter(m => forcesMateIn2(pos, m)).length !== 1) continue;
        known.add(f);
        buckets.set(key, (buckets.get(key) || 0) + 1);
        cands++;
        out.push({ fen: f, last, sol: sol.join(' '), rating: +rating, pop: +pop, plays: +plays, band, tag,
          spice: SPICE.filter(t => th.includes(t)), ...fi });
        if (cands % 50 === 0) process.stdout.write(`\r${cands} candidats (${lines} línies)`);
      }
    });
  });
  fs.writeFileSync(CANDS, JSON.stringify(out));
  console.log(`\n${out.length} candidats en ${buckets.size} grups, de ${lines} línies`);
}

// Interès d'un problema: les claus tranquil·les i els sacrificis són els bons.
const interest = (p) => (p.quiet ? 6 : 0) + (p.sac ? 3 : 0) + (p.tag !== '-' ? 1.5 : 0) + p.spice.length * 1.2
  + (p.promo ? 2 : 0) + (p.check ? 0 : 1) + Math.min(p.pop, 100) / 50;

function tria() {
  const all = JSON.parse(fs.readFileSync(CANDS, 'utf8'));
  const result = {};
  for (const band of ['easy', 'normal', 'hard', 'few']) {
    const pool = all.filter(p => p.band === band);
    // Grups per firma; dins de cada grup, primer els més interessants.
    const groups = new Map();
    for (const p of pool) {
      const g = `${p.sig}|${p.tag}`;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(p);
    }
    for (const g of groups.values()) g.sort((a, b) => interest(b) - interest(a));
    // Ordre dels grups: els més interessants primer.
    const order = [...groups.values()].sort((a, b) => interest(b[0]) - interest(a[0]));
    const picked = [];
    const taken = new Set();
    const perSig = new Map();
    let checks = 0;
    // Límits: la mateixa firma (sense tema) poques vegades per nivell, i menys
    // de la meitat amb escac a la clau. Si no n'hi ha prou, s'afluixen a poc a poc.
    for (const [MAX_SIG, CHECK_SHARE] of [[3, 0.45], [4, 0.55], [5, 0.65], [7, 0.8], [99, 1]]) {
      const MAX_CHECK = Math.round(PER_LEVEL * CHECK_SHARE);
      for (let round = 0; picked.length < PER_LEVEL && round < 40; round++) {
        for (const g of order) {
          if (picked.length >= PER_LEVEL) break;
          const p = g[round];
          if (!p || taken.has(p)) continue;
          if ((perSig.get(p.sig) || 0) >= MAX_SIG) continue;
          if (p.check && checks >= MAX_CHECK) continue;
          picked.push(p); taken.add(p);
          perSig.set(p.sig, (perSig.get(p.sig) || 0) + 1);
          if (p.check) checks++;
        }
      }
      if (picked.length >= PER_LEVEL) break;
    }
    picked.sort((a, b) => a.rating - b.rating);
    result[band] = picked.map(p => [p.fen, p.last, p.sol, p.rating]);
    const q = picked.filter(p => p.quiet).length;
    console.log(`${band}: ${picked.length} (de ${pool.length}), ${groups.size} grups, ${perSig.size} firmes, `
      + `${checks} amb escac, ${q} tranquil·les, ${picked.filter(p => p.sac).length} sacrificis`);
  }
  const body = `// ============================================================
// mat2-problemes.js — problemes de «Mat en 2» (generat; no editar a mà).
// Font: base de dades de puzzles de Lichess (domini públic, CC0),
// https://database.lichess.org/#puzzles. Triats amb tools/mat2-varietat.mjs
// perquè no es resolguin tots igual, i verificats amb el motor d'escacs.js:
// mat en 2 forçat, sense mat en 1 i amb una sola primera jugada guanyadora.
// Sempre juguen les blanques.
// Format: [FEN, última jugada del rival (UCI), solució (UCI), puntuació]
// «few»: posicions amb ${FEW_MAX} peces o menys.
// ============================================================

export default ${JSON.stringify(result).replace(/\],\[/g, '],\n[')};
`;
  fs.writeFileSync(OUT, body);
}

const cmd = process.argv[2];
if (cmd === 'recull') await recull();
else if (cmd === 'tria') tria();
else console.log('Ús: node tools/mat2-varietat.mjs recull | tria');
