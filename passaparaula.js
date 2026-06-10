// ============================================================
// Passaparaula — el rosco de lletres (torns rotatius amb eliminació)
//
// UN rosco compartit. Els jugadors s'alternen lletra a lletra (A →
// jugador 1, B → jugador 2...). Abans de cada torn es passa el mòbil;
// el temporitzador només corre quan el jugador ja té la pista davant.
//   · Encerta  -> verd, +1 encert, següent lletra i jugador.
//   · Passa    -> groc (la lletra tornarà), següent, sense penalització.
//   · Falla o se li acaba el temps -> ELIMINAT.
// Guanya l'últim jugador viu; si es resol tot el rosco amb més d'un viu,
// guanya qui tingui més encerts. A la classificació, cada jugador és
// clicable i mostra les seves paraules encertades i passades.
//
// El contingut és una BOSSA de paraules per lletra ({ answers, clue });
// cada torn n'agafa una a l'atzar sense repetir dins la partida.
// Reaprofita els noms (store.js) i l'estètica (.btn, .back, beix).
// ============================================================

import { getPlayers, setPlayers } from './store.js';

// Temps PER TORN (segons).
const TIMES = [15, 20, 30];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Lletres escasses a principi de paraula: es demana que la "continguin".
const CONTE = new Set(['K', 'W', 'X', 'Y', 'Z']);
const modeOf = (L) => (CONTE.has(L) ? 'conté' : 'comença');

