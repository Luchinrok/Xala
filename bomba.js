// ============================================================
// Bomba de paraules — reflexos i pressió
// ESTAT: preparat per construir. De moment mostra "Aviat".
//
// MECÀNICA
//   Surt un fragment ("...tra...", "co...", "...ll"). El jugador ha de dir
//   en veu alta una paraula vàlida que el contingui i passar el mòbil ràpid.
//   La bomba fa tic-tac amb temps ALEATORI i ocult. Peta a qui la té a la mà:
//   aquell jugador perd la ronda (o un punt).
//
// PANTALLES
//   1. Setup: fragments per dificultat / categoria.
//   2. Joc: fragment gran + so de tic-tac que accelera. Botó "Ja!" (o passa)
//      perquè el següent agafi el mòbil; opcionalment un toc per confirmar torn.
//   3. Explosió: animació + so, "ha petat amb [qui]".
//   4. Marcador acumulat entre rondes.
//
// TÈCNICA
//   - Temporitzador ocult: durada aleatòria (p. ex. 10–40 s) amb tic-tac
//     que s'accelera (Web Audio o un <audio> curt en bucle amb playbackRate).
//   - VALIDACIÓ: la diu la gent en veu alta (com el joc físic). No cal
//     validar paraules per teclat a la v1 — més ràpid i més divertit.
//   - GIR: fragments i categories en català; mode "només noms", "verbs", etc.
//   - Vibració al petar: navigator.vibrate(...) on estigui disponible.
//
// DADES: crea data/bomba-fragments.js (llistes de síl·labes/fragments freqüents).
// ============================================================

export default {
  id: 'bomba',
  title: 'Bomba de paraules',
  tagline: 'Digues, passa i resa que no peti',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: false,

  instructions: [
    'Surt un fragment de paraula, per exemple "...tra...".',
    'Has de dir en veu alta una paraula que el contingui i passar el mòbil de pressa.',
    'La bomba té un temps amagat: peta a qui la tingui a la mà.',
    'Qui la fa petar, perd la ronda.',
  ],

  mount(root, { goHome }) {
    root.innerHTML = `
      <button class="back" id="back">‹ Inici</button>
      <div class="spacer"></div>
      <div class="panel center stack">
        <h2 style="font-size:30px">Aviat!</h2>
        <p class="muted">La mecànica i el disseny ja són a
        <code>bomba.js</code>, llestos per construir.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn--accent" id="home">Tornar a l'inici</button>
    `;
    root.querySelector('#back').onclick = goHome;
    root.querySelector('#home').onclick = goHome;
  },
};
