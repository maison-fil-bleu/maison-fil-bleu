/**
 * Parcours type d'un dossier, du premier appel à la remise des clés.
 * Chaque tâche : étape (phase), libellé, et des repères :
 *   o = obligatoire, i = interne (jamais visible par la famille), f = à faire par la famille,
 *   formules : lettres des formules concernées (L Clés en main, T Nouveau départ, S Succession, P Pro) ; vide = toutes.
 * La phase « appel » est propre à l'appli : la famille ne la voit pas.
 */
export const PHASES = [
  ['appel', 'Premier appel'], ['diagnostic', 'Diagnostic'], ['devis', 'Devis signé'],
  ['preparation', 'Préparation'], ['interventions', 'Interventions'], ['cles', 'Remise des clés'],
];

const P = (phase, libelle, reperes = '', formules = '') => ({ phase, libelle, reperes, formules });
const MODELES = [
  // 0. Premier appel
  P('appel', 'Rendez-vous de diagnostic fixé', 'oi'),
  P('appel', 'Confirmation du rendez-vous envoyée (SMS ou e-mail)', 'oi'),
  // 1. Diagnostic
  P('diagnostic', 'Visite du logement pièce par pièce', 'o'),
  P('diagnostic', 'Photos « avant » de chaque pièce', 'oi'),
  P('diagnostic', 'Inventaire des meubles et volume retenu', 'oi', 'LTS'),
  P('diagnostic', 'Souhaits de la famille notés : gardé, donné, vendu, jeté', 'o', 'LTS'),
  P('diagnostic', 'Objets de valeur, papiers et souvenirs à rechercher repérés', 'o', 'LTS'),
  P('diagnostic', 'Accès du camion, ascenseur, monte-meubles vérifiés', 'oi'),
  P('diagnostic', 'Déchets spéciaux repérés (amiante, produits, gaz, médicaments)', 'oi'),
  P('diagnostic', 'Compteurs localisés, état du logement et nettoyage notés', 'i'),
  P('diagnostic', 'Règles de la copropriété notées (horaires, syndic, gardien)', 'i'),
  P('diagnostic', 'Plan du nouveau logement et liste de ce qui y part', 'o', 'T'),
  // 2. Devis et engagement
  P('devis', 'Devis envoyé (sous 48 h)', 'o'),
  P('devis', 'Relance à J+5 si pas de réponse', 'i'),
  P('devis', 'Devis signé', 'o'),
  P('devis', 'Délai de rétractation respecté, ou demande écrite d’intervention avant la fin du délai', 'oi', 'LTS'),
  P('devis', 'Notaire identifié et accord des héritiers', 'o', 'S'),
  P('devis', 'Acompte de 40 % encaissé', 'oi', 'LTS'),
  P('devis', 'Espace client ouvert, proches invités', 'oi', 'LTS'),
  P('devis', 'Dates d’intervention fixées', 'o'),
  // 3. Préparation
  P('preparation', 'Journées de tri avec la famille', 'o', 'LTS'),
  P('preparation', 'Listing des objets conservés photographié', 'oi', 'LTS'),
  P('preparation', 'Relire et signer le listing des objets conservés', 'of', 'LTS'),
  P('preparation', 'Papiers et souvenirs classés et remis', '', 'LTS'),
  P('preparation', 'Objets de valeur remis contre décharge', '', 'LTS'),
  P('preparation', 'Association ou ressourcerie contactée, enlèvement des dons programmé', '', 'LTS'),
  P('preparation', 'Déchèterie et filières prévues (électroménager, mobilier)', 'i'),
  P('preparation', 'Camion réservé, équipe ou intérim planifiés', 'oi'),
  P('preparation', 'Syndic prévenu, ascenseur réservé, parties communes protégées', 'o'),
  P('preparation', 'Voisins prévenus (affichage dans le hall)', ''),
  P('preparation', 'Autorisation de stationnement demandée en mairie si besoin', 'i'),
  P('preparation', 'Déménageur réservé (devis séparé, réglé par le client)', 'o', 'T'),
  P('preparation', 'Box de stockage réservée si besoin', 'i', 'LTS'),
  P('preparation', 'Résiliations préparées (énergie, eau, internet, assurance)', '', 'LTS'),
  P('preparation', 'Transfert du courrier demandé', '', 'LTS'),
  P('preparation', 'Confirmer l’accès au logement pour le jour de l’intervention', 'of'),
  // 4. Interventions
  P('interventions', 'Débarras par filières, bordereaux de déchèterie gardés', 'o'),
  P('interventions', 'Enlèvement des dons, attestation de dons récupérée', '', 'LTS'),
  P('interventions', 'Objets conservés livrés, signature à la réception', '', 'LTS'),
  P('interventions', 'Déménagement le jour J', 'o', 'T'),
  P('interventions', 'Installation complète du nouveau logement', 'o', 'T'),
  P('interventions', 'Nettoyage complet', 'o'),
  P('interventions', 'Photos « après »', 'o'),
  P('interventions', 'Bon d’intervention signé', 'o'),
  P('interventions', 'Point avec la famille noté dans le journal', 'i', 'LTS'),
  // 5. Remise des clés et clôture
  P('cles', 'Visite finale et état des lieux de sortie', 'o'),
  P('cles', 'Relevé des compteurs, avec photos', 'o', 'LTS'),
  P('cles', 'Clés remises contre reçu (famille, notaire ou agence)', 'o'),
  P('cles', 'Résiliations confirmées, courrier transféré', '', 'LTS'),
  P('cles', 'Facture du solde envoyée', 'o'),
  P('cles', 'Solde encaissé (ou report chez le notaire)', 'oi'),
  P('cles', 'Documents déposés dans l’espace client (dons, bordereaux, facture)', 'oi', 'LTS'),
  P('cles', 'Appel de suivi à 15 jours', 'o', 'T'),
  P('cles', 'Avis client et autorisation des photos demandés', 'i'),
  P('cles', 'Heures réelles notées, dossier clôturé', 'oi'),
];

