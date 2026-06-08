// ============================================================
// Passaparaula — el rosco de lletres
//
// Per torns: cada jugador fa el seu rosco contra rellotge. Per cada
// lletra surt una pista i el jugador ESCRIU la paraula; es comprova
// contra una llista de respostes vàlides (insensible a accents i
// majúscules). Pot encertar (verd), passar (groc, hi torna) o fallar
// (vermell). Al final, classificació de tots els jugadors per encerts.
//
// Flux: configuració (jugadors + temps) -> passa el mòbil -> rosco
//       (cercle de lletres + pista + camp de text) -> següent jugador
//       -> final (classificació + guanyador).
// Reaprofita els noms (store.js) i l'estètica (.btn, .back, beix).
// ============================================================

import { getPlayers, setPlayers } from './store.js';

// Opcions de temps per torn (segons).
const TIMES = [90, 120, 150];

// ---------- roscos ----------
// Cada rosco: una entrada per a cada lletra de A a Z.
//   { letter, mode, answers, clue }
//   mode = "comença" (la paraula comença per la lletra) o "conté".
//   answers = respostes vàlides; answers[0] és la principal (la que es
//     revela en fallar). La pista (clue) mai conté la paraula principal.
const ROSCOS = [
  // Rosco 1
  [
    { letter: 'A', mode: 'comença', answers: ['arbre', 'arbres'], clue: 'Planta de tronc llenyós amb branques i fulles.' },
    { letter: 'B', mode: 'comença', answers: ['barca', 'barques', 'bot', 'vaixell'], clue: 'Nau petita per anar per sobre l’aigua.' },
    { letter: 'C', mode: 'comença', answers: ['cavall', 'cavalls', 'poni'], clue: 'Animal de quatre potes que es pot muntar i galopa.' },
    { letter: 'D', mode: 'comença', answers: ['dofí', 'dofins'], clue: 'Mamífer marí molt intel·ligent que viu al mar.' },
    { letter: 'E', mode: 'comença', answers: ['estrella', 'estrelles', 'estel'], clue: 'Punt lluminós que es veu al cel de nit.' },
    { letter: 'F', mode: 'comença', answers: ['formatge', 'formatges'], clue: 'Aliment fet amb llet, sovint de color groc.' },
    { letter: 'G', mode: 'comença', answers: ['girafa', 'girafes'], clue: 'Animal africà amb el coll molt llarg.' },
    { letter: 'H', mode: 'comença', answers: ['hivern', 'ivern'], clue: 'Estació de l’any més freda.' },
    { letter: 'I', mode: 'comença', answers: ['illa', 'illes'], clue: 'Tros de terra envoltat d’aigua per tots costats.' },
    { letter: 'J', mode: 'comença', answers: ['joguina', 'joguines', 'joguet', 'joguets'], clue: 'Objecte amb què s’entretenen els nens.' },
    { letter: 'K', mode: 'conté',   answers: ['kiwi', 'kiwis'], clue: 'Fruita verda per dins i peluda per fora.' },
    { letter: 'L', mode: 'comença', answers: ['lluna', 'llunes'], clue: 'Satèl·lit que il·lumina la nit.' },
    { letter: 'M', mode: 'comença', answers: ['muntanya', 'muntanyes', 'mont'], clue: 'Gran elevació del terreny.' },
    { letter: 'N', mode: 'comença', answers: ['núvol', 'núvols'], clue: 'Massa blanca al cel que pot portar pluja.' },
    { letter: 'O', mode: 'comença', answers: ['ocell', 'ocells', 'au', 'aus', 'pardal'], clue: 'Animal amb plomes i ales que vola.' },
    { letter: 'P', mode: 'comença', answers: ['poma', 'pomes'], clue: 'Fruita rodona, sovint vermella o verda.' },
    { letter: 'Q', mode: 'comença', answers: ['quadre', 'quadres', 'pintura', 'pintures'], clue: 'Obra pintada i emmarcada que es penja a la paret.' },
    { letter: 'R', mode: 'comença', answers: ['riu', 'rius'], clue: 'Corrent d’aigua que baixa cap al mar.' },
    { letter: 'S', mode: 'comença', answers: ['sol', 'solet'], clue: 'Estrella que ens dona llum i calor de dia.' },
    { letter: 'T', mode: 'comença', answers: ['taula', 'taules'], clue: 'Moble pla amb potes per menjar o treballar.' },
    { letter: 'U', mode: 'comença', answers: ['ull', 'ulls'], clue: 'Òrgan del cos que serveix per veure.' },
    { letter: 'V', mode: 'comença', answers: ['vaca', 'vaques', 'vedella'], clue: 'Animal de granja que dona llet.' },
    { letter: 'W', mode: 'conté',   answers: ['wifi', 'wi-fi'], clue: 'Connexió a internet sense cables.' },
    { letter: 'X', mode: 'comença', answers: ['xocolata', 'xocolates', 'xocolatina'], clue: 'Dolç de color marró fet amb cacau.' },
    { letter: 'Y', mode: 'conté',   answers: ['spray', 'espray', 'esprai'], clue: 'Pot que dispara líquid en forma de núvol fi.' },
    { letter: 'Z', mode: 'comença', answers: ['zebra', 'zebres'], clue: 'Animal africà amb ratlles blanques i negres.' },
  ],
  // Rosco 2
  [
    { letter: 'A', mode: 'comença', answers: ['avió', 'avions', 'aeroplà'], clue: 'Aparell que vola i transporta passatgers pel cel.' },
    { letter: 'B', mode: 'comença', answers: ['bicicleta', 'bicicletes', 'bici', 'bicis'], clue: 'Vehicle de dues rodes que es mou pedalant.' },
    { letter: 'C', mode: 'comença', answers: ['cargol', 'cargols', 'caragol', 'caragols'], clue: 'Animal petit i lent que porta la closca a sobre.' },
    { letter: 'D', mode: 'comença', answers: ['dia', 'dies', 'jornada'], clue: 'Període de llum entre dues nits.' },
    { letter: 'E', mode: 'comença', answers: ['elefant', 'elefants'], clue: 'Animal gros amb trompa i orelles grans.' },
    { letter: 'F', mode: 'comença', answers: ['flor', 'flors'], clue: 'Part bonica i acolorida d’una planta.' },
    { letter: 'G', mode: 'comença', answers: ['gat', 'gats', 'gatet', 'moix'], clue: 'Animal domèstic que fa miau.' },
    { letter: 'H', mode: 'comença', answers: ['hospital', 'hospitals', 'clínica'], clue: 'Lloc on guareixen els malalts.' },
    { letter: 'I', mode: 'comença', answers: ['iogurt', 'iogurts', 'jogurt'], clue: 'Aliment cremós fet amb llet fermentada.' },
    { letter: 'J', mode: 'comença', answers: ['jardí', 'jardins', 'hort'], clue: 'Espai amb plantes i flors al voltant d’una casa.' },
    { letter: 'K', mode: 'conté',   answers: ['koala', 'koales'], clue: 'Animal australià que viu enfilat als eucaliptus.' },
    { letter: 'L', mode: 'comença', answers: ['llibre', 'llibres'], clue: 'Conjunt de fulls amb text per llegir.' },
    { letter: 'M', mode: 'comença', answers: ['mar', 'mars', 'oceà'], clue: 'Gran extensió d’aigua salada.' },
    { letter: 'N', mode: 'comença', answers: ['nas', 'nassos'], clue: 'Part de la cara que serveix per olorar.' },
    { letter: 'O', mode: 'comença', answers: ['os', 'ossos'], clue: 'Animal gros i pelut que hiberna a l’hivern.' },
    { letter: 'P', mode: 'comença', answers: ['pilota', 'pilotes', 'baló', 'bola'], clue: 'Objecte rodó amb què es juga a futbol.' },
    { letter: 'Q', mode: 'comença', answers: ['queixal', 'queixals', 'molar'], clue: 'Dent grossa del fons de la boca per mastegar.' },
    { letter: 'R', mode: 'comença', answers: ['rellotge', 'rellotges'], clue: 'Aparell que marca les hores.' },
    { letter: 'S', mode: 'comença', answers: ['sabata', 'sabates', 'calçat', 'bamba', 'bambes'], clue: 'Peça que es posa al peu per caminar.' },
    { letter: 'T', mode: 'comença', answers: ['tortuga', 'tortugues'], clue: 'Rèptil molt lent que porta closca a sobre.' },
    { letter: 'U', mode: 'comença', answers: ['ungla', 'ungles'], clue: 'Part dura que tenim al final de cada dit.' },
    { letter: 'V', mode: 'comença', answers: ['vent', 'vents', 'ventada', 'aire'], clue: 'Corrent d’aire en moviment.' },
    { letter: 'W', mode: 'conté',   answers: ['web', 'webs', 'pàgina web', 'lloc web'], clue: 'Lloc d’internet que es visita amb el navegador.' },
    { letter: 'X', mode: 'comença', answers: ['xai', 'xais', 'be', 'anyell', 'corder'], clue: 'Cria de l’ovella.' },
    { letter: 'Y', mode: 'conté',   answers: ['hobby', 'hobbies', 'passatemps'], clue: 'Activitat que es fa per gust en el temps lliure.' },
    { letter: 'Z', mode: 'comença', answers: ['zoo', 'zoos', 'zoològic'], clue: 'Lloc on es poden veure animals salvatges.' },
  ],
  // Rosco 3
  [
    { letter: 'A', mode: 'comença', answers: ['aigua', 'aigües'], clue: 'Líquid transparent que bevem cada dia.' },
    { letter: 'B', mode: 'comença', answers: ['bosc', 'boscos', 'selva'], clue: 'Lloc de natura ple d’arbres.' },
    { letter: 'C', mode: 'comença', answers: ['cuina', 'cuines'], clue: 'Habitació de la casa on es preparen els àpats.' },
    { letter: 'D', mode: 'comença', answers: ['dent', 'dents', 'queixal'], clue: 'Peça blanca de la boca per mastegar.' },
    { letter: 'E', mode: 'comença', answers: ['escola', 'escoles', 'col·legi', 'cole'], clue: 'Lloc on els nens van a aprendre.' },
    { letter: 'F', mode: 'comença', answers: ['foc', 'focs', 'flama', 'flames', 'foguera'], clue: 'Allò que crema, fa llum i dona calor.' },
    { letter: 'G', mode: 'comença', answers: ['gel', 'glaç', 'glaçó', 'glaçons'], clue: 'Aigua que el fred ha tornat sòlida.' },
    { letter: 'H', mode: 'comença', answers: ['herba', 'herbes', 'gespa'], clue: 'Planta verda i baixa que cobreix el terra.' },
    { letter: 'I', mode: 'comença', answers: ['insecte', 'insectes', 'bestiola', 'cuc'], clue: 'Animal petit de sis potes, com la formiga.' },
    { letter: 'J', mode: 'comença', answers: ['jersei', 'jerseis', 'suèter', 'pul·lover'], clue: 'Peça de roba de llana per a l’hivern.' },
    { letter: 'K', mode: 'conté',   answers: ['bikini', 'bikinis'], clue: 'Banyador de dues peces.' },
    { letter: 'L', mode: 'comença', answers: ['llapis', 'llapissos'], clue: 'Estri de fusta amb mina per escriure.' },
    { letter: 'M', mode: 'comença', answers: ['meló', 'melons'], clue: 'Fruita gran i dolça típica de l’estiu.' },
    { letter: 'N', mode: 'comença', answers: ['nen', 'nens', 'nan', 'nano', 'infant', 'criatura'], clue: 'Persona de molt poca edat.' },
    { letter: 'O', mode: 'comença', answers: ['ou', 'ous'], clue: 'Aliment oval que ponen les gallines.' },
    { letter: 'P', mode: 'comença', answers: ['peix', 'peixos'], clue: 'Animal que viu dins l’aigua i té aletes.' },
    { letter: 'Q', mode: 'comença', answers: ['quilo', 'quilos', 'kilo', 'quilogram', 'kg'], clue: 'Unitat que serveix per pesar.' },
    { letter: 'R', mode: 'comença', answers: ['rosa', 'roses', 'flor'], clue: 'Planta amb espines i pètals molt valorada.' },
    { letter: 'S', mode: 'comença', answers: ['serp', 'serps', 'escurçó', 'serpent'], clue: 'Rèptil llarg sense potes que s’arrossega.' },
    { letter: 'T', mode: 'comença', answers: ['tren', 'trens'], clue: 'Vehicle llarg que va sobre vies de ferro.' },
    { letter: 'U', mode: 'comença', answers: ['urpa', 'urpes', 'grapa', 'arpa'], clue: 'Ungla forta i corba d’animals com el gat.' },
    { letter: 'V', mode: 'comença', answers: ['vidre', 'vidres', 'cristall'], clue: 'Material transparent i fràgil de les finestres.' },
    { letter: 'W', mode: 'conté',   answers: ['windsurf', 'surf de vela'], clue: 'Esport de lliscar sobre l’aigua amb una vela i una taula.' },
    { letter: 'X', mode: 'comença', answers: ['xarop', 'xarops'], clue: 'Medicament líquid i dolç per a la tos.' },
    { letter: 'Y', mode: 'conté',   answers: ['rugby', 'rugbi'], clue: 'Esport amb una pilota ovalada on es marca assaig.' },
    { letter: 'Z', mode: 'comença', answers: ['zona', 'zones', 'àrea', 'sector'], clue: 'Part o tros delimitat d’un lloc.' },
  ],
  // Rosco 4
  [
    { letter: 'A', mode: 'comença', answers: ['ametlla', 'ametlles'], clue: 'Fruit sec de closca dura.' },
    { letter: 'B', mode: 'comença', answers: ['bolet', 'bolets', 'rovelló', 'xampinyó'], clue: 'Aliment que creix al bosc; alguns són verinosos.' },
    { letter: 'C', mode: 'comença', answers: ['castell', 'castells', 'fortalesa', 'fortí'], clue: 'Construcció antiga amb torres i muralles.' },
    { letter: 'D', mode: 'comença', answers: ['dau', 'daus'], clue: 'Cub amb punts que es llança en jocs de taula.' },
    { letter: 'E', mode: 'comença', answers: ['espelma', 'espelmes', 'candela', 'ciri', 'ciris'], clue: 'Cilindre de cera amb un ble que fa llum.' },
    { letter: 'F', mode: 'comença', answers: ['finestra', 'finestres', 'finestral'], clue: 'Obertura a la paret per on entra la llum.' },
    { letter: 'G', mode: 'comença', answers: ['gallina', 'gallines', 'pollastre'], clue: 'Au de granja que pon ous.' },
    { letter: 'H', mode: 'comença', answers: ['home', 'homes', 'senyor', 'noi'], clue: 'Persona adulta de sexe masculí.' },
    { letter: 'I', mode: 'comença', answers: ['imant', 'imants'], clue: 'Objecte que atreu el ferro.' },
    { letter: 'J', mode: 'comença', answers: ['jugador', 'jugadors', 'jugadora', 'jugadores'], clue: 'Persona que participa en un joc o esport.' },
    { letter: 'K', mode: 'conté',   answers: ['kàrate', 'karate'], clue: 'Art marcial japonès de cops i defenses amb les mans.' },
    { letter: 'L', mode: 'comença', answers: ['llet', 'llets'], clue: 'Líquid blanc que beuen els nadons.' },
    { letter: 'M', mode: 'comença', answers: ['mà', 'mans'], clue: 'Part del cos al final del braç amb cinc dits.' },
    { letter: 'N', mode: 'comença', answers: ['neu', 'neus', 'nevada'], clue: 'Floc blanc i fred que cau a l’hivern.' },
    { letter: 'O', mode: 'comença', answers: ['oli', 'olis'], clue: 'Líquid groc que s’usa per cuinar i amanir.' },
    { letter: 'P', mode: 'comença', answers: ['pa', 'pans', 'barra'], clue: 'Aliment fet amb farina i cuit al forn.' },
    { letter: 'Q', mode: 'comença', answers: ['quadern', 'quaderns', 'llibreta', 'llibretes'], clue: 'Conjunt de fulls cosits per escriure-hi.' },
    { letter: 'R', mode: 'comença', answers: ['raïm', 'raïms'], clue: 'Fruita en grans amb què es fa el vi.' },
    { letter: 'S', mode: 'comença', answers: ['sabó', 'sabons'], clue: 'Producte per rentar-se que fa escuma.' },
    { letter: 'T', mode: 'comença', answers: ['telèfon', 'telèfons', 'mòbil', 'mòbils'], clue: 'Aparell per parlar amb algú que és lluny.' },
    { letter: 'U', mode: 'comença', answers: ['univers', 'universos', 'cosmos'], clue: 'Tot l’espai amb les estrelles i els planetes.' },
    { letter: 'V', mode: 'comença', answers: ['vela', 'veles'], clue: 'Tela que empeny el vent en un vaixell.' },
    { letter: 'W', mode: 'conté',   answers: ['waterpolo', 'water-polo', 'water polo'], clue: 'Esport d’equip que es juga dins una piscina amb una pilota.' },
    { letter: 'X', mode: 'comença', answers: ['ximpanzé', 'ximpanzés', 'mico', 'mona', 'simi'], clue: 'Primat molt intel·ligent semblant a l’home.' },
    { letter: 'Y', mode: 'conté',   answers: ['ferry', 'ferris', 'transbordador'], clue: 'Vaixell gran que transporta cotxes i passatgers.' },
    { letter: 'Z', mode: 'comença', answers: ['zero', 'zeros', 'cap'], clue: 'Número que representa cap quantitat.' },
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

// Normalitza per comparar: minúscules, sense accents/diacrítics, sense
// espais ni signes (·, guions, apòstrofs...). Així "Wi-Fi" == "wifi".
function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
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
    'Per torns: cada jugador fa el seu rosco. Passa-li el mòbil quan li toqui.',
    'Per cada lletra surt una pista; escriu la paraula i prem "Comprova".',
    'Si no la saps, prem "Passa" i la lletra tornarà a sortir més tard.',
    'El torn s’acaba quan s’esgota el temps o completes el rosco; al final, classificació.',
  ],

  mount(root, { goHome }) {
    // Carrega els noms recordats; mínim 2 jugadors.
    const saved = getPlayers();
    const initialNames = (Array.isArray(saved) && saved.length) ? saved.slice(0, 12) : ['', ''];
    while (initialNames.length < 2) initialNames.push('');

    const state = {
      names: initialNames,
      timeSec: 120,
      deck: shuffle(ROSCOS.map((_, i) => i)),
      deckIndex: 0,
      // per partida
      scores: [],
      order: [],
      turn: 0,
      // per torn
      rosco: [],
      status: [],
      cur: 0,
      remaining: 0,
      finished: false,
    };

    let timerId = null;
    let revealTimeout = null;
    let revealing = false;

    const count = () => state.names.length;
    const getName = (i) => (state.names[i] && state.names[i].trim()) || `Jugador ${i + 1}`;
    const allFilled = () => state.names.every((n) => (n || '').trim() !== '');
    const save = () => setPlayers(state.names);

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

    function readNames() {
      for (let i = 0; i < count(); i++) {
        const el = root.querySelector('#name-' + i);
        if (el) state.names[i] = el.value;
      }
    }

    // ---------- 1) configuració ----------
    function screenSetup() {
      stopTimer();
      clearReveal();
      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker">Passaparaula</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>

        <p class="label" style="margin:0 0 12px">Jugadors</p>
        <div class="stack" id="names" style="--stack-gap:10px"></div>
        <button class="btn btn--outline" id="addp" style="margin-top:12px">+ Afegeix jugador</button>

        <p class="label" style="margin:24px 0 12px">Temps per torn</p>
        <div class="btn-row" id="times">
          ${TIMES.map(t => `<button class="btn ${state.timeSec === t ? 'btn--accent' : 'btn--outline'}" data-time="${t}">${t}s</button>`).join('')}
        </div>

        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700;display:none">Cal omplir el nom de tots els jugadors</p>
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
        beginGame();
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
      const canDelete = count() > 2; // mínim 2 jugadors
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

    // ---------- partida (torns) ----------
    function beginGame() {
      state.scores = state.names.map(() => 0);
      state.order = state.names.map((_, i) => i); // una ronda: cadascú un rosco
      state.turn = 0;
      nextTurn();
    }

    const player = () => state.order[state.turn];

    function nextTurn() {
      if (state.turn >= state.order.length) { screenFinal(); return; }
      drawRosco();
      screenPass();
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

    // ---------- 2) passa el mòbil ----------
    function screenPass() {
      stopTimer();
      clearReveal();
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker">Torn ${state.turn + 1} de ${state.order.length}</p>
        <h2 style="font-size:26px;margin:6px 0 18px">Passa el mòbil a<br>${getName(player())}</h2>
        <div class="reveal-card tap-hint" id="card">
          <div class="word" style="font-size:28px">Toca per<br>començar el rosco</div>
        </div>
        <div class="spacer"></div>
        <p class="muted center">Tu sol contra el rellotge!</p>
      `;
      root.querySelector('#home').onclick = leaveGame;
      root.querySelector('#card').onclick = startRound;
    }

    // ---------- 3) rosco ----------
    function startRound() {
      state.finished = false;
      clearReveal();
      renderRound(null);
      startTimer();
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
    const allResolved = () => state.status.every(s => s === 'ok' || s === 'fail');

    // cercle de lletres (sin/cos) amb els colors actuals
    function circleHTML(highlight) {
      const n = state.rosco.length;
      const R = 42; // radi en % del contenidor
      return state.rosco.map((e, i) => {
        const ang = (-90 + i * 360 / n) * Math.PI / 180;
        const x = 50 + R * Math.cos(ang);
        const y = 50 + R * Math.sin(ang);
        const c = STATE_COLORS[state.status[i]];
        const isCur = highlight && i === state.cur;
        return `<div style="position:absolute;left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;
          transform:translate(-50%,-50%)${isCur ? ' scale(1.22)' : ''};
          width:28px;height:28px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-family:var(--font-display);font-weight:800;font-size:14px;
          background:${c.bg};border:2px solid ${c.bd};color:${c.fg};
          box-shadow:${isCur ? '0 0 0 3px var(--accent)' : 'none'};
          z-index:${isCur ? 2 : 1};">${e.letter}</div>`;
      }).join('');
    }

    function centerHTML(revealWord) {
      const e = state.rosco[state.cur];
      const label = e.mode === 'comença' ? `Comença per ${e.letter}` : `Conté la ${e.letter}`;
      if (revealWord) {
        return `
          <div style="font-family:var(--font-display);font-weight:800;font-size:32px;color:var(--accent);line-height:1">${formatTime(Math.max(0, state.remaining))}</div>
          <p class="muted" style="margin-top:12px;font-size:13px">La paraula era</p>
          <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink);line-height:1.05">${revealWord}</div>`;
      }
      return `
        <div id="pp-timer" style="font-family:var(--font-display);font-weight:800;font-size:32px;color:var(--accent);line-height:1">${formatTime(Math.max(0, state.remaining))}</div>
        <p class="kicker" style="margin-top:12px">${label}</p>
        <p style="margin-top:6px;font-size:15px;font-weight:500;color:var(--ink);line-height:1.3">${e.clue}</p>`;
    }

    function renderRound(revealWord) {
      const resolved = state.status.filter(s => s === 'ok' || s === 'fail').length;
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker center">${getName(player())} · Resoltes: ${resolved}/${state.rosco.length}</p>
        <div style="position:relative;width:100%;max-width:330px;margin:8px auto 0;aspect-ratio:1/1">
          ${circleHTML(true)}
          <div style="position:absolute;inset:19%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
            ${centerHTML(revealWord)}
          </div>
        </div>
        <div class="spacer"></div>
        <input class="input" id="pp-input" type="text" maxlength="24" autocomplete="off"
          autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Escriu la paraula"
          style="margin-top:14px;text-align:center;font-family:var(--font-display);font-weight:700;font-size:18px"${revealWord ? ' disabled' : ''}>
        <div class="btn-row" style="margin-top:12px">
          <button class="btn btn--accent" id="check"${revealWord ? ' disabled' : ''}>Comprova</button>
          <button class="btn btn--outline" id="pass"${revealWord ? ' disabled' : ''}>Passa</button>
        </div>
      `;
      root.querySelector('#home').onclick = leaveGame;
      const input = root.querySelector('#pp-input');
      root.querySelector('#check').onclick = checkAnswer;
      root.querySelector('#pass').onclick = passLetter;
      if (input && !revealWord) {
        input.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); checkAnswer(); } };
        input.focus();
      }
    }

    function checkAnswer() {
      if (revealing || state.finished) return;
      const input = root.querySelector('#pp-input');
      const val = input ? input.value : '';
      if (norm(val) === '') { if (input) input.focus(); return; } // ignora buit
      const i = state.cur;
      const e = state.rosco[i];
      const hit = e.answers.some(a => norm(a) === norm(val));
      if (hit) {
        state.status[i] = 'ok';
        goNext();
      } else {
        state.status[i] = 'fail';
        revealing = true;
        renderRound(e.answers[0]); // mostra breument la paraula principal
        revealTimeout = setTimeout(() => {
          revealTimeout = null;
          revealing = false;
          goNext();
        }, 1500);
      }
    }

    function passLetter() {
      if (revealing || state.finished) return;
      state.status[state.cur] = 'pass';
      goNext();
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
      state.scores[player()] = state.status.filter(s => s === 'ok').length;
      state.turn++;
      nextTurn();
    }

    // ---------- 4) final: classificació ----------
    function screenFinal() {
      stopTimer();
      clearReveal();
      const max = Math.max(...state.scores);
      const winners = state.names.map((_, i) => i).filter(i => state.scores[i] === max);
      const tie = winners.length > 1;
      const winNames = winners.map(i => getName(i)).join(' i ');

      const order = state.names
        .map((_, i) => i)
        .sort((a, b) => state.scores[b] - state.scores[a] || a - b);
      const rows = order.map(i => `
        <div class="btn btn--outline rank-row" style="cursor:default">
          <span class="rank-row__name">${getName(i)}</span>
          <span class="rank-row__pts">${state.scores[i]}</span>
        </div>`).join('');

      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker center">Final</p>
        <div class="reveal-card" id="card" style="cursor:default;min-height:0;flex:0 0 auto;padding:24px">
          <div class="who">${tie ? 'Empat! Guanyen...' : 'Guanya...'}</div>
          <div class="word">${winNames}!</div>
          <div class="who">${max} encert${max === 1 ? '' : 's'}</div>
        </div>
        <p class="label" style="margin:22px 0 12px">Classificació</p>
        <div class="stack" style="--stack-gap:10px">${rows}</div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:20px">
          <button class="btn btn--accent" id="again">Una altra partida</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      root.querySelector('#back').onclick = leaveGame;
      root.querySelector('#home').onclick = leaveGame;
      root.querySelector('#again').onclick = beginGame;
    }

    screenSetup();
  },
};
