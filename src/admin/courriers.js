/**
 * Documents types qui se remplissent seuls à partir du dossier, du carnet d'adresses et des
 * réglages de la société : lettres de résiliation, demande de stationnement, note au syndic,
 * affichette pour les voisins, reçu de remise des clés, décharge d'objets de valeur,
 * attestation de dons, relevé des compteurs.
 *
 * Chaque modèle donne la liste de ses champs (pré-remplis, modifiables dans l'appli) et dessine
 * le PDF avec le générateur maison (makePdf). Les textes restent modifiables avant téléchargement.
 */

const dateFr = (s) => { if (!s) return ''; const x = new Date(String(s).length === 10 ? s + 'T12:00:00' : s); return isNaN(x) ? String(s) : x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); };
const auj = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const RESILIABLES = ['energie', 'eau', 'internet', 'assurance', 'banque'];

/** Liste des documents proposés pour un dossier (une lettre de résiliation par organisme concerné). */
export function documentsDuDossier(d, ctx) {
  const org = (d.organismes || []).map((o, i) => ({ ...o, i, fiche: ctx.ficheCarnet(o.id) }));
  const resil = org.filter((o) => RESILIABLES.includes(o.fiche?.categorie));
  return [
    ...resil.map((o) => ({ cle: 'resiliation:' + o.id, type: 'resiliation', titre: `Résiliation · ${o.fiche?.nom || o.nom}`, groupe: 'Résiliations', desc: 'Lettre à faire signer par le titulaire ou l’héritier, à envoyer en recommandé.', org: o })),
    { cle: 'stationnement', type: 'stationnement', titre: 'Demande de stationnement en mairie', groupe: 'Organisation', desc: 'Autorisation d’occuper la voie publique pour le camion.' },
    { cle: 'syndic', type: 'syndic', titre: 'Note d’information au syndic', groupe: 'Organisation', desc: 'Dates, horaires, réservation de l’ascenseur, protection des parties communes.' },
    { cle: 'voisins', type: 'voisins', titre: 'Affichette pour les voisins', groupe: 'Organisation', desc: 'À afficher dans le hall quelques jours avant.' },
    { cle: 'decharge', type: 'decharge', titre: 'Décharge pour objets de valeur', groupe: 'Remises', desc: 'Signée par la personne qui reçoit les objets.', publiable: true },
    { cle: 'dons', type: 'dons', titre: 'Attestation de dons', groupe: 'Remises', desc: 'Liste des biens remis à l’association ou à la ressourcerie.', publiable: true },
    { cle: 'compteurs', type: 'compteurs', titre: 'Relevé des compteurs', groupe: 'Remise des clés', desc: 'Index d’électricité, de gaz et d’eau le jour de la sortie.', publiable: true },
    { cle: 'remise_cles', type: 'remise_cles', titre: 'Reçu de remise des clés', groupe: 'Remise des clés', desc: 'Signé par la personne qui reçoit les clés.', publiable: true },
  ];
}

/** Tâche du parcours → document à préparer. */
export const DOC_DE_TACHE = {
  'preparation:Résiliations préparées (énergie, eau, internet, assurance)': 'resiliation',
  'preparation:Autorisation de stationnement demandée en mairie si besoin': 'stationnement',
  'preparation:Syndic prévenu, ascenseur réservé, parties communes protégées': 'syndic',
  'preparation:Voisins prévenus (affichage dans le hall)': 'voisins',
  'preparation:Objets de valeur remis contre décharge': 'decharge',
  'interventions:Enlèvement des dons, attestation de dons récupérée': 'dons',
  'cles:Relevé des compteurs, avec photos': 'compteurs',
  'cles:Clés remises contre reçu (famille, notaire ou agence)': 'remise_cles',
};