// ---------- bossa de paraules per lletra ----------
// answers[0] és la principal (es revela en fallar i es desa a les llistes).
// La pista (clue) no conté la paraula principal.
const WORDS = {
  A: [
    { answers: ['arbre', 'arbres'], clue: 'Planta de tronc llenyós amb branques i fulles.' },
    { answers: ['aigua', 'aigües'], clue: 'Líquid transparent que bevem cada dia.' },
    { answers: ['avió', 'avions', 'aeroplà'], clue: 'Aparell que vola i porta passatgers pel cel.' },
    { answers: ['ametlla', 'ametlles'], clue: 'Fruit sec de closca dura.' },
    { answers: ['arròs'], clue: 'Gra blanc que es bull, base de la paella.' },
    { answers: ['ànec', 'ànecs'], clue: 'Au d’aigua que fa "qua-qua".' },
    { answers: ['anell', 'anells'], clue: 'Joia rodona que es porta al dit.' },
    { answers: ['abella', 'abelles'], clue: 'Insecte que fa mel i pot picar.' },
    { answers: ['ala', 'ales'], clue: 'Part del cos dels ocells que fan servir per volar.' },
    { answers: ['amic', 'amics'], clue: 'Persona amb qui tens confiança i bona relació.' },
    { answers: ['ascensor', 'ascensors'], clue: 'Aparell que puja i baixa la gent entre pisos.' },
    { answers: ['astronauta', 'astronautes'], clue: 'Persona que viatja a l’espai.' },
    { answers: ['ambulància', 'ambulàncies'], clue: 'Vehicle que porta els malalts de pressa a l’hospital.' },
    { answers: ['aranya', 'aranyes'], clue: 'Animal de vuit potes que teixeix teranyines.' },
    { answers: ['aeroport', 'aeroports'], clue: 'Lloc des d’on enlairen i aterren els avions.' },
    { answers: ['avi', 'avis'], clue: 'Pare del pare o de la mare.' },
  ],
  B: [
    { answers: ['barca', 'barques', 'bot'], clue: 'Nau petita per anar per sobre l’aigua.' },
    { answers: ['bicicleta', 'bicicletes', 'bici'], clue: 'Vehicle de dues rodes que es mou pedalant.' },
    { answers: ['bola', 'boles'], clue: 'Objecte rodó que pot rodar.' },
    { answers: ['bolet', 'bolets'], clue: 'Aliment que creix al bosc; alguns són verinosos.' },
    { answers: ['bosc', 'boscos'], clue: 'Lloc de natura ple d’arbres.' },
    { answers: ['burro', 'burros', 'ase'], clue: 'Animal de càrrega amb orelles llargues.' },
    { answers: ['balena', 'balenes'], clue: 'Mamífer enorme que viu al mar.' },
    { answers: ['botó', 'botons'], clue: 'Peça rodona que corda la roba.' },
    { answers: ['bomber', 'bombers'], clue: 'Persona que apaga incendis.' },
    { answers: ['braç', 'braços'], clue: 'Part del cos que va de l’espatlla a la mà.' },
    { answers: ['bandera', 'banderes'], clue: 'Tela amb colors que representa un país.' },
    { answers: ['banya', 'banyes'], clue: 'Punxa dura al cap d’alguns animals.' },
    { answers: ['bruixa', 'bruixes'], clue: 'Personatge de contes que vola amb una escombra.' },
    { answers: ['biberó', 'biberons'], clue: 'Recipient amb tetina per donar llet als nadons.' },
    { answers: ['biblioteca', 'biblioteques'], clue: 'Lloc ple de llibres per llegir o emportar-se’ls.' },
    { answers: ['boca', 'boques'], clue: 'Part de la cara amb què mengem i parlem.' },
  ],
  C: [
    { answers: ['cavall', 'cavalls'], clue: 'Animal de quatre potes que es pot muntar i galopa.' },
    { answers: ['cargol', 'cargols', 'caragol'], clue: 'Animal petit i lent que porta la closca a sobre.' },
    { answers: ['cuina', 'cuines'], clue: 'Habitació de la casa on es preparen els àpats.' },
    { answers: ['castell', 'castells'], clue: 'Construcció antiga amb torres i muralles.' },
    { answers: ['cotxe', 'cotxes'], clue: 'Vehicle de quatre rodes amb motor.' },
    { answers: ['conill', 'conills'], clue: 'Animal d’orelles llargues que salta.' },
    { answers: ['cirera', 'cireres'], clue: 'Fruita petita i vermella amb pinyol.' },
    { answers: ['camió', 'camions'], clue: 'Vehicle gran per transportar mercaderies.' },
    { answers: ['cadira', 'cadires'], clue: 'Moble amb respatller per seure.' },
    { answers: ['cuc', 'cucs'], clue: 'Animal petit, llarg i tou sense potes.' },
    { answers: ['cocodril', 'cocodrils'], clue: 'Rèptil gros de la selva amb dents grans.' },
    { answers: ['cel'], clue: 'Allò blau que veiem amunt de dia.' },
    { answers: ['cabra', 'cabres'], clue: 'Animal de granja que grimpa i té banyes.' },
    { answers: ['cigne', 'cignes'], clue: 'Au blanca de coll llarg que neda.' },
    { answers: ['corona', 'corones'], clue: 'Objecte que porta el rei al cap.' },
    { answers: ['campana', 'campanes'], clue: 'Objecte de metall que dringa quan es belluga.' },
  ],
  D: [
    { answers: ['dofí', 'dofins'], clue: 'Mamífer marí molt intel·ligent.' },
    { answers: ['dau', 'daus'], clue: 'Cub amb punts que es llança en jocs de taula.' },
    { answers: ['dit', 'dits'], clue: 'Cadascuna de les cinc parts del final de la mà.' },
    { answers: ['dent', 'dents'], clue: 'Peça blanca de la boca per mastegar.' },
    { answers: ['dia', 'dies'], clue: 'Període de llum entre dues nits.' },
    { answers: ['dimoni', 'dimonis'], clue: 'Personatge vermell amb banyes i forca.' },
    { answers: ['disfressa', 'disfresses'], clue: 'Vestit per semblar un altre personatge.' },
    { answers: ['detectiu', 'detectius'], clue: 'Persona que investiga i resol misteris.' },
    { answers: ['dragó', 'dragons'], clue: 'Bèstia de contes que escup foc i vola.' },
    { answers: ['dentista', 'dentistes'], clue: 'Metge que cura les dents.' },
    { answers: ['dinosaure', 'dinosaures'], clue: 'Animal gegant que va viure fa milions d’anys.' },
    { answers: ['dutxa', 'dutxes'], clue: 'Lloc del bany on et rentes amb aigua que cau.' },
    { answers: ['doctor', 'doctora', 'metge'], clue: 'Persona que cura els malalts.' },
  ],
  E: [
    { answers: ['elefant', 'elefants'], clue: 'Animal gros amb trompa i orelles grans.' },
    { answers: ['estrella', 'estrelles', 'estel'], clue: 'Punt lluminós que es veu al cel de nit.' },
    { answers: ['escola', 'escoles'], clue: 'Lloc on els nens van a aprendre.' },
    { answers: ['espelma', 'espelmes', 'ciri'], clue: 'Cilindre de cera amb un ble que fa llum.' },
    { answers: ['escala', 'escales'], clue: 'Esglaons per pujar i baixar.' },
    { answers: ['esquirol', 'esquirols'], clue: 'Animal petit de cua peluda que grimpa als arbres.' },
    { answers: ['estiu'], clue: 'Estació de l’any més calorosa.' },
    { answers: ['esmorzar', 'esmorzars'], clue: 'Primer àpat del matí.' },
    { answers: ['espasa', 'espases'], clue: 'Arma llarga i punxeguda dels cavallers.' },
    { answers: ['estany', 'estanys'], clue: 'Bassa d’aigua envoltada de terra.' },
    { answers: ['escombra', 'escombres'], clue: 'Estri per agranar el terra.' },
    { answers: ['enciam', 'enciams'], clue: 'Verdura verda de fulles per fer amanida.' },
    { answers: ['eriçó', 'eriçons'], clue: 'Animal petit cobert de punxes.' },
  ],
  F: [
    { answers: ['formatge', 'formatges'], clue: 'Aliment fet amb llet, sovint de color groc.' },
    { answers: ['flor', 'flors'], clue: 'Part bonica i acolorida d’una planta.' },
    { answers: ['foc', 'focs'], clue: 'Allò que crema, fa llum i dona calor.' },
    { answers: ['finestra', 'finestres'], clue: 'Obertura a la paret per on entra la llum.' },
    { answers: ['farina', 'farines'], clue: 'Pols blanca amb què es fa el pa.' },
    { answers: ['fada', 'fades'], clue: 'Personatge màgic amb ales i vareta.' },
    { answers: ['formiga', 'formigues'], clue: 'Insecte petit i treballador que viu en colònies.' },
    { answers: ['forquilla', 'forquilles'], clue: 'Coberts amb pues per punxar el menjar.' },
    { answers: ['forn', 'forns'], clue: 'Aparell de la cuina per coure i escalfar.' },
    { answers: ['fum'], clue: 'Núvol gris que surt del foc.' },
    { answers: ['fulla', 'fulles'], clue: 'Part verda i plana de les plantes.' },
    { answers: ['fanal', 'fanals'], clue: 'Llum del carrer que s’encén de nit.' },
    { answers: ['futbol'], clue: 'Esport d’equip on es xuta una pilota amb el peu.' },
    { answers: ['fantasma', 'fantasmes'], clue: 'Personatge blanc que espanta i travessa parets.' },
  ],
  G: [
    { answers: ['girafa', 'girafes'], clue: 'Animal africà amb el coll molt llarg.' },
    { answers: ['gat', 'gats', 'moix'], clue: 'Animal domèstic que fa miau.' },
    { answers: ['gos', 'gossos', 'ca'], clue: 'Animal domèstic que borda i mou la cua.' },
    { answers: ['gallina', 'gallines'], clue: 'Au de granja que pon ous.' },
    { answers: ['gel', 'glaç'], clue: 'Aigua que el fred ha tornat sòlida.' },
    { answers: ['globus'], clue: 'Bola de goma que s’infla amb aire.' },
    { answers: ['guitarra', 'guitarres'], clue: 'Instrument de corda que es toca amb els dits.' },
    { answers: ['granota', 'granotes'], clue: 'Animal verd que salta i viu prop de l’aigua.' },
    { answers: ['gegant', 'gegants'], clue: 'Personatge dels contes molt i molt alt.' },
    { answers: ['got', 'gots'], clue: 'Recipient per beure.' },
    { answers: ['guant', 'guants'], clue: 'Peça que cobreix la mà i els dits.' },
    { answers: ['gorra', 'gorres'], clue: 'Peça que es posa al cap, amb visera.' },
    { answers: ['galeta', 'galetes'], clue: 'Dolç pla i cruixent per berenar.' },
    { answers: ['guineu', 'guineus'], clue: 'Animal astut de cua peluda i pèl rogenc.' },
    { answers: ['gronxador', 'gronxadors'], clue: 'Joc del parc que es balanceja endavant i enrere.' },
  ],
  H: [
    { answers: ['hivern'], clue: 'Estació de l’any més freda.' },
    { answers: ['hospital', 'hospitals'], clue: 'Lloc on guareixen els malalts.' },
    { answers: ['home', 'homes'], clue: 'Persona adulta de sexe masculí.' },
    { answers: ['herba', 'herbes'], clue: 'Planta verda i baixa que cobreix el terra.' },
    { answers: ['hort', 'horts'], clue: 'Tros de terra on es conreen verdures.' },
    { answers: ['helicòpter', 'helicòpters'], clue: 'Aparell que vola amb una hèlix que gira a dalt.' },
    { answers: ['hamburguesa', 'hamburgueses'], clue: 'Entrepà rodó amb carn picada.' },
    { answers: ['hipopòtam', 'hipopòtams'], clue: 'Animal gros i gris que viu als rius d’Àfrica.' },
    { answers: ['hamaca', 'hamaques'], clue: 'Llit de tela penjat entre dos punts.' },
    { answers: ['heroi', 'herois'], clue: 'Personatge valent que salva la gent.' },
    { answers: ['hora', 'hores'], clue: 'Cadascuna de les vint-i-quatre parts del dia.' },
  ],
  I: [
    { answers: ['illa', 'illes'], clue: 'Tros de terra envoltat d’aigua per tots costats.' },
    { answers: ['insecte', 'insectes'], clue: 'Animal petit de sis potes, com la formiga.' },
    { answers: ['iogurt', 'iogurts'], clue: 'Aliment cremós fet amb llet fermentada.' },
    { answers: ['imant', 'imants'], clue: 'Objecte que atreu el ferro.' },
    { answers: ['iglú', 'iglús'], clue: 'Casa de blocs de gel dels pobles del nord.' },
    { answers: ['imatge', 'imatges'], clue: 'Allò que veus en una foto o una pantalla.' },
    { answers: ['instrument', 'instruments'], clue: 'Objecte per fer música.' },
    { answers: ['infermera', 'infermer', 'infermeres'], clue: 'Persona que té cura dels malalts a l’hospital.' },
    { answers: ['isard', 'isards'], clue: 'Cabra de muntanya dels Pirineus.' },
  ],
  J: [
    { answers: ['joguina', 'joguines', 'joguet'], clue: 'Objecte amb què s’entretenen els nens.' },
    { answers: ['jardí', 'jardins'], clue: 'Espai amb plantes i flors al voltant d’una casa.' },
    { answers: ['jersei', 'jerseis'], clue: 'Peça de roba de llana per a l’hivern.' },
    { answers: ['jugador', 'jugadora', 'jugadors'], clue: 'Persona que participa en un joc o esport.' },
    { answers: ['jaqueta', 'jaquetes'], clue: 'Peça d’abric que es posa sobre la roba.' },
    { answers: ['joia', 'joies'], clue: 'Objecte de valor com un anell o un collaret.' },
    { answers: ['jutge', 'jutgessa', 'jutges'], clue: 'Persona que decideix qui té raó en un judici.' },
    { answers: ['joc', 'jocs'], clue: 'Activitat per divertir-se amb unes regles.' },
    { answers: ['julivert'], clue: 'Herba verda que dona gust als plats.' },
    { answers: ['jaguar', 'jaguars'], clue: 'Felí gros i tacat de la selva americana.' },
  ],
  K: [
    { answers: ['kiwi', 'kiwis'], clue: 'Fruita verda per dins i peluda per fora.' },
    { answers: ['koala', 'koales'], clue: 'Animal australià que viu enfilat als eucaliptus.' },
    { answers: ['bikini', 'bikinis'], clue: 'Banyador de dues peces.' },
    { answers: ['kàrate', 'karate'], clue: 'Art marcial japonès de cops i defenses amb les mans.' },
    { answers: ['kebab', 'kebabs'], clue: 'Entrepà de carn rostida en un ferro vertical.' },
    { answers: ['karaoke', 'karaokes'], clue: 'Activitat de cantar seguint la lletra en una pantalla.' },
    { answers: ['ketchup'], clue: 'Salsa vermella de tomàquet per a les patates.' },
  ],
  L: [
    { answers: ['lluna', 'llunes'], clue: 'Satèl·lit que il·lumina la nit.' },
    { answers: ['llibre', 'llibres'], clue: 'Conjunt de fulls amb text per llegir.' },
    { answers: ['llapis', 'llapissos'], clue: 'Estri de fusta amb mina per escriure.' },
    { answers: ['llet', 'llets'], clue: 'Líquid blanc que beuen els nadons.' },
    { answers: ['lleó', 'lleons'], clue: 'Felí gros amb cabellera, rei de la selva.' },
    { answers: ['llop', 'llops'], clue: 'Animal salvatge semblant a un gos gris.' },
    { answers: ['llimona', 'llimones'], clue: 'Fruita groga i àcida.' },
    { answers: ['llamp', 'llamps'], clue: 'Espurna brillant que cau del cel en una tempesta.' },
    { answers: ['llanterna', 'llanternes'], clue: 'Aparell de mà que fa llum.' },
    { answers: ['llit', 'llits'], clue: 'Moble per dormir.' },
    { answers: ['llàgrima', 'llàgrimes'], clue: 'Gota d’aigua que cau de l’ull quan plores.' },
    { answers: ['lloro', 'lloros'], clue: 'Au de colors que pot repetir paraules.' },
    { answers: ['llac', 'llacs'], clue: 'Gran bassa d’aigua dolça envoltada de terra.' },
    { answers: ['llengua', 'llengües'], clue: 'Part de la boca amb què tastes i parles.' },
  ],
  M: [
    { answers: ['muntanya', 'muntanyes'], clue: 'Gran elevació del terreny.' },
    { answers: ['mar', 'mars'], clue: 'Gran extensió d’aigua salada.' },
    { answers: ['mà', 'mans'], clue: 'Part del cos al final del braç amb cinc dits.' },
    { answers: ['meló', 'melons'], clue: 'Fruita gran i dolça típica de l’estiu.' },
    { answers: ['metge', 'metgessa', 'doctor'], clue: 'Persona que cura els malalts.' },
    { answers: ['mico', 'micos', 'mona'], clue: 'Animal que grimpa i té cua, semblant a l’home.' },
    { answers: ['motxilla', 'motxilles'], clue: 'Bossa que es porta a l’esquena.' },
    { answers: ['maduixa', 'maduixes'], clue: 'Fruita vermella petita amb pics a la pell.' },
    { answers: ['mitjó', 'mitjons'], clue: 'Peça que cobreix el peu sota la sabata.' },
    { answers: ['mòbil', 'mòbils'], clue: 'Aparell per parlar i enviar missatges a distància.' },
    { answers: ['mosca', 'mosques'], clue: 'Insecte volador molt empipador.' },
    { answers: ['màscara', 'màscares', 'careta'], clue: 'Objecte que tapa la cara per amagar-la.' },
    { answers: ['mel'], clue: 'Líquid dolç i daurat que fan les abelles.' },
    { answers: ['melmelada', 'melmelades', 'confitura'], clue: 'Dolç de fruita per untar el pa.' },
  ],
  N: [
    { answers: ['núvol', 'núvols'], clue: 'Massa blanca al cel que pot portar pluja.' },
    { answers: ['nas', 'nassos'], clue: 'Part de la cara que serveix per olorar.' },
    { answers: ['nen', 'nens', 'nan'], clue: 'Persona de molt poca edat.' },
    { answers: ['neu', 'neus'], clue: 'Floc blanc i fred que cau a l’hivern.' },
    { answers: ['nina', 'nines'], clue: 'Joguina amb forma de persona.' },
    { answers: ['nit', 'nits'], clue: 'Estona fosca entre el vespre i el matí.' },
    { answers: ['nadó', 'nadons', 'bebè'], clue: 'Persona acabada de néixer.' },
    { answers: ['nau', 'naus'], clue: 'Vehicle per viatjar per l’espai o el mar.' },
    { answers: ['nadal'], clue: 'Festa de desembre amb arbre i regals.' },
    { answers: ['niu', 'nius'], clue: 'Casa que fan els ocells amb branquetes.' },
    { answers: ['número', 'números', 'xifra'], clue: 'Signe per comptar i fer comptes.' },
    { answers: ['nedador', 'nedadora'], clue: 'Persona que practica la natació.' },
  ],
  O: [
    { answers: ['ocell', 'ocells', 'au', 'pardal'], clue: 'Animal amb plomes i ales que vola.' },
    { answers: ['os', 'ossos'], clue: 'Mamífer gran i pelut que dorm tot l’hivern.' },
    { answers: ['ou', 'ous'], clue: 'Aliment oval que ponen les gallines.' },
    { answers: ['oli', 'olis'], clue: 'Líquid groc que s’usa per cuinar i amanir.' },
    { answers: ['ovella', 'ovelles'], clue: 'Animal de granja de llana blanca que fa "be".' },
    { answers: ['ostra', 'ostres'], clue: 'Marisc de closca aspra que de vegades amaga una perla.' },
    { answers: ['orella', 'orelles'], clue: 'Part del cap que serveix per sentir.' },
    { answers: ['ona', 'ones'], clue: 'Moviment de l’aigua del mar que arriba a la platja.' },
    { answers: ['ordinador', 'ordinadors'], clue: 'Aparell per treballar, jugar i navegar per internet.' },
    { answers: ['òliba', 'òlibes'], clue: 'Au nocturna de cara rodona que caça de nit.' },
    { answers: ['olla', 'olles'], clue: 'Recipient fondo per cuinar al foc.' },
  ],
  P: [
    { answers: ['poma', 'pomes'], clue: 'Fruita rodona, sovint vermella o verda.' },
    { answers: ['pilota', 'pilotes', 'baló'], clue: 'Objecte rodó amb què es juga a futbol.' },
    { answers: ['peix', 'peixos'], clue: 'Animal que viu dins l’aigua i té aletes.' },
    { answers: ['pa', 'pans'], clue: 'Aliment fet amb farina i cuit al forn.' },
    { answers: ['pirata', 'pirates'], clue: 'Lladre que navega i busca tresors.' },
    { answers: ['papallona', 'papallones'], clue: 'Insecte de colors amb ales grans.' },
    { answers: ['porc', 'porcs', 'truja'], clue: 'Animal de granja rosat que fa "oink".' },
    { answers: ['platja', 'platges'], clue: 'Vora de sorra al costat del mar.' },
    { answers: ['pinya', 'pinyes'], clue: 'Fruita tropical amb una corona de fulles punxegudes.' },
    { answers: ['pingüí', 'pingüins'], clue: 'Au blanca i negra que viu al gel i no vola.' },
    { answers: ['patata', 'patates'], clue: 'Tubercle marró que es menja fregit o bullit.' },
    { answers: ['paraigua', 'paraigües'], clue: 'Objecte que et protegeix de la pluja.' },
    { answers: ['pont', 'ponts'], clue: 'Construcció per travessar un riu o una via.' },
    { answers: ['pop', 'pops'], clue: 'Animal marí de vuit braços.' },
    { answers: ['príncep', 'prínceps'], clue: 'Fill d’un rei.' },
  ],
  Q: [
    { answers: ['quadre', 'quadres', 'pintura'], clue: 'Obra pintada i emmarcada que es penja a la paret.' },
    { answers: ['quilo', 'quilos', 'kilo'], clue: 'Unitat que serveix per pesar.' },
    { answers: ['queixal', 'queixals'], clue: 'Dent grossa del fons de la boca per mastegar.' },
    { answers: ['quadern', 'quaderns', 'llibreta'], clue: 'Conjunt de fulls cosits per escriure-hi.' },
    { answers: ['quiosc', 'quioscos'], clue: 'Caseta del carrer on venen diaris i llaminadures.' },
    { answers: ['química'], clue: 'Ciència que estudia de què estan fetes les coses.' },
    { answers: ['quart', 'quarts'], clue: 'Cadascuna de les quatre parts iguals d’un tot.' },
  ],
  R: [
    { answers: ['riu', 'rius'], clue: 'Corrent d’aigua que baixa cap al mar.' },
    { answers: ['rosa', 'roses'], clue: 'Planta amb espines i pètals molt valorada.' },
    { answers: ['raïm', 'raïms'], clue: 'Fruita en grans amb què es fa el vi.' },
    { answers: ['rei', 'reis'], clue: 'Home que governa un regne i porta corona.' },
    { answers: ['rellotge', 'rellotges'], clue: 'Aparell que marca les hores.' },
    { answers: ['ratolí', 'ratolins'], clue: 'Animal petit i gris que agrada al gat.' },
    { answers: ['roda', 'rodes'], clue: 'Peça rodona que gira i fa moure els vehicles.' },
    { answers: ['robot', 'robots'], clue: 'Màquina que es mou i fa tasques sola.' },
    { answers: ['rajola', 'rajoles'], clue: 'Peça plana que cobreix terres i parets.' },
    { answers: ['ratpenat', 'ratpenats'], clue: 'Animal que vola de nit i dorm cap per avall.' },
    { answers: ['regle', 'regles'], clue: 'Estri recte per fer ratlles i mesurar.' },
    { answers: ['raqueta', 'raquetes'], clue: 'Estri per picar la pilota al tenis.' },
  ],
  S: [
    { answers: ['sol'], clue: 'Estrella que ens dona llum i calor de dia.' },
    { answers: ['serp', 'serps'], clue: 'Rèptil llarg sense potes que s’arrossega.' },
    { answers: ['sabata', 'sabates'], clue: 'Peça que es posa al peu per caminar.' },
    { answers: ['sopa', 'sopes'], clue: 'Plat calent i líquid que es pren amb cullera.' },
    { answers: ['sucre'], clue: 'Pols blanca i dolça per endolcir.' },
    { answers: ['samarreta', 'samarretes'], clue: 'Peça de roba per a la part de dalt del cos.' },
    { answers: ['senglar', 'senglars'], clue: 'Porc salvatge del bosc amb ullals.' },
    { answers: ['síndria', 'síndries'], clue: 'Fruita gran, verda per fora i vermella per dins.' },
    { answers: ['sirena', 'sirenes'], clue: 'Ésser mig dona mig peix dels contes.' },
    { answers: ['sabó', 'sabons'], clue: 'Producte per rentar-se que fa escuma.' },
    { answers: ['sofà', 'sofàs'], clue: 'Seient tou i ample per a diverses persones.' },
    { answers: ['setmana', 'setmanes'], clue: 'Conjunt de set dies.' },
    { answers: ['submarí', 'submarins'], clue: 'Vaixell que navega sota l’aigua.' },
    { answers: ['sang'], clue: 'Líquid vermell que circula pel cos.' },
    { answers: ['semàfor', 'semàfors'], clue: 'Llum del carrer que regula el trànsit.' },
  ],
  T: [
    { answers: ['taula', 'taules'], clue: 'Moble pla amb potes per menjar o treballar.' },
    { answers: ['tortuga', 'tortugues'], clue: 'Rèptil molt lent que porta closca a sobre.' },
    { answers: ['tren', 'trens'], clue: 'Vehicle llarg que va sobre vies de ferro.' },
    { answers: ['telèfon', 'telèfons', 'mòbil'], clue: 'Aparell per parlar amb algú que és lluny.' },
    { answers: ['tigre', 'tigres'], clue: 'Felí gros i ratllat de pèl ataronjat.' },
    { answers: ['tomàquet', 'tomàquets'], clue: 'Fruita vermella per a amanides i salses.' },
    { answers: ['tambor', 'tambors'], clue: 'Instrument que es toca picant-lo amb baquetes.' },
    { answers: ['tisores'], clue: 'Estri de dues fulles per tallar paper.' },
    { answers: ['torre', 'torres'], clue: 'Construcció alta i estreta.' },
    { answers: ['taronja', 'taronges'], clue: 'Fruita cítrica rodona, dolça i sucosa.' },
    { answers: ['tauró', 'taurons'], clue: 'Peix gros i perillós amb moltes dents.' },
    { answers: ['teulada', 'teulades'], clue: 'Part de dalt de la casa que la cobreix.' },
    { answers: ['trompeta', 'trompetes'], clue: 'Instrument de vent daurat que es bufa.' },
    { answers: ['tovallola', 'tovalloles'], clue: 'Drap per eixugar-se després de la dutxa.' },
  ],
  U: [
    { answers: ['ull', 'ulls'], clue: 'Òrgan del cos que serveix per veure.' },
    { answers: ['ungla', 'ungles'], clue: 'Part dura que tenim al final de cada dit.' },
    { answers: ['urpa', 'urpes'], clue: 'Ungla forta i corba d’animals com el gat.' },
    { answers: ['univers'], clue: 'Tot l’espai amb les estrelles i els planetes.' },
    { answers: ['unicorn', 'unicorns'], clue: 'Cavall fantàstic amb una banya al front.' },
    { answers: ['uniforme', 'uniformes'], clue: 'Roba igual per a tots els d’un grup o equip.' },
    { answers: ['ulleres'], clue: 'Vidres davant dels ulls per veure-hi millor.' },
  ],
  V: [
    { answers: ['vaca', 'vaques'], clue: 'Animal de granja que dona llet.' },
    { answers: ['vent', 'vents'], clue: 'Corrent d’aire en moviment.' },
    { answers: ['vidre', 'vidres'], clue: 'Material transparent i fràgil de les finestres.' },
    { answers: ['vela', 'veles'], clue: 'Tela que empeny el vent en un vaixell.' },
    { answers: ['violí', 'violins'], clue: 'Instrument de corda que es toca amb un arc.' },
    { answers: ['volcà', 'volcans'], clue: 'Muntanya que pot escopir foc i lava.' },
    { answers: ['vaixell', 'vaixells'], clue: 'Nau gran per navegar pel mar.' },
    { answers: ['vestit', 'vestits'], clue: 'Peça de roba elegant d’una sola peça.' },
    { answers: ['verdura', 'verdures'], clue: 'Aliment vegetal com el bròquil o l’enciam.' },
    { answers: ['vampir', 'vampirs'], clue: 'Personatge de la nit que xucla la sang.' },
    { answers: ['ventall', 'ventalls'], clue: 'Objecte que s’obre i es tanca per fer aire.' },
    { answers: ['violeta', 'violetes'], clue: 'Flor petita de color morat.' },
  ],
  W: [
    { answers: ['wifi', 'wi-fi'], clue: 'Connexió a internet sense cables.' },
    { answers: ['web', 'webs'], clue: 'Lloc d’internet que es visita amb el navegador.' },
    { answers: ['windsurf'], clue: 'Esport de lliscar sobre l’aigua amb vela i taula.' },
    { answers: ['waterpolo', 'water-polo'], clue: 'Esport d’equip dins una piscina amb una pilota.' },
    { answers: ['kiwi', 'kiwis'], clue: 'Fruita verda per dins i peluda per fora.' },
    { answers: ['sandwich', 'sandvitx'], clue: 'Entrepà de pa de motlle amb farciment.' },
    { answers: ['taekwondo'], clue: 'Art marcial coreà famós pels cops de peu.' },
    { answers: ['hawaiana', 'hawaianes'], clue: 'Pizza amb pinya i pernil dolç.' },
  ],
  X: [
    { answers: ['taxi', 'taxis'], clue: 'Cotxe que pagues perquè et porti on vulguis.' },
    { answers: ['bruixa', 'bruixes'], clue: 'Personatge de contes que vola amb una escombra.' },
    { answers: ['caixa', 'caixes'], clue: 'Recipient quadrat per guardar coses.' },
    { answers: ['peix', 'peixos'], clue: 'Animal que viu dins l’aigua i té aletes.' },
    { answers: ['guix', 'guixos'], clue: 'Barra blanca per escriure a la pissarra.' },
    { answers: ['examen', 'exàmens'], clue: 'Prova per demostrar el que has après.' },
    { answers: ['text', 'textos'], clue: 'Conjunt de paraules escrites.' },
    { answers: ['màxim'], clue: 'El més gran o el més alt de tots.' },
    { answers: ['xocolata', 'xocolates'], clue: 'Dolç de color marró fet amb cacau.' },
    { answers: ['queixal', 'queixals'], clue: 'Dent grossa del fons de la boca.' },
    { answers: ['reflex', 'reflexos'], clue: 'Imatge que et torna un mirall.' },
    { answers: ['saxòfon', 'saxòfons'], clue: 'Instrument de vent daurat i corbat.' },
  ],
  Y: [
    { answers: ['spray', 'espray', 'esprai'], clue: 'Pot que dispara líquid en forma de núvol fi.' },
    { answers: ['hobby', 'hobbies', 'passatemps'], clue: 'Activitat que es fa per gust en el temps lliure.' },
    { answers: ['rugby', 'rugbi'], clue: 'Esport amb una pilota ovalada on es marca assaig.' },
    { answers: ['ferry', 'ferris', 'transbordador'], clue: 'Vaixell gran que transporta cotxes i passatgers.' },
    { answers: ['yoga', 'ioga'], clue: 'Disciplina de postures i respiració per relaxar-se.' },
    { answers: ['yo-yo', 'ioió'], clue: 'Joguina rodona que puja i baixa per un fil.' },
  ],
  Z: [
    { answers: ['zebra', 'zebres'], clue: 'Animal africà amb ratlles blanques i negres.' },
    { answers: ['pizza', 'pizzes'], clue: 'Massa rodona amb tomàquet i formatge cuita al forn.' },
    { answers: ['zoo', 'zoos', 'zoològic'], clue: 'Lloc on es poden veure animals salvatges.' },
    { answers: ['zero', 'zeros'], clue: 'Número que representa cap quantitat.' },
    { answers: ['puzzle', 'puzles', 'trencaclosques'], clue: 'Joc d’encaixar moltes peces per formar un dibuix.' },
    { answers: ['dotze'], clue: 'Número que va just després de l’onze.' },
    { answers: ['esmorzar'], clue: 'Primer àpat del matí.' },
    { answers: ['onze'], clue: 'Número que va just després del deu.' },
  ],
};

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
    'Un rosco compartit: els jugadors s’alternen lletra a lletra.',
    'Passa el mòbil quan et toqui; el temps només corre amb la pista al davant.',
    'Encerta i sumes; passa i la lletra tornarà més tard, sense penalització.',
    'Si falles o se t’acaba el temps, quedes eliminat. Guanya l’últim que quedi!',
  ],

  mount(root, { goHome }) {
    // Carrega els noms recordats; mínim 2 jugadors.
    const saved = getPlayers();
    const initialNames = (Array.isArray(saved) && saved.length) ? saved.slice(0, 12) : ['', ''];
    while (initialNames.length < 2) initialNames.push('');

    const state = {
      names: initialNames,
      timeSec: 20,
      // partida
      alive: [],
      scores: [],
      correctWords: [],
      passedWords: [],
      curPlayer: 0,
      status: [],     // estat de cada lletra (26)
      curLetter: -1,
      current: null,  // entrada del torn actual: {letter, mode, answers, clue}
      bag: {},        // bossa per lletra (es va buidant sense repetir)
      remaining: 0,
      turnOver: false,
    };

    let timerId = null;
    let revealTimeout = null;
    let revealing = false;

    const count = () => state.names.length;
    const getName = (i) => (state.names[i] && state.names[i].trim()) || `Jugador ${i + 1}`;
    const allFilled = () => state.names.every((n) => (n || '').trim() !== '');
    const save = () => setPlayers(state.names);
    const okCount = () => state.status.filter(s => s === 'ok').length;
    const aliveCount = () => state.alive.filter(Boolean).length;

    function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
    function clearReveal() { if (revealTimeout) { clearTimeout(revealTimeout); revealTimeout = null; } revealing = false; }
    function leaveGame() { stopTimer(); clearReveal(); goHome(); }

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

    // ---------- partida ----------
    function beginGame() {
      state.alive = state.names.map(() => true);
      state.scores = state.names.map(() => 0);
      state.correctWords = state.names.map(() => []);
      state.passedWords = state.names.map(() => []);
      state.status = LETTERS.map(() => 'pending');
      state.bag = {};
      state.curPlayer = 0;
      state.curLetter = -1;
      startNextTurn();
    }

    // agafa una paraula de la bossa de la lletra (sense repetir fins esgotar)
    function drawWord(L) {
      if (!state.bag[L] || state.bag[L].length === 0) state.bag[L] = shuffle(WORDS[L].slice());
      const w = state.bag[L].pop();
      return { letter: L, mode: modeOf(L), answers: w.answers, clue: w.clue };
    }

    function nextAlivePlayer(from) {
      const n = count();
      for (let s = 1; s <= n; s++) {
        const i = (from + s) % n;
        if (state.alive[i]) return i;
      }
      return from;
    }

    // següent lletra no resolta (pendent o passada) a partir de "from"
    function advanceLetterFrom(from) {
      for (let s = 1; s <= 26; s++) {
        const i = ((from + s) % 26 + 26) % 26;
        if (state.status[i] === 'pending' || state.status[i] === 'pass') return i;
      }
      return -1;
    }

    function startNextTurn() {
      stopTimer();
      clearReveal();
      state.turnOver = false;
      if (aliveCount() <= 1) { screenFinal(); return; }
      const ni = advanceLetterFrom(state.curLetter);
      if (ni < 0) { screenFinal(); return; }     // rosco resolt amb >1 viu
      state.curLetter = ni;
      state.current = drawWord(LETTERS[ni]);
      screenPass();
    }

    function proceed() {
      state.curPlayer = nextAlivePlayer(state.curPlayer);
      startNextTurn();
    }

    // ---------- 2) passa el mòbil (sense temps) ----------
    function screenPass() {
      stopTimer();
      clearReveal();
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker center">Encerts ${okCount()}/26 · Vius: ${aliveCount()}</p>
        <h2 style="font-size:26px;margin:6px 0 18px">Passa el mòbil a<br>${getName(state.curPlayer)}</h2>
        <div class="reveal-card tap-hint" id="card">
          <div class="word" style="font-size:26px">Toca quan<br>estiguis a punt</div>
        </div>
        <div class="spacer"></div>
        <p class="muted center">Tindràs ${state.timeSec}s quan comencis.</p>
      `;
      root.querySelector('#home').onclick = leaveGame;
      root.querySelector('#card').onclick = startPlay;
    }

    // ---------- 3) torn (amb temps) ----------
    function startPlay() {
      state.turnOver = false;
      clearReveal();
      renderPlay(null);
      startTimer();
    }

    function circleHTML(highlight) {
      const n = LETTERS.length;
      const R = 42;
      return LETTERS.map((L, i) => {
        const ang = (-90 + i * 360 / n) * Math.PI / 180;
        const x = 50 + R * Math.cos(ang);
        const y = 50 + R * Math.sin(ang);
        const c = STATE_COLORS[state.status[i]];
        const isCur = highlight && i === state.curLetter;
        return `<div style="position:absolute;left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;
          transform:translate(-50%,-50%)${isCur ? ' scale(1.22)' : ''};
          width:28px;height:28px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-family:var(--font-display);font-weight:800;font-size:14px;
          background:${c.bg};border:2px solid ${c.bd};color:${c.fg};
          box-shadow:${isCur ? '0 0 0 3px var(--accent)' : 'none'};
          z-index:${isCur ? 2 : 1};">${L}</div>`;
      }).join('');
    }

    function centerHTML() {
      const e = state.current;
      const label = e.mode === 'comença' ? `Comença per ${e.letter}` : `Conté la ${e.letter}`;
      const timer = `<div id="pp-timer" style="font-family:var(--font-display);font-weight:800;font-size:34px;color:var(--accent);line-height:1">${Math.max(0, state.remaining)}</div>`;
      return `
        ${timer}
        <p class="kicker" style="margin-top:12px">${label}</p>
        <p style="margin-top:6px;font-size:15px;font-weight:500;color:var(--ink);line-height:1.3">${e.clue}</p>`;
    }

    // El missatge de resultat del torn, gran, a la zona de resposta.
    function resultHTML(r) {
      return `
        <div class="pp-result pp-result--${r.kind}">
          <div class="pp-result__title">${r.title}</div>
          ${r.label ? `<div class="pp-result__label">${r.label}</div>` : ''}
          ${r.word ? `<div class="pp-result__word">${r.word}</div>` : ''}
        </div>`;
    }

    function answerHTML() {
      return `
        <input class="input" id="pp-input" type="text" maxlength="24" autocomplete="off"
          autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Escriu la paraula"
          style="margin-top:14px;text-align:center;font-family:var(--font-display);font-weight:700;font-size:18px">
        <div class="btn-row" style="margin-top:12px">
          <button class="btn btn--accent" id="check">Comprova</button>
          <button class="btn btn--outline" id="pass">Passa</button>
        </div>`;
    }

    // result: null mentre es juga, o { kind, title, label?, word? } per al resultat del torn.
    function renderPlay(result) {
      const isReveal = !!result;
      const myScore = state.scores[state.curPlayer];
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <div class="pp-head">
          <span class="kicker">${getName(state.curPlayer)} · ${myScore} encert${myScore === 1 ? '' : 's'}</span>
          <span class="kicker">${okCount()}/26</span>
        </div>
        <div style="position:relative;width:100%;max-width:330px;margin:8px auto 0;aspect-ratio:1/1">
          ${circleHTML(true)}
          <div style="position:absolute;inset:19%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
            ${centerHTML()}
          </div>
        </div>
        <div class="spacer"></div>
        ${isReveal ? resultHTML(result) : answerHTML()}
      `;
      root.querySelector('#home').onclick = leaveGame;
      if (!isReveal) {
        const input = root.querySelector('#pp-input');
        root.querySelector('#check').onclick = checkAnswer;
        root.querySelector('#pass').onclick = passLetter;
        if (input) {
          input.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); checkAnswer(); } };
          input.focus();
        }
      }
    }

    function checkAnswer() {
      if (state.turnOver || revealing) return;
      const input = root.querySelector('#pp-input');
      const val = input ? input.value : '';
      if (norm(val) === '') { if (input) input.focus(); return; }
      const i = state.curLetter;
      const e = state.current;
      const hit = e.answers.some(a => norm(a) === norm(val));
      state.turnOver = true;
      stopTimer();
      if (hit) {
        state.status[i] = 'ok';
        state.scores[state.curPlayer]++;
        state.correctWords[state.curPlayer].push(e.answers[0]);
        revealThenProceed({ kind: 'ok', title: 'Correcte!', word: e.answers[0] });
      } else {
        state.status[i] = 'fail';
        state.alive[state.curPlayer] = false;
        revealThenProceed({ kind: 'fail', title: 'Has fallat! Eliminat', label: 'La paraula era', word: e.answers[0] });
      }
    }

    function passLetter() {
      if (state.turnOver || revealing) return;
      state.turnOver = true;
      stopTimer();
      state.status[state.curLetter] = 'pass';
      state.passedWords[state.curPlayer].push(state.current.answers[0]);
      proceed();
    }

    function revealThenProceed(result) {
      revealing = true;
      renderPlay(result);
      revealTimeout = setTimeout(() => {
        revealTimeout = null;
        revealing = false;
        proceed();
      }, 1700);
    }

    // ---------- temporitzador (per torn) ----------
    function startTimer() {
      stopTimer();
      state.remaining = state.timeSec;
      timerId = setInterval(() => {
        state.remaining--;
        const el = root.querySelector('#pp-timer');
        if (el) el.textContent = Math.max(0, state.remaining);
        if (state.remaining <= 0) { stopTimer(); onTimeout(); }
      }, 1000);
    }

    function onTimeout() {
      if (state.turnOver) return;
      state.turnOver = true;
      state.status[state.curLetter] = 'fail';
      state.alive[state.curPlayer] = false;
      revealThenProceed({ kind: 'fail', title: 'Temps! Eliminat', label: 'La paraula era', word: state.current.answers[0] });
    }

    // ---------- 4) final ----------
    function screenFinal() {
      stopTimer();
      clearReveal();
      const idxs = state.names.map((_, i) => i);
      const aliveIdxs = idxs.filter(i => state.alive[i]);
      let winners;
      if (aliveIdxs.length === 1) {
        winners = aliveIdxs;
      } else {
        const max = Math.max(...state.scores);
        winners = idxs.filter(i => state.scores[i] === max);
      }
      const tie = winners.length > 1;
      const winNames = winners.map(i => getName(i)).join(' i ');
      const winPts = state.scores[winners[0]];

      const order = idxs.sort((a, b) => state.scores[b] - state.scores[a] || a - b);
      const rows = order.map(i => `
        <button class="btn btn--outline rank-row" data-player="${i}">
          <span class="rank-row__name">${getName(i)}${state.alive[i] ? '' : ' <span style="color:var(--ink-soft);font-weight:500">· eliminat</span>'}</span>
          <span class="rank-row__pts">${state.scores[i]} ›</span>
        </button>`).join('');

      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker center">Final</p>
        <div class="reveal-card" id="card" style="cursor:default">
          <div class="who">${tie ? 'Empat! Guanyen...' : 'Guanya...'}</div>
          <div class="word">${winNames}!</div>
          <div class="who">${winPts} encert${winPts === 1 ? '' : 's'}</div>
        </div>
        <p class="label" style="margin:22px 0 12px">Classificació · toca un jugador</p>
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
      root.querySelectorAll('[data-player]').forEach(b => {
        b.onclick = () => screenPlayerDetail(parseInt(b.dataset.player, 10));
      });
    }

    // ---------- detall d'un jugador (encertades / passades) ----------
    function screenPlayerDetail(i) {
      const wordList = (arr) => arr.length
        ? `<div class="stack" style="--stack-gap:8px">${arr.map(w => `<div class="btn btn--outline" style="cursor:default;text-align:left">${w}</div>`).join('')}</div>`
        : `<p class="muted">Cap.</p>`;
      root.innerHTML = `
        <button class="back" id="back">‹ Classificació</button>
        <p class="kicker">${getName(i)}${state.alive[i] ? '' : ' · eliminat'}</p>
        <h2 style="font-size:28px;margin:6px 0 18px">${state.scores[i]} encert${state.scores[i] === 1 ? '' : 's'}</h2>
        <p class="label" style="margin:0 0 10px">Encertades</p>
        ${wordList(state.correctWords[i] || [])}
        <p class="label" style="margin:22px 0 10px">Passades</p>
        ${wordList(state.passedWords[i] || [])}
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenFinal;
    }

    screenSetup();
  },
};
