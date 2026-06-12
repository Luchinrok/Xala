// ============================================================
// El penjat — joc d'un sol jugador (STUB: encara no jugable).
// Mateixa estructura de mòdul que els jocs de festa; quan estigui
// llest, posa ready: true i afegeix la funció mount(root, { goHome }).
// ============================================================

export default {
  id: 'penjat',
  title: 'El penjat',
  tagline: 'Endevina la paraula lletra a lletra',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: false,
  instructions: [
    'Hi ha una paraula secreta amagada: només en veus els buits.',
    'Prova lletres una a una amb el teclat.',
    'Cada lletra fallada dibuixa una part del penjat.',
    'Endevina la paraula sencera abans que es completi el dibuix.',
  ],
};
