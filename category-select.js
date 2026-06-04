// ============================================================
// Selecció de categories — compartit entre jocs (impostor, endevina-la).
// Exporta:
//   categoriesLabel(ids)  -> text del botó: "Categories (3)" o
//                            "Categories (Totes)" si hi són totes.
//   openCategoryScreen(root, opts) -> dibuixa la pantalla de tiles amb
//                            el botó "Totes" i el de tornar enrere.
// `categoryIds` es muta in situ (push/splice), així l'estat del joc
// i la pantalla queden sempre sincronitzats. Mínim 1 categoria.
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { CATEGORY_ICONS } from './category-icons.js';

const allSelected = (ids) => ids.length >= CATEGORIES.length;

// Etiqueta del botó "Categories".
export function categoriesLabel(ids) {
  return `Categories (${allSelected(ids) ? 'Totes' : ids.length})`;
}

// Pantalla de selecció. opts: { categoryIds, kicker, onBack }
export function openCategoryScreen(root, { categoryIds, kicker = '', onBack }) {
  function syncAllBtn() {
    const allBtn = root.querySelector('#cs-all');
    if (allBtn) allBtn.disabled = allSelected(categoryIds);
  }

  function render() {
    root.innerHTML = `
      <button class="back" id="cs-back">‹ Configuració</button>
      ${kicker ? `<p class="kicker">${kicker}</p>` : ''}
      <h2 style="font-size:30px;margin:6px 0 8px">Categories</h2>
      <p class="muted" style="margin-bottom:14px">Tria'n les que vulguis (mínim 1).</p>
      <button class="btn btn--outline" id="cs-all" style="margin-bottom:16px">Totes</button>
      <div class="cat-grid" id="cs-grid">
        ${CATEGORIES.map(c => `
          <button class="cat-tile ${categoryIds.includes(c.id) ? 'on' : ''}" data-cat="${c.id}">
            <span class="cat-tile__icon">${CATEGORY_ICONS[c.id] || ''}</span>
            <span class="cat-tile__name">${c.name}</span>
          </button>`).join('')}
      </div>
    `;

    root.querySelector('#cs-back').onclick = onBack;

    // "Totes": selecciona-les totes d'un sol cop
    root.querySelector('#cs-all').onclick = () => {
      categoryIds.splice(0, categoryIds.length, ...CATEGORIES.map(c => c.id));
      render();
    };

    root.querySelectorAll('[data-cat]').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.cat;
        const i = categoryIds.indexOf(id);
        if (i >= 0) {
          // mínim 1: si és l'última seleccionada, no la desactivis
          if (categoryIds.length > 1) { categoryIds.splice(i, 1); b.classList.remove('on'); }
        } else {
          categoryIds.push(id);
          b.classList.add('on');
        }
        syncAllBtn();
      };
    });

    syncAllBtn();
  }

  render();
}
