/**
 * Connexion au back-office : e-mail et mot de passe (ou lien reçu par e-mail pour la première fois),
 * puis double authentification obligatoire (application d'authentification, code à 6 chiffres).
 * Seules les adresses inscrites dans la table `admins` accèdent aux dossiers.
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_CLE_PUBLIQUE } from '../config/supabase';
import { demarrerAppli } from './dossiers.js';

const sb = createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});
const app = document.getElementById('app');
const nav = document.querySelector('nav.bottom');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let appli = null;

const entete = (sous) => `<div class="top"><div class="brand"><svg width="46" height="22" viewBox="0 0 164 80" aria-hidden="true"><path d="M8 74 V44 L34 22 L60 44 V74" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M104 74 V44 L130 22 L156 44 V74" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M34 60 C52 76, 64 40, 82 54 S112 70, 130 60" fill="none" stroke="var(--blue)" stroke-width="5.5" stroke-linecap="round"/></svg><div><div style="font-family:var(--display);font-size:20px;line-height:1">Fil Bleu</div><small>${esc(sous)}</small></div></div></div>`;

function ecran(html) {
  nav.hidden = true;
  app.innerHTML = entete('Back-office') + html;
  const f = app.querySelector('input'); if (f) f.focus();
}
function message(texte, type = '') {
  const el = app.querySelector('#msg'); if (!el) return;
  el.hidden = !texte; el.className = 'suggest ' + type; el.textContent = texte;
}
const traduire = (e) => {
  const m = String(e?.message || e || '');
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect. Première connexion ? Utilisez « Recevoir un lien de connexion ».';
  if (/Signups not allowed|not found|User not found/i.test(m)) return "Cette adresse n'a pas d'accès au back-office.";
  if (/rate limit|too many|security purposes/i.test(m)) return 'Trop de demandes rapprochées : patientez quelques minutes avant de réessayer.';
  if (/Invalid TOTP|invalid.*code|expired/i.test(m)) return 'Code incorrect ou expiré : saisissez le code affiché en ce moment dans votre application.';
  if (/Password should|weak/i.test(m)) return 'Mot de passe trop faible : 12 caractères au moins, mélangez lettres, chiffres et signes.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Pas de connexion internet.';
  return 'Une erreur est survenue : ' + m;
};

/* ---------- 1. Connexion ---------- */
function ecranConnexion(info = '') {
  ecran(`<h1>Connexion</h1>
  <form class="card" id="f-cnx" novalidate>
    <label>E-mail<input id="c-email" type="email" autocomplete="username" required inputmode="email"></label>
    <label>Mot de passe<input id="c-mdp" type="password" autocomplete="current-password"></label>
    <button class="btn" type="submit">Se connecter</button>
    <div id="msg" class="suggest" hidden role="status"></div>
  </form>
  <div class="card"><h2 style="font-size:20px">Première connexion ou mot de passe oublié</h2>
    <p class="small muted" style="margin:0">Recevez un lien de connexion par e-mail. Ouvrez-le sur cet appareil, dans ce navigateur.</p>
    <button class="btn ghost" type="button" id="b-lien">Recevoir un lien de connexion</button>
  </div>`);
  if (info) message(info);
  app.querySelector('#f-cnx').onsubmit = async (e) => {
    e.preventDefault();
    const email = app.querySelector('#c-email').value.trim().toLowerCase(), password = app.querySelector('#c-mdp').value;
    if (!email || !password) { message('Saisissez votre e-mail et votre mot de passe.', 'warn'); return; }
    message('Connexion…');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) message(traduire(error), 'bad'); else suite();
  };
  app.querySelector('#b-lien').onclick = async () => {
    const email = app.querySelector('#c-email').value.trim().toLowerCase();
    if (!email) { message("Saisissez d'abord votre e-mail ci-dessus.", 'warn'); app.querySelector('#c-email').focus(); return; }
    message('Envoi du lien…');
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + '/admin' } });
    // Même réponse que l'adresse ait un compte ou non : on ne laisse pas deviner les comptes existants.
    const inconnue = error && /Signups not allowed|not found|not allowed/i.test(String(error.message));
    if (error && !inconnue) message(traduire(error), 'bad');
    else message(`Si cette adresse a un accès, un lien vient d'y être envoyé. Ouvrez l'e-mail sur cet appareil, dans ce navigateur (pensez aux indésirables).`);
  };
}

