// ============================================================
// Punts i caixes — joc per a 2 jugadors, per torns (STUB).
// Encara no jugable; mateixa estructura de mòdul que la resta. Quan
// estigui llest, posa ready: true i afegeix mount(root, { goHome }).
// ============================================================

export default {
  id: 'puntsicaixes',
  title: 'Punts i caixes',
  tagline: 'Tanca caixes i suma punts',
  accent: '#E4572E',
  color: '#E4572E',
  ready: false,
  instructions: [
    'Per torns, traceu una ratlla entre dos punts veïns.',
    'Qui tanca el quart costat d\'una caixa, se la queda i repeteix torn.',
    'Marca les teves caixes amb la teva inicial.',
    'Guanya qui té més caixes en omplir-se la quadrícula.',
  ],
};
