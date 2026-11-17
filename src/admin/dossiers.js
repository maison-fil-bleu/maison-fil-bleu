/**
 * Fil Bleu Dossiers : appli de terrain du fondateur, devenue le back-office (/admin).
 * Logique, calculs, grilles, générateur PDF, signature, recherche d'adresse et inventaire
 * repris à l'identique de fil-bleu-dossiers.html ; seuls le stockage (Supabase),
 * les photos, le téléchargement et le mode hors ligne ont changé.
 */
export function demarrerAppli({ sb, utilisateur, actions }) {
const $ = (s, el=document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur = n => (Math.round(n)).toLocaleString('fr-FR') + ' €';
const num = (n,d=1) => (Math.round(n*10**d)/10**d).toLocaleString('fr-FR');

/* ---------- Réglages par défaut (modifiables dans l'appli) ---------- */
const DEFAULTS = {
  grids: { L:[1560,2550,3160,4340], T:[3200,4200,4900,6700], S:[2600,3900,4600,6300] },
  proNettoyage: [225,325,375,540], proForfait: 150, proM3: 46, proM3Inclus: 3, proM2Grand: 6,
  proOpts: { vitres:[12,0.25], four:[25,0.75], frigo:[15,0.5], hotte:[15,0.5], placards:[15,0.5], murs:[3,0.08], moquette:[6,0.1], balcon:[40,0.75], cave:[40,1] },
  volDefaut: [14,25,32,50], surfDefaut: [35,70,90,110],
  evacDefaut: { L:70, T:50, S:75, P:100 },
  heuresSup: { L:[3,4,5,6], T:[30,48,56,70], S:[12,16,19,24], P:[0,0,0,0] },
  rythmeM3: 1.3, rythmeM2: 0.15, baie: 0.25, objetLourd: 1, partPorteur: 0.5,
  interim: 21.64, porteur: 28, decheterie: 18, camionJour: 110, consommables: 35, kmCout: 0.30, vitesse: 50, adminH: 4,
  partCom: 0.7, honorairesMoyens: 12500,
  m3Sup: 75, residence: 700, installation: [350,400,720,880], gardiennage: 150, urgence: 25, horsDep: 550, tva: 20,
  soc: { siegeVille:'Les Pennes-Mirabeau', adresse:'[adresse], 13170 Les Pennes-Mirabeau', siret:'[n°]', rcs:'[n°]', tva:'[n°]', tel:'[06 00 00 00 00]', email:'[contact@maisonfilbleu.fr]', mediateur:'[nom et site du médiateur]', signataire:'[Prénom Nom], président' }
};
const COORDS = {"Marseille":[43.296,5.370],"Marseille 1er":[43.300,5.384],"Marseille 2e":[43.312,5.366],"Marseille 3e":[43.311,5.380],"Marseille 4e":[43.307,5.401],"Marseille 5e":[43.293,5.398],"Marseille 6e":[43.287,5.381],"Marseille 7e":[43.283,5.362],"Marseille 8e":[43.248,5.383],"Marseille 9e":[43.233,5.433],"Marseille 10e":[43.274,5.426],"Marseille 11e":[43.290,5.481],"Marseille 12e":[43.307,5.443],"Marseille 13e":[43.350,5.432],"Marseille 14e":[43.343,5.393],"Marseille 15e":[43.360,5.362],"Marseille 16e":[43.362,5.317],
"Les Pennes-Mirabeau":[43.410,5.310],"Septèmes-les-Vallons":[43.398,5.366],"Cabriès":[43.441,5.380],"Bouc-Bel-Air":[43.452,5.414],"Simiane-Collongue":[43.430,5.433],"Gardanne":[43.455,5.469],"Mimet":[43.415,5.502],"Meyreuil":[43.487,5.497],"Aix-en-Provence":[43.529,5.447],"Venelles":[43.598,5.483],"Éguilles":[43.569,5.355],"Ventabren":[43.538,5.295],"Saint-Cannat":[43.620,5.298],"Rognes":[43.663,5.348],"Le Puy-Sainte-Réparade":[43.663,5.437],"Meyrargues":[43.637,5.527],"Lambesc":[43.654,5.262],
"Plan-de-Cuques":[43.347,5.463],"Allauch":[43.336,5.482],"La Penne-sur-Huveaune":[43.282,5.515],"Aubagne":[43.293,5.571],"Carnoux-en-Provence":[43.255,5.565],"Roquefort-la-Bédoule":[43.249,5.590],"Cassis":[43.215,5.539],"Ceyreste":[43.213,5.630],"La Ciotat":[43.175,5.605],"Gémenos":[43.296,5.628],"Cuges-les-Pins":[43.276,5.700],"Roquevaire":[43.350,5.604],"Auriol":[43.371,5.634],"La Destrousse":[43.375,5.600],"Peypin":[43.385,5.578],"Cadolive":[43.397,5.545],"Saint-Savournin":[43.408,5.527],"Gréasque":[43.433,5.545],"Belcodène":[43.426,5.588],"Fuveau":[43.453,5.562],"Châteauneuf-le-Rouge":[43.489,5.570],"Rousset":[43.483,5.620],"Peynier":[43.448,5.641],"Trets":[43.447,5.684],
"Vitrolles":[43.460,5.248],"Marignane":[43.416,5.215],"Saint-Victoret":[43.420,5.235],"Gignac-la-Nerthe":[43.392,5.236],"Le Rove":[43.369,5.251],"Ensuès-la-Redonne":[43.355,5.200],"Carry-le-Rouet":[43.331,5.152],"Sausset-les-Pins":[43.331,5.108],"Châteauneuf-les-Martigues":[43.383,5.164],"Martigues":[43.405,5.048],"Port-de-Bouc":[43.405,4.987],"Fos-sur-Mer":[43.438,4.945],"Saint-Mitre-les-Remparts":[43.455,5.014],"Port-Saint-Louis-du-Rhône":[43.387,4.803],"Berre-l'Étang":[43.477,5.168],"Rognac":[43.488,5.233],"Velaux":[43.523,5.253],"Coudoux":[43.557,5.250],"La Fare-les-Oliviers":[43.551,5.195],"Saint-Chamas":[43.550,5.035],"Istres":[43.514,4.988],"Miramas":[43.582,5.002],"Grans":[43.608,5.064],"Salon-de-Provence":[43.640,5.097],"Pélissanne":[43.632,5.151],"Eyguières":[43.694,5.031],"Sénas":[43.745,5.077],"Mallemort":[43.731,5.180],"Orgon":[43.791,5.039],
"Arles":[43.677,4.631],"Tarascon":[43.806,4.660],"Saint-Rémy-de-Provence":[43.789,4.832],"Châteaurenard":[43.882,4.855],"Noves":[43.877,4.902],"Pertuis (84)":[43.694,5.502],"Cavaillon (84)":[43.837,5.038],"Avignon (84)":[43.949,4.806],"Saint-Cyr-sur-Mer (83)":[43.183,5.708],"Bandol (83)":[43.136,5.753],"Saint-Maximin (83)":[43.452,5.862],"Brignoles (83)":[43.406,6.061],"Toulon (83)":[43.124,5.928],"Nîmes (30)":[43.837,4.360],"Autre (km à saisir)":null};
const ROUTE_COEF = 1.3; // la route fait environ 30 % de plus que la ligne droite
function haversine(a,b){ const R=6371, r=x=>x*Math.PI/180, dLa=r(b[0]-a[0]), dLo=r(b[1]-a[1]); const h=Math.sin(dLa/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dLo/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
function siegePt(){ const so = {...DEFAULTS.soc, ...(S.soc||{})}; return (so.siegeLat ? [so.siegeLat, so.siegeLon] : null) || COORDS[so.siegeVille] || COORDS['Les Pennes-Mirabeau']; }
function ptOf(loc){ if(!loc) return null; if(loc.lat) return [loc.lat, loc.lon]; return COORDS[loc.ville] || null; }
function kmEst(a,b){ if(!a||!b) return null; return Math.max(2, Math.round(haversine(a,b)*ROUTE_COEF)); }
let geoOK = true;
async function geoSearch(q){ if(!geoOK || q.trim().length<4) return []; try{ const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), 4000);
  const r = await fetch('https://api-adresse.data.gouv.fr/search/?limit=5&q='+encodeURIComponent(q), {signal:ctl.signal}); clearTimeout(t); const j = await r.json();
  return (j.features||[]).map(f => ({label:f.properties.label, ville:f.properties.city, cp:f.properties.postcode, lat:f.geometry.coordinates[1], lon:f.geometry.coordinates[0]})); }catch(e){ geoOK = false; return []; } }
async function routeKm(a,b){ if(!a||!b) return null; try{ const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), 4000);
  const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=false`, {signal:ctl.signal}); clearTimeout(t); const j = await r.json();
  return j.routes?.[0] ? Math.round(j.routes[0].distance/1000) : null; }catch(e){ return null; } }
function villeFrom(name){ if(!name) return null; if(COORDS[name]) return name; const m = /^Marseille/i.test(name) ? 'Marseille' : null; return m || Object.keys(COORDS).find(k => k.toLowerCase().startsWith(name.toLowerCase())) || null; }
// Recalcule les distances d'un dossier (estimation immédiate, puis distance routière si disponible)
async function updateDistances(d, quiet){
  const sg = siegePt(), A = ptOf(d.adr || {ville:d.ville}), N = d.nouveau ? ptOf(d.nouveau.adr || {ville:d.nouveau.ville}) : null;
  if(A && !d.kmManuel) d.km = kmEst(sg, A);
  if(d.nouveau){ if(N) d.nouveau.km = kmEst(sg, N); if(A && N) d.nouveau.kmAN = kmEst(A, N); }
  d.kmSource = 'estime'; persist(d); if(!quiet) rerender();
  const [r1, r2, r3] = await Promise.all([A && !d.kmManuel ? routeKm(sg,A) : null, N ? routeKm(sg,N) : null, A && N ? routeKm(A,N) : null]);
  if(r1!=null || r2!=null || r3!=null){ if(r1!=null) d.km = r1; if(d.nouveau){ if(r2!=null) d.nouveau.km = r2; if(r3!=null) d.nouveau.kmAN = r3; } d.kmSource = 'route'; persist(d); rerender(); }
}
function rerender(){ const a = document.activeElement; if(a && (a.tagName==='INPUT'||a.tagName==='TEXTAREA') && a.type!=='checkbox') return; const y = window.scrollY; render(); window.scrollTo(0,y); }
const QUICK_INV = ["lit2","lit1","arm2","arm3","commode","can3","fauteuil","table","buffet","biblio","frigo2","lavelinge","congel","piano"];
const NOUV_TYPES = {residence:'Résidence seniors', ehpad:'EHPAD', appartement:'Appartement', maison:'Maison', famille:'Chez un proche'};
const NOUV_TAILLES = ['Chambre','Studio','2 pièces','3 pièces','4 pièces et +'];
const SITU = { vente:"Vend son logement", residence:"Part en résidence / EHPAD", demenage:"Déménage ailleurs", deces:"Décès (succession)", vide:"Logement vide ou tout part" };
const FORM = { L:"Libération", T:"Transition", S:"Succession", P:"Fil Bleu Pro" };
const INVENTAIRE = [
  ["Chambre", [["lit1","Lit une place",1],["lit2","Lit deux places",1.8],["matelas","Matelas seul",0.6],["arm1","Armoire 1 porte",1],["arm2","Armoire 2 portes",1.8],["arm3","Armoire 3 portes",2.5],["commode","Commode",0.6],["chevet","Table de chevet",0.2],["bureau","Bureau",1],["chaise","Chaise",0.2],["penderie","Vêtements (par penderie)",0.5]]],
  ["Séjour", [["can2","Canapé 2 places",1.5],["can3","Canapé 3 places",2],["canangle","Canapé d'angle",3],["fauteuil","Fauteuil",0.8],["table","Table et 4 chaises",1.5],["tbasse","Table basse",0.4],["buffet","Buffet, bahut",1.5],["vaisselier","Vaisselier",2],["biblio","Bibliothèque",1],["meubletv","Meuble TV",0.6],["tapis","Tapis",0.2],["piano","Piano droit",2]]],
  ["Cuisine et électroménager", [["frigo1","Frigo simple",0.8],["frigo2","Frigo double (combiné)",1.2],["frigoUS","Frigo américain",1.5],["congel","Congélateur",1],["lavelinge","Lave-linge",0.5],["seche","Sèche-linge",0.5],["lavevaisselle","Lave-vaisselle",0.5],["cuisiniere","Cuisinière, four",0.5],["microondes","Micro-ondes",0.1],["elemcuisine","Meuble de cuisine (par élément)",0.4]]],
  ["Divers", [["carton","Carton",0.06],["sac","Sac de 100 litres",0.1],["velo","Vélo",0.5],["jardin","Mobilier de jardin (lot)",1],["electro","Petit électroménager, TV (lot)",0.3]]]
];
const INV_VOL = Object.fromEntries(INVENTAIRE.flatMap(([,it]) => it.map(([k,,v]) => [k,v])));
function invTotal(inv, mes){ const base = Object.entries(inv||{}).reduce((a,[k,n]) => a + (INV_VOL[k]||0)*n, 0) + (mes||[]).reduce((a,m)=>a+(m.m3||0),0); return Math.round(base*1.2*10)/10; }
function volBase(d){ return S.volDefaut[d.taille] * (d.typeLog==='maison' ? 1.2 : 1); }
function applyVol(d){ const mode = d.diag.volMode || 'base'; if(mode==='base') d.diag.volume = Math.round(volBase(d)); else if(mode==='detail'){ const t = invTotal(d.diag.inventaire, d.diag.mesures); if(t>0) d.diag.volume = t; } }
const PRO_OPTS = [["vitres","Baie vitrée ou grande fenêtre en plus","u"],["four","Four (intérieur)","u"],["frigo","Réfrigérateur (intérieur)","u"],["hotte","Hotte","u"],["placards","Intérieur des placards (par pièce)","u"],["murs","Lessivage des murs","m²"],["moquette","Shampoing moquette","m²"],["balcon","Balcon ou terrasse","u"],["cave","Cave ou garage","u"]];
const PRO_TYPES = {finbail:"Fin de bail", vente:"Avant vente ou location", travaux:"Après travaux"};
const FORM_DESC = {
  L:"Tri avec vous de ce que vous gardez, donnez ou laissez partir, dons aux associations, débarras, nettoyage, reportage photo et remise des clés.",
  T:"Libération du logement, plan du nouveau logement, tri accompagné, comparaison des devis de déménageurs, coordination du jour J, installation complète, démarches et visite de suivi à J+15.",
  S:"Libération du logement, lien avec le notaire, reportage photo, partage des objets entre les héritiers, papiers et résiliations, accompagnement jusqu'à la vente.",
  P:"Débarras et nettoyage du logement, évacuation en filières agréées, photos avant et après."
};
const MANDAT = [['non','Pas abordé'],['discussion','En discussion'],['signe','Mandat signé'],['refus','Refusé']];
const SUIVI0 = { hDeb:0, hNet:0, hAutres:0, hInterim:0, hAdmin:0, m3:0, joursCamion:0, frais:0, acompte:false, solde:false, liste:false, decharge:false, objets:'', mandat:'non', mandatType:'vente', honoraires:0, vendu:false, fini:false, notes:'' };
const STATUTS =["Appel","Diagnostic","Devis envoyé","Signé","Terminé","Perdu"];
const TAILLES = ["1-2 pièces","3 pièces","4 pièces","5 pièces et +"];

let S = structuredClone(DEFAULTS);
let dossiers = {};          // id -> data
let view = {name:'list'};   // list | dossier | settings
let tab = 'appel';
let store = 'db';
let saveTimers = {};

/* ---------- Stockage : Supabase, avec file d'attente hors ligne ---------- */
// Les modifications partent 500 ms après la dernière saisie. Sans réseau, elles sont gardées
// sur l'appareil (file d'attente) et envoyées au retour du réseau.
const K_CACHE = 'fb-cache-dossiers', K_FILE = 'fb-file-attente', K_SUPPR = 'fb-suppressions', K_REGL = 'fb-cache-reglages';
function localGet(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } }
function localSet(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function loadLocal(){ dossiers = localGet(K_CACHE) || {}; const s = localGet(K_REGL); if(s) S = {...structuredClone(DEFAULTS), ...s}; }
function fileAttente(){ return localGet(K_FILE) || {}; }
function suppressions(){ return localGet(K_SUPPR) || []; }
function nbEnAttente(){ return Object.keys(fileAttente()).length + suppressions().length + (photosEnAttente||0); }
const ligne = d => ({ id: d.id, created_at: d.created || new Date().toISOString(), statut: d.statut, formule: d.formule, data: d });
async function envoyer(d){
  const { error } = await sb.from('dossiers').upsert(ligne(d));
  if(error) throw error;
}
function persist(d){
  dossiers[d.id] = d;
  localSet(K_CACHE, dossiers);
  clearTimeout(saveTimers[d.id]);
  saveTimers[d.id] = setTimeout(async () => {
    delete saveTimers[d.id];
    try{ if(!navigator.onLine) throw new Error('hors ligne'); await envoyer(d); const f = fileAttente(); if(f[d.id]){ delete f[d.id]; localSet(K_FILE, f); } }
    catch(e){ const f = fileAttente(); f[d.id] = d; localSet(K_FILE, f); majBandeau(); }
  }, 500);
}
async function viderFile(){
  if(!navigator.onLine) return;
  const f = fileAttente(); let ok = 0;
  for(const [id, d] of Object.entries(f)){ try{ await envoyer(d); delete f[id]; ok++; }catch(e){ break; } }
  localSet(K_FILE, f);
  const sup = suppressions(), reste = [];
  for(const id of sup){ const { error } = await sb.from('dossiers').delete().eq('id', id); if(error) reste.push(id); }
  localSet(K_SUPPR, reste);
  await envoyerPhotosEnAttente();
  if(ok) showToast('Modifications hors ligne envoyées.');
  majBandeau();
}
async function chargerDistant(){
  const [{ data: rows, error }, { data: reg }] = await Promise.all([
    sb.from('dossiers').select('id, data'),
    sb.from('reglages').select('data').eq('id', 1).maybeSingle()
  ]);
  if(error) throw error;
  const next = {}; (rows||[]).forEach(r => next[r.id] = r.data);
  // Garder ce qui n'est pas encore parti (saisie en cours ou file d'attente).
  Object.assign(next, fileAttente());
  Object.keys(saveTimers).forEach(id => { if(dossiers[id]) next[id] = dossiers[id]; });
  suppressions().forEach(id => delete next[id]);
  dossiers = next; localSet(K_CACHE, dossiers);
  if(reg?.data){ S = {...structuredClone(DEFAULTS), ...reg.data}; localSet(K_REGL, S); }
  else { await sb.from('reglages').upsert({ id: 1, data: S }); }
}
async function persistSettings(){
  localSet(K_REGL, S);
  const { error } = await sb.from('reglages').upsert({ id: 1, data: S });
  if(error) showToast("Réglage gardé sur l'appareil : il sera envoyé au retour du réseau.");
}
async function removeDossier(id){
  clearTimeout(saveTimers[id]); delete saveTimers[id];   // annule un enregistrement en attente
  delete dossiers[id]; localSet(K_CACHE, dossiers);
  const f = fileAttente(); delete f[id]; localSet(K_FILE, f);
  const { error } = navigator.onLine ? await sb.from('dossiers').delete().eq('id', id) : { error: true };
  if(error){ localSet(K_SUPPR, [...new Set([...suppressions(), id])]); majBandeau(); }
}

/* ---------- Photos : Supabase Storage (bucket privé « photos »), avec file hors ligne ---------- */
let photosEnAttente = 0;
const urlsPhotos = {};   // chemin -> URL signée (ou URL locale tant que la photo n'est pas envoyée)
async function reduireImage(file){
  // Réduit les photos du téléphone (3 à 5 Mo) à 2000 px de côté, JPEG 82 %.
  try{
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width*k); cv.height = Math.round(bmp.height*k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise(res => cv.toBlob(b => res(b || file), 'image/jpeg', 0.82));
  }catch(e){ return file; }
}
function idb(){ return new Promise((res, rej) => { const r = indexedDB.open('fb-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('attente', { keyPath: 'chemin' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbTout(){ const db = await idb(); return new Promise(res => { const q = db.transaction('attente').objectStore('attente').getAll(); q.onsuccess = () => res(q.result||[]); q.onerror = () => res([]); }); }
async function idbMettre(o){ const db = await idb(); return new Promise(res => { const t = db.transaction('attente','readwrite'); t.objectStore('attente').put(o); t.oncomplete = res; t.onerror = res; }); }
async function idbRetirer(chemin){ const db = await idb(); return new Promise(res => { const t = db.transaction('attente','readwrite'); t.objectStore('attente').delete(chemin); t.oncomplete = res; t.onerror = res; }); }
async function compterPhotosEnAttente(){ try{ const t = await idbTout(); photosEnAttente = t.length; t.forEach(p => { if(!urlsPhotos[p.chemin]) urlsPhotos[p.chemin] = URL.createObjectURL(p.blob); }); }catch(e){ photosEnAttente = 0; } }
async function envoyerPhotosEnAttente(){
  let t = []; try{ t = await idbTout(); }catch(e){ return; }
  for(const p of t){
    const { error } = await sb.storage.from('photos').upload(p.chemin, p.blob, { contentType: 'image/jpeg', upsert: true });
    if(error) break; await idbRetirer(p.chemin);
  }
  await compterPhotosEnAttente();
}
async function ajouterPhoto(d, file){
  const blob = await reduireImage(file);
  const chemin = `${d.id}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}.jpg`;
  urlsPhotos[chemin] = URL.createObjectURL(blob);
  d.photos = [...(d.photos||[]), { chemin, date: new Date().toISOString() }]; persist(d);
  const { error } = navigator.onLine ? await sb.storage.from('photos').upload(chemin, blob, { contentType: 'image/jpeg' }) : { error: true };
  if(error){ await idbMettre({ chemin, blob }); await compterPhotosEnAttente(); majBandeau(); }
}
async function remplirVignettes(){
  const imgs = [...app.querySelectorAll('img[data-chemin]')];
  const manquants = imgs.map(i => i.dataset.chemin).filter(c => !urlsPhotos[c]);
  if(manquants.length && navigator.onLine){
    const { data } = await sb.storage.from('photos').createSignedUrls([...new Set(manquants)], 3600);
    (data||[]).forEach(x => { if(x.signedUrl) urlsPhotos[x.path] = x.signedUrl; });
  }
  imgs.forEach(i => { const u = urlsPhotos[i.dataset.chemin]; if(u && i.src !== u) i.src = u; });
}

/* ---------- Bandeau d'état (hors ligne, en attente) ---------- */
function majBandeau(){
  const el = document.getElementById('etat-reseau'); if(!el) return;
  const n = nbEnAttente();
  if(!navigator.onLine){ el.hidden = false; el.textContent = `Hors ligne : vos modifications sont gardées sur l'appareil${n?` (${n} en attente)`:''} et partiront au retour du réseau.`; }
  else if(n){ el.hidden = false; el.textContent = `${n} modification${n>1?'s':''} en attente d'envoi…`; }
  else el.hidden = true;
}

