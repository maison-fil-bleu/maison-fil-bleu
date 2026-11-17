// Service worker du back-office (/admin) : permet d'ouvrir l'appli sans réseau pendant une visite.
// Les pages et fichiers du site sont mis en cache ; les données (Supabase) ne le sont jamais.
const CACHE = 'fil-bleu-admin-v1';
const BASE = ['/admin', '/admin.webmanifest', '/icons/fil-bleu-192.png', '/fonts/admin/dm-sans-latin-400-normal.woff2', '/fonts/admin/dm-sans-latin-500-normal.woff2', '/fonts/admin/instrument-serif-latin-400-normal.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;           // Supabase et API : jamais en cache
  if (r.mode === 'navigate') {                                               // page : réseau d'abord, cache si hors ligne
    e.respondWith(fetch(r).then((rep) => { const c = rep.clone(); caches.open(CACHE).then((x) => x.put('/admin', c)); return rep; }).catch(() => caches.match('/admin')));
    return;
  }
  if (u.pathname.startsWith('/_astro/') || u.pathname.startsWith('/fonts/') || u.pathname.startsWith('/icons/')) {
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((rep) => { const c = rep.clone(); caches.open(CACHE).then((x) => x.put(r, c)); return rep; })));
  }
});
