/**
 * Bons d'intervention numériques (Fil Bleu Pro et Maison Fil Bleu).
 * Remplit, sur la tablette et pendant le chantier, le bon papier « Bon-intervention-Fil-Bleu-Pro.pdf » :
 * rubriques et libellés repris du modèle, options aux libellés de la fiche tarifs Pro.
 *
 * - Un bon par intervention, rattaché à un dossier (client, adresse, devis et prestations prévues préremplis).
 * - Numérotation continue BI-<année>-<n°>. Un bon n'est jamais supprimé : il peut être annulé.
 * - Hors connexion : bons gardés sur l'appareil (localStorage), photos et PDF dans IndexedDB,
 *   tout part au retour du réseau. Chaque bon affiche « Synchronisé » ou « Non synchronisé ».
 * - Signatures au doigt : Fil Bleu, puis le client (sur la tablette, ou plus tard depuis son espace client).
 *   Après la signature de Fil Bleu, le contenu est figé ; après celle du client, le bon est verrouillé
 *   (la base le refuse aussi, voir supabase/migrations/20261125120000_bons_intervention.sql).
 *   Une correction se fait par un bon rectificatif.
 * - Après signature : PDF au format du modèle (photos en annexe), classé dans le dossier et l'espace client ;
 *   lignes de déchets reprises dans le registre des déchets ; quantités réelles proposées pour la facture.
 */
export function creerBons(ctx) {
const { sb, $, esc, eur, num, showToast, makePdf, wrap, tw, dataUrlBytes, imgSize } = ctx;

/* ---------- Libellés (modèle papier et fiche tarifs Pro) ---------- */
const ETAPES = ['Client', 'Logement', 'Prestations réalisées', 'Déchets et filières', 'Déroulement', 'Photos avant / après', 'Observations et réserves', "Fin d'intervention"];
const OPTS = [
  ['vitres', 'Baie vitrée ou grande fenêtre en plus', 'u', 'qte'],
  ['pack', 'Pack cuisine (four, réfrigérateur, hotte)', '', 'case'],
  ['placards', 'Intérieur des placards, par pièce', 'pièces', 'qte'],
  ['murs', 'Lessivage des murs', 'm²', 'qte'],
  ['moquette', 'Shampoing moquette', 'm²', 'qte'],
  ['balcon', 'Balcon ou terrasse', '', 'case'],
  ['cave', 'Cave ou garage (nettoyage)', '', 'case'],
];
const NETTOYAGE = [['complet', 'Nettoyage complet du logement'], ['travaux', 'Après travaux (+ 30 %)'], ['urgence', 'Urgence sous 72 h (+ 25 %)']];
const LOGEMENT_CASES = [['ascenseur', 'Ascenseur'], ['vide', 'Logement vide'], ['elec', 'Électricité en service'], ['eau', 'Eau en service'], ['stationnement', 'Stationnement possible']];
const DESTINATIONS = { decheterie: 'Déchèterie', ecomaison: 'Ecomaison', association: 'Association', ressourcerie: 'Ressourcerie', ferrailleur: 'Ferrailleur' };
const NATURES = { tout_venant: 'Tout-venant', mobilier: 'Mobilier', bois: 'Bois', metaux: 'Métaux', electromenager: 'Électroménager', gravats: 'Gravats', cartons: 'Cartons et papiers', textiles: 'Textiles', verts: 'Déchets verts' };
const TRAITEMENTS = { reemploi: 'Réemploi', recyclage: 'Recyclage', energie: 'Valorisation énergétique', enfouissement: 'Enfouissement' };
const MARQUES = { pro: 'Fil Bleu Pro', famille: 'Maison Fil Bleu' };

/* ---------- Stockage sur l'appareil ---------- */
const K_BONS = 'fb-cache-bons', K_FILE = 'fb-file-bons';
const lire = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? def; } catch (e) { return def; } };
const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { showToast("Mémoire de l'appareil pleine : synchronisez dès que possible."); } };
let bons = lire(K_BONS, {});
const file = () => lire(K_FILE, {});
const timers = {};
let fichiersAttente = {};   // id du bon -> nombre de photos pas encore envoyées
let pdfAttente = new Set(); // bons signés dont le PDF n'est pas encore classé
const urls = {};            // chemin -> URL affichable
const pads = {};            // zones de signature de l'écran courant

