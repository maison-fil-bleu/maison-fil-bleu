/**
 * Dossier de démonstration (Réglages) : un faux dossier « Succession » complet pour voir l'espace client
 * comme une famille, en se connectant sur le site avec contact@maisonfilbleu.fr (le code arrive dans Gmail).
 * Les dates sont recalculées à partir du jour de la création : « @n » = aujourd'hui + n jours,
 * « {n} » dans un texte = la même date écrite « 9 déc. ». Réinitialiser remet tout dans l'état d'origine.
 */
export const DEMO_ID = 'ddemo';
export const DEMO_EMAIL = 'contact@maisonfilbleu.fr';

const ESPACE = {
 "bien": {
  "famille": "famille Martin",
  "type": "Appartement T4, 82 m²",
  "acces": "3e étage, ascenseur réservé le {5}",
  "stationnement": "Rue, autorisation demandée en mairie",
  "cles": "3 jeux : Claire Martin, gardien, Maison Fil Bleu",
  "compteurs": "Eau et électricité, relevé prévu le {8}",
  "cave": "N° 14, sous-sol",
  "devenir": "Mise en vente par l'étude après la remise des clés"
 },
 "prochain": {
  "date": "@5",
  "horaire": "8 h à 17 h",
  "titre": "Débarras sur place",
  "detail": "2 personnes, 1 camion. Votre présence n'est pas nécessaire : photos envoyées le soir même."
 },
 "taches": [
  {
   "phase": "diagnostic",
   "libelle": "Visite du logement avec Claire Martin (1 h 30)",
   "etat": "fait",
   "date": "@-16",
   "cote": "nous"
  },
  {
   "phase": "diagnostic",
   "libelle": "Inventaire pièce par pièce : 6 pièces et la cave",
   "etat": "fait",
   "date": "@-16",
   "cote": "nous"
  },
  {
   "phase": "diagnostic",
   "libelle": "Relevé des accès : 3e étage, ascenseur, stationnement rue",
   "etat": "fait",
   "date": "@-16",
   "cote": "nous"
  },
  {
   "phase": "diagnostic",
   "libelle": "Estimation du volume à évacuer : 18 m³",
   "etat": "fait",
   "date": "@-16",
   "cote": "nous"
  },
  {
   "phase": "devis",
   "libelle": "Devis envoyé",
   "etat": "fait",
   "date": "@-15",
   "cote": "nous"
  },
  {
   "phase": "devis",
   "libelle": "Devis signé par Claire Martin",
   "etat": "fait",
   "date": "@-14",
   "cote": "nous"
  },
  {
   "phase": "devis",
   "libelle": "Acompte de 30 % reçu",
   "etat": "fait",
   "date": "@-12",
   "cote": "nous"
  },
  {
   "phase": "preparation",
   "libelle": "Tri : salon, salle à manger, cuisine",
   "etat": "fait",
   "date": "@-2",
   "cote": "nous"
  },
  {
   "phase": "preparation",
   "libelle": "Tri : chambres 1 et 2, bureau, cave",
   "etat": "en_cours",
   "date": "@1",
   "cote": "nous"
  },
  {
   "phase": "preparation",
   "libelle": "Objets à conserver identifiés et photographiés",
   "etat": "fait",
   "date": "@-2",
   "cote": "nous"
  },
  {
   "phase": "preparation",
   "libelle": "Association partenaire et ressourcerie prévenues",
   "etat": "fait",
   "date": "@-6",
   "cote": "nous"
  },
  {
   "phase": "preparation",
   "libelle": "Syndic prévenu, ascenseur réservé pour le {5}",
   "etat": "fait",
   "date": "@-6",
   "cote": "nous"
  },
  {
   "phase": "preparation",
   "libelle": "Prévenir les voisins de palier (affichage dans le hall)",
   "etat": "a_faire",
   "date": "@3",
   "cote": "nous"
  },
  {
   "phase": "preparation",
   "libelle": "Planifier le transport des objets vers Aix-en-Provence",
   "etat": "a_faire",
   "date": "@2",
   "cote": "nous"
  },
  {
   "phase": "preparation",
   "libelle": "Confirmer l'accès au logement le {5} (gardien ou boîte à clés)",
   "etat": "a_faire",
   "date": "@4",
   "cote": "famille"
  },
  {
   "phase": "interventions",
   "libelle": "Débarras : déchèterie, dons, ressourcerie",
   "etat": "a_faire",
   "date": "@5",
   "cote": "nous"
  },
  {
   "phase": "interventions",
   "libelle": "Livraison des objets conservés à Aix-en-Provence",
   "etat": "a_faire",
   "date": "@6",
   "cote": "nous"
  },
  {
   "phase": "interventions",
   "libelle": "Nettoyage complet du logement",
   "etat": "a_faire",
   "date": "@6",
   "cote": "nous"
  },
  {
   "phase": "interventions",
   "libelle": "Photos après intervention, bon d'intervention signé",
   "etat": "a_faire",
   "date": "@6",
   "cote": "nous"
  },
  {
   "phase": "cles",
   "libelle": "État des lieux de sortie",
   "etat": "a_faire",
   "date": "@8",
   "cote": "nous"
  },
  {
   "phase": "cles",
   "libelle": "Relevé des compteurs (eau, électricité)",
   "etat": "a_faire",
   "date": "@8",
   "cote": "nous"
  },
  {
   "phase": "cles",
   "libelle": "Remise des clés à l'étude de Me Durand",
   "etat": "a_faire",
   "date": "@8",
   "cote": "nous"
  },
  {
   "phase": "cles",
   "libelle": "Bilan de fin de mission, facture finale",
   "etat": "a_faire",
   "date": "@11",
   "cote": "nous"
  }
 ],
 "pieces": [
  {
   "nom": "Salon",
   "tri": "trie",
   "conserves": 2,
   "dons": "4 meubles",
   "dons_volume": 2,
   "volume": 3.5
  },
  {
   "nom": "Salle à manger",
   "tri": "trie",
   "conserves": 1,
   "dons": "Vaisselle courante",
   "dons_volume": 0.5,
   "volume": 2
  },
  {
   "nom": "Cuisine",
   "tri": "trie",
   "conserves": 0,
   "dons": "Électroménager",
   "dons_volume": 1,
   "volume": 2.5
  },
  {
   "nom": "Chambre 1",
   "tri": "en_cours",
   "conserves": 1,
   "dons": "",
   "volume": 3
  },
  {
   "nom": "Chambre 2",
   "tri": "en_cours",
   "conserves": 0,
   "dons": "Mobilier complet",
   "dons_volume": 1.5,
   "volume": 3
  },
  {
   "nom": "Bureau",
   "tri": "a_trier",
   "conserves": 0,
   "dons": "",
   "volume": 2
  },
  {
   "nom": "Cave",
   "tri": "a_trier",
   "conserves": 0,
   "dons": "",
   "volume": 2
  }
 ],
 "contacts": [
  {
   "nom": "Claire Martin",
   "role": "Titulaire",
   "detail": "Accès à l'espace, signataire"
  },
  {
   "nom": "Paul Martin",
   "role": "Proche",
   "detail": "Accès à l'espace"
  },
  {
   "nom": "Étude de Me Durand",
   "role": "Notaire",
   "detail": "Remise des clés le {8}"
  },
  {
   "nom": "Syndic de l'immeuble",
   "role": "Copropriété",
   "detail": "Ascenseur réservé le {5}"
  },
  {
   "nom": "Gardien",
   "role": "Immeuble",
   "detail": "Détient un jeu de clés"
  }
 ],
 "etapes": [
  {
   "cle": "diagnostic",
   "etat": "termine",
   "date": "@-16",
   "message": "Merci pour votre accueil. Nous avons fait le tour du logement ensemble et noté vos souhaits pièce par pièce."
  },
  {
   "cle": "devis",
   "etat": "termine",
   "date": "@-14",
   "message": "Merci pour votre confiance : le devis est signé."
  },
  {
   "cle": "preparation",
   "etat": "en_cours",
   "date": "@1",
   "message": "Le tri a commencé. Le listing des objets mis de côté est prêt : relisez-le et signez-le. Rien ne part sans votre accord."
  },
  {
   "cle": "interventions",
   "etat": "a_venir",
   "date": "@5",
   "message": ""
  },
  {
   "cle": "cles",
   "etat": "a_venir",
   "date": "@8",
   "message": "à l'étude de Me Durand"
  }
 ],
 "reference": "MFB-2026-031",
 "titre": "Succession de Mme Jeanne Martin",
 "adresse": "12 rue Paradis, 13008 Marseille",
 "ville": "Marseille 8e"
};
const JOURNAL = [
 {
  "quand": "@-1 16:40",
  "type": "contact",
  "titre": "Appel avec Claire Martin",
  "texte": "Date du {5} confirmée. Livraison de l'horloge chez elle à Aix-en-Provence le {6} au matin."
 },
 {
  "quand": "@-1 11:05",
  "type": "decision",
  "titre": "Question posée à la famille",
  "texte": "Bibliothèque du bureau : vendre ou donner ?"
 },
 {
  "quand": "@-2 18:05",
  "type": "intervention",
  "titre": "Tri de 3 pièces terminé",
  "texte": "Salon, salle à manger, cuisine. Objets mis de côté et photographiés."
 },
 {
  "quand": "@-2 11:20",
  "type": "decision",
  "titre": "Mobilier de la chambre 2 donné",
  "texte": "Accord de Claire et Paul Martin. Enlèvement par l'association partenaire le {5}"
 },
 {
  "quand": "@-3 09:30",
  "type": "contact",
  "titre": "E-mail à l'étude de Me Durand",
  "texte": "Remise des clés convenue le {8} à l'étude."
 },
 {
  "quand": "@-6 15:00",
  "type": "organisation",
  "titre": "Ascenseur réservé",
  "texte": "Auprès du syndic, pour le {5} de 8 h à 13 h."
 },
 {
  "quand": "@-6 10:00",
  "type": "organisation",
  "titre": "Association et ressourcerie prévenues",
  "texte": "Volume de dons estimé : 5 m³."
 },
 {
  "quand": "@-12 09:00",
  "type": "document",
  "titre": "Facture d'acompte disponible",
  "texte": "Acompte de 30 % reçu, merci."
 },
 {
  "quand": "@-14 17:30",
  "type": "decision",
  "titre": "Devis signé",
  "texte": "Formule Succession, avec l'option nettoyage complet."
 },
 {
  "quand": "@-16 10:00",
  "type": "intervention",
  "titre": "Diagnostic sur place",
  "texte": "Visite avec Claire Martin. Inventaire et souhaits notés pièce par pièce."
 }
];
const DECISIONS = [
 {
  "posee_le": "@-1 11:05",
  "question": "Bibliothèque du bureau : vendre ou donner ?",
  "choix": [
   "Vendre",
   "Donner"
  ]
 },
 {
  "posee_le": "@-2 11:20",
  "question": "Mobilier de la chambre 2 donné à l'association partenaire",
  "statut": "validee",
  "reponse": "Oui, à donner",
  "decide_par": "Claire et Paul Martin",
  "decide_le": "@-2 11:20"
 },
 {
  "posee_le": "@-14 11:20",
  "question": "Option nettoyage complet ajoutée au devis",
  "statut": "validee",
  "reponse": "Oui",
  "decide_par": "Claire Martin",
  "decide_le": "@-14 11:20"
 },
 {
  "posee_le": "@-16 11:20",
  "question": "Albums photos et lettres conservés pour Paul Martin",
  "statut": "validee",
  "reponse": "Oui",
  "decide_par": "Claire et Paul Martin",
  "decide_le": "@-16 11:20"
 }
];
const OBJETS = [
 {
  "nom": "Horloge comtoise du salon",
  "destinataire": "Claire",
  "note": "À livrer chez elle à Aix-en-Provence.",
  "ordre": 0,
  "piece": "Salon"
 },
 {
  "nom": "Album photos de famille (3 volumes)",
  "destinataire": "Paul",
  "note": "",
  "ordre": 1,
  "piece": "Salon"
 },
 {
  "nom": "Service en porcelaine de Limoges",
  "destinataire": "Claire",
  "note": "Emballé avec soin, 42 pièces.",
  "ordre": 2,
  "piece": "Salle à manger"
 },
 {
  "nom": "Machine à coudre Singer",
  "destinataire": "Pour la famille",
  "note": "",
  "ordre": 3,
  "piece": "Chambre 1"
 }
];

