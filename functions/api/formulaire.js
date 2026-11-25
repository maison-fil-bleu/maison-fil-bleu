/**
 * POST /api/formulaire : reçoit les formulaires du site (rappel, devis-pro, partenaire, grille-pro),
 * crée le dossier dans le back-office, puis renvoie vers la page de remerciement.
 * Remplace Netlify Forms et la fonction « submission-created ».
 *
 * Anti-robots :
 *   - champ piège invisible « bot-field » : s'il est rempli, on remercie sans rien enregistrer ;
 *   - Cloudflare Turnstile, dès que la clé secrète TURNSTILE_SECRET est configurée dans Cloudflare
 *     (et la clé publique dans src/config/site.ts) ; sans elle, seul le champ piège filtre.
 *
 * Notification par e-mail (facultative) : si RESEND_API_KEY, NOTIF_EMAIL et NOTIF_FROM sont configurées
 * dans Cloudflare, un e-mail part à chaque demande avec le lien direct vers le dossier. Sans elles,
 * la demande arrive seulement dans le back-office (dossier au statut « Appel »).
 */
import { serveur } from '../_lib/commun.js';
import { FORMULAIRES, dossierDepuisDemande } from '../_lib/demandes.js';

const MERCI = { rappel: '/merci', partenaire: '/merci-partenaire', 'devis-pro': '/pro/merci-devis', 'grille-pro': '/pro/merci-grille' };
const TITRES = { rappel: 'Être rappelé', partenaire: 'Dossier confié par un partenaire', 'devis-pro': 'Devis Fil Bleu Pro', 'grille-pro': 'Grille tarifaire Fil Bleu Pro' };
const IGNORES = new Set(['form-name', 'bot-field', 'cf-turnstile-response', 'reference', 'lien_dossier']);
const nouvelId = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function page(titre, texte, status = 400) {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${titre} | Maison Fil Bleu</title>
<style>body{font-family:system-ui,sans-serif;background:#F6F4F0;color:#18202C;max-width:560px;margin:12vh auto;padding:0 20px;line-height:1.6}a{color:#3D5A80}</style></head>
<body><h1 style="font-weight:500">${titre}</h1><p>${texte}</p><p><a href="javascript:history.back()">Revenir au formulaire</a></p></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

async function turnstileOk(env, jeton, ip) {
  if (!env.TURNSTILE_SECRET) return true;   // pas encore configuré : seul le champ piège filtre
  if (!jeton) return false;
  const corps = new FormData(); corps.append('secret', env.TURNSTILE_SECRET); corps.append('response', jeton); if (ip) corps.append('remoteip', ip);
  const rep = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: corps }).catch(() => null);
  const r = await rep?.json().catch(() => null);
  return !!r?.success;
}

async function notifier(env, form, data, lien) {
  if (!env.RESEND_API_KEY || !env.NOTIF_EMAIL || !env.NOTIF_FROM) return;
  const lignes = Object.entries(data).filter(([k, v]) => !IGNORES.has(k) && String(v).trim()).map(([k, v]) => `${k} : ${String(v).slice(0, 2000)}`);
  await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.NOTIF_FROM, to: [env.NOTIF_EMAIL], subject: `Nouvelle demande : ${TITRES[form]}`, text: `${lignes.join('\n')}\n\nOuvrir le dossier : ${lien}` }),
  }).catch(() => {});
}

export async function onRequestPost({ request, env, waitUntil }) {
  let fd;
  try { fd = await request.formData(); } catch { return page('Envoi impossible', "Le formulaire n'a pas pu être lu. Réessayez, ou appelez-nous directement."); }
  // Champs à valeurs multiples (cases à cocher) : réunis par des virgules, comme le faisait Netlify.
  const data = {};
  for (const k of new Set(fd.keys())) data[k] = fd.getAll(k).filter((v) => typeof v === 'string').join(', ');
  const form = data['form-name'];
  if (!FORMULAIRES.includes(form)) return page('Envoi impossible', 'Formulaire inconnu.');
  const merci = new URL(MERCI[form], request.url).toString();
  if (data['bot-field']) return Response.redirect(merci, 303);   // robot : on ne garde rien

  if (!(await turnstileOk(env, data['cf-turnstile-response'], request.headers.get('cf-connecting-ip')))) {
    return page('Vérification nécessaire', "La vérification anti-robots n'a pas abouti. Revenez au formulaire, attendez que la case de vérification soit validée, puis renvoyez-le.", 403);
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return page('Envoi impossible', "Le formulaire n'est pas encore relié au back-office. Appelez-nous directement, nous vous répondons tout de suite.", 503);

  const sb = serveur(env), maintenant = new Date().toISOString();
  const ref = String(data.reference || '');
  let id = /^d[a-z0-9]{6,24}$/.test(ref) ? ref : nouvelId();
  for (let essai = 0; essai < 3; essai++) {
    const d = dossierDepuisDemande(form, data, id, maintenant);
    const { error } = await sb.from('dossiers').insert({ id, created_at: maintenant, statut: 'Appel', formule: d.formule, data: d });
    if (!error) {
      waitUntil(notifier(env, form, data, new URL(`/admin#dossier=${id}`, request.url).toString()));
      return Response.redirect(merci, 303);
    }
    if (error.code !== '23505') return page('Envoi impossible', "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant, ou appelez-nous directement.", 500);
    // Référence déjà prise : même formulaire renvoyé deux fois (double clic) → déjà enregistré.
    if (id === ref && essai === 0) {
      const { data: deja } = await sb.from('dossiers').select('data').eq('id', id).maybeSingle();
      if (deja?.data?.contact?.tel === dossierDepuisDemande(form, data, id, maintenant).contact.tel) return Response.redirect(merci, 303);
    }
    id = nouvelId();
  }
  return page('Envoi impossible', "Votre demande n'a pas pu être enregistrée. Appelez-nous directement.", 500);
}
export const onRequest = () => new Response('Méthode non autorisée.', { status: 405 });
