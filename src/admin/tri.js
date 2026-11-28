/**
 * Tri automatique des courriels, par règles (sans IA, gratuit, rien ne sort du système).
 * Ne fait que PROPOSER : catégorie, infos repérées, action et réponse type. Rien n'est supprimé,
 * déplacé ni envoyé sans un clic. Fonction pure, appelée à l'affichage : le texte d'origine n'est jamais modifié.
 * Conçu pour qu'un tri par IA puisse s'y substituer plus tard (même forme de résultat).
 */

const sansAccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const contient = (t, mots) => mots.some((m) => (m instanceof RegExp ? m.test(t) : t.includes(m)));

const ORGANISMES = ['impots.gouv.fr', 'dgfip', 'ameli.fr', 'caf.fr', 'urssaf', 'service-public', 'ants.gouv', 'edf.fr', 'engie', 'totalenergies', 'enedis', 'grdf', 'orange.fr', 'orange-business', 'sfr.fr', 'free.fr', 'free-mobile', 'bouyguestelecom', 'laposte', 'axa', 'maif', 'macif', 'matmut', 'groupama', 'allianz', 'generali', 'credit-agricole', 'societegenerale', 'bnpparibas', 'lcl.fr', 'banquepopulaire', 'caisse-epargne', 'creditmutuel', 'labanquepostale', 'veolia', 'suez', 'eauxdemarseille', 'sem-eau'];
// Boîtes mail grand public des opérateurs : un particulier qui écrit depuis @orange.fr n'est pas Orange.
const BOITES_PERSO = ['orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'neuf.fr', 'laposte.net', 'bbox.fr', 'numericable.fr', 'aliceadsl.fr', 'club-internet.fr'];
const LOCAL_SERVICE = /^(service|services|client|clients|clientele|serviceclient|service-client|noreply|no-reply|ne-pas-repondre|facture|factures|facturation|contact|info|infos|notification|notifications|relation|support|abonnement)[._-]?/;
const AUTOMATIQUES = [/no-?reply|ne-?pas-?repondre|donotreply|mailer-daemon|notification|notifications|newsletter|info@|news@|marketing|bounce/];
const MOTS_PUB = ['promo', 'offre speciale', 'offre exclusive', '-50', 'soldes', 'black friday', 'code promo', 'reduction', 'webinar', 'gagnez', 'cliquez ici', 'newsletter', 'abonnez', 'seo', 'referencement', 'site internet', 'backlink', 'prospects', 'leads'];
const MOTS_DESABO = ['se desabonner', 'desinscrire', 'unsubscribe', 'desabonnement', 'ne plus recevoir'];

const SITUATIONS = [
  ['deces', ['deces', 'decede', 'decedee', 'succession', 'heritage', 'heritier', 'defunt', 'defunte', 'nous a quitte', 'disparu', 'disparition de', 'feu mon', 'feue ma', 'apres le deces']],
  ['residence', ['ehpad', 'maison de retraite', 'residence senior', 'residence pour seniors', 'residence autonomie', 'entree en residence', 'entre en residence', 'entrer en residence', 'rentre en ehpad', 'part en ehpad', 'foyer logement', 'usld']],
  ['demenage', ['demenage', 'demenagement', 'nouveau logement', 'nouvel appartement', 'je quitte', 'nous quittons', 'mutation']],
  ['vente', ['vendre', 'vente', 'compromis', 'mise en vente', 'acquereur', 'signature chez le notaire', 'agence immobiliere a vendu', 'sous compromis']],
  ['vide', ['debarras', 'debarrasser', 'vider', 'videz', 'logement vide', 'encombrants', 'tout jeter', 'evacuer']],
];
const FORMULE_DE = { deces: 'S', residence: 'T', demenage: 'T', vente: 'L', vide: 'L' };
const MOTS_PRO = ['agence', 'syndic', 'bailleur', 'gestion locative', 'gestionnaire', 'administrateur de biens', 'fin de bail', 'etat des lieux', 'remise en location', 'locataire', 'mandat de gestion', 'notaire', 'office notarial', 'etude notariale', 'scp', 'sarl', 'sas ', 'nos biens', 'nos logements', 'notre agence'];
const MOTS_DEMANDE = ['devis', 'tarif', 'prix', 'combien', 'estimation', 'rendez-vous', 'rdv', 'rappeler', 'me contacter', 'nous contacter', 'disponibilite', 'intervenir', 'aider', 'besoin de', 'souhaiterais', 'souhaiterions', 'je souhaite', 'nous souhaitons', 'renseignement', 'information', 'pourriez-vous', 'pouvez-vous', 'appartement', 'maison', 'logement', 'parents', 'mere', 'pere', 'grand-mere', 'grand-pere'];

function extraire(texte, communes) {
  const t = String(texte || ''), s = sansAccent(t), infos = {};
  const tel = t.match(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/); if (tel) infos.tel = tel[0].replace(/[.\-]/g, ' ').replace(/\s+/g, ' ').trim();
  const cpMarseille = s.match(/\b130(0[1-9]|1[0-6])\b/);
  const cp = s.match(/\b(04|05|06|13|30|83|84)\d{3}\b/);
  if (cpMarseille) { const n = +cpMarseille[1]; infos.ville = `Marseille ${n === 1 ? '1er' : n + 'e'}`; infos.cp = cpMarseille[0]; }
  else if (cp) infos.cp = cp[0];
  if (!infos.ville) {
    const arr = s.match(/marseille\s*(\d{1,2})\s*(?:e|eme|er)\b/);
    if (arr) infos.ville = `Marseille ${arr[1] === '1' ? '1er' : arr[1] + 'e'}`;
    else {
      const trouve = (communes || []).filter((c) => !/autre/i.test(c)).map((c) => [c, sansAccent(c.replace(/\s*\(\d+\)$/, ''))])
        .filter(([, n]) => n.length > 3 && new RegExp(`\\b${n.replace(/[-\s]/g, '[-\\s]')}\\b`).test(s))
        .sort((a, b) => b[1].length - a[1].length)[0];
      if (trouve) infos.ville = trouve[0];
    }
  }
  if (/\b(maison|villa|pavillon|bastide|mas)\b/.test(s)) infos.typeLog = 'maison';
  else if (/\b(appartement|appart|studio|t[1-6]|f[1-6])\b/.test(s)) infos.typeLog = 'appartement';
  const tp = s.match(/\b[tf]([1-6])\b/) || s.match(/\b(\d)\s*pieces?\b/);
  if (/\bstudio\b/.test(s)) infos.taille = 0;
  else if (tp) { const n = +tp[1]; infos.taille = n <= 2 ? 0 : n === 3 ? 1 : n === 4 ? 2 : 3; infos.pieces = n; }
  const surf = s.match(/\b(\d{2,3})\s?(?:m2|m²|metres? carres?)/); if (surf) infos.surface = +surf[1];
  const etage = s.match(/\b(\d{1,2})\s?(?:e|eme|er)\s*etage\b/); if (etage) infos.etage = +etage[1];
  if (/sans ascenseur|pas d.ascenseur/.test(s)) infos.ascenseur = false; else if (/\bascenseur\b/.test(s)) infos.ascenseur = true;
  if (contient(s, ['urgent', 'urgence', 'au plus vite', 'rapidement', 'des que possible', 'tres vite', 'sous 8 jours', 'cette semaine', 'avant la fin du mois'])) infos.urgence = true;
  const ech = t.match(/\b(?:avant|d.ici|pour|au plus tard|le|fin|début|debut|mi-)\s(?:le\s)?(?:\d{1,2}(?:er)?\s)?(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)(?:\s\d{4})?/i)
    || t.match(/\b(?:avant|d.ici|pour|au plus tard|le)\s(?:le\s)?\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/i);
  if (ech) infos.echeance = ech[0];
  if (contient(s, ['cave', 'garage', 'grenier', 'cabanon', 'remise', 'jardin'])) infos.annexes = true;
  if (contient(s, ['piano', 'coffre-fort', 'coffre fort', 'billard', 'armoire normande'])) infos.objetsLourds = true;
  return infos;
}

/**
 * @param c courriel { de, de_nom, sujet, texte, sens, dossier_id }
 * @param ctx { carnet: [{id, nom, email, categorie}], dossiers: [{id, contact, organismes, statut}], communes: [...] }
 * @returns { categorie, libelle, confiance, infos, situation, formule, pro, dossierPropose, actions, raisons }
 */
export function trierCourriel(c, ctx = {}) {
  const de = sansAccent(c.de), dom = de.split('@')[1] || '';
  const texte = `${c.sujet || ''}\n${c.texte || ''}`, s = sansAccent(texte);
  const raisons = [], res = { categorie: 'autre', libelle: 'À regarder', confiance: 'faible', infos: {}, raisons };
  if (c.sens === 'envoye') return { ...res, categorie: 'envoye', libelle: 'Envoyé' };

  // 1. Expéditeur connu : famille d'un dossier en cours (déjà rangé par la base) ou organisme du carnet.
  const dossiers = ctx.dossiers || [];
  const famille = dossiers.filter((d) => sansAccent(d.contact?.email) === de);
  if (c.dossier_id || famille.length) {
    res.categorie = 'famille'; res.libelle = 'Famille d’un dossier'; res.confiance = 'forte';
    res.dossierPropose = c.dossier_id || (famille.length === 1 ? famille[0].id : null);
    raisons.push('expéditeur connu dans un dossier');
  }
  const fiches = (ctx.carnet || []).filter((f) => f.email && (sansAccent(f.email) === de || (dom && sansAccent(f.email).endsWith('@' + dom))));
  const local = de.split('@')[0] || '';
  const domOrganisme = contient(dom, ORGANISMES) && (!BOITES_PERSO.includes(dom) || LOCAL_SERVICE.test(local));
  const estOrganisme = fiches.length || domOrganisme;
  if (res.categorie === 'autre' && estOrganisme) {
    res.categorie = 'organisme'; res.libelle = fiches[0] ? `Organisme : ${fiches[0].nom}` : 'Organisme ou fournisseur'; res.confiance = fiches.length ? 'forte' : 'moyenne';
    const lies = dossiers.filter((d) => (d.organismes || []).some((o) => fiches.some((f) => f.id === o.id)) && !['Terminé', 'Perdu'].includes(d.statut));
    if (lies.length === 1) { res.dossierPropose = lies[0].id; raisons.push('organisme lié à un seul dossier en cours'); }
    raisons.push(fiches.length ? 'organisme du carnet d’adresses' : 'domaine d’un organisme connu');
  }

  // 2. Messages automatiques et publicités (repérés, jamais cachés).
  const desabo = contient(s, MOTS_DESABO), auto = contient(de, AUTOMATIQUES);
  if (res.categorie === 'autre' && (auto || desabo)) {
    const pub = desabo && contient(s, MOTS_PUB);
    res.categorie = pub ? 'publicite' : 'automatique'; res.libelle = pub ? 'Publicité probable' : 'Message automatique'; res.confiance = auto && desabo ? 'forte' : 'moyenne';
    raisons.push(auto ? 'adresse d’envoi automatique' : 'lien de désabonnement');
  }

  // 3. Demande de client : situation, logement, coordonnées.
  const infos = extraire(texte, ctx.communes);
  res.infos = infos;
  const sit = SITUATIONS.find(([, mots]) => contient(s, mots));
  const pro = contient(s, MOTS_PRO);
  const indices = [sit, infos.tel, infos.ville, infos.typeLog, infos.taille != null, contient(s, MOTS_DEMANDE)].filter(Boolean).length;
  if (res.categorie === 'autre' && indices >= 2) {
    res.categorie = pro && !sit?.[0]?.match(/deces|residence/) ? 'demande_pro' : 'demande';
    res.libelle = res.categorie === 'demande_pro' ? 'Demande d’un professionnel' : 'Nouvelle demande';
    res.confiance = indices >= 4 ? 'forte' : 'moyenne';
    raisons.push(`${indices} indices de demande`);
  }
  if (sit) { res.situation = sit[0]; raisons.push(`situation : ${sit[0]}`); }
  res.pro = pro;
  res.formule = res.categorie === 'demande_pro' ? 'P' : sit ? FORMULE_DE[sit[0]] : (res.categorie === 'demande' ? 'L' : null);

  // 4. Actions proposées (aucune n'est exécutée sans clic).
  const a = [];
  if (res.dossierPropose) a.push('ranger');
  if (res.categorie === 'demande' || res.categorie === 'demande_pro') a.push('creer', 'repondre_accuse');
  if (res.categorie === 'organisme' && !res.dossierPropose) a.push('choisir_dossier');
  if (res.categorie === 'famille') a.push('repondre');
  if (res.categorie === 'automatique' || res.categorie === 'publicite') a.push('ignorer');
  res.actions = a;
  return res;
}

const SITU_TEXTE = { deces: 'la succession', residence: 'l’entrée en résidence', demenage: 'le déménagement', vente: 'la vente du logement', vide: 'le débarras du logement' };

/** Infos encore manquantes pour préparer le diagnostic (questions de la réponse type). */
export function questionsManquantes(tri) {
  const i = tri.infos || {}, q = [];
  if (!i.ville && !i.cp) q.push('l’adresse du logement (au moins la commune)');
  if (!i.typeLog || i.taille == null) q.push('le type de logement et le nombre de pièces');
  if (!i.echeance) q.push('la date à laquelle le logement doit être libéré');
  if (!i.tel) q.push('un numéro de téléphone pour vous rappeler');
  return q;
}

/** Réponses types proposées selon le tri (modifiables avant l'envoi). */
export function reponsesTypes(tri, { signature = 'Bien cordialement,\nMaison Fil Bleu', nom = '' } = {}) {
  const bonjour = nom ? `Bonjour ${nom},` : 'Bonjour,';
  const q = questionsManquantes(tri);
  const r = [];
  if (tri.categorie === 'demande' || tri.categorie === 'demande_pro') {
    const objet = tri.situation ? ` concernant ${SITU_TEXTE[tri.situation]}` : '';
    r.push({ titre: 'Accusé de réception et rendez-vous', texte: `${bonjour}\n\nMerci pour votre message${objet}. Nous pouvons tout à fait vous accompagner.\n\nLe plus simple est d’en parler de vive voix : je vous propose de vous appeler${tri.infos?.tel ? ` au ${tri.infos.tel}` : ''}, puis de venir faire le diagnostic sur place, gratuitement et sans engagement.${q.length ? `\n\nPour le préparer, pourriez-vous me préciser :\n${q.map((x) => '– ' + x).join(' ;\n')}.` : ''}\n\nQuels jours et horaires vous conviennent le mieux ?\n\n${signature}` });
    if (q.length) r.push({ titre: 'Demander les infos manquantes', texte: `${bonjour}\n\nMerci pour votre message. Pour vous faire une première estimation, pourriez-vous me préciser :\n${q.map((x) => '– ' + x).join(' ;\n')}.\n\nJe reviens vers vous dès réception.\n\n${signature}` });
  }
  if (tri.categorie === 'famille') r.push({ titre: 'Réponse simple', texte: `${bonjour}\n\nMerci pour votre message, c’est bien noté.\n\n\n\n${signature}` });
  if (tri.categorie === 'organisme') r.push({ titre: 'Accusé de réception', texte: `${bonjour}\n\nMerci pour votre message, nous en prenons bonne note.\n\n${signature}` });
  return r;
}
