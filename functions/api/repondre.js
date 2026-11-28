/**
 * POST /api/repondre : réponse à un courriel reçu, envoyée depuis l'appli.
 *   - réservé aux administrateurs (double authentification) ;
 *   - le destinataire est toujours l'expéditeur du courriel d'origine (aucune autre adresse possible) ;
 *   - envoyée depuis l'adresse qui a reçu le message (contact@ ou pro@), dans la même conversation
 *     (en-têtes In-Reply-To et References), avec copie cachée vers Gmail (COPIE_ENVOIS) ;
 *   - gardée dans la table courriels (sens « envoye »), le courriel d'origine passe à « traité ».
 */
import { json, estAdmin, serveur } from '../_lib/commun.js';
import { expediteur, htmlMessage, envoyer, tracer } from '../_lib/courriel.js';

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.NOTIF_FROM) return json(500, { erreur: "L'envoi d'e-mails n'est pas configuré." });
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json(500, { erreur: "La clé secrète Supabase n'est pas configurée dans Cloudflare." });
  let corps;
  try { corps = await request.json(); } catch { return json(400, { erreur: 'Requête invalide.' }); }
  const id = String(corps?.courriel_id || '');
  const sujet = String(corps?.sujet || '').trim().slice(0, 300);
  const texte = String(corps?.texte || '').trim().slice(0, 10000);
  if (!id || !sujet || !texte) return json(400, { erreur: 'Objet ou texte manquant.' });
  if (!(await estAdmin(request))) return json(403, { erreur: 'Accès réservé aux administrateurs.' });

  const sb = serveur(env);
  const { data: c } = await sb.from('courriels').select('*').eq('id', id).maybeSingle();
  if (!c || c.sens !== 'recu') return json(404, { erreur: 'Courriel introuvable.' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.de)) return json(400, { erreur: "L'adresse de l'expéditeur n'est pas valide." });

  const from = expediteur(env, c.adresse);
  const date = new Date(c.recu_le).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' });
  const citation = `Le ${date}, ${c.de_nom || c.de} a écrit :\n${String(c.texte || '').split('\n').map((l) => '> ' + l).join('\n')}`;
  const enTetes = c.message_id ? { 'In-Reply-To': c.message_id, References: c.message_id } : undefined;
  const ok = await envoyer(env, { from, to: c.de, sujet, texte: `${texte}\n\n${citation}`, html: htmlMessage(texte, { citation: `Le ${date}, ${c.de_nom || c.de} a écrit :\n${c.texte || ''}` }), enTetes });
  if (!ok) return json(502, { erreur: "La réponse n'a pas pu partir. Réessayez dans un instant." });

  await tracer(sb, { dossierId: c.dossier_id, from, to: c.de, sujet, texte });
  await sb.from('courriels').update({ statut: 'traite' }).eq('id', c.id);
  return json(200, { ok: true, copie: !!env.COPIE_ENVOIS });
}
export const onRequest = () => json(405, { erreur: 'Méthode non autorisée.' });
