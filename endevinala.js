// ============================================================
// Endevina-la — mòbil al front (estil charades)
// ESTAT: preparat per construir. De moment mostra "Aviat".
//
// MECÀNICA
//   Un jugador es posa el mòbil al front. La resta li fa mímica /
//   sons / pistes. Inclina el mòbil AVALL = encertada, AMUNT = passa.
//   Compte enrere (30/60/90 s). Al final, recompte d'encertades.
//
// PANTALLES
//   1. Setup: equip/nom, durada (30/60/90), categoria.
//   2. Compte enrere "3·2·1" abans de començar.
//   3. Joc: paraula gran a pantalla + temporitzador.
//      - inclinar avall -> +1 i següent paraula (verd flash)
//      - inclinar amunt -> passa (vermell flash)
//   4. Resultat: paraules encertades / passades, "una altra".
//
// TÈCNICA
//   - DeviceOrientation API. iOS 13+ exigeix permís explícit:
//       DeviceOrientationEvent.requestPermission() dins d'un gest de l'usuari.
//     Posa un botó "Activa el sensor" abans del compte enrere.
//   - Llindar de beta: avall < -35°, amunt > 35°, i tornar a ~0° abans
//     de comptar el següent gest (per no encadenar lectures).
//   - Bloqueja l'orientació en landscape si pots; va millor al front.
//   - GIR de producte: modes (només sons, una sola paraula, al revés)
//     i paquets de paraules en català (TV3, refranys, personatges...).
//   - MOMENT CLIPEJABLE: ofereix gravar (és el motor de viralitat).
//
// DADES: crea data/endevinala-paraules.js amb el mateix patró que impostor.
// ============================================================

export default {
  id: 'endevinala',
  title: 'Endevina-la',
  tagline: 'Mòbil al front i a fer el préssec',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: false,

  instructions: [
    'Un jugador es posa el mòbil al front, sense mirar la paraula.',
    'La resta li fa mímica, sons o pistes perquè l\u2019endevini.',
    'Inclina el mòbil avall quan l\u2019encertes i amunt per passar a la següent.',
    'Compteu quantes n\u2019encerteu abans que s\u2019acabi el temps.',
  ],

  mount(root, { goHome }) {
    root.innerHTML = `
      <button class="back" id="back">‹ Inici</button>
      <div class="spacer"></div>
      <div class="panel center stack">
        <h2 style="font-size:30px">Aviat!</h2>
        <p class="muted">Aquest joc encara s'està coent. La mecànica i el
        disseny ja són a <code>endevinala.js</code>.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn--accent" id="home">Tornar a l'inici</button>
    `;
    root.querySelector('#back').onclick = goHome;
    root.querySelector('#home').onclick = goHome;
  },
};