/* ---------- 2. Double authentification ---------- */
async function ecranMfa() {
  const { data: fac, error } = await sb.auth.mfa.listFactors();
  if (error) { ecranConnexion(traduire(error)); return; }
  const verifie = (fac?.totp || []).find((f) => f.status === 'verified');
  if (verifie) return ecranCodeMfa(verifie.id);
  // Pas encore de double authentification : réservée aux administrateurs.
  const { data: estAdmin } = await sb.rpc('est_admin_sans_mfa');
  if (!estAdmin) return ecranRefus();
  for (const f of fac?.all || []) if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
  const { data: enr, error: e2 } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Fil Bleu ' + new Date().toISOString().slice(0, 10), issuer: 'Fil Bleu' });
  if (e2) { ecranConnexion(traduire(e2)); return; }
  ecran(`<h1>Double authentification</h1>
  <div class="card"><h2 style="font-size:20px">1. Ajoutez Fil Bleu à votre application de codes</h2>
    <p class="small muted" style="margin:0">Avec l'appareil photo de votre téléphone, scannez ce code dans une application d'authentification (Mots de passe d'Apple, Google Authenticator, Microsoft Authenticator…).</p>
    <img src="${esc(enr.totp.qr_code)}" alt="QR code à scanner" width="200" height="200" style="background:#fff;border-radius:10px;padding:8px;align-self:center">
    <details><summary class="small" style="cursor:pointer">Impossible de scanner ? Saisir la clé à la main</summary><p class="small" style="word-break:break-all;margin:8px 0 0"><code>${esc(enr.totp.secret)}</code></p></details>
  </div>
  <form class="card" id="f-mfa"><h2 style="font-size:20px">2. Saisissez le code à 6 chiffres affiché</h2>
    <label>Code<input id="m-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}"></label>
    <button class="btn" type="submit">Activer</button>
    <div id="msg" class="suggest" hidden role="status"></div>
  </form>`);
  app.querySelector('#f-mfa').onsubmit = async (e) => {
    e.preventDefault();
    const code = app.querySelector('#m-code').value.replace(/\D/g, '');
    const { error: e3 } = await sb.auth.mfa.challengeAndVerify({ factorId: enr.id, code });
    if (e3) message(traduire(e3), 'bad'); else suite();
  };
}
function ecranCodeMfa(factorId) {
  ecran(`<h1>Code de sécurité</h1>
  <form class="card" id="f-code"><p class="small muted" style="margin:0">Saisissez le code à 6 chiffres affiché pour « Fil Bleu » dans votre application d'authentification.</p>
    <label>Code<input id="m-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}"></label>
    <button class="btn" type="submit">Valider</button>
    <div id="msg" class="suggest" hidden role="status"></div>
  </form>
  <button class="btn ghost" type="button" id="b-autre">Changer de compte</button>`);
  app.querySelector('#f-code').onsubmit = async (e) => {
    e.preventDefault();
    const code = app.querySelector('#m-code').value.replace(/\D/g, '');
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) message(traduire(error), 'bad'); else suite();
  };
  app.querySelector('#b-autre').onclick = deconnexion;
}
function ecranRefus() {
  ecran(`<h1>Accès réservé</h1><div class="card"><p style="margin:0">Cette adresse n'a pas accès au back-office de Maison Fil Bleu.</p>
  <button class="btn ghost" id="b-out">Se déconnecter</button></div>`);
  app.querySelector('#b-out').onclick = deconnexion;
}

/* ---------- 3. Mot de passe (après la première connexion par lien) ---------- */
function ecranMotDePasse(premiere) {
  ecran(`<h1>${premiere ? 'Choisissez un mot de passe' : 'Mot de passe'}</h1>
  <form class="card" id="f-mdp"><p class="small muted" style="margin:0">${premiere ? "Il vous servira à vous connecter sans attendre d'e-mail, notamment depuis l'appli installée sur votre téléphone. " : ''}12 caractères au moins. Enregistrez-le dans votre gestionnaire de mots de passe.</p>
    <input type="email" autocomplete="username" value="${esc(utilisateurCourant?.email || '')}" hidden>
    <label>Nouveau mot de passe<input id="p1" type="password" autocomplete="new-password" minlength="12"></label>
    <label>Confirmez<input id="p2" type="password" autocomplete="new-password" minlength="12"></label>
    <button class="btn" type="submit">Enregistrer</button>
    <div id="msg" class="suggest" hidden role="status"></div>
  </form>
  <button class="btn ghost" type="button" id="b-plus-tard">${premiere ? 'Plus tard' : 'Annuler'}</button>`);
  app.querySelector('#f-mdp').onsubmit = async (e) => {
    e.preventDefault();
    const p1 = app.querySelector('#p1').value, p2 = app.querySelector('#p2').value;
    if (p1.length < 12) { message('12 caractères au moins.', 'warn'); return; }
    if (p1 !== p2) { message('Les deux mots de passe sont différents.', 'warn'); return; }
    const { error } = await sb.auth.updateUser({ password: p1, data: { mot_de_passe_defini: true } });
    if (error) message(traduire(error), 'bad'); else { sessionStorage.setItem('fb-mdp-ok', '1'); ouvrirAppli(); }
  };
  app.querySelector('#b-plus-tard').onclick = () => { sessionStorage.setItem('fb-mdp-ok', '1'); ouvrirAppli(); };
}

/* ---------- Enchaînement ---------- */
let utilisateurCourant = null;
async function deconnexion() {
  appli?.viderCache();
  await sb.auth.signOut();
  location.replace('/admin');
}
function ouvrirAppli() {
  appli = demarrerAppli({ sb, utilisateur: utilisateurCourant, actions: { deconnexion, motDePasse: () => ecranMotDePasse(false) } });
}
async function suite() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return ecranConnexion();
  utilisateurCourant = session.user;
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') return ecranMfa();
  const { data: estAdmin } = await sb.rpc('est_admin_sans_mfa');
  if (!estAdmin) return ecranRefus();
  if (!utilisateurCourant.user_metadata?.mot_de_passe_defini && !sessionStorage.getItem('fb-mdp-ok')) return ecranMotDePasse(true);
  ouvrirAppli();
}

// Hors ligne avec une session déjà ouverte : on ouvre l'appli sur les données de l'appareil.
(async () => {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!navigator.onLine && session) {
      const p = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (p.aal === 'aal2') { utilisateurCourant = session.user; return ouvrirAppli(); }
    }
    await suite();
  } catch (e) { ecranConnexion(traduire(e)); }
})();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => {});