/* ---------- Nouveau dossier ---------- */
function newDossier(){
  const id = 'd' + Date.now().toString(36);
  const d = { id, created: new Date().toISOString(), statut:'Appel',
    contact:{nom:'', tel:'', email:'', lien:''}, beneficiaire:'', situation:'vente', client:'particulier',
    ville:'Marseille', km: kmEst(siegePt(), COORDS['Marseille']) || 14, typeLog:'appartement', taille:1, surface:70, etage:0, ascenseur:true, urgence:false, notes:'',
    formule:'L', formuleAuto:true,
    diag:{ volMode:'base', volume:25, evac:70, cave:0, jardin:0, baies:0, objetsLourds:0, etagesMaison:1, salete:'normal', stationnement:false, dechetsSpeciaux:false, monteMeubles:false, notes:'' },
    options:{ residence:false, installation:-1, gardiennage:0, videMaison:0, horsDepJours:0 },
    pro:{ debarras:false, type:'finbail', opts:{} },
    photos:[], suivi: structuredClone(SUIVI0) };
  return d;
}
function suggest(d){ return {vente:'L', residence:'T', demenage:'T', deces:'S', vide:'P'}[d.situation] || 'L'; }

/* ---------- Calcul du devis ---------- */
function calc(d){
  const i = d.taille, f = d.formule, g = d.diag, o = d.options, tva = 1 + S.tva/100;
  const pro = d.pro || {debarras:false, type:'finbail', opts:{}};
  const sansDeb = f==='P' && !pro.debarras;
  const volEvac = sansDeb ? 0 : g.volume * g.evac / 100;
  const extraVol = sansDeb ? 0 : (g.cave||0) + (g.jardin||0);
  const proOptH = f==='P' ? PRO_OPTS.reduce((a,[k]) => a + (pro.opts?.[k]||0) * ((S.proOpts?.[k]||DEFAULTS.proOpts[k])[1]), 0) : 0;
  const travauxCoef = f==='P' && pro.type==='travaux' ? 1.3 : 1;
  const access = d.typeLog==='appartement' ? (d.ascenseur ? 0 : Math.min(0.4, 0.08*d.etage)) : Math.min(0.3, 0.1*Math.max(0,(g.etagesMaison||1)-1));
  const saleCoef = {normal:1, sale:1.3, tres:1.7}[g.salete] || 1;
  // Heures d'équipe
  const hDeb = (volEvac + extraVol) * S.rythmeM3 * (1+access);
  const hNet = d.surface * S.rythmeM2 * saleCoef * travauxCoef + (g.baies||0) * S.baie + proOptH;
  const hLourd = (g.objetsLourds||0) * S.objetLourd;
  const hSup = (S.heuresSup[f]||[0,0,0,0])[i] + (o.installation>=0 && f!=='T' ? 6 : 0);
  const hEquipe = hDeb + hNet + hLourd + hSup;
  const jours = Math.max(1, Math.ceil(hEquipe / 14));
  const nv = d.nouveau, avecNouv = nv && (f==='T' || o.installation>=0) && (nv.km>0);
  const jInstall = avecNouv ? (f==='T' && i>=2 ? 2 : 1) : 0;
  const kmTotal = d.km*2*jours + (avecNouv ? jInstall*2*nv.km + (f==='T' ? (nv.kmAN||0) : 0) : 0);
  const trajetH = kmTotal / S.vitesse;
  const hPorteur = hEquipe * S.partPorteur + (f==='P' ? 1.5 : S.adminH) + trajetH;
  const hInterim = hEquipe * (1 - S.partPorteur);
  // Prix
  let lignes = [], ttc = 0, ht = 0;
  if(f==='P'){
    const sf = d.surface, pi = sf<=30?0:sf<=55?1:sf<=75?2:sf<=100?3:-1;
    const net = pi<0 ? sf * S.proM2Grand : S.proNettoyage[pi];
    const tl = pi<0 ? `${sf} m² × ${S.proM2Grand} €` : ['studio / T1','T2','T3','T4'][pi];
    let htBase = net * travauxCoef; lignes.push([`Nettoyage ${PRO_TYPES[pro.type]||''} · ${tl}${travauxCoef>1?' (+30 % après travaux)':''}`, net*travauxCoef]);
    if(saleCoef>1){ const v = net*travauxCoef*(saleCoef-1); htBase += v; lignes.push([saleCoef>1.5?'Logement très sale':'Logement sale', v]); }
    PRO_OPTS.forEach(([k,l,u]) => { const n = pro.opts?.[k]||0; if(n>0){ const pu = (S.proOpts?.[k]||DEFAULTS.proOpts[k])[0]; const v = n*pu; htBase += v; lignes.push([`${l} : ${num(n)}${u==='m²'?' m²':''} × ${num(pu,2)} €`, v]); } });
    if(volEvac + extraVol > 0){ const inc = S.proM3Inclus ?? 3; const vD = volEvac+extraVol; const deb = S.proForfait + S.proM3*Math.max(0, vD - inc); htBase += deb; lignes.push([`Débarras ${num(vD)} m³ (forfait ${inc} m³ compris + ${S.proM3} €/m³ au-delà)`, deb]); }
    if(d.urgence){ const u = htBase*S.urgence/100; htBase += u; lignes.push([`Urgence +${S.urgence} %`, u]); }
    ht = htBase; ttc = d.client==='agence' ? ht : ht*tva;
  } else {
    const base = S.grids[f][i]; lignes.push([`${FORM[f]} ${TAILLES[i]}`, base]); ttc = base;
    const inclus = S.volDefaut[i] * S.evacDefaut[f]/100;
    const sup = Math.max(0, volEvac - inclus) + extraVol;
    if(sup > 0.4){ const v = sup * S.m3Sup; ttc += v; lignes.push([`Volume en plus (caves, jardin, surplus) ${num(sup)} m³`, v]); }
    if(o.residence){ ttc += S.residence; lignes.push(['Recherche de résidence', S.residence]); }
    if(o.installation>=0 && f!=='T'){ const v = S.installation[o.installation]; ttc += v; lignes.push(['Installation', v]); }
    if(o.gardiennage>0){ const v = o.gardiennage*S.gardiennage; ttc += v; lignes.push([`Gardiennage ${o.gardiennage} mois`, v]); }
    if(o.videMaison>0){ ttc += o.videMaison; lignes.push(['Vide-maison', o.videMaison]); }
    if(d.urgence){ const u = ttc*S.urgence/100; ttc += u; lignes.push([`Urgence +${S.urgence} %`, u]); }
    if(o.horsDepJours>0){ const v = o.horsDepJours*S.horsDep; ttc += v; lignes.push([`Hors département ${o.horsDepJours} j`, v]); }
    ht = ttc / tva;
  }
  // Coûts
  const cInterim = hInterim * S.interim;
  const cPorteur = hPorteur * S.porteur;
  const cCamion = (volEvac+extraVol) > 0 ? jours * S.camionJour : 0;
  const cKm = kmTotal*S.kmCout;
  const cDech = (volEvac+extraVol) * S.decheterie;
  const cConso = S.consommables + (f==='T' ? 60 : 0);
  const couts = cInterim + cCamion + cKm + cDech + cConso;
  const marge = ht - couts - cPorteur;
  return { kmTotal, jInstall, volEvac, extraVol, hEquipe, hPorteur, hInterim, jours, lignes, ttc, ht, cInterim, cPorteur, cCamion, cKm, cDech, cConso, couts, marge, pct: ht ? marge/ht : 0 };
}

