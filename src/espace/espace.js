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
const TYPES_DOC = { devis: 'Devis', facture: 'Facture', etat_des_lieux: 'État des lieux', autre: 'Document' };
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
    const [{ data: photos }, { data: docs }] = await Promise.all([
      sb.from('photos_partagees').select('chemin, legende, ordre').eq('dossier_id', courant).order('ordre'),
      sb.from('documents').select('id, chemin, type, nom, date').eq('dossier_id', courant).order('date', { ascending: false }),
    ]);
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
      <div class="ec-carte"><h2>Documents</h2>
        ${(docs || []).length ? `<ul class="ec-docs">${docs.map((x) => `<li><div>${esc(x.nom)}<br><span>${esc(TYPES_DOC[x.type] || 'Document')} · ${esc(dateFr(x.date))}</span></div><button type="button" class="ec-lien" data-doc="${esc(x.chemin)}">Ouvrir</button></li>`).join('')}</ul>` : `<p class="p" style="margin:0">Les documents de votre dossier (devis signé, factures, état des lieux) apparaîtront ici.</p>`}
      </div>
      <div class="ec-carte sable"><h2>Votre interlocuteur</h2>${contactHtml(d.interlocuteur)}</div>
      ${basHtml()}`);
    racine.querySelectorAll('[data-dossier]').forEach((b) => b.onclick = () => { courant = b.dataset.dossier; afficherDossier(); });
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
