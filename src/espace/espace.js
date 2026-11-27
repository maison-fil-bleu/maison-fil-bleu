/**
 * Espace client Maison Fil Bleu.
 * Connexion : e-mail seul, puis code à 6 chiffres (ou lien) reçu par e-mail.
 * Une famille ne lit que les données de ses propres dossiers (règles d'accès Supabase) et n'agit que par
 * des fonctions dédiées : répondre à une décision, signer le listing des objets, signer un bon.
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_CLE_PUBLIQUE } from '../config/supabase';

export function creerClient(apercu = false) {
  // Aperçu administrateur : on réutilise la session du back-office (même site), en lecture seule.
  if (apercu) return createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' } });
  return createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, {
    // Session propre à l'espace client (distincte du back-office sur le même site).
    auth: { storageKey: 'fb-espace-client', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  });
}

const FORMULES = { L: 'Clés en main', T: 'Nouveau départ', S: 'Succession', P: 'Fil Bleu Pro' };
const ETAPES = [['diagnostic', 'Diagnostic'], ['devis', 'Devis signé'], ['preparation', 'Préparation'], ['interventions', 'Interventions'], ['cles', 'Remise des clés']];
const ETATS = { a_venir: 'À venir', en_cours: 'En cours', termine: 'Terminé' };
const TYPES_DOC = { devis: 'Devis', facture: 'Facture', etat_des_lieux: 'État des lieux', bon_intervention: "Bon d'intervention", autre: 'Document' };
// Bon d'intervention à signer à distance (le porteur a signé sur place, le client n'y était pas).
const BI_OPTS = [['vitres', 'Baie vitrée ou grande fenêtre en plus', 'u'], ['pack', 'Pack cuisine (four, réfrigérateur, hotte)', ''], ['placards', 'Intérieur des placards, par pièce', 'pièces'], ['murs', 'Lessivage des murs', 'm²'], ['moquette', 'Shampoing moquette', 'm²'], ['balcon', 'Balcon ou terrasse', ''], ['cave', 'Cave ou garage (nettoyage)', '']];
const BI_DEST = { decheterie: 'Déchèterie', ecomaison: 'Ecomaison', association: 'Association', ressourcerie: 'Ressourcerie', ferrailleur: 'Ferrailleur' };
const BI_NAT = { tout_venant: 'Tout-venant', mobilier: 'Mobilier', bois: 'Bois', metaux: 'Métaux', electromenager: 'Électroménager', gravats: 'Gravats', cartons: 'Cartons et papiers', textiles: 'Textiles', verts: 'Déchets verts' };
const BI_TRAIT = { reemploi: 'Réemploi', recyclage: 'Recyclage', energie: 'Valorisation énergétique', enfouissement: 'Enfouissement' };
const nombre = (v) => (Math.round((Number(v) || 0) * 10) / 10).toLocaleString('fr-FR');
function bonHtml(b) {
  const r = b.resume || {}, R = r.realise || {}, Lg = r.logement || {}, D = r.deroulement || {}, sp = r.signatures?.porteur || {};
  const marque = b.marque === 'pro' ? 'Fil Bleu Pro' : 'Maison Fil Bleu';
  const prest = [
    Number(R.volume) > 0 ? `Débarras : ${nombre(R.volume)} m³ évacués` : null,
    Number(R.cave) > 0 ? `Cave ou garage : ${nombre(R.cave)} m³` : null,
    R.complet ? 'Nettoyage complet du logement' : null, R.travaux ? 'Après travaux (+ 30 %)' : null, R.urgence ? 'Urgence sous 72 h (+ 25 %)' : null,
    ...(b.marque === 'pro' ? BI_OPTS.filter(([k]) => Number(R.opts?.[k]) > 0).map(([k, l, u]) => u ? `${l} : ${nombre(R.opts[k])} ${u}` : l) : []),
  ].filter(Boolean);
  const heure = (x) => x ? new Date(x).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return `<div class="ec-carte ec-bon" data-bon="${esc(b.id)}">
    <h2>Bon d'intervention à signer</h2>
    <p class="p" style="margin:0">${esc(marque)} · n° ${esc(b.numero)} · ${esc(dateFr(r.date))}${r.rectifie_numero ? ` · rectifie le bon n° ${esc(r.rectifie_numero)}` : ''}${Lg.adresse ? ` · ${esc(Lg.adresse)}` : ''}</p>
    <div class="ec-bon-bloc"><b>Prestations réalisées</b><ul>${prest.map((x) => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul></div>
    ${b.marque !== 'pro' && (r.famille?.objets || r.famille?.papiers) ? `<div class="ec-bon-bloc">${r.famille.objets ? `<b>Objets mis de côté pour la famille</b><p>${esc(r.famille.objets)}</p>` : ''}${r.famille.papiers ? `<b>Papiers remis</b><p>${esc(r.famille.papiers)}</p>` : ''}</div>` : ''}
    ${(r.dechets || []).length ? `<div class="ec-bon-bloc"><b>Déchets et filières</b><ul>${r.dechets.map((l) => `<li>${esc(BI_NAT[l.nature] || '')}${l.volume ? ` · ${esc(nombre(l.volume))} m³` : ''} · ${esc(BI_DEST[l.destination] || '')}${l.installation ? ` (${esc(l.installation)})` : ''} · ${esc(BI_TRAIT[l.traitement] || '')}</li>`).join('')}</ul></div>` : ''}
    <div class="ec-bon-bloc"><b>Déroulement</b><p>${esc([D.arrivee ? `Arrivée ${D.arrivee}` : '', D.depart ? `départ ${D.depart}` : '', D.intervenants ? `${D.intervenants} intervenant${D.intervenants > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ') || '—')}</p></div>
    <div class="ec-bon-bloc"><b>Observations et réserves</b><p>${esc(r.observations || 'Aucune.')}</p></div>
    <div class="ec-bon-bloc"><b>Fin d'intervention</b><p>${r.fin?.conformite === 'reserves' ? 'Conforme avec réserves' : 'Prestation conforme au devis'}${r.fin?.clesA ? ` · clés rendues à ${esc(r.fin.clesA)}` : ''}<br>Signé pour ${esc(marque)} par ${esc(sp.nom || '')} le ${esc(heure(sp.date))}.</p></div>
    <label for="bi-nom-${esc(b.id)}">Votre nom</label><input id="bi-nom-${esc(b.id)}" data-bi-nom autocomplete="name">
    <label for="bi-qual-${esc(b.id)}">Qualité <span style="font-weight:400">(propriétaire, gestionnaire, héritier…)</span></label><input id="bi-qual-${esc(b.id)}" data-bi-qualite>
    <span class="ec-bon-lbl">Votre signature, au doigt ou à la souris</span>
    <canvas class="ec-pad" aria-label="Zone de signature"></canvas>
    <div class="ec-contact"><button type="button" class="btn2" data-bi-effacer>Effacer</button><button type="button" class="btn" data-bi-signer>Signer le bon</button></div>
    <div class="ec-msg" role="status" hidden></div>
  </div>`;
}
function lierBon(sb, carte, apres) {
  const cv = carte.querySelector('canvas'), g = cv.getContext('2d'); let trace = false, dernier = null;
  const taille = () => { const r = cv.getBoundingClientRect(), k = window.devicePixelRatio || 1; cv.width = r.width * k; cv.height = r.height * k; g.setTransform(k, 0, 0, k, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, r.width, r.height); g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#18202C'; trace = false; };
  taille();
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); dernier = pt(e); g.beginPath(); g.arc(dernier[0], dernier[1], 1.2, 0, 7); g.fillStyle = '#18202C'; g.fill(); trace = true; };
  cv.onpointermove = (e) => { if (!dernier) return; const p = pt(e); g.beginPath(); g.moveTo(...dernier); g.lineTo(...p); g.stroke(); dernier = p; };
  cv.onpointerup = cv.onpointercancel = () => { dernier = null; };
  const msg = (t, alerte) => { const el = carte.querySelector('.ec-msg'); el.hidden = !t; el.className = 'ec-msg' + (alerte ? ' alerte' : ''); el.textContent = t; };
  carte.querySelector('[data-bi-effacer]').onclick = taille;
  carte.querySelector('[data-bi-signer]').onclick = async (e) => {
    const nom = carte.querySelector('[data-bi-nom]').value.trim();
    if (!nom) { msg('Indiquez votre nom.', true); return; }
    if (!trace) { msg('Signez dans le cadre.', true); return; }
    const o = document.createElement('canvas'); o.width = 480; o.height = Math.round(480 * cv.height / cv.width);
    const og = o.getContext('2d'); og.fillStyle = '#fff'; og.fillRect(0, 0, o.width, o.height); og.drawImage(cv, 0, 0, o.width, o.height);
    e.target.disabled = true; msg('Signature en cours…');
    const { error } = await sb.rpc('signer_bon', { p_id: carte.dataset.bon, p_nom: nom, p_qualite: carte.querySelector('[data-bi-qualite]').value.trim(), p_img: o.toDataURL('image/jpeg', 0.75) });
    e.target.disabled = false;
    if (error) { msg("La signature n'a pas pu être enregistrée. Vérifiez votre connexion internet et réessayez.", true); return; }
    msg('Merci, le bon est signé. Sa copie en PDF apparaîtra dans vos documents dès que votre interlocuteur l\'aura classée.');
    carte.querySelectorAll('input, button, canvas').forEach((x) => { x.disabled = true; x.style.pointerEvents = 'none'; });
    setTimeout(apres, 2500);
  };
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const dateFr = (d) => { if (!d) return ''; const x = new Date(d.length === 10 ? d + 'T12:00:00' : d); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); };
const telLien = (t) => { const n = String(t || '').replace(/[^\d+]/g, ''); return n.length >= 10 && !/\[/.test(t) ? `tel:${n.startsWith('0') ? '+33' + n.slice(1) : n}` : null; };

const coche = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>';
const icDoc = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';
const TJ = { contact: 'Contact', decision: 'Décision', intervention: 'Intervention', organisation: 'Organisation', document: 'Document' };
const TRI = { a_trier: ['À trier', 'a'], en_cours: ['En cours', 'cours'], trie: ['Trié', 'ok'] };
const BIEN = [['type', 'Type'], ['acces', 'Accès'], ['stationnement', 'Stationnement'], ['cles', 'Clés'], ['compteurs', 'Compteurs'], ['cave', 'Cave'], ['devenir', 'Devenir']];
const jourCourt = (d) => { const x = d ? new Date(d.length === 10 ? d + 'T12:00:00' : d) : null; return x && !isNaN(x) ? x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : (d || ''); };
const quandFr = (d) => { const x = new Date(d); if (isNaN(x)) return ''; const h = x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); return jourCourt(d) + (h !== '00:00' ? ' · ' + h : ''); };
const initiales = (n) => String(n || '').split(/[\s'-]+/).filter(Boolean).map((m) => m[0]).join('').slice(0, 2).toUpperCase() || '·';
const m3 = (v) => `${nombre(v)} m³`;

// Zone de signature au doigt ou à la souris.
function creerPad(cv) {
  const g = cv.getContext('2d'); let trace = false, dernier = null;
  const taille = () => { const r = cv.getBoundingClientRect(), k = window.devicePixelRatio || 1; cv.width = r.width * k; cv.height = r.height * k; g.setTransform(k, 0, 0, k, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, r.width, r.height); g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#18202C'; trace = false; };
  taille();
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); dernier = pt(e); g.beginPath(); g.arc(dernier[0], dernier[1], 1.2, 0, 7); g.fillStyle = '#18202C'; g.fill(); trace = true; };
  cv.onpointermove = (e) => { if (!dernier) return; const p = pt(e); g.beginPath(); g.moveTo(...dernier); g.lineTo(...p); g.stroke(); dernier = p; };
  cv.onpointerup = cv.onpointercancel = () => { dernier = null; };
  return {
    effacer: taille, vide: () => !trace,
    image() { const o = document.createElement('canvas'); o.width = 480; o.height = Math.round(480 * cv.height / cv.width); const og = o.getContext('2d'); og.fillStyle = '#fff'; og.fillRect(0, 0, o.width, o.height); og.drawImage(cv, 0, 0, o.width, o.height); return o.toDataURL('image/jpeg', 0.75); },
  };
}

export function demarrerEspace(sb, racine, contact = {}, apercu = null) {
  let session = null, dossiers = [], courant = null, parCode = false;
  const fond = contact.photoFond || '';

  const bandeau = () => apercu ? `<div class="ec-apercu" role="note"><div class="w"><b>Aperçu administrateur</b> · Vous voyez exactement ce que voit la famille. Les boutons de réponse, de validation et de signature sont désactivés.</div></div>` : '';
  function afficher(html) { racine.innerHTML = bandeau() + html; }
  function message(texte, alerte, sel = '#ec-msg') {
    const el = racine.querySelector(sel); if (!el) return;
    el.hidden = !texte; el.className = 'ec-msg' + (alerte ? ' alerte' : ''); el.textContent = texte;
  }
  // Écran simple (connexion, messages) : photo en fond, carte au centre.
  const ecranSimple = (html) => afficher(`<section class="hero ec-simple">${fond ? `<img class="hero-img" src="${esc(fond)}" alt="">` : ''}
    <div class="w ec-simple-in"><div class="ec-w">${html}</div></div></section>`);

  /* ---------- Connexion : e-mail, puis code à 6 chiffres (ou lien) reçu par e-mail ---------- */
  function ecranConnexion(info, emailConnu = '') {
    ecranSimple(`<span class="lbl">Espace client</span>
      <h1>Suivez votre dossier, avec vos proches.</h1>
      <p class="lead">Les étapes, le journal, les décisions, les photos et les documents de votre accompagnement, au même endroit. Votre espace est ouvert par votre interlocuteur après le diagnostic.</p>
      <form class="ec-carte" id="ec-form" novalidate>
        <label for="ec-email">Votre adresse e-mail</label>
        <input id="ec-email" type="email" autocomplete="email" inputmode="email" required placeholder="prenom.nom@exemple.fr" value="${esc(emailConnu)}">
        <button class="btn" type="submit">Recevoir mon code de connexion</button>
        <div id="ec-msg" class="ec-msg" role="status" hidden></div>
        <p class="p" style="font-size:14px;margin:0">Pas de mot de passe à retenir : vous recevez par e-mail un code à 6 chiffres, à saisir ici.</p>
      </form>`);
    if (info) message(info.texte, info.alerte);
    racine.querySelector('#ec-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = racine.querySelector('#ec-email').value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { message('Saisissez une adresse e-mail valide.', true); return; }
      const bouton = racine.querySelector('#ec-form button'); bouton.disabled = true;
      message('Envoi en cours…');
      const erreur = await envoyerCode(email);
      bouton.disabled = false;
      if (erreur) { message(erreur, true); return; }
      ecranCode(email);
    };
  }

  // Renvoie un message d'erreur à afficher, ou null si l'envoi est parti (ou l'adresse inconnue : même réponse).
  async function envoyerCode(email) {
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + '/espace-client' } });
    const inconnue = error && /Signups not allowed|not found|not allowed/i.test(String(error.message));
    if (!error || inconnue) return null;
    return /rate limit|security purposes|too many/i.test(String(error.message)) ? 'Trop de demandes rapprochées : patientez quelques minutes avant de réessayer.' : "L'envoi n'a pas pu se faire. Vérifiez votre connexion internet et réessayez.";
  }

  function ecranCode(email) {
    ecranSimple(`<span class="lbl">Espace client</span>
      <h1>Saisissez votre code.</h1>
      <form class="ec-carte" id="ec-code-form" novalidate>
        <p class="p" style="margin:0">Si l'adresse <strong>${esc(email)}</strong> est rattachée à un dossier, un e-mail vient d'y être envoyé avec un code à 6 chiffres. Pensez à vérifier les courriers indésirables.</p>
        <label for="ec-code">Code reçu par e-mail</label>
        <input id="ec-code" class="ec-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" required placeholder="000000">
        <button class="btn" type="submit">Ouvrir mon espace</button>
        <div id="ec-msg" class="ec-msg" role="status" hidden></div>
        <p class="p" style="font-size:14px;margin:0">Le code est valable une heure. Vous pouvez aussi cliquer sur le bouton de l'e-mail, depuis cet appareil.</p>
        <div class="ec-contact"><button type="button" class="ec-lien" id="ec-renvoyer">Renvoyer un code</button><button type="button" class="ec-lien" id="ec-autre">Changer d'adresse</button></div>
      </form>`);
    const champ = racine.querySelector('#ec-code');
    champ.focus();
    champ.oninput = () => { champ.value = champ.value.replace(/\D/g, '').slice(0, 6); if (champ.value.length === 6) racine.querySelector('#ec-code-form').requestSubmit(); };
    racine.querySelector('#ec-autre').onclick = () => ecranConnexion(null, email);
    racine.querySelector('#ec-renvoyer').onclick = async (e) => {
      e.target.disabled = true; message('Envoi en cours…');
      const erreur = await envoyerCode(email);
      e.target.disabled = false;
      message(erreur || 'Un nouveau code vient d\'être envoyé. Seul le dernier code reçu fonctionne.', !!erreur);
    };
    let enCours = false;
    racine.querySelector('#ec-code-form').onsubmit = async (e) => {
      e.preventDefault();
      if (enCours) return;
      const token = champ.value.trim();
      if (!/^\d{6}$/.test(token)) { message('Le code compte 6 chiffres.', true); return; }
      enCours = true; parCode = true; message('Vérification…');
      const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
      enCours = false;
      if (error || !data?.session) {
        parCode = false;
        message(/rate limit|too many/i.test(String(error?.message)) ? 'Trop d\'essais : patientez quelques minutes.' : 'Ce code est incorrect ou a expiré. Vérifiez-le, ou demandez un nouveau code.', true);
        champ.select(); return;
      }
      session = data.session;
      try { await charger(); } catch { ecranConnexion({ texte: "Votre espace n'a pas pu se charger. Vérifiez votre connexion internet, puis réessayez.", alerte: true }); }
    };
  }

  /* ---------- Chargement des dossiers ---------- */
  async function charger() {
    let q = sb.from('espace_client').select('*').order('updated_at', { ascending: false });
    if (apercu) q = q.eq('dossier_id', apercu);
    const { data, error } = await q;
    if (error) throw error;
    dossiers = data || [];
    if (!dossiers.length) return ecranSansDossier();
    if (!courant || !dossiers.some((d) => d.dossier_id === courant)) courant = dossiers[0].dossier_id;
    await afficherDossier();
  }
  function ecranSansDossier() {
    if (apercu) return ecranSimple(`<h1>Aperçu indisponible.</h1><div class="ec-carte"><p class="p" style="margin:0">L'espace de ce dossier n'est pas encore enregistré, ou votre session du back-office a expiré. Enregistrez l'onglet « 5 · Espace client » dans l'appli, reconnectez-vous si besoin, puis rouvrez l'aperçu.</p></div>`);
    ecranSimple(`<span class="lbl">Espace client</span><h1>Votre espace n'est pas encore ouvert.</h1>
      <div class="ec-carte"><p class="p" style="margin:0">Votre espace sera ouvert par votre interlocuteur après le diagnostic. Vous recevrez alors un e-mail pour vous connecter.</p>
      ${contactHtml(null)}</div>
      <div class="ecx-bas"><span>Connecté : ${esc(session?.user?.email || '')}</span><button type="button" class="ec-lien" id="ec-deco">Se déconnecter</button></div>`);
    lierBas();
  }

  const lire = (p) => p.then((r) => r, () => ({ data: [] }));
  async function afficherDossier() {
    const d = dossiers.find((x) => x.dossier_id === courant);
    const [{ data: photos }, { data: docs }, { data: aSigner }, { data: objets }, { data: journal }, { data: decisions }, { data: listings }] = await Promise.all([
      lire(sb.from('photos_partagees').select('chemin, legende, ordre, moment').eq('dossier_id', courant).order('ordre')),
      lire(sb.from('documents').select('id, chemin, type, nom, date').eq('dossier_id', courant).order('date', { ascending: false })),
      apercu
        ? lire(sb.from('bons').select('id, dossier_id, numero, marque, data').eq('dossier_id', courant).not('signe_porteur_le', 'is', null).is('signe_client_le', null)).then((r) => ({ data: (r.data || []).filter((x) => x.data?.signatures?.distance).map((x) => ({ ...x, resume: x.data })) }))
        : lire(sb.rpc('bon_a_signer')),
      lire(sb.from('objets_conserves').select('id, nom, piece, destinataire, note, photo, photos, valide_le, valide_par').eq('dossier_id', courant).order('ordre').order('created_at')),
      lire(sb.from('journal').select('id, quand, type, titre, texte').eq('dossier_id', courant).order('quand', { ascending: false }).limit(60)),
      lire(sb.from('decisions').select('id, posee_le, question, choix, statut, reponse, decide_par, decide_le').eq('dossier_id', courant).order('posee_le', { ascending: false })),
      lire(sb.from('listings_objets').select('version, signe_le, nom').eq('dossier_id', courant).order('version', { ascending: false }).limit(1)),
    ]);
    const L = {
      photos: photos || [], docs: docs || [], objets: Array.isArray(objets) ? objets : [], journal: journal || [], decisions: decisions || [],
      listing: (listings || [])[0] || null, bons: (Array.isArray(aSigner) ? aSigner : []).filter((b) => b.dossier_id === courant),
    };
    afficher(dossierHtml(d, L));
    lierDossier(d, L);
  }

  /* ---------- Tableau de bord du dossier ---------- */
  function dossierHtml(d, L) {
    const etapes = ETAPES.map(([cle, nom]) => ({ cle, nom, ...((d.etapes || []).find((e) => e.cle === cle) || { etat: 'a_venir' }) }));
    const iCours = etapes.findIndex((e) => e.etat === 'en_cours');
    const iEtape = iCours >= 0 ? iCours : Math.max(0, etapes.findIndex((e) => e.etat === 'a_venir'));
    const termine = etapes.every((e) => e.etat === 'termine');
    const taches = Array.isArray(d.taches) ? d.taches : [];
    const tFait = taches.filter((t) => t.etat === 'fait').length;
    const avancement = taches.length ? Math.round(tFait / taches.length * 100) : Math.round(etapes.filter((e) => e.etat === 'termine').length / etapes.length * 100);
    const pieces = Array.isArray(d.pieces) ? d.pieces : [];
    const volume = pieces.reduce((s, p) => s + (Number(p.volume) || 0), 0);
    const dons = pieces.reduce((s, p) => s + (Number(p.dons_volume) || 0), 0);
    const triees = pieces.filter((p) => p.tri === 'trie').length;
    const bien = d.bien || {}, prochain = d.prochain || {};
    const nonValides = L.objets.filter((o) => !o.valide_le).length;
    const decAttente = L.decisions.filter((x) => x.statut === 'attente');
    const famille = taches.filter((t) => t.cote === 'famille' && t.etat !== 'fait');
    const nbAction = L.bons.length + decAttente.length + (nonValides ? 1 : 0) + famille.length;
    const cles = etapes.find((e) => e.cle === 'cles');
    const titre = bien.famille ? `Bonjour, ${bien.famille}.` : (d.titre || `Formule ${FORMULES[d.formule] || ''}`);
    const sousTitre = [bien.famille ? d.titre : '', d.adresse || (d.ville ? 'Logement à ' + d.ville : '')].filter(Boolean).join(' · ');

    // Prochain rendez-vous (ou étape en cours, à défaut).
    const pd = prochain.date ? new Date(prochain.date + 'T12:00:00') : null;
    const carte = pd && !isNaN(pd) ? `<aside class="ecx-next">
        <span class="ecx-next-lbl">Prochain rendez-vous</span>
        <div class="ecx-next-date"><b>${pd.getDate()}</b><span>${esc(pd.toLocaleDateString('fr-FR', { month: 'short' }))}<br>${esc(pd.toLocaleDateString('fr-FR', { weekday: 'long' }))}</span></div>
        ${prochain.titre ? `<p class="ecx-next-t">${esc(prochain.titre)}</p>` : ''}
        <p class="ecx-next-d">${esc([prochain.horaire, prochain.detail].filter(Boolean).join(' · '))}</p>
        <a class="ecx-next-l" href="#contact">Une question ? Appeler votre interlocuteur →</a>
      </aside>` : `<aside class="ecx-next">
        <span class="ecx-next-lbl">${termine ? 'Accompagnement' : 'Étape en cours'}</span>
        <p class="ecx-next-t">${termine ? 'Terminé. Merci pour votre confiance.' : esc(etapes[iEtape].nom)}</p>
        ${!termine && etapes[iEtape].message ? `<p class="ecx-next-d">${esc(etapes[iEtape].message)}</p>` : ''}
        <a class="ecx-next-l" href="#contact">Une question ? Appeler votre interlocuteur →</a>
      </aside>`;

    const kpis = [
      ['Avancement', `${avancement} %`, taches.length ? `${tFait} tâches sur ${taches.length}` : `Étape ${iEtape + 1} sur 5`],
      pieces.length ? ['Pièces triées', `${triees} / ${pieces.length}`, triees < pieces.length ? pieces.filter((p) => p.tri !== 'trie').map((p) => p.nom).slice(0, 3).join(', ').toLowerCase() + (pieces.length - triees > 3 ? '…' : '') + ' en cours' : 'tri terminé'] : null,
      L.objets.length ? ['Objets conservés', String(L.objets.length), nonValides ? 'listing à signer' : `listing signé${L.listing ? ' (v' + L.listing.version + ')' : ''}`] : null,
      volume ? ['Volume à évacuer', m3(volume), dons ? `dont ${m3(dons)} de dons` : 'estimation au diagnostic'] : null,
      cles?.date ? [cles.etat === 'termine' ? 'Clés remises' : 'Remise des clés', jourCourt(cles.date), cles.message ? cles.message.slice(0, 40) : ''] : null,
    ].filter(Boolean);

    const sections = [['faire', 'À faire', nbAction], ['avancement', 'Avancement'], L.journal.length && ['journal', 'Journal'], L.decisions.length && ['decisions', 'Décisions'],
      (Object.keys(bien).some((k) => k !== 'famille' && bien[k]) || pieces.length) && ['logement', 'Le logement'], L.objets.length && ['objets', 'Objets conservés'],
      ['documents', 'Documents'], L.photos.length && ['photos', 'Photos'], ['contact', 'Contacts']].filter(Boolean);

    return `
      <section class="hero ecx-top">${fond ? `<img class="hero-img" id="ecx-fond" src="${esc(fond)}" alt="">` : ''}
        <div class="w ecx-hero">
          <div class="ecx-hero-txt">
            ${dossiers.length > 1 ? `<div class="ec-choix" role="group" aria-label="Choisir le dossier">${dossiers.map((x) => `<button type="button" data-dossier="${esc(x.dossier_id)}" aria-pressed="${x.dossier_id === courant}">${esc(x.titre || FORMULES[x.formule] || 'Dossier')}${x.ville ? ' · ' + esc(x.ville) : ''}</button>`).join('')}</div>` : ''}
            <span class="lbl">Votre espace client${d.reference ? ' · Dossier n° ' + esc(d.reference) : ''}</span>
            <h1 class="h1">${esc(titre)}</h1>
            <p class="lead">${esc(sousTitre || 'Formule ' + (FORMULES[d.formule] || ''))}</p>
            <div class="ecx-prog" aria-label="Avancement : ${avancement} %">
              <div class="ecx-prog-barre"><span style="width:${avancement}%"></span></div>
              <span>${termine ? 'Accompagnement terminé' : `Étape ${iEtape + 1} sur 5 · ${esc(etapes[iEtape].nom)}${etapes[iEtape].etat === 'en_cours' ? ' en cours' : ''}`}${taches.length ? ` · ${tFait} tâches faites sur ${taches.length}` : ''}</span>
            </div>
          </div>
          ${carte}
        </div>
      </section>
      <nav class="ecx-nav" aria-label="Sections de votre espace"><div class="w ecx-nav-in">
        ${sections.map(([k, l, n]) => `<a href="#${k}">${l}${n ? ` <span class="ecx-pastille">${n}</span>` : ''}</a>`).join('')}
      </div></nav>
      <div class="ecx"><div class="w ecx-w">
        <div class="ecx-kpis" style="--n:${kpis.length}">${kpis.map(([a, b, c]) => `<div><span>${esc(a)}</span><b>${esc(b)}</b><small>${esc(c)}</small></div>`).join('')}</div>
        ${aFaireHtml(taches, L, nonValides, decAttente, famille)}
        ${avancementHtml(etapes, taches)}
        ${journalHtml(L.journal)}
        ${decisionsHtml(L.decisions)}
        ${logementHtml(d, bien, pieces, volume, dons, triees)}
        ${objetsHtml(L, nonValides)}
        ${documentsHtml(L.docs, termine)}
        ${photosHtml(L.photos)}
        <section id="contact" class="ecx-contact">
          <div class="ecx-contact-c">
            <span class="lbl" style="color:#C9B48F">Votre interlocuteur</span>
            <h2 class="h2" style="color:#fff">${d.interlocuteur?.nom ? esc(d.interlocuteur.nom) + ' vous accompagne.' : 'Une seule personne, du diagnostic à la remise des clés.'}</h2>
            <p>Une question, un imprévu, un objet oublié ? Nous sommes joignables directement.</p>
            ${contactBoutons(d.interlocuteur)}
          </div>
        </section>
        ${(d.contacts || []).length ? `<div class="ecx-contacts">${d.contacts.map((c) => `<div class="ecx-panneau ecx-ct"><span class="ecx-avatar clair" aria-hidden="true">${esc(initiales(c.nom))}</span><div><b>${esc(c.nom)}</b>${c.role ? `<span>${esc(c.role)}</span>` : ''}${c.detail ? `<small>${esc(c.detail)}</small>` : ''}</div></div>`).join('')}</div>` : ''}
        ${basHtml()}
      </div></div>`;
  }

  function aFaireHtml(taches, L, nonValides, decAttente, famille) {
    const vous = [
      ...(nonValides ? [`<li><div><b>Signer le listing des objets conservés</b><span>${L.objets.length} objet${L.objets.length > 1 ? 's' : ''}${nonValides < L.objets.length ? `, dont ${nonValides} nouveau${nonValides > 1 ? 'x' : ''} ou modifié${nonValides > 1 ? 's' : ''}` : ''} · rien ne part avant votre signature</span></div><a class="ecx-b plein" href="#objets">Relire et signer</a></li>`] : []),
      ...decAttente.map((x) => `<li><div><b>${esc(x.question)}</b><span>Question posée le ${esc(jourCourt(x.posee_le))}</span></div><a class="ecx-b" href="#decisions">Répondre</a></li>`),
      ...L.bons.map((b) => `<li><div><b>Signer le bon d'intervention n° ${esc(b.numero)}</b><span>À relire et signer ci-dessous</span></div><a class="ecx-b plein" href="#bon-${esc(b.id)}">Signer</a></li>`),
      ...famille.map((t) => `<li><div><b>${esc(t.libelle)}</b><span>${t.date ? 'Pour le ' + esc(jourCourt(t.date)) + ' · ' : ''}Prévenez votre interlocuteur quand c'est fait</span></div><a class="ecx-b" href="#contact">Contacter</a></li>`),
    ];
    const nous = taches.filter((t) => t.cote !== 'famille');
    const aFaire = nous.filter((t) => t.etat !== 'fait').sort((a, b) => String(a.date || '9').localeCompare(String(b.date || '9'))).slice(0, 6);
    const faits = nous.filter((t) => t.etat === 'fait').sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 4).reverse();
    const ligne = (t) => `<li class="${t.etat === 'fait' ? 'ok' : t.etat === 'en_cours' ? 'cours' : ''}"><i>${t.etat === 'fait' ? coche : ''}</i>${esc(t.libelle)}<span>${esc(jourCourt(t.date))}</span></li>`;
    return `<section id="faire" class="ecx-sec">
      <header class="ecx-sec-h"><span class="lbl">À faire</span><h2 class="h2">Ce qui reste à faire</h2></header>
      ${L.bons.map(bonHtml).join('')}
      <div class="ecx-duo2">
        <div class="ecx-panneau">
          <div class="ecx-panneau-h"><h3>De votre côté</h3>${vous.length ? `<span class="ecx-badge attente">${vous.length} en attente</span>` : '<span class="ecx-badge ok">Rien à faire</span>'}</div>
          ${vous.length ? `<ul class="ecx-actions">${vous.join('')}</ul>` : `<p class="ecx-vide">Rien ne vous est demandé pour l'instant. Nous vous préviendrons ici dès qu'une signature ou une réponse sera nécessaire.</p>`}
        </div>
        <div class="ecx-panneau">
          <div class="ecx-panneau-h"><h3>De notre côté</h3>${nous.length ? `<span class="ecx-mini">${nous.filter((t) => t.etat === 'fait').length} sur ${nous.length} faits</span>` : ''}</div>
          ${nous.length ? `<ul class="ecx-check">${[...faits, ...aFaire].map(ligne).join('')}</ul>` : `<p class="ecx-vide">Le détail des tâches apparaîtra ici au fil de l'accompagnement.</p>`}
        </div>
      </div>
    </section>`;
  }

  function avancementHtml(etapes, taches) {
    return `<section id="avancement" class="ecx-sec">
      <header class="ecx-sec-h"><span class="lbl">Avancement</span><h2 class="h2">Où en est votre accompagnement</h2></header>
      <ol class="ecx-frise">${etapes.map((e, i) => `<li class="${esc(e.etat)}"><span class="ecx-rond" aria-hidden="true">${e.etat === 'termine' ? coche : i + 1}</span><b>${esc(e.nom)}</b>
        <span>${e.etat === 'termine' ? (e.date ? 'Fait le ' + esc(jourCourt(e.date)) : 'Terminé') : e.etat === 'en_cours' ? 'En cours' + (e.date ? ', prévu le ' + esc(jourCourt(e.date)) : '') : e.date ? 'Prévu le ' + esc(jourCourt(e.date)) : 'À venir'}</span></li>`).join('')}</ol>
      <div class="ecx-phases">${etapes.map((e, i) => {
        const tp = taches.filter((t) => t.phase === e.cle);
        if (!tp.length && !e.message) return '';
        return `<details class="ecx-phase ${esc(e.etat)}"${e.etat === 'en_cours' ? ' open' : ''}>
          <summary><span class="ecx-num">${e.etat === 'termine' ? coche : i + 1}</span><b>${esc(e.nom)}</b><span class="ecx-quand">${esc(ETATS[e.etat] || '')}${e.date ? ' · ' + esc(jourCourt(e.date)) : ''}</span>${tp.length ? `<span class="ecx-mini">${tp.filter((t) => t.etat === 'fait').length}/${tp.length}</span>` : ''}</summary>
          ${e.message ? `<p class="ecx-phase-msg">${esc(e.message)}</p>` : ''}
          ${tp.length ? `<ul class="ecx-check">${tp.map((t) => `<li class="${t.etat === 'fait' ? 'ok' : t.etat === 'en_cours' ? 'cours' : ''}${t.cote === 'famille' && t.etat !== 'fait' ? ' attente' : ''}"><i>${t.etat === 'fait' ? coche : ''}</i>${esc(t.libelle)}<span>${t.cote === 'famille' && t.etat !== 'fait' ? '<em class="ecx-badge attente">Votre action</em>' : esc(jourCourt(t.date))}</span></li>`).join('')}</ul>` : ''}
        </details>`;
      }).join('')}</div>
    </section>`;
  }

  function journalHtml(journal) {
    if (!journal.length) return '';
    const types = [...new Set(journal.map((j) => j.type))];
    return `<section id="journal" class="ecx-sec">
      <header class="ecx-sec-h ecx-sec-h2">
        <div><span class="lbl">Journal</span><h2 class="h2">Tout ce qui s'est passé</h2></div>
        ${types.length > 1 ? `<div class="ecx-filtres" role="group" aria-label="Filtrer le journal"><button type="button" aria-pressed="true" data-filtre="">Tout</button>${types.map((t) => `<button type="button" aria-pressed="false" data-filtre="${esc(t)}">${esc(TJ[t] || t)}</button>`).join('')}</div>` : ''}
      </header>
      <ol class="ecx-journal ecx-panneau">${journal.map((j, i) => `<li data-type="${esc(j.type)}"${i >= 10 ? ' data-plus hidden' : ''}><span class="ecx-pt ${esc(j.type)}" aria-hidden="true"></span><time datetime="${esc(j.quand)}">${esc(quandFr(j.quand))}</time>
        <div><span class="ecx-type ${esc(j.type)}">${esc(TJ[j.type] || '')}</span><b>${esc(j.titre)}</b>${j.texte ? `<p>${esc(j.texte)}</p>` : ''}</div></li>`).join('')}
        ${journal.length > 10 ? `<li class="ecx-plus"><button type="button" class="ec-lien" id="ecx-plus">Voir les ${journal.length - 10} événements plus anciens</button></li>` : ''}
      </ol>
    </section>`;
  }

  function decisionsHtml(decisions) {
    if (!decisions.length) return '';
    return `<section id="decisions" class="ecx-sec">
      <header class="ecx-sec-h"><span class="lbl">Décisions</span><h2 class="h2">Ce qui a été décidé, par qui et quand</h2></header>
      ${decisions.filter((x) => x.statut === 'attente').map((x) => `<div class="ecx-question" data-decision="${esc(x.id)}">
        <div><span class="ecx-badge attente">Votre réponse est attendue</span><b>${esc(x.question)}</b><span>Question posée le ${esc(jourCourt(x.posee_le))}. Votre réponse est datée et visible par vos proches.</span></div>
        <div class="ecx-question-r">${(x.choix || []).length ? x.choix.map((c) => `<button type="button" class="ecx-b" data-choix="${esc(c)}">${esc(c)}</button>`).join('') : `<input type="text" maxlength="500" placeholder="Votre réponse" aria-label="Votre réponse"><button type="button" class="ecx-b plein" data-envoyer>Envoyer</button>`}</div>
        <div class="ec-msg" role="status" hidden></div>
      </div>`).join('')}
      <div class="ecx-panneau ecx-tab"><table>
        <thead><tr><th>Date</th><th>Décision</th><th>Décidé par</th><th>Statut</th></tr></thead>
        <tbody>${decisions.map((x) => `<tr class="${x.statut === 'attente' ? 'attente' : ''}"><td class="ecx-gris">${esc(jourCourt(x.decide_le || x.posee_le))}</td><td><b>${esc(x.question)}</b>${x.reponse ? `<br><span class="ecx-gris">${esc(x.reponse)}</span>` : ''}</td><td>${esc(x.decide_par || '—')}</td><td>${x.statut === 'validee' ? '<span class="ecx-badge ok">Validée</span>' : '<span class="ecx-badge attente">En attente</span>'}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>`;
  }

  function logementHtml(d, bien, pieces, volume, dons, triees) {
    const fiche = [['Adresse', d.adresse], ...BIEN.map(([k, l]) => [l, bien[k]])].filter(([, v]) => v);
    if (!fiche.length && !pieces.length) return '';
    return `<section id="logement" class="ecx-sec">
      <header class="ecx-sec-h"><span class="lbl">Le logement</span><h2 class="h2">${esc(bien.type || 'Le logement')}</h2></header>
      <div class="ecx-bien${pieces.length && fiche.length ? '' : ' seul'}">
        ${fiche.length ? `<dl class="ecx-fiche ecx-panneau">${fiche.map(([l, v]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
        ${pieces.length ? `<div class="ecx-panneau ecx-tab"><table>
          <thead><tr><th>Pièce</th><th>Tri</th><th>Conservés</th><th>Dons</th><th>Évacuation</th></tr></thead>
          <tbody>${pieces.map((p) => { const [t, c] = TRI[p.tri] || TRI.a_trier; return `<tr><td><b>${esc(p.nom)}</b></td><td><span class="ecx-badge ${c}">${t}</span></td><td>${esc(p.conserves ?? '—')}</td><td>${esc(p.dons || '—')}</td><td>${p.volume ? esc(m3(p.volume)) + (p.tri === 'trie' ? '' : ' (est.)') : '—'}</td></tr>`; }).join('')}</tbody>
          <tfoot><tr><td>Total</td><td>${triees} / ${pieces.length}</td><td>${pieces.reduce((s, p) => s + (Number(p.conserves) || 0), 0)}</td><td>${dons ? esc(m3(dons)) : ''}</td><td>${volume ? esc(m3(volume)) : ''}</td></tr></tfoot>
        </table></div>` : ''}
      </div>
    </section>`;
  }

  function objetsHtml(L, nonValides) {
    if (!L.objets.length) return '';
    const pdf = L.docs.find((x) => /objets-conserves\.pdf$/.test(x.chemin));
    const premiere = (o) => (o.photos || [])[0] || o.photo;
    const nbPh = (o) => (o.photos || []).length || (o.photo ? 1 : 0);
    return `<section id="objets" class="ecx-sec">
      <header class="ecx-sec-h"><span class="lbl">Objets conservés</span><h2 class="h2">Le listing des objets mis de côté</h2></header>
      <div class="ecx-signature${nonValides ? '' : ' signe'}">
        <div>${nonValides ? '<span class="ecx-badge attente">Non signé</span>' : '<span class="ecx-badge ok">Signé</span>'}
          <b>${L.objets.length} objet${L.objets.length > 1 ? 's' : ''}${L.listing ? ` · version ${L.listing.version + (nonValides ? 1 : 0)}` : ''}</b>
          <span>${nonValides ? (L.listing ? `La version ${L.listing.version} a été signée par ${esc(L.listing.nom)} le ${esc(jourCourt(L.listing.signe_le))}. Le listing a changé depuis : une nouvelle signature est nécessaire.` : 'Rien ne part du logement avant votre signature. Toute modification après signature crée une nouvelle version à signer.') : `Signé par ${esc(L.listing?.nom || '')} le ${esc(dateFr(L.listing?.signe_le))}. Toute modification créera une nouvelle version à signer.`}</span></div>
        ${pdf ? `<button type="button" class="ecx-b" data-doc="${esc(pdf.chemin)}">Ouvrir le PDF</button>` : ''}
        ${nonValides ? '<button type="button" class="ecx-b plein" id="ecx-signer-ouvrir">Signer le listing</button>' : ''}
      </div>
      <div class="ecx-panneau ecx-signer" id="ecx-signer" hidden>
        <div class="ecx-panneau-h"><h3>Signer le listing</h3><button type="button" class="ec-lien" id="ecx-signer-fermer">Annuler</button></div>
        <div class="ecx-signer-c">
          <p class="p" style="margin:0">En signant, vous confirmez que les ${L.objets.length} objets ci-dessous sont à conserver pour les destinataires indiqués. Tout ce qui n'y figure pas pourra être donné, recyclé ou évacué selon le devis.</p>
          <label>Votre nom<input type="text" id="ecx-signer-nom" maxlength="120" autocomplete="name"></label>
          <span class="ec-bon-lbl">Votre signature, au doigt ou à la souris</span>
          <canvas class="ec-pad" aria-label="Zone de signature"></canvas>
          <div class="ec-contact"><button type="button" class="btn2" id="ecx-signer-effacer">Effacer</button><button type="button" class="btn" id="ecx-signer-ok">Je signe le listing</button></div>
          <div class="ec-msg" id="ecx-signer-msg" role="status" hidden></div>
        </div>
      </div>
      <div class="ecx-panneau ecx-tab"><table>
        <thead><tr><th>N°</th><th>Objet</th><th>Pièce</th><th>Destinataire</th><th>Photos</th></tr></thead>
        <tbody>${L.objets.map((o, i) => `<tr class="${o.valide_le ? '' : 'attente'}"><td class="ecx-gris">${String(i + 1).padStart(2, '0')}</td>
          <td><span class="ecx-obj">${premiere(o) ? `<span class="ecx-vign"><img alt="" data-ph="${esc(premiere(o))}"></span>` : '<span class="ecx-vign vide"></span>'}<span><b>${esc(o.nom)}</b>${o.note ? `<br><span class="ecx-gris">${esc(o.note)}</span>` : ''}</span></span></td>
          <td>${esc(o.piece || '—')}</td><td>${esc(o.destinataire || 'La famille')}</td>
          <td>${nbPh(o) ? `<button type="button" class="ec-lien" data-photos="${esc(JSON.stringify((o.photos || []).length ? o.photos : [o.photo]))}">${nbPh(o)} photo${nbPh(o) > 1 ? 's' : ''}</button>` : '<span class="ecx-gris">—</span>'}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>`;
  }

  function documentsHtml(docs, termine) {
    const types = new Set(docs.map((x) => x.type));
    const avenir = termine ? [] : [['bon_intervention', "Bons d'intervention signés"], ['etat_des_lieux', 'État des lieux de sortie'], ['facture', 'Facture finale']].filter(([t]) => !types.has(t) || t === 'facture');
    return `<section id="documents" class="ecx-sec">
      <header class="ecx-sec-h"><span class="lbl">Documents</span><h2 class="h2">Vos documents</h2></header>
      <div class="ecx-panneau ecx-tab"><table>
        <thead><tr><th>Type</th><th>Document</th><th>Date</th><th></th></tr></thead>
        <tbody>${docs.map((x) => `<tr><td><span class="ecx-doc">${icDoc}${esc(TYPES_DOC[x.type] || 'Document')}</span></td><td><b>${esc(x.nom)}</b></td><td class="ecx-gris">${esc(dateFr(x.date))}</td><td class="ecx-dr"><button type="button" class="ec-lien" data-doc="${esc(x.chemin)}">Ouvrir</button></td></tr>`).join('')}
          ${avenir.map(([t, n]) => `<tr class="avenir"><td><span class="ecx-doc">${icDoc}${esc(TYPES_DOC[t])}</span></td><td><b>${esc(n)}</b></td><td></td><td class="ecx-dr"><span class="ecx-gris">À venir</span></td></tr>`).join('')}
          ${!docs.length && !avenir.length ? '<tr><td colspan="4" class="ecx-gris">Les documents de votre dossier apparaîtront ici.</td></tr>' : ''}</tbody>
      </table></div>
    </section>`;
  }

  function photosHtml(photos) {
    if (!photos.length) return '';
    const av = photos.find((p) => p.moment === 'avant'), ap = photos.find((p) => p.moment === 'apres');
    const autres = photos.filter((p) => p !== av && p !== ap);
    return `<section id="photos" class="ecx-sec">
      <header class="ecx-sec-h"><span class="lbl">Photos</span><h2 class="h2">${av && ap ? 'Le logement, avant et après' : 'Les photos de votre accompagnement'}</h2></header>
      ${av && ap ? `<div class="ecx-avap" id="ecx-avap">
        <img class="ecx-avap-apres" alt="${esc(ap.legende || 'Après')}" data-ph="${esc(ap.chemin)}">
        <div class="ecx-avap-avant"><img alt="${esc(av.legende || 'Avant')}" data-ph="${esc(av.chemin)}"></div>
        <span class="ecx-avap-tag g">Avant</span><span class="ecx-avap-tag d">Après</span>
        <input type="range" min="0" max="100" value="50" aria-label="Comparer avant et après">
        <span class="ecx-avap-ligne" aria-hidden="true"></span>
      </div>
      <p class="ecx-legende">${esc(ap.legende || av.legende || '')}${ap.legende || av.legende ? ' · ' : ''}glissez pour comparer · ${photos.length} photo${photos.length > 1 ? 's' : ''} au total</p>` : ''}
      ${autres.length ? `<div class="ecx-galerie">${autres.map((p, i) => `<figure${i >= 8 ? ' data-plus hidden' : ''}><a href="#" data-photo="${esc(p.chemin)}" aria-label="Agrandir${p.legende ? ' : ' + esc(p.legende) : ''}"><img alt="${esc(p.legende || 'Photo ' + (i + 1))}" data-ph="${esc(p.chemin)}" loading="lazy"></a>${p.legende ? `<figcaption>${esc(p.legende)}</figcaption>` : ''}</figure>`).join('')}</div>
        ${autres.length > 8 ? `<button type="button" class="ec-lien" id="ecx-photos-plus">Voir les ${autres.length - 8} autres photos</button>` : ''}` : ''}
    </section>`;
  }

  /* ---------- Interactions ---------- */
  function lierDossier(d, L) {
    racine.querySelectorAll('[data-dossier]').forEach((b) => b.onclick = () => { courant = b.dataset.dossier; afficherDossier(); });
    racine.querySelectorAll('.ec-bon').forEach((c) => { c.id = 'bon-' + c.dataset.bon; if (!apercu) lierBon(sb, c, () => afficherDossier()); });

    // Photos : liens signés temporaires (une seule demande pour toutes les images de la page).
    const chemins = [...new Set([...racine.querySelectorAll('[data-ph]')].map((x) => x.dataset.ph))];
    if (d.couverture) chemins.push(d.couverture);
    if (chemins.length) sb.storage.from('photos').createSignedUrls(chemins, 3600).then(({ data: urls }) => (urls || []).forEach((u) => {
      if (!u.signedUrl) return;
      if (u.path === d.couverture) { const f = racine.querySelector('#ecx-fond'); if (f) f.src = u.signedUrl; else racine.querySelector('.ecx-top')?.insertAdjacentHTML('afterbegin', `<img class="hero-img" src="${esc(u.signedUrl)}" alt="">`); }
      racine.querySelectorAll(`[data-ph="${CSS.escape(u.path)}"]`).forEach((im) => { im.src = u.signedUrl; });
      racine.querySelectorAll(`[data-photo="${CSS.escape(u.path)}"]`).forEach((a) => { a.href = u.signedUrl; a.target = '_blank'; a.rel = 'noopener'; });
    }));
    racine.querySelectorAll('[data-photos]').forEach((b) => b.onclick = async () => {
      const liste = JSON.parse(b.dataset.photos || '[]').filter(Boolean);
      const { data: urls } = await sb.storage.from('photos').createSignedUrls(liste, 600);
      const ok = (urls || []).filter((u) => u.signedUrl);
      if (!ok.length) { alert("Ces photos ne sont pas disponibles pour l'instant."); return; }
      const v = document.createElement('dialog'); v.className = 'ecx-visio';
      v.innerHTML = `<div class="ecx-visio-in">${ok.map((u) => `<img src="${esc(u.signedUrl)}" alt="">`).join('')}</div><button type="button" class="ecx-b" autofocus>Fermer</button>`;
      document.body.appendChild(v); v.querySelector('button').onclick = () => v.close(); v.onclose = () => v.remove(); v.showModal();
    });

    // Comparateur avant / après.
    const av = racine.querySelector('#ecx-avap');
    if (av) { const r = av.querySelector('input'); const maj = () => av.style.setProperty('--pos', r.value + '%'); r.oninput = maj; maj(); }

    // Filtres et suite du journal, suite de la galerie.
    racine.querySelectorAll('.ecx-filtres button').forEach((b) => b.onclick = () => {
      racine.querySelectorAll('.ecx-filtres button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      racine.querySelectorAll('.ecx-journal li[data-type]').forEach((li) => { li.hidden = (b.dataset.filtre && li.dataset.type !== b.dataset.filtre) || (!b.dataset.filtre && li.hasAttribute('data-plus') && !racine.querySelector('#ecx-journal-tout')); });
      const plus = racine.querySelector('#ecx-plus'); if (plus) plus.parentElement.hidden = !!b.dataset.filtre;
    });
    const plus = racine.querySelector('#ecx-plus');
    if (plus) plus.onclick = () => { racine.querySelectorAll('.ecx-journal li[data-plus]').forEach((li) => { li.hidden = false; }); plus.id = 'ecx-journal-tout'; plus.parentElement.hidden = true; };
    const pp = racine.querySelector('#ecx-photos-plus');
    if (pp) pp.onclick = () => { racine.querySelectorAll('.ecx-galerie [data-plus]').forEach((f) => { f.hidden = false; }); pp.hidden = true; };

    // Documents : liens signés de courte durée.
    racine.querySelectorAll('[data-doc]').forEach((b) => b.onclick = async () => {
      const fenetre = window.open('', '_blank');
      const { data, error } = await sb.storage.from('documents').createSignedUrl(b.dataset.doc, 300);
      if (error || !data?.signedUrl) { fenetre?.close(); alert("Ce document n'est pas disponible pour l'instant."); return; }
      if (fenetre) fenetre.location = data.signedUrl; else location.href = data.signedUrl;
    });

    // Réponse aux décisions.
    racine.querySelectorAll('[data-decision]').forEach((q) => {
      const envoyer = async (reponse, bouton) => {
        if (apercu) return;
        if (!reponse.trim()) { message('Écrivez votre réponse.', true, `[data-decision="${q.dataset.decision}"] .ec-msg`); return; }
        q.querySelectorAll('button, input').forEach((x) => { x.disabled = true; });
        const { error } = await sb.rpc('repondre_decision', { p_id: q.dataset.decision, p_reponse: reponse });
        if (error) { q.querySelectorAll('button, input').forEach((x) => { x.disabled = false; }); const m = q.querySelector('.ec-msg'); m.hidden = false; m.className = 'ec-msg alerte'; m.textContent = "Votre réponse n'a pas pu être enregistrée. Vérifiez votre connexion internet et réessayez."; return; }
        afficherDossier();
      };
      q.querySelectorAll('[data-choix]').forEach((b) => b.onclick = () => envoyer(b.dataset.choix, b));
      const env = q.querySelector('[data-envoyer]'); if (env) env.onclick = () => envoyer(q.querySelector('input').value, env);
    });

    // Signature du listing des objets conservés.
    const ouvrir = racine.querySelector('#ecx-signer-ouvrir'), boite = racine.querySelector('#ecx-signer');
    if (ouvrir && boite) {
      let pad = null;
      ouvrir.onclick = () => { boite.hidden = false; ouvrir.hidden = true; pad = creerPad(boite.querySelector('canvas')); boite.scrollIntoView({ behavior: 'smooth', block: 'center' }); racine.querySelector('#ecx-signer-nom').focus(); };
      racine.querySelector('#ecx-signer-fermer').onclick = () => { boite.hidden = true; ouvrir.hidden = false; };
      racine.querySelector('#ecx-signer-effacer').onclick = () => pad?.effacer();
      racine.querySelector('#ecx-signer-ok').onclick = async (e) => {
        const nom = racine.querySelector('#ecx-signer-nom').value.trim();
        if (!nom) { message('Indiquez votre nom.', true, '#ecx-signer-msg'); return; }
        if (!pad || pad.vide()) { message('Signez dans le cadre.', true, '#ecx-signer-msg'); return; }
        e.target.disabled = true; message('Signature en cours…', false, '#ecx-signer-msg');
        const { error } = await sb.rpc('signer_listing_objets', { p_dossier: courant, p_nom: nom, p_img: pad.image() });
        e.target.disabled = false;
        if (error) { message("La signature n'a pas pu être enregistrée. Vérifiez votre connexion internet et réessayez.", true, '#ecx-signer-msg'); return; }
        afficherDossier();
      };
    }

    if (apercu) racine.querySelectorAll('.ec-bon button, .ec-bon input, .ec-bon canvas, #ecx-signer-ouvrir, [data-decision] button, [data-decision] input').forEach((el) => { el.disabled = true; el.style.pointerEvents = 'none'; el.style.opacity = '.5'; });
    lierBas();
  }

  function contactBoutons(interlocuteur) {
    const tel = interlocuteur?.tel || contact.telephone;
    const lien = telLien(tel) || contact.lienTelephone;
    return `<div class="ecx-contact-b">${lien ? `<a class="btn ecx-btn-clair" href="${esc(lien)}">Appeler ${esc(tel)}</a>` : ''}<a class="ecx-btn-ligne" href="/contact#formulaire">Nous écrire</a></div>`;
  }
  function contactHtml(interlocuteur) {
    const nom = interlocuteur?.nom, tel = interlocuteur?.tel || contact.telephone;
    const lien = telLien(tel) || contact.lienTelephone;
    return `<p class="p" style="margin:0">${nom ? `<strong>${esc(nom)}</strong> vous accompagne. ` : ''}Une question, un imprévu ? Nous sommes joignables directement.</p>
      <div class="ec-contact">${lien ? `<a class="btn" href="${esc(lien)}">Appeler ${esc(tel)}</a>` : ''}<a class="btn2" href="/contact#formulaire">Nous écrire</a></div>`;
  }
  function basHtml() {
    if (apercu) return `<div class="ecx-bas"><span>Aperçu du dossier ${esc(apercu)}</span><button type="button" class="ec-lien" onclick="window.close()">Fermer l'aperçu</button></div>`;
    return `<div class="ecx-bas"><span>Connecté : ${esc(session?.user?.email || '')}</span><button type="button" class="ec-lien" id="ec-deco">Se déconnecter</button></div>`;
  }
  function lierBas() {
    const b = racine.querySelector('#ec-deco');
    if (b) b.onclick = async () => { await sb.auth.signOut(); session = null; parCode = false; ecranConnexion({ texte: 'Vous êtes déconnecté.' }); scrollTo(0, 0); };
  }

  /* ---------- Démarrage ---------- */
  (async () => {
    const erreurUrl = new URLSearchParams(location.hash.slice(1) || location.search).get('error_description');
    try {
      const { data } = await sb.auth.getSession();
      session = data.session;
      if (!session && apercu) return ecranSansDossier();
      if (!session) return ecranConnexion(erreurUrl ? { texte: 'Ce lien de connexion a expiré ou a déjà servi. Demandez un code ci-dessous.', alerte: true } : null);
      if (location.search.includes('code=')) history.replaceState(null, '', '/espace-client');
      await charger();
    } catch (e) {
      ecranConnexion({ texte: "Votre espace n'a pas pu se charger. Vérifiez votre connexion internet, puis réessayez.", alerte: true });
    }
  })();
  if (!apercu) sb.auth.onAuthStateChange((evt, s) => { if (evt === 'SIGNED_IN' && !session && !parCode && s) { session = s; charger().catch(() => {}); } });
}

// Démarrage automatique sur la page /espace-client.
const racine = typeof document !== 'undefined' && document.getElementById('ec-app');
const apercuId = typeof location !== 'undefined' ? (new URLSearchParams(location.hash.slice(1)).get('apercu') || '').replace(/[^a-z0-9]/gi, '') || null : null;
if (racine && !window.__FB_TEST_ESPACE) demarrerEspace(creerClient(!!apercuId), racine, window.__FB_CONTACT || {}, apercuId);