/* ---------- Rendu ---------- */
const app = $('#app');
function setNav(){ $('#nav-list').setAttribute('aria-current', view.name==='list'?'page':'false'); $('#nav-set').setAttribute('aria-current', view.name==='settings'?'page':'false'); $('#nav-bilan').setAttribute('aria-current', view.name==='bilan'?'page':'false'); }
function render(){ setNav(); if(view.name==='list') renderList(); else if(view.name==='dossier') renderDossier(); else if(view.name==='bilan') renderBilan(); else renderSettings(); }

function header(sub){
  return `<div class="top"><div class="brand"><svg width="46" height="22" viewBox="0 0 164 80" aria-hidden="true"><path d="M8 74 V44 L34 22 L60 44 V74" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M104 74 V44 L130 22 L156 44 V74" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M34 60 C52 76, 64 40, 82 54 S112 70, 130 60" fill="none" stroke="var(--blue)" stroke-width="5.5" stroke-linecap="round"/></svg><div><div style="font-family:var(--display);font-size:20px;line-height:1">Fil Bleu</div><small>${esc(sub)}</small></div></div></div>`;
}

function renderList(){
  const q = (view.q||'').toLowerCase();
  const arr = Object.values(dossiers).sort((a,b)=> (b.created||'').localeCompare(a.created||''))
    .filter(d => !q || [d.contact.nom,d.ville,d.beneficiaire].join(' ').toLowerCase().includes(q));
  const stLabel = s => ({'Signé':'good','Terminé':'good','Perdu':'bad','Devis envoyé':'warn'}[s]||'');
  app.innerHTML = header('Dossiers') + `
  <div class="row"><h1 style="flex:1">Mes dossiers</h1><button class="btn" id="b-new">Nouvel appel</button></div>
  <button class="btn ghost" id="b-net">Devis nettoyage Fil Bleu Pro</button>
  <input id="q" type="search" placeholder="Rechercher un nom, une ville…" value="${esc(view.q||'')}" aria-label="Rechercher">
  <div class="list">${arr.length ? arr.map(d => { const c = calc(d); return `<button class="item" data-id="${d.id}"><div style="min-width:0"><div class="t">${esc(d.contact.nom||'Sans nom')} · ${esc(d.ville)}</div><div class="s">${esc(FORM[d.formule])} · ${TAILLES[d.taille]} · ${new Date(d.created).toLocaleDateString('fr-FR')}</div></div><div style="text-align:right"><div style="font-weight:500">${eur(c.ttc)}</div><span class="pill ${stLabel(d.statut)}">${esc(d.statut)}</span></div></button>`;}).join('') :
    `<div class="card"><h3>Aucun dossier pour l'instant</h3><p class="muted small" style="margin:0">Touchez « Nouvel appel » dès qu'un client vous appelle : vous saisissez la situation pendant la conversation et l'appli vous donne la formule et une première estimation.</p></div>`}</div>`;
  $('#b-new').onclick = startNew;
  $('#b-net').onclick = startNettoyage;
  $('#q').oninput = e => { view.q = e.target.value; const pos = e.target.selectionStart; renderList(); const i=$('#q'); i.focus(); i.setSelectionRange(pos,pos); };
  app.querySelectorAll('.item').forEach(b => b.onclick = () => { view = {name:'dossier', id:b.dataset.id}; tab='appel'; render(); window.scrollTo(0,0); });
}

function seg(name, opts, val){ return `<div class="seg" data-seg="${name}">${opts.map(([v,l])=>`<button type="button" data-v="${esc(v)}" aria-pressed="${String(v)===String(val)}">${esc(l)}</button>`).join('')}</div>`; }
function stepper(name, label, val, stepv=1, unit=''){ return `<div class="step"><span>${esc(label)}</span><div class="ctl"><button type="button" data-step="${name}" data-d="-${stepv}" aria-label="Moins">−</button><output>${num(val)}${unit}</output><button type="button" data-step="${name}" data-d="${stepv}" aria-label="Plus">+</button></div></div>`; }
function getPath(o,p){ return p.split('.').reduce((a,k)=>a?.[k], o); }
function setPath(o,p,v){ const ks=p.split('.'); let a=o; ks.slice(0,-1).forEach(k=>{ if(a[k]==null || typeof a[k]!=='object') a[k]={}; a=a[k]; }); a[ks.at(-1)]=v; }