function idb() { return new Promise((res, rej) => { const r = indexedDB.open('fb-bons', 1); r.onupgradeneeded = () => { r.result.createObjectStore('fichiers', { keyPath: 'chemin' }); r.result.createObjectStore('pdf', { keyPath: 'bon' }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbOp(store, mode, fn) { const db = await idb(); return new Promise((res) => { const t = db.transaction(store, mode); const q = fn(t.objectStore(store)); t.oncomplete = () => res(q?.result); t.onerror = () => res(undefined); }); }
const idbTout = (s) => idbOp(s, 'readonly', (o) => o.getAll()).then((r) => r || []).catch(() => []);
const idbGet = (s, k) => idbOp(s, 'readonly', (o) => o.get(k)).catch(() => undefined);
const idbPut = (s, v) => idbOp(s, 'readwrite', (o) => o.put(v)).catch(() => undefined);
const idbDel = (s, k) => idbOp(s, 'readwrite', (o) => o.delete(k)).catch(() => undefined);

async function compterAttente() {
  const f = await idbTout('fichiers'); fichiersAttente = {};
  f.forEach((x) => { if (!x.envoye) fichiersAttente[x.bon] = (fichiersAttente[x.bon] || 0) + 1; if (!urls[x.chemin]) urls[x.chemin] = URL.createObjectURL(x.blob); });
  pdfAttente = new Set(Object.values(bons).filter((b) => signeComplet(b) && !b.pdf?.chemin).map((b) => b.id));
}
const nonSynchro = (b) => !!file()[b.id] || !!timers[b.id] || !!fichiersAttente[b.id] || pdfAttente.has(b.id);
function nbEnAttente() { return Object.values(bons).filter(nonSynchro).length; }

/* ---------- Règles ---------- */
const signePorteur = (b) => !!b.signatures?.porteur?.date;
const signeComplet = (b) => !!b.signatures?.client?.date;
const fige = (b) => signePorteur(b) || b.annule;
const statut = (b) => b.annule ? ['Annulé', 'var(--muted)'] : signeComplet(b) ? ['Signé', 'var(--good)'] : signePorteur(b) ? ['En attente du client', 'var(--warn)'] : ['Brouillon', 'var(--blue)'];
const remplace = (b) => Object.values(bons).some((x) => x.rectifie === b.id && signePorteur(x) && !x.annule);
const dateFr = (x) => x ? new Date(x.length === 10 ? x + 'T12:00:00' : x).toLocaleDateString('fr-FR') : '';
const heureFr = (x) => x ? new Date(x).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const n1 = (v) => Math.round((Number(v) || 0) * 10) / 10;
const getP = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const setP = (o, p, v) => { const ks = p.split('.'); let a = o; ks.slice(0, -1).forEach((k) => { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; a = a[k]; }); a[ks.at(-1)] = v; };

function prochainNumero(annee) {
  const max = Object.values(bons).map((b) => b.numero).filter((n) => n?.startsWith(`BI-${annee}-`)).reduce((m, n) => Math.max(m, parseInt(n.slice(8), 10) || 0), 0);
  return `BI-${annee}-${String(max + 1).padStart(4, '0')}`;
}

/** Prestations prévues au devis, lues dans le dossier. */
function prevuDepuis(d) {
  const pro = d.formule === 'P', g = d.diag || {}, p = d.pro || { opts: {} }, o = p.opts || {};
  const sansDeb = pro && !p.debarras;
  return {
    volume: sansDeb ? 0 : n1((g.volume || 0) * (g.evac ?? 100) / 100 + (g.jardin || 0)),
    cave: sansDeb ? 0 : n1(g.cave || 0),
    complet: true, travaux: pro && p.type === 'travaux', urgence: !!d.urgence,
    opts: pro ? { vitres: o.vitres || 0, pack: (o.four || 0) + (o.frigo || 0) + (o.hotte || 0) > 0 ? 1 : 0, placards: o.placards || 0, murs: o.murs || 0, moquette: o.moquette || 0, balcon: o.balcon > 0 ? 1 : 0, cave: o.cave > 0 ? 1 : 0 } : {},
  };
}
function nouveauBon(d, source) {
  const auj = new Date(), pro = d.formule === 'P';
  const id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  if (source) {
    const b = structuredClone(source);
    Object.assign(b, { id, numero: prochainNumero(auj.getFullYear()), rectifie: source.id, date: auj.toISOString().slice(0, 10), created: auj.toISOString(), signatures: {}, annule: false });
    delete b.pdf;
    return b;
  }
  const prevu = prevuDepuis(d);
  return {
    id, dossier_id: d.id, numero: prochainNumero(auj.getFullYear()), marque: pro ? 'pro' : 'famille', rectifie: null,
    date: auj.toISOString().slice(0, 10), created: auj.toISOString(), devis: ctx.devisNo(d),
    client: { societe: d.client === 'agence' ? (d.contact?.lien || '') : '', contact: d.contact?.nom || '', tel: d.contact?.tel || '', email: d.contact?.email || '' },
    logement: { adresse: d.adr?.label || d.contact?.adresse || d.ville || '', etage: d.etage || 0, surface: d.surface || '', clesPar: '', acces: '', ascenseur: !!d.ascenseur, vide: false, elec: false, eau: false, stationnement: !!d.diag?.stationnement },
    prevu, realise: structuredClone(prevu),
    famille: { objets: '', papiers: '' },
    dechets: [], deroulement: { arrivee: '', depart: '', intervenants: 2 },
    photos: [], observations: '', fin: { conformite: '', clesA: '' }, signatures: {},
  };
}

/** Écarts entre le devis et le réalisé (servent à la facture). */
function ecarts(b) {
  const out = [], P = b.prevu || {}, R = b.realise || {};
  const nb = (l, a, r, u) => { a = n1(a); r = n1(r); if (a !== r) out.push({ l, txt: `${num(a)}${u ? ' ' + u : ''} au devis, ${num(r)}${u ? ' ' + u : ''} réalisé${r > a ? 's' : ''}`, d: `${r > a ? '+' : '−'}${num(Math.abs(r - a))}${u ? ' ' + u : ''}` }); };
  const cs = (l, a, r) => { if (!!a !== !!r) out.push({ l, txt: r ? 'non prévu au devis, réalisé' : 'prévu au devis, non réalisé', d: r ? 'ajouté' : 'retiré' }); };
  nb('Volume évacué', P.volume, R.volume, 'm³'); nb('Cave ou garage', P.cave, R.cave, 'm³');
  NETTOYAGE.forEach(([k, l]) => cs(l, P[k], R[k]));
  if (b.marque === 'pro') OPTS.forEach(([k, l, u, t]) => t === 'case' ? cs(l, P.opts?.[k], R.opts?.[k]) : nb(l, P.opts?.[k] || 0, R.opts?.[k] || 0, u));
  return out;
}

/* ---------- Enregistrement et synchronisation ---------- */
const ligne = (b) => ({ id: b.id, dossier_id: b.dossier_id, numero: b.numero, marque: b.marque, rectifie: b.rectifie || null, data: b });
function enregistrer(b, tout) {
  bons[b.id] = b; ecrire(K_BONS, bons);
  const f = file(); f[b.id] = true; ecrire(K_FILE, f);
  clearTimeout(timers[b.id]);
  timers[b.id] = setTimeout(async () => { delete timers[b.id]; await synchroniser(); majBadge(b); }, tout ? 0 : 600);
  majBadge(b); ctx.majBandeau();
}
async function envoyerFichiers(bonId) {
  for (const x of (await idbTout('fichiers')).filter((x) => !x.envoye && (!bonId || x.bon === bonId))) {
    const { error } = await sb.storage.from('photos').upload(x.chemin, x.blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    x.envoye = true; await idbPut('fichiers', x);
  }
}
let enCours = null;
function synchroniser() { if (!enCours) enCours = synchro().finally(() => { enCours = null; }); return enCours; }
async function synchro() {
  if (!navigator.onLine) { await compterAttente(); ctx.majBandeau(); return; }
  try {
    const f = file();
    for (const id of Object.keys(f)) {
      const b = bons[id]; if (!b) { delete f[id]; continue; }
      if (timers[id]) continue;
      await envoyerFichiers(id);
      const { error } = await sb.from('bons').upsert(ligne(b));
      if (error && /verrouill|seul le client/i.test(error.message)) {
        // Le bon a été signé ailleurs (par exemple par le client, depuis son espace) : on reprend la version de la base.
        const { data } = await sb.from('bons').select('data').eq('id', id).maybeSingle();
        if (data?.data) bons[id] = data.data;
      } else if (error) throw error;
      delete f[id]; ecrire(K_FILE, f);
    }
    ecrire(K_BONS, bons);
    await envoyerFichiers();
    await inviterEnAttente();
    for (const b of Object.values(bons)) if (signeComplet(b) && !b.pdf?.chemin && !file()[b.id]) await classerPdf(b);
  } catch (e) { /* on réessaiera au retour du réseau */ }
  await compterAttente(); ctx.majBandeau();
}
async function charger() {
  if (!navigator.onLine) return;
  const { data, error } = await sb.from('bons').select('id, data');
  if (error) throw error;
  const f = file();
  (data || []).forEach((r) => { if (!f[r.id] && !timers[r.id]) bons[r.id] = r.data; });
  ecrire(K_BONS, bons);
  await synchroniser();
}
/** Lien de signature pour un client absent : accès à son espace client, puis e-mail de connexion. */
async function inviterEnAttente() {
  for (const b of Object.values(bons)) {
    const dist = b.signatures?.distance;
    if (!dist?.email || dist.inviteLe || signeComplet(b) || file()[b.id]) continue;
    const d = ctx.dossiers()[b.dossier_id];
    await sb.from('espace_client').upsert({ dossier_id: b.dossier_id, formule: d?.formule || (b.marque === 'pro' ? 'P' : 'L'), ville: d?.ville || '' }, { onConflict: 'dossier_id', ignoreDuplicates: true });
    await sb.from('dossier_acces').upsert({ dossier_id: b.dossier_id, email: dist.email, role: 'titulaire' }, { onConflict: 'dossier_id,email', ignoreDuplicates: true });
    const { data: { session } } = await sb.auth.getSession();
    const rep = await fetch('/api/inviter', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ dossier_id: b.dossier_id, email: dist.email }) }).catch(() => null);
    if (rep?.ok) { dist.inviteLe = new Date().toISOString(); bons[b.id] = b; ecrire(K_BONS, bons); await sb.from('bons').upsert(ligne(b)); showToast(`Lien de signature envoyé à ${dist.email}.`); }
    else { const c = await rep?.json().catch(() => ({})); dist.erreur = c?.erreur || "L'e-mail n'a pas pu partir."; ecrire(K_BONS, bons); }
    if (document.querySelector(`[data-badge="${CSS.escape(b.id)}"]`)) { const y = window.scrollY; ecran(b.id); window.scrollTo(0, y); }
  }
}
/** PDF signé : rangé dans le dossier (stockage privé) et publié dans l'espace client. */
async function classerPdf(b) {
  let blob = (await idbGet('pdf', b.id))?.blob;
  if (!blob) blob = await pdfBon(b);
  const chemin = `${b.dossier_id}/bon-${b.numero}.pdf`;
  const { error } = await sb.storage.from('documents').upload(chemin, blob, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;
  const { error: e2 } = await sb.from('documents').upsert({ dossier_id: b.dossier_id, chemin, type: 'bon_intervention', nom: `Bon d'intervention ${b.numero}${b.rectifie ? ' (rectificatif)' : ''}`, date: b.signatures.client.date }, { onConflict: 'dossier_id,chemin' });
  if (e2) throw e2;
  const pdf = { chemin, date: new Date().toISOString() };
  const { error: e3 } = await sb.rpc('noter_pdf_bon', { p_id: b.id, p_pdf: pdf });
  if (e3) throw e3;
  b.pdf = pdf; bons[b.id] = b; ecrire(K_BONS, bons);
  await idbDel('pdf', b.id);
  // Les photos sont dans le stockage et dans le PDF : on libère la place sur la tablette.
  for (const x of (await idbTout('fichiers')).filter((x) => x.bon === b.id && x.envoye)) await idbDel('fichiers', x.chemin);
}

/* ---------- Photos ---------- */
async function compresser(file, max = 1600, q = 0.8) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise((res) => cv.toBlob((x) => res(x || file), 'image/jpeg', q));
  } catch (e) { return file; }
}
async function ajouterPhotos(b, fichiers, cat, ligneId) {
  for (const f of fichiers) {
    const blob = await compresser(f);
    const chemin = `${b.dossier_id}/bi-${b.id}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}.jpg`;
    await idbPut('fichiers', { chemin, bon: b.id, blob, envoye: false });
    urls[chemin] = URL.createObjectURL(blob);
    if (cat === 'depot') { const l = b.dechets.find((x) => x.id === ligneId); if (l) l.photo = chemin; }
    else b.photos.push({ chemin, cat, date: new Date().toISOString() });
  }
  await compterAttente(); enregistrer(b);
}
async function blobPhoto(chemin) {
  const x = await idbGet('fichiers', chemin); if (x?.blob) return x.blob;
  if (!navigator.onLine) return null;
  const { data } = await sb.storage.from('photos').download(chemin); return data || null;
}
async function remplirVignettes(racine) {
  const imgs = [...racine.querySelectorAll('img[data-bphoto]')];
  const manque = [...new Set(imgs.map((i) => i.dataset.bphoto).filter((c) => !urls[c]))];
  if (manque.length && navigator.onLine) {
    const { data } = await sb.storage.from('photos').createSignedUrls(manque, 3600);
    (data || []).forEach((x) => { if (x.signedUrl) urls[x.path] = x.signedUrl; });
  }
  imgs.forEach((i) => { if (urls[i.dataset.bphoto]) i.src = urls[i.dataset.bphoto]; });
}

/* ---------- Onglet « 6 · Intervention » du dossier ---------- */
function onglet(d, box) {
  const liste = Object.values(bons).filter((b) => b.dossier_id === d.id).sort((a, b) => a.numero.localeCompare(b.numero));
  const dernier = [...liste].reverse().find((b) => signePorteur(b) && !b.annule && !remplace(b));
  box.innerHTML = `
  <div class="card"><h3>Bons d'intervention</h3>
    <p class="small muted" style="margin:0">Un bon par intervention, rempli sur la tablette pendant le chantier et signé sur place. Il fonctionne sans réseau.</p>
    ${liste.length ? `<div class="list">${liste.map((b) => { const [s, c] = statut(b); return `<button class="item" data-ouvrir-bon="${esc(b.id)}"><div><div class="t">${esc(b.numero)}${b.rectifie ? ' · rectificatif' : ''}</div><div class="s">${esc(dateFr(b.date))} · ${esc(MARQUES[b.marque])} · ${nonSynchro(b) ? 'Non synchronisé' : 'Synchronisé'}</div></div><span class="pill" style="color:${c}">${esc(s)}</span></button>`; }).join('')}</div>` : ''}
    <button class="btn" id="bi-nouveau">Nouveau bon d'intervention</button>
  </div>
  ${dernier ? carteFacture(d, dernier) : ''}`;
  box.querySelectorAll('[data-ouvrir-bon]').forEach((x) => x.onclick = () => ouvrir(x.dataset.ouvrirBon));
  $('#bi-nouveau', box).onclick = () => { const b = nouveauBon(d); enregistrer(b); ouvrir(b.id); };
  const v = $('#bi-facture', box); if (v) v.onclick = () => validerFacture(d, dernier);
}
function ouvrir(id) { ctx.setView({ name: 'bon', id }); window.scrollTo(0, 0); }

/* ---------- Facture préparée à partir du réalisé ---------- */
function dossierReel(d, b) {
  const x = structuredClone(d), R = b.realise;
  x.diag = { ...x.diag, volMode: 'manuel', volume: n1(R.volume), evac: 100, cave: n1(R.cave), jardin: 0 };
  x.urgence = !!R.urgence;
  if (d.formule === 'P') {
    const o = { ...(d.pro?.opts || {}) };
    o.vitres = R.opts.vitres || 0; o.placards = R.opts.placards || 0; o.murs = R.opts.murs || 0; o.moquette = R.opts.moquette || 0;
    o.balcon = R.opts.balcon ? Math.max(1, o.balcon || 0) : 0; o.cave = R.opts.cave ? Math.max(1, o.cave || 0) : 0;
    ['four', 'frigo', 'hotte'].forEach((k) => { o[k] = R.opts.pack ? Math.max(1, o[k] || 0) : 0; });
    x.pro = { ...(d.pro || {}), opts: o, debarras: n1(R.volume) + n1(R.cave) > 0, type: R.travaux ? 'travaux' : (d.pro?.type === 'travaux' ? 'finbail' : d.pro?.type || 'finbail') };
  }
  return x;
}
function carteFacture(d, b) {
  const dv = ctx.calc(d), re = ctx.calc(dossierReel(d, b)), unite = d.formule === 'P' && d.client === 'agence' ? 'HT' : 'TTC';
  const tot = (c) => unite === 'HT' ? c.ht : c.ttc, e = ecarts(b), f = d.facture?.bon === b.numero ? d.facture : null;
  return `<div class="card"><h3>Préparer la facture</h3>
    <p class="small muted" style="margin:0">Quantités réelles du bon ${esc(b.numero)}, appliquées aux prix du devis. Rien n'est facturé automatiquement : vous validez.</p>
    ${e.length ? `<div class="suggest warn"><b>Écarts avec le devis</b><br>${e.map((x) => `${esc(x.l)} : ${esc(x.txt)}`).join('<br>')}</div>` : `<div class="suggest">Réalisé conforme au devis : aucune quantité ne change.</div>`}
    <table><thead><tr><th style="text-align:left">Réalisé</th><th style="text-align:right">${unite}</th></tr></thead><tbody>
      ${re.lignes.map(([l, v]) => `<tr><td>${esc(l)}</td><td style="text-align:right">${eur(v)}</td></tr>`).join('')}
      <tr><td><b>Total réalisé</b></td><td style="text-align:right"><b>${eur(tot(re))}</b></td></tr>
      <tr><td class="muted">Total du devis</td><td style="text-align:right" class="muted">${eur(tot(dv))}</td></tr>
    </tbody></table>
    ${f ? `<div class="suggest good">Validé pour la facture le ${esc(heureFr(f.valideLe))} : ${eur(f.total)} ${unite}.</div>` : ''}
    <button class="btn ${f ? 'ghost' : ''}" id="bi-facture">${f ? 'Valider à nouveau ces montants' : 'Valider ces quantités pour la facture'}</button>
  </div>`;
}
function validerFacture(d, b) {
  const re = ctx.calc(dossierReel(d, b)), unite = d.formule === 'P' && d.client === 'agence' ? 'HT' : 'TTC';
  d.facture = { bon: b.numero, lignes: re.lignes, ht: re.ht, ttc: re.ttc, total: unite === 'HT' ? re.ht : re.ttc, unite, valideLe: new Date().toISOString() };
  if (d.suivi) d.suivi.m3 = n1(b.realise.volume) + n1(b.realise.cave);
  ctx.persist(d); ctx.rerender(); showToast('Montants validés : ils serviront à établir la facture.');
}

/* ---------- Écran du bon (tablette) ---------- */
let etapeCourante = {};
function majBadge(b) {
  const el = document.querySelector(`[data-badge="${CSS.escape(b.id)}"]`); if (!el) return;
  const ns = nonSynchro(b);
  el.textContent = navigator.onLine ? (ns ? 'Non synchronisé' : 'Synchronisé') : 'Hors ligne · non synchronisé';
  el.className = 'bi-badge ' + (ns || !navigator.onLine ? 'warn' : 'good');
}
const champ = (b, p, l, o = {}) => `<label>${esc(l)}<input data-b="${p}" type="${o.type || 'text'}" ${o.mode ? `inputmode="${o.mode}"` : ''} ${o.auto ? `autocomplete="${o.auto}"` : ''} value="${esc(getP(b, p) ?? '')}" ${fige(b) ? 'disabled' : ''}></label>`;
const caseB = (b, p, l, extra = '') => `<label class="bi-case"><input type="checkbox" data-b="${p}" ${getP(b, p) ? 'checked' : ''} ${fige(b) ? 'disabled' : ''}><span>${esc(l)}${extra}</span></label>`;
const segB = (b, p, opts) => `<div class="seg" data-bseg="${p}">${Object.entries(opts).map(([v, l]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${getP(b, p) === v}" ${fige(b) ? 'disabled' : ''}>${esc(l)}</button>`).join('')}</div>`;
const qteB = (b, p, l, u, pas = 1) => `<div class="step"><span>${esc(l)}${u ? ` <span class="small muted">(${esc(u)})</span>` : ''}</span><div class="ctl">${fige(b) ? '' : `<button type="button" data-bstep="${p}" data-d="-${pas}" aria-label="Moins">−</button>`}<input class="bi-qte" data-b="${p}" type="number" inputmode="decimal" min="0" step="${pas}" value="${esc(getP(b, p) ?? 0)}" ${fige(b) ? 'disabled' : ''} aria-label="${esc(l)}">${fige(b) ? '' : `<button type="button" data-bstep="${p}" data-d="${pas}" aria-label="Plus">+</button>`}</div></div>`;
function ecartTxt(a, r, u) { a = n1(a); r = n1(r); return a === r ? '' : ` <span class="pill" style="color:var(--warn)">Écart ${r > a ? '+' : '−'}${num(Math.abs(r - a))}${u ? ' ' + esc(u) : ''}</span>`; }
const devisTxt = (v, u) => `<span class="small muted">Devis : ${esc(v)}${u ? ' ' + esc(u) : ''}</span>`;
function vignettes(b, cat) {
  const ph = b.photos.filter((p) => p.cat === cat);
  return `<div class="bi-photos">${ph.map((p) => `<figure><img data-bphoto="${esc(p.chemin)}" alt="Photo ${cat}">${fige(b) ? '' : `<button type="button" data-retirer-photo="${esc(p.chemin)}" aria-label="Retirer la photo">×</button>`}</figure>`).join('')}</div>
    ${fige(b) ? '' : `<label class="btn ghost bi-prendre">Prendre une photo<input type="file" accept="image/*" capture="environment" multiple data-photo-cat="${cat}" hidden></label>`}
    <span class="small muted">${ph.length} photo${ph.length > 1 ? 's' : ''}</span>`;
}

function corps(b, i) {
  const pro = b.marque === 'pro', P = b.prevu, R = b.realise;
  switch (i) {
    case 0: return `<div class="card"><h3>1 · Client</h3>
      ${pro ? champ(b, 'client.societe', 'Société (agence, syndic, bailleur, étude)', { auto: 'organization' }) : ''}
      <div class="grid2">${champ(b, 'client.contact', pro ? 'Contact' : 'Nom', { auto: 'name' })}${champ(b, 'client.tel', 'Téléphone', { type: 'tel', auto: 'tel' })}</div>
      ${champ(b, 'client.email', 'E-mail', { type: 'email', mode: 'email', auto: 'email' })}
      <p class="small muted" style="margin:0">Devis ou bon de commande n° ${esc(b.devis || '')}</p></div>`;
    case 1: return `<div class="card"><h3>2 · Logement</h3>
      ${champ(b, 'logement.adresse', 'Adresse', { auto: 'street-address' })}
      <div class="grid2">${champ(b, 'logement.etage', 'Étage', { type: 'number', mode: 'numeric' })}${champ(b, 'logement.surface', 'Surface (m²)', { type: 'number', mode: 'decimal' })}</div>
      <div class="grid2">${champ(b, 'logement.clesPar', 'Clés remises par')}${champ(b, 'logement.acces', 'Code / accès')}</div>
      <div class="bi-cases">${LOGEMENT_CASES.map(([k, l]) => caseB(b, 'logement.' + k, l)).join('')}</div></div>`;
    case 2: return `<div class="card"><h3>3 · Prestations réalisées</h3>
      <h4>Débarras</h4>
      <div class="step"><span>Volume prévu au devis</span><b>${num(P.volume)} m³</b></div>
      ${qteB(b, 'realise.volume', 'Volume réellement évacué', 'm³', 0.5)}<div class="bi-ecart">${ecartTxt(P.volume, R.volume, 'm³')}</div>
      ${qteB(b, 'realise.cave', 'Cave ou garage', 'm³', 0.5)}<div class="bi-ecart">${devisTxt(num(P.cave), 'm³')}${ecartTxt(P.cave, R.cave, 'm³')}</div>
      <h4>Nettoyage</h4>
      <div class="bi-cases">${NETTOYAGE.map(([k, l]) => caseB(b, 'realise.' + k, l, !!P[k] !== !!R[k] ? ` <span class="pill" style="color:var(--warn)">${R[k] ? 'non prévu au devis' : 'prévu au devis'}</span>` : '')).join('')}</div>
      ${pro ? `<h4>Options</h4>${OPTS.map(([k, l, u, t]) => t === 'case'
        ? caseB(b, 'realise.opts.' + k, l, !!P.opts[k] !== !!R.opts[k] ? ` <span class="pill" style="color:var(--warn)">${R.opts[k] ? 'non prévu au devis' : 'prévu au devis'}</span>` : '')
        : `${qteB(b, 'realise.opts.' + k, l, u)}<div class="bi-ecart">${devisTxt(num(P.opts[k] || 0), u)}${ecartTxt(P.opts[k] || 0, R.opts[k] || 0, u)}</div>`).join('')}` : `
      <h4>Pour la famille</h4>
      <label>Objets mis de côté pour la famille<textarea data-b="famille.objets" ${fige(b) ? 'disabled' : ''}>${esc(b.famille?.objets || '')}</textarea></label>
      <label>Papiers remis<textarea data-b="famille.papiers" ${fige(b) ? 'disabled' : ''}>${esc(b.famille?.papiers || '')}</textarea></label>`}
      ${ecarts(b).length ? `<div class="suggest warn"><b>Écarts avec le devis (serviront à la facture)</b><br>${ecarts(b).map((x) => `${esc(x.l)} : ${esc(x.txt)}`).join('<br>')}</div>` : ''}</div>`;
    case 3: {
      const tot = b.dechets.reduce((a, l) => a + (Number(l.volume) || 0), 0);
      return `<div class="card"><h3>4 · Déchets et filières</h3>
      <p class="small muted" style="margin:0">Une ligne par dépôt. Justificatifs de dépôt conservés et transmis sur demande. Aucun déchet dangereux pris en charge (amiante, produits chimiques, bouteilles de gaz).</p></div>
      ${b.dechets.map((l, k) => `<div class="card bi-dechet"><div class="step"><h4 style="margin:0">Dépôt ${k + 1}</h4>${fige(b) ? '' : `<button type="button" class="btn danger" data-retirer-ligne="${esc(l.id)}">Retirer</button>`}</div>
        <label>Destination${segB(b, `dechets.${k}.destination`, DESTINATIONS)}</label>
        <div class="grid2">${champ(b, `dechets.${k}.installation`, "Nom de l'installation")}${champ(b, `dechets.${k}.bonDepot`, 'N° du bon de dépôt')}</div>
        <label>Nature${segB(b, `dechets.${k}.nature`, NATURES)}</label>
        <div class="grid2">${champ(b, `dechets.${k}.volume`, 'Volume (m³)', { type: 'number', mode: 'decimal' })}${champ(b, `dechets.${k}.poids`, 'Poids (kg, facultatif)', { type: 'number', mode: 'decimal' })}</div>
        <label>Traitement${segB(b, `dechets.${k}.traitement`, TRAITEMENTS)}</label>
        ${champ(b, `dechets.${k}.cout`, 'Coût HT (€)', { type: 'number', mode: 'decimal' })}
        <div class="bi-photos">${l.photo ? `<figure><img data-bphoto="${esc(l.photo)}" alt="Bon de dépôt"></figure>` : ''}</div>
        ${fige(b) ? '' : `<label class="btn ghost bi-prendre">${l.photo ? 'Reprendre la photo du bon de dépôt' : 'Photographier le bon de dépôt'}<input type="file" accept="image/*" capture="environment" data-photo-depot="${esc(l.id)}" hidden></label>`}
      </div>`).join('')}
      ${fige(b) ? '' : `<button class="btn ghost" id="bi-ligne">Ajouter un dépôt</button>`}
      <div class="suggest">Total déposé : <b>${num(tot)} m³</b> · volume réellement évacué : <b>${num(n1(R.volume) + n1(R.cave))} m³</b></div>`;
    }
    case 4: {
      const D = b.deroulement, h = (x) => { const [a, m] = String(x || '').split(':').map(Number); return a * 60 + m; };
      const duree = D.arrivee && D.depart ? h(D.depart) - h(D.arrivee) : null;
      return `<div class="card"><h3>5 · Déroulement</h3>
      <div class="grid2"><div class="bi-heure">${champ(b, 'deroulement.arrivee', 'Arrivée', { type: 'time' })}${fige(b) ? '' : `<button type="button" class="btn ghost" data-maintenant="deroulement.arrivee">Maintenant</button>`}</div>
      <div class="bi-heure">${champ(b, 'deroulement.depart', 'Départ', { type: 'time' })}${fige(b) ? '' : `<button type="button" class="btn ghost" data-maintenant="deroulement.depart">Maintenant</button>`}</div></div>
      ${duree > 0 ? `<p class="small muted" style="margin:0">Durée sur place : ${Math.floor(duree / 60)} h ${String(duree % 60).padStart(2, '0')}</p>` : ''}
      ${qteB(b, 'deroulement.intervenants', "Nombre d'intervenants", '', 1)}</div>`;
    }
    case 5: return `<div class="card"><h3>6 · Photos avant</h3>${vignettes(b, 'avant')}</div><div class="card"><h3>Photos après</h3>${vignettes(b, 'apres')}</div>
      <p class="small muted">Les photos sont réduites automatiquement et gardées sur la tablette jusqu'à l'envoi.</p>`;
    case 6: return `<div class="card"><h3>7 · Observations et réserves</h3>
      <label>Dégâts constatés avant l'intervention, objets laissés sur place à la demande du client, réserves éventuelles.<textarea data-b="observations" style="min-height:140px" ${fige(b) ? 'disabled' : ''}>${esc(b.observations || '')}</textarea></label>
      ${vignettes(b, 'obs')}</div>`;
    case 7: return finHtml(b);
  }
  return '';
}
function finHtml(b) {
  const sp = b.signatures?.porteur, sc = b.signatures?.client, dist = b.signatures?.distance, e = ecarts(b);
  const nomDefaut = (ctx.soc().signataire || '').includes('[') ? '' : (ctx.soc().signataire || '').replace(/,.*$/, '');
  return `<div class="card"><h3>8 · Fin d'intervention</h3>
    ${segB(b, 'fin.conformite', { conforme: 'Prestation conforme au devis', reserves: 'Conforme avec réserves (voir 7)' })}
    ${champ(b, 'fin.clesA', 'Clés rendues à')}
    ${e.length ? `<div class="suggest warn"><b>Écarts avec le devis</b><br>${e.map((x) => `${esc(x.l)} : ${esc(x.txt)}`).join('<br>')}</div>` : ''}
  </div>
  <div class="card"><h3>Pour ${esc(MARQUES[b.marque])}</h3>
    ${sp ? `<img class="bi-sig" src="${esc(sp.img)}" alt="Signature ${esc(MARQUES[b.marque])}"><p class="small" style="margin:0">${esc(sp.nom)} · signé le ${esc(heureFr(sp.date))}</p>`
      : `<label>Nom<input id="bi-nom-porteur" value="${esc(nomDefaut)}" autocomplete="name"></label>
      <canvas class="pad" data-pad="porteur" aria-label="Signature de Fil Bleu"></canvas>
      <div class="row"><button class="btn ghost" data-effacer="porteur" style="flex:1">Effacer</button><button class="btn" id="bi-signer-porteur" style="flex:2">Signer pour ${esc(MARQUES[b.marque])}</button></div>
      <p class="small muted" style="margin:0">Après cette signature, le bon ne peut plus être modifié.</p>`}
  </div>
  <div class="card"><h3>Pour le client</h3>
    ${sc ? `<img class="bi-sig" src="${esc(sc.img)}" alt="Signature du client"><p class="small" style="margin:0">${esc(sc.nom)}${sc.qualite ? ', ' + esc(sc.qualite) : ''} · signé le ${esc(heureFr(sc.date))}${sc.lieu === 'espace client' ? ' depuis son espace client' : ''}</p>`
      : !sp ? `<p class="small muted" style="margin:0">Le client signe après ${esc(MARQUES[b.marque])}.</p>`
      : `<div class="grid2"><label>Nom<input id="bi-nom-client" value="${esc(b.client?.contact || '')}" autocomplete="off"></label><label>Qualité<input id="bi-qualite" placeholder="Gestionnaire, propriétaire, héritier…" value="${esc(b.client?.societe ? 'pour ' + b.client.societe : '')}"></label></div>
      <canvas class="pad" data-pad="client" aria-label="Signature du client"></canvas>
      <div class="row"><button class="btn ghost" data-effacer="client" style="flex:1">Effacer</button><button class="btn" id="bi-signer-client" style="flex:2">Valider la signature du client</button></div>
      <details ${dist ? 'open' : ''}><summary class="small" style="cursor:pointer">Le client n'est pas sur place ?</summary>
        <p class="small muted">Il relit et signe depuis son espace client. Son code de connexion lui est envoyé par e-mail (dès le retour du réseau si vous êtes hors ligne).</p>
        ${dist ? `<div class="suggest ${dist.inviteLe ? 'good' : dist.erreur ? 'bad' : ''}">${dist.inviteLe ? `Lien envoyé à ${esc(dist.email)} le ${esc(heureFr(dist.inviteLe))}. En attente de sa signature.` : dist.erreur ? `Envoi impossible pour ${esc(dist.email)} : ${esc(dist.erreur)}` : `Envoi à ${esc(dist.email)} prévu au retour du réseau.`}</div>` : ''}
        <label>E-mail du client<input id="bi-email-distance" type="email" inputmode="email" value="${esc(dist?.email || b.client?.email || '')}"></label>
        <button class="btn ghost" id="bi-distance">${dist ? 'Renvoyer le lien de signature' : 'Envoyer le lien de signature'}</button>
      </details>`}
  </div>
  ${signeComplet(b) ? `<div class="card"><h3>Bon signé et verrouillé</h3>
    <p class="small" style="margin:0">${b.pdf?.chemin ? 'PDF classé dans le dossier et dans l\'espace client.' : 'Le PDF sera classé dans le dossier et l\'espace client dès le retour du réseau.'}</p>
    <div class="row"><button class="btn" id="bi-remettre" style="flex:2">Envoyer le PDF au client</button><button class="btn ghost" id="bi-rectif" style="flex:1">Bon rectificatif</button></div></div>` : ''}`;
}

function ecran(id) {
  const app = $('#app'), b = bons[id];
  if (!b) { ctx.setView({ name: 'list' }); return; }
  document.body.classList.add('bi-large');
  const i = Math.min(etapeCourante[id] ?? 0, ETAPES.length - 1);
  const [s, c] = statut(b), d = ctx.dossiers()[b.dossier_id];
  app.innerHTML = `<div id="bi" class="bi">
    <div class="top"><button class="btn ghost" id="bi-retour">← Dossier</button><span class="bi-badge" data-badge="${esc(b.id)}"></span></div>
    <div><h1>Bon d'intervention</h1><p class="muted" style="margin:4px 0 0">${esc(MARQUES[b.marque])} · N° ${esc(b.numero)} · ${esc(dateFr(b.date))}${b.rectifie ? ` · rectifie le bon ${esc(bons[b.rectifie]?.numero || '')}` : ''} · <span style="color:${c}">${esc(s)}</span>${d ? ` · ${esc(d.contact?.nom || '')}` : ''}</p></div>
    <nav class="bi-etapes" aria-label="Étapes du bon">${ETAPES.map((l, k) => `<button type="button" data-etape="${k}" aria-current="${k === i ? 'step' : 'false'}"><b>${k + 1}</b><span>${esc(l)}</span></button>`).join('')}</nav>
    ${b.annule ? `<div class="suggest bad">Bon annulé : il reste numéroté mais n'entre ni dans le registre ni dans la facture.</div>` : ''}
    ${corps(b, i)}
    <div class="row bi-suite">${i > 0 ? `<button class="btn ghost" data-aller="${i - 1}" style="flex:1">Précédent</button>` : ''}${i < ETAPES.length - 1 ? `<button class="btn" data-aller="${i + 1}" style="flex:2">Suivant</button>` : ''}</div>
    ${!signePorteur(b) && !b.annule ? `<button class="btn danger" id="bi-annuler">Annuler ce bon</button>` : ''}
  </div>`;
  majBadge(b);
  lier(b, $('#bi', app));
  remplirVignettes(app);
}

function lier(b, r) {
  const re = () => { const y = window.scrollY; ecran(b.id); window.scrollTo(0, y); };
  $('#bi-retour', r).onclick = () => { document.body.classList.remove('bi-large'); ctx.setView({ name: 'dossier', id: b.dossier_id }, 'bons'); };
  r.querySelectorAll('[data-etape],[data-aller]').forEach((x) => x.onclick = () => { etapeCourante[b.id] = +(x.dataset.etape ?? x.dataset.aller); ecran(b.id); window.scrollTo(0, 0); });
  if (fige(b)) { lierFin(b, r, re); return; }
  r.querySelectorAll('[data-b]').forEach((el) => {
    const maj = () => {
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (el.type === 'number') v = el.value === '' ? '' : Math.max(0, Number(String(el.value).replace(',', '.')) || 0);
      setP(b, el.dataset.b, v); enregistrer(b);
    };
    el.addEventListener('input', maj);
    if (el.type === 'checkbox' || el.type === 'number') el.addEventListener('change', re);
  });
  r.querySelectorAll('[data-bseg] button').forEach((x) => x.onclick = () => { setP(b, x.closest('[data-bseg]').dataset.bseg, x.dataset.v); enregistrer(b); re(); });
  r.querySelectorAll('[data-bstep]').forEach((x) => x.onclick = () => { const p = x.dataset.bstep; setP(b, p, Math.max(0, n1((Number(getP(b, p)) || 0) + Number(x.dataset.d)))); enregistrer(b); re(); });
  r.querySelectorAll('[data-maintenant]').forEach((x) => x.onclick = () => { const t = new Date(); setP(b, x.dataset.maintenant, `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`); enregistrer(b); re(); });
  r.querySelectorAll('[data-photo-cat]').forEach((x) => x.onchange = async () => { if (x.files?.length) { await ajouterPhotos(b, [...x.files], x.dataset.photoCat); re(); } });
  r.querySelectorAll('[data-photo-depot]').forEach((x) => x.onchange = async () => { if (x.files?.length) { await ajouterPhotos(b, [x.files[0]], 'depot', x.dataset.photoDepot); re(); } });
  r.querySelectorAll('[data-retirer-photo]').forEach((x) => x.onclick = async () => { const ch = x.dataset.retirerPhoto; b.photos = b.photos.filter((p) => p.chemin !== ch); await idbDel('fichiers', ch); await compterAttente(); enregistrer(b); re(); });
  r.querySelectorAll('[data-retirer-ligne]').forEach((x) => x.onclick = () => { if (!confirm('Retirer ce dépôt ?')) return; b.dechets = b.dechets.filter((l) => l.id !== x.dataset.retirerLigne); enregistrer(b); re(); });
  const nl = $('#bi-ligne', r); if (nl) nl.onclick = () => { b.dechets.push({ id: 'l' + Date.now().toString(36), destination: 'decheterie', installation: '', bonDepot: '', nature: 'tout_venant', volume: '', poids: '', traitement: 'recyclage', cout: '', photo: null }); enregistrer(b); re(); };
  const an = $('#bi-annuler', r); if (an) an.onclick = () => { if (!confirm(`Annuler le bon ${b.numero} ? Il restera numéroté, sans effet sur le registre ni la facture.`)) return; b.annule = true; enregistrer(b, true); re(); };
  lierFin(b, r, re);
}

function initPad(cv) {
  const ctx2 = cv.getContext('2d'); const st = { drawn: false, last: null };
  const taille = () => { const r = cv.getBoundingClientRect(), k = window.devicePixelRatio || 1; cv.width = r.width * k; cv.height = r.height * k; ctx2.setTransform(k, 0, 0, k, 0, 0); ctx2.fillStyle = '#fff'; ctx2.fillRect(0, 0, r.width, r.height); ctx2.lineWidth = 2.4; ctx2.lineCap = 'round'; ctx2.lineJoin = 'round'; ctx2.strokeStyle = '#1E2430'; st.drawn = false; };
  taille();
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); st.last = pt(e); ctx2.beginPath(); ctx2.arc(st.last[0], st.last[1], 1.2, 0, 7); ctx2.fillStyle = '#1E2430'; ctx2.fill(); st.drawn = true; };
  cv.onpointermove = (e) => { if (!st.last) return; const p = pt(e); ctx2.beginPath(); ctx2.moveTo(...st.last); ctx2.lineTo(...p); ctx2.stroke(); st.last = p; };
  cv.onpointerup = cv.onpointercancel = () => { st.last = null; };
  st.effacer = taille;
  st.image = () => { const o = document.createElement('canvas'); o.width = 480; o.height = Math.round(480 * cv.height / cv.width); const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); g.drawImage(cv, 0, 0, o.width, o.height); return o.toDataURL('image/jpeg', 0.75); };
  return st;
}
function lierFin(b, r, re) {
  r.querySelectorAll('canvas[data-pad]').forEach((cv) => { pads[cv.dataset.pad] = initPad(cv); });
  r.querySelectorAll('[data-effacer]').forEach((x) => x.onclick = () => pads[x.dataset.effacer]?.effacer());
  const sp = $('#bi-signer-porteur', r);
  if (sp) sp.onclick = () => {
    const nom = $('#bi-nom-porteur', r).value.trim();
    if (!b.fin?.conformite) { showToast('Choisissez « conforme au devis » ou « conforme avec réserves ».'); return; }
    if (b.fin.conformite === 'reserves' && !String(b.observations || '').trim()) { showToast('Notez les réserves à l\'étape 7 avant de signer.'); return; }
    if (!nom) { showToast('Indiquez le nom du signataire.'); return; }
    if (!pads.porteur?.drawn) { showToast('Signez dans le cadre.'); return; }
    if (!confirm('Après votre signature, le bon ne pourra plus être modifié. Signer maintenant ?')) return;
    b.signatures = { ...(b.signatures || {}), porteur: { nom, img: pads.porteur.image(), date: new Date().toISOString() } };
    enregistrer(b, true); re(); showToast('Bon signé pour Fil Bleu. Au tour du client.');
  };
  const sc = $('#bi-signer-client', r);
  if (sc) sc.onclick = async () => {
    const nom = $('#bi-nom-client', r).value.trim();
    if (!nom) { showToast('Indiquez le nom du client.'); return; }
    if (!pads.client?.drawn) { showToast('Le client doit signer dans le cadre.'); return; }
    b.signatures.client = { nom, qualite: $('#bi-qualite', r).value.trim(), img: pads.client.image(), date: new Date().toISOString(), lieu: 'sur place' };
    enregistrer(b, true);
    try { await idbPut('pdf', { bon: b.id, blob: await pdfBon(b) }); } catch (e) { showToast("Le PDF n'a pas pu être créé maintenant : il le sera à la synchronisation."); }
    await compterAttente(); re(); remettre(b);
  };
  const di = $('#bi-distance', r);
  if (di) di.onclick = () => {
    const email = $('#bi-email-distance', r).value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showToast('Adresse e-mail invalide.'); return; }
    b.signatures.distance = { email, demandeLe: new Date().toISOString() };
    enregistrer(b, true); re();
    showToast(navigator.onLine ? 'Envoi du lien de signature…' : 'Le lien partira au retour du réseau.');
  };
  const rm = $('#bi-remettre', r); if (rm) rm.onclick = () => remettre(b);
  const rc = $('#bi-rectif', r);
  if (rc) rc.onclick = () => {
    if (!confirm(`Établir un bon rectificatif du bon ${b.numero} ? Le premier reste tel quel ; le rectificatif le remplace une fois signé.`)) return;
    const x = nouveauBon(ctx.dossiers()[b.dossier_id] || { id: b.dossier_id }, b); enregistrer(x); ouvrir(x.id);
  };
}
async function remettre(b) {
  let blob = (await idbGet('pdf', b.id))?.blob;
  try { if (!blob) blob = await pdfBon(b); } catch (e) { showToast("Le PDF n'a pas pu être créé."); return; }
  const nom = `Bon d'intervention ${b.numero}.pdf`, fichier = new File([blob], nom, { type: 'application/pdf' });
  const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Envoyer le bon au client');
  m.innerHTML = `<div class="sheet"><h2>Bon ${esc(b.numero)} signé</h2>
    <p class="small" style="margin:0">${b.pdf?.chemin ? 'Le PDF est classé dans le dossier et dans l\'espace client.' : 'Le PDF sera classé dans le dossier et l\'espace client dès le retour du réseau.'}</p>
    <p class="small muted" style="margin:0">Envoyez-en une copie au client maintenant${b.client?.email ? ` (${esc(b.client.email)})` : ''}.</p>
    <div class="row"><button class="btn ghost" id="rb-plus-tard" style="flex:1">Plus tard</button><button class="btn" id="rb-envoyer" style="flex:2">Envoyer au client</button></div></div>`;
  document.body.appendChild(m);
  $('#rb-plus-tard', m).onclick = () => m.remove();
  $('#rb-envoyer', m).onclick = async () => {
    try { if (navigator.canShare && navigator.canShare({ files: [fichier] })) { await navigator.share({ files: [fichier], title: nom, text: `Votre bon d'intervention ${MARQUES[b.marque]} n° ${b.numero}.` }); m.remove(); return; } }
    catch (e) { if (e?.name === 'AbortError') return; }
    const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    if (b.client?.email) location.href = `mailto:${encodeURIComponent(b.client.email)}?subject=${encodeURIComponent(`Bon d'intervention ${b.numero}`)}&body=${encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint le bon d'intervention n° ${b.numero}, signé.\n\nBien cordialement,`)}`;
    m.remove();
  };
}

