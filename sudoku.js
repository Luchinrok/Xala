// ============================================================
// Sudoku — joc d'un sol jugador (STUB: encara no jugable).
// Mateixa estructura de mòdul que els jocs de festa; quan estigui
// llest, posa ready: true i afegeix la funció mount(root, { goHome }).
// ============================================================

export default {
  id: 'sudoku',
  title: 'Sudoku',
  tagline: "Omple la graella de l'1 al 9",
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: false,
  instructions: [
    'Omple la graella de 9x9 amb xifres de l\'1 al 9.',
    'Cap xifra es pot repetir a la mateixa fila ni columna.',
    'Tampoc es pot repetir dins de cada bloc de 3x3.',
    'Completa tota la graella sense errors per guanyar.',
  ],
};
