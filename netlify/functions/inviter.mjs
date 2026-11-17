/**
 * Invitation d'une personne à l'espace client (appelée par le back-office /admin).
 *
 * Sécurité :
 *   - l'appelant doit être un administrateur connecté avec sa double authentification : on vérifie
 *     avec SON jeton qu'il peut lire la table `admins` (règle d'accès réservée à aal2) ;
 *   - l'adresse doit figurer dans `dossier_acces` pour ce dossier ;
 *   - la clé secrète Supabase (SUPABASE_SERVICE_ROLE_KEY) n'existe que dans les variables
 *     d'environnement Netlify, jamais dans le code ni dans le navigateur.
 *
 * Effet : crée le compte de la personne s'il n'existe pas (les inscriptions publiques sont fermées),
 * lui envoie un lien de connexion vers /espace-client, et note la date d'invitation.
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_CLE_PUBLIQUE } from '../../src/config/supabase.ts';
import { json, estAdmin } from '../lib/admin.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json(405, { erreur: 'Méthode non autorisée.' });
  const cleSecrete = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cleSecrete) return json(500, { erreur: "La clé secrète Supabase n'est pas encore configurée dans Netlify." });

  const jeton = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jeton) return json(401, { erreur: 'Connexion requise.' });

  let corps;
  try { corps = await req.json(); } catch { return json(400, { erreur: 'Requête invalide.' }); }
  const dossierId = String(corps?.dossier_id || '');
  const email = String(corps?.email || '').trim().toLowerCase();
  if (!dossierId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { erreur: 'Dossier ou e-mail invalide.' });

  // 1. L'appelant est-il administrateur (avec double authentification) ?
  if (!(await estAdmin(req))) return json(403, { erreur: 'Accès réservé aux administrateurs.' });

  const serveur = createClient(SUPABASE_URL, cleSecrete, { auth: { persistSession: false, autoRefreshToken: false } });

  // 2. L'adresse a-t-elle bien accès à ce dossier ?
  const { data: acces, error: eAcces } = await serveur.from('dossier_acces').select('email').eq('dossier_id', dossierId).eq('email', email).maybeSingle();
  if (eAcces) return json(500, { erreur: eAcces.message });
  if (!acces) return json(404, { erreur: "Cette adresse n'a pas d'accès à ce dossier." });

  // 3. Créer le compte s'il n'existe pas encore.
  const { error: eCreation } = await serveur.auth.admin.createUser({ email, email_confirm: true });
  if (eCreation && !/already|registered|exists/i.test(eCreation.message)) return json(500, { erreur: eCreation.message });

  // 4. Envoyer le lien de connexion (e-mail envoyé par Supabase).
  const site = process.env.URL_SITE || new URL(req.url).origin;
  const anonyme = createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: eEnvoi } = await anonyme.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${site}/espace-client` } });
  if (eEnvoi) {
    const limite = /rate limit|security purposes|too many/i.test(eEnvoi.message);
    return json(limite ? 429 : 500, { erreur: limite ? "Trop d'e-mails envoyés ces dernières minutes : réessayez un peu plus tard." : eEnvoi.message });
  }

  // 5. Noter la date d'invitation.
  const maintenant = new Date().toISOString();
  await serveur.from('dossier_acces').update({ invite_le: maintenant }).eq('dossier_id', dossierId).eq('email', email);
  return json(200, { ok: true, invite_le: maintenant });
};

export const config = { path: '/api/inviter' };