const jour = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const court = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
function dater(v) {
  if (Array.isArray(v)) return v.map(dater);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dater(x)]));
  if (typeof v !== 'string') return v;
  let m = v.match(/^@(-?\d+)$/); if (m) return ymd(jour(+m[1]));
  m = v.match(/^@(-?\d+) (\d\d):(\d\d)$/); if (m) { const d = jour(+m[1]); d.setHours(+m[2], +m[3]); return d.toISOString(); }
  return v.replace(/\{(-?\d+)\}/g, (_, n) => court(jour(+n)));
}

/** Crée ou remet à zéro le dossier de démonstration. `base` = un dossier vide (newDossier). */
export async function creerDemo(sb, base, envoyer) {
  const d = { ...base, id: DEMO_ID, demo: true, statut: 'Signé', formule: 'S', formuleAuto: false, situation: 'deces',
    created: jour(-16).toISOString(), source: 'demo',
    contact: { nom: 'Famille Démo (test fondateur)', tel: '', email: DEMO_EMAIL, lien: 'Démo' }, beneficiaire: 'Mme Jeanne Martin',
    ville: 'Marseille', typeLog: 'appartement', taille: 2, surface: 82, etage: 3, ascenseur: true,
    notes: "Dossier de démonstration pour voir l'espace client comme une famille. Ne pas facturer, à supprimer avant l'ouverture." };
  d.diag = { ...d.diag, volume: 18 };
  await envoyer(d);
  const e = dater(ESPACE);
  const ok = (r) => { if (r.error) throw r.error; return r; };
  await Promise.all(['journal', 'decisions', 'objets_conserves', 'listings_objets'].map((t) => sb.from(t).delete().eq('dossier_id', DEMO_ID).then(ok)));
  ok(await sb.from('espace_client').upsert({ dossier_id: DEMO_ID, formule: 'S', interlocuteur: { nom: '', tel: '' }, ...e }));
  ok(await sb.from('dossier_acces').upsert({ dossier_id: DEMO_ID, email: DEMO_EMAIL, role: 'titulaire', invite_le: new Date().toISOString() }, { onConflict: 'dossier_id,email' }));
  ok(await sb.from('journal').insert(dater(JOURNAL).map((j) => ({ dossier_id: DEMO_ID, ...j }))));
  ok(await sb.from('decisions').insert(dater(DECISIONS).map((x) => ({ dossier_id: DEMO_ID, ...x }))));
  ok(await sb.from('objets_conserves').insert(OBJETS.map((o) => ({ dossier_id: DEMO_ID, ...o }))));
  return d;
}
