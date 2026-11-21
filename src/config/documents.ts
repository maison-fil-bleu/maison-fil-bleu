/**
 * PDF téléchargeables (public/docs/). Versions validées, rangées par destinataire
 * (brief final, section 6). Les fiches « notaires » et « agences » ne diffèrent des fiches
 * grand public que par la dernière ligne de « Ce qui est compris » : ne jamais proposer
 * une fiche grand public sur /agences.
 */
import { statSync } from 'node:fs';

export const DOCS = {
  plaquetteFamilles: { titre: 'La plaquette Maison Fil Bleu', fichier: 'Maison-Fil-Bleu-plaquette-familles.pdf' },
  ficheL: { titre: 'Fiche Libération', fichier: 'Fiche-Liberation.pdf' },
  ficheT: { titre: 'Fiche Transition', fichier: 'Fiche-Transition.pdf' },
  ficheS: { titre: 'Fiche Succession', fichier: 'Fiche-Succession.pdf' },
  fsm: { titre: 'Faire soi-même ou nous confier ?', fichier: 'Faire-soi-meme-ou-nous-confier.pdf' },
  plaquetteNotaires: { titre: 'La plaquette notaires', fichier: 'Maison-Fil-Bleu-plaquette-notaires.pdf' },
  ficheLNotaires: { titre: 'Fiche Libération', fichier: 'Fiche-Liberation-notaires.pdf' },
  ficheTNotaires: { titre: 'Fiche Transition', fichier: 'Fiche-Transition-notaires.pdf' },
  ficheSNotaires: { titre: 'Fiche Succession', fichier: 'Fiche-Succession-notaires.pdf' },
  plaquetteAgences: { titre: 'La plaquette agences', fichier: 'Maison-Fil-Bleu-plaquette-agences.pdf' },
  plaquetteFamillesAgences: { titre: 'La plaquette pour vos vendeurs', fichier: 'Maison-Fil-Bleu-plaquette-familles-agences.pdf' },
  ficheLAgences: { titre: 'Fiche Libération', fichier: 'Fiche-Liberation-agences.pdf' },
  ficheTAgences: { titre: 'Fiche Transition', fichier: 'Fiche-Transition-agences.pdf' },
  ficheSAgences: { titre: 'Fiche Succession', fichier: 'Fiche-Succession-agences.pdf' },
  plaquetteResidences: { titre: 'La plaquette résidences et EHPAD', fichier: 'Maison-Fil-Bleu-plaquette-residences.pdf' },
  plaquettePro: { titre: 'La plaquette Fil Bleu Pro', fichier: 'Fil-Bleu-Pro-plaquette.pdf' },
  fichePro: { titre: 'Fiche tarifs Fil Bleu Pro', fichier: 'Fiche-Fil-Bleu-Pro.pdf' },
} as const;

export type CleDoc = keyof typeof DOCS;

/** Lien, titre et poids (« PDF · 142 Ko ») d'un document, calculés à la construction du site. */
export function doc(cle: CleDoc) {
  const d = DOCS[cle];
  let poids = '';
  try {
    const o = statSync(new URL(`../../public/docs/${d.fichier}`, import.meta.url)).size;
    poids = o >= 1e6 ? `${(o / 1e6).toFixed(1).replace('.', ',')} Mo` : `${Math.round(o / 1e3)} Ko`;
  } catch { /* fichier absent : pas de poids affiché */ }
  return { ...d, href: `/docs/${d.fichier}`, info: poids ? `PDF · ${poids}` : 'PDF' };
}
