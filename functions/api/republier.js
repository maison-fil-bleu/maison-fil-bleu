/**
 * POST /api/republier : republie le site (back-office › Réglages › « Mettre à jour les prix du site »).
 * Déclenche une nouvelle construction Cloudflare Pages : scripts/prix-publics.mjs y recopie les prix
 * publics réglés dans l'appli. Réservée aux administrateurs (double authentification).
 * Le crochet de déploiement (CF_DEPLOY_HOOK) est dans les variables secrètes de Cloudflare.
 */
import { json, estAdmin } from '../_lib/commun.js';

export async function onRequestPost({ request, env }) {
  if (!(await estAdmin(request))) return json(403, { erreur: 'Accès réservé aux administrateurs.' });
  const crochet = env.CF_DEPLOY_HOOK;
  if (!crochet || !/^https:\/\/api\.cloudflare\.com\/client\/v4\/pages\/webhooks\/deploy_hooks\//.test(crochet)) return json(500, { erreur: "Le crochet de mise à jour du site n'est pas encore configuré dans Cloudflare." });
  const rep = await fetch(crochet, { method: 'POST' });
  if (!rep.ok) return json(502, { erreur: `Cloudflare a refusé la mise à jour (${rep.status}).` });
  return json(200, { ok: true });
}
export const onRequest = () => json(405, { erreur: 'Méthode non autorisée.' });
