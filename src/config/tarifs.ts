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
  L: { nom: 'Clés en main', ligne: 'Vous quittez un logement', prix: PRIX.grids.L },
  T: { nom: 'Nouveau départ', ligne: 'Vous ou un proche déménagez', prix: PRIX.grids.T },
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
   * Livraison chez un proche (Clés en main) ou chez un héritier (Succession), organisée avec un déménageur.
   * Transport réglé directement par le client au déménageur (conditions au devis).
   */
  installationProche: {
    L: { libelle: 'Livraison de quelques meubles chez un proche', prix: 120 },
    S: { libelle: "Livraison d'objets chez un héritier", prix: 120 },
  } as Partial<Record<CleFormule, { libelle: string; prix: number }>>,
  /**
   * Installation dans la nouvelle chambre ou le nouveau logement : une demi-journée sur place
   * le jour de l'arrivée, en lien avec le déménageur (comprise dans Nouveau départ).
   */
  installation: { prix: 350, formules: ['L'] as CleFormule[], libelle: 'Installation dans la nouvelle chambre ou le nouveau logement (une demi-journée)' },
  /** Gardiennage : prix par mois. */
  gardiennageParMois: PRIX.gardiennage,
  /** Urgence (intervention sous sept jours) : majoration sur l'ensemble (0.25 = + 25 %). */
  urgence: PRIX.urgence / 100,
};

/** Notes sous les options des formules (fiches PDF), terminées par « Conditions détaillées au devis. ». */
export const NOTE_OPTIONS = "* Travaux des artisans et transport par le déménageur, à la demande du client : réglés directement par le client, non compris dans le forfait. Non compris : les déchets dangereux. Conditions détaillées au devis.";
export const NOTE_OPTIONS_T = "* Travaux des artisans et déménagement, à la demande du client : réglés directement par le client, non compris dans le forfait. Non compris : les déchets dangereux. Conditions détaillées au devis.";
export const NOTE_OPTIONS_S = "* Travaux des artisans et transport par le déménageur, à la demande du client : réglés directement par le client, non compris dans le forfait. Non compris : les frais de notaire, les déchets dangereux. Conditions détaillées au devis.";

/** Encadré « Et ensuite ? » (pages grand public) : aide aux rendez-vous avec les agences, libre choix. */
export const VENTE_NEUTRE = "Vous êtes propriétaire et souhaitez vendre ou louer ? Nous préparons le logement pour les photos et les visites, et nous vous aidons à préparer vos rendez-vous avec les agences de votre choix : les bonnes questions à poser, les documents à réunir. Vous choisissez librement.";
/** Même texte, sans la première question, sous un titre « Vous êtes propriétaire ». */
export const VENTE_NEUTRE_SUITE = "Vous souhaitez vendre ou louer ? Nous préparons le logement pour les photos et les visites, et nous vous aidons à préparer vos rendez-vous avec les agences de votre choix : les bonnes questions à poser, les documents à réunir. Vous choisissez librement.";
/** Version agences (/agences et contenus destinés aux vendeurs d'une agence). */
export const VENTE_AGENCES = "Vous êtes propriétaire ? Vous souhaitez louer ou vendre votre logement ? Nous le vidons, le nettoyons et le préparons pour les photos et les visites, en lien avec votre agence. Le logement est prêt à être présenté dès la remise des clés.";
/** Dernière ligne de « Ce qui est compris » : grand public, notaires, agences. */
export const VENTE_COMPRIS = "Si vous vendez, préparation du logement pour les visites et aide à vos rendez-vous avec les agences";
export const VENTE_COMPRIS_NOTAIRES = "Si vous vendez, préparation du logement pour les visites et aide à vos rendez-vous avec les agences ou l’étude";
export const VENTE_COMPRIS_AGENCES = "Si vous vendez, préparation du logement pour les photos et les visites";

/**
 * Textes des fiches formules autour du prix : ligne « compris », encadré de paiement,
 * blocs « Paiement » et « Délais ». Seule la formule Succession est réglable par la succession.
 */
export const DELAIS_FORMULE = "Diagnostic sous [72 h]. Intervention sous [2 à 3 semaines], ou sous 7 jours en urgence selon disponibilités (+ 25 %).";
export const TEXTES_FORMULE: Record<CleFormule, { compris: string; encadrePaiement: [string, string, string]; notePaiement?: string; paiement: string }> = {
  L: {
    compris: 'Accompagnement, tri, débarras, nettoyage et démarches compris',
    encadrePaiement: ['Facilités de paiement', 'Solde réglable à la vente', 'Parlons-en'],
    paiement: 'Un acompte au démarrage. Si vous vendez le logement, le solde peut être réglé lors de la vente, chez le notaire. Facilités de paiement possibles.',
  },
  T: {
    compris: 'Accompagnement, tri, débarras, nettoyage, coordination du déménagement*, installation et démarches compris',
    encadrePaiement: ['Facilités de paiement', 'Solde réglable à la vente', 'Parlons-en'],
    paiement: "Un acompte au démarrage. Le solde peut être réglé lors de la vente de l'ancien logement, chez le notaire. Facilités de paiement possibles.",
  },
  S: {
    compris: 'Accompagnement des héritiers, tri, débarras, nettoyage, démarches et lien avec le notaire compris',
    encadrePaiement: ['Facilités de paiement', 'Montant réglable par la succession *', 'Parlons-en'],
    notePaiement: '* avec l’accord des héritiers et du notaire',
    paiement: "Un acompte au démarrage. Le solde peut être réglé lors de la vente du bien ou sur les fonds de la succession, avec l'accord de tous les héritiers et du notaire. Facilités de paiement possibles.",
  },
};

/** Note de paiement générale (page tarifs). */
export const PAIEMENT_GENERAL = "Facilités de paiement possibles. Solde réglable à la vente, ou par la succession avec l'accord des héritiers et du notaire : parlons-en.";

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
 * Futur logement (formules listées seulement, Nouveau départ par défaut).
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
