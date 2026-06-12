// ============================================================
// Memory (parelles) — joc d'un sol jugador (STUB: encara no jugable).
// Mateixa estructura de mòdul que els jocs de festa; quan estigui
// llest, posa ready: true i afegeix la funció mount(root, { goHome }).
// ============================================================

export default {
  id: 'memory',
  title: 'Memory',
  tagline: 'Troba totes les parelles de cartes',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: false,
  instructions: [
    'Destapa dues cartes per torn tocant-les.',
    'Si fan parella, es queden destapades; si no, es tornen a girar.',
    'Recorda on és cada dibuix i troba totes les parelles.',
    'Acaba amb el mínim d\'intents possible.',
  ],
};
