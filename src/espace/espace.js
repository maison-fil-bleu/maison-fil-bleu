/**
 * Espace client Maison Fil Bleu.
 * Connexion : e-mail seul, puis lien reçu par e-mail. Une famille ne lit que les tables
 * espace_client, photos_partagees et documents de ses propres dossiers (règles d'accès Supabase).
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_CLE_PUBLIQUE } from '../config/supabase';

export function creerClient() {
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

export function demarrerEspace(sb, racine, contact = {}) {
  let session = null, dossiers = [], courant = null;

  function afficher(html) { racine.innerHTML = html; }
  function message(texte, alerte) {
    const el = racine.querySelector('#ec-msg'); if (!el) return;
    el.hidden = !texte; el.className = 'ec-msg' + (alerte ? ' alerte' : ''); el.textContent = texte;
  }

  /* ---------- Connexion ---------- */
  function ecranConnexion(info) {
    afficher(`<h1>Suivez votre dossier, avec vos proches.</h1>
      <p class="lead">Les étapes, les photos et les documents de votre accompagnement, au même endroit. Votre espace est ouvert par votre interlocuteur après le diagnostic.</p>
      <form class="ec-carte" id="ec-form" novalidate>
        <label for="ec-email">Votre adresse e-mail</label>
        <input id="ec-email" type="email" autocomplete="email" inputmode="email" required placeholder="prenom.nom@exemple.fr">
        <button class="btn" type="submit">Recevoir mon lien de connexion</button>
        <div id="ec-msg" class="ec-msg" role="status" hidden></div>
        <p class="p" style="font-size:14px;margin:0">Pas de mot de passe à retenir : vous recevez un lien par e-mail, à ouvrir sur cet appareil.</p>
      </form>`);
    if (info) message(info.texte, info.alerte);
    racine.querySelector('#ec-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = racine.querySelector('#ec-email').value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { message('Saisissez une adresse e-mail valide.', true); return; }
      const bouton = racine.querySelector('#ec-form button'); bouton.disabled = true;
      message('Envoi en cours…');
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + '/espace-client' } });
      bouton.disabled = false;
      const inconnue = error && /Signups not allowed|not found|not allowed/i.test(String(error.message));
      if (error && !inconnue) {
        message(/rate limit|security purposes|too many/i.test(String(error.message)) ? 'Trop de demandes rapprochées : patientez quelques minutes avant de réessayer.' : "L'envoi n'a pas pu se faire. Vérifiez votre connexion internet et réessayez.", true);
        return;
      }
      // Même réponse que l'adresse soit rattachée à un dossier ou non.
      message(`Si cette adresse est rattachée à un dossier, un lien de connexion vient d'y être envoyé. Ouvrez-le sur cet appareil (pensez à vérifier les courriers indésirables). Votre espace sera ouvert par votre interlocuteur après le diagnostic.`);
    };
  }

  /* ---------- Chargement des dossiers ---------- */
  async function charger() {
    const { data, error } = await sb.from('espace_client').select('dossier_id, formule, ville, interlocuteur, etapes, updated_at').order('updated_at', { ascending: false });
    if (error) throw error;
    dossiers = data || [];
    if (!dossiers.length) return ecranSansDossier();
    if (!courant || !dossiers.some((d) => d.dossier_id === courant)) courant = dossiers[0].dossier_id;
    await afficherDossier();
  }
  function ecranSansDossier() {
    afficher(`<h1>Votre espace n'est pas encore ouvert.</h1>
      <div class="ec-carte sable"><p class="p" style="margin:0">Votre espace sera ouvert par votre interlocuteur après le diagnostic. Vous recevrez alors un e-mail pour vous connecter.</p>
      ${contactHtml(null)}</div>
      ${basHtml()}`);
    lierBas();
  }

  async function afficherDossier() {
    const d = dossiers.find((x) => x.dossier_id === courant);
    const [{ data: photos }, { data: docs }, { data: aSigner }, { data: objets }] = await Promise.all([
      sb.from('photos_partagees').select('chemin, legende, ordre').eq('dossier_id', courant).order('ordre'),
      sb.from('documents').select('id, chemin, type, nom, date').eq('dossier_id', courant).order('date', { ascending: false }),
      sb.rpc('bon_a_signer').then((r) => r, () => ({ data: [] })),
      sb.from('objets_conserves').select('id, nom, destinataire, note, photo, valide_le, valide_par').eq('dossier_id', courant).order('ordre').order('created_at').then((r) => r, () => ({ data: [] })),
    ]);
    const listeObjets = Array.isArray(objets) ? objets : [];
    const aValider = listeObjets.filter((o) => !o.valide_le).length;
    const bonsASigner = (Array.isArray(aSigner) ? aSigner : []).filter((b) => b.dossier_id === courant);
    const etapes = ETAPES.map(([cle, nom]) => ({ nom, ...((d.etapes || []).find((e) => e.cle === cle) || { cle, etat: 'a_venir' }) }));
    const enCours = etapes.find((e) => e.etat === 'en_cours') || etapes.find((e) => e.etat === 'a_venir');
    afficher(`
      ${dossiers.length > 1 ? `<div class="ec-choix" role="group" aria-label="Choisir le dossier">${dossiers.map((x) => `<button type="button" data-dossier="${esc(x.dossier_id)}" aria-pressed="${x.dossier_id === courant}">${esc(FORMULES[x.formule] || 'Dossier')}${x.ville ? ' · ' + esc(x.ville) : ''}</button>`).join('')}</div>` : ''}
      <div class="ec-entete">
        <h1>Formule ${esc(FORMULES[d.formule] || '')}</h1>
        <span class="ec-meta">${d.ville ? 'Logement à ' + esc(d.ville) : ''}${enCours ? ` · Étape en cours : ${esc(enCours.nom)}` : ' · Accompagnement terminé'}</span>
      </div>
      <div class="ec-carte">
        <h2>Les étapes</h2>
        <ol class="ec-frise">${etapes.map((e) => `<li class="${esc(e.etat)}"><span class="ec-point" aria-hidden="true"></span>
          <div class="ec-etape"><b>${esc(e.nom)}</b><span class="ec-etat">${esc(ETATS[e.etat] || '')}</span>${e.date ? `<span class="ec-date">${e.etat === 'termine' ? 'le ' : 'prévu le '}${esc(dateFr(e.date))}</span>` : ''}</div>
          ${e.message ? `<p class="ec-texte">${esc(e.message)}</p>` : ''}</li>`).join('')}</ol>
      </div>
      ${(photos || []).length ? `<div class="ec-carte"><h2>Photos</h2><div class="ec-galerie" id="ec-galerie">${photos.map((p, i) => `<a href="#" data-photo="${esc(p.chemin)}" aria-label="Agrandir la photo ${i + 1}${p.legende ? ' : ' + esc(p.legende) : ''}"><img alt="${esc(p.legende || 'Photo du logement ' + (i + 1))}" loading="lazy"></a>`).join('')}</div></div>` : ''}
      ${bonsASigner.map(bonHtml).join('')}
      ${listeObjets.length ? `<div class="ec-carte" id="ec-objets"><h2>Objets conservés</h2>
        <p class="p" style="margin:0">Ce qui est mis de côté pour vous et vos proches, avec son destinataire.${aValider ? ' Vérifiez la liste puis validez-la : en cas d\'oubli ou d\'erreur, appelez-nous avant de valider.' : ''}</p>
        <ul class="ec-objets">${listeObjets.map((o) => `<li>${o.photo ? `<a href="#" data-oc-photo="${esc(o.photo)}" aria-label="Agrandir la photo : ${esc(o.nom)}"><img alt="${esc(o.nom)}"></a>` : '<span class="ec-oc-sans" aria-hidden="true"></span>'}
          <div><b>${esc(o.nom)}</b><span>${o.destinataire ? 'Pour ' + esc(o.destinataire) : 'Pour la famille'}</span>${o.note ? `<span class="ec-oc-note">${esc(o.note)}</span>` : ''}
          <span class="${o.valide_le ? 'ec-oc-ok' : 'ec-oc-attente'}">${o.valide_le ? 'Validé le ' + esc(dateFr(o.valide_le)) : 'À valider'}</span></div></li>`).join('')}</ul>
        ${aValider ? `<button type="button" class="btn" id="ec-valider">Je valide la liste (${aValider} objet${aValider > 1 ? 's' : ''})</button>` : '<p class="ec-oc-ok" style="margin:0">Liste validée.</p>'}
        <div id="ec-msg-objets" class="ec-msg" role="status" hidden></div>
      </div>` : ''}
      <div class="ec-carte"><h2>Documents</h2>
        ${(docs || []).length ? `<ul class="ec-docs">${docs.map((x) => `<li><div>${esc(x.nom)}<br><span>${esc(TYPES_DOC[x.type] || 'Document')} · ${esc(dateFr(x.date))}</span></div><button type="button" class="ec-lien" data-doc="${esc(x.chemin)}">Ouvrir</button></li>`).join('')}</ul>` : `<p class="p" style="margin:0">Les documents de votre dossier (devis signé, factures, état des lieux) apparaîtront ici.</p>`}
      </div>
      <div class="ec-carte sable"><h2>Votre interlocuteur</h2>${contactHtml(d.interlocuteur)}</div>
      ${basHtml()}`);
    racine.querySelectorAll('[data-dossier]').forEach((b) => b.onclick = () => { courant = b.dataset.dossier; afficherDossier(); });
    racine.querySelectorAll('.ec-bon').forEach((c) => lierBon(sb, c, () => afficherDossier()));
    // Objets conservés : photos (liens signés temporaires) et validation de la liste.
    const cheminsObjets = listeObjets.map((o) => o.photo).filter(Boolean);
    if (cheminsObjets.length) {
      sb.storage.from('photos').createSignedUrls(cheminsObjets, 3600).then(({ data: urls }) => (urls || []).forEach((u) => {
        const a = racine.querySelector(`[data-oc-photo="${CSS.escape(u.path)}"]`);
        if (a && u.signedUrl) { a.href = u.signedUrl; a.target = '_blank'; a.rel = 'noopener'; a.querySelector('img').src = u.signedUrl; }
      }));
    }
    const bv = racine.querySelector('#ec-valider');
    if (bv) bv.onclick = async () => {
      bv.disabled = true;
      const { error } = await sb.rpc('valider_objets_conserves', { p_dossier: courant });
      const m = racine.querySelector('#ec-msg-objets');
      if (error) { bv.disabled = false; m.hidden = false; m.className = 'ec-msg alerte'; m.textContent = "La validation n'a pas pu être enregistrée. Vérifiez votre connexion internet et réessayez."; return; }
      afficherDossier();
    };
    // Photos : liens signés temporaires, seulement pour les photos partagées de ce dossier.
    const chemins = (photos || []).map((p) => p.chemin);
    if (chemins.length) {
      const { data: urls } = await sb.storage.from('photos').createSignedUrls(chemins, 3600);
      (urls || []).forEach((u) => { const a = racine.querySelector(`[data-photo="${CSS.escape(u.path)}"]`); if (a && u.signedUrl) { a.href = u.signedUrl; a.target = '_blank'; a.rel = 'noopener'; a.querySelector('img').src = u.signedUrl; } });
    }
    racine.querySelectorAll('[data-doc]').forEach((b) => b.onclick = async () => {
      const fenetre = window.open('', '_blank');
      const { data, error } = await sb.storage.from('documents').createSignedUrl(b.dataset.doc, 300);
      if (error || !data?.signedUrl) { fenetre?.close(); alert("Ce document n'est pas disponible pour l'instant."); return; }
      if (fenetre) fenetre.location = data.signedUrl; else location.href = data.signedUrl;
    });
    lierBas();
  }

  function contactHtml(interlocuteur) {
    const nom = interlocuteur?.nom, tel = interlocuteur?.tel || contact.telephone;
    const lien = telLien(tel) || contact.lienTelephone;
    return `<p class="p" style="margin:0">${nom ? `<strong>${esc(nom)}</strong> vous accompagne. ` : ''}Une question, un imprévu ? Nous sommes joignables directement.</p>
      <div class="ec-contact">${lien ? `<a class="btn" href="${esc(lien)}">Appeler ${esc(tel)}</a>` : ''}<a class="btn2" href="/contact#formulaire">Nous écrire</a></div>`;
  }
  function basHtml() {
    return `<div class="ec-bas"><span>Connecté : ${esc(session?.user?.email || '')}</span><button type="button" class="ec-lien" id="ec-deco">Se déconnecter</button></div>`;
  }
  function lierBas() {
    const b = racine.querySelector('#ec-deco');
    if (b) b.onclick = async () => { await sb.auth.signOut(); session = null; ecranConnexion({ texte: 'Vous êtes déconnecté.' }); };
  }

  /* ---------- Démarrage ---------- */
  (async () => {
    const erreurUrl = new URLSearchParams(location.hash.slice(1) || location.search).get('error_description');
    try {
      const { data } = await sb.auth.getSession();
      session = data.session;
      if (!session) return ecranConnexion(erreurUrl ? { texte: 'Ce lien de connexion a expiré ou a déjà servi. Demandez-en un nouveau ci-dessous.', alerte: true } : null);
      if (location.search.includes('code=')) history.replaceState(null, '', '/espace-client');
      await charger();
    } catch (e) {
      ecranConnexion({ texte: "Votre espace n'a pas pu se charger. Vérifiez votre connexion internet, puis réessayez.", alerte: true });
    }
  })();
  sb.auth.onAuthStateChange((evt, s) => { if (evt === 'SIGNED_IN' && !session && s) { session = s; charger().catch(() => {}); } });
}

// Démarrage automatique sur la page /espace-client.
const racine = typeof document !== 'undefined' && document.getElementById('ec-app');
if (racine && !window.__FB_TEST_ESPACE) demarrerEspace(creerClient(), racine, window.__FB_CONTACT || {});
