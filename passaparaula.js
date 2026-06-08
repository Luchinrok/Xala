// ============================================================
// Passaparaula — el rosco de lletres
//
// Un concursant cada cop: es passa el mòbil i, contra rellotge, ha
// d'encertar una paraula per a cada lletra de l'abecedari a partir
// d'una pista. Pot encertar, passar (la lletra torna més tard) o
// rendir-se. El joc s'auto-jutja: el concursant marca si ha encertat.
//
// Flux: configuració (temps per torn) -> rosco (cercle de lletres +
//       pista + temporitzador) -> final (puntuació + rosco revelat).
// Estil beix (--paper) amb accent vermell; reaprofita .btn i .back.
// ============================================================

// Lletres del rosco en català.
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X', 'Z'];

// Opcions de temps per torn (segons).
const TIMES = [90, 120, 150];

// ---------- roscos ----------
// Cada rosco: una entrada per lletra { letter, mode, word, clue }.
// mode = "comença" (la paraula comença per la lletra) o "conté".
// La pista (clue) mai conté la paraula.
const ROSCOS = [
  // Rosco 1
  [
    { letter: 'A', mode: 'comença', word: 'arbre',    clue: 'Planta de tronc llenyós amb branques i fulles.' },
    { letter: 'B', mode: 'comença', word: 'barca',    clue: 'Embarcació petita per anar per l’aigua.' },
    { letter: 'C', mode: 'comença', word: 'cavall',   clue: 'Animal de quatre potes que es pot muntar i galopa.' },
    { letter: 'D', mode: 'comença', word: 'dofí',     clue: 'Mamífer marí molt intel·ligent que viu al mar.' },
    { letter: 'E', mode: 'comença', word: 'estrella', clue: 'Punt lluminós que es veu al cel de nit.' },
    { letter: 'F', mode: 'comença', word: 'formatge', clue: 'Aliment fet amb llet, sovint de color groc.' },
    { letter: 'G', mode: 'comença', word: 'girafa',   clue: 'Animal africà amb el coll molt llarg.' },
    { letter: 'H', mode: 'comença', word: 'hivern',   clue: 'Estació de l’any més freda.' },
    { letter: 'I', mode: 'comença', word: 'illa',     clue: 'Tros de terra envoltat d’aigua per tots costats.' },
    { letter: 'J', mode: 'comença', word: 'joguina',  clue: 'Objecte amb què s’entretenen els nens.' },
    { letter: 'L', mode: 'comença', word: 'lluna',    clue: 'Satèl·lit que il·lumina la nit.' },
    { letter: 'M', mode: 'comença', word: 'muntanya', clue: 'Gran elevació del terreny.' },
    { letter: 'N', mode: 'comença', word: 'núvol',    clue: 'Massa blanca al cel que pot portar pluja.' },
    { letter: 'O', mode: 'comença', word: 'ocell',    clue: 'Animal amb plomes i ales que vola.' },
    { letter: 'P', mode: 'comença', word: 'poma',     clue: 'Fruita rodona, sovint vermella o verda.' },
    { letter: 'Q', mode: 'comença', word: 'quadre',   clue: 'Pintura emmarcada que es penja a la paret.' },
    { letter: 'R', mode: 'comença', word: 'riu',      clue: 'Corrent d’aigua que baixa cap al mar.' },
    { letter: 'S', mode: 'comença', word: 'sol',      clue: 'Estrella que ens dona llum i calor de dia.' },
    { letter: 'T', mode: 'comença', word: 'taula',    clue: 'Moble pla amb potes per menjar o treballar.' },
    { letter: 'U', mode: 'comença', word: 'ull',      clue: 'Òrgan del cos que serveix per veure.' },
    { letter: 'V', mode: 'comença', word: 'vaca',     clue: 'Animal de granja que dona llet.' },
    { letter: 'X', mode: 'comença', word: 'xocolata', clue: 'Dolç de color marró fet amb cacau.' },
    { letter: 'Z', mode: 'comença', word: 'zebra',    clue: 'Animal africà amb ratlles blanques i negres.' },
  ],
  // Rosco 2
  [
    { letter: 'A', mode: 'comença', word: 'avió',      clue: 'Aparell que vola i transporta passatgers pel cel.' },
    { letter: 'B', mode: 'comença', word: 'bicicleta', clue: 'Vehicle de dues rodes que es mou pedalant.' },
    { letter: 'C', mode: 'comença', word: 'cargol',    clue: 'Animal petit i lent que porta la closca a sobre.' },
    { letter: 'D', mode: 'comença', word: 'dia',       clue: 'Període de llum entre dues nits.' },
    { letter: 'E', mode: 'comença', word: 'elefant',   clue: 'Animal gros amb trompa i orelles grans.' },
    { letter: 'F', mode: 'comença', word: 'flor',      clue: 'Part bonica i acolorida d’una planta.' },
    { letter: 'G', mode: 'comença', word: 'gat',       clue: 'Animal domèstic que fa miau.' },
    { letter: 'H', mode: 'comença', word: 'hospital',  clue: 'Lloc on guareixen els malalts.' },
    { letter: 'I', mode: 'comença', word: 'iogurt',    clue: 'Aliment cremós fet amb llet fermentada.' },
    { letter: 'J', mode: 'comença', word: 'jardí',     clue: 'Espai amb plantes i flors al voltant d’una casa.' },
    { letter: 'L', mode: 'comença', word: 'llibre',    clue: 'Conjunt de fulls amb text per llegir.' },
    { letter: 'M', mode: 'comença', word: 'mar',       clue: 'Gran extensió d’aigua salada.' },
    { letter: 'N', mode: 'comença', word: 'nas',       clue: 'Part de la cara que serveix per olorar.' },
    { letter: 'O', mode: 'comença', word: 'os',        clue: 'Animal gros i pelut que hiberna a l’hivern.' },
    { letter: 'P', mode: 'comença', word: 'pilota',    clue: 'Objecte rodó amb què es juga a futbol.' },
    { letter: 'Q', mode: 'comença', word: 'queixal',   clue: 'Dent grossa del fons de la boca per mastegar.' },
    { letter: 'R', mode: 'comença', word: 'rellotge',  clue: 'Aparell que marca les hores.' },
    { letter: 'S', mode: 'comença', word: 'sabata',    clue: 'Peça de calçat que es posa al peu.' },
    { letter: 'T', mode: 'comença', word: 'tortuga',   clue: 'Rèptil molt lent que porta closca a sobre.' },
    { letter: 'U', mode: 'comença', word: 'ungla',     clue: 'Part dura al final de cada dit.' },
    { letter: 'V', mode: 'comença', word: 'vent',      clue: 'Aire en moviment.' },
    { letter: 'X', mode: 'comença', word: 'xai',       clue: 'Cria de l’ovella.' },
    { letter: 'Z', mode: 'comença', word: 'zoo',       clue: 'Lloc on es poden veure animals salvatges.' },
  ],
  // Rosco 3
  [
    { letter: 'A', mode: 'comença', word: 'aigua',   clue: 'Líquid transparent que bevem cada dia.' },
    { letter: 'B', mode: 'comença', word: 'bosc',    clue: 'Lloc de natura ple d’arbres.' },
    { letter: 'C', mode: 'comença', word: 'cuina',   clue: 'Habitació de la casa on es preparen els àpats.' },
    { letter: 'D', mode: 'comença', word: 'dent',    clue: 'Peça blanca de la boca per mastegar.' },
    { letter: 'E', mode: 'comença', word: 'escola',  clue: 'Lloc on els nens van a aprendre.' },
    { letter: 'F', mode: 'comença', word: 'foc',     clue: 'Flama que crema i fa calor.' },
    { letter: 'G', mode: 'comença', word: 'gel',     clue: 'Aigua congelada i sòlida.' },
    { letter: 'H', mode: 'comença', word: 'herba',   clue: 'Planta verda i baixa que cobreix el terra.' },
    { letter: 'I', mode: 'comença', word: 'insecte', clue: 'Animal petit de sis potes, com la formiga.' },
    { letter: 'J', mode: 'comença', word: 'jersei',  clue: 'Peça de roba de llana per a l’hivern.' },
    { letter: 'L', mode: 'comença', word: 'llapis',  clue: 'Estri de fusta amb mina per escriure.' },
    { letter: 'M', mode: 'comença', word: 'meló',    clue: 'Fruita gran i dolça típica de l’estiu.' },
    { letter: 'N', mode: 'comença', word: 'nen',     clue: 'Persona de molt poca edat.' },
    { letter: 'O', mode: 'comença', word: 'ou',      clue: 'Aliment oval que ponen les gallines.' },
    { letter: 'P', mode: 'comença', word: 'peix',    clue: 'Animal que viu dins l’aigua i té aletes.' },
    { letter: 'Q', mode: 'comença', word: 'quilo',   clue: 'Unitat que serveix per pesar.' },
    { letter: 'R', mode: 'comença', word: 'rosa',    clue: 'Flor amb espines i pètals molt valorada.' },
    { letter: 'S', mode: 'comença', word: 'serp',    clue: 'Rèptil llarg sense potes que s’arrossega.' },
    { letter: 'T', mode: 'comença', word: 'tren',    clue: 'Vehicle llarg que va sobre vies de ferro.' },
    { letter: 'U', mode: 'comença', word: 'urpa',    clue: 'Ungla forta i corba d’animals com el gat.' },
    { letter: 'V', mode: 'comença', word: 'vidre',   clue: 'Material transparent i fràgil de les finestres.' },
    { letter: 'X', mode: 'comença', word: 'xarop',   clue: 'Medicament líquid i dolç per a la tos.' },
    { letter: 'Z', mode: 'comença', word: 'zona',    clue: 'Part o àrea d’un lloc.' },
  ],
  // Rosco 4
  [
    { letter: 'A', mode: 'comença', word: 'ametlla',   clue: 'Fruit sec de closca dura.' },
    { letter: 'B', mode: 'comença', word: 'bolet',     clue: 'Aliment que creix al bosc; alguns són verinosos.' },
    { letter: 'C', mode: 'comença', word: 'castell',   clue: 'Construcció antiga amb torres i muralles.' },
    { letter: 'D', mode: 'comença', word: 'dau',       clue: 'Cub amb punts que es llança en jocs de taula.' },
    { letter: 'E', mode: 'comença', word: 'espelma',   clue: 'Cilindre de cera amb un ble que fa llum.' },
    { letter: 'F', mode: 'comença', word: 'finestra',  clue: 'Obertura a la paret per on entra la llum.' },
    { letter: 'G', mode: 'comença', word: 'gallina',   clue: 'Au de granja que pon ous.' },
    { letter: 'H', mode: 'comença', word: 'home',      clue: 'Persona adulta de sexe masculí.' },
    { letter: 'I', mode: 'comença', word: 'imant',     clue: 'Objecte que atreu el ferro.' },
    { letter: 'J', mode: 'comença', word: 'jugador',   clue: 'Persona que participa en un joc o esport.' },
    { letter: 'L', mode: 'comença', word: 'llet',      clue: 'Líquid blanc que beuen els nadons.' },
    { letter: 'M', mode: 'comença', word: 'mà',        clue: 'Part del cos al final del braç amb cinc dits.' },
    { letter: 'N', mode: 'comença', word: 'neu',       clue: 'Floc blanc i fred que cau a l’hivern.' },
    { letter: 'O', mode: 'comença', word: 'oli',       clue: 'Líquid groc que s’usa per cuinar.' },
    { letter: 'P', mode: 'comença', word: 'pa',        clue: 'Aliment fet amb farina i cuit al forn.' },
    { letter: 'Q', mode: 'comença', word: 'quadern',   clue: 'Llibreta amb fulls per escriure-hi.' },
    { letter: 'R', mode: 'comença', word: 'raïm',      clue: 'Fruita en grans amb què es fa el vi.' },
    { letter: 'S', mode: 'comença', word: 'sabó',      clue: 'Producte per rentar-se que fa escuma.' },
    { letter: 'T', mode: 'comença', word: 'telèfon',   clue: 'Aparell per parlar amb algú que és lluny.' },
    { letter: 'U', mode: 'comença', word: 'univers',   clue: 'Tot l’espai amb les estrelles i els planetes.' },
    { letter: 'V', mode: 'comença', word: 'vela',      clue: 'Tela que empeny el vent en un vaixell.' },
    { letter: 'X', mode: 'comença', word: 'ximpanzé',  clue: 'Mico molt intel·ligent semblant a l’home.' },
    { letter: 'Z', mode: 'comença', word: 'zero',      clue: 'Número que representa cap quantitat.' },
  ],
];

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Colors de cada estat de lletra.
const STATE_COLORS = {
  pending: { bg: 'var(--paper)',  bd: 'var(--line)', fg: 'var(--ink-soft)' },
  ok:      { bg: 'var(--ok)',     bd: 'var(--ink)',  fg: '#FFFFFF' },
  fail:    { bg: 'var(--accent)', bd: 'var(--ink)',  fg: '#FFFFFF' },
  pass:    { bg: '#E8B53A',       bd: 'var(--ink)',  fg: 'var(--ink)' },
};