function addrField(key, label, loc, villeKey, ville){
  return `<div style="display:flex;flex-direction:column;gap:6px;position:relative"><label>${esc(label)}<input data-addr="${key}" value="${esc(loc?.label||'')}" autocomplete="off" placeholder="Tapez l'adresse : n°, rue, ville"></label>
  <div class="list" id="sug-${key.replace('.','-')}" style="gap:4px"></div>
  <label>Commune${loc?.lat?' (trouvée avec l\'adresse)':''}<select data-f="${villeKey}">${Object.keys(COORDS).map(v=>`<option ${v===ville?'selected':''}>${esc(v)}</option>`).join('')}${ville && !COORDS.hasOwnProperty(ville)?`<option selected>${esc(ville)}</option>`:''}</select></label></div>`;
}
function distBlock(d){
  const so = {...DEFAULTS.soc, ...(S.soc||{})}, src = d.kmSource==='route' ? 'par la route' : 'estimée';
  const rows = [[`Siège (${so.siegeVille}) → logement`, d.km, true]];
  if(showNouveau(d) && d.nouveau){ rows.push(['Logement → nouveau logement', d.nouveau.kmAN]); rows.push(['Nouveau logement → siège', d.nouveau.km]); }
  return `<div class="suggest"><table>${rows.map(([l,v,ed])=>`<tr><td>${esc(l)}</td><td class="n">${v!=null && v!==''?`<b>${num(v,0)} km</b>`:'—'}</td></tr>`).join('')}</table>
  <div class="small muted" style="margin-top:6px">Distances aller, ${d.kmManuel?'saisie à la main':src}. ${d.kmManuel?'':'Corrigez si besoin :'}</div>
  <label style="margin-top:6px">Distance siège → logement (km)<input data-f="km" type="number" inputmode="decimal" min="0" value="${d.km}"></label></div>`;
}
function showNouveau(d){ return d.formule==='T' || ['residence','demenage'].includes(d.situation) || d.options.installation>=0; }
function volCard(d, compact){
  const inv = d.diag.inventaire||{}, nInv = Object.values(inv).reduce((a,b)=>a+b,0) + (d.diag.mesures||[]).length, det = invTotal(inv, d.diag.mesures), mode = d.diag.volMode||'base';
  const quick = INVENTAIRE.flatMap(([,it])=>it).filter(([k])=>QUICK_INV.includes(k));
  return `<div class="card"><h3>${compact?'Volume : estimation rapide':'Volume'}</h3>
    <div class="kpis"><div class="kpi"><b>${num(volBase(d),0)} m³</b><span>Base, sans détail (${esc(d.typeLog)} ${esc(TAILLES[d.taille])})</span></div><div class="kpi"><b>${nInv?num(det)+' m³':'—'}</b><span>Avec le détail des meubles${nInv?` (${nInv})`:''}</span></div></div>
    <label>Volume retenu pour le devis : <b style="color:var(--ink)">${num(d.diag.volume)} m³</b>${seg('diag.volMode',[['base','Base'],['detail','Détail des meubles'],['manuel','Saisi à la main']],mode)}</label>
    ${compact ? `<p class="small muted" style="margin:0">Pendant l'appel, demandez les gros meubles : chambre (lits, armoires), séjour (canapé, buffet), cuisine (frigo, lave-linge). Si la personne ne sait pas, gardez la base.</p>
    <details><summary style="cursor:pointer;font-weight:500;padding:6px 0">Gros meubles signalés au téléphone${quick.some(([k])=>inv[k])?` · ${quick.reduce((a,[k])=>a+(inv[k]||0),0)}`:''}</summary><div style="display:flex;flex-direction:column;gap:6px;padding-top:6px">${quick.map(([k,l,v])=>invRow(k,l,v,inv)).join('')}</div></details>
    <p class="small muted" style="margin:0">Le détail complet et les mesures se font dans « Sur place ».</p>` : ''}
  </div>`;
}
function invRow(k,l,v,inv){ return `<div class="step"><span>${esc(l)} <span class="small muted">${num(v,2)} m³</span></span><div class="ctl"><button type="button" data-inv="${k}" data-d="-1" aria-label="Moins">−</button><output>${inv[k]||0}</output><button type="button" data-inv="${k}" data-d="1" aria-label="Plus">+</button></div></div>`; }
function nouvCard(d){
  const n = d.nouveau;
  return `<div class="card"><h3>Nouveau logement</h3>
    <label>Type${seg('nouveau.type', Object.entries(NOUV_TYPES), n.type)}</label>
    ${['residence','ehpad'].includes(n.type) ? `<label>Nom de l'établissement<input data-f="nouveau.nom" value="${esc(n.nom)}" placeholder="Ex. : Résidence Les Oliviers"></label>`:''}
    ${addrField('nouveau.adr','Adresse du nouveau logement', n.adr, 'nouveau.ville', n.ville)}
    <label>Taille${seg('nouveau.taille', NOUV_TAILLES.map((t,i)=>[i,t]), n.taille)}</label>
    ${stepper('nouveau.etage','Étage',n.etage||0,1)}
    <label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" data-f="nouveau.ascenseur" ${n.ascenseur?'checked':''} style="width:auto"> Ascenseur</label>
    <div class="grid2"><label>Date d'entrée<input type="date" data-f="nouveau.date" value="${esc(n.date)}"></label><label>Contact sur place<input data-f="nouveau.contact" value="${esc(n.contact)}" placeholder="Directrice, gardien, proche…"></label></div>
    ${distBlock(d)}
  </div>`;
}

function renderDossier(){
  const d = dossiers[view.id]; if(!d){ view={name:'list'}; return render(); }
  const c = calc(d);
  d.suivi = {...structuredClone(SUIVI0), ...(d.suivi||{})};
  if(!d.kmSource){ d.kmSource = 'estime'; setTimeout(()=>updateDistances(d,true),0); }
  if(showNouveau(d) && !d.nouveau) d.nouveau = { type: d.situation==='residence' ? 'residence' : 'appartement', nom:'', adr:null, ville:'', taille: d.situation==='residence' ? 0 : 2, etage:0, ascenseur:true, date:'', contact:'', km:null, kmAN:null };
  const tabs = `<div class="tabs" role="tablist">${[['appel','1 · Appel'],['diag','2 · Sur place'],['devis','3 · Devis'],['suivi','4 · Suivi']].map(([k,l])=>`<button role="tab" data-tab="${k}" aria-selected="${tab===k}">${l}</button>`).join('')}</div>`;
  const resume = `<div class="kpis"><div class="kpi"><b>${eur(c.ttc)}</b><span>${f_label(d)} · estimation</span></div><div class="kpi"><b class="${c.marge<0?'bad':c.pct<0.15?'warn':'good'}">${eur(c.marge)}</b><span>Marge société (${Math.round(c.pct*100)} %) après vos heures</span></div><div class="kpi"><b>${num(c.hEquipe,0)} h</b><span>Équipe · ${c.jours} jour${c.jours>1?'s':''}</span></div><div class="kpi"><b>${num(c.hPorteur,0)} h</b><span>Vos heures (${eur(c.cPorteur)})</span></div></div>`;
  let body = '';
  if(tab==='appel') body = `
  <div class="card"><h3>Contact</h3>
    <div class="grid2"><label>Nom<input data-f="contact.nom" value="${esc(d.contact.nom)}" autocomplete="name"></label><label>Téléphone<input data-f="contact.tel" type="tel" value="${esc(d.contact.tel)}"></label></div>
    <div class="grid2"><label>E-mail<input data-f="contact.email" type="email" value="${esc(d.contact.email)}"></label><label>Lien avec la personne<input data-f="contact.lien" placeholder="Fille, fils, lui-même, agence…" value="${esc(d.contact.lien)}"></label></div>
    <label>Personne concernée (si différente)<input data-f="beneficiaire" value="${esc(d.beneficiaire)}"></label>
    <label>Client${seg('client',[['particulier','Particulier'],['agence','Agence ou pro']],d.client)}</label>
  </div>
  <div class="card"><h3>Situation</h3>
    ${seg('situation', Object.entries(SITU), d.situation)}
    <div class="suggest">Formule conseillée : <b>${FORM[suggest(d)]}</b>${d.formule!==suggest(d)?` · formule choisie : <b>${FORM[d.formule]}</b>`:''}</div>
    <label>Formule${seg('formule', Object.entries(FORM), d.formule)}</label>
    <label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" data-f="urgence" ${d.urgence?'checked':''} style="width:auto"> Urgence, sous 7 jours (+${S.urgence} %)</label>
  </div>
  ${d.formule==='P' ? `<div class="card"><h3>Nettoyage</h3>
    <label>Type de nettoyage${seg('pro.type', Object.entries(PRO_TYPES), (d.pro||{}).type||'finbail')}</label>
    <label>État${seg('diag.salete',[['normal','Normal'],['sale','Sale'],['tres','Très sale']],d.diag.salete)}</label>
    ${PRO_OPTS.map(([k,l,u]) => stepper('pro.opts.'+k, l, (d.pro?.opts?.[k])||0, u==='m²'?5:1, u==='m²'?' m²':'')).join('')}
    <label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" data-f="pro.debarras" ${d.pro?.debarras?'checked':''} style="width:auto"> Débarras à faire aussi (volume dans « Sur place »)</label>
  </div>` : ''}
  <div class="card"><h3>Logement</h3>
    ${addrField('adr', 'Adresse du logement', d.adr || (d.contact.adresse ? {label:d.contact.adresse} : null), 'ville', d.ville)}
    ${showNouveau(d) ? `<p class="small muted" style="margin:0">Distances : voir « Nouveau logement » plus bas.</p>` : distBlock(d)}
    ${seg('typeLog',[['appartement','Appartement'],['maison','Maison']],d.typeLog)}
    ${seg('taille', TAILLES.map((t,i)=>[i,t]), d.taille)}
    ${stepper('surface','Surface',d.surface,5,' m²')}
    ${d.typeLog==='appartement' ? stepper('etage','Étage',d.etage,1) + `<label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" data-f="ascenseur" ${d.ascenseur?'checked':''} style="width:auto"> Ascenseur</label>` : ''}
    <label>Notes de l'appel<textarea data-f="notes" placeholder="Délais (compromis, entrée en résidence), notaire, proches à prévenir…">${esc(d.notes)}</textarea></label>
  </div>
  ${d.formule!=='P' || d.pro?.debarras ? volCard(d, true) : ''}
  ${showNouveau(d) ? nouvCard(d) : ''}`;
  if(tab==='diag') { const inv = d.diag.inventaire||{}; const nInv = Object.values(inv).reduce((a,b)=>a+b,0); body = `
  <div class="card"><h3>Inventaire des meubles</h3>
    <p class="small muted" style="margin:0">Touchez + pour chaque meuble : le volume se calcule tout seul, avec 20 % en plus pour les petits objets.</p>
    ${INVENTAIRE.map(([g,items],gi)=>{ const cnt = items.reduce((a,[k])=>a+(inv[k]||0),0); return `<details ${gi===0||cnt?'open':''}><summary style="cursor:pointer;font-weight:500;padding:6px 0">${esc(g)}${cnt?` · ${cnt}`:''}</summary><div style="display:flex;flex-direction:column;gap:6px;padding-top:6px">${items.map(([k,l,v])=>invRow(k,l,v,inv)).join('')}</div></details>`; }).join('')}
    <details ${(d.diag.mesures||[]).length?'open':''}><summary style="cursor:pointer;font-weight:500;padding:6px 0">Mesurer un meuble${(d.diag.mesures||[]).length?` · ${(d.diag.mesures||[]).length}`:''}</summary>
      <div style="display:flex;flex-direction:column;gap:8px;padding-top:6px">
      ${(d.diag.mesures||[]).map((m,i)=>`<div class="step"><span>${esc(m.nom)} <span class="small muted">${m.L}×${m.l}×${m.h} cm · ${num(m.m3,2)} m³</span></span><button type="button" data-mdel="${i}" aria-label="Retirer ${esc(m.nom)}" style="width:40px;height:40px;flex:none;border-radius:50%;border:1px solid var(--line);background:var(--paper);color:var(--bad);font-size:18px;cursor:pointer">×</button></div>`).join('')}
      <label>Meuble<input id="m-nom" placeholder="Ex. : vaisselier ancien"></label>
      <div class="grid2" style="grid-template-columns:repeat(3,1fr)"><label>Long. (cm)<input id="m-L" type="number" inputmode="decimal" min="0"></label><label>Prof. (cm)<input id="m-l" type="number" inputmode="decimal" min="0"></label><label>Haut. (cm)<input id="m-h" type="number" inputmode="decimal" min="0"></label></div>
      <button type="button" class="btn ghost" id="m-add">Ajouter ce meuble</button></div></details>
  </div>
  ${volCard(d, false)}
  <div class="card"><h3>Ajustements</h3>
    ${stepper('diag.volume', 'Volume retenu (modifier passe en « saisi à la main »)', d.diag.volume,1,' m³')}
    <label>Part qui part (débarras) : ${d.diag.evac} %<input type="range" min="0" max="100" step="5" data-f="diag.evac" value="${d.diag.evac}"></label>
    ${stepper('diag.cave','Cave, garage, grenier',d.diag.cave,1,' m³')}
    ${stepper('diag.jardin','Jardin, abri, extérieur',d.diag.jardin,1,' m³')}
    ${stepper('diag.objetsLourds','Objets lourds (piano, armoire, coffre)',d.diag.objetsLourds,1)}
    <p class="small muted" style="margin:0">Repères : studio 8-14 m³, 3 pièces 20-30 m³, maison 40-60 m³.</p>
  </div>
  <div class="card"><h3>Accès et nettoyage</h3>
    ${d.typeLog==='maison' ? stepper('diag.etagesMaison','Niveaux de la maison',d.diag.etagesMaison,1) : ''}
    ${stepper('diag.baies','Baies vitrées',d.diag.baies,1)}
    <label>État${seg('diag.salete',[['normal','Normal'],['sale','Sale'],['tres','Très sale']],d.diag.salete)}</label>
    ${['stationnement:Stationnement difficile','monteMeubles:Monte-meubles nécessaire','dechetsSpeciaux:Déchets spéciaux (amiante, produits, gaz) : devis séparé'].map(x=>{const [k,l]=x.split(':');return `<label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" data-f="diag.${k}" ${d.diag[k]?'checked':''} style="width:auto"> ${l}</label>`}).join('')}
  </div>
  ${d.formule!=='P' ? `<div class="card"><h3>Options</h3>
    <label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" data-f="options.residence" ${d.options.residence?'checked':''} style="width:auto"> Recherche de résidence (${eur(S.residence)})</label>
    ${d.formule!=='T' ? `<label>Installation${seg('options.installation',[[-1,'Non'],[0,'Chambre'],[1,'Studio'],[2,'2 pièces'],[3,'3 pièces']],d.options.installation)}</label>`:''}
    ${stepper('options.gardiennage','Gardiennage (mois)',d.options.gardiennage,1)}
    <label>Vide-maison, montant TTC<input type="number" inputmode="decimal" min="0" data-f="options.videMaison" value="${d.options.videMaison}"></label>
    ${stepper('options.horsDepJours','Jours hors département',d.options.horsDepJours,1)}
  </div>`:''}
  <div class="card"><h3>Photos</h3>
    <div class="thumbs">${(d.photos||[]).filter(p=>p.chemin).map(p=>`<img data-chemin="${esc(p.chemin)}" alt="Photo du logement">`).join('')}</div>
    <label class="btn ghost" style="text-align:center;cursor:pointer">Ajouter des photos<input id="ph" type="file" accept="image/*" capture="environment" multiple hidden></label>
    <label>Notes de visite<textarea data-f="diag.notes" placeholder="Ce que la famille garde, objets de valeur signalés, accès…">${esc(d.diag.notes)}</textarea></label>
  </div>`; }
  if(tab==='devis') body = `
  <div class="card"><h3>Prix</h3>
    <table>${c.lignes.map(([l,v])=>`<tr><td>${esc(l)}</td><td class="n">${eur(v)}</td></tr>`).join('')}
    <tr><td><b>Total ${d.formule==='P' && d.client==='agence' ? 'HT' : 'TTC'}</b></td><td class="n"><b>${eur(c.ttc)}</b></td></tr>
    <tr><td class="muted">Soit HT</td><td class="n muted">${eur(c.ht)}</td></tr>
    ${d.formule!=='P'?`<tr><td class="muted">Acompte 40 %</td><td class="n muted">${eur(c.ttc*0.4)}</td></tr>`:''}</table>
    ${d.diag.dechetsSpeciaux?'<div class="suggest">Déchets spéciaux signalés : à chiffrer à part.</div>':''}
  </div>
  <div class="card"><h3>Coûts et marge</h3>
    <table>
    <tr><td>Intérim (${num(c.hInterim,0)} h × ${num(S.interim,2)} €)</td><td class="n">${eur(c.cInterim)}</td></tr>
    <tr><td>Camion (${c.jours} j)</td><td class="n">${eur(c.cCamion)}</td></tr>
    <tr><td>Trajets (${num(c.kmTotal,0)} km${c.jInstall?`, dont ${c.jInstall} j au nouveau logement`:''})</td><td class="n">${eur(c.cKm)}</td></tr>
    <tr><td>Déchèterie (${num(c.volEvac+c.extraVol)} m³)</td><td class="n">${eur(c.cDech)}</td></tr>
    <tr><td>Consommables</td><td class="n">${eur(c.cConso)}</td></tr>
    <tr><td>Vos heures (${num(c.hPorteur,0)} h × ${S.porteur} €)</td><td class="n">${eur(c.cPorteur)}</td></tr>
    <tr><td><b>Marge société</b></td><td class="n"><b class="${c.marge<0?'bad':c.pct<0.15?'warn':'good'}">${eur(c.marge)} (${Math.round(c.pct*100)} %)</b></td></tr>
    </table>
    <p class="small muted" style="margin:0">Rythme prudent (${S.rythmeM3} h/m³). Ajustez les coûts dans Réglages après vos premiers chantiers.</p>
  </div>
  <div class="card"><h3>Devis et signature</h3>
    ${d.signature ? `<div class="row" style="align-items:flex-start"><img class="sig" src="${esc(d.signature.img)}" alt="Signature du client" width="200"><div class="small"><b>Signé par ${esc(d.signature.nom)}</b><br><span class="muted">le ${new Date(d.signature.date).toLocaleString('fr-FR',{dateStyle:'long',timeStyle:'short'})}<br>pour ${eur(d.signature.total)}</span></div></div>
      ${Math.round(d.signature.total)!==Math.round(c.ttc) ? `<div class="suggest" style="border-color:var(--warn)">Le devis a changé depuis la signature (${eur(d.signature.total)} signé, ${eur(c.ttc)} maintenant). Retirez la signature et faites signer à nouveau.</div>`:''}
      <button class="btn ghost" id="b-unsign">Retirer la signature</button>`
    : `<p class="small muted" style="margin:0">Faites signer le client sur l'écran du téléphone, puis téléchargez le devis signé pour le lui envoyer.</p><button class="btn" id="b-sign">Faire signer le client</button>`}
    <button class="btn ${d.signature?'':'ghost'}" id="b-pdf">Télécharger le devis en PDF${d.signature?' (signé)':''}</button>
    <p class="small muted" style="margin:0">Devis n° ${esc(devisNo(d))} · valable 1 mois. Les mentions entre crochets (SIRET, médiateur…) sont à compléter dans Réglages.</p>
  </div>
  <div class="card"><h3>Statut du dossier</h3>${seg('statut', STATUTS.map(s=>[s,s]), d.statut)}</div>
  <div class="card"><h3>Résumé à envoyer</h3><pre class="quote" id="quote">${esc(quoteText(d,c))}</pre><button class="btn ghost" id="b-copy">Copier le résumé</button></div>`;
  if(tab==='suivi'){ const s = d.suivi, r = reel(d, c); const ck = (k,l) => `<label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" data-f="suivi.${k}" ${s[k]?'checked':''} style="width:auto"> ${l}</label>`;
    const nb = (k,l,st='0.5') => `<label>${esc(l)}<input type="number" inputmode="decimal" min="0" step="${st}" data-f="suivi.${k}" value="${s[k]||''}" placeholder="0"></label>`;
    const ecart = (a,b,fmt) => { const e = a-b; return `<span class="${e>0.05*Math.abs(b)?'good':e<-0.05*Math.abs(b)?'bad':''}">${e>0?'+':''}${fmt(e)}</span>`; };
    body = `
  <div class="card"><h3>Avant d'évacuer</h3>
    ${ck('liste','Liste de ce qui part signée par le client')}
    ${ck('decharge','Objets de valeur remis contre décharge')}
    <label>Objets de valeur remis (quoi, à qui)<textarea data-f="suivi.objets" placeholder="Ex. : bague en or et montre remises à Mme Martin, fille, le 12/03">${esc(s.objets)}</textarea></label>
  </div>
  <div class="card"><h3>Heures réelles</h3>
    <p class="small muted" style="margin:0">Heures de toute l'équipe (vous et l'intérim), notées le soir du chantier.</p>
    <div class="grid2">${nb('hDeb','Débarras, chargement, déchèterie')}${nb('hNet','Nettoyage')}${nb('hAutres','Tri, installation, autres')}${nb('hInterim',"Dont heures d'intérim")}${nb('hAdmin','Vos heures de bureau et trajets')}</div>
  </div>
  <div class="card"><h3>Volumes et frais réels</h3>
    <div class="grid2">${nb('m3','m³ réellement évacués')}${nb('joursCamion','Jours de camion','1')}${nb('frais','Autres frais réels (€)','1')}</div>
  </div>
  <div class="card"><h3>Réel contre devis</h3>
    <table class="cmp"><tr><td></td><td class="n muted">Prévu</td><td class="n muted">Réel</td></tr>
    <tr><td>Heures d'équipe</td><td class="n">${num(c.hEquipe,0)} h</td><td class="n">${r.hEquipe?num(r.hEquipe,1)+' h':'—'}</td></tr>
    <tr><td>Volume évacué</td><td class="n">${num(c.volEvac+c.extraVol)} m³</td><td class="n">${s.m3?num(s.m3)+' m³':'—'}</td></tr>
    <tr><td>Vitesse débarras</td><td class="n">${num(S.rythmeM3,2)} h/m³</td><td class="n">${r.vM3!=null?num(r.vM3,2)+' h/m³':'—'}</td></tr>
    <tr><td>Vitesse nettoyage</td><td class="n">${num(S.rythmeM2,2)} h/m²</td><td class="n">${r.vM2!=null?num(r.vM2,2)+' h/m²':'—'}</td></tr>
    <tr><td>Coûts (hors vos heures)</td><td class="n">${eur(c.couts)}</td><td class="n">${r.saisi?eur(r.couts):'—'}</td></tr>
    <tr><td>Vos heures</td><td class="n">${eur(c.cPorteur)}</td><td class="n">${r.saisi?eur(r.cPorteur):'—'}</td></tr>
    <tr><td><b>Marge société</b></td><td class="n">${eur(c.marge)}</td><td class="n"><b>${r.saisi?`<span class="${r.marge<0?'bad':r.pct<0.15?'warn':'good'}">${eur(r.marge)}</span>`:'—'}</b></td></tr>
    </table>
    ${r.saisi ? `<p class="small" style="margin:0">Écart de marge : ${ecart(r.marge,c.marge,eur)} (${Math.round(r.pct*100)} % réel contre ${Math.round(c.pct*100)} % prévu).</p>`:''}
  </div>
  <div class="card"><h3>Paiement</h3>
    ${d.formule!=='P' ? ck('acompte',`Acompte de 40 % encaissé (${eur(c.ttc*0.4)})`) : ''}
    ${ck('solde', d.formule!=='P' ? `Solde encaissé (${eur(c.ttc*0.6)})` : `Facture réglée (${eur(c.ttc)})`)}
  </div>
  ${d.formule!=='P' ? `<div class="card"><h3>Vente ou location du logement</h3>
    <p class="small muted" style="margin:0">L'indicateur n° 1 : la part des dossiers qui donnent un mandat.</p>
    <label>Mandat${seg('suivi.mandat', MANDAT, s.mandat)}</label>
    ${s.mandat==='signe' ? `<label>Type${seg('suivi.mandatType',[['vente','Vente'],['location','Location']],s.mandatType)}</label>
      <label>Honoraires de l'agence HT (€)<input type="number" inputmode="decimal" min="0" step="100" data-f="suivi.honoraires" value="${s.honoraires||''}" placeholder="${S.honorairesMoyens}"></label>
      ${ck('vendu', s.mandatType==='location' ? 'Bien loué' : 'Bien vendu (acte signé)')}
      <div class="suggest">Votre commission ${s.vendu?'à encaisser':'attendue'} : <b>${eur(commission(d))}</b> (${s.mandatType==='location'?'50 %':Math.round(S.partCom*100)+' %'} des honoraires).</div>` : ''}
  </div>` : ''}
  <div class="card"><h3>Clôture</h3>
    ${ck('fini','Chantier terminé : compter ce dossier dans le bilan')}
    <label>Ce que j'ai appris sur ce chantier<textarea data-f="suivi.notes" placeholder="Ce qui a pris plus de temps que prévu, ce qu'il faudra demander au prochain diagnostic…">${esc(s.notes)}</textarea></label>
  </div>`; }
  app.innerHTML = header(FORM[d.formule]) + `<div><h2>${esc(d.contact.nom||'Nouveau dossier')}</h2><p class="small muted" style="margin:4px 0 0">${esc(SITU[d.situation])} · ${esc(d.ville)}</p></div>` + tabs + resume + body
    + `<button class="btn danger" id="b-del" style="margin-top:8px">Supprimer ce dossier</button>`;
  bind(d);
}
function f_label(d){ return FORM[d.formule]; }
function quoteText(d,c){
  return `Maison Fil Bleu — estimation\n${d.contact.nom ? 'Pour : '+d.contact.nom+'\n':''}Logement : ${d.typeLog}, ${TAILLES[d.taille]}, ${d.surface} m², ${d.ville}\nFormule : ${FORM[d.formule]}\n${showNouveau(d) && d.nouveau && (d.nouveau.adr?.label||d.nouveau.ville) ? `Nouveau logement : ${d.nouveau.nom ? d.nouveau.nom+', ' : ''}${d.nouveau.adr?.label || d.nouveau.ville}\n` : ''}\n` + c.lignes.map(([l,v])=>`• ${l} : ${eur(v)}`).join('\n') + `\n\nTotal ${d.formule==='P'&&d.client==='agence'?'HT':'TTC'} : ${eur(c.ttc)}${d.formule!=='P'?`\nAcompte de 40 % : ${eur(c.ttc*0.4)}, solde en fin de chantier.`:''}\nLe déménageur, s'il y en a un, est choisi avec vous et réglé directement.\nDevis définitif remis après le diagnostic.`;
}

