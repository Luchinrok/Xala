// ============================================================
// 2048 — joc d'un sol jugador (STUB: encara no jugable).
// Mateixa estructura de mòdul que els jocs de festa; quan estigui
// llest, posa ready: true i afegeix la funció mount(root, { goHome }).
// ============================================================

export default {
  id: '2048',
  title: '2048',
  tagline: 'Ajunta els números fins al 2048',
  accent: '#E4572E',
  color: '#E4572E',
  ready: false,
  instructions: [
    'Llisca amunt, avall, esquerra o dreta per moure totes les fitxes.',
    'Dues fitxes amb el mateix número que xoquen es fusionen i se sumen.',
    'Cada moviment apareix una fitxa nova a la graella.',
    'Arriba a la fitxa 2048 sense quedar-te sense espai.',
  ],
};
