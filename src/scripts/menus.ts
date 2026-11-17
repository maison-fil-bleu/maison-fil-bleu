/**
 * Menus déroulants de l'en-tête (« Nos prestations » et menu hamburger).
 * Base : <details data-menu> (fonctionne au clic et au clavier même sans JavaScript).
 * Ajouts : ouverture au survol sur ordinateur (data-hover), fermeture avec Échap,
 * au clic extérieur et quand le focus clavier quitte le menu.
 */
const survolPossible = window.matchMedia('(hover: hover) and (min-width: 961px)');
const menus = Array.from(document.querySelectorAll<HTMLDetailsElement>('details[data-menu]'));

const fermer = (d: HTMLDetailsElement) => {
  d.open = false;
  delete d.dataset.viaSurvol;
};

for (const d of menus) {
  const summary = d.querySelector('summary');
  if (!summary) continue;

  // Un seul menu ouvert à la fois
  d.addEventListener('toggle', () => {
    if (d.open) for (const autre of menus) if (autre !== d && autre.open) fermer(autre);
  });

  if (d.hasAttribute('data-hover')) {
    let minuterie: number | undefined;
    d.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !survolPossible.matches) return;
      window.clearTimeout(minuterie);
      if (!d.open) {
        d.open = true;
        d.dataset.viaSurvol = '1';
      }
    });
    d.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse' || !survolPossible.matches) return;
      minuterie = window.setTimeout(() => fermer(d), 160);
    });
    // Ouvert par le survol : le premier clic sur le titre ne doit pas le refermer
    summary.addEventListener('click', (e) => {
      if (d.dataset.viaSurvol) {
        e.preventDefault();
        delete d.dataset.viaSurvol;
      }
    });
  }

  // Le focus clavier part ailleurs (Tab) : on referme
  d.addEventListener('focusout', (e) => {
    const vers = e.relatedTarget as Node | null;
    if (d.open && vers && !d.contains(vers)) fermer(d);
  });
}

// Échap : ferme le menu ouvert et rend le focus à son bouton
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  for (const d of menus) {
    if (!d.open) continue;
    const focusDedans = d.contains(document.activeElement);
    fermer(d);
    if (focusDedans) d.querySelector('summary')?.focus();
  }
});

// Clic en dehors : on referme
document.addEventListener('click', (e) => {
  for (const d of menus) if (d.open && !d.contains(e.target as Node)) fermer(d);
});
