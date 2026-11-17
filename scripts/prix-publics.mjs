/**
 * Avant chaque construction du site : récupère les prix publics réglés dans l'appli
 * (Réglages du back-office → table reglages → fonction prix_publics) et les écrit dans
 * src/config/prix-publics.json, lu par src/config/tarifs.ts (simulateur, pages, données Google).
 * Si la base ne répond pas ou renvoie des valeurs incomplètes, le fichier existant est gardé.
 */
import { readFile, writeFile } from 'node:fs/promises';

const FICHIER = new URL('../src/config/prix-publics.json', import.meta.url);
const src = await readFile(new URL('../src/config/supabase.ts', import.meta.url), 'utf8');
const URL_SB = src.match(/SUPABASE_URL = '([^']+)'/)[1], CLE = src.match(/SUPABASE_CLE_PUBLIQUE = '([^']+)'/)[1];

const nombre = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const grille = (g) => Array.isArray(g) && g.length === 4 && g.every(nombre);

try {
  const rep = await fetch(`${URL_SB}/rest/v1/rpc/prix_publics`, {
    method: 'POST', headers: { apikey: CLE, 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10000),
  });
  if (!rep.ok) throw new Error(`réponse ${rep.status}`);
  const p = await rep.json();
  if (!p || !grille(p.grids?.L) || !grille(p.grids?.T) || !grille(p.grids?.S) || !grille(p.installation)
      || ![p.m3Sup, p.residence, p.gardiennage, p.urgence].every(nombre)) throw new Error('valeurs incomplètes');
  const sortie = {
    grids: { L: p.grids.L, T: p.grids.T, S: p.grids.S },
    m3Sup: p.m3Sup, residence: p.residence, installation: p.installation,
    gardiennage: p.gardiennage, urgence: p.urgence,
  };
  const avant = await readFile(FICHIER, 'utf8').catch(() => '');
  const texte = JSON.stringify(sortie, null, 2) + '\n';
  if (avant !== texte) await writeFile(FICHIER, texte);
  console.log(`[prix] prix publics de l'appli utilisés (réglages du ${p.updated_at || '?'})`);
} catch (e) {
  console.warn(`[prix] base injoignable ou incomplète (${e.message}) : prix du fichier existant conservés`);
}
