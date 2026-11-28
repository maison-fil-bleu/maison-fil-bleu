/**
 * Repérage des spams envoyés par les formulaires du site (référencement, marketing, liens…).
 * Prudent : il faut plusieurs signaux pour classer un envoi comme suspect. Un envoi suspect n'est
 * pas perdu : il est gardé dans les courriels « ignorés » (visible dans l'appli, filtre « Tous »).
 */
const sansAccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MOTS_SPAM = ['seo', 'google 1st page', 'google first page', 'first page of google', 'page 1 of google', 'top of google', 'backlink', 'ranking', 'rankings', 'website', 'web design', 'web development', 'digital marketing', 'marketing agency', 'leads', 'traffic to your', 'price list', 'packages', 'guest post', 'crypto', 'bitcoin', 'casino', 'loan', 'viagra', 'cialis', 'forex', 'investment opportunity', 'whatsapp me', 'telegram', 'referencement naturel', 'premiere page de google', 'premiere position sur google', 'site internet professionnel', 'augmenter votre visibilite', 'agence web', 'prospects qualifies'];
const MOTS_ANGLAIS = ['the', 'your', 'you', 'we', 'our', 'can', 'with', 'and', 'for', 'this', 'that', 'will', 'are', 'hello', 'dear', 'regards', 'business', 'please', 'interested'];
const MOTS_FRANCAIS = ['le', 'la', 'les', 'de', 'des', 'du', 'et', 'un', 'une', 'pour', 'mon', 'ma', 'mes', 'nous', 'vous', 'est', 'bonjour', 'merci', 'appartement', 'maison'];

/** @returns { suspect: boolean, raisons: string[] } */
export function estSpam(data) {
  const texte = ['message', 'nom', 'societe', 'besoin', 'bien'].map((k) => data[k] || '').join('\n');
  const s = sansAccent(texte), raisons = [];
  const mots = s.split(/[^a-z0-9']+/).filter(Boolean);
  const nbAnglais = mots.filter((m) => MOTS_ANGLAIS.includes(m)).length, nbFrancais = mots.filter((m) => MOTS_FRANCAIS.includes(m)).length;
  const liens = (texte.match(/https?:\/\/|www\.|\.(com|net|io|xyz|ru)\b/gi) || []).length;
  const spam = MOTS_SPAM.filter((m) => new RegExp(`\\b${m.replace(/ /g, '\\s+')}\\b`).test(s));
  if (spam.length) raisons.push(`mots de démarchage : ${spam.slice(0, 4).join(', ')}`);
  if (liens) raisons.push(`${liens} lien${liens > 1 ? 's' : ''} dans le message`);
  if (mots.length >= 12 && nbAnglais >= 5 && nbAnglais > nbFrancais * 2) raisons.push('message en anglais');
  if (/�/.test(texte)) raisons.push('caractères illisibles (envoi automatique)');
  if (/(.)\1{9,}/.test(texte)) raisons.push('répétitions anormales');
  // Il faut au moins deux signaux, dont un fort (démarchage, ou anglais + lien).
  const fort = spam.length > 0 || (raisons.includes('message en anglais') && liens > 0);
  return { suspect: fort && raisons.length >= 2, raisons };
}
