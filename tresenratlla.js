// ============================================================
// Tres en ratlla — joc per a 2 jugadors, per torns (STUB).
// Encara no jugable; mateixa estructura de mòdul que la resta. Quan
// estigui llest, posa ready: true i afegeix mount(root, { goHome }).
// ============================================================

export default {
  id: 'tresenratlla',
  title: 'Tres en ratlla',
  tagline: 'Tres en línia i guanyes',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: false,
  instructions: [
    'Un jugador juga amb les X i l\'altre amb els O.',
    'Per torns, marqueu una casella de la graella de 3×3.',
    'Guanya qui alinea tres marques iguals: en fila, columna o diagonal.',
    'Si s\'omple sense tres en ratlla, empat.',
  ],
};
