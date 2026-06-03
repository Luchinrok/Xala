// ============================================================
// Qui és més probable que... — social, va de vosaltres
// ESTAT: preparat per construir. De moment mostra "Aviat".
//
// MECÀNICA
//   Surt una frase ("Qui és més probable que... acabi vivint en una
//   autocaravana?"). Tothom vota una persona de la taula. Es revela el
//   recompte i el més votat "guanya" la ronda. Rialles garantides.
//
// PANTALLES
//   1. Setup: introduir noms dels jugadors (3–12) + paquet (familiar / picant).
//   2. Frase gran a pantalla.
//   3. Votació (dues opcions a triar al construir):
//        a) passar el mòbil i cadascú toca un nom en secret, o
//        b) "a la de tres tothom assenyala" i algú marca el més assenyalat.
//      La (a) és més neta i fa millor recompte.
//   4. Revelació: barres amb els vots + nom guanyador (girada de cap garantida).
//   5. Marcador divertit final: "el més probable del grup és...".
//
// TÈCNICA
//   - Tot offline, un sol dispositiu. Guarda noms i marcador en memòria
//     (gens de backend a la v1). MOMENT CLIPEJABLE: la revelació del vot.
//
// DADES: crea data/quiprobable-frases.js (mode familiar i mode adults).
// ============================================================

export default {
  id: 'quiprobable',
  title: 'Qui és més probable...',
  tagline: 'Vota qui de vosaltres ho faria',
  accent: '#E4572E',
  color: '#E4572E',
  ready: false,

  instructions: [
    'Surt una frase: "Qui és més probable que...".',
    'Tothom vota la persona del grup que millor hi encaixa.',
    'Es revela el més votat... i a riure.',
  ],

  mount(root, { goHome }) {
    root.innerHTML = `
      <button class="back" id="back">‹ Inici</button>
      <div class="spacer"></div>
      <div class="panel center stack">
        <h2 style="font-size:30px">Aviat!</h2>
        <p class="muted">La mecànica i el disseny ja són a
        <code>quiprobable.js</code>, llestos per construir.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn--accent" id="home">Tornar a l'inici</button>
    `;
    root.querySelector('#back').onclick = goHome;
    root.querySelector('#home').onclick = goHome;
  },
};