/* ---------- PDF du bon (mise en page du modèle papier) ---------- */
async function jpeg(src, max, q = 0.72) {
  const url = typeof src === 'string' ? src : URL.createObjectURL(src);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k);
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, cv.width, cv.height);
    return { bytes: dataUrlBytes(cv.toDataURL('image/jpeg', q)), w: cv.width, h: cv.height };
  } finally { if (typeof src !== 'string') URL.revokeObjectURL(url); }
}
async function pdfBon(b) {
  const P = makePdf(), so = ctx.soc(), pro = b.marque === 'pro', marque = MARQUES[b.marque];
  const navy = '#1D2B4E', or = '#B8925A', ink = '#1E2430', muted = '#5A5F68', ligneC = '#D9D2C5';
  const L = 40, R = 555, W = R - L, H = 842; let y = 0;
  const legal = `${marque}, une marque de la SAS Groupe Fil Bleu, ${so.adresse} · SIRET ${so.siret} · RCS ${so.rcsVille || '[ville]'} ${so.rcs} · Récépissé de transport de déchets n° ${so.recepisse || '[n°]'}.`;
  const pied = () => { const ls = wrap(legal, 6.5, W - 150); ls.forEach((l, k) => P.text(L, 812 + k * 8, l, { size: 6.5, color: muted })); P.text(R, 812, `Exemplaire client / ${marque}`, { size: 6.5, color: muted, align: 'right' }); };
  const saut = (h) => { if (y + h > 790) { pied(); P.addPage(); y = 50; } };
  const cercle = (cx, cy, r, col) => { const k = 0.5523 * r, Y = H - cy; P.path(`${cx + r} ${Y} m ${cx + r} ${Y + k} ${cx + k} ${Y + r} ${cx} ${Y + r} c ${cx - k} ${Y + r} ${cx - r} ${Y + k} ${cx - r} ${Y} c ${cx - r} ${Y - k} ${cx - k} ${Y - r} ${cx} ${Y - r} c ${cx + k} ${Y - r} ${cx + r} ${Y - k} ${cx + r} ${Y} c`, col, 0.8); };
  const section = (n, titre, garde = 60) => { saut(garde); y += 18; cercle(L + 8, y - 3, 8, or); P.text(L + 8, y, String(n), { size: 9, color: or, align: 'center' }); const t = titre.toUpperCase().split('').join(' '); P.text(L + 24, y, t, { size: 8.5, bold: true, color: navy }); const x0 = L + 30 + tw(t, 8.5, true); P.line(x0, y - 3, R, y - 3, or, 0.5); y += 16; };
  const coche = (x, yy, v, l, o = {}) => { P.box(x, yy - 8, 9, 9, '#8A8F98'); if (v) P.path(`${x + 2} ${H - yy + 4} m ${x + 4} ${H - yy + 1.5} l ${x + 7.5} ${H - yy + 7} l`, navy, 1.3); P.text(x + 14, yy, l, { size: 8.5, color: ink, ...o }); return x + 14 + tw(l, 8.5) + 16; };
  const champ = (x, yy, l, v, w) => { P.text(x, yy, l, { size: 8.5, color: navy, bold: true }); const x0 = x + tw(l, 8.5, true) + 6; P.line(x0, yy + 2, x + w, yy + 2, ligneC, 0.5); P.text(x0 + 2, yy - 1, String(v ?? ''), { size: 9, color: ink }); };
  // Bandeau
  P.rect(0, 0, 595, 108, navy);
  const k = 0.32, ox = L, oy = 30, X = (v) => (ox + v * k).toFixed(1), Y = (v) => (H - (oy + v * k)).toFixed(1);
  P.path(`${X(8)} ${Y(74)} m ${X(8)} ${Y(44)} l ${X(34)} ${Y(22)} l ${X(60)} ${Y(44)} l ${X(60)} ${Y(74)} l ${X(104)} ${Y(74)} m ${X(104)} ${Y(44)} l ${X(130)} ${Y(22)} l ${X(156)} ${Y(44)} l ${X(156)} ${Y(74)} l`, or, 1.1);
  P.path(`${X(34)} ${Y(60)} m ${X(52)} ${Y(76)} ${X(64)} ${Y(40)} ${X(82)} ${Y(54)} c ${X(100)} ${Y(68)} ${X(112)} ${Y(70)} ${X(130)} ${Y(60)} c`, '#8FB0D9', 1.4);
  P.text(L, 74, marque, { size: 18, color: '#FFFFFF', serif: true });
  P.text(L, 90, pro ? 'DÉBARRAS & NETTOYAGE' : 'TRANSITION & ACCOMPAGNEMENT', { size: 6.5, color: '#C9CED8' });
  P.text(R, 46, 'Bon d’intervention', { size: 24, color: '#FFFFFF', serif: true, align: 'right' });
  P.text(R, 68, `N° ${b.numero} · Date ${dateFr(b.date)}`, { size: 9, color: '#FFFFFF', align: 'right' });
  P.text(R, 84, `Devis ou bon de commande n° ${b.devis || ''}`, { size: 8, color: '#C9CED8', align: 'right' });
  if (b.rectifie) P.text(R, 98, `Rectifie le bon n° ${bons[b.rectifie]?.numero || ''}`, { size: 8, color: '#F0D9B5', align: 'right' });
  y = 118;
  const C = b.client || {}, Lg = b.logement || {}, Pv = b.prevu || {}, Re = b.realise || {};
  section(1, 'Client');
  if (pro) { champ(L, y, 'Société (agence, syndic, bailleur, étude)', C.societe, 340); champ(L + 350, y, 'Contact', C.contact, W - 350); }
  else champ(L, y, 'Client', C.contact, W);
  y += 18; champ(L, y, 'Téléphone', C.tel, 250); champ(L + 260, y, 'E-mail', C.email, W - 260); y += 6;
  section(2, 'Logement');
  champ(L, y, 'Adresse', Lg.adresse, 380); champ(L + 390, y, 'Étage', Lg.etage, W - 390); y += 18;
  champ(L, y, 'Surface (m²)', Lg.surface, 160); champ(L + 170, y, 'Clés remises par', Lg.clesPar, 180); champ(L + 360, y, 'Code / accès', Lg.acces, W - 360); y += 18;
  let x = L; LOGEMENT_CASES.forEach(([kk, l]) => { x = coche(x, y, Lg[kk], l); }); y += 6;
  section(3, 'Prestations réalisées');
  const col2 = L + W / 2 + 10, yTop = y; let y1 = y, y2 = y;
  const qte = (xx, yy, l, v, u, vPrevu) => { coche(xx, yy, Number(v) > 0, l); const s = `${num(Number(v) || 0)}${u ? ' ' + u : ''}`; P.text(xx + W / 2 - 14, yy, s, { size: 9, align: 'right', bold: true }); if (vPrevu != null && n1(vPrevu) !== n1(v)) P.text(xx + W / 2 - 14, yy + 9, `devis : ${num(vPrevu)}${u ? ' ' + u : ''}`, { size: 6.5, color: '#A86A1D', align: 'right' }); };
  P.text(L, y1, 'Débarras', { size: 8.5, bold: true, color: navy }); y1 += 15;
  qte(L, y1, 'Volume prévu au devis', Pv.volume, 'm³'); y1 += 16;
  qte(L, y1, 'Volume réellement évacué', Re.volume, 'm³', Pv.volume); y1 += 20;
  qte(L, y1, 'Cave ou garage', Re.cave, 'm³', Pv.cave); y1 += 20;
  P.text(L, y1, 'Nettoyage', { size: 8.5, bold: true, color: navy }); y1 += 15;
  NETTOYAGE.forEach(([kk, l]) => { coche(L, y1, Re[kk], l); if (!!Pv[kk] !== !!Re[kk]) P.text(L + W / 2 - 14, y1, Re[kk] ? 'non prévu au devis' : 'prévu au devis', { size: 6.5, color: '#A86A1D', align: 'right' }); y1 += 16; });
  if (pro) {
    P.text(col2, y2, 'Options', { size: 8.5, bold: true, color: navy }); y2 += 15;
    OPTS.forEach(([kk, l, u, t]) => { if (t === 'case') { coche(col2, y2, Re.opts?.[kk], l); if (!!Pv.opts?.[kk] !== !!Re.opts?.[kk]) P.text(R, y2, Re.opts?.[kk] ? 'non prévu au devis' : 'prévu au devis', { size: 6.5, color: '#A86A1D', align: 'right' }); } else { coche(col2, y2, (Re.opts?.[kk] || 0) > 0, l); P.text(R, y2, `${num(Re.opts?.[kk] || 0)} ${u}`, { size: 9, align: 'right', bold: true }); if (n1(Pv.opts?.[kk] || 0) !== n1(Re.opts?.[kk] || 0)) P.text(R, y2 + 9, `devis : ${num(Pv.opts?.[kk] || 0)} ${u}`, { size: 6.5, color: '#A86A1D', align: 'right' }); } y2 += 18; });
  } else {
    P.text(col2, y2, 'Pour la famille', { size: 8.5, bold: true, color: navy }); y2 += 15;
    [['Objets mis de côté pour la famille', b.famille?.objets], ['Papiers remis', b.famille?.papiers]].forEach(([l, v]) => { P.text(col2, y2, l, { size: 8.5, bold: true }); y2 += 12; wrap(v || '—', 8.5, W / 2 - 10).slice(0, 6).forEach((t) => { P.text(col2, y2, t, { size: 8.5 }); y2 += 11; }); y2 += 6; });
  }
  y = Math.max(y1, y2, yTop) + 2;
  section(4, 'Déchets et filières');
  const cols = [['Destination', 70], ['Installation', 92], ['N° bon de dépôt', 72], ['Nature', 78], ['Volume', 44], ['Poids', 40], ['Traitement', 119]];
  const ent = () => { let xx = L; cols.forEach(([l, w]) => { P.text(xx, y, l, { size: 7, color: muted }); xx += w; }); y += 5; P.line(L, y, R, y, navy, 0.6); y += 11; };
  if (b.dechets.length) {
    ent();
    b.dechets.forEach((l) => { saut(16); const v = [DESTINATIONS[l.destination] || '', l.installation, l.bonDepot, NATURES[l.nature] || '', l.volume !== '' ? `${num(Number(l.volume) || 0)} m³` : '', l.poids ? `${num(Number(l.poids))} kg` : '', TRAITEMENTS[l.traitement] || '']; let xx = L; v.forEach((t, j) => { const w = cols[j][1]; P.text(xx, y, wrap(String(t || ''), 8, w - 4)[0], { size: 8 }); xx += w; }); y += 6; P.line(L, y, R, y, ligneC, 0.4); y += 11; });
  } else { P.text(L, y, 'Aucun dépôt noté.', { size: 8.5, color: muted }); y += 12; }
  P.text(L, y, 'Justificatifs de dépôt conservés et transmis sur demande. Aucun déchet dangereux pris en charge (amiante, produits chimiques, bouteilles de gaz).', { size: 7, color: muted }); y += 4;
  section(5, 'Déroulement');
  const D = b.deroulement || {}, nAv = b.photos.filter((p) => p.cat === 'avant').length, nAp = b.photos.filter((p) => p.cat === 'apres').length;
  champ(L, y, 'Arrivée', D.arrivee, 150); champ(L + 165, y, 'Départ', D.depart, 150); champ(L + 330, y, 'Nombre d’intervenants', D.intervenants, W - 330); y += 18;
  champ(L, y, 'Photos avant / après : nombre', `${nAv} / ${nAp}`, 250); champ(L + 265, y, 'Envoyées le', b.signatures?.client?.date ? dateFr(b.signatures.client.date) : '', W - 265); y += 6;
  section(6, 'Observations et réserves');
  P.text(L, y, 'Dégâts constatés avant l’intervention, objets laissés sur place à la demande du client, réserves éventuelles.', { size: 7.5, color: muted }); y += 13;
  wrap(b.observations || '—', 9, W).forEach((t) => { saut(12); P.text(L, y, t, { size: 9 }); y += 12; });
  const nObs = b.photos.filter((p) => p.cat === 'obs').length; if (nObs) { P.text(L, y, `${nObs} photo${nObs > 1 ? 's' : ''} en annexe.`, { size: 7.5, color: muted }); y += 10; }
  section(7, 'Fin d’intervention', 156);
  x = coche(L, y, b.fin?.conformite === 'conforme', 'Prestation conforme au devis');
  x = coche(x, y, b.fin?.conformite === 'reserves', 'Conforme avec réserves (voir 6)');
  coche(x, y, !!b.fin?.clesA, `Clés rendues à : ${b.fin?.clesA || '____________'}`); y += 16;
  const bw = (W - 16) / 2, bh = 102, sigs = [['porteur', `Pour ${marque}`, 'Nom'], ['client', 'Pour le client', 'Nom et qualité']];
  for (let j = 0; j < 2; j++) {
    const [cle, titre, lib] = sigs[j], s = b.signatures?.[cle], bx = L + j * (bw + 16);
    P.box(bx, y, bw, bh, '#CFC5B4');
    P.text(bx + 12, y + 18, titre, { size: 9.5, bold: true, color: navy });
    P.text(bx + 12, y + 33, `${lib} : ${s ? s.nom + (s.qualite ? ', ' + s.qualite : '') : ''}`, { size: 8, color: muted });
    P.text(bx + 12, y + 47, 'Signature', { size: 8, color: muted });
    if (s?.img) { try { const im = await jpeg(s.img, 480, 0.8); const h = 38, w = Math.min(bw - 24, h * im.w / im.h); P.image(im.bytes, im.w, im.h, bx + 12, y + 52, w, h); } catch (e) { /* signature illisible */ } }
    if (s?.date) P.text(bx + 12, y + bh - 6, `Signé le ${heureFr(s.date)}${s.lieu === 'espace client' ? ' (espace client)' : ''}`, { size: 7, color: muted });
  }
  y += bh + 8;
  pied();
  // Annexe : photos
  const annexe = [...b.photos.filter((p) => p.cat === 'avant').map((p, j) => [p, `Avant ${j + 1}`]), ...b.photos.filter((p) => p.cat === 'apres').map((p, j) => [p, `Après ${j + 1}`]), ...b.photos.filter((p) => p.cat === 'obs').map((p, j) => [p, `Observation ${j + 1}`]), ...b.dechets.filter((l) => l.photo).map((l, j) => [{ chemin: l.photo }, `Bon de dépôt ${l.bonDepot || j + 1}`])];
  if (annexe.length) {
    const cw = (W - 16) / 2, ch = 205; let n = 0;
    for (const [p, leg] of annexe) {
      if (n % 6 === 0) { P.addPage(); P.text(L, 50, `Annexe · photos du bon n° ${b.numero}`, { size: 12, bold: true, color: navy }); P.line(L, 58, R, 58, or, 0.5); }
      const cx = L + (n % 2) * (cw + 16), cy = 72 + Math.floor((n % 6) / 2) * (ch + 30);
      const blob = await blobPhoto(p.chemin);
      let hImg = ch;
      if (blob) { try { const im = await jpeg(blob, 1000); const s = Math.min(cw / im.w, ch / im.h); hImg = im.h * s; P.image(im.bytes, im.w, im.h, cx, cy, im.w * s, hImg); } catch (e) { P.box(cx, cy, cw, ch); } }
      else { P.box(cx, cy, cw, ch); P.text(cx + cw / 2, cy + ch / 2, 'Photo indisponible hors connexion', { size: 8, color: muted, align: 'center' }); }
      P.text(cx, cy + hImg + 12, `${leg}${p.date ? ' · ' + heureFr(p.date) : ''}`, { size: 8, color: muted });
      n++;
      if (n % 6 === 0 || n === annexe.length) pied();
    }
  }
  return P.build();
}

