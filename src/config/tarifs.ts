/**
 * PRIX ET COEFFICIENTS DU SIMULATEUR /estimation (PASSATION.md § 7)
 * ----------------------------------------------------------------
 * Les PRIX se règlent désormais dans l'appli (back-office › Réglages › « Prix TTC ») :
 * à chaque construction du site, scripts/prix-publics.mjs les recopie dans prix-publics.json,
 * lu ci-dessous. Ce fichier garde les coefficients et les options propres au site.
 * Tous les montants sont TTC, en euros. Les prix des formules sont des prix « à partir de ».
 */
import PRIX from './prix-publics.json';

/** Montant affiché dans les pages : « 1 560 € » (espace ordinaire, comme dans les maquettes). */
export const montant = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';

/** Tailles de logement, dans l'ordre des prix ci-dessous. */
export const TAILLES = ['1-2 pièces', '3 pièces', '4 pièces', '5 pièces et plus'] as const;

/** Formules : prix de départ par taille (1-2 pièces, 3, 4, 5 et plus). */
export const FORMULES_PRIX = {
  L: { nom: 'Libération', ligne: 'Le logement est à vider', prix: PRIX.grids.L },
  T: { nom: 'Transition', ligne: 'Vous ou un proche déménagez', prix: PRIX.grids.T },
  S: { nom: 'Succession', ligne: 'Un proche vous a quittés', prix: PRIX.grids.S },
} as const;

export type CleFormule = keyof typeof FORMULES_PRIX;

/** Options. */
export const OPTIONS = {
  /** Caves, garages, greniers : prix par m³. */
  cavesParM3: PRIX.m3Sup,
  /** Recherche de résidence (proposée seulement dans les formules listées). */
  rechercheResidence: { prix: PRIX.residence, formules: ['T'] as CleFormule[] },
  /** Recherche d'un box de stockage, par formule (0 = comprise). La location du box est réglée par le client. */
  rechercheBox: { L: 90, T: 0, S: 0 } as Record<CleFormule, number>,
  /**
   * Livraison chez un proche (Libération) ou chez un héritier (Succession), organisée avec un déménageur.
   * Transport réglé directement par le client au déménageur (conditions au devis).
   */
  installationProche: {
    L: { libelle: 'Livraison de quelques meubles chez un proche', prix: 120 },
    S: { libelle: "Livraison d'objets chez un héritier", prix: 120 },
  } as Partial<Record<CleFormule, { libelle: string; prix: number }>>,
  /** Gardiennage : prix par mois. */
  gardiennageParMois: PRIX.gardiennage,
  /** Urgence (intervention sous sept jours) : majoration sur l'ensemble (0.25 = + 25 %). */
  urgence: PRIX.urgence / 100,
};

/** Note sous les options des formules (fiches PDF). */
export const NOTE_OPTIONS = "* Travaux des artisans et transport par le déménageur, à la demande du client : réglés directement par le client, non compris dans le forfait. Non compris : les déchets dangereux. Conditions détaillées au devis.";

/** Accompagnement neutre à la vente (pages grand public). */
export const VENTE_NEUTRE = "Si vous vendez le logement, nous vous accompagnons dans le choix de l'agence, en toute neutralité : nous organisons leur venue, comparons avec vous estimations et honoraires, puis préparons le logement.";
/** Même idée, dans les listes « Ce qui est compris ». */
export const VENTE_COMPRIS = "Si vous vendez, accompagnement au choix de l'agence, préparation du logement et suivi";

/**
 * Caves, garages, greniers : volume standard proposé pour chaque type (en m³ à évacuer),
 * facturé au prix OPTIONS.cavesParM3. Le client peut ensuite ajuster le volume au m³ près.
 * Volume moyen d'une pièce de ce type, rarement pleine du sol au plafond.
 */
export const DEPENDANCES = [
  { cle: 'cave', nom: 'Cave', m3: 3 },
  { cle: 'grenier', nom: 'Grenier', m3: 6 },
  { cle: 'garage', nom: 'Garage', m3: 12 },
] as const;

/**
 * Futur logement (formules listées seulement, Transition par défaut).
 * « supplement » : montant ajouté aux options si besoin (0 = information seulement, sans effet sur le prix).
 */
export const FUTUR_LOGEMENT = {
  formules: ['T'] as CleFormule[],
  choix: [
    { nom: 'Chambre en résidence ou EHPAD', supplement: 0 },
    { nom: 'Studio ou T1', supplement: 0 },
    { nom: 'T2', supplement: 0 },
    { nom: 'T3', supplement: 0 },
    { nom: 'T4 et plus', supplement: 0 },
  ],
};

/** Calcul de la fourchette. */
export const COEFFICIENTS = {
  /** haut = prix de départ × (base + maison + sans ascenseur) + options × options */
  base: 1.15,
  maison: 0.1,
  sansAscenseur: 0.1,
  options: 1.1,
  /** Arrondi à la dizaine. */
  arrondi: 10,
};

/** Choix affichés à l'ouverture de la page. */
export const PAR_DEFAUT = { formule: 'T' as CleFormule, taille: 1 };