/** Champs pré-remplis : [clé, libellé, valeur, multiligne]. */
export function champsParDefaut(doc, d, ctx) {
  const so = ctx.soc(), marque = d.formule === 'P' ? 'Fil Bleu Pro' : 'Maison Fil Bleu';
  const societe = [marque, so.adresse, [so.tel, so.email].filter((x) => x && !/\[/.test(x)).join(' · ')].filter(Boolean).join('\n');
  const adresse = d.adr?.label || d.contact?.adresse || d.ville || '';
  const titulaire = d.beneficiaire || d.contact?.nom || '';
  const deces = d.situation === 'deces';
  const dateSortie = ctx.dateEtape(d, 'cles') || d.echeance?.date || '';
  const dateInterv = ctx.dateEtape(d, 'interventions') || '';
  const parType = (cat) => (d.organismes || []).map((o) => ctx.ficheCarnet(o.id)).find((c) => c?.categorie === cat);
  const destDe = (c) => c ? [c.nom, ctx.adresseCarnet(c)].filter(Boolean).join('\n') : '';
  const lieu = so.siegeVille && !/\[/.test(so.siegeVille) ? so.siegeVille : 'Marseille';
  const etage = d.typeLog === 'appartement' ? (d.etage ? `${d.etage}e étage` : 'rez-de-chaussée') : 'maison';

  if (doc.type === 'resiliation') {
    const c = doc.org.fiche, energie = c?.categorie === 'energie' || c?.categorie === 'eau';
    const ref = doc.org.ref ? `n° ${doc.org.ref}` : 'n° [à compléter]';
    const corps = deces
      ? `Madame, Monsieur,\n\nJe vous informe du décès de ${d.beneficiaire || '[nom du défunt]'}, titulaire du contrat ${ref} pour le logement situé ${adresse}, survenu le [date du décès].\n\nEn ma qualité de [lien avec le défunt : fils, fille, héritier, notaire…], je vous demande de bien vouloir résilier ce contrat à compter du ${dateFr(dateSortie) || '[date]'}${energie ? ', après relevé du compteur à cette date' : ''}, et d’adresser la facture de clôture à l’adresse indiquée en en-tête.\n\nVous trouverez ci-joint une copie de l’acte de décès.\n\nJe vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.`
      : `Madame, Monsieur,\n\nJe vous informe que je quitte le logement situé ${adresse}. Je vous demande de bien vouloir résilier le contrat ${ref} à compter du ${dateFr(dateSortie) || '[date]'}${energie ? ', après relevé du compteur à cette date' : ''}.\n\nMerci d’adresser la facture de clôture à ma nouvelle adresse, indiquée en en-tête.\n\nJe vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.`;
    return [
      ['exp', 'Expéditeur (le titulaire ou l’héritier)', deces ? `[Nom de l’héritier]\n[Adresse de correspondance]` : `${titulaire}\n[Nouvelle adresse]`, true],
      ['dest', 'Destinataire', destDe(c) || '[Organisme]\n[Adresse : voir la facture]', true],
      ['lieu', 'Fait à, le', `${lieu}, le ${auj()}`],
      ['mention', 'Mention', 'Lettre recommandée avec accusé de réception'],
      ['objet', 'Objet', `Résiliation du contrat ${ref}${deces ? ' suite à un décès' : ''}`],
      ['corps', 'Texte', corps, true],
      ['signature', 'Signature', deces ? '[Nom de l’héritier]' : titulaire],
      ['pj', 'Pièces jointes', deces ? 'Copie de l’acte de décès' : ''],
    ];
  }
  if (doc.type === 'stationnement') {
    const m = parType('mairie');
    return [
      ['exp', 'Expéditeur', societe, true],
      ['dest', 'Destinataire', destDe(m) || 'Mairie de [commune]\nService de la voirie\n[Adresse]', true],
      ['lieu', 'Fait à, le', `${lieu}, le ${auj()}`],
      ['mention', 'Mention', ''],
      ['objet', 'Objet', 'Demande d’autorisation de stationnement pour un véhicule de déménagement'],
      ['corps', 'Texte', `Madame, Monsieur,\n\nDans le cadre d’un débarras et d’un déménagement au ${adresse}, nous sollicitons l’autorisation de stationner un véhicule utilitaire devant l’immeuble :\n\n– date : ${dateFr(dateInterv) || '[date]'} ;\n– horaires : de 8 h à 17 h ;\n– véhicule : [type, immatriculation] ;\n– emprise nécessaire : [2 places, environ 12 mètres].\n\nNous veillerons à laisser le passage libre pour les piétons et à remettre les lieux en état.\n\nNous vous remercions par avance et vous prions d’agréer, Madame, Monsieur, l’expression de nos salutations distinguées.`, true],
      ['signature', 'Signature', `${so.signataire && !/\[/.test(so.signataire) ? so.signataire : '[Prénom Nom]'}\n${marque}`],
      ['pj', 'Pièces jointes', ''],
    ];
  }
  if (doc.type === 'syndic') {
    const s = parType('syndic');
    return [
      ['exp', 'Expéditeur', societe, true],
      ['dest', 'Destinataire', destDe(s) || 'Syndic de l’immeuble\n[Nom du cabinet]\n[Adresse]', true],
      ['lieu', 'Fait à, le', `${lieu}, le ${auj()}`],
      ['mention', 'Mention', ''],
      ['objet', 'Objet', `Débarras de l’appartement du ${etage}, ${adresse}`],
      ['corps', 'Texte', `Madame, Monsieur,\n\nNous intervenons pour le compte de ${titulaire || '[nom du client]'} pour vider le logement situé ${adresse} (${etage}).\n\nL’intervention aura lieu le ${dateFr(dateInterv) || '[date]'}, de 8 h à 17 h. Nous vous remercions de bien vouloir nous confirmer la réservation de l’ascenseur sur ce créneau et nous indiquer les consignes de l’immeuble.\n\nLes parties communes (ascenseur, couloirs, hall) seront protégées pendant toute la durée de l’intervention et nettoyées à la fin. Les résidents seront prévenus par une affichette dans le hall.\n\nNous restons à votre disposition pour toute question et vous prions d’agréer, Madame, Monsieur, l’expression de nos salutations distinguées.`, true],
      ['signature', 'Signature', `${so.signataire && !/\[/.test(so.signataire) ? so.signataire : '[Prénom Nom]'}\n${marque}`],
      ['pj', 'Pièces jointes', ''],
    ];
  }
  if (doc.type === 'voisins') {
    return [
      ['titre', 'Titre', 'Information aux résidents'],
      ['date', 'Date et horaires', `Le ${dateFr(dateInterv) || '[date]'}, de 8 h à 17 h`],
      ['texte', 'Texte', `Un débarras aura lieu dans l’appartement du ${etage}. L’ascenseur pourra être occupé par moments et un camion stationnera devant l’immeuble.\n\nLes parties communes seront protégées et nettoyées à la fin de l’intervention.\n\nMerci de votre compréhension.`, true],
      ['contact', 'Contact', `${marque}${so.tel && !/\[/.test(so.tel) ? ' · ' + so.tel : ''}`],
    ];
  }
  if (doc.type === 'decharge') {
    return [
      ['logement', 'Logement', adresse],
      ['liste', 'Objets remis (un par ligne)', (d.suivi?.objets || '').trim() || '[Objet 1 : description, état]\n[Objet 2]', true],
      ['remisPar', 'Remis par', `${so.signataire && !/\[/.test(so.signataire) ? so.signataire.replace(/,.*$/, '') : '[Prénom Nom]'}, pour ${marque}`],
      ['recuPar', 'Reçu par (nom et qualité)', d.contact?.nom ? `${d.contact.nom}${d.contact.lien ? ', ' + d.contact.lien.toLowerCase() : ''}` : ''],
      ['lieu', 'Fait à, le', `${lieu}, le ${auj()}`],
    ];
  }
  if (doc.type === 'dons') {
    const a = parType('association') || parType('ressourcerie');
    return [
      ['logement', 'Logement d’origine', adresse],
      ['beneficiaire', 'Remis à', a ? [a.nom, ctx.adresseCarnet(a)].filter(Boolean).join(', ') : '[Association ou ressourcerie]'],
      ['date', 'Date de la remise', dateFr(dateInterv) || auj()],
      ['liste', 'Biens donnés (un par ligne)', '[Mobilier : …]\n[Vaisselle : …]\n[Textiles : …]', true],
      ['volume', 'Volume approximatif', '[x m³]'],
      ['lieu', 'Fait à, le', `${lieu}, le ${auj()}`],
    ];
  }
  if (doc.type === 'compteurs') {
    return [
      ['logement', 'Logement', adresse],
      ['date', 'Date du relevé', dateFr(dateSortie) || auj()],
      ['elec', 'Électricité : n° de compteur ou PDL, index (HP / HC)', '[PDL] · index [ ]'],
      ['gaz', 'Gaz : n° PCE, index', '[PCE] · index [ ]'],
      ['eau', 'Eau : n° de compteur, index', '[n°] · index [ ]'],
      ['notes', 'Observations', 'Photos des compteurs jointes au dossier.', true],
      ['presents', 'Relevé fait en présence de', d.contact?.nom || ''],
      ['lieu', 'Fait à, le', `${lieu}, le ${auj()}`],
    ];
  }
  if (doc.type === 'remise_cles') {
    return [
      ['logement', 'Logement', adresse],
      ['cles', 'Clés remises (nombre et description)', d.clesQui ? `[Nombre] jeux. Rappel : ${d.clesQui}` : '[Nombre] jeux de clés, [badge, clé de boîte aux lettres, cave…]', true],
      ['remisPar', 'Remises par', `${so.signataire && !/\[/.test(so.signataire) ? so.signataire.replace(/,.*$/, '') : '[Prénom Nom]'}, pour ${marque}`],
      ['recuPar', 'Reçues par (nom et qualité)', d.notaire ? `${d.notaire}, notaire` : (d.contact?.nom || '')],
      ['etat', 'État du logement', 'Logement vidé et nettoyé.'],
      ['lieu', 'Fait à, le', `${lieu}, le ${auj()}`],
    ];
  }
  return [];
}

/* ---------- Dessin des PDF ---------- */
export function dessinerDocument(doc, v, ctx, d) {
  const { makePdf, wrap } = ctx;
  const P = makePdf(), so = ctx.soc(), marque = d.formule === 'P' ? 'Fil Bleu Pro' : 'Maison Fil Bleu';
  const ink = '#1E2430', bleu = '#3D5A80', gris = '#5A5F68', filet = '#E2DDD4';
  const L = 60, R = 535, W = R - L;
  const lignes = (s) => String(s || '').split('\n').map((x) => x.trim());
  const para = (txt, y, size = 10.5, lh = 15, x = L, w = W) => { String(txt || '').split('\n').forEach((p) => { if (!p.trim()) { y += lh * 0.6; return; } wrap(p, size, w).forEach((t) => { if (y > 770) { P.addPage(); y = 60; } P.text(x, y, t, { size }); y += lh; }); }); return y; };
  const pied = () => { P.line(L, 805, R, 805, filet); P.text(L, 818, `${marque}, une marque de la ${so.societe || 'SAS Groupe Fil Bleu'} · ${so.adresse || ''}${so.siret && !/\[/.test(so.siret) ? ' · SIRET ' + so.siret : ''}`, { size: 7, color: gris }); };

  if (['resiliation', 'stationnement', 'syndic'].includes(doc.type)) {
    let y = 60;
    lignes(v.exp).forEach((t, i) => { P.text(L, y, t, { size: 10, bold: i === 0 }); y += 13; });
    let yd = Math.max(y + 24, 150);
    lignes(v.dest).forEach((t, i) => { P.text(320, yd, t, { size: 10, bold: i === 0 }); yd += 13; });
    y = Math.max(yd + 24, 250);
    if (v.lieu) { P.text(R, y, v.lieu, { size: 10, align: 'right' }); y += 26; }
    if (v.mention) { P.text(L, y, v.mention, { size: 10, bold: true }); y += 18; }
    if (v.objet) { wrap('Objet : ' + v.objet, 10.5, W, true).forEach((t) => { P.text(L, y, t, { size: 10.5, bold: true }); y += 15; }); y += 12; }
    y = para(v.corps, y);
    y += 22; if (y > 720) { P.addPage(); y = 80; }
    lignes(v.signature).forEach((t) => { P.text(340, y, t, { size: 10.5 }); y += 14; });
    P.box(340, y + 4, 180, 60, filet); P.text(345, y + 16, 'Signature', { size: 8, color: gris });
    y += 80;
    if (v.pj) { P.text(L, Math.min(y, 790), 'Pièce jointe : ' + v.pj, { size: 9, color: gris }); }
    if (doc.type !== 'resiliation') pied();
    return P.build();
  }

  if (doc.type === 'voisins') {
    P.rect(0, 0, 595, 10, '#15233A');
    P.text(297, 120, marque.toUpperCase(), { size: 12, bold: true, color: bleu, align: 'center' });
    P.text(297, 190, v.titre || 'Information aux résidents', { size: 30, bold: true, align: 'center' });
    P.line(200, 215, 395, 215, '#8A6D43', 1.5);
    let y = 270;
    wrap(v.date || '', 20, W, true).forEach((t) => { P.text(297, y, t, { size: 20, bold: true, align: 'center' }); y += 28; });
    y += 20;
    String(v.texte || '').split('\n').forEach((p) => { if (!p.trim()) { y += 10; return; } wrap(p, 15, W - 40).forEach((t) => { P.text(297, y, t, { size: 15, align: 'center' }); y += 22; }); });
    P.text(297, 760, v.contact || marque, { size: 12, color: gris, align: 'center' });
    return P.build();
  }

  // Documents à signer : titre, rubriques, signatures.
  const TITRES = { decharge: 'Décharge de remise d’objets de valeur', dons: 'Attestation de dons', compteurs: 'Relevé des compteurs', remise_cles: 'Reçu de remise des clés' };
  let y = 60;
  P.text(L, y, marque, { size: 14, bold: true }); P.text(R, y, (TITRES[doc.type] || '').toUpperCase(), { size: 11, bold: true, align: 'right', color: bleu });
  y += 12; P.line(L, y, R, y, ink, 0.8); y += 34;
  P.text(L, y, TITRES[doc.type] || '', { size: 18, bold: true }); y += 30;
  const rubrique = (lib, val, multi) => {
    if (y > 700) { P.addPage(); y = 60; }
    P.text(L, y, lib, { size: 8.5, bold: true, color: gris }); y += 14;
    if (multi) { lignes(val).filter(Boolean).forEach((t) => { wrap('• ' + t, 10.5, W).forEach((u) => { P.text(L, y, u, { size: 10.5 }); y += 15; }); }); }
    else { wrap(val || '—', 10.5, W).forEach((u) => { P.text(L, y, u, { size: 10.5 }); y += 15; }); }
    y += 10;
  };
  const champs = champsParDefaut(doc, d, ctx);
  if (doc.type === 'dons') {
    y = para(`${marque} atteste que les biens ci-dessous, issus du logement situé ${v.logement || '[adresse]'}, ont été remis gracieusement, le ${v.date || '[date]'}, à : ${v.beneficiaire || '[bénéficiaire]'}.`, y) + 14;
  }
  champs.forEach(([k, lib, , multi]) => { if (['lieu', 'remisPar', 'recuPar', 'presents'].includes(k) || (doc.type === 'dons' && ['logement', 'date', 'beneficiaire'].includes(k))) return; rubrique(lib, v[k], multi && ['liste', 'cles'].includes(k)); });
  y += 6; if (y > 650) { P.addPage(); y = 80; }
  if (v.lieu) { P.text(L, y, v.lieu, { size: 10.5 }); y += 24; }
  const sig = doc.type === 'dons' ? [['Pour ' + marque, '']] : doc.type === 'compteurs' ? [['Pour ' + marque, ''], ['Le client ou son représentant', v.presents || '']] : [['Remis par', v.remisPar || ''], ['Reçu par', v.recuPar || '']];
  sig.forEach(([t, n], i) => { const x = L + i * 245; P.text(x, y, t, { size: 9, bold: true, color: gris }); if (n) P.text(x, y + 13, wrap(n, 9.5, 225)[0], { size: 9.5 }); P.box(x, y + 22, 225, 70, filet); P.text(x + 6, y + 34, 'Signature', { size: 8, color: gris }); });
  pied();
  return P.build();
}
