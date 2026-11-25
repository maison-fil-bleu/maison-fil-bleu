# Ouvrir le site aux moteurs de recherche

Tant que le site est en préparation (numéros, SIRET et textes entre crochets à compléter), il est exclu des moteurs de recherche de deux façons :

1. `public/robots.txt` interdit toute exploration (`Disallow: /`) ;
2. `public/_headers` envoie l'en-tête `X-Robots-Tag: noindex, nofollow` sur toutes les pages (bloc `/*` en tête du fichier).

Le site reste accessible à qui connaît l'adresse, mais il n'apparaît pas dans Google.

**Pour l'ouvrir :**

1. remplacer `public/robots.txt` par `ouverture/robots.txt` (version définitive, avec le plan du site) ;
2. supprimer le bloc `/*` (deux lignes et son commentaire) en tête de `public/_headers`, en gardant les blocs `/admin` et `/espace-client` ;
3. mettre en ligne, puis déclarer le site dans Google Search Console et créer la fiche Google Business Profile.