export default {
  id: 'passaparaula',
  title: 'Passaparaula',
  tagline: 'Completa el rosco de lletres',
  accent: '#E4572E',
  color: '#F4E8D2',
  ready: true,

  instructions: [
    'Un concursant cada cop: passa-li el mòbil i posa en marxa el rellotge.',
    'Per cada lletra surt una pista; digues la paraula que comença per aquella lletra.',
    'Marca "Encertada", "Passa" (hi tornaràs) o "No ho sé" si no la saps.',
    'El torn s’acaba quan s’esgota el temps o quan completes el rosco.',
  ],

  mount(root, { goHome }) {
    const state = {
      timeSec: 120,
      deck: shuffle(ROSCOS.map((_, i) => i)),
      deckIndex: 0,
      rosco: [],
      status: [],
      cur: 0,
      remaining: 0,
      finished: false,
    };

    let timerId = null;
    let revealTimeout = null;
    let revealing = false;

    function stopTimer() {
      if (timerId) { clearInterval(timerId); timerId = null; }
    }
    function clearReveal() {
      if (revealTimeout) { clearTimeout(revealTimeout); revealTimeout = null; }
      revealing = false;
    }
    function leaveGame() {
      stopTimer();
      clearReveal();
      goHome();
    }

    // ---------- tria de rosco (sense repetir) ----------
    function drawRosco() {
      if (state.deckIndex >= state.deck.length) {
        state.deck = shuffle(ROSCOS.map((_, i) => i));
        state.deckIndex = 0;
      }
      state.rosco = ROSCOS[state.deck[state.deckIndex++]];
      state.status = state.rosco.map(() => 'pending');
      state.cur = 0;
    }

    // següent lletra no resolta (pendent o passada) a partir de "from"
    function nextIndex(from) {
      const n = state.rosco.length;
      for (let step = 1; step <= n; step++) {
        const i = (from + step) % n;
        if (state.status[i] === 'pending' || state.status[i] === 'pass') return i;
      }
      return -1;
    }
    const allResolved = () =>
      state.status.every(s => s === 'ok' || s === 'fail');

    // ---------- 1) configuració ----------
    function screenSetup() {
      stopTimer();
      clearReveal();
      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker">Passaparaula</p>
        <h2 style="font-size:30px;margin:6px 0 14px">El rosco de lletres</h2>
        <p class="muted" style="margin:0 0 22px">Un concursant cada cop. Surt una pista per cada lletra de l’abecedari i, contra rellotge, has de dir la paraula. Pots passar i tornar-hi més tard.</p>

        <p class="label" style="margin:0 0 12px">Temps per torn</p>
        <div class="btn-row" id="times">
          ${TIMES.map(t => `<button class="btn ${state.timeSec === t ? 'btn--accent' : 'btn--outline'}" data-time="${t}">${t}s</button>`).join('')}
        </div>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = leaveGame;

      root.querySelectorAll('[data-time]').forEach(b => {
        b.onclick = () => {
          state.timeSec = parseInt(b.dataset.time, 10);
          root.querySelectorAll('[data-time]').forEach(x => {
            x.className = 'btn ' + (parseInt(x.dataset.time, 10) === state.timeSec ? 'btn--accent' : 'btn--outline');
          });
        };
      });

      root.querySelector('#go').onclick = () => { drawRosco(); startRound(); };
    }

    // ---------- 2) rosco ----------
    function startRound() {
      state.finished = false;
      clearReveal();
      renderRound(null);
      startTimer();
    }

    // construeix el cercle de lletres (sin/cos) amb els colors actuals
    function circleHTML(highlight) {
      const n = state.rosco.length;
      const R = 42; // radi en % del contenidor
      const dots = state.rosco.map((e, i) => {
        const ang = (-90 + i * 360 / n) * Math.PI / 180;
        const x = 50 + R * Math.cos(ang);
        const y = 50 + R * Math.sin(ang);
        const c = STATE_COLORS[state.status[i]];
        const isCur = highlight && i === state.cur;
        return `<div style="position:absolute;left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;
          transform:translate(-50%,-50%)${isCur ? ' scale(1.22)' : ''};
          width:30px;height:30px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-family:var(--font-display);font-weight:800;font-size:15px;
          background:${c.bg};border:2px solid ${c.bd};color:${c.fg};
          box-shadow:${isCur ? '0 0 0 3px var(--accent)' : 'none'};
          z-index:${isCur ? 2 : 1};">${e.letter}</div>`;
      }).join('');
      return dots;
    }

    function centerHTML(revealWord) {
      const e = state.rosco[state.cur];
      const label = e.mode === 'comença'
        ? `Comença per ${e.letter}`
        : `Conté la ${e.letter}`;
      if (revealWord) {
        return `
          <div style="font-family:var(--font-display);font-weight:800;font-size:34px;color:var(--accent);line-height:1">${formatTime(Math.max(0, state.remaining))}</div>
          <p class="muted" style="margin-top:14px;font-size:13px">La paraula era</p>
          <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink);line-height:1.05">${revealWord}</div>`;
      }
      return `
        <div id="pp-timer" style="font-family:var(--font-display);font-weight:800;font-size:34px;color:var(--accent);line-height:1">${formatTime(Math.max(0, state.remaining))}</div>
        <p class="kicker" style="margin-top:14px">${label}</p>
        <p style="margin-top:6px;font-size:16px;font-weight:500;color:var(--ink);line-height:1.3">${e.clue}</p>`;
    }

    function renderRound(revealWord) {
      const resolved = state.status.filter(s => s === 'ok' || s === 'fail').length;
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker center">Encertades: ${state.status.filter(s => s === 'ok').length} · Resoltes: ${resolved}/${state.rosco.length}</p>
        <div style="position:relative;width:100%;max-width:360px;margin:10px auto 0;aspect-ratio:1/1">
          ${circleHTML(true)}
          <div style="position:absolute;inset:20%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
            ${centerHTML(revealWord)}
          </div>
        </div>
        <div class="spacer"></div>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn--accent" id="ok">Encertada</button>
          <button class="btn btn--outline" id="pass">Passa</button>
        </div>
        <button class="btn btn--outline" id="dunno" style="margin-top:12px">No ho sé</button>
      `;
      root.querySelector('#home').onclick = leaveGame;
      root.querySelector('#ok').onclick = () => act('ok');
      root.querySelector('#pass').onclick = () => act('pass');
      root.querySelector('#dunno').onclick = () => act('dunno');
    }

    function act(kind) {
      if (revealing || state.finished) return;
      const i = state.cur;
      if (kind === 'ok') {
        state.status[i] = 'ok';
        goNext();
      } else if (kind === 'pass') {
        state.status[i] = 'pass';
        goNext();
      } else { // dunno: marca fallada i mostra breument la paraula
        state.status[i] = 'fail';
        revealing = true;
        renderRound(state.rosco[i].word);
        revealTimeout = setTimeout(() => {
          revealTimeout = null;
          revealing = false;
          goNext();
        }, 1500);
      }
    }

    function goNext() {
      if (allResolved()) { endTurn(); return; }
      const n = nextIndex(state.cur);
      if (n === -1) { endTurn(); return; }
      state.cur = n;
      renderRound(null);
    }

    // ---------- temporitzador ----------
    function startTimer() {
      stopTimer();
      state.remaining = state.timeSec;
      timerId = setInterval(() => {
        state.remaining--;
        const el = root.querySelector('#pp-timer');
        if (el) el.textContent = formatTime(Math.max(0, state.remaining));
        if (state.remaining <= 0) { stopTimer(); endTurn(); }
      }, 1000);
    }

    function endTurn() {
      if (state.finished) return;
      state.finished = true;
      stopTimer();
      clearReveal();
      screenFinal();
    }

    // ---------- 3) final ----------
    function screenFinal() {
      const score = state.status.filter(s => s === 'ok').length;
      const reveal = state.rosco.map((e, i) => {
        const c = STATE_COLORS[state.status[i]];
        return `
          <div style="display:flex;align-items:center;gap:10px;background:var(--paper);border:2px solid var(--ink);border-radius:var(--r-sm);padding:8px 12px">
            <span style="flex:0 0 auto;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:14px;background:${c.bg};border:2px solid ${c.bd};color:${c.fg}">${e.letter}</span>
            <span style="font-family:var(--font-display);font-weight:700;font-size:16px">${e.word}</span>
          </div>`;
      }).join('');

      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker center">Fi del torn</p>
        <div class="reveal-card" id="card" style="cursor:default;min-height:0;padding:24px;flex:0 0 auto">
          <div class="who">Has encertat</div>
          <div class="word">${score} de ${state.rosco.length}</div>
        </div>
        <div style="position:relative;width:100%;max-width:300px;margin:18px auto 0;aspect-ratio:1/1">
          ${circleHTML(false)}
        </div>
        <p class="label" style="margin:22px 0 12px">Les paraules</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${reveal}</div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:20px">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      root.querySelector('#back').onclick = leaveGame;
      root.querySelector('#home').onclick = leaveGame;
      root.querySelector('#again').onclick = () => { drawRosco(); startRound(); };
    }

    screenSetup();
  },
};
