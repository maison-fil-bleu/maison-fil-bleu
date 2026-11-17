/**
 * Republie le site (appelée depuis le back-office › Réglages › « Mettre à jour les prix du site »).
 * Déclenche une nouvelle construction Netlify : scripts/prix-publics.mjs y recopie les prix publics
 * réglés dans l'appli. Réservée aux administrateurs (double authentification).
 * Le crochet de construction (NETLIFY_BUILD_HOOK) est dans les variables d'environnement Netlify.
 */
import { json, estAdmin } from '../lib/admin.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json(405, { erreur: 'Méthode non autorisée.' });
  if (!(await estAdmin(req))) return json(403, { erreur: 'Accès réservé aux administrateurs.' });
  const crochet = process.env.NETLIFY_BUILD_HOOK;
  if (!crochet || !/^https:\/\/api\.netlify\.com\/build_hooks\//.test(crochet)) return json(500, { erreur: "Le crochet de mise à jour du site n'est pas encore configuré dans Netlify." });
  const rep = await fetch(`${crochet}?trigger_title=${encodeURIComponent('Prix mis à jour depuis le back-office')}`, { method: 'POST', body: '{}' });
  if (!rep.ok) return json(502, { erreur: `Netlify a refusé la mise à jour (${rep.status}).` });
  return json(200, { ok: true });
};

export const config = { path: '/api/republier' };
