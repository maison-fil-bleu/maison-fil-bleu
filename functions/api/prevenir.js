/**
 * POST /api/prevenir : e-mail envoyé à la famille depuis l'appli (bouton « Prévenir la famille »).
 * Le message est relu et validé dans l'appli avant l'envoi : rien ne part automatiquement.
 *
 * Sécurité :
 *   - l'appelant doit être un administrateur avec sa double authentification ;
 *   - chaque destinataire doit avoir accès au dossier (dossier_acces) ou être le contact du dossier ;
 *   - 10 destinataires au plus, texte limité ; envoi par Resend (RESEND_API_KEY, NOTIF_FROM).
 */
import { json, estAdmin, serveur } from '../_lib/commun.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function html(texte, lien, marque) {
  const paras = String(texte).split(/\n{2,}/).map((p) => `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#2A303B;margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  return `<div style="font-family:Georgia,'Times New Roman',serif;color:#18202C;max-width:560px;margin:0 auto;padding:24px">
  <p style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#3D5A80;margin:0 0 20px">${esc(marque)}</p>
  ${paras}
  <p style="margin:22px 0"><a href="${esc(lien)}" style="font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#FFFFFF;background:#15233A;padding:13px 24px;text-decoration:none;display:inline-block">Ouvrir mon espace client</a></p>
  <p style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#6B7079;margin:0">Une question ? R&eacute;pondez simplement &agrave; cet e-mail.</p>
</div>`;
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.NOTIF_FROM) return json(500, { erreur: "L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY, NOTIF_FROM)." });
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json(500, { erreur: "La clé secrète Supabase n'est pas configurée dans Cloudflare." });
  let corps;
  try { corps = await request.json(); } catch { return json(400, { erreur: 'Requête invalide.' }); }
  const dossierId = String(corps?.dossier_id || '');
  const sujet = String(corps?.sujet || '').trim().slice(0, 200);
  const texte = String(corps?.texte || '').trim().slice(0, 5000);
  const dest = [...new Set((Array.isArray(corps?.destinataires) ? corps.destinataires : []).map((e) => String(e).trim().toLowerCase()).filter((e) => EMAIL.test(e)))];
  if (!dossierId || !sujet || !texte || !dest.length) return json(400, { erreur: 'Destinataire, objet ou texte manquant.' });
  if (dest.length > 10) return json(400, { erreur: '10 destinataires au plus.' });
  if (!(await estAdmin(request))) return json(403, { erreur: 'Accès réservé aux administrateurs.' });

  const sb = serveur(env);
  const [{ data: acces }, { data: dossier }] = await Promise.all([
    sb.from('dossier_acces').select('email').eq('dossier_id', dossierId),
    sb.from('dossiers').select('data').eq('id', dossierId).maybeSingle(),
  ]);
  if (!dossier) return json(404, { erreur: 'Dossier introuvable.' });
  const autorises = new Set([...(acces || []).map((a) => a.email.toLowerCase()), String(dossier.data?.contact?.email || '').toLowerCase()].filter(Boolean));
  const refuses = dest.filter((e) => !autorises.has(e));
  if (refuses.length) return json(403, { erreur: `Adresse non rattachée au dossier : ${refuses.join(', ')}` });

  const marque = dossier.data?.formule === 'P' ? 'Fil Bleu Pro' : 'Maison Fil Bleu';
  const site = env.URL_SITE || new URL(request.url).origin;
  const envois = await Promise.all(dest.map((to) => fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.NOTIF_FROM, to: [to], reply_to: env.NOTIF_REPONSE || undefined, subject: sujet, text: `${texte}\n\nVotre espace client : ${site}/espace-client`, html: html(texte, `${site}/espace-client`, marque) }),
  }).then((r) => r.ok, () => false)));
  const ok = dest.filter((_, i) => envois[i]);
  if (!ok.length) return json(502, { erreur: "L'e-mail n'a pas pu partir. Réessayez dans un instant." });
  return json(200, { ok: true, envoyes: ok, echecs: dest.filter((_, i) => !envois[i]) });
}
export const onRequest = () => json(405, { erreur: 'Méthode non autorisée.' });
