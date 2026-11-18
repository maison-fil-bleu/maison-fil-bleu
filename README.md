# Maison Fil Bleu · site statique (Astro)

Site de **Maison Fil Bleu** et de sa partie **Fil Bleu Pro** (SAS Groupe Fil Bleu, Les Pennes-Mirabeau).
Référence : `../passation/maison-fil-bleu-passation/PASSATION.md` et les maquettes `maquettes/*.dc.html`.

## Commandes

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # site final dans dist/
npm run preview  # sert dist/ en local
```

## Organisation

| Dossier / fichier | Rôle |
|---|---|
| `src/config/site.ts` | Coordonnées, mentions légales, formules, articles (un seul endroit à modifier) |
| `src/styles/global.css` | Couleurs, classes communes `.w .sec .lbl .h1 .h2 .h3 .lead .p .btn .btn2 .tl .num .card .ph .tag .htag .g2 .g3 .g4 .row` |
| `src/styles/fonts.css` + `public/fonts/` | Cormorant Garamond et Nunito Sans hébergées en local (woff2) |
| `src/components/Header.astro`, `Footer.astro` | En-tête et pied de page famille |
| `src/components/ProHeader.astro`, `ProFooter.astro` | En-tête et pied de page Fil Bleu Pro |
| `src/scripts/menus.ts` | Menus : survol / clic / clavier, Échap, clic extérieur |
| `src/layouts/Famille.astro`, `Pro.astro` | Mises en page des deux marques |
| `src/assets/photos/` | Photos à déposer : `<page>-<emplacement>.jpg` |

## Avancement

- [x] Étape 1 : projet, styles communs, polices locales, en-têtes et pieds de page
- [x] Étape 2 : accueil, trois formules, autres pages (textes repris mot pour mot des maquettes, contrôle automatique)
- [x] Étape 3 : simulateur `/estimation`
- [x] Étape 4 : formulaires Netlify et pages de remerciement
- [x] Étape 5 : référencement (title/meta, données structurées, sitemap, robots, Open Graph)
- [x] Étape 6 : vérifications (téléphone, tablette, ordinateur, clavier, contrastes, Lighthouse ≥ 95)
- [x] Back-office : étapes 1 à 6 de PASSATION-APPLI.md (base et règles d'accès, appli /admin, onglet Espace client, page /espace-client et invitations, formulaires → dossiers, prix partagés) ; étape 7 sans objet (aucun dossier existant) ; étape 8 (vérifications) préparée le 17/11/2026
- [x] Étape 7 : mise en ligne Netlify — https://maison-fil-bleu.netlify.app (dépôt GitHub `maison-fil-bleu/maison-fil-bleu`, public ; chaque envoi sur `main` republie le site). Formulaires `rappel`, `devis-pro`, `grille-pro` détectés, notification e-mail active, envoi d'essai reçu.

## Back-office et espace client (PASSATION-APPLI.md)

| Élément | Où |
|---|---|
| Back-office (appli « Fil Bleu Dossiers », installable sur téléphone) | `/admin` · `src/pages/admin.astro`, `src/admin/` |
| Espace client des familles | `/espace-client` · `src/pages/espace-client.astro`, `src/espace/espace.js` |
| Base de données, règles d'accès, tests | `supabase/migrations/`, `supabase/tests/regles-acces.sql` |
| Invitation à l'espace client | `netlify/functions/inviter.mjs` (`/api/inviter`) |
| Formulaires du site → dossiers | `netlify/functions/submission-created.mjs` (déclenchée par Netlify Forms) |
| Mise à jour des prix du site | `netlify/functions/republier.mjs` (`/api/republier`) + `scripts/prix-publics.mjs` |

- **Supabase** : projet `maison-fil-bleu` (région Paris), compte distinct de celui d'Hexalia. Clé publique dans `src/config/supabase.ts` ; la clé secrète n'est jamais dans le code.
- **Variables Netlify** (secrètes) : `SUPABASE_SERVICE_ROLE_KEY` (clé secrète Supabase « netlify ») et `NETLIFY_BUILD_HOOK` (crochet de construction « Prix depuis l'appli »).
- **Accès** : administrateurs listés dans la table `admins` (l'e-mail n'est pas dans le code), double authentification obligatoire ; inscriptions publiques fermées ; une famille ne lit que ses étapes, ses photos partagées et ses documents.
- **Commandes** : `npm run test:acces` (règles d'accès), `npm run db:push` (nouvelles migrations).
- **Sauvegarde** : bouton « Exporter mes dossiers » dans les Réglages de l'appli (fichier JSON). Les sauvegardes automatiques de Supabase demandent l'offre payante.

**À faire avant d'ouvrir l'espace client aux familles** : nom de domaine + service d'envoi d'e-mails (Resend ou Brevo) branché en SMTP dans Supabase. Sans lui, Supabase n'envoie les e-mails qu'aux membres de l'équipe, en anglais et au plus 2 par heure. Le modèle d'e-mail en français est prêt : `supabase/templates/code-connexion.html` (à activer dans `supabase/config.toml`). Notifications aux familles lors d'un changement d'étape : à ajouter avec ce même service.

**Quota Netlify (offre gratuite)** : chaque mise en ligne, y compris un clic sur « Mettre à jour les prix du site », consomme des crédits (environ 20 par mois). Regrouper les envois sur `main`.

## Pages partenaires (BRIEF-pages-partenaires.md)

- **`/notaires`, `/agences`, `/residences`** : adresses imprimées dans les QR codes des plaquettes, **à ne jamais changer** (`/notaires/` redirige automatiquement vers `/notaires`). Mise en page commune : `src/components/PagePartenaire.astro`.
- **`/partenaires`** : page d'accès aux trois (lien « Espace partenaires » du pied de page).
- **Formulaire `partenaire`** (Netlify Forms, champ caché `source`) → `/merci-partenaire`, et dossier créé dans l'appli pour la famille à rappeler (coordonnées du partenaire dans les notes).
- **Plaquettes PDF** : `public/docs/` (à remplacer par les versions définitives, mêmes noms de fichiers).

## Simulateur d'estimation

- **Prix : réglés dans l'appli** (back-office › Réglages › Prix TTC, puis « Mettre à jour les prix du site »). À chaque construction, `scripts/prix-publics.mjs` les recopie dans `src/config/prix-publics.json`, lu par `src/config/tarifs.ts` (coefficients et options propres au site).
- Affichage choisi par le fondateur : la **formule adaptée** et son **prix de départ « à partir de … TTC »** selon la taille du logement (logement actuel en Transition). Les besoins cochés (caves, garage, grenier, futur logement, recherche de résidence, box, installation chez un proche, gardiennage, urgence, maison, étage sans ascenseur) sont listés **sans aucun montant** : ils sont chiffrés après le diagnostic offert.
- Le bouton « Être rappelé pour un prix exact » ouvre `/contact` prérempli (situation, taille) avec un encadré « Votre sélection en ligne » et deux champs cachés `estimation` et `besoins` qui partiront avec le formulaire.
- `/estimation?formule=liberation|transition|succession` présélectionne la formule.
- Le calcul complet de la fourchette (§ 7 de la passation : options, coefficients maison / sans ascenseur, urgence + 25 %) reste disponible dans `fourchette()` de `src/lib/estimation.ts`, non affiché pour le moment.
- Attention : les prix « dès … € » écrits dans les textes des pages (accueil, formules, tarifs) reprennent les maquettes ; en cas de changement de prix, les mettre à jour aussi.

## Photos

`src/components/Photo.astro` et `Hero.astro` affichent l'encart beige tant que le fichier manque,
puis la photo (WebP, chargement différé) dès qu'elle est déposée dans `src/assets/photos/`.
Liste complète des 34 photos avec leur description : `src/assets/photos/LISTE.md`.

## Référencement

- Titres et descriptions : `src/config/meta.ts` (uniques, avec le lieu, longueurs adaptées à Google).
- Canonique, Open Graph et carte de partage : `src/layouts/Base.astro`. Images de partage `public/og/*.png`, régénérées par `node scripts/og-images.mjs`.
- Données structurées (`src/config/seo.ts`) : `LocalBusiness` sur toutes les pages (Maison Fil Bleu ou Fil Bleu Pro), `Service` + fil d'Ariane sur les trois formules, `Article` + fil d'Ariane sur les conseils. Les coordonnées encore entre crochets en sont omises automatiquement.
- `FAQPage` : ajouté automatiquement à la construction à partir des questions fréquentes des pages (`integrations/faq-schema.mjs`).
- `sitemap-index.xml` (sans les pages de remerciement ni la 404), `public/robots.txt`, page `404`.
- À faire après la mise en ligne : déclarer le site et le sitemap dans Google Search Console, créer la fiche Google Business Profile. Renseigner `DATE_PUBLICATION_ARTICLES` dans `src/config/seo.ts`.

## Vérifications (étape 6, 16/11/2026)

- **Lighthouse** (site construit, mobile et ordinateur, 20 pages publiques) : **100** en performance, accessibilité, bonnes pratiques et référencement sur toutes les pages. Seules les pages de remerciement ont un score SEO plus bas, volontairement (exclues de Google).
- **Largeurs** : 360, 390, 768, 1024 et 1440 px sur les 24 pages : aucun débordement horizontal.
- **Clavier** : lien « Aller au contenu », focus visible, menus (survol, clic, Entrée, Échap), simulateur, questions fréquentes, formulaires.
- **Contrastes** : laiton assombri à `#735A33` pour les petits textes (le `#8A6D43` reste pour les filets et les grands chiffres) ; gris de l'exemple de compte rendu (Notre méthode) assombri.
- **Titres** : niveaux corrigés (Notre méthode, Conseils, encadré latéral des articles).
- À refaire quand les photos seront ajoutées : contraste du texte sur les photos de haut de page et score de performance.

## Éléments à fournir par le fondateur (entre crochets sur le site)

À renseigner dans `src/config/site.ts` sauf mention contraire.

- [ ] Téléphone (famille) — `[06 00 00 00 00]` ; devient un lien cliquable dès qu'il est renseigné
- [ ] Téléphone Fil Bleu Pro
- [ ] E-mail de contact — `[contact@maisonfilbleu.fr]`
- [ ] E-mail pro — `[pro@maisonfilbleu.fr]`
- [ ] Horaires définitifs
- [ ] Adresse du siège — `[adresse]`, 13170 Les Pennes-Mirabeau
- [ ] SIRET, RCS, TVA intracommunautaire
- [ ] RC professionnelle (assureur, n° de contrat)
- [ ] Récépissé de transport de déchets (n°)
- [ ] Médiateur de la consommation (nom)
- [ ] Agence partenaire : nom de l'agence, nom de l'agent commercial, RSAC (ville, n°), carte professionnelle de l'agence (n°, CCI)
- [ ] Délais de réponse des pages de remerciement (rappel « le jour même ou le lendemain », devis et grille « sous 24 heures ») à confirmer
- [ ] Délais (ex. `[2 à 3 semaines]` sur la page Libération)
- [ ] Exemple de compte rendu (page Notre méthode) : `[Nom]`, `[date]`
- [ ] Textes : mentions légales, CGV ; politique de confidentialité rédigée en projet (durées de conservation et prestataire d'e-mails entre crochets) : à faire valider
- [ ] Nom de domaine définitif (`astro.config.mjs` et `public/robots.txt`, actuellement `https://www.maisonfilbleu.fr`)
- [ ] Photos (voir `src/assets/photos/LISEZMOI.md`)
- [ ] Après achat du domaine : le brancher dans Netlify (Domain management), puis Google Search Console et fiche Google Business Profile
- [ ] Date de publication des articles (`DATE_PUBLICATION_ARTICLES` dans `src/config/seo.ts`)

## Écarts volontaires par rapport aux maquettes

- Pied de page Pro : lien « Maison Fil Bleu » éclairci (`#B9C1CE`) car le gris de la maquette était illisible sur bleu nuit ; ajout des liens Mentions légales / CGV / Confidentialité.
- En-tête Pro : ajout d'un menu hamburger sous 960 px (la maquette masquait la navigation sans solution de remplacement).
- En-tête famille entre 961 et 1 180 px : navigation resserrée et « Vous êtes professionnel ? » masqué, pour que tout tienne sur une ligne.
- Conseils : les filtres par thème (Tous, Succession…) fonctionnent réellement (petit script).
- Contact : les choix « pour vous-même / un proche » et « situation » changent d'aspect quand on les sélectionne.
- Haut de page sur mobile : marges réduites et étiquette photo placée au-dessus du texte.
- Estimation sur téléphone : petit bandeau fixé en bas avec la formule et le prix de départ, visible tant que le résultat est hors de l'écran (toucher le bandeau y mène).
- Tarifs : « À partir de · TTC » placé au-dessus des montants (et non au-dessus de la colonne des formules) ; gardiennage à 150 € par mois.
- Estimation : texte d'introduction adapté (formule adaptée et prix de départ au lieu d'une fourchette).
- Onglet en cours souligné d'un filet laiton (demandé par la passation, absent des maquettes).