/* ---------- Registre des déchets ---------- */
function lignesRegistre() {
  const out = [];
  Object.values(bons).filter((b) => signePorteur(b) && !b.annule && !remplace(b)).forEach((b) => {
    (b.dechets || []).forEach((l) => out.push({
      date: b.date, chantier: b.logement?.adresse || '', nature: NATURES[l.nature] || '', volume: l.volume, destination: DESTINATIONS[l.destination] || '',
      installation: l.installation || '', bonDepot: l.bonDepot || '', traitement: TRAITEMENTS[l.traitement] || '', cout: l.cout, poids: l.poids,
      client: [b.client?.societe, b.client?.contact].filter(Boolean).join(' · '), marque: MARQUES[b.marque], numero: b.numero, bon: b.id,
    }));
  });
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.numero.localeCompare(b.numero));
}
const COLS_REG = [['date', 'Date'], ['chantier', 'Chantier'], ['nature', 'Nature'], ['volume', 'Volume (m³)'], ['destination', 'Destination'], ['installation', 'Installation'], ['bonDepot', 'N° du bon de dépôt'], ['traitement', 'Traitement'], ['cout', 'Coût HT (€)'], ['poids', 'Poids (kg)'], ['client', 'Client'], ['marque', 'Marque'], ['numero', "N° du bon d'intervention"]];
let moisReg = '';
function registre() {
  const app = $('#app'), toutes = lignesRegistre();
  document.body.classList.add('bi-large');
  const mois = [...new Set(toutes.map((l) => l.date.slice(0, 7)))].sort().reverse();
  if (moisReg && !mois.includes(moisReg)) moisReg = '';
  const lignes = moisReg ? toutes.filter((l) => l.date.startsWith(moisReg)) : toutes;
  const nomMois = (m) => new Date(m + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const tv = lignes.reduce((a, l) => a + (Number(l.volume) || 0), 0), tc = lignes.reduce((a, l) => a + (Number(l.cout) || 0), 0);
  app.innerHTML = `${ctx.header('Registre')}
    <h1>Registre des déchets</h1>
    <p class="small muted" style="margin:0">Tiré des bons d'intervention signés, en ordre chronologique. Un bon rectifié est remplacé par son rectificatif.</p>
    <div class="card"><div class="grid2"><label>Mois<select id="reg-mois"><option value="">Tous les mois</option>${mois.map((m) => `<option value="${m}" ${m === moisReg ? 'selected' : ''}>${esc(nomMois(m))}</option>`).join('')}</select></label>
      <div style="display:flex;align-items:flex-end"><button class="btn" id="reg-csv" style="width:100%" ${lignes.length ? '' : 'disabled'}>Exporter en CSV</button></div></div>
      <div class="kpis"><div class="kpi"><b>${lignes.length}</b><span>dépôt${lignes.length > 1 ? 's' : ''}</span></div><div class="kpi"><b>${num(tv)} m³</b><span>volume · ${eur(tc)} HT</span></div></div></div>
    ${lignes.length ? `<div class="card bi-registre"><table><thead><tr>${COLS_REG.map(([, l]) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>
      ${lignes.map((l) => `<tr>${COLS_REG.map(([k]) => `<td>${k === 'numero' ? `<a href="#" data-bon-reg="${esc(l.bon)}">${esc(l.numero)}</a>` : esc(k === 'date' ? dateFr(l.date) : (k === 'volume' || k === 'cout' || k === 'poids') && l[k] !== '' && l[k] != null ? num(Number(l[k])) : l[k] ?? '')}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>` : `<div class="card"><p style="margin:0" class="muted">Aucun dépôt ${moisReg ? 'ce mois-ci' : 'pour l\'instant'}. Les lignes « Déchets et filières » des bons signés apparaissent ici.</p></div>`}`;
  $('#reg-mois', app).onchange = (e) => { moisReg = e.target.value; registre(); };
  $('#reg-csv', app).onclick = () => exporterCsv(lignes);
  app.querySelectorAll('[data-bon-reg]').forEach((a) => a.onclick = (e) => { e.preventDefault(); etapeCourante[a.dataset.bonReg] = 3; ouvrir(a.dataset.bonReg); });
}
function exporterCsv(lignes) {
  const cell = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const nb = (v) => v === '' || v == null ? '' : String(Number(v)).replace('.', ',');
  const csv = '﻿' + [COLS_REG.map(([, l]) => cell(l)).join(';'), ...lignes.map((l) => COLS_REG.map(([k]) => cell(k === 'date' ? dateFr(l.date) : ['volume', 'cout', 'poids'].includes(k) ? nb(l[k]) : l[k])).join(';'))].join('\r\n');
  const u = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = u; a.download = `Registre-dechets${moisReg ? '-' + moisReg : ''}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}

compterAttente().then(() => ctx.majBandeau());
return {
  onglet, ecran, registre, charger, synchroniser, nbEnAttente,
  quitter() { document.body.classList.remove('bi-large'); },
  viderCache() { [K_BONS, K_FILE].forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* rien */ } }); try { indexedDB.deleteDatabase('fb-bons'); } catch (e) { /* rien */ } },
  _test: { bons: () => bons, lignesRegistre, pdfBon, ecarts },
};
}
