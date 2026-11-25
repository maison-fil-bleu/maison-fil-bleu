/** Outils partagés des fonctions Cloudflare (dossier functions/, servies sous /api/…). */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_CLE_PUBLIQUE } from '../../src/config/supabase.ts';

export const json = (status, corps) => new Response(JSON.stringify(corps), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/** Client Supabase avec la clé secrète (variable SUPABASE_SERVICE_ROLE_KEY de Cloudflare, jamais dans le code). */
export const serveur = (env) => createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
export const anonyme = () => createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, { auth: { persistSession: false, autoRefreshToken: false } });

/** Vérifie que l'appel vient d'un administrateur connecté avec sa double authentification (aal2). */
export async function estAdmin(request) {
  const jeton = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jeton) return false;
  const sb = createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, { global: { headers: { Authorization: `Bearer ${jeton}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  // La table admins n'est lisible que par un administrateur avec double authentification.
  const { data, error } = await sb.from('admins').select('email').limit(1);
  return !error && !!data?.length;
}
