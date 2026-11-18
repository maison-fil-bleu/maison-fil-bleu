/**
 * Déclenchée automatiquement par Netlify à chaque demande envoyée par un formulaire du site
 * (événement « submission-created », après le filtre anti-spam de Netlify Forms).
 *
 *   - « rappel » (page Contact)  → dossier au statut « Appel », formule conseillée selon la situation ;
 *   - « devis-pro » (Fil Bleu Pro) → dossier « Fil Bleu Pro » (client agence ou pro).
 *   - « partenaire » (/notaires, /agences, /residences) → dossier au statut « Appel » pour la famille
 *     à rappeler, avec les coordonnées du partenaire dans les notes.
 *   - « grille-pro » (demande de grille tarifaire) : pas de dossier, l'e-mail de Netlify suffit.
 *
 * Le dossier reprend la forme de newDossier() de l'appli (src/admin/dossiers.js), pour s'ouvrir
 * tel quel dans le back-office. Son identifiant est la « référence » générée sur la page
 * (champ caché), ce qui permet au lien de l'e-mail de notification d'ouvrir directement le dossier.
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '../../src/config/supabase.ts';

// Valeurs par défaut identiques à celles de l'appli (DEFAULTS).
const VOL = [14, 25, 32, 50], SURF = [35, 70, 90, 110], EVAC = { L: 70, T: 50, S: 75, P: 100 };
const TAILLES = { '1-2 pièces': 0, '3 pièces': 1, '4 pièces': 2, '5 pièces et plus': 3 };
const nettoyer = (v, max = 2000) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

function situationDepuis(texte) {
  const t = String(texte || '').toLowerCase();
  if (t === 'succession') return { situation: 'deces', formule: 'S' };
  if (t.includes('départ en résidence')) return { situation: 'residence', formule: 'T' };
  if (t.includes('quitté')) return { situation: 'deces', formule: 'S' };
  if (t.includes('déménagement')) return { situation: 'residence', formule: 'T' };
  if (t.includes('libérer')) return { situation: 'vente', formule: 'L' };
  return { situation: 'vente', formule: 'L' };
}

function dossierVide(id, maintenant) {
  return {
    id, created: maintenant, statut: 'Appel',
    contact: { nom: '', tel: '', email: '', lien: '' }, beneficiaire: '', situation: 'vente', client: 'particulier',
    ville: 'Marseille', km: 14, typeLog: 'appartement', taille: 1, surface: 70, etage: 0, ascenseur: true, urgence: false, notes: '',
    formule: 'L', formuleAuto: true,
    diag: { volMode: 'base', volume: 25, evac: 70, cave: 0, jardin: 0, baies: 0, objetsLourds: 0, etagesMaison: 1, salete: 'normal', stationnement: false, dechetsSpeciaux: false, monteMeubles: false, notes: '' },
    options: { residence: false, installation: -1, gardiennage: 0, videMaison: 0, horsDepJours: 0 },
    pro: { debarras: false, type: 'finbail', opts: {} },
    photos: [],
    suivi: { hDeb: 0, hNet: 0, hAutres: 0, hInterim: 0, hAdmin: 0, m3: 0, joursCamion: 0, frais: 0, acompte: false, solde: false, liste: false, decharge: false, objets: '', mandat: 'non', mandatType: 'vente', honoraires: 0, vendu: false, fini: false, notes: '' },
    source: 'site',
  };
}

// « Marseille 5 », « Marseille 5e », « 13005 » → « Marseille 5e » (noms de communes de l'appli).
export function villeAppli(commune) {
  const m = commune.match(/^marseille\s*(\d{1,2})/i) || commune.match(/^130(0[1-9]|1[0-6])\b/);
  if (m) { const n = Number(m[1]); return `Marseille ${n}${n === 1 ? 'er' : 'e'}`; }
  if (/^marseille\b/i.test(commune)) return 'Marseille';
  return commune;
}

export function dossierDepuisDemande(form, data, id, maintenant) {
  const d = dossierVide(id, maintenant);
  const date = new Date(maintenant).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' });
  d.contact.nom = nettoyer(data.nom, 120);
  d.contact.tel = nettoyer(data.telephone, 40);
  d.contact.email = nettoyer(data.email, 160).toLowerCase();
  if (form === 'devis-pro') {
    Object.assign(d, { situation: 'vide', formule: 'P', client: 'agence', formuleAuto: false });
    d.contact.lien = nettoyer(data.societe, 120) || 'Professionnel';
    d.diag.volume = 0; d.diag.evac = 100;
    d.pro.debarras = /débarras/i.test(data.besoin || '');
    d.notes = [`Demande « Devis pro » reçue sur le site le ${date}.`,
      data.societe && `Société : ${nettoyer(data.societe, 120)}`,
      data.besoin && `Besoin : ${nettoyer(data.besoin, 120)}`,
      data.bien && `Commune et surface : ${nettoyer(data.bien, 200)}`,
      data.message && `Date souhaitée et précisions : ${nettoyer(data.message)}`].filter(Boolean).join('\n');
    return d;
  }
  if (form === 'partenaire') {
    const PART = { notaires: 'étude notariale', agences: 'agence immobilière', residences: 'résidence / EHPAD' };
    const type = PART[nettoyer(data.source, 20)] || 'partenaire';
    const { situation, formule } = situationDepuis(data.situation);
    Object.assign(d, { situation, formule });
    d.diag.evac = EVAC[formule];
    d.contact.nom = nettoyer(data.famille_nom, 120);
    d.contact.tel = nettoyer(data.famille_telephone, 40);
    d.contact.email = '';
    d.contact.lien = `Confié par ${nettoyer(data.structure, 120) || type}`;
    const commune = nettoyer(data.commune, 80);
    if (commune) d.ville = villeAppli(commune);
    d.partenaire = { type: nettoyer(data.source, 20), structure: nettoyer(data.structure, 120), nom: nettoyer(data.nom, 120), tel: nettoyer(data.telephone, 40), email: nettoyer(data.email, 160).toLowerCase() };
    d.notes = [`Dossier confié par un partenaire (${type}) sur le site le ${date}.`,
      `Partenaire : ${d.partenaire.structure} · ${d.partenaire.nom} · ${d.partenaire.tel} · ${d.partenaire.email}`,
      data.situation && `Situation : ${nettoyer(data.situation, 80)}`,
      commune && `Commune : ${commune}`,
      data.echeance && `Échéance : ${nettoyer(data.echeance, 200)}`,
      data.message && `Message : ${nettoyer(data.message)}`,
      `Accord de la personne pour être contactée : ${data.accord === 'Oui' ? 'confirmé par le partenaire' : 'non confirmé'}`].filter(Boolean).join('\n');
    return d;
  }
  const { situation, formule } = situationDepuis(data.situation);
  Object.assign(d, { situation, formule });
  d.diag.evac = EVAC[formule];
  d.contact.lien = data.pour === 'Un proche' ? 'Un proche' : 'Lui-même';
  const taille = TAILLES[nettoyer(data.taille, 40)];
  if (taille !== undefined) { d.taille = taille; d.diag.volume = VOL[taille]; d.surface = SURF[taille]; }
  const commune = nettoyer(data.commune, 80);
  if (commune) d.ville = villeAppli(commune);
  d.notes = [`Demande « Être rappelé » reçue sur le site le ${date}.`,
    data.situation && `Situation : ${nettoyer(data.situation, 120)}`,
    data.pour && `Pour : ${nettoyer(data.pour, 40)}`,
    commune && `Commune : ${commune}`,
    data.taille && `Taille : ${nettoyer(data.taille, 40)}`,
    data.distance && 'Habite loin : oui',
    data.rappel && `Moment du rappel : ${nettoyer(data.rappel, 60)}`,
    data.estimation && `Simulateur : ${nettoyer(data.estimation, 300)}`,
    data.besoins && `Besoins cochés : ${nettoyer(data.besoins, 500)}`,
    data.message && `Message : ${nettoyer(data.message)}`].filter(Boolean).join('\n');
  return d;
}

export const handler = async (event) => {
  let corps;
  try { corps = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: 'invalide' }; }
  const p = corps.payload || {};
  const form = p.form_name || p.data?.['form-name'];
  if (!['rappel', 'devis-pro', 'partenaire'].includes(form)) return { statusCode: 200, body: 'ignoré' };
  // Garde-fou : un événement Netlify comporte toujours l'identifiant de la demande.
  if (!p.id) return { statusCode: 400, body: 'refusé' };
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cle) return { statusCode: 500, body: 'clé absente' };
  const data = p.data || {};
  const maintenant = p.created_at || new Date().toISOString();
  const ref = String(data.reference || '');
  let id = /^d[a-z0-9]{6,24}$/.test(ref) ? ref : 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const sb = createClient(SUPABASE_URL, cle, { auth: { persistSession: false, autoRefreshToken: false } });

  // Une même demande Netlify ne crée qu'un dossier (en cas de nouvel envoi de l'événement).
  const { data: deja } = await sb.from('dossiers').select('id').eq('data->>demandeNetlify', String(p.id)).maybeSingle();
  if (deja) return { statusCode: 200, body: 'déjà créé' };

  for (let essai = 0; essai < 2; essai++) {
    const d = dossierDepuisDemande(form, data, id, maintenant);
    d.demandeNetlify = String(p.id);
    const { error } = await sb.from('dossiers').insert({ id, created_at: maintenant, statut: 'Appel', formule: d.formule, data: d });
    if (!error) return { statusCode: 200, body: 'dossier créé' };
    if (error.code !== '23505') return { statusCode: 500, body: error.message };
    id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);   // référence déjà prise
  }
  return { statusCode: 500, body: 'identifiant indisponible' };
};