const cleDe = (m) => m.phase + ':' + m.libelle;

/** Tâches du parcours type pour une formule (L, T, S ou P). */
export function parcoursPour(formule) {
  return MODELES.filter((m) => !m.formules || m.formules.includes(formule)).map((m) => ({
    phase: m.phase, libelle: m.libelle, etat: 'a_faire', date: '',
    cote: m.reperes.includes('f') ? 'famille' : 'nous',
    oblig: m.reperes.includes('o'), interne: m.reperes.includes('i'),
    modele: cleDe(m),
  }));
}

/** Ajoute aux tâches existantes celles du parcours type qui manquent. Renvoie le nombre ajouté. */
export function completerParcours(taches, formule) {
  const deja = new Set(taches.map((t) => t.modele || (t.phase + ':' + t.libelle)));
  const manquantes = parcoursPour(formule).filter((t) => !deja.has(t.modele));
  taches.push(...manquantes);
  // Garder l'ordre du parcours : étape par étape.
  const ordre = Object.fromEntries(PHASES.map(([k], i) => [k, i]));
  taches.sort((a, b) => (ordre[a.phase] ?? 9) - (ordre[b.phase] ?? 9));
  return manquantes.length;
}

/** Informations à recueillir obligatoirement au premier appel : renvoie ce qui manque. */
export function infosManquantes(d) {
  const pro = d.formule === 'P';
  return [
    !d.contact?.nom && 'Nom du contact',
    !d.contact?.tel && 'Téléphone',
    !d.contact?.email && 'E-mail',
    !(d.adr?.label || d.contact?.adresse) && 'Adresse complète du logement',
    !d.echeance?.date && 'Échéance (vente, résidence, fin de bail, notaire)',
    !pro && !d.decideur && 'Qui décide et qui signe',
    d.formule === 'S' && !d.notaire && 'Notaire de la succession',
    !d.clesQui && 'Qui a les clés, comment on accède au logement',
    !pro && !d.source && 'Comment la personne nous a connus',
    ['Appel', 'Diagnostic'].includes(d.statut) && !d.rdvDiag && 'Date du rendez-vous de diagnostic',
  ].filter(Boolean);
}

/** Prochaine tâche à faire : d'abord les obligatoires, étape par étape. */
export function prochaineTache(taches) {
  const ordre = Object.fromEntries(PHASES.map(([k], i) => [k, i]));
  const restantes = taches.map((t, i) => ({ ...t, i })).filter((t) => t.etat !== 'fait')
    .sort((a, b) => (ordre[a.phase] ?? 9) - (ordre[b.phase] ?? 9) || a.i - b.i);
  return restantes.find((t) => t.oblig) || restantes[0] || null;
}