/* ---------- Suivi réel et bilan ---------- */
function reel(d, c){
  const s = {...SUIVI0, ...(d.suivi||{})};
  const hEquipe = (s.hDeb||0) + (s.hNet||0) + (s.hAutres||0);
  const saisi = hEquipe > 0;
  const cInterim = (s.hInterim||0) * S.interim;
  const hPorteur = Math.max(0, hEquipe - (s.hInterim||0)) + (s.hAdmin||0);
  const cPorteur = hPorteur * S.porteur;
  const j = s.joursCamion||0;
  const couts = cInterim + j*S.camionJour + d.km*2*Math.max(1,j)*S.kmCout + (s.m3||0)*S.decheterie + S.consommables + (s.frais||0);
  const marge = c.ht - couts - cPorteur;
  return { hEquipe, saisi, cInterim, hPorteur, cPorteur, couts, marge, pct: c.ht ? marge/c.ht : 0,
    vM3: s.m3>0 && s.hDeb>0 ? s.hDeb/s.m3 : null, vM2: s.hNet>0 && d.surface>0 ? s.hNet/d.surface : null };
}
function commission(d){ const s = d.suivi||{}; if(s.mandat!=='signe') return 0; const h = s.honoraires || S.honorairesMoyens; return h * (s.mandatType==='location' ? 0.5 : S.partCom); }
function devisNo(d){ const t = new Date(d.created); return `FB-${t.getFullYear()}${String(t.getMonth()+1).padStart(2,'0')}-${d.id.slice(-4).toUpperCase()}`; }

