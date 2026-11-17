// Ajoute, à la construction, les données structurées FAQPage (schema.org) aux pages
// qui contiennent des questions fréquentes (<details class="q"><summary>Question</summary>Réponse</details>).
// Les textes viennent donc directement des pages : rien à recopier à la main.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENTITES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const texte = (h) =>
  h
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITES[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ')
    .trim();

async function* fichiersHtml(dossier) {
  for (const e of await readdir(dossier, { withFileTypes: true })) {
    const p = join(dossier, e.name);
    if (e.isDirectory()) yield* fichiersHtml(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

export default function faqSchema() {
  return {
    name: 'faq-schema',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        let n = 0;
        for await (const f of fichiersHtml(fileURLToPath(dir))) {
          const html = await readFile(f, 'utf8');
          const qr = [...html.matchAll(/<details class="q"[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)];
          if (!qr.length) continue;
          const donnees = {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: qr.map(([, q, r]) => ({
              '@type': 'Question',
              name: texte(q),
              acceptedAnswer: { '@type': 'Answer', text: texte(r) },
            })),
          };
          const balise = `<script type="application/ld+json">${JSON.stringify(donnees).replace(/</g, '\\u003c')}</script>`;
          await writeFile(f, html.replace('</head>', `${balise}</head>`));
          n++;
        }
        logger.info(`FAQPage ajouté à ${n} page(s)`);
      },
    },
  };
}
