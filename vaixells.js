// ============================================================
// Enfonsar els vaixells — joc per a 2 jugadors, per torns (STUB).
// Encara no jugable; mateixa estructura de mòdul que la resta. Quan
// estigui llest, posa ready: true i afegeix mount(root, { goHome }).
// ============================================================

export default {
  id: 'vaixells',
  title: 'Enfonsar els vaixells',
  tagline: 'Troba i enfonsa la flota rival',
  accent: '#E4572E',
  color: '#E4572E',
  ready: false,
  instructions: [
    'Cada jugador col·loca la seva flota en secret a la graella.',
    'Per torns, dispareu a una casella de l\'enemic passant-vos el mòbil.',
    '"Aigua" si falles, "tocat" si encertes un vaixell.',
    'Qui enfonsa primer tota la flota rival, guanya.',
  ],
};
