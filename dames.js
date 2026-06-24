// ============================================================
// Dames — joc per a 2 jugadors, per torns (STUB).
// Encara no jugable; mateixa estructura de mòdul que la resta. Quan
// estigui llest, posa ready: true i afegeix mount(root, { goHome }).
// ============================================================

export default {
  id: 'dames',
  title: 'Dames',
  tagline: 'Menja\'t totes les fitxes',
  accent: '#E4572E',
  color: '#E4572E',
  ready: false,
  instructions: [
    'Cada jugador té les seves fitxes en diagonal.',
    'Per torns, moveu en diagonal cap endavant.',
    'Salta per damunt d\'una fitxa rival per menjar-te-la.',
    'Guanya qui es queda amb fitxes quan l\'altre no en té cap.',
  ],
};
