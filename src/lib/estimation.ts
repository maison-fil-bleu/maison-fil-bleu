/**
 * Simulateur /estimation (utilisé à la construction de la page et dans le navigateur).
 * Les prix et coefficients sont dans src/config/tarifs.ts.
 *
 * Affichage actuel (choix du fondateur) : la formule adaptée et son prix de départ « à partir de »,
 * plus la liste des besoins cochés, SANS prix d'options. Le prix exact est fixé après le diagnostic.
 * La fonction `fourchette()` (calcul complet du § 7 de la passation) est conservée mais n'est pas affichée.
 */
import { FORMULES_PRIX, TAILLES, OPTIONS, COEFFICIENTS, DEPENDANCES, FUTUR_LOGEMENT, type CleFormule } from '../config/tarifs';

export interface Choix {
  formule: CleFormule;
  taille: number;
  maison: boolean;
  sansAscenseur: boolean;
  dependances: string[]; // clés de DEPENDANCES cochées (cave, grenier, garage)
  futur: number | null; // index dans FUTUR_LOGEMENT.choix (formules concernées seulement)
  residence: boolean;
  box: boolean;
  installation: boolean;
  gardiennage: boolean;
  urgence: boolean;
}

export const CHOIX_VIDE: Omit<Choix, 'formule' | 'taille'> = {
  maison: false, sansAscenseur: false, dependances: [], futur: null,
  residence: false, box: false, installation: false, gardiennage: false, urgence: false,
};

const arrondir = (n: number) => Math.round(n / COEFFICIENTS.arrondi) * COEFFICIENTS.arrondi;
/** Format français : 3 680 € (espace insécable avant le symbole). */
export const euros = (n: number) => `${arrondir(n).toLocaleString('fr-FR')} €`;

export const residenceProposee = (f: CleFormule) => OPTIONS.rechercheResidence.formules.includes(f);
export const installationProposee = (f: CleFormule) => Boolean(OPTIONS.installationProche[f]);
/** Libellé de l'option « meubles chez un proche » selon la formule. */
export const libelleInstallation = (f: CleFormule) => OPTIONS.installationProche[f]?.libelle ?? '';
export const futurPropose = (f: CleFormule) => FUTUR_LOGEMENT.formules.includes(f);
/** Recherche de box comprise dans la formule ? (sinon : sur devis) */
export const boxComprise = (f: CleFormule) => OPTIONS.rechercheBox[f] === 0;

export interface Resume {
  formule: string;
  ligne: string;
  prixDepart: number;
  prixTxt: string;
  logement: string; // « logement actuel de 3 pièces » ou « logement de 3 pièces »
  besoins: string[];
}

/** Ce qui est affiché : formule, prix de départ, besoins cochés (sans montant). */
export function resumer(c: Choix): Resume {
  const F = FORMULES_PRIX[c.formule];
  const base = F.prix[c.taille];
  const besoins: string[] = [];
  const futur = futurPropose(c.formule) && c.futur !== null ? FUTUR_LOGEMENT.choix[c.futur] : null;
  if (futur) besoins.push(`Futur logement : ${futur.nom.charAt(0).toLowerCase()}${futur.nom.slice(1)}`);
  if (c.maison) besoins.push('Maison');
  if (c.sansAscenseur) besoins.push('Étage sans ascenseur');
  const deps = DEPENDANCES.filter((d) => c.dependances.includes(d.cle)).map((d, i) => (i ? d.nom.toLowerCase() : d.nom));
  if (deps.length) besoins.push(`${deps.join(', ')} à vider`);
  if (residenceProposee(c.formule) && c.residence) besoins.push('Recherche de résidence');
  if (c.box) besoins.push(`Recherche d'un box de stockage${boxComprise(c.formule) ? ' (comprise)' : ''}`);
  if (installationProposee(c.formule) && c.installation) besoins.push(libelleInstallation(c.formule));
  if (c.gardiennage) besoins.push('Gardiennage du logement');
  if (c.urgence) besoins.push('Intervention en urgence, sous 7 jours');
  const taille = TAILLES[c.taille];
  return {
    formule: F.nom,
    ligne: F.ligne,
    prixDepart: base,
    prixTxt: euros(base),
    logement: `${futurPropose(c.formule) ? 'logement actuel' : 'logement'} de ${taille}`,
    besoins,
  };
}

/**
 * Fourchette complète (§ 7 de la passation) : NON AFFICHÉE pour le moment.
 * bas = départ + options ; haut = départ × (1,15 + 0,10 maison + 0,10 sans ascenseur) + options × 1,1 ; urgence × 1,25.
 * Volumes des dépendances : DEPENDANCES ; gardiennage compté 1 mois.
 */
export function fourchette(c: Choix): { bas: number; haut: number } {
  const base = FORMULES_PRIX[c.formule].prix[c.taille];
  let opts = 0;
  opts += DEPENDANCES.filter((d) => c.dependances.includes(d.cle)).reduce((t, d) => t + d.m3, 0) * OPTIONS.cavesParM3;
  if (futurPropose(c.formule) && c.futur !== null) opts += FUTUR_LOGEMENT.choix[c.futur].supplement;
  if (residenceProposee(c.formule) && c.residence) opts += OPTIONS.rechercheResidence.prix;
  if (c.box) opts += OPTIONS.rechercheBox[c.formule];
  if (installationProposee(c.formule) && c.installation) opts += OPTIONS.installationProche[c.formule]!.prix;
  if (c.gardiennage) opts += OPTIONS.gardiennageParMois;
  const marge = COEFFICIENTS.base + (c.maison ? COEFFICIENTS.maison : 0) + (c.sansAscenseur ? COEFFICIENTS.sansAscenseur : 0);
  let bas = base + opts;
  let haut = base * marge + opts * COEFFICIENTS.options;
  if (c.urgence) { bas *= 1 + OPTIONS.urgence; haut *= 1 + OPTIONS.urgence; }
  return { bas: arrondir(bas), haut: arrondir(haut) };
}
