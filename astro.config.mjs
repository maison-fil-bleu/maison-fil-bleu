// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import faqSchema from './integrations/faq-schema.mjs';

// Pages exclues du sitemap (remerciements, 404) : elles sont aussi en « noindex ».
const EXCLUES = ['/admin', '/espace-client', '/merci', '/merci-partenaire', '/pro/merci-devis', '/pro/merci-grille', '/404'];

// [Nom de domaine définitif à confirmer] : sert aux adresses canoniques, au partage et au sitemap.
export default defineConfig({
  site: 'https://www.maisonfilbleu.fr',
  trailingSlash: 'never',
  build: { format: 'file' },
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      filter: (page) => !EXCLUES.some((e) => new URL(page).pathname.replace(/\/$/, '') === e),
      serialize: (item) => ({ ...item, url: item.url.replace(/\/$/, '') || item.url }),
    }),
    faqSchema(),
  ],
});