function renderBilan(){
  const all = Object.values(dossiers).map(d => ({...d, suivi:{...SUIVI0, ...(d.suivi||{})}}));
  const finis = all.filter(d => d.suivi.fini);
  let ca=0, mR=0, mP=0, hDeb=0, m3=0, hNet=0, surf=0, nV=0, nN=0;
  finis.forEach(d => { const c = calc(d), r = reel(d,c); ca += c.ht; mP += c.marge; mR += r.saisi ? r.marge : c.marge;
    if(r.vM3!=null){ hDeb += d.suivi.hDeb; m3 += d.suivi.m3; nV++; } if(r.vM2!=null){ hNet += d.suivi.hNet; surf += d.surface; nN++; } });
  const vM3 = m3 ? hDeb/m3 : null, vM2 = surf ? hNet/surf : null;
  const fam = all.filter(d => d.formule!=='P' && (d.suivi.fini || ['Signé','Terminé'].includes(d.statut)));
  const succ = fam.filter(d => d.formule==='S'), trans = fam.filter(d => d.formule==='T');
  const rate = arr => arr.length ? arr.filter(d => d.suivi.mandat==='signe').length / arr.length : null;
  const pctTxt = (v,arr) => v==null ? '—' : `${Math.round(v*100)} %`;
  const comAtt = all.filter(d => d.suivi.mandat==='signe' && !d.suivi.vendu).reduce((a,d)=>a+commission(d),0);
  const comOk = all.filter(d => d.suivi.mandat==='signe' && d.suivi.vendu).reduce((a,d)=>a+commission(d),0);
  const envoyes = all.filter(d => d.statut==='Devis envoyé'), signes = all.filter(d => ['Signé','Terminé'].includes(d.statut));
  const perdus = all.filter(d => d.statut==='Perdu');
  const tSign = (signes.length+perdus.length) ? signes.length/(signes.length+perdus.length) : null;
  const rS = rate(succ);
  app.innerHTML = header('Bilan') + `<h1>Bilan</h1>
  <div class="card"><h3>Les deux chiffres décisifs</h3>
    <div class="kpis">
      <div class="kpi"><b>${vM3!=null?num(vM3,2):'—'}</b><span>h/m³ réels en débarras (${nV} chantier${nV>1?'s':''}) · prévu ${num(S.rythmeM3,2)}</span></div>
      <div class="kpi"><b>${pctTxt(rate(fam))}</b><span>des dossiers familles donnent un mandat (${fam.filter(d=>d.suivi.mandat==='signe').length} sur ${fam.length})</span></div>
    </div>
    <table>
      <tr><td>Successions qui donnent un mandat</td><td class="n">${pctTxt(rS)} <span class="muted">(${succ.length})</span></td></tr>
      <tr><td>Transitions qui donnent un mandat</td><td class="n">${pctTxt(rate(trans))} <span class="muted">(${trans.length})</span></td></tr>
      <tr><td>Vitesse nettoyage</td><td class="n">${vM2!=null?num(vM2,2)+' h/m²':'—'} <span class="muted">(prévu ${num(S.rythmeM2,2)})</span></td></tr>
    </table>
    ${succ.length>=5 && rS!=null && rS<1/3 ? `<div class="suggest" style="border-color:var(--bad)">Moins d'une Succession sur trois donne un mandat : c'est le seuil fixé pour revoir les hypothèses du prévisionnel.</div>` : `<p class="small muted" style="margin:0">Premier bilan sérieux après 5 à 10 dossiers. Seuil d'alerte : moins d'une Succession sur trois avec mandat.</p>`}
    ${nV>=3 || nN>=3 ? `<button class="btn ghost" id="b-rythme">Utiliser ma vraie vitesse dans les devis${vM3!=null?` (${num(vM3,2)} h/m³`:''}${vM2!=null?`${vM3!=null?', ':' ('}${num(vM2,2)} h/m²`:''})</button>` : `<p class="small muted" style="margin:0">Après 3 chantiers notés dans l'onglet Suivi, vous pourrez remplacer le rythme prudent par votre vraie vitesse.</p>`}
  </div>
  <div class="card"><h3>Chantiers terminés</h3>
    <table>
      <tr><td>Nombre</td><td class="n">${finis.length}</td></tr>
      <tr><td>Chiffre d'affaires HT</td><td class="n">${eur(ca)}</td></tr>
      <tr><td>Marge prévue</td><td class="n">${eur(mP)}</td></tr>
      <tr><td><b>Marge réelle</b></td><td class="n"><b class="${mR<0?'bad':ca&&mR/ca<0.15?'warn':'good'}">${eur(mR)}${ca?` (${Math.round(mR/ca*100)} %)`:''}</b></td></tr>
    </table>
  </div>
  <div class="card"><h3>Commissions</h3>
    <table><tr><td>Attendues (mandats signés, pas encore vendus)</td><td class="n">${eur(comAtt)}</td></tr>
    <tr><td>À encaisser ou encaissées (biens vendus ou loués)</td><td class="n">${eur(comOk)}</td></tr></table>
  </div>
  <div class="card"><h3>Devis</h3>
    <table><tr><td>En attente de réponse</td><td class="n">${envoyes.length} · ${eur(envoyes.reduce((a,d)=>a+calc(d).ttc,0))}</td></tr>
    <tr><td>Signés</td><td class="n">${signes.length} · ${eur(signes.reduce((a,d)=>a+calc(d).ttc,0))}</td></tr>
    <tr><td>Perdus</td><td class="n">${perdus.length}</td></tr>
    <tr><td>Taux de signature</td><td class="n">${tSign==null?'—':Math.round(tSign*100)+' %'}</td></tr></table>
  </div>`;
  const br = $('#b-rythme'); if(br) br.onclick = () => { if(vM3!=null && nV>=3) S.rythmeM3 = Math.round(vM3*100)/100; if(vM2!=null && nN>=3) S.rythmeM2 = Math.round(vM2*1000)/1000; persistSettings(); showToast('Rythmes mis à jour dans les devis.'); render(); };
}

/* ---------- Signature ---------- */
function openSignature(d){
  const c = calc(d);
  const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-label','Signature du client');
  m.innerHTML = `<div class="sheet"><h2>Bon pour accord</h2>
    <p class="small muted" style="margin:0">${esc(FORM[d.formule])} · ${esc(TAILLES[d.taille])} · total ${d.formule==='P'&&d.client==='agence'?'HT':'TTC'} <b style="color:var(--ink)">${eur(c.ttc)}</b></p>
    <label>Nom du signataire<input id="sg-nom" value="${esc(d.contact.nom)}" autocomplete="name"></label>
    <canvas class="pad" id="sg-pad" aria-label="Zone de signature"></canvas>
    <label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" id="sg-ok" style="width:auto"> J'ai lu le devis et je l'accepte</label>
    <div class="row"><button class="btn ghost" id="sg-clear" style="flex:1">Effacer</button><button class="btn ghost" id="sg-cancel" style="flex:1">Annuler</button><button class="btn" id="sg-save" style="flex:2">Valider la signature</button></div></div>`;
  document.body.appendChild(m);
  const cv = $('#sg-pad', m), ctx = cv.getContext('2d'); let drawn = false, last = null;
  const size = () => { const r = cv.getBoundingClientRect(), k = window.devicePixelRatio||1; cv.width = r.width*k; cv.height = r.height*k; ctx.setTransform(k,0,0,k,0,0); ctx.fillStyle='#fff'; ctx.fillRect(0,0,r.width,r.height); ctx.lineWidth=2.2; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#1E2430'; drawn=false; };
  size();
  const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX-r.left, e.clientY-r.top]; };
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); last = pt(e); ctx.beginPath(); ctx.arc(last[0],last[1],1,0,7); ctx.fillStyle='#1E2430'; ctx.fill(); drawn = true; };
  cv.onpointermove = e => { if(!last) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; };
  cv.onpointerup = cv.onpointercancel = () => { last = null; };
  const close = () => m.remove();
  $('#sg-clear', m).onclick = size;
  $('#sg-cancel', m).onclick = close;
  $('#sg-save', m).onclick = () => {
    if(!drawn){ showToast('Le client doit signer dans le cadre.'); return; }
    if(!$('#sg-ok', m).checked){ showToast('Cochez « J\'ai lu le devis et je l\'accepte ».'); return; }
    const out = document.createElement('canvas'); out.width = 480; out.height = Math.round(480*cv.height/cv.width);
    const o = out.getContext('2d'); o.fillStyle='#fff'; o.fillRect(0,0,out.width,out.height); o.drawImage(cv,0,0,out.width,out.height);
    d.signature = { img: out.toDataURL('image/jpeg', 0.7), nom: $('#sg-nom', m).value.trim() || d.contact.nom || 'Client', date: new Date().toISOString(), total: c.ttc };
    if(['Appel','Diagnostic','Devis envoyé'].includes(d.statut)) d.statut = 'Signé';
    persist(d); close(); showToast('Devis signé.'); render();
  };
}

/* ---------- Devis PDF (généré dans l'appli, sans bibliothèque) ---------- */
const HW = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const WIN = {'€':0x80,'‚':0x82,'…':0x85,'‘':0x91,'’':0x92,'“':0x93,'”':0x94,'•':0x95,'–':0x96,'—':0x97,'Œ':0x8C,'œ':0x9C,'Ÿ':0x9F,' ':0x20,' ':0x20,' ':0x20};
function winCode(ch){ if(WIN[ch]!=null) return WIN[ch]; const k = ch.charCodeAt(0); return (k>=32 && k<127) || (k>=0xA0 && k<=0xFF) ? k : 63; }
function cw(ch, bold){ const k = winCode(ch); let w = k>=32 && k<127 ? HW[k-32] : ({0x97:1000,0x85:1000,0x92:222,0x91:222,0xAB:556,0xBB:556,0xB2:333,0xB3:333,0xB0:400,0xE7:500}[k] || 556); if(bold && /[A-Za-zÀ-ÿ]/.test(ch)) w *= 1.07; return w; }
function tw(s, size, bold){ let w = 0; for(const ch of String(s)) w += cw(ch, bold); return w*size/1000; }
function wrap(s, size, maxW, bold){ const out = []; String(s).split('\n').forEach(par => { let line = ''; par.split(' ').forEach(word => { const t = line ? line+' '+word : word; if(tw(t,size,bold) > maxW && line){ out.push(line); line = word; } else line = t; }); out.push(line); }); return out; }
function pdfStr(s){ let o=''; for(const ch of String(s)){ const k = winCode(ch); const c = String.fromCharCode(k); o += c==='(' || c===')' || c==='\\' ? '\\'+c : c; } return o; }
function hexRGB(h){ const n = parseInt(h.slice(1),16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255].map(v=>v.toFixed(3)).join(' '); }

function makePdf(){
  const pages = []; let ops = []; const images = [];
  const H = 842;
  const api = {
    text(x,y,s,o={}){ const size=o.size||10, bold=!!o.bold; let xx = x; if(o.align==='right') xx = x - tw(s,size,bold); else if(o.align==='center') xx = x - tw(s,size,bold)/2;
      ops.push(`BT /${bold?'F2':'F1'} ${size} Tf ${hexRGB(o.color||'#1E2430')} rg ${xx.toFixed(2)} ${(H-y).toFixed(2)} Td (${pdfStr(s)}) Tj ET`); },
    line(x1,y1,x2,y2,color='#E2DDD4',w=0.8){ ops.push(`${hexRGB(color)} RG ${w} w ${x1} ${H-y1} m ${x2} ${H-y2} l S`); },
    rect(x,y,w,h,fill){ ops.push(`${hexRGB(fill)} rg ${x} ${H-y-h} ${w} ${h} re f`); },
    box(x,y,w,h,color='#E2DDD4'){ ops.push(`${hexRGB(color)} RG 0.8 w ${x} ${H-y-h} ${w} ${h} re S`); },
    path(cmds,color,w){ ops.push(`${hexRGB(color)} RG ${w} w 1 J 1 j ${cmds} S`); },
    image(bytes,iw,ih,x,y,w,h){ const n = images.length; images.push({bytes,iw,ih}); ops.push(`q ${w} 0 0 ${h} ${x} ${H-y-h} cm /Im${n} Do Q`); },
    addPage(){ pages.push(ops.join('\n')); ops = []; },
    build(){ if(ops.length) api.addPage();
      const chunks = []; const offs = []; let len = 0;
      const push = x => { const b = typeof x==='string' ? Uint8Array.from(x, ch => ch.charCodeAt(0) & 255) : x; chunks.push(b); len += b.length; };
      const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); (Array.isArray(body)?body:[body]).forEach(push); push(`\nendobj\n`); };
      push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
      const nImg = images.length, firstImg = 5, firstPage = firstImg + nImg;
      const pageIds = pages.map((_,i) => firstPage + i*2);
      obj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
      obj(2, `<< /Type /Pages /Kids [${pageIds.map(i=>i+' 0 R').join(' ')}] /Count ${pages.length} >>`);
      obj(3, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
      obj(4, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
      images.forEach((im,i) => obj(firstImg+i, [`<< /Type /XObject /Subtype /Image /Width ${im.iw} /Height ${im.ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`, im.bytes, `\nendstream`]));
      const xo = images.map((_,i)=>`/Im${i} ${firstImg+i} 0 R`).join(' ');
      pages.forEach((p,i) => { const id = pageIds[i]; const body = Uint8Array.from(p, ch => ch.charCodeAt(0) & 255);
        obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xo?`/XObject << ${xo} >>`:''} >> /Contents ${id+1} 0 R >>`);
        obj(id+1, [`<< /Length ${body.length} >>\nstream\n`, body, `\nendstream`]); });
      const total = firstPage + pages.length*2; const xref = len;
      push(`xref\n0 ${total}\n0000000000 65535 f \n`);
      for(let i=1;i<total;i++) push(String(offs[i]).padStart(10,'0') + ' 00000 n \n');
      push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
      return new Blob(chunks, {type:'application/pdf'});
    }
  };
  return api;
}
function dataUrlBytes(u){ const b = atob(u.split(',')[1]); return Uint8Array.from(b, ch => ch.charCodeAt(0)); }
async function imgSize(u){ return new Promise(res => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res([480,180]); i.src = u; }); }

