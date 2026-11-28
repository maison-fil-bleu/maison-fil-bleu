/**
 * Worker « fil-bleu-courriels » : reçoit les e-mails envoyés à contact@ et pro@ (règle Email Routing
 * « Send to a Worker »).
 *   1. Il les transfère d'abord, comme avant, vers la boîte Gmail (secret TRANSFERT_VERS, adresse
 *      vérifiée dans Email Routing) : un e-mail n'est jamais perdu, même si la suite échoue.
 *   2. Il en garde une copie dans la table « courriels » de Supabase (clé secrète SUPABASE_SERVICE_ROLE_KEY),
 *      rattachée automatiquement au dossier quand l'expéditeur est connu.
 * Les pièces jointes ne sont pas conservées (seulement leur nom et leur taille) : elles restent dans Gmail.
 */
import PostalMime from 'postal-mime';

const MAX_TEXTE = 20000;
const ENTITES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", agrave: 'à', aacute: 'á', acirc: 'â', auml: 'ä', eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', icirc: 'î', iuml: 'ï', ocirc: 'ô', ouml: 'ö', ugrave: 'ù', ucirc: 'û', uuml: 'ü', ccedil: 'ç', Agrave: 'À', Eacute: 'É', Egrave: 'È', Ecirc: 'Ê', Ccedil: 'Ç', oelig: 'œ', OElig: 'Œ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—', euro: '€', deg: '°', middot: '·' };
const texteDepuisHtml = (h) => String(h || '')
  .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITES[n] ?? m)
  .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

/** Garde le message lui-même, sans l'historique cité en dessous (« Le … a écrit : », « > … »). */
export function sansCitation(t) {
  const lignes = String(t || '').split('\n'), out = [];
  for (const l of lignes) {
    if (/^\s*(Le |On ).{5,200}(a écrit|wrote)\s*:\s*$/i.test(l) || /^-{2,}\s*(Original Message|Message d'origine)/i.test(l) || /^De\s*:\s.+@/i.test(l)) break;
    if (/^\s*>/.test(l)) continue;
    out.push(l);
  }
  return out.join('\n').trim() || String(t || '').trim();
}

export async function copier(raw, enTetes, env) {
  let courriel;
  try {
    const e = await PostalMime.parse(raw);
    const texte = sansCitation(e.text || texteDepuisHtml(e.html));
    courriel = {
      de: (e.from?.address || enTetes.de || '').toLowerCase(),
      de_nom: e.from?.name || '',
      sujet: e.subject || enTetes.sujet || '',
      texte: texte.slice(0, MAX_TEXTE),
      pieces: (e.attachments || []).map((a) => ({ nom: a.filename || 'pièce jointe', type: a.mimeType || '', taille: a.content?.byteLength || 0 })).slice(0, 30),
      message_id: e.messageId || enTetes.messageId || null,
    };
  } catch (err) {
    // Contenu illisible : on garde au moins l'expéditeur et l'objet, le message complet est dans Gmail.
    courriel = { de: (enTetes.de || '').toLowerCase(), de_nom: '', sujet: enTetes.sujet || '', texte: '[Contenu non lu : voir la boîte Gmail]', pieces: [], message_id: enTetes.messageId || null };
  }
  return courriel;
}

async function enregistrer(courriel, env) {
  const rep = await fetch(`${env.SUPABASE_URL}/rest/v1/courriels?on_conflict=message_id`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json', prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(courriel),
  });
  if (!rep.ok) throw new Error(`Supabase ${rep.status} : ${(await rep.text()).slice(0, 300)}`);
}

export default {
  async email(message, env, ctx) {
    const enTetes = { de: message.from, sujet: message.headers.get('subject') || '', messageId: message.headers.get('message-id') || null };
    // Le contenu brut est lu une seule fois, avant le transfert.
    let raw = null;
    try { raw = await new Response(message.raw).arrayBuffer(); } catch (err) { console.error('Lecture du message impossible', err); }

    // 1. Transfert vers Gmail : prioritaire.
    let transfere = false;
    if (env.TRANSFERT_VERS) {
      try { await message.forward(env.TRANSFERT_VERS); transfere = true; }
      catch (err) { console.error('Transfert vers Gmail impossible', err); }
    }

    // 2. Copie dans l'appli.
    try {
      const courriel = raw ? await copier(raw, enTetes, env) : { de: (enTetes.de || '').toLowerCase(), de_nom: '', sujet: enTetes.sujet, texte: '[Contenu non lu : voir la boîte Gmail]', pieces: [], message_id: enTetes.messageId };
      courriel.adresse = String(message.to || '').toLowerCase();
      if (!courriel.de) courriel.de = 'inconnu';
      if (!transfere) courriel.texte = '[Attention : ce message n’a pas pu être transféré vers Gmail]\n\n' + courriel.texte;
      await enregistrer(courriel, env);
    } catch (err) {
      console.error('Copie dans l’appli impossible', err);
      // Ni transféré ni copié : on refuse proprement pour que l'expéditeur soit averti.
      if (!transfere) message.setReject('Message non distribué, merci de réessayer plus tard.');
    }
  },
};
