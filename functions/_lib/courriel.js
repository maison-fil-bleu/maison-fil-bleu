/** Envoi d'e-mails depuis l'appli (Resend) : mise en page commune, copie cachée vers Gmail, trace en base. */

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Adresse d'envoi : pro@ pour Fil Bleu Pro, sinon l'expéditeur configuré (NOTIF_FROM, contact@). */
export function expediteur(env, adresseRecue) {
  if (String(adresseRecue || '').toLowerCase().startsWith('pro@')) return 'Fil Bleu Pro <pro@maisonfilbleu.fr>';
  return env.NOTIF_FROM;
}

export function htmlMessage(texte, { marque, lien, citation } = {}) {
  const paras = String(texte).split(/\n{2,}/).map((p) => `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#2A303B;margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const cite = citation ? `<blockquote style="margin:22px 0 0;padding:0 0 0 12px;border-left:3px solid #DDD4C5;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#6B7079">${esc(citation).replace(/\n/g, '<br>')}</blockquote>` : '';
  return `<div style="max-width:600px;margin:0 auto;padding:20px">${marque ? `<p style="font-family:Georgia,serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#3D5A80;margin:0 0 18px">${esc(marque)}</p>` : ''}${paras}${lien ? `<p style="margin:20px 0"><a href="${esc(lien)}" style="font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#FFFFFF;background:#15233A;padding:13px 24px;text-decoration:none;display:inline-block">Ouvrir mon espace client</a></p>` : ''}${cite}</div>`;
}

/**
 * Envoie un e-mail par Resend. La copie cachée (COPIE_ENVOIS, adresse Gmail du fondateur, réglée dans
 * Cloudflare) garde une trace de tout ce qui part, même si l'appli devenait indisponible.
 */
export async function envoyer(env, { from, to, sujet, texte, html, enTetes }) {
  const corps = { from, to: [to], subject: sujet, text: texte, html, reply_to: from };
  if (env.COPIE_ENVOIS) corps.bcc = [env.COPIE_ENVOIS];
  if (enTetes && Object.keys(enTetes).length) corps.headers = enTetes;
  const rep = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(corps) }).catch(() => null);
  return !!rep?.ok;
}

/** Trace de l'e-mail envoyé dans la table courriels (visible dans l'onglet Courriels du dossier). */
export async function tracer(sb, { dossierId, from, to, sujet, texte }) {
  const adresse = (String(from).match(/<([^>]+)>/)?.[1] || String(from)).toLowerCase();
  await sb.from('courriels').insert({ sens: 'envoye', adresse, de: adresse, de_nom: String(from).replace(/\s*<[^>]+>\s*/, ''), destinataires: Array.isArray(to) ? to.join(', ') : String(to), sujet: String(sujet).slice(0, 500), texte: String(texte).slice(0, 20000), dossier_id: dossierId || null, statut: 'traite' });
}