async function devisPdf(d){
  const c = calc(d), P = makePdf(), so = {...DEFAULTS.soc, ...(S.soc||{})};
  const pro = d.formule==='P', ink='#1E2430', blue='#3D5A80', muted='#5A5F68', line='#E2DDD4', tint='#E6EBF0';
  const L = 50, R = 545, W = R-L; let y = 50;
  // Logo (deux maisons reliées par un fil)
  const k = 0.42, ox = L, oy = y-4, X = v => (ox + v*k).toFixed(1), Y = v => (842 - (oy + v*k)).toFixed(1);
  P.path(`${X(8)} ${Y(74)} m ${X(8)} ${Y(44)} l ${X(34)} ${Y(22)} l ${X(60)} ${Y(44)} l ${X(60)} ${Y(74)} l ${X(104)} ${Y(74)} m ${X(104)} ${Y(44)} l ${X(130)} ${Y(22)} l ${X(156)} ${Y(44)} l ${X(156)} ${Y(74)} l`, ink, 1.2);
  P.path(`${X(34)} ${Y(60)} m ${X(52)} ${Y(76)} ${X(64)} ${Y(40)} ${X(82)} ${Y(54)} c ${X(100)} ${Y(68)} ${X(112)} ${Y(70)} ${X(130)} ${Y(60)} c`, blue, 1.5);
  P.text(L+76, y+12, pro ? 'Fil Bleu Pro' : 'Maison Fil Bleu', {size:17, bold:true});
  P.text(L+76, y+25, pro ? 'DÉBARRAS & NETTOYAGE' : 'TRANSITION & ACCOMPAGNEMENT', {size:7, color:blue});
  P.text(R, y+10, 'DEVIS', {size:18, bold:true, align:'right'});
  P.text(R, y+24, `N° ${devisNo(d)}`, {size:9, color:muted, align:'right'});
  const dt = new Date(d.signature?.date || Date.now());
  P.text(R, y+36, `Date : ${dt.toLocaleDateString('fr-FR')} · valable 1 mois`, {size:9, color:muted, align:'right'});
  y += 62; P.line(L,y,R,y,line);
  // Émetteur / client
  y += 18;
  const colR = L + W/2 + 10;
  P.text(L, y, 'ÉMETTEUR', {size:7.5, color:blue}); P.text(colR, y, 'CLIENT', {size:7.5, color:blue});
  const em = [`SAS Groupe Fil Bleu${pro?' · Fil Bleu Pro':' · Maison Fil Bleu'}`, so.adresse, `SIRET ${so.siret} · TVA ${so.tva}`, `${so.tel} · ${so.email}`];
  const cl = [d.contact.nom || '[Nom du client]', d.contact.adresse ? `${d.contact.adresse}` : null, d.ville, [d.contact.tel, d.contact.email].filter(Boolean).join(' · ') || null, d.beneficiaire ? `Pour : ${d.beneficiaire}` : null].filter(Boolean);
  let y1 = y+14, y2 = y+14;
  em.forEach((t,i) => { wrap(t, 9, W/2-20, i===0).forEach(l => { P.text(L, y1, l, {size:9, bold:i===0}); y1 += 12.5; }); });
  cl.forEach((t,i) => { wrap(t, 9, W/2-20, i===0).forEach(l => { P.text(colR, y2, l, {size:9, bold:i===0}); y2 += 12.5; }); });
  y = Math.max(y1,y2) + 10;
  // Objet
  P.rect(L, y, W, 1, tint); y += 18;
  P.text(L, y, pro ? 'Débarras et nettoyage' : `Formule ${FORM[d.formule]}`, {size:13, bold:true}); y += 14;
  const logt = `${d.typeLog==='maison'?'Maison':'Appartement'} ${TAILLES[d.taille]}, ${d.surface} m²${d.typeLog==='appartement'?`, ${d.etage ? d.etage+'e étage' : 'rez-de-chaussée'}${d.ascenseur&&d.etage?' avec ascenseur':''}`:''} · ${d.ville}`;
  P.text(L, y, logt, {size:9, color:muted}); y += 13;
  if(showNouveau(d) && d.nouveau && (d.nouveau.adr?.label || d.nouveau.ville)){ const n = d.nouveau; P.text(L, y, `Nouveau logement : ${n.nom ? n.nom+', ' : ''}${NOUV_TYPES[n.type]||''} ${NOUV_TAILLES[n.taille]||''} · ${n.adr?.label || n.ville}${n.date ? ' · entrée le '+new Date(n.date).toLocaleDateString('fr-FR') : ''}`.slice(0,140), {size:9, color:muted}); y += 13; }
  wrap(FORM_DESC[d.formule], 9, W).forEach(l => { P.text(L, y, l, {size:9, color:muted}); y += 12; });
  y += 10;
  // Tableau
  const unit = pro ? 'HT' : 'TTC';
  P.text(L, y, 'DÉSIGNATION', {size:7.5, color:muted}); P.text(R, y, `MONTANT ${unit}`, {size:7.5, color:muted, align:'right'});
  y += 7; P.line(L,y,R,y,ink,0.8); y += 15;
  c.lignes.forEach(([l,v]) => { const ls = wrap(l, 10, W-110); ls.forEach((t,i) => { P.text(L, y + i*12.5, t, {size:10}); }); P.text(R, y, eur(v), {size:10, align:'right'}); y += ls.length*12.5 + 4; P.line(L,y,R,y,line); y += 14; if(y > 700){ P.addPage(); y = 60; } });
  const ht = c.ht, ttcAll = pro ? c.ht*(1+S.tva/100) : c.ttc, tva = ttcAll - ht;
  const tot = [['Total HT', ht, false], [`TVA ${S.tva} %`, tva, false], ['Total TTC', ttcAll, true]];
  y += 2; tot.forEach(([l,v,b]) => { if(b){ P.rect(R-210, y-12, 210, 20, tint); } P.text(R-200, y+1, l, {size:b?11:9.5, bold:b, color:b?ink:muted}); P.text(R-8, y+1, eur(v), {size:b?11:9.5, bold:b, align:'right', color:b?ink:muted}); y += b ? 24 : 15; });
  y += 8;
  // Conditions
  if(y > 640){ P.addPage(); y = 60; }
  P.text(L, y, 'CONDITIONS', {size:7.5, color:blue}); y += 13;
  const cond = pro ? [
    `Professionnels : facture à la fin du chantier, payable à 30 jours. Particuliers : 40 % à la commande, solde à la fin du chantier.`,
    `Déchets évacués en filières agréées, justificatifs sur demande. Non compris : déchets dangereux (amiante, produits chimiques), travaux d'artisans.`,
    d.client!=='agence' ? `Contrat conclu hors établissement : vous disposez de 14 jours pour vous rétracter, aucun paiement ne peut être exigé avant 7 jours.` : null
  ] : [
    `Acompte de 40 % à la signature (${eur(c.ttc*0.4)}), encaissé au plus tôt 8 jours après. Solde (${eur(c.ttc*0.6)}) à la fin du chantier. Des facilités de paiement sont possibles, à convenir par écrit.`,
    `Le déménageur éventuel est choisi avec vous sur devis comparés et réglé directement par vous.`,
    `Contrat conclu hors établissement : vous disposez de 14 jours à compter de la signature pour vous rétracter (formulaire remis avec le contrat).`,
    `Ce devis est complété par le contrat de prestation et ses conditions générales. Médiateur de la consommation : ${so.mediateur}.`
  ];
  cond.filter(Boolean).forEach(t => { wrap('• ' + t, 8.5, W).forEach(l => { P.text(L, y, l, {size:8.5, color:muted}); y += 11; }); y += 2; });
  y += 12;
  // Signatures
  if(y > 690){ P.addPage(); y = 60; }
  const bw = W/2 - 10;
  P.box(L, y, bw, 100); P.box(colR, y, bw, 100);
  P.text(L+10, y+15, 'Pour Groupe Fil Bleu', {size:8.5, bold:true}); P.text(L+10, y+28, so.signataire, {size:8.5, color:muted});
  P.text(colR+10, y+15, 'Bon pour accord du client', {size:8.5, bold:true});
  if(d.signature){
    P.text(colR+10, y+28, `${d.signature.nom}, le ${new Date(d.signature.date).toLocaleDateString('fr-FR')}`, {size:8.5, color:muted});
    const [iw, ih] = await imgSize(d.signature.img); const dh = 58, dw = Math.min(bw-20, dh*iw/ih);
    P.image(dataUrlBytes(d.signature.img), iw, ih, colR+10, y+36, dw, dw*ih/iw > dh ? dh : dw*ih/iw);
  } else P.text(colR+10, y+28, 'Date, nom et signature précédés de « bon pour accord »', {size:8, color:muted});
  // Pied de page
  P.line(L, 800, R, 800, line);
  P.text(L, 812, `SAS Groupe Fil Bleu · ${so.adresse} · SIRET ${so.siret} · RCS Marseille ${so.rcs} · TVA ${so.tva}`, {size:7, color:muted});
  return P.build();
}
async function downloadDevis(d){
  let blob; try{ blob = await devisPdf(d); }catch(e){ showToast('Le PDF n\'a pas pu être créé.'); return; }
  const name = `Devis ${devisNo(d)} ${(d.contact.nom||'client').replace(/[\\/:*?"<>|]/g,'')}${d.signature?' signé':''}.pdf`;
  try{ const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u), 4000); }
  catch(e){ showToast('Téléchargement indisponible dans cette vue.'); }
  if(d.statut==='Diagnostic' || d.statut==='Appel'){ d.statut='Devis envoyé'; persist(d); render(); }
  // Copie du PDF dans l'espace de stockage privé « documents » (servira à l'espace client).
  if(navigator.onLine){
    const chemin = `${d.id}/devis-${devisNo(d)}${d.signature?'-signe':''}.pdf`;
    const { error } = await sb.storage.from('documents').upload(chemin, blob, { contentType: 'application/pdf', upsert: true });
    if(!error){ d.devisPdf = { chemin, date: new Date().toISOString(), signe: !!d.signature }; persist(d); }
  }
}

