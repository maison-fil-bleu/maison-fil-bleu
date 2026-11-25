/**
 * POST /api/inviter : invitation d'une personne à l'espace client (appelée par le back-office /admin).
 *
 * Sécurité :
 *   - l'appelant doit être un administrateur connecté avec sa double authentification : on vérifie
 *     avec SON jeton qu'il peut lire la table `admins` (règle d'accès réservée à aal2) ;
 *   - l'adresse doit figurer dans `dossier_acces` pour ce dossier ;
 *   - la clé secrète Supabase (SUPABASE_SERVICE_ROLE_KEY) n'existe que dans les variables
 *     secrètes de Cloudflare, jamais dans le code ni dans le navigateur.
 *
 * Effet : crée le compte de la personne s'il n'existe pas (les inscriptions publiques sont fermées),
 * lui envoie un lien de connexion vers /espace-client, et note la date d'invitation.
 */
import { json, estAdmin, serveur, anonyme } from '../_lib/commun.js';

export async function onRequestPost({ request, env }) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json(500, { erreur: "La clé secrète Supabase n'est pas encore configurée dans Cloudflare." });
  if (!(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')) return json(401, { erreur: 'Connexion requise.' });

  let corps;
  try { corps = await request.json(); } catch { return json(400, { erreur: 'Requête invalide.' }); }
  const dossierId = String(corps?.dossier_id || '');
  const email = String(corps?.email || '').trim().toLowerCase();
  if (!dossierId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { erreur: 'Dossier ou e-mail invalide.' });

  // 1. L'appelant est-il administrateur (avec double authentification) ?
  if (!(await estAdmin(request))) return json(403, { erreur: 'Accès réservé aux administrateurs.' });
  const sb = serveur(env);

  // 2. L'adresse a-t-elle bien accès à ce dossier ?
  const { data: acces, error: eAcces } = await sb.from('dossier_acces').select('email').eq('dossier_id', dossierId).eq('email', email).maybeSingle();
  if (eAcces) return json(500, { erreur: eAcces.message });
  if (!acces) return json(404, { erreur: "Cette adresse n'a pas d'accès à ce dossier." });

  // 3. Créer le compte s'il n'existe pas encore.
  const { error: eCreation } = await sb.auth.admin.createUser({ email, email_confirm: true });
  if (eCreation && !/already|registered|exists/i.test(eCreation.message)) return json(500, { erreur: eCreation.message });

  // 4. Envoyer le lien de connexion (e-mail envoyé par Supabase).
  const site = env.URL_SITE || new URL(request.url).origin;
  const { error: eEnvoi } = await anonyme().auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${site}/espace-client` } });
  if (eEnvoi) {
    const limite = /rate limit|security purposes|too many/i.test(eEnvoi.message);
    return json(limite ? 429 : 500, { erreur: limite ? "Trop d'e-mails envoyés ces dernières minutes : réessayez un peu plus tard." : eEnvoi.message });
  }

  // 5. Noter la date d'invitation.
  const maintenant = new Date().toISOString();
  await sb.from('dossier_acces').update({ invite_le: maintenant }).eq('dossier_id', dossierId).eq('email', email);
  return json(200, { ok: true, invite_le: maintenant });
}
export const onRequest = () => json(405, { erreur: 'Méthode non autorisée.' });
