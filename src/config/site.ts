/**
 * Coordonnées et informations légales.
 * Tout ce qui est entre crochets reste à fournir par le fondateur (liste dans le README).
 * Dès qu'un numéro de téléphone réel remplace le texte entre crochets,
 * il devient automatiquement un lien cliquable « tel: » partout sur le site.
 */
export const SITE = {
  nom: 'Maison Fil Bleu',
  nomPro: 'Fil Bleu Pro',
  societe: 'SAS Groupe Fil Bleu',
  zone: 'Marseille et région PACA',
  telephone: '[06 00 00 00 00]',
  telephonePro: '[06 00 00 00 00]',
  emailContact: '[contact@maisonfilbleu.fr]',
  emailPro: '[pro@maisonfilbleu.fr]',
  adresse: '[adresse]',
  codePostal: '13170',
  ville: 'Les Pennes-Mirabeau',
  siret: '[n°]',
  rcs: '[ville] [n°]',
  tva: '[n°]',
  rcPro: '[assureur, contrat]',
  recepisseDechets: '[...]',
  mediateur: '[nom]',
} as const;

/** Vrai tant que la valeur est un texte provisoire entre crochets. */
export const aCompleter = (v: string) => v.trim().startsWith('[');

/** Lien « tel: » si le numéro est connu, sinon null. */
export const lienTel = (num: string) =>
  aCompleter(num) ? null : `tel:${num.replace(/[^\d+]/g, '').replace(/^0/, '+33')}`;

/** Les trois formules (menu, pied de page, données structurées). */
export const FORMULES = [
  { slug: 'cles-en-main', nom: 'Clés en main', ligne: 'Vous quittez un logement' },
  { slug: 'nouveau-depart', nom: 'Nouveau départ', ligne: 'Vous ou un proche déménagez' },
  { slug: 'succession', nom: 'Succession', ligne: 'Un proche vous a quittés' },
] as const;

/** Les cinq articles de conseils (pied de page). */
export const ARTICLES = [
  { href: '/conseils/logement-parent-decede', titre: "Le logement d'un proche disparu" },
  { href: '/conseils/preparer-entree-ehpad', titre: 'Préparer une entrée en EHPAD' },
  { href: '/conseils/vider-maison-avant-vente', titre: 'Vider une maison avant la vente' },
  { href: '/conseils/meubles-dont-personne-ne-veut', titre: 'Les meubles dont personne ne veut' },
  { href: '/conseils/gerer-logement-a-distance', titre: 'Gérer un logement à distance' },
] as const;

/** Onglet de l'en-tête à souligner. */
export type Onglet = 'qui' | 'prestations' | 'tarifs' | 'conseils' | null;
