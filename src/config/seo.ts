/**
 * Référencement : données structurées (schema.org, JSON-LD).
 * Les coordonnées viennent de site.ts ; celles encore entre crochets sont omises
 * automatiquement des données structurées (Google refuse les valeurs factices).
 */
import { SITE, aCompleter } from './site';
import { FORMULES_PRIX, type CleFormule } from './tarifs';

export const URL_SITE = (import.meta.env.SITE ?? 'https://www.maisonfilbleu.fr').replace(/\/$/, '');
export const absolu = (chemin: string) => `${URL_SITE}${chemin === '/' ? '/' : chemin}`;

/** Date de publication des articles de conseils (AAAA-MM-JJ). À renseigner à la mise en ligne ; null = non indiquée. */
export const DATE_PUBLICATION_ARTICLES: string | null = null;

const connu = (v: string) => (aCompleter(v) ? undefined : v);
const telephoneIntl = (v: string) => (aCompleter(v) ? undefined : v.replace(/[^\d+]/g, '').replace(/^0/, '+33'));

const ZONE = [
  { '@type': 'City', name: 'Marseille' },
  { '@type': 'AdministrativeArea', name: 'Bouches-du-Rhône' },
  { '@type': 'AdministrativeArea', name: "Provence-Alpes-Côte d'Azur" },
];

const ADRESSE = {
  '@type': 'PostalAddress',
  streetAddress: connu(SITE.adresse),
  postalCode: SITE.codePostal,
  addressLocality: SITE.ville,
  addressRegion: "Provence-Alpes-Côte d'Azur",
  addressCountry: 'FR',
};

export const ID_MAISON = `${URL_SITE}/#maison-fil-bleu`;
export const ID_PRO = `${URL_SITE}/pro#fil-bleu-pro`;

/** Maison Fil Bleu (toutes les pages famille). */
export const localBusinessFamille = () => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': ID_MAISON,
  name: SITE.nom,
  description:
    "Transition et accompagnement des personnes et des familles quand un logement doit être libéré : entrée en résidence, déménagement, succession. Tri, démarches, débarras, nettoyage, remise des clés.",
  url: absolu('/'),
  logo: absolu('/favicon.svg'),
  image: absolu('/og/maison-fil-bleu.png'),
  telephone: telephoneIntl(SITE.telephone),
  email: connu(SITE.emailContact),
  address: ADRESSE,
  areaServed: ZONE,
  priceRange: '€€',
});

/** Fil Bleu Pro (pages professionnelles). */
export const localBusinessPro = () => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': ID_PRO,
  name: SITE.nomPro,
  description:
    'Débarras et nettoyage de logements vides pour les agences immobilières, syndics, bailleurs et notaires. Devis sous 24 heures.',
  url: absolu('/pro'),
  logo: absolu('/favicon.svg'),
  image: absolu('/og/fil-bleu-pro.png'),
  telephone: telephoneIntl(SITE.telephonePro),
  email: connu(SITE.emailPro),
  address: ADRESSE,
  areaServed: ZONE,
});

const SLUGS: Record<CleFormule, string> = { L: '/cles-en-main', T: '/nouveau-depart', S: '/succession' };
const DESCRIPTIONS: Record<CleFormule, string> = {
  L: 'Vider, nettoyer et rendre un logement : tri accompagné, débarras en filières agréées, dons, nettoyage complet, compte rendu photo et remise des clés.',
  T: "Libérer l'ancien logement et installer le nouveau : tri, coordination du déménagement, installation complète, démarches et suivi.",
  S: "Libérer le logement d'un proche qui nous a quittés : choix de chacun des héritiers, papiers de famille, lien avec le notaire, débarras, dons, nettoyage.",
};

/** Une formule (pages Clés en main, Nouveau départ, Succession). */
export const service = (k: CleFormule) => {
  const F = FORMULES_PRIX[k];
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${F.nom} · ${SITE.nom}`,
    serviceType: F.nom,
    description: DESCRIPTIONS[k],
    url: absolu(SLUGS[k]),
    provider: { '@id': ID_MAISON },
    areaServed: ZONE,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: F.prix[0],
      priceSpecification: {
        '@type': 'PriceSpecification',
        minPrice: F.prix[0],
        priceCurrency: 'EUR',
        valueAddedTaxIncluded: true,
      },
      description: 'Prix de départ TTC pour un logement de 1 à 2 pièces ; prix exact fixé après le diagnostic offert.',
    },
  };
};

/** Un article de conseils. */
export const article = (o: { titre: string; description: string; chemin: string; image?: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: o.titre,
  description: o.description,
  inLanguage: 'fr-FR',
  mainEntityOfPage: absolu(o.chemin),
  image: o.image ?? absolu('/og/maison-fil-bleu.png'),
  author: { '@type': 'Organization', name: SITE.nom, url: absolu('/') },
  publisher: { '@type': 'Organization', name: SITE.nom, logo: { '@type': 'ImageObject', url: absolu('/favicon.svg') } },
  ...(DATE_PUBLICATION_ARTICLES ? { datePublished: DATE_PUBLICATION_ARTICLES, dateModified: DATE_PUBLICATION_ARTICLES } : {}),
});

/** Fil d'Ariane. */
export const filAriane = (etapes: { nom: string; chemin: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: etapes.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.nom, item: absolu(e.chemin) })),
});
