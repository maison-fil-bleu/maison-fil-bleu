// Génère les icônes de l'appli installable (/admin) à partir du pictogramme des deux maisons.
import sharp from 'sharp';
const svg = (taille, marge) => {
  const s = taille, m = s * marge, w = s - 2 * m, k = w / 164, oy = (s - 80 * k) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="#F6F4F0"/>
  <g transform="translate(${m} ${oy}) scale(${k})">
    <path d="M8 74 V44 L34 22 L60 44 V74" fill="none" stroke="#1E2430" stroke-width="5" stroke-linejoin="round"/>
    <path d="M104 74 V44 L130 22 L156 44 V74" fill="none" stroke="#1E2430" stroke-width="5" stroke-linejoin="round"/>
    <path d="M34 60 C52 76, 64 40, 82 54 S112 70, 130 60" fill="none" stroke="#3D5A80" stroke-width="5.5" stroke-linecap="round"/>
  </g></svg>`);
};
for (const [nom, taille, marge] of [['fil-bleu-180', 180, 0.14], ['fil-bleu-192', 192, 0.14], ['fil-bleu-512', 512, 0.14], ['fil-bleu-masque-512', 512, 0.24]]) {
  await sharp(svg(taille, marge)).png().toFile(`public/icons/${nom}.png`);
}
console.log('icônes générées');
