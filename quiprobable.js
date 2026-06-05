// ============================================================
// Qui és més probable — social (estil "most likely to")
//
// Surt un repte "Qui és més probable que...". Cadascú vota en secret
// (passant el mòbil) la persona del grup que millor hi encaixa. Es
// revela el més votat i s'acumula una classificació entre rondes.
// Reaprofita els patrons de l'impostor: caselles de noms (store.js),
// la passada de mòbil i la llista de noms per votar.
// ============================================================

import { getPlayers, setPlayers } from './store.js';

// Reptes (la part que va després de "Qui és més probable que ").
// Es trien sense repetir fins esgotar-los i aleshores es rebaregen.
const CHALLENGES = [
  's’adormi al cinema', 'es faci famós', 'arribi sempre tard',
  'es mengi l’últim tros de pizza', 'guanyi la loteria',
  'acabi vivint en una autocaravana', 'es perdi pel camí',
  'es faci un selfie a tot arreu', 'canti a la dutxa',
  'es quedi adormit en una festa', 'oblidi el seu aniversari',
  'parli sol', 'es rigui en un moment seriós', 'es faci youtuber',
  'plori amb una pel·lícula', 'es mengi tot el que hi ha a la nevera',
  'perdi el mòbil', 'es faci un tatuatge impulsiu', 'es casi primer',
  'tingui deu fills', 'viatgi per tot el món', 'es faci milionari',
  'acabi sent president', 'es quedi atrapat en un ascensor',
  'es faci viral per error', 'discuteixi amb un àrbitre',
  'es posi a ballar sense música', 'digui un acudit dolent',
  's’enamori a primera vista', 'es deixi les claus dins de casa',
  'contesti el mòbil al cinema', 'faci tard a la seva pròpia boda',
  'es mengi el menjar del plat dels altres', 's’oblidi del nom d’algú',
  'acabi ballant sobre la taula', 'es faci pipí de riure',
  'ronqui més fort', 'es gasti tot el sou en un dia', 'adopti deu gats',
  'es perdi en un supermercat', 'es cregui qualsevol mentida',
  'comenci una discussió per política', 'es quedi sense bateria sempre',
  'perdi una aposta', 'es mengi un pebrot picant per un repte',
  'vagi a treballar en pijama sense adonar-se’n', 'es faci famós a TikTok',
  'organitzi una festa sorpresa', 'es posi a plorar amb un anunci',
  'oblidi on ha aparcat', 'contesti "sí" sense escoltar la pregunta',
  'es mengi l’últim tros de pastís', 'surti corrent davant d’una abella',
  'es faci el valent i després s’espanti', 'acabi cantant en un karaoke',
  'es quedi mirant el mòbil tota la nit', 'perdi al joc i s’enfadi',
  'es faci el dormit per no ajudar', 'porti el cotxe sense gasolina',
  'trenqui alguna cosa sense voler', 'es mengi un pot de Nutella sencer',
  'compri coses que no necessita', 'es faci passar per famós',
  'acabi sent el centre d’atenció', 'es presenti a un concurs de la tele',
  'es faci amic de tothom', 'digui mentides petites', 'es perdi un avió',
  'oblidi pagar el compte', 'es cremi cuinant',
  'es disfressi sense que sigui carnaval', 'faci una migdiada de tres hores',
  'es queixi del fred sempre', 'es deixi portar per la gana',
  'sigui el primer a aixecar-se de taula', 'reservi taula i no hi vagi',
  'es perdi en una ciutat nova', 'acabi parlant amb desconeguts',
  'es mengi tot el formatge de la taula', 'plori veient un partit',
  'es faci famós per un ball', 'es quedi sense diners de vacances',
  'discuteixi pel comandament de la tele', 'es mengi les patates dels altres',
  'es faci una foto en un lloc perillós', 'adopti un animal exòtic',
  'perdi el tren per cinc minuts', 'es deixi el forn encès',
  'compri el mateix dues vegades', 's’apunti a un gimnàs i no hi vagi mai',
  'es cregui l’horòscop', 'acabi liderant el grup',
  'es perdi explicant una història', 'posi la música a tot volum',
  'es faci el despistat per no pagar', 'ho guardi tot "per si de cas"',
  'acabi ballant sol a la pista', 'contesti els missatges tres dies tard',
  'faci una broma pesada', 'es disfressi per Halloween cada any',
  'es quedi xerrant fins les tantes', 'perdi sempre les ulleres',
  'es mengi un gelat a l’hivern', 'plori d’alegria',
  'acabi en una guerra d’aigua', 'es cregui el millor cuiner',
  'es faci el dur i sigui un tros de pa', 'oblidi tancar la porta',
  'es mengi la xocolata d’amagat', 'vagi a una festa sense estar convidat',
  'es faci una foto amb un famós', 'acabi cantant l’himne malament',
  'perdi el sentit de l’orientació', 'es posi nerviós abans d’un examen',
  'es mengi tota la safata de canapès', 'es faci el malalt per no treballar',
  'acabi dormint al sofà', 'es deixi el cap en algun lloc',
  'compri un gos impulsivament', 'es faci famós per un meme',
  'mengi més ràpid que ningú', 'es perdi una boda per quedar-se dormit',
  'expliqui la seva vida a un taxista', 'es cregui invencible',
  'faci un viatge sense planificar res', 'es deixi convèncer fàcilment',
  'es mengi l’últim cacauet', 'acabi sent el fotògraf del grup',
  'es faci el valent en una pel·lícula de por', 'perdi el carregador del mòbil',
  'es quedi sense paraules', 'comenci mil projectes i no n’acabi cap',
  'es mengi la decoració del pastís', 'acabi parlant amb les plantes',
  'organitzi el viatge de tot el grup', 'es perdi mirant aparadors',
  'sempre tingui gana', 'es faci el simpàtic per aconseguir alguna cosa',
  'acabi sent l’ànima de la festa', 'es deixi emportar pels nervis',
  'es faci selfies amb tothom', 'acabi ajudant un desconegut',
  'es mengi un quilo de gominoles', 'perdi les claus cada setmana',
  'es quedi adormit veient una sèrie', 'compri roba que no es posarà mai',
  'es faci responsable de la barbacoa', 'canti totes les cançons de la ràdio',
  'acabi liderant un karaoke', 'es perdi pel metro', 'plori amb un casament',
  'es mengi tot el pa abans de sopar', 'sigui l’últim a marxar de la festa',
  'es faci famós cuinant', 'reservi i arribi tard igualment',
];

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default {
  id: 'quiprobable',
  title: 'Qui és més probable...',
  tagline: 'Vota qui de vosaltres ho faria',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,

  instructions: [
    'Surt un repte: "Qui és més probable que...".',
    'Passeu-vos el mòbil: cadascú vota en secret la persona que millor hi encaixa.',
    'Es revela el més votat de la ronda... i a riure.',
    'Els vots sumen punts i hi ha una classificació acumulada.',
  ],

  mount(root, { goHome }) {
    // Carrega els noms recordats; si no n'hi ha cap, comença amb 3 caselles buides.
    const saved = getPlayers();
    const initialNames = (Array.isArray(saved) && saved.length) ? saved.slice(0, 12) : ['', '', ''];
    while (initialNames.length < 3) initialNames.push('');

    const state = {
      names: initialNames,
      scores: [],                 // punts acumulats (alineat amb names)
      deck: shuffle(CHALLENGES),
      deckIndex: 0,
      challenge: '',
      votes: [],                  // votes[votant] = índex del votat (aquesta ronda)
      voteIndex: 0,
    };

    const count = () => state.names.length;
    const getName = (i) => (state.names[i] && state.names[i].trim()) || `Jugador ${i + 1}`;
    const allFilled = () => state.names.every((n) => (n || '').trim() !== '');
    const save = () => setPlayers(state.names);

    function readNames() {
      for (let i = 0; i < count(); i++) {
        const el = root.querySelector('#name-' + i);
        if (el) state.names[i] = el.value;
      }
    }

    // ---------- 1) configuració ----------
    function screenSetup() {
      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker">Qui és més probable</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Qui juga?</h2>

        <p class="label" style="margin:0 0 12px">Jugadors</p>
        <div class="stack" id="names" style="--stack-gap:10px"></div>
        <button class="btn btn--outline" id="addp" style="margin-top:12px">+ Afegeix jugador</button>

        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700;display:none">Cal omplir el nom de tots els jugadors</p>
      `;
      root.querySelector('#back').onclick = goHome;

      root.querySelector('#addp').onclick = () => {
        readNames();
        if (count() >= 12 || !allFilled()) return;
        state.names.push('');
        save();
        renderNames();
        const last = root.querySelector('#name-' + (count() - 1));
        if (last) last.focus();
      };

      root.querySelector('#start').onclick = () => {
        readNames();
        if (!allFilled()) { updateButtons(); return; }
        save();
        state.scores = state.names.map(() => 0);
        startRound();
      };

      renderNames();
    }

    function updateButtons() {
      const filled = allFilled();
      const add = root.querySelector('#addp');
      const start = root.querySelector('#start');
      const warn = root.querySelector('#warn');
      if (add) add.disabled = count() >= 12 || !filled;
      if (start) start.disabled = !filled;
      if (warn) warn.style.display = filled ? 'none' : 'block';
    }

    function renderNames() {
      const box = root.querySelector('#names');
      const canDelete = count() > 3;
      box.innerHTML = state.names.map((nm, i) => `
        <div class="name-row">
          <input class="input" id="name-${i}" type="text" maxlength="16" placeholder="Nom" value="${(nm || '').replace(/"/g, '&quot;')}">
          ${canDelete ? `<button class="name-del" data-del="${i}" aria-label="Treu">×</button>` : ''}
        </div>
      `).join('');
      box.querySelectorAll('[data-del]').forEach(b => {
        b.onclick = () => {
          readNames();
          state.names.splice(parseInt(b.dataset.del, 10), 1);
          save();
          renderNames();
        };
      });
      box.querySelectorAll('input.input').forEach((el, i) => {
        el.oninput = () => {
          state.names[i] = el.value;
          save();
          updateButtons();
        };
      });
      updateButtons();
    }

    // ---------- prepara una ronda ----------
    function drawChallenge() {
      if (state.deckIndex >= state.deck.length) { state.deck = shuffle(CHALLENGES); state.deckIndex = 0; }
      state.challenge = state.deck[state.deckIndex++];
    }
    function startRound() {
      drawChallenge();
      state.votes = new Array(count()).fill(null);
      state.voteIndex = 0;
      screenPassVote();
    }

    function roundCounts() {
      const counts = new Array(count()).fill(0);
      state.votes.forEach(v => { if (v != null) counts[v]++; });
      return counts;
    }

    // ---------- 2a) porta de passada (secret) ----------
    function screenPassVote() {
      const name = getName(state.voteIndex);
      root.innerHTML = `
        <p class="kicker">Votació secreta</p>
        <h2 style="font-size:26px;margin:6px 0 18px">Passa el mòbil a<br>${name}</h2>
        <div class="reveal-card tap-hint" id="card">
          <div class="word" style="font-size:28px">Toca per votar</div>
        </div>
        <div class="spacer"></div>
        <p class="muted center">Que ningú miri el teu vot!</p>
      `;
      root.querySelector('#card').onclick = screenVote;
    }

    // ---------- 2b) pantalla de vot ----------
    function screenVote() {
      const buttons = state.names
        .map((nm, i) => `<button class="btn btn--outline" data-vote="${i}">${getName(i)}</button>`)
        .join('');
      root.innerHTML = `
        <p class="kicker center">Vota en secret</p>
        <h2 class="qp-question">Qui és més probable que ${state.challenge}?</h2>
        <p class="muted center" style="margin-bottom:16px">Vota tu, <strong>${getName(state.voteIndex)}</strong></p>
        <div class="stack" style="--stack-gap:10px">${buttons}</div>
      `;
      root.querySelectorAll('[data-vote]').forEach(b => {
        b.onclick = () => {
          state.votes[state.voteIndex] = parseInt(b.dataset.vote, 10);
          state.voteIndex++;
          if (state.voteIndex >= count()) screenAllVoted();
          else screenPassVote();
        };
      });
    }

    // ---------- 3) tothom ha votat ----------
    function screenAllVoted() {
      root.innerHTML = `
        <p class="kicker center">Fet!</p>
        <div class="spacer"></div>
        <div class="panel center stack">
          <h2 style="font-size:30px">Tothom ha votat</h2>
          <p class="muted">Qui és més probable que ${state.challenge}?</p>
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="reveal" style="margin-top:24px">Revelar resultats</button>
      `;
      root.querySelector('#reveal').onclick = () => {
        // suma els vots rebuts a la puntuació acumulada (un cop per ronda)
        roundCounts().forEach((c, i) => { state.scores[i] += c; });
        screenReveal();
      };
    }

    // ---------- 4) revelació ----------
    function screenReveal() {
      const counts = roundCounts();
      const max = Math.max(...counts);
      const winners = state.names.map((nm, i) => i).filter(i => counts[i] === max);
      const tie = winners.length > 1;
      const names = winners.map(i => getName(i)).join(' i ');
      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker center">Resultats</p>
        <p class="muted center" style="margin-bottom:10px">Qui és més probable que ${state.challenge}?</p>
        <div class="reveal-card" id="card">
          <div class="who">${tie ? 'Empat! Els més probables...' : 'El més probable...'}</div>
          <div class="word">${names}!</div>
          <div class="who">${max} vot${max === 1 ? '' : 's'}</div>
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="rank" style="margin-top:18px">Classificació</button>
      `;
      root.querySelector('#back').onclick = goHome;
      root.querySelector('#rank').onclick = screenRanking;
    }

    // ---------- 5) classificació ----------
    function screenRanking() {
      const order = state.names
        .map((nm, i) => i)
        .sort((a, b) => state.scores[b] - state.scores[a] || a - b);
      const rows = order.map(i => `
        <button class="btn btn--outline rank-row" data-player="${i}">
          <span class="rank-row__name">${getName(i)}</span>
          <span class="rank-row__pts">${state.scores[i]}</span>
        </button>`).join('');
      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker">Classificació</p>
        <h2 style="font-size:28px;margin:6px 0 6px">Punts acumulats</h2>
        <p class="muted" style="margin-bottom:16px">Toca un jugador per veure qui l'ha votat aquesta ronda.</p>
        <div class="stack" style="--stack-gap:10px">${rows}</div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:20px">
          <button class="btn btn--accent" id="next">Següent pregunta</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      root.querySelector('#back').onclick = goHome;
      root.querySelector('#home').onclick = goHome;
      root.querySelector('#next').onclick = startRound;
      root.querySelectorAll('[data-player]').forEach(b => {
        b.onclick = () => screenWhoVoted(parseInt(b.dataset.player, 10));
      });
    }

    // ---------- detall: qui ha votat X ----------
    function screenWhoVoted(target) {
      const voters = state.votes
        .map((v, voter) => (v === target ? voter : -1))
        .filter(v => v >= 0)
        .map(v => getName(v));
      root.innerHTML = `
        <button class="back" id="back">‹ Classificació</button>
        <p class="kicker">Aquesta ronda</p>
        <h2 style="font-size:26px;margin:6px 0 6px">Qui ha votat ${getName(target)}?</h2>
        <p class="muted" style="margin-bottom:16px">Qui és més probable que ${state.challenge}?</p>
        ${voters.length
          ? `<div class="stack" style="--stack-gap:10px">${voters.map(n => `<div class="res-row">${n}</div>`).join('')}</div>`
          : `<p class="muted">Ningú no l'ha votat aquesta ronda.</p>`}
      `;
      root.querySelector('#back').onclick = screenRanking;
    }

    screenSetup();
  },
};