function bind(d){
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
  app.querySelectorAll('[data-f]').forEach(el => {
    const ev = el.type==='checkbox' || el.tagName==='SELECT' || el.type==='range' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      const p = el.dataset.f; let v = el.type==='checkbox' ? el.checked : el.value;
      if(el.type==='number' || el.type==='range') v = parseFloat(v)||0;
      setPath(d,p,v);
      if(p==='ville'){ d.adr = null; d.kmManuel = false; persist(d); updateDistances(d, true); }
      if(p==='nouveau.ville'){ d.nouveau.adr = null; persist(d); updateDistances(d, true); }
      if(p==='km'){ d.kmManuel = true; d.kmSource = 'manuel'; }
      persist(d);
      if(ev==='change'){ const y = window.scrollY; render(); window.scrollTo(0,y); } else refreshKpis(d);
    });
    if(el.type==='number' && el.dataset.f.startsWith('suivi.')) el.addEventListener('change', () => { const y = window.scrollY; render(); window.scrollTo(0,y); });
  });
  const ma = $('#m-add'); if(ma) ma.onclick = () => { const L = parseFloat($('#m-L').value)||0, l = parseFloat($('#m-l').value)||0, h = parseFloat($('#m-h').value)||0; if(!(L&&l&&h)){ showToast('Saisissez les trois mesures en cm.'); return; }
    d.diag.mesures = [...(d.diag.mesures||[]), {nom: $('#m-nom').value.trim() || 'Meuble mesuré', L, l, h, m3: L*l*h/1e6}]; if((d.diag.volMode||'base')==='base') d.diag.volMode = 'detail'; applyVol(d); persist(d); const y = window.scrollY; render(); window.scrollTo(0,y); };
  app.querySelectorAll('[data-mdel]').forEach(b => b.onclick = () => { d.diag.mesures = (d.diag.mesures||[]).filter((_,i)=>i!==+b.dataset.mdel); applyVol(d); persist(d); const y = window.scrollY; render(); window.scrollTo(0,y); });
  app.querySelectorAll('[data-addr]').forEach(inp => { let t; const key = inp.dataset.addr, box = $('#sug-'+key.replace('.','-'));
    inp.addEventListener('input', () => { if(key==='adr') d.contact.adresse = inp.value; else d.nouveau.adr = {...(d.nouveau.adr||{}), label: inp.value, lat:null, lon:null}; persist(d);
      clearTimeout(t); t = setTimeout(async () => { const res = await geoSearch(inp.value); box.innerHTML = res.map((r,i)=>`<button type="button" class="item" data-pick="${i}" style="padding:10px 12px"><span class="small">${esc(r.label)}</span></button>`).join('');
        box.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { const r = res[+b.dataset.pick]; const v = villeFrom(r.ville) || r.ville;
          if(key==='adr'){ d.adr = r; d.contact.adresse = r.label; d.ville = v; d.kmManuel = false; } else { d.nouveau.adr = r; d.nouveau.ville = v; }
          box.innerHTML = ''; inp.blur(); persist(d); updateDistances(d); }); }, 350); });
  });
  const bs = $('#b-sign'); if(bs) bs.onclick = () => openSignature(d);
  const bu = $('#b-unsign'); if(bu) bu.onclick = () => { delete d.signature; persist(d); render(); };
  const bp = $('#b-pdf'); if(bp) bp.onclick = () => downloadDevis(d);
  app.querySelectorAll('[data-seg]').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
    const p = g.dataset.seg; let v = b.dataset.v; if(['taille','options.installation'].includes(p)) v = parseInt(v,10);
    setPath(d,p,v);
    if(p==='situation'){ d.formule = suggest(d); d.diag.evac = S.evacDefaut[d.formule]; }
    if(p==='formule'){ d.diag.evac = S.evacDefaut[v]; }
    if(p==='taille'){ d.surface = S.surfDefaut[v]; }
    if(['taille','typeLog','diag.volMode'].includes(p)) applyVol(d);
    if(['situation','formule'].includes(p) && showNouveau(d) && !d.nouveau) setTimeout(()=>updateDistances(d,true),0);
    if(p==='nouveau.taille') d.nouveau.taille = parseInt(v,10);
    persist(d); render();
  }));
  app.querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
    const p = b.dataset.step; const v = Math.max(0, (getPath(d,p)||0) + parseFloat(b.dataset.d)); if(p==='diag.volume') d.diag.volMode = 'manuel';
    setPath(d,p,v); persist(d); const y = window.scrollY; render(); window.scrollTo(0,y);
  });
  app.querySelectorAll('[data-inv]').forEach(b => b.onclick = () => {
    const k = b.dataset.inv; d.diag.inventaire = {...(d.diag.inventaire||{})};
    d.diag.inventaire[k] = Math.max(0, (d.diag.inventaire[k]||0) + parseInt(b.dataset.d,10));
    if(!d.diag.inventaire[k]) delete d.diag.inventaire[k];
    if(tab==='diag' && (d.diag.volMode||'base')==='base') d.diag.volMode = 'detail';
    applyVol(d);
    persist(d); const y = window.scrollY; render(); window.scrollTo(0,y);
  });
  const ph = $('#ph'); if(ph) ph.onchange = async () => {
    const files = [...ph.files]; showToast(files.length > 1 ? `Ajout de ${files.length} photos…` : 'Ajout de la photo…');
    for(const f of files){ try{ await ajouterPhoto(d, f); }catch(e){ showToast("Une photo n'a pas pu être ajoutée."); } }
    const y = window.scrollY; render(); window.scrollTo(0,y);
  };
  remplirVignettes();
  const bc = $('#b-copy'); if(bc) bc.onclick = async () => { const t = $('#quote').textContent; try{ await navigator.clipboard.writeText(t); showToast('Résumé copié.'); }catch(e){ const r=document.createRange(); r.selectNodeContents($('#quote')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); showToast('Texte sélectionné : copiez-le.'); } };
  const bd = $('#b-del'); if(bd) bd.onclick = () => {
    if(bd.dataset.confirm){ removeDossier(d.id); view={name:'list'}; render(); }
    else { bd.dataset.confirm='1'; bd.textContent='Touchez encore pour confirmer la suppression'; }
  };
}
function refreshKpis(d){
  const c = calc(d); const k = app.querySelectorAll('.kpi b');
  if(k.length===4){ k[0].textContent = eur(c.ttc); k[1].textContent = eur(c.marge); k[1].className = c.marge<0?'bad':c.pct<0.15?'warn':'good'; k[2].textContent = num(c.hEquipe,0)+' h'; k[3].textContent = num(c.hPorteur,0)+' h'; }
}

function renderSettings(){
  const f = (k,l,stepv='0.01') => `<label>${esc(l)}<input type="number" inputmode="decimal" step="${stepv}" data-s="${k}" value="${getPath(S,k)}"></label>`;
  const grid = (k,l) => `<label>${esc(l)}<div class="grid2" style="grid-template-columns:repeat(4,1fr)">${getPath(S,k).map((v,i)=>`<input type="number" inputmode="decimal" data-s="${k}.${i}" value="${v}" aria-label="${esc(l)} ${TAILLES[i]}">`).join('')}</div></label>`;
  const so = {...DEFAULTS.soc, ...(S.soc||{})};
  const tf = (k,l) => `<label>${esc(l)}<input data-st="${k}" value="${esc(so[k])}"></label>`;
  app.innerHTML = header('Réglages') + `<h1>Réglages</h1>
  <div class="card"><h3>Société (mentions du devis PDF)</h3><label>Commune du siège (point de départ des distances)<select data-st="siegeVille">${Object.keys(COORDS).filter(k=>COORDS[k]).map(v=>`<option ${v===so.siegeVille?'selected':''}>${esc(v)}</option>`).join('')}</select></label>${tf('adresse','Adresse du siège')}<div class="grid2">${tf('siret','SIRET')}${tf('rcs','RCS')}${tf('tva','N° de TVA')}${tf('tel','Téléphone')}</div>${tf('email','E-mail')}${tf('mediateur','Médiateur de la consommation')}${tf('signataire','Signataire pour la société')}</div>
  <div class="card"><h3>Commissions</h3><div class="grid2">${f('partCom','Votre part des honoraires de vente (0 à 1)')}${f('honorairesMoyens','Honoraires moyens HT','100')}</div></div>
  <div class="card"><h3>Prix TTC (1-2 p. / 3 p. / 4 p. / 5 p.+)</h3>${grid('grids.L','Libération')}${grid('grids.T','Transition')}${grid('grids.S','Succession')}${grid('installation','Installation (chambre / studio / 2 p. / 3 p.)')}
  <div class="grid2">${f('m3Sup','Volume en plus, €/m³ TTC','1')}${f('residence','Recherche de résidence','1')}${f('gardiennage','Gardiennage, €/mois','1')}${f('urgence','Urgence, %','1')}</div></div>
  <div class="card"><h3>Fil Bleu Pro (HT)</h3>${grid('proNettoyage','Nettoyage seul (jusqu\'à 30 m² / 55 m² / 75 m² / 100 m²)')}<div class="grid2">${PRO_OPTS.map(([k,l,u])=>`<label>${esc(l)}, € HT/${u}<input type="number" inputmode="decimal" step="0.5" data-s="proOpts.${k}.0" value="${(S.proOpts?.[k]||DEFAULTS.proOpts[k])[0]}"></label>`).join('')}</div><div class="grid2">${f('proForfait','Forfait d\'intervention','1')}${f('proM3','Débarras au-delà du forfait, €/m³','1')}${f('proM3Inclus','m³ compris dans le forfait','1')}</div></div>
  <div class="card"><h3>Coûts</h3><div class="grid2">${f('interim','Intérim, €/h')}${f('porteur','Vos heures, €/h chargé')}${f('decheterie','Déchèterie, €/m³')}${f('camionJour','Camion, €/jour','1')}${f('kmCout','Trajet, €/km')}${f('consommables','Consommables par chantier','1')}</div></div>
  <div class="card"><h3>Rythmes de travail</h3><div class="grid2">${f('rythmeM3','Débarras, h/m³')}${f('rythmeM2','Nettoyage, h/m²')}${f('baie','Baie vitrée, h')}${f('partPorteur','Votre part des heures (0 à 1)')}</div>
  <p class="small muted" style="margin:0">Après vos 5 premiers chantiers, remplacez le rythme prudent (1,3 h/m³) par votre vraie vitesse.</p></div>
  <button class="btn ghost" id="b-reset">Revenir aux réglages d'origine</button>
  <div class="card"><h3>Mon compte</h3><p class="small muted" style="margin:0">Connecté : ${esc(utilisateur?.email||'')}</p>
    <button class="btn ghost" id="b-mdp">Choisir ou changer mon mot de passe</button>
    <button class="btn danger" id="b-deco">Se déconnecter de cet appareil</button></div>`;
  $('#b-mdp').onclick = () => actions.motDePasse();
  $('#b-deco').onclick = () => actions.deconnexion();
  app.querySelectorAll('[data-s]').forEach(el => el.addEventListener('change', () => { setPath(S, el.dataset.s, parseFloat(el.value)||0); persistSettings(); showToast('Réglage enregistré.'); }));
  app.querySelectorAll('[data-st]').forEach(el => el.addEventListener('change', () => { S.soc = {...DEFAULTS.soc, ...(S.soc||{}), [el.dataset.st]: el.value.trim()}; persistSettings(); showToast('Réglage enregistré.'); }));
  $('#b-reset').onclick =() => { S = structuredClone(DEFAULTS); persistSettings(); render(); };
}

let toastT; function showToast(t){ let el = $('#toast'); if(!el){ el = document.createElement('div'); el.id='toast'; el.setAttribute('role','status'); el.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom,0px));background:var(--ink);color:var(--paper);padding:10px 16px;border-radius:999px;font-size:14px;z-index:9'; document.body.appendChild(el); } el.textContent=t; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>el.hidden=true,2200); }

function startNettoyage(){ const d = newDossier(); d.situation='vide'; d.formule='P'; d.client='agence'; d.diag.volume=0; d.diag.evac=100; persist(d); view={name:'dossier', id:d.id}; tab='appel'; render(); window.scrollTo(0,0); }
function startNew(){ const d = newDossier(); d.formule = suggest(d); persist(d); view={name:'dossier', id:d.id}; tab='appel'; render(); window.scrollTo(0,0); }


/* ---------- Démarrage ---------- */
$('#nav-list').onclick = () => { view={name:'list'}; render(); };
$('#nav-new').onclick = startNew;
$('#nav-set').onclick = () => { view={name:'settings'}; render(); };
$('#nav-bilan').onclick = () => { view={name:'bilan'}; render(); window.scrollTo(0,0); };
document.querySelector('nav.bottom').hidden = false;
loadLocal(); render();
(async () => {
  await compterPhotosEnAttente(); majBandeau();
  try{ await viderFile(); await chargerDistant(); render(); }
  catch(e){ showToast("Pas de réseau : dossiers de l'appareil affichés."); }
  majBandeau();
})();
addEventListener('online', async () => { majBandeau(); await viderFile(); try{ await chargerDistant(); rerender(); }catch(e){} });
addEventListener('offline', majBandeau);
document.addEventListener('visibilitychange', async () => {
  if(document.visibilityState !== 'visible' || !navigator.onLine || Object.keys(saveTimers).length) return;
  try{ await viderFile(); await chargerDistant(); rerender(); }catch(e){}
});
return { viderCache(){ [K_CACHE, K_FILE, K_SUPPR, K_REGL].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} }); } };
}
