/**
 * PRIX ET COEFFICIENTS DU SIMULATEUR /estimation (PASSATION.md § 7)
 * ----------------------------------------------------------------
 * C'est le seul fichier à modifier pour changer un prix ou un coefficient.
 * Tous les montants sont TTC, en euros. Les prix des formules sont des prix « à partir de ».
 */

/** Tailles de logement, dans l'ordre des prix ci-dessous. */
export const TAILLES = ['1-2 pièces', '3 pièces', '4 pièces', '5 pièces et plus'] as const;

/** Formules : prix de départ par taille (1-2 pièces, 3, 4, 5 et plus). */
export const FORMULES_PRIX = {
  L: { nom: 'Libération', ligne: 'Le logement est à vider', prix: [1560, 2550, 3160, 4340] },
  T: { nom: 'Transition', ligne: 'Vous ou un proche déménagez', prix: [3200, 4200, 4900, 6700] },
  S: { nom: 'Succession', ligne: 'Un proche vous a quittés', prix: [2600, 3900, 4600, 6300] },
} as const;

export type CleFormule = keyof typeof FORMULES_PRIX;

/** Options. */
export const OPTIONS = {
  /** Caves, garages, greniers : prix par m³. */
  cavesParM3: 75,
  /** Recherche de résidence (proposée seulement dans les formules listées). */
  rechercheResidence: { prix: 700, formules: ['T'] as CleFormule[] },
  /** Recherche d'un box de stockage, par formule (0 = comprise). La location du box est réglée par le client. */
  rechercheBox: { L: 90, T: 0, S: 0 } as Record<CleFormule, number>,
  /** Installation des objets gardés chez un proche (prix « dès »), formules concernées. */
  installationProche: { prix: 350, formules: ['L', 'S'] as CleFormule[] },
  /** Gardiennage : prix par mois. */
  gardiennageParMois: 150,
  /** Urgence (intervention sous sept jours) : majoration sur l'ensemble (0.25 = + 25 %). */
  urgence: 0.25,
};

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
