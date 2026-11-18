import { FORMULES_PRIX, montant } from './tarifs';
/**
 * Titres de page et meta descriptions (uniques, avec le lieu).
 * Les termes de recherche réels vont ici et dans les adresses, pas dans le texte visible (§ 8).
 * Repères : titre ≤ 65 caractères, description ≤ 160 caractères (au-delà, Google coupe).
 */
export const META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Maison Fil Bleu : accompagnement des familles à Marseille',
    description: "Entrée en résidence, logement à libérer, succession à Marseille et en PACA : tri, débarras, nettoyage, démarches. Prix fixé d'avance, diagnostic offert.",
  },
  '/liberation': {
    title: 'Vider et nettoyer un logement à Marseille | Maison Fil Bleu',
    description: `Vider une maison ou un appartement à Marseille et en PACA : tri, dons, débarras, nettoyage, remise des clés. À partir de ${montant(FORMULES_PRIX.L.prix[0])} TTC, diagnostic offert.`,
  },
  '/transition': {
    title: 'Déménagement en résidence ou EHPAD à Marseille | Maison Fil Bleu',
    description: `Entrée en résidence ou en EHPAD, logement plus petit à Marseille et en PACA : tri, déménagement, installation, démarches. À partir de ${montant(FORMULES_PRIX.T.prix[0])} TTC.`,
  },
  '/succession': {
    title: "Succession : logement d'un proche à Marseille | Maison Fil Bleu",
    description: `Débarras succession à Marseille et en PACA : partage entre héritiers, papiers, lien avec le notaire, nettoyage, aide à la vente. À partir de ${montant(FORMULES_PRIX.S.prix[0])} TTC.`,
  },
  '/notre-methode': {
    title: 'Notre méthode en 5 étapes | Maison Fil Bleu Marseille',
    description: 'Diagnostic offert, devis forfaitaire, intervention coordonnée, nouvelles à chaque étape, remise des clés : notre méthode à Marseille et en région PACA.',
  },
  '/tarifs': {
    title: 'Tarifs vide-maison et débarras à Marseille | Maison Fil Bleu',
    description: 'Prix de départ des formules Libération, Transition et Succession et options : tous nos tarifs à Marseille et en région PACA, diagnostic offert.',
  },
  '/estimation': {
    title: 'Estimation en ligne : vide-maison à Marseille | Maison Fil Bleu',
    description: 'Trouvez en quelques clics la formule adaptée et son prix de départ à Marseille et en PACA. Prix exact fixé après le diagnostic offert, sans engagement.',
  },
  '/qui-sommes-nous': {
    title: 'Qui sommes-nous | Maison Fil Bleu, Marseille',
    description: "Quinze ans d'immobilier à Marseille au service des familles : l'histoire et les valeurs de Maison Fil Bleu, en région PACA.",
  },
  '/conseils': {
    title: 'Conseils : succession, EHPAD, vider une maison | Maison Fil Bleu',
    description: "Préparer une entrée en EHPAD, vider une maison avant la vente, le logement d'un parent décédé, gérer à distance : nos conseils à Marseille et en PACA.",
  },
  '/conseils/logement-parent-decede': {
    title: "Logement d'un parent décédé : que faire ? | Maison Fil Bleu",
    description: "Bail, assurance, succession, tri et partage, débarras : les étapes pour gérer le logement d'un parent décédé à Marseille et en région PACA.",
  },
  '/conseils/preparer-entree-ehpad': {
    title: 'Préparer une entrée en EHPAD sans stress | Maison Fil Bleu',
    description: "Choisir ce qu'on emporte, aménager la chambre, organiser le déménagement et les démarches : préparer une entrée en EHPAD à Marseille et en PACA.",
  },
  '/conseils/vider-maison-avant-vente': {
    title: 'Vider une maison avant la vente | Maison Fil Bleu Marseille',
    description: 'Tri, dons, débarras, nettoyage et remise en état : les étapes pour vider une maison avant de la vendre, à Marseille et en région PACA.',
  },
  '/conseils/meubles-dont-personne-ne-veut': {
    title: 'Que faire des meubles dont personne ne veut ? | Maison Fil Bleu',
    description: 'Dons aux associations, ressourceries, recyclage en filières agréées : des solutions pour les meubles dont personne ne veut, à Marseille et en PACA.',
  },
  '/conseils/gerer-logement-a-distance': {
    title: 'Gérer un logement à distance | Maison Fil Bleu Marseille',
    description: 'Vous habitez loin ? Photos, comptes rendus et un seul interlocuteur pour vider et libérer un logement à Marseille et en PACA sans vous déplacer.',
  },
  '/notaires': {
    title: 'Notaires : libérer le logement de vos clients | Maison Fil Bleu',
    description: "Études notariales à Marseille et en PACA : nous prenons en charge le logement de vos clients, vente, départ en résidence ou succession, en lien avec votre étude.",
  },
  '/agences': {
    title: 'Agences immobilières : un bien libéré à temps | Maison Fil Bleu',
    description: "Agences immobilières à Marseille et en PACA : tri, déménagement, débarras et nettoyage du bien de votre vendeur, à la date de l'acte. Le mandat reste le vôtre.",
  },
  '/residences': {
    title: 'Résidences seniors et EHPAD : une entrée préparée | Fil Bleu',
    description: "Résidences seniors et EHPAD à Marseille et en PACA : tri, déménagement, installation de la chambre et ancien logement, au rythme du résident.",
  },
  '/partenaires': {
    title: 'Espace partenaires : notaires, agences, résidences | Maison Fil Bleu',
    description: 'Notaires, agences immobilières, résidences seniors et EHPAD : confiez-nous le logement de vos clients ou résidents à Marseille et en région PACA.',
  },
  '/contact': {
    title: 'Contact et diagnostic offert à Marseille | Maison Fil Bleu',
    description: 'Demandez à être rappelé : un premier échange au téléphone puis un diagnostic sur place, offert et sans engagement, à Marseille et en région PACA.',
  },
  '/pro': {
    title: 'Fil Bleu Pro : débarras et nettoyage de logements à Marseille',
    description: 'Débarras et nettoyage de logements vides pour agences, syndics, bailleurs et notaires à Marseille et en PACA. Devis sous 24 h, paiement à 30 jours.',
  },
  '/pro/tarifs': {
    title: 'Grille tarifaire professionnels | Fil Bleu Pro Marseille',
    description: 'Recevez la grille tarifaire Fil Bleu Pro réservée aux professionnels : débarras, nettoyage et remise en état à Marseille et en région PACA.',
  },
};
