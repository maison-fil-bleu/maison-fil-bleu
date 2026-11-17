// Génère les images de partage 1200 × 630 (public/og/*.png). À relancer si les textes changent.
// Usage : node scripts/og-images.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const W = 1200, H = 630;
// Les polices du site (woff2) ne sont pas lisibles par l'outil d'image : serif système proche (Georgia).
const POLICE_SERIF = '/System/Library/Fonts/Supplemental/Georgia.ttf';
const POLICE_SANS = 'node_modules/@fontsource/nunito-sans/files/nunito-sans-latin-500-normal.woff2';

const logo = (trait, fil) => `
<svg xmlns="http://www.w3.org/2000/svg" width="164" height="80" viewBox="0 0 164 80">
  <path d="M8 74 V44 L34 22 L60 44 V74" fill="none" stroke="${trait}" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="M104 74 V44 L130 22 L156 44 V74" fill="none" stroke="${trait}" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="M34 60 C52 76, 64 40, 82 54 S112 70, 130 60" fill="none" stroke="${fil}" stroke-width="3.8" stroke-linecap="round"/>
</svg>`;

const fond = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#F8F5EF"/>
  <rect x="0" y="${H - 14}" width="${W}" height="14" fill="#15233A"/>
  <line x1="96" y1="200" x2="200" y2="200" stroke="#8A6D43" stroke-width="2"/>
</svg>`;

const texte = (t, police, taille, couleur, largeur, interligne = 0, espacement = 0) =>
  sharp({
    text: {
      text: `<span foreground="${couleur}" letter_spacing="${espacement}">${t}</span>`,
      fontfile: police,
      font: `${police.includes('Georgia') ? 'Georgia' : 'Nunito Sans Medium'} ${taille}`,
      width: largeur,
      dpi: 72,
      rgba: true,
      spacing: interligne,
    },
  }).png().toBuffer();

async function image(fichier, { marque, titre, sousTitre }) {
  const calques = [
    { input: await sharp(Buffer.from(logo('#15233A', '#3D5A80'))).resize(164).png().toBuffer(), left: 96, top: 84 },
    { input: await texte(marque, POLICE_SANS, 22, '#15233A', 800, 0, 4000), left: 286, top: 120 },
    { input: await texte(titre, POLICE_SERIF, 64, '#15233A', 1000, 10), left: 96, top: 236 },
    { input: await texte(sousTitre, POLICE_SANS, 26, '#5B606A', 1000, 6), left: 96, top: 486 },
  ];
  await sharp(Buffer.from(fond)).composite(calques).png({ compressionLevel: 9 }).toFile(fichier);
  console.log('écrit', fichier);
}

await mkdir('public/og', { recursive: true });
await image('public/og/maison-fil-bleu.png', {
  marque: 'MAISON FIL BLEU',
  titre: 'Pour que chaque départ\nsoit une belle arrivée.',
  sousTitre: 'Transition et accompagnement des familles · Marseille et région PACA',
});
await image('public/og/fil-bleu-pro.png', {
  marque: 'FIL BLEU PRO',
  titre: 'Vos biens vides et propres,\nà la date prévue.',
  sousTitre: 'Débarras et nettoyage pour les professionnels · Marseille et région PACA',
});
