// ============================================================
// Selecció de categories — compartit entre jocs.
// Exporta:
//   categoriesLabel(ids, allowedIds)  -> text del botó: "Categories (3)"
//       o "Categories (Totes)" si hi són totes les disponibles.
//   openCategoryScreen(root, opts) -> pantalla de tiles amb "Totes" i
//       tornar enrere.
// opts.allowedIds (opcional): si es passa, només es mostren/seleccionen
//   aquestes categories (subconjunt); si no, es mostren totes.
// `categoryIds` es muta in situ (push/splice); estat i pantalla
// queden sincronitzats. Mínim 1 categoria.
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { CATEGORY_ICONS } from './category-icons.js';

// Llista de categories disponibles segons el subconjunt permès.
function listFor(allowedIds) {
  return (Array.isArray(allowedIds) && allowedIds.length)
    ? CATEGORIES.filter(c => allowedIds.includes(c.id))
    : CATEGORIES;
}

// Etiqueta del botó "Categories".
export function categoriesLabel(ids, allowedIds) {
  const total = listFor(allowedIds).length;
  return `Categories (${ids.length >= total ? 'Totes' : ids.length})`;
}

// Pantalla de selecció. opts: { categoryIds, kicker, onBack, allowedIds }
export function openCategoryScreen(root, { categoryIds, kicker = '', onBack, allowedIds }) {
  const list = listFor(allowedIds);
  const allSelected = () => categoryIds.length >= list.length;

  function syncAllBtn() {
    const allBtn = root.querySelector('#cs-all');
    if (allBtn) allBtn.disabled = allSelected();
  }

  function render() {
    root.innerHTML = `
      <button class="back" id="cs-back">‹ Enrere</button>
      ${kicker ? `<p class="kicker">${kicker}</p>` : ''}
      <h2 style="font-size:30px;margin:6px 0 8px">Categories</h2>
      <p class="muted" style="margin-bottom:14px">Tria'n les que vulguis (mínim 1).</p>
      <button class="btn btn--outline" id="cs-all" style="margin-bottom:16px">Totes</button>
      <div class="cat-grid" id="cs-grid">
        ${list.map(c => `
          <button class="cat-tile ${categoryIds.includes(c.id) ? 'on' : ''}" data-cat="${c.id}">
            <span class="cat-tile__icon">${CATEGORY_ICONS[c.id] || ''}</span>
            <span class="cat-tile__name">${c.name}</span>
          </button>`).join('')}
      </div>
    `;

    root.querySelector('#cs-back').onclick = onBack;

    // "Totes": selecciona totes les disponibles d'un sol cop
    root.querySelector('#cs-all').onclick = () => {
      categoryIds.splice(0, categoryIds.length, ...list.map(c => c.id));
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
