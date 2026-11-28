/**
 * Fil Bleu Dossiers : appli de terrain du fondateur, devenue le back-office (/admin).
 * Logique, calculs, grilles, générateur PDF, signature, recherche d'adresse et inventaire
 * repris à l'identique de fil-bleu-dossiers.html ; seuls le stockage (Supabase),
 * les photos, le téléchargement et le mode hors ligne ont changé.
 */
import { CGV_PARTICULIERS, CGV_PRO, texte as texteCgv } from '../config/cgv';
import { creerBons } from './bons.js';
import { PHASES, parcoursPour, completerParcours, infosManquantes, prochaineTache } from './parcours.js';
import { documentsDuDossier, champsParDefaut, dessinerDocument, DOC_DE_TACHE } from './courriers.js';
import { trierCourriel, reponsesTypes } from './tri.js';
import { DEMO_ID, DEMO_EMAIL, creerDemo } from './demo.js';

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
  m3Sup: 75, residence: 700, installation: [350,400,720,880], gardiennage: 150, box: 90, livraison: 120, installationDemi: 350, reportMax: 3000, urgence: 25, horsDep: 550, tva: 20,
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
const FORM = { L:"Clés en main", T:"Nouveau départ", S:"Succession", P:"Fil Bleu Pro" };
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
  L:"Diagnostic et devis forfaitaire, tri accompagné (ce que vous gardez, donnez ou laissez partir ; papiers et souvenirs remis), débarras en filières agréées, dons aux associations, nettoyage complet, remise en état coordonnée avec des artisans * si besoin, démarches : résiliations, courrier, relevés de compteurs.",
  T:"Tout le contenu de la formule Clés en main, journées dédiées au tri (ce qui suit, ce qui est donné, ce qui part), coordination du déménagement * et présence le jour J, installation complète du nouveau logement, démarches du nouveau logement, box si besoin, suivi à 15 jours.",
  S:"Tout le contenu de la formule Clés en main, journées dédiées au tri (chaque héritier choisit ce qu'il garde, le reste est donné ou part), papiers et photos de famille classés et remis, lien avec le notaire tout au long du dossier, box si besoin.",
  P:"Débarras et nettoyage du logement, évacuation en filières agréées, photos avant et après."
};
const SUIVI0 = { hDeb:0, hNet:0, hAutres:0, hInterim:0, hAdmin:0, m3:0, joursCamion:0, frais:0, acompte:false, solde:false, liste:false, decharge:false, objets:'', mandat:'non', mandatType:'vente', honoraires:0, vendu:false, fini:false, notes:'' };
const STATUTS =["Appel","Diagnostic","Devis envoyé","Signé","Terminé","Perdu"];
const TAILLES = ["1-2 pièces","3 pièces","4 pièces","5 pièces et +"];

let S = structuredClone(DEFAULTS);
let dossiers = {};          // id -> data
let view = {name:'accueil'};   // accueil | list | dossier | bon | registre | bilan | settings
let tab = 'synthese';
let store = 'db';
let saveTimers = {};
let bonsApi = null;   // bons d'intervention (src/admin/bons.js)

/* ---------- Stockage : Supabase, avec file d'attente hors ligne ---------- */
// Les modifications partent 500 ms après la dernière saisie. Sans réseau, elles sont gardées
// sur l'appareil (file d'attente) et envoyées au retour du réseau.
const K_CACHE = 'fb-cache-dossiers', K_FILE = 'fb-file-attente', K_SUPPR = 'fb-suppressions', K_REGL = 'fb-cache-reglages';
function localGet(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } }
function localSet(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function loadLocal(){ dossiers = localGet(K_CACHE) || {}; const s = localGet(K_REGL); if(s) S = {...structuredClone(DEFAULTS), ...s}; }
function fileAttente(){ return localGet(K_FILE) || {}; }
function suppressions(){ return localGet(K_SUPPR) || []; }
function nbEnAttente(){ return Object.keys(fileAttente()).length + suppressions().length + (photosEnAttente||0) + (bonsApi?.nbEnAttente()||0); }
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
  for(const id of sup){ const { error } = await sb.from('dossiers').delete().eq('id', id); if(error) reste.push(id); else await supprimerFichiers(id); }
  localSet(K_SUPPR, reste);
  await envoyerPhotosEnAttente();
  await bonsApi?.synchroniser();
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
  try{ await bonsApi?.charger(); }catch(e){}
  try{ await chargerCarnet(); }catch(e){}
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
  else await supprimerFichiers(id);
}
async function supprimerFichiers(id){
  for(const b of ['photos', 'documents']){
    try{
      const { data } = await sb.storage.from(b).list(id, { limit: 1000 });
      const chemins = (data||[]).map(f => `${id}/${f.name}`);
      if(chemins.length) await sb.storage.from(b).remove(chemins);
    }catch(e){}
  }
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
let erreurSync = '';          // dernière erreur de rechargement (affichée tant qu'elle n'est pas résolue)
let derniereSync = 0;         // heure du dernier rechargement réussi
function majBandeau(){
  const el = document.getElementById('etat-reseau'); if(!el) return;
  const n = nbEnAttente();
  el.classList.toggle('erreur', navigator.onLine && !!erreurSync);
  if(!navigator.onLine){ el.hidden = false; el.textContent = `Hors ligne : vos modifications sont gardées sur l'appareil${n?` (${n} en attente)`:''} et partiront au retour du réseau.`; }
  else if(erreurSync){ el.hidden = false; el.innerHTML = `<span>${esc(erreurSync)}</span><button type="button" data-actualiser>Réessayer</button>`; }
  else if(n){ el.hidden = false; el.textContent = `${n} modification${n>1?'s':''} en attente d'envoi…`; }
  else el.hidden = true;
  const sy = document.getElementById('side-sync');
  if(sy){
    const txt = !navigator.onLine ? 'Hors ligne' : erreurSync ? 'Échec de synchro' : n ? `${n} en attente d'envoi` : 'Synchronisé';
    sy.className = 'side-sync' + (!navigator.onLine || erreurSync ? ' horsligne' : n ? ' attente' : '');
    sy.lastElementChild.textContent = txt;
    sy.title = txt + (derniereSync ? ` · dernière mise à jour à ${new Date(derniereSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '');
  }
}

/* ---------- Nouveau dossier ---------- */
function newDossier(){
  const id = 'd' + Date.now().toString(36);
  const d = { id, created: new Date().toISOString(), statut:'Appel',
    contact:{nom:'', tel:'', email:'', lien:''}, beneficiaire:'', situation:'vente', client:'particulier',
    ville:'Marseille', km: kmEst(siegePt(), COORDS['Marseille']) || 14, typeLog:'appartement', taille:1, surface:70, etage:0, ascenseur:true, urgence:false, notes:'',
    formule:'L', formuleAuto:true,
    diag:{ volMode:'base', volume:25, evac:70, cave:0, jardin:0, baies:0, objetsLourds:0, etagesMaison:1, salete:'normal', stationnement:false, dechetsSpeciaux:false, monteMeubles:false, notes:'' },
    options:{ residence:false, box:false, livraison:false, installationDemi:false, reportSolde:false, gardiennage:0, videMaison:0, horsDepJours:0 },
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
  const hSup = (S.heuresSup[f]||[0,0,0,0])[i] + (o.livraison && f!=='T' ? 2 : 0) + (o.installationDemi && f==='L' ? 4 : 0);
  const hEquipe = hDeb + hNet + hLourd + hSup;
  const jours = Math.max(1, Math.ceil(hEquipe / 14));
  const nv = d.nouveau, avecNouv = nv && f==='T' && (nv.km>0);
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
    if(o.box){ const v = f==='L' ? S.box : 0; ttc += v; lignes.push([f==='L' ? 'Box de stockage : recherche, contrat et coordination avec le déménageur *' : 'Box de stockage : recherche, contrat et coordination avec le déménageur * (compris)', v]); }
    if(o.livraison && f!=='T'){ ttc += S.livraison; lignes.push([f==='S' ? "Livraison d'objets chez un héritier, organisée avec un déménageur *" : 'Livraison de quelques meubles chez un proche, organisée avec un déménageur *', S.livraison]); }
    if(o.installationDemi && f==='L'){ const v = S.installationDemi ?? DEFAULTS.installationDemi; ttc += v; lignes.push([LIB_INSTALLATION, v]); }
    if(o.gardiennage>0){ const v = o.gardiennage*S.gardiennage; ttc += v; lignes.push([`Gardiennage, ${o.gardiennage} mois`, v]); }
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
/* ---------- Navigation ---------- */
const STATUT_CL = { 'Appel':'bad', 'Diagnostic':'diag', 'Devis envoyé':'attente', 'Signé':'signe', 'Terminé':'ok', 'Perdu':'' };
const telLien = t => { const n = String(t||'').replace(/[^\d+]/g,''); return n.length>=10 && !/\[/.test(t) ? 'tel:'+(n.startsWith('0') ? '+33'+n.slice(1) : n) : null; };
const coche = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>';
const icPhoto = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
const auj = () => { const x = new Date(); x.setHours(0,0,0,0); return x; };
const isoJour = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
const jourCourt = s => { if(!s) return ''; const x = new Date(String(s).length===10 ? s+'T12:00:00' : s); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' }); };
const dateCourte = s => { if(!s) return ''; const x = new Date(String(s).length===10 ? s+'T12:00:00' : s); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', { day:'numeric', month:'short' }); };
const quandFr = s => { const x = new Date(s); if(isNaN(x)) return ''; const h = x.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }); return dateCourte(s) + (h!=='00:00' ? ' · '+h : ''); };
const nomDossier = id => dossiers[id]?.contact?.nom || 'Dossier sans nom';
function ouvrirDossier(id, t){ delete espaces[id]; view = {name:'dossier', id}; tab = t || 'synthese'; render(); window.scrollTo(0,0); }

function header(titre, sur){ return `<header class="pg-h"><div>${sur ? `<span class="sur">${esc(sur)}</span>` : ''}<h1>${esc(titre)}</h1></div></header>`; }
function setNav(){
  const cle = ['list','dossier','bon'].includes(view.name) ? 'list' : view.name;
  document.querySelectorAll('[data-nav]').forEach(b => b.setAttribute('aria-current', b.dataset.nav===cle ? 'page' : 'false'));
}
function render(){ setNav(); if(view.name!=='bon') bonsApi?.quitter(); if(view.name==='accueil') renderAccueil(); else if(view.name==='list') renderList(); else if(view.name==='dossier') renderDossier(); else if(view.name==='bon') bonsApi.ecran(view.id); else if(view.name==='registre') bonsApi.registre(); else if(view.name==='bilan') renderBilan(); else if(view.name==='carnet') renderCarnet(); else if(view.name==='agenda') renderAgenda(); else if(view.name==='courriels') renderCourriels(); else renderSettings(); }

/* ---------- Tableau de bord ---------- */
// Données légères chargées pour l'accueil : rendez-vous et tâches (espace_client), attentes des familles, activité.
const tb = { charge: false, enCours: false, espaces: [], decisions: [], objets: [], bons: [], journal: [], agenda: [], courriels: [] };
async function chargerTableau(){
  if(tb.enCours || !navigator.onLine) return;
  tb.enCours = true;
  const lire = p => p.then(r => r.data || [], () => []);
  const depuis = new Date(Date.now() - 62*86400e3).toISOString();
  const [es, de, ob, bo, jo, ag, co] = await Promise.all([
    lire(sb.from('espace_client').select('dossier_id, prochain, etapes, taches, titre')),
    lire(sb.from('decisions').select('id, dossier_id, question, posee_le').eq('statut', 'attente')),
    lire(sb.from('objets_conserves').select('dossier_id, valide_le').is('valide_le', null)),
    lire(sb.from('bons').select('id, dossier_id, numero, data').not('signe_porteur_le', 'is', null).is('signe_client_le', null)),
    lire(sb.from('journal').select('dossier_id, quand, type, titre').order('quand', { ascending:false }).limit(8)),
    lire(sb.from('agenda').select('*').gte('debut', depuis).order('debut')),
    lire(sb.from('courriels').select('id, recu_le, de, de_nom, sujet').eq('statut', 'nouveau').order('recu_le', { ascending:false }).limit(30)),
  ]);
  Object.assign(tb, { charge: true, enCours: false, espaces: es, decisions: de, objets: ob, bons: bo.filter(b => b.data?.signatures?.distance), journal: jo, agenda: ag, courriels: co });
  majBadgeCourriels();
  if(view.name==='accueil' || view.name==='agenda') rerender();
}
function evenementsAgenda(){
  const ev = [], j0 = isoJour(auj());
  (tb.agenda||[]).forEach(a => { const x = new Date(a.debut); if(isNaN(x)) return; ev.push({ date: isoJour(x), heure: a.journee ? '' : heureDe(a.debut), type: 'agenda', lib: 'Rendez-vous', titre: a.titre, id: a.dossier_id && dossiers[a.dossier_id] ? a.dossier_id : null, detail: a.lieu || '', lieu: a.lieu || '', agendaId: a.id, debut: a.debut, fin: a.fin, journee: a.journee }); });
  Object.values(dossiers).forEach(d => {
    if(d.rdvDiag){ const x = new Date(d.rdvDiag); if(!isNaN(x)) ev.push({ date: isoJour(x), heure: heureDe(d.rdvDiag), type: 'diag', lib: 'Diagnostic', titre: 'Diagnostic sur place', id: d.id, detail: d.adr?.label || d.ville || '', lieu: d.adr?.label || '', debut: x.toISOString() }); }
    if(d.echeance?.date && !['Terminé','Perdu'].includes(d.statut)) ev.push({ date: d.echeance.date, type: 'echeance', lib: 'Échéance', titre: d.echeance.nature || 'Échéance', id: d.id });
  });
  tb.espaces.forEach(e => {
    if(!dossiers[e.dossier_id]) return;
    const p = e.prochain || {};
    if(p.date) ev.push({ date: p.date, heure: p.horaire || '', type: 'rdv', lib: 'Rendez-vous', titre: p.titre || 'Rendez-vous', id: e.dossier_id, detail: p.detail || '' });
    (e.taches||[]).forEach(t => { if(t.date && t.etat!=='fait' && t.cote!=='famille') ev.push({ date: t.date, type: 'tache', lib: t.date < j0 ? 'En retard' : t.oblig ? 'Obligatoire' : 'Tâche', titre: t.libelle || 'Tâche', id: e.dossier_id, retard: t.date < j0 }); });
    (e.etapes||[]).forEach(x => { if(x.date && x.etat!=='termine' && x.date >= j0){ const nom = (ETAPES.find(([k]) => k===x.cle)||[])[1]; if(nom) ev.push({ date: x.date, type: 'etape', lib: 'Étape', titre: nom, id: e.dossier_id }); } });
  });
  return ev.sort((a,b) => (a.date+(a.heure||'')).localeCompare(b.date+(b.heure||'')));
}
function renderAccueil(){
  if(!tb.charge) chargerTableau();
  const all = Object.values(dossiers).filter(d => !d.demo), j0 = auj(), mois = j0.getMonth(), an = j0.getFullYear();
  const actifs = all.filter(d => ['Diagnostic','Devis envoyé','Signé'].includes(d.statut));
  const appels = all.filter(d => d.statut==='Appel').sort((a,b) => (b.created||'').localeCompare(a.created||''));
  const devis = all.filter(d => d.statut==='Devis envoyé');
  const signesMois = all.filter(d => { const x = d.signature?.date && new Date(d.signature.date); return x && x.getMonth()===mois && x.getFullYear()===an; });
  const ev = evenementsAgenda();
  const lundi = new Date(j0); lundi.setDate(j0.getDate() - ((j0.getDay()+6)%7));
  const jours = Array.from({length:6}, (_, i) => { const x = new Date(lundi); x.setDate(lundi.getDate()+i); return x; });
  const finSemaine = isoJour(new Date(jours[5].getTime() + 86400000));
  const semaine = ev.filter(e => e.date >= isoJour(lundi) && e.date < finSemaine);
  const prochains = ev.filter(e => e.retard || (e.date >= isoJour(j0) && e.date <= isoJour(new Date(j0.getTime() + 14*86400000)))).slice(0, 8);
  const attentes = [
    ...[...new Set(tb.objets.map(o => o.dossier_id))].filter(id => dossiers[id]).map(id => ({ id, txt: `Listing des objets à signer (${tb.objets.filter(o => o.dossier_id===id).length} objet${tb.objets.filter(o => o.dossier_id===id).length>1?'s':''})`, t: 'objets' })),
    ...tb.decisions.filter(x => dossiers[x.dossier_id]).map(x => ({ id: x.dossier_id, txt: `Question : ${x.question}`, t: 'journal' })),
    ...tb.bons.filter(b => dossiers[b.dossier_id]).map(b => ({ id: b.dossier_id, txt: `Bon ${b.numero} à signer à distance`, t: 'bons' })),
  ];
  const dateJ = j0.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  app.innerHTML = `<header class="pg-h"><div><span class="sur">${esc(dateJ)}</span><h1>Bonjour.</h1></div>
    <label class="cherche" aria-label="Rechercher un dossier">${'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'}<input id="q-accueil" type="search" placeholder="Rechercher un dossier, un nom, une ville…"></label></header>
  <div class="kpis k5">
    <div class="kpi"><span>Dossiers actifs</span><b>${actifs.length}</b><small>diagnostic, devis, signés</small></div>
    <div class="kpi ${appels.length?'alerte':''}"><span>À rappeler</span><b>${appels.length}</b><small>${appels.length ? 'premier appel à traiter' : 'aucun appel en attente'}</small></div>
    <div class="kpi"><span>Devis en attente</span><b>${devis.length}</b><small>${eur(devis.reduce((a,d)=>a+calc(d).ttc,0))} à signer</small></div>
    <div class="kpi"><span>Signé ce mois-ci</span><b>${eur(signesMois.reduce((a,d)=>a+(d.signature.total||0),0))}</b><small>${signesMois.length} devis signé${signesMois.length>1?'s':''}</small></div>
    <div class="kpi"><span>Cette semaine</span><b>${semaine.length}</b><small>rendez-vous, étapes et tâches</small></div>
  </div>
  <div class="grille">
    <div class="col">
      <div class="pan"><div class="pan-h"><h3>Prochains rendez-vous et échéances</h3><span class="small muted">14 jours</span></div>
        ${!navigator.onLine && !tb.charge ? '<p class="pan-vide">Hors ligne : l\'agenda s\'affichera au retour du réseau.</p>' : prochains.length ? `<ol class="jour">${prochains.map(e => `<li><time>${esc(jourCourt(e.date))}${e.heure ? `<br><span class="small muted">${esc(e.heure)}</span>` : ''}</time><span class="tag ${e.retard ? 'appel' : e.type}">${esc(e.lib)}</span><div><b>${e.id ? esc(nomDossier(e.id))+' · ' : ''}${esc(e.titre)}</b>${e.detail ? `<span>${esc(e.detail)}</span>` : ''}</div>${e.id ? `<button class="btn ghost petit" type="button" data-ouvrir="${esc(e.id)}" data-onglet="${['rdv','tache','etape'].includes(e.type) ? 'prepa' : e.type==='diag' ? 'appel' : 'synthese'}">Ouvrir</button>` : '<button class="btn ghost petit" type="button" data-vers-agenda>Agenda</button>'}</li>`).join('')}</ol>` : `<p class="pan-vide">${tb.charge ? 'Rien de prévu dans les 14 jours. Les dates se saisissent dans l\'onglet « Préparation » de chaque dossier.' : 'Chargement…'}</p>`}
      </div>
      <div class="pan"><div class="pan-h"><h3>Cette semaine</h3><button class="lien" type="button" data-vers-agenda>Agenda complet</button></div>
        <div class="semaine">${jours.map(x => { const k = isoJour(x), evs = semaine.filter(e => e.date===k); return `<div class="j ${k===isoJour(j0)?'auj':''}"><span>${esc(x.toLocaleDateString('fr-FR',{weekday:'short', day:'numeric'}))}</span>${evs.map(e => `<button type="button" class="ev ${e.type}" ${e.id ? `data-ouvrir="${esc(e.id)}" data-onglet="prepa"` : 'data-vers-agenda'}><b>${e.heure ? esc(e.heure)+' ' : ''}${esc(e.titre)}</b>${e.id ? esc(nomDossier(e.id)) : esc(e.detail||'')}</button>`).join('')}</div>`; }).join('')}</div>
      </div>
    </div>
    <div class="col">
      <div class="pan"><div class="pan-h"><h3>En attente des familles</h3>${attentes.length ? `<span class="badge attente">${attentes.length}</span>` : ''}</div>
        ${attentes.length ? `<ul class="liste">${attentes.slice(0,8).map(a => `<li><div><b>${esc(nomDossier(a.id))}</b><span>${esc(a.txt)}</span></div><button class="lien" type="button" data-ouvrir="${esc(a.id)}" data-onglet="${a.t}">Voir</button></li>`).join('')}</ul>` : `<p class="pan-vide">${tb.charge ? 'Rien en attente : aucune signature ni réponse demandée aux familles.' : 'Chargement…'}</p>`}
      </div>
      ${(tb.courriels||[]).length ? `<div class="pan"><div class="pan-h"><h3>Courriels à traiter</h3><span class="badge attente">${tb.courriels.length}</span></div><ul class="liste">${tb.courriels.slice(0,5).map(c => `<li><div><b>${esc(c.de_nom || c.de)}</b><span>${esc(c.sujet || '(sans objet)')} · ${esc(quandFr(c.recu_le))}</span></div><button class="lien" type="button" data-courriel="${esc(c.id)}">Voir</button></li>`).join('')}</ul></div>` : ''}
      <div class="pan"><div class="pan-h"><h3>Nouvelles demandes et appels</h3>${appels.length ? `<span class="badge bad">${appels.length}</span>` : ''}</div>
        ${appels.length ? `<ul class="liste">${appels.slice(0,6).map(d => `<li><div><b>${esc(d.contact.nom || 'Sans nom')}${d.ville ? ' · '+esc(d.ville) : ''}</b><span>${esc(FORM[d.formule])} · reçu le ${esc(dateCourte(d.created))}${d.contact.tel ? ' · '+esc(d.contact.tel) : ''}</span></div>${telLien(d.contact.tel) ? `<a class="btn petit" href="${telLien(d.contact.tel)}">Appeler</a>` : ''}<button class="lien" type="button" data-ouvrir="${esc(d.id)}" data-onglet="appel">Traiter</button></li>`).join('')}</ul>` : '<p class="pan-vide">Aucun appel à traiter.</p>'}
      </div>
      <div class="pan"><div class="pan-h"><h3>Activité récente</h3></div>
        ${tb.journal.length ? `<ul class="activite">${tb.journal.filter(j => dossiers[j.dossier_id]).map(j => `<li class="t-${esc(j.type)}"><i class="pt"></i><div><b>${esc(nomDossier(j.dossier_id))}</b> · ${esc(j.titre)}<span>${esc(quandFr(j.quand))}</span></div></li>`).join('')}</ul>` : `<p class="pan-vide">${tb.charge ? 'Le journal des dossiers apparaîtra ici.' : 'Chargement…'}</p>`}
      </div>
    </div>
  </div>`;
  app.querySelectorAll('[data-ouvrir]').forEach(b => b.onclick = () => ouvrirDossier(b.dataset.ouvrir, b.dataset.onglet));
  app.querySelectorAll('[data-vers-agenda]').forEach(b => b.onclick = () => { view = { name:'agenda' }; render(); window.scrollTo(0,0); });
  app.querySelectorAll('[data-courriel]').forEach(b => b.onclick = () => { view = { name:'courriels', filtre:'nouveau', ouvert: b.dataset.courriel }; render(); window.scrollTo(0,0); });
  const qa = $('#q-accueil'); qa.onkeydown = e => { if(e.key==='Enter'){ view = {name:'list', q: qa.value}; render(); } };
  qa.oninput = () => { if(qa.value.length >= 2){ view = {name:'list', q: qa.value}; render(); const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
}

/* ---------- Agenda : rendez-vous saisis + dates des dossiers (prochain rendez-vous, étapes, tâches) ---------- */
const MOIS_FR = d => d.toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
const lundiDe = x => { const y = new Date(x); y.setHours(0,0,0,0); y.setDate(y.getDate() - ((y.getDay()+6)%7)); return y; };
const ajoutJours = (x, n) => { const y = new Date(x); y.setDate(y.getDate()+n); return y; };
const heureDe = s => { const x = new Date(s); return isNaN(x) ? '' : x.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }); };
const TYPES_EV = { agenda:'Rendez-vous', rdv:'Rendez-vous famille', etape:'Étape', tache:'Tâche', diag:'Diagnostic', echeance:'Échéance' };

function renderAgenda(){
  if(!tb.charge) chargerTableau();
  const mode = view.mode || 'mois', ref = view.ref ? new Date(view.ref+'T12:00:00') : auj();
  const ev = evenementsAgenda(true);
  const parJour = k => ev.filter(e => e.date === k);
  const chip = e => `<button type="button" class="ev ${e.type}" ${e.agendaId ? `data-ag="${esc(e.agendaId)}"` : e.id ? `data-ouvrir="${esc(e.id)}"` : ''} title="${esc(TYPES_EV[e.type]||'')}${e.heure ? ' · '+esc(e.heure) : ''}"><b>${e.heure ? esc(e.heure)+' ' : ''}${esc(e.titre)}</b>${e.id ? esc(nomDossier(e.id)) : esc(e.detail||'')}</button>`;
  let titre = '', corps = '';
  if(mode === 'mois'){
    const debut = new Date(ref.getFullYear(), ref.getMonth(), 1), l0 = lundiDe(debut);
    const nbSem = Math.ceil(((debut.getDay()+6)%7 + new Date(ref.getFullYear(), ref.getMonth()+1, 0).getDate()) / 7);
    titre = MOIS_FR(debut).replace(/^./, c => c.toUpperCase());
    corps = `<div class="mois"><div class="mois-t">${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(j => `<span>${j}</span>`).join('')}</div>
      <div class="mois-g">${Array.from({length: nbSem*7}, (_, i) => { const x = ajoutJours(l0, i), k = isoJour(x), evs = parJour(k);
        return `<div class="mj ${x.getMonth()!==ref.getMonth() ? 'hors' : ''} ${k===isoJour(auj()) ? 'auj' : ''}" data-jour="${k}"><span>${x.getDate()}</span>${evs.slice(0,3).map(chip).join('')}${evs.length>3 ? `<button type="button" class="lien small" data-voir-jour="${k}">+ ${evs.length-3} autre${evs.length>4?'s':''}</button>` : ''}</div>`; }).join('')}</div></div>`;
  } else if(mode === 'semaine'){
    const l0 = lundiDe(ref), fin = ajoutJours(l0, 6);
    titre = `Semaine du ${l0.toLocaleDateString('fr-FR', { day:'numeric', month:'long' })} au ${fin.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}`;
    corps = `<div class="sem">${Array.from({length:7}, (_, i) => { const x = ajoutJours(l0, i), k = isoJour(x), evs = parJour(k);
      return `<div class="sj ${k===isoJour(auj()) ? 'auj' : ''}" data-jour="${k}"><span>${esc(x.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric' }))}</span>${evs.map(chip).join('') || '<em class="small muted">—</em>'}</div>`; }).join('')}</div>`;
  } else {
    const j0 = isoJour(auj()), fin = isoJour(ajoutJours(auj(), 90));
    const proch = ev.filter(e => e.date >= j0 && e.date <= fin);
    const jours = [...new Set(proch.map(e => e.date))];
    titre = 'Les 90 prochains jours';
    corps = jours.length ? `<div class="pan">${jours.map(k => `<div class="lj"><b>${esc(jourCourt(k))}</b><div>${proch.filter(e => e.date===k).map(e => `<div class="lj-e">${chip(e)}<span class="small muted">${esc(TYPES_EV[e.type]||'')}${e.lieu ? ' · '+esc(e.lieu) : ''}</span></div>`).join('')}</div></div>`).join('')}</div>` : `<div class="card"><p class="muted" style="margin:0">Rien de prévu dans les 90 prochains jours.</p></div>`;
  }
  const ed = view.edit ? (view.edit === 'nouveau' ? { titre:'', debut: (view.jour || isoJour(auj())) + 'T09:00', fin:'', journee:false, lieu:'', notes:'', dossier_id: view.dossierAg || '' } : (tb.agenda||[]).find(a => a.id === view.edit)) : null;
  const local = s => { if(!s) return ''; const x = new Date(s); if(isNaN(x)) return String(s).slice(0,16); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0,16); };
  app.innerHTML = `<header class="pg-h"><div><span class="sur">Agenda</span><h1>${esc(titre)}</h1></div>
    <div class="row"><button class="btn ghost petit" type="button" data-nav-ag="-1" aria-label="Précédent">‹</button><button class="btn ghost petit" type="button" data-nav-ag="0">Aujourd'hui</button><button class="btn ghost petit" type="button" data-nav-ag="1" aria-label="Suivant">›</button>
    ${seg('ag-mode', [['mois','Mois'],['semaine','Semaine'],['liste','Liste']], mode)}
    <button class="btn ghost" type="button" id="ag-ics">Exporter vers le téléphone</button><button class="btn" type="button" id="ag-nouveau">Nouveau rendez-vous</button></div></header>
  ${ed ? `<div class="card"><h3>${view.edit==='nouveau' ? 'Nouveau rendez-vous' : 'Modifier le rendez-vous'}</h3>
    <label>Titre<input id="ag-titre" value="${esc(ed.titre)}" placeholder="Ex. : Diagnostic chez Mme Roux, rendez-vous chez le notaire…" maxlength="160"></label>
    <div class="grid2"><label>Début<input id="ag-debut" type="datetime-local" value="${esc(local(ed.debut))}"></label><label>Fin (facultatif)<input id="ag-fin" type="datetime-local" value="${esc(local(ed.fin))}"></label></div>
    <label class="row"><input type="checkbox" id="ag-journee" ${ed.journee ? 'checked' : ''}> Toute la journée</label>
    <div class="grid2"><label>Lieu<input id="ag-lieu" value="${esc(ed.lieu||'')}" placeholder="Adresse"></label>
      <label>Dossier (facultatif)<select id="ag-dossier"><option value="">Aucun</option>${Object.values(dossiers).sort((a,b) => (a.contact.nom||'').localeCompare(b.contact.nom||'')).map(d => `<option value="${esc(d.id)}" ${ed.dossier_id===d.id?'selected':''}>${esc(d.contact.nom||'Sans nom')} · ${esc(d.ville||'')}</option>`).join('')}</select></label></div>
    <label>Notes<textarea id="ag-notes" maxlength="1000">${esc(ed.notes||'')}</textarea></label>
    <label class="row"><input type="checkbox" id="ag-famille"> Afficher aussi comme « prochain rendez-vous » dans l'espace client du dossier</label>
    <div class="row"><button class="btn" type="button" id="ag-enreg">Enregistrer</button><button class="btn ghost" type="button" id="ag-annul">Annuler</button>${view.edit!=='nouveau' ? '<button class="btn danger" type="button" id="ag-suppr" style="margin-left:auto">Supprimer</button>' : ''}</div>
  </div>` : ''}
  ${!navigator.onLine && !tb.charge ? '<div class="suggest warn">Hors ligne : l\'agenda s\'affichera au retour du réseau.</div>' : ''}
  ${corps}
  <p class="small muted" style="margin:0"><span class="ev agenda" style="display:inline-flex;padding:2px 8px">Rendez-vous</span> <span class="ev rdv" style="display:inline-flex;padding:2px 8px">Rendez-vous famille</span> <span class="ev etape" style="display:inline-flex;padding:2px 8px">Étape</span> <span class="ev tache" style="display:inline-flex;padding:2px 8px">Tâche</span> <span class="ev echeance" style="display:inline-flex;padding:2px 8px">Échéance</span> · Touchez un jour pour y ajouter un rendez-vous.</p>`;

  // Navigation
  app.querySelectorAll('[data-nav-ag]').forEach(b => b.onclick = () => {
    const n = +b.dataset.navAg; let x = new Date(ref);
    if(n === 0) x = auj(); else if(mode === 'mois') x = new Date(ref.getFullYear(), ref.getMonth()+n, 1); else x = ajoutJours(ref, 7*n);
    view.ref = isoJour(x); renderAgenda();
  });
  app.querySelectorAll('[data-seg="ag-mode"] button').forEach(b => b.onclick = () => { view.mode = b.dataset.v; renderAgenda(); });
  app.querySelectorAll('[data-ouvrir]').forEach(b => b.onclick = ev2 => { ev2.stopPropagation(); ouvrirDossier(b.dataset.ouvrir, 'prepa'); });
  app.querySelectorAll('[data-ag]').forEach(b => b.onclick = ev2 => { ev2.stopPropagation(); view.edit = b.dataset.ag; renderAgenda(); window.scrollTo(0,0); });
  app.querySelectorAll('[data-voir-jour]').forEach(b => b.onclick = ev2 => { ev2.stopPropagation(); view.mode = 'semaine'; view.ref = b.dataset.voirJour; renderAgenda(); });
  app.querySelectorAll('[data-jour]').forEach(c => c.onclick = () => { view.edit = 'nouveau'; view.jour = c.dataset.jour; renderAgenda(); window.scrollTo(0,0); app.querySelector('#ag-titre')?.focus(); });
  $('#ag-nouveau').onclick = () => { view.edit = 'nouveau'; view.jour = null; renderAgenda(); window.scrollTo(0,0); app.querySelector('#ag-titre')?.focus(); };
  $('#ag-ics').onclick = () => exporterIcs(ev);
  const an = $('#ag-annul'); if(an) an.onclick = () => { view.edit = null; renderAgenda(); };
  const en = $('#ag-enreg'); if(en) en.onclick = async () => {
    const titre = $('#ag-titre').value.trim(), debut = $('#ag-debut').value, fin = $('#ag-fin').value;
    if(!titre || !debut){ showToast('Indiquez un titre et une date de début.'); return; }
    if(fin && fin < debut){ showToast('La fin doit être après le début.'); return; }
    if(!navigator.onLine){ showToast('Pas de réseau : réessayez plus tard.'); return; }
    const ligne = { titre, debut: new Date(debut).toISOString(), fin: fin ? new Date(fin).toISOString() : null, journee: $('#ag-journee').checked, lieu: $('#ag-lieu').value.trim(), notes: $('#ag-notes').value.trim(), dossier_id: $('#ag-dossier').value || null };
    en.disabled = true;
    const r = view.edit === 'nouveau' ? await sb.from('agenda').insert(ligne).select().single() : await sb.from('agenda').update(ligne).eq('id', view.edit).select().single();
    en.disabled = false;
    if(r.error){ showToast('Non enregistré : ' + r.error.message); return; }
    tb.agenda = [...(tb.agenda||[]).filter(a => a.id !== r.data.id), r.data];
    if($('#ag-famille').checked && ligne.dossier_id){
      const d = dossiers[ligne.dossier_id], x = new Date(debut);
      const prochain = { date: isoJour(x), horaire: ligne.journee ? 'toute la journée' : heureDe(x) + (fin ? ' à ' + heureDe(new Date(fin)) : ''), titre, detail: ligne.lieu ? ligne.lieu : '' };
      const { error } = await sb.from('espace_client').upsert({ dossier_id: d.id, formule: d.formule, ville: d.ville, prochain });
      if(error) showToast('Rendez-vous enregistré, mais pas affiché dans l\'espace client : ' + error.message);
      delete espaces[d.id]; tb.charge = false;
    }
    view.edit = null; renderAgenda(); showToast('Rendez-vous enregistré.');
  };
  const sp = $('#ag-suppr'); if(sp) sp.onclick = async () => {
    if(!sp.dataset.ok){ sp.dataset.ok = '1'; sp.textContent = 'Toucher encore pour supprimer'; return; }
    const { error } = await sb.from('agenda').delete().eq('id', view.edit);
    if(error){ showToast(error.message); return; }
    tb.agenda = (tb.agenda||[]).filter(a => a.id !== view.edit); view.edit = null; renderAgenda(); showToast('Rendez-vous supprimé.');
  };
}

/* Export .ics : à ouvrir sur le téléphone pour ajouter les rendez-vous à son agenda (Apple ou Google). */
function exporterIcs(ev){
  const j0 = isoJour(ajoutJours(auj(), -30)), fin = isoJour(ajoutJours(auj(), 180));
  const echap = s => String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/[,;]/g, m => '\\'+m);
  const fmtJ = k => k.replace(/-/g,'');
  const fmtH = x => { const p = n => String(n).padStart(2,'0'); return `${x.getFullYear()}${p(x.getMonth()+1)}${p(x.getDate())}T${p(x.getHours())}${p(x.getMinutes())}00`; };
  const lignes = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Maison Fil Bleu//Fil Bleu Dossiers//FR','CALSCALE:GREGORIAN','X-WR-CALNAME:Fil Bleu'];
  ev.filter(e => e.date >= j0 && e.date <= fin && e.type !== 'tache').forEach((e, i) => {
    lignes.push('BEGIN:VEVENT', `UID:fb-${e.agendaId || (e.id||'x')+'-'+e.type+'-'+e.date+'-'+i}@maisonfilbleu.fr`, `DTSTAMP:${fmtH(new Date())}`);
    if(e.debut && !e.journee){ lignes.push(`DTSTART:${fmtH(new Date(e.debut))}`, `DTEND:${fmtH(e.fin ? new Date(e.fin) : new Date(new Date(e.debut).getTime()+3600e3))}`); }
    else { const k2 = isoJour(ajoutJours(new Date(e.date+'T12:00:00'), 1)); lignes.push(`DTSTART;VALUE=DATE:${fmtJ(e.date)}`, `DTEND;VALUE=DATE:${fmtJ(k2)}`); }
    lignes.push(`SUMMARY:${echap((e.id ? nomDossier(e.id)+' · ' : '') + e.titre)}`);
    const desc = [TYPES_EV[e.type], e.heure && !e.debut ? 'Horaire : '+e.heure : '', e.detail].filter(Boolean).join(' · ');
    if(desc) lignes.push(`DESCRIPTION:${echap(desc)}`);
    if(e.lieu) lignes.push(`LOCATION:${echap(e.lieu)}`);
    lignes.push('END:VEVENT');
  });
  lignes.push('END:VCALENDAR');
  const u = URL.createObjectURL(new Blob([lignes.join('\r\n')], { type:'text/calendar' }));
  const a = document.createElement('a'); a.href = u; a.download = 'agenda-fil-bleu.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  showToast('Fichier d\'agenda téléchargé : ouvrez-le sur votre téléphone pour l\'ajouter à votre calendrier.');
}

/* ---------- Courriels reçus sur contact@ et pro@ (copiés par le Worker « fil-bleu-courriels ») ---------- */
const STATUT_C = { nouveau:['À traiter','attente'], range:['Rangé','cours'], traite:['Traité','ok'], ignore:['Ignoré',''] };
function majBadgeCourriels(){
  const n = (tb.courriels||[]).length;
  document.querySelectorAll('[data-nav="courriels"]').forEach(b => { let em = b.querySelector('em'); if(!n){ em?.remove(); return; } if(!em){ em = document.createElement('em'); b.appendChild(em); } em.textContent = n; });
}
// Dossiers proposés pour un courriel : même adresse que le contact ou qu'un accès, ou même nom de domaine qu'un organisme lié.
function dossiersProposes(c){
  const de = (c.de||'').toLowerCase(), dom = de.split('@')[1] || '';
  return Object.values(dossiers).filter(d => {
    if((d.contact?.email||'').toLowerCase() === de) return true;
    return (d.organismes||[]).some(o => { const f = ficheCarnet(o.id); return f?.email && (f.email.toLowerCase() === de || (dom && f.email.toLowerCase().endsWith('@'+dom))); });
  });
}
async function majCourriel(c, champs){
  const { data, error } = await sb.from('courriels').update(champs).eq('id', c.id).select().single();
  if(error){ showToast(error.message); return null; }
  Object.assign(c, data); tb.courriels = (tb.courriels||[]).filter(x => x.id !== c.id || data.statut === 'nouveau'); majBadgeCourriels();
  return data;
}
const CL_TRI = { demande:'attente', demande_pro:'attente', famille:'cours', organisme:'diag', automatique:'', publicite:'', autre:'', envoye:'cours' };
const SITU_TRI = { deces:'Décès, succession', residence:'Entrée en résidence', demenage:'Déménagement', vente:'Vente du logement', vide:'Débarras' };
const triDe = c => trierCourriel(c, { carnet, dossiers: Object.values(dossiers), communes: Object.keys(COORDS) });
function blocTri(c, t){
  if(t.categorie === 'envoye') return '';
  const i = t.infos || {};
  const puces = [
    t.situation && ['Situation', SITU_TRI[t.situation]], t.formule && ['Formule suggérée', FORM[t.formule]],
    i.tel && ['Téléphone', i.tel], (i.ville || i.cp) && ['Commune', i.ville || i.cp],
    (i.typeLog || i.pieces) && ['Logement', [i.typeLog==='maison' ? 'Maison' : i.typeLog ? 'Appartement' : '', i.pieces ? i.pieces + ' pièces' : i.taille===0 ? 'petit' : ''].filter(Boolean).join(', ')],
    i.surface && ['Surface', i.surface + ' m²'], i.etage != null && ['Étage', i.etage + (i.ascenseur === false ? ', sans ascenseur' : i.ascenseur ? ', ascenseur' : '')],
    i.echeance && ['Échéance', i.echeance], i.urgence && ['Urgence', 'oui'], i.annexes && ['Annexes', 'cave, garage ou jardin'],
  ].filter(Boolean);
  const modeles = reponsesTypes(t, { signature: signatureReponse(c), nom: c.de_nom ? c.de_nom.split(' ')[0] : '' });
  return `<div class="tri"><div class="tri-h"><span class="sur" style="margin:0">Tri automatique</span><span class="badge ${CL_TRI[t.categorie]||''}">${esc(t.libelle)}</span><span class="small muted">confiance ${esc(t.confiance)}</span></div>
    ${puces.length ? `<div class="tri-puces">${puces.map(([k,v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join('')}</div>` : ''}
    ${t.dossierPropose && t.dossierPropose !== c.dossier_id && dossiers[t.dossierPropose] ? `<button class="btn ghost petit" type="button" data-tri-ranger="${esc(t.dossierPropose)}">Ranger dans « ${esc(nomDossier(t.dossierPropose))} »</button>` : ''}
    ${modeles.length ? `<div class="row"><span class="small muted">Réponses types :</span>${modeles.map((m, k) => `<button class="btn ghost petit" type="button" data-rep-modele="${k}">${esc(m.titre)}</button>`).join('')}</div>` : ''}
    <p class="small muted" style="margin:0">Suggestions seulement : rien n'est fait sans votre clic.</p></div>`;
}
function renderCourriels(){
  const filtre = view.filtre ?? 'nouveau';
  app.innerHTML = `${header('Courriels', 'contact@ et pro@')}<div class="card"><p class="muted" style="margin:0">${navigator.onLine ? 'Chargement…' : 'Hors ligne : les courriels se consultent avec du réseau.'}</p></div>`;
  if(!navigator.onLine) return;
  let q = sb.from('courriels').select('*').order('recu_le', { ascending:false }).limit(200);
  if(filtre) q = q.eq('statut', filtre);
  q.then(({ data, error }) => {
    if(view.name !== 'courriels') return;
    if(error){ app.innerHTML = header('Courriels') + `<div class="card"><p style="margin:0">Impossible de charger les courriels : ${esc(error.message)}</p></div>`; return; }
    view.liste = data || [];
    dessinerCourriels();
  });
}
function dessinerCourriels(){
  const liste = view.liste || [], filtre = view.filtre ?? 'nouveau', sel = liste.find(c => c.id === view.ouvert);
  const nomDe = c => c.de_nom ? `${c.de_nom}` : c.de;
  app.innerHTML = `${header('Courriels', 'contact@ et pro@')}
  <div class="pipeline" role="group" aria-label="Filtrer">${[['nouveau','À traiter'],['range','Rangés'],['traite','Traités'],['','Tous']].map(([k,l]) => `<button type="button" data-fc="${k}" aria-pressed="${filtre===k}"><span>${l}</span></button>`).join('')}</div>
  ${sel ? carteCourriel(sel) : ''}
  ${liste.length ? `<div class="pan tab"><table><thead><tr><th>Reçu</th><th>De</th><th>Objet</th><th>Tri</th><th>Dossier</th><th>Statut</th></tr></thead><tbody>
    ${liste.map(c => `<tr class="clic ${c.id===view.ouvert ? 'attente' : ''}" data-co="${esc(c.id)}"><td class="muted" style="white-space:nowrap">${esc(quandFr(c.recu_le))}</td><td>${c.sens==='envoye' ? `<span class="badge cours">Envoyé</span> à ${esc(c.destinataires||'')}` : `<b>${esc(nomDe(c))}</b>${c.de_nom ? `<br><span class="small muted">${esc(c.de)}</span>` : ''}`}</td><td>${esc(c.sujet || '(sans objet)')}<br><span class="small muted">${esc((c.texte||'').replace(/\s+/g,' ').slice(0, 110))}</span></td><td>${(() => { const t = triDe(c); return t.categorie==='envoye' ? '' : `<span class="badge ${CL_TRI[t.categorie]||''}">${esc(t.libelle.replace(/^Organisme : /,''))}</span>${t.infos?.ville ? `<br><span class="small muted">${esc(t.infos.ville)}</span>` : ''}`; })()}</td><td>${c.dossier_id && dossiers[c.dossier_id] ? esc(nomDossier(c.dossier_id)) : '<span class="muted">—</span>'}</td><td><span class="badge ${STATUT_C[c.statut]?.[1]||''}">${STATUT_C[c.statut]?.[0]||''}</span></td></tr>`).join('')}
  </tbody></table></div>` : `<div class="card"><p class="muted" style="margin:0">${filtre==='nouveau' ? 'Aucun courriel à traiter. Les messages reçus sur contact@ apparaissent ici ; ceux des familles connues sont rangés directement dans leur dossier.' : 'Aucun courriel.'}</p></div>`}`;
  app.querySelectorAll('[data-fc]').forEach(b => b.onclick = () => { view.filtre = b.dataset.fc; view.ouvert = null; renderCourriels(); });
  app.querySelectorAll('[data-co]').forEach(r => r.onclick = () => { view.ouvert = view.ouvert === r.dataset.co ? null : r.dataset.co; dessinerCourriels(); window.scrollTo(0,0); });
  if(sel) lierCarteCourriel(sel);
}
function carteCourriel(c){
  const prop = dossiersProposes(c).filter(d => d.id !== c.dossier_id);
  return `<div class="card"><h3>${esc(c.sujet || '(sans objet)')}</h3>
    <p class="small muted" style="margin:0">De <b>${esc(c.de_nom || c.de)}</b>${c.de_nom ? ` &lt;${esc(c.de)}&gt;` : ''} · reçu le ${esc(new Date(c.recu_le).toLocaleString('fr-FR', { dateStyle:'long', timeStyle:'short' }))}${c.adresse ? ` sur ${esc(c.adresse)}` : ''}</p>
    ${blocTri(c, triDe(c))}
    <pre class="quote" style="max-height:340px;overflow:auto">${esc(c.texte || '')}</pre>
    ${(c.pieces||[]).length ? `<p class="small muted" style="margin:0">Pièces jointes (dans Gmail) : ${c.pieces.map(p => esc(p.nom)).join(', ')}</p>` : ''}
    <div class="grid2" style="align-items:end"><label>Dossier<select id="co-dossier"><option value="">Non rattaché</option>${prop.length ? `<optgroup label="Proposés">${prop.map(d => `<option value="${esc(d.id)}">${esc(d.contact.nom||'Sans nom')} · ${esc(d.ville||'')}</option>`).join('')}</optgroup>` : ''}<optgroup label="Tous les dossiers">${Object.values(dossiers).sort((a,b) => (a.contact.nom||'').localeCompare(b.contact.nom||'')).map(d => `<option value="${esc(d.id)}" ${c.dossier_id===d.id?'selected':''}>${esc(d.contact.nom||'Sans nom')} · ${esc(d.ville||'')}</option>`).join('')}</optgroup></select></label>
      <button class="btn ghost" type="button" id="co-ranger">Ranger dans ce dossier</button></div>
    <div class="row">
      ${c.dossier_id && dossiers[c.dossier_id] ? `<button class="btn ghost" type="button" id="co-ouvrir">Ouvrir le dossier</button>` : `<button class="btn" type="button" id="co-creer">Créer un dossier avec ce courriel</button>`}
      ${c.sens !== 'envoye' ? `<button class="btn" type="button" data-rep-ouvrir="${esc(c.id)}">Répondre</button>` : ''}
      ${c.statut !== 'traite' ? '<button class="btn ghost" type="button" id="co-traite">Marquer comme traité</button>' : ''}
      ${c.statut !== 'ignore' ? '<button class="btn ghost" type="button" id="co-ignorer">Ignorer</button>' : ''}
      <button class="lien" type="button" id="co-fermer" style="margin-left:auto">Fermer</button>
    </div>
    ${c.sens !== 'envoye' ? editeurReponse(c) + `<a class="lien small" href="mailto:${esc(c.de)}?subject=${encodeURIComponent('Re: ' + (c.sujet||''))}" style="align-self:flex-start">Répondre plutôt depuis ma messagerie</a>` : `<p class="small muted" style="margin:0">Envoyé à ${esc(c.destinataires||'')}.</p>`}
  </div>`;
}
function lierCarteCourriel(c){
  $('#co-fermer').onclick = () => { view.ouvert = null; dessinerCourriels(); };
  lierReponses(app, [c], () => { view.ouvert = null; renderCourriels(); });
  const t = triDe(c);
  const tr2 = app.querySelector('[data-tri-ranger]'); if(tr2) tr2.onclick = async () => { if(await majCourriel(c, { dossier_id: tr2.dataset.triRanger, statut: 'range' })){ showToast('Courriel rangé dans le dossier.'); dessinerCourriels(); } };
  const modeles = reponsesTypes(t, { signature: signatureReponse(c), nom: c.de_nom ? c.de_nom.split(' ')[0] : '' });
  app.querySelectorAll('[data-rep-modele]').forEach(b => b.onclick = () => {
    const box = app.querySelector(`[data-rep="${CSS.escape(c.id)}"]`); if(!box) return;
    box.querySelector('[data-rep-texte]').value = modeles[+b.dataset.repModele].texte;
    box.hidden = false; const o = app.querySelector(`[data-rep-ouvrir="${CSS.escape(c.id)}"]`); if(o) o.hidden = true;
    box.scrollIntoView({ behavior:'smooth', block:'center' }); box.querySelector('[data-rep-texte]').focus();
  });
  $('#co-ranger').onclick = async () => { const id = $('#co-dossier').value; if(!id){ showToast('Choisissez un dossier.'); return; } if(await majCourriel(c, { dossier_id: id, statut: 'range' })){ showToast('Courriel rangé dans le dossier.'); dessinerCourriels(); } };
  const tr = $('#co-traite'); if(tr) tr.onclick = async () => { if(await majCourriel(c, { statut: 'traite' })){ view.ouvert = null; showToast('Marqué comme traité.'); dessinerCourriels(); } };
  const ig = $('#co-ignorer'); if(ig) ig.onclick = async () => { if(await majCourriel(c, { statut: 'ignore' })){ view.ouvert = null; dessinerCourriels(); } };
  const ou = $('#co-ouvrir'); if(ou) ou.onclick = () => ouvrirDossier(c.dossier_id, 'courriels');
  const cr = $('#co-creer'); if(cr) cr.onclick = async () => {
    const d = newDossier(), t2 = triDe(c), i = t2.infos || {};
    if(t2.situation) d.situation = t2.situation;
    if(t2.categorie === 'demande_pro'){ d.situation = 'vide'; d.client = 'agence'; d.diag.volume = 0; d.diag.evac = 100; }
    d.formule = t2.formule || suggest(d); d.formuleAuto = !t2.formule; d.diag.evac = d.formule==='P' ? 100 : S.evacDefaut[d.formule];
    d.contact.nom = c.de_nom || ''; d.contact.email = c.de; if(i.tel) d.contact.tel = i.tel;
    if(i.ville && COORDS.hasOwnProperty(i.ville)){ d.ville = i.ville; d.km = kmEst(siegePt(), COORDS[i.ville]) || d.km; }
    if(i.typeLog) d.typeLog = i.typeLog;
    if(i.taille != null){ d.taille = i.taille; d.surface = S.surfDefaut[i.taille]; }
    if(i.surface) d.surface = i.surface;
    if(i.etage != null) d.etage = i.etage;
    if(i.ascenseur != null) d.ascenseur = i.ascenseur;
    if(i.urgence) d.urgence = true;
    applyVol(d);
    d.notes = `Demande reçue par e-mail le ${new Date(c.recu_le).toLocaleDateString('fr-FR')} : « ${c.sujet || ''} »${i.echeance ? `\nÉchéance mentionnée : ${i.echeance}` : ''}${i.annexes ? '\nAnnexes mentionnées (cave, garage ou jardin) : à vérifier au diagnostic.' : ''}\n\n${(c.texte||'').slice(0, 1500)}`;
    persist(d);
    await majCourriel(c, { dossier_id: d.id, statut: 'range' });
    view = { name:'dossier', id: d.id }; tab = 'appel'; render(); window.scrollTo(0,0); showToast('Dossier créé à partir du courriel : complétez le premier appel.');
  };
}


/* Réponse à un courriel depuis l'appli (copie cachée vers Gmail, trace dans le dossier). */
function signatureReponse(c){
  const so = {...DEFAULTS.soc, ...(S.soc||{})}, pro = String(c.adresse||'').startsWith('pro@');
  const nom = so.signataire && !/\[/.test(so.signataire) ? so.signataire.replace(/,.*$/, '') : '';
  return `Bien cordialement,\n${nom ? nom + '\n' : ''}${pro ? 'Fil Bleu Pro' : 'Maison Fil Bleu'}`;
}
function editeurReponse(c){
  const sujet = /^re\s*:/i.test(c.sujet||'') ? c.sujet : 'Re: ' + (c.sujet || '');
  return `<div class="reponse" data-rep="${esc(c.id)}" hidden>
    <label>À<input value="${esc(c.de_nom ? `${c.de_nom} <${c.de}>` : c.de)}" disabled></label>
    <label>Objet<input data-rep-sujet value="${esc(sujet)}" maxlength="300"></label>
    <label>Votre réponse<textarea data-rep-texte rows="9">Bonjour,\n\n\n\n${esc(signatureReponse(c))}</textarea></label>
    <p class="small muted" style="margin:0">Envoyée depuis ${esc(String(c.adresse||'').startsWith('pro@') ? 'pro@' : 'contact@')}maisonfilbleu.fr, dans la même conversation, avec le message d'origine en dessous. Une copie est gardée dans votre Gmail.</p>
    <div class="row"><button class="btn" type="button" data-rep-envoyer>Envoyer la réponse</button><button class="btn ghost" type="button" data-rep-annuler>Annuler</button></div>
  </div>`;
}
function lierReponses(racine, liste, apres){
  racine.querySelectorAll('[data-rep-ouvrir]').forEach(b => b.onclick = () => {
    const box = racine.querySelector(`[data-rep="${CSS.escape(b.dataset.repOuvrir)}"]`); if(!box) return;
    box.hidden = false; b.hidden = true;
    const ta = box.querySelector('[data-rep-texte]'); ta.focus(); ta.setSelectionRange(9, 9);
  });
  racine.querySelectorAll('[data-rep]').forEach(box => {
    const c = liste.find(x => x.id === box.dataset.rep); if(!c) return;
    box.querySelector('[data-rep-annuler]').onclick = () => { box.hidden = true; const o = racine.querySelector(`[data-rep-ouvrir="${CSS.escape(c.id)}"]`); if(o) o.hidden = false; };
    box.querySelector('[data-rep-envoyer]').onclick = async (ev) => {
      const sujet = box.querySelector('[data-rep-sujet]').value.trim(), texte = box.querySelector('[data-rep-texte]').value.trim();
      if(!sujet || texte.replace(/\s+/g,' ').length < 20){ showToast('Écrivez votre réponse.'); return; }
      if(!navigator.onLine){ showToast('Pas de réseau : la réponse partira quand vous serez connecté.'); return; }
      ev.target.disabled = true; ev.target.textContent = 'Envoi…';
      let rep, corps = {};
      try{
        const { data: { session } } = await sb.auth.getSession();
        rep = await fetch('/api/repondre', { method:'POST', headers:{ 'content-type':'application/json', authorization:`Bearer ${session?.access_token||''}` }, body: JSON.stringify({ courriel_id: c.id, sujet, texte }) });
        corps = await rep.json().catch(() => ({}));
      }catch(err){ rep = null; }
      if(!rep?.ok){ ev.target.disabled = false; ev.target.textContent = 'Envoyer la réponse'; showToast(corps.erreur || "Pas de réseau : la réponse n'est pas partie."); return; }
      c.statut = 'traite'; tb.courriels = (tb.courriels||[]).filter(x => x.id !== c.id); majBadgeCourriels();
      showToast(corps.copie ? 'Réponse envoyée (copie dans votre Gmail).' : 'Réponse envoyée.'); apres();
    };
  });
}

/* Onglet « Courriels » de la fiche dossier (interne, jamais visible par la famille). */
function htmlCourrielsDossier(d){
  return `<div id="courriels-dossier"><div class="card"><p class="muted" style="margin:0">${navigator.onLine ? 'Chargement des courriels…' : 'Hors ligne : les courriels se consultent avec du réseau.'}</p></div></div>`;
}
async function chargerCourrielsDossier(d){
  const box = $('#courriels-dossier'); if(!box || !navigator.onLine) return;
  const { data, error } = await sb.from('courriels').select('*').eq('dossier_id', d.id).order('recu_le', { ascending:false });
  if(!$('#courriels-dossier')) return;
  if(error){ box.innerHTML = `<div class="card"><p style="margin:0">${esc(error.message)}</p></div>`; return; }
  box.innerHTML = (data||[]).length ? `<div class="pan"><div class="pan-h"><h3>Courriels du dossier</h3><span class="small muted">interne · ${data.length} message${data.length>1?'s':''}</span></div>
    ${data.map(c => `<details class="phase-b"><summary style="padding:12px 18px;cursor:pointer;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap"><span class="muted small" style="min-width:120px">${esc(quandFr(c.recu_le))}</span>${c.sens==='envoye' ? '<span class="badge cours">Envoyé</span>' : '<span class="badge">Reçu</span>'}<b>${esc(c.sujet || '(sans objet)')}</b><span class="small muted">${c.sens==='envoye' ? 'à ' + esc(c.destinataires||'') : esc(c.de_nom || c.de)}</span></summary>
      <div class="pan-c"><pre class="quote">${esc(c.texte||'')}</pre>${(c.pieces||[]).length ? `<p class="small muted" style="margin:0">Pièces jointes (dans Gmail) : ${c.pieces.map(p => esc(p.nom)).join(', ')}</p>` : ''}
      ${c.sens==='envoye' ? '' : `<div class="row"><button class="btn petit" type="button" data-rep-ouvrir="${esc(c.id)}">Répondre</button><button class="lien" type="button" data-co-detacher="${esc(c.id)}">Retirer de ce dossier</button></div>${editeurReponse(c)}`}</div></details>`).join('')}</div>`
    : `<div class="card"><p class="muted" style="margin:0">Aucun courriel pour ce dossier. Les e-mails reçus de ${esc(d.contact.email || 'la famille')} sur contact@ y sont rangés automatiquement.</p></div>`;
  lierReponses(box, data || [], () => chargerCourrielsDossier(d));
  box.querySelectorAll('[data-co-detacher]').forEach(b => b.onclick = async () => {
    const { error: e2 } = await sb.from('courriels').update({ dossier_id: null, statut: 'nouveau' }).eq('id', b.dataset.coDetacher);
    if(e2){ showToast(e2.message); return; }
    tb.charge = false; chargerCourrielsDossier(d); showToast('Courriel remis dans la boîte « À traiter ».');
  });
}

/* ---------- Liste des dossiers ---------- */
function renderList(){
  const q = (view.q||'').toLowerCase(), filtre = view.filtre || '';
  const tous = Object.values(dossiers).sort((a,b)=> (b.created||'').localeCompare(a.created||''));
  const trouves = tous.filter(d => !q || [d.contact.nom, d.ville, d.beneficiaire, d.contact.tel, d.contact.email, devisNo(d)].join(' ').toLowerCase().includes(q));
  const arr = trouves.filter(d => !filtre || d.statut===filtre);
  const compte = s => trouves.filter(d => d.statut===s).length;
  app.innerHTML = `<header class="pg-h"><div><span class="sur">${tous.length} dossier${tous.length>1?'s':''}</span><h1>Dossiers</h1></div>
    <div class="row"><label class="cherche" aria-label="Rechercher">${'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'}<input id="q" type="search" placeholder="Nom, ville, téléphone, n° de devis…" value="${esc(view.q||'')}"></label>
    <button class="btn ghost" id="b-net" type="button">Devis nettoyage Pro</button><button class="btn" id="b-new" type="button">Nouvel appel</button></div></header>
  <div class="pipeline" role="group" aria-label="Filtrer par statut">${[['', 'Tous', trouves.length], ...STATUTS.map(s => [s, s==='Appel' ? 'À rappeler' : s, compte(s)])].map(([v,l,n]) => `<button type="button" data-filtre="${esc(v)}" aria-pressed="${v===filtre}"><span>${esc(l)}</span><b>${n}</b></button>`).join('')}</div>
  <div class="vue-liste">
  ${arr.length ? `<div class="pan tab"><table><thead><tr><th>N° de devis</th><th>Client</th><th>Formule</th><th>Ville</th><th>Créé le</th><th class="dr">Montant</th><th>Statut</th></tr></thead>
    <tbody>${arr.map(d => { const c = calc(d); return `<tr class="clic" data-id="${d.id}" tabindex="0"><td class="muted">${esc(devisNo(d))}</td><td><b>${esc(d.contact.nom||'Sans nom')}</b>${d.beneficiaire ? `<br><span class="small muted">pour ${esc(d.beneficiaire)}</span>` : ''}</td><td>${esc(FORM[d.formule])}</td><td>${esc(d.ville||'')}</td><td>${esc(dateCourte(d.created))}</td><td class="dr">${eur(c.ttc)}${d.formule==='P'&&d.client==='agence'?' HT':''}</td><td><span class="badge ${STATUT_CL[d.statut]||''}">${esc(d.statut)}</span></td></tr>`; }).join('')}</tbody></table></div>
    <div class="cartes">${arr.map(d => `<button class="item" type="button" data-id="${d.id}"><div style="min-width:0"><div class="t">${esc(d.contact.nom||'Sans nom')}</div><div class="s">${esc(FORM[d.formule])} · ${esc(d.ville||'')} · ${esc(dateCourte(d.created))}</div></div><div style="text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="badge ${STATUT_CL[d.statut]||''}">${esc(d.statut)}</span><b>${eur(calc(d).ttc)}</b></div></button>`).join('')}</div>`
  : `<div class="card"><h3>${tous.length ? 'Aucun dossier ne correspond' : 'Aucun dossier pour l\'instant'}</h3><p class="muted small" style="margin:0">${tous.length ? 'Changez la recherche ou le filtre.' : 'Touchez « Nouvel appel » dès qu\'un client vous appelle : vous saisissez la situation pendant la conversation et l\'appli vous donne la formule et une première estimation.'}</p></div>`}
  </div>`;
  $('#b-new').onclick = startNew;
  $('#b-net').onclick = startNettoyage;
  $('#q').oninput = e => { view.q = e.target.value; const pos = e.target.selectionStart; renderList(); const i=$('#q'); i.focus(); i.setSelectionRange(pos,pos); };
  app.querySelectorAll('[data-filtre]').forEach(b => b.onclick = () => { view.filtre = b.dataset.filtre; renderList(); });
  app.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => ouvrirDossier(b.dataset.id); b.onkeydown = e => { if(e.key==='Enter') ouvrirDossier(b.dataset.id); }; });
}

/* ---------- Carnet d'adresses (organismes réutilisés pour les démarches et les courriers) ---------- */
const CAT_CARNET = { energie:'Énergie', eau:'Eau', internet:'Internet et téléphone', assurance:'Assurance', banque:'Banque', administration:'Administration', mairie:'Mairie', syndic:'Syndic', notaire:'Notaire', agence:'Agence immobilière', residence:'Résidence ou EHPAD', association:'Association', ressourcerie:'Ressourcerie', decheterie:'Déchèterie', demenageur:'Déménageur', stockage:'Box de stockage', artisan:'Artisan', autre:'Autre' };
const K_CARNET = 'fb-cache-carnet';
let carnet = localGet(K_CARNET) || [];
async function chargerCarnet(){
  const { data, error } = await sb.from('carnet').select('*').order('nom');
  if(!error && data){ carnet = data; localSet(K_CARNET, carnet); }
}
const ficheCarnet = id => carnet.find(c => c.id === id);
const adresseCarnet = c => [c.service, c.adresse, [c.code_postal, c.ville].filter(Boolean).join(' ')].filter(Boolean).join('\n');

function renderCarnet(){
  const q = (view.q||'').toLowerCase(), cat = view.cat || '';
  const trouves = carnet.filter(c => !q || [c.nom, c.service, c.ville, c.notes, CAT_CARNET[c.categorie]].join(' ').toLowerCase().includes(q));
  const liste = trouves.filter(c => !cat || c.categorie===cat).sort((a,b) => a.nom.localeCompare(b.nom, 'fr'));
  const cats = Object.keys(CAT_CARNET).filter(k => trouves.some(c => c.categorie===k));
  const ed = view.edit === 'nouveau' ? { categorie: cat || 'energie', nom:'', service:'', adresse:'', code_postal:'', ville:'', telephone:'', email:'', site:'', notes:'' } : ficheCarnet(view.edit);
  const champ = (k, l, ph = '', type = 'text') => `<label>${esc(l)}<input data-cf="${k}" type="${type}" value="${esc(ed?.[k]||'')}" placeholder="${esc(ph)}"></label>`;
  app.innerHTML = `<header class="pg-h"><div><span class="sur">${carnet.length} fiche${carnet.length>1?'s':''}</span><h1>Carnet d'adresses</h1></div>
    <div class="row"><label class="cherche" aria-label="Rechercher">${'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'}<input id="q-carnet" type="search" placeholder="Organisme, ville, service…" value="${esc(view.q||'')}"></label>
    <button class="btn" type="button" id="cf-nouveau">Ajouter une fiche</button></div></header>
  ${ed ? `<div class="card"><h3>${view.edit==='nouveau' ? 'Nouvelle fiche' : 'Modifier : ' + esc(ed.nom)}</h3>
    <div class="grid2"><label>Catégorie<select data-cf="categorie">${Object.entries(CAT_CARNET).map(([k,l]) => `<option value="${k}" ${ed.categorie===k?'selected':''}>${esc(l)}</option>`).join('')}</select></label>${champ('nom','Nom','Ex. : Mairie de Marseille 6e-8e')}</div>
    <div class="grid2">${champ('service','Service ou destinataire','Ex. : Service résiliation')}${champ('adresse','Adresse','N°, rue, boîte postale')}</div>
    <div class="grid2" style="grid-template-columns:1fr 2fr">${champ('code_postal','Code postal')}${champ('ville','Ville')}</div>
    <div class="grid2">${champ('telephone','Téléphone','', 'tel')}${champ('email','E-mail','', 'email')}</div>
    ${champ('site','Site internet','Ex. : edf.fr')}
    <label>Notes<textarea data-cf="notes" placeholder="Pièces à joindre, délais, contact précis…">${esc(ed.notes||'')}</textarea></label>
    <div class="row"><button class="btn" type="button" id="cf-enreg">Enregistrer</button><button class="btn ghost" type="button" id="cf-annul">Annuler</button>${view.edit!=='nouveau' ? '<button class="btn danger" type="button" id="cf-suppr" style="margin-left:auto">Supprimer la fiche</button>' : ''}</div>
  </div>` : ''}
  <div class="pipeline" role="group" aria-label="Filtrer par catégorie"><button type="button" data-cat="" aria-pressed="${!cat}"><span>Toutes</span><b>${trouves.length}</b></button>${cats.map(k => `<button type="button" data-cat="${k}" aria-pressed="${cat===k}"><span>${esc(CAT_CARNET[k])}</span><b>${trouves.filter(c => c.categorie===k).length}</b></button>`).join('')}</div>
  ${!navigator.onLine ? '<div class="suggest warn">Hors ligne : le carnet se consulte, mais les modifications attendront le retour du réseau.</div>' : ''}
  ${liste.length ? `<div class="pan tab"><table><thead><tr><th>Organisme</th><th>Catégorie</th><th>Adresse</th><th>Contact</th><th></th></tr></thead><tbody>
    ${liste.map(c => `<tr class="clic" data-cf-edit="${esc(c.id)}"><td><b>${esc(c.nom)}</b>${c.service ? `<br><span class="small muted">${esc(c.service)}</span>` : ''}</td><td><span class="badge">${esc(CAT_CARNET[c.categorie]||'Autre')}</span></td>
      <td class="small">${c.adresse || c.ville ? esc([c.adresse, [c.code_postal, c.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')) : '<span class="warn">Adresse à compléter</span>'}</td>
      <td class="small">${[c.telephone, c.email].filter(Boolean).map(esc).join('<br>') || (c.site ? esc(c.site) : '—')}</td><td class="dr"><span class="lien">Modifier</span></td></tr>`).join('')}
  </tbody></table></div>` : `<div class="card"><p class="muted" style="margin:0">${carnet.length ? 'Aucune fiche ne correspond.' : (navigator.onLine ? 'Chargement du carnet…' : 'Carnet indisponible hors ligne.')}</p></div>`}`;
  if(!carnet.length && navigator.onLine) chargerCarnet().then(() => { if(view.name==='carnet' && carnet.length) renderCarnet(); });
  $('#q-carnet').oninput = e => { view.q = e.target.value; const pos = e.target.selectionStart; renderCarnet(); const i = $('#q-carnet'); i.focus(); i.setSelectionRange(pos,pos); };
  $('#cf-nouveau').onclick = () => { view.edit = 'nouveau'; renderCarnet(); window.scrollTo(0,0); app.querySelector('[data-cf="nom"]')?.focus(); };
  app.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { view.cat = b.dataset.cat; renderCarnet(); });
  app.querySelectorAll('[data-cf-edit]').forEach(r => r.onclick = () => { view.edit = r.dataset.cfEdit; renderCarnet(); window.scrollTo(0,0); });
  const an = $('#cf-annul'); if(an) an.onclick = () => { view.edit = null; renderCarnet(); };
  const en = $('#cf-enreg'); if(en) en.onclick = async () => {
    const v = {}; app.querySelectorAll('[data-cf]').forEach(el => v[el.dataset.cf] = el.value.trim());
    if(!v.nom){ showToast('Indiquez le nom.'); return; }
    if(!navigator.onLine){ showToast('Pas de réseau : réessayez plus tard.'); return; }
    en.disabled = true;
    const r = view.edit === 'nouveau' ? await sb.from('carnet').insert(v).select().single() : await sb.from('carnet').update(v).eq('id', view.edit).select().single();
    en.disabled = false;
    if(r.error){ showToast('Non enregistré : ' + r.error.message); return; }
    carnet = [...carnet.filter(c => c.id !== r.data.id), r.data]; localSet(K_CARNET, carnet);
    const dr = view.retour && dossiers[view.retour];
    if(dr && view.edit === 'nouveau'){ dr.organismes = [...(dr.organismes||[]), { id: r.data.id, nom: r.data.nom, ref: '' }]; persist(dr); view = { name:'dossier', id: dr.id }; tab = 'appel'; render(); showToast('Fiche créée et ajoutée au dossier.'); return; }
    view.edit = null; renderCarnet(); showToast('Fiche enregistrée.');
  };
  const sp = $('#cf-suppr'); if(sp) sp.onclick = async () => {
    if(!sp.dataset.ok){ sp.dataset.ok = '1'; sp.textContent = 'Toucher encore pour supprimer'; return; }
    const { error } = await sb.from('carnet').delete().eq('id', view.edit);
    if(error){ showToast(error.message); return; }
    carnet = carnet.filter(c => c.id !== view.edit); localSet(K_CARNET, carnet); view.edit = null; renderCarnet(); showToast('Fiche supprimée.');
  };
}

/* Organismes d'un dossier : fiches du carnet + référence du contrat (n° client, PDL, police…). */
function carteOrganismes(d){
  const org = d.organismes || [];
  return `<div class="card"><h3>Organismes et démarches du dossier</h3>
    <p class="small muted" style="margin:0">Fournisseurs, assureurs, mairie, syndic, notaire… choisis dans le carnet d'adresses. La référence (n° client, n° de contrat, PDL) servira aux courriers types.</p>
    ${org.length ? `<table>${org.map((o, i) => { const c = ficheCarnet(o.id); return `<tr><td><b>${esc(c?.nom || o.nom || 'Fiche supprimée du carnet')}</b><br><span class="small muted">${esc(CAT_CARNET[c?.categorie]||'')}${c && !c.adresse ? ' · <span class="warn">adresse à compléter dans le carnet</span>' : ''}</span></td>
      <td style="width:42%"><input data-org="${i}" data-champ="ref" value="${esc(o.ref||'')}" placeholder="N° client, de contrat, PDL…" aria-label="Référence"></td><td class="n"><button type="button" class="suppr" data-org-suppr="${i}" aria-label="Retirer">×</button></td></tr>`; }).join('')}</table>` : ''}
    <div class="row"><input id="org-choix" list="org-liste" placeholder="${carnet.length ? 'Tapez un nom : EDF, Orange, mairie…' : 'Carnet en cours de chargement…'}" style="flex:1;min-width:200px"><datalist id="org-liste">${carnet.map(c => `<option value="${esc(c.nom)}">${esc(CAT_CARNET[c.categorie]||'')}</option>`).join('')}</datalist>
      <button class="btn ghost" type="button" id="org-ajout">Ajouter au dossier</button></div>
    <button class="lien" type="button" id="org-carnet" style="align-self:flex-start">Ouvrir le carnet d'adresses</button>
  </div>`;
}
function bindOrganismes(d){
  app.querySelectorAll('[data-org]').forEach(el => el.addEventListener('input', () => { d.organismes[+el.dataset.org][el.dataset.champ] = el.value.trim(); persist(d); }));
  app.querySelectorAll('[data-org-suppr]').forEach(b => b.onclick = () => { d.organismes.splice(+b.dataset.orgSuppr, 1); persist(d); rerender(); });
  const aj = $('#org-ajout'); if(aj) aj.onclick = () => {
    const nom = $('#org-choix').value.trim(); if(!nom) return;
    const c = carnet.find(x => x.nom.toLowerCase() === nom.toLowerCase());
    if(!c){ view = { name:'carnet', edit:'nouveau', retour: d.id }; render(); const i = app.querySelector('[data-cf="nom"]'); if(i){ i.value = nom; i.focus(); } showToast('Créez la fiche, puis revenez au dossier.'); return; }
    if((d.organismes||[]).some(o => o.id === c.id)){ showToast('Déjà dans le dossier.'); return; }
    d.organismes = [...(d.organismes||[]), { id: c.id, nom: c.nom, ref: '' }]; persist(d); const y = window.scrollY; render(); window.scrollTo(0,y);
  };
  const oc = $('#org-carnet'); if(oc) oc.onclick = () => { view = { name:'carnet' }; render(); window.scrollTo(0,0); };
}

/* ---------- Documents types (courriers et attestations qui se remplissent seuls) ---------- */
const ctxCourriers = { makePdf: (...a) => makePdf(...a), wrap: (...a) => wrap(...a), soc: () => ({...DEFAULTS.soc, ...(S.soc||{})}), ficheCarnet: id => ficheCarnet(id), adresseCarnet: c => adresseCarnet(c),
  dateEtape: (d, cle) => espaces[d.id]?.ligne?.etapes?.find(x => x.cle===cle)?.date || '' };
function valeursDoc(d, doc){
  const def = champsParDefaut(doc, d, ctxCourriers), saisi = d.courriers?.[doc.cle] || {};
  return { champs: def, v: Object.fromEntries(def.map(([k,,val]) => [k, saisi[k] ?? val])), modifie: Object.keys(saisi).some(k => !k.startsWith('_')) };
}
function htmlCourriers(d){
  const docs = documentsDuDossier(d, ctxCourriers);
  const sel = docs.find(x => x.cle===view.doc) || (view.doc==='aucune-resiliation' ? null : docs[0]);
  const groupes = [...new Set(docs.map(x => x.groupe))];
  const nbResil = docs.filter(x => x.type==='resiliation').length;
  let editeur = '';
  if(sel){
    const { champs, v, modifie } = valeursDoc(d, sel), fait = d.courriers?.[sel.cle]?._fait;
    editeur = `<div class="card"><h3>${esc(sel.titre)}</h3>
      <p class="small muted" style="margin:0">${esc(sel.desc)} Les champs entre crochets sont à compléter ; tout le texte reste modifiable.</p>
      ${champs.map(([k, l, , multi]) => `<label>${esc(l)}${multi ? `<textarea data-cr="${k}" rows="${k==='corps' ? 12 : 4}">${esc(v[k])}</textarea>` : `<input data-cr="${k}" value="${esc(v[k])}">`}</label>`).join('')}
      <div class="row"><button class="btn" type="button" id="cr-pdf">Télécharger le PDF</button>${sel.publiable ? `<button class="btn ghost" type="button" id="cr-publier">Déposer dans l'espace client</button>` : ''}${modifie ? '<button class="btn ghost" type="button" id="cr-reset">Revenir au texte d\'origine</button>' : ''}</div>
      ${fait ? `<p class="small good" style="margin:0">PDF préparé le ${esc(new Date(fait).toLocaleDateString('fr-FR'))}.</p>` : ''}
    </div>`;
  }
  return `<div class="grille docs">
    <div class="col">
      ${groupes.map(g => `<div class="pan"><div class="pan-h"><h3>${esc(g)}</h3></div><ul class="liste">${docs.filter(x => x.groupe===g).map(x => `<li style="cursor:pointer;${sel && x.cle===sel.cle ? 'background:#EEF3F9' : ''}" data-doc="${esc(x.cle)}"><div><b>${esc(x.titre)}</b><span>${d.courriers?.[x.cle]?._fait ? 'PDF préparé le ' + esc(new Date(d.courriers[x.cle]._fait).toLocaleDateString('fr-FR')) : esc(x.desc)}</span></div></li>`).join('')}</ul></div>`).join('')}
      ${!nbResil ? `<div class="suggest">Pour préparer les lettres de résiliation, ajoutez les fournisseurs (énergie, eau, internet, assurance) dans « Organismes et démarches », onglet Appel et logement. <button class="lien" type="button" data-aller-appel2>Y aller</button></div>` : ''}
    </div>
    <div class="col">${editeur || '<div class="card"><p class="muted" style="margin:0">Aucun organisme à résilier pour l\'instant : ajoutez-les dans l\'onglet Appel et logement.</p></div>'}</div>
  </div>`;
}
function bindCourriers(d){
  const docs = documentsDuDossier(d, ctxCourriers);
  const sel = docs.find(x => x.cle===view.doc) || (view.doc==='aucune-resiliation' ? null : docs[0]);
  app.querySelectorAll('[data-doc]').forEach(li => li.onclick = () => { view.doc = li.dataset.doc; render(); });
  const al = app.querySelector('[data-aller-appel2]'); if(al) al.onclick = () => { tab = 'appel'; render(); window.scrollTo(0,0); };
  if(!sel) return;
  d.courriers = d.courriers || {};
  app.querySelectorAll('[data-cr]').forEach(el => el.addEventListener('input', () => { d.courriers[sel.cle] = {...(d.courriers[sel.cle]||{}), [el.dataset.cr]: el.value}; persist(d); }));
  const lire = () => valeursDoc(d, sel).v;
  const nomFichier = () => `${sel.titre.replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim()} - ${(d.contact.nom||'dossier').replace(/[^\p{L}\p{N} ]+/gu, '')}.pdf`;
  $('#cr-pdf').onclick = () => {
    const blob = dessinerDocument(sel, lire(), ctxCourriers, d);
    const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nomFichier(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    d.courriers[sel.cle] = {...(d.courriers[sel.cle]||{}), _fait: new Date().toISOString()}; persist(d); showToast('PDF téléchargé.');
  };
  const pb = $('#cr-publier'); if(pb) pb.onclick = async () => {
    if(!navigator.onLine){ showToast('Pas de réseau : réessayez plus tard.'); return; }
    pb.disabled = true;
    try{
      const blob = dessinerDocument(sel, lire(), ctxCourriers, d);
      const chemin = `${d.id}/${sel.type}-${Date.now().toString(36)}.pdf`;
      const up = await sb.storage.from('documents').upload(chemin, blob, { contentType: 'application/pdf' }); if(up.error) throw up.error;
      const { error } = await sb.from('documents').insert({ dossier_id: d.id, chemin, type: sel.type==='compteurs' ? 'etat_des_lieux' : 'autre', nom: sel.titre, date: new Date().toISOString() });
      if(error) throw error;
      delete espaces[d.id]; showToast('Document déposé dans l\'espace client.');
    }catch(err){ showToast('Dépôt impossible : ' + (err.message||'')); }
    pb.disabled = false;
  };
  const rs = $('#cr-reset'); if(rs) rs.onclick = () => { const f = d.courriers[sel.cle]?._fait; d.courriers[sel.cle] = f ? { _fait: f } : {}; if(!f) delete d.courriers[sel.cle]; persist(d); render(); };
}


/* ---------- Prévenir la famille par e-mail (message relu et validé avant l'envoi) ---------- */
const ICONE_MAIL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
const signatureMail = d => `Bien cordialement,\n${espaces[d.id]?.ligne?.interlocuteur?.nom || "L'équipe " + (d.formule==='P' ? 'Fil Bleu Pro' : 'Maison Fil Bleu')}`;
function messageType(d, quoi){
  const sig = signatureMail(d), nomEt = cle => (PHASES.find(([k]) => k===cle)||[])[1] || '';
  if(quoi.type==='etape'){
    const x = quoi.etape, nom = nomEt(x.cle), dt = x.date ? dateFr(new Date(x.date+'T12:00:00')) : '';
    const phrase = x.etat==='termine' ? `L'étape « ${nom} » de votre accompagnement est terminée.` : x.etat==='en_cours' ? `L'étape « ${nom} » de votre accompagnement a commencé${dt ? ` ; elle est prévue jusqu'au ${dt}` : ''}.` : `L'étape « ${nom} » de votre accompagnement est prévue${dt ? ` le ${dt}` : ' prochainement'}.`;
    return { sujet: `${nom} : ${x.etat==='termine' ? "c'est terminé" : x.etat==='en_cours' ? "c'est commencé" : 'à venir'}`, texte: `Bonjour,\n\n${phrase}${x.message ? '\n\n' + x.message : ''}\n\nVous retrouvez tout le détail dans votre espace client.\n\n${sig}` };
  }
  if(quoi.type==='tache'){
    const t = quoi.tache, dt = t.date ? dateFr(new Date(t.date+'T12:00:00')) : '';
    if(t.cote==='famille' && t.etat!=='fait') return { sujet: `Nous avons besoin de vous : ${t.libelle}`, texte: `Bonjour,\n\nPour avancer, nous avons besoin de vous : « ${t.libelle} »${dt ? `, si possible avant le ${dt}` : ''}.\n\nN'hésitez pas à nous appeler ou à répondre à cet e-mail si vous avez une question.\n\n${sig}` };
    return { sujet: `Avancement : ${t.libelle}`, texte: `Bonjour,\n\n${t.etat==='fait' ? `C'est fait : « ${t.libelle} ».` : `Nous nous occupons de : « ${t.libelle} »${dt ? `, prévu le ${dt}` : ''}.`}\n\nVous suivez l'avancement de votre accompagnement dans votre espace client.\n\n${sig}` };
  }
  if(quoi.type==='rdv'){
    const p = quoi.prochain, dt = p.date ? new Date(p.date+'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' }) : '';
    return { sujet: `Prochain rendez-vous : ${p.titre || 'intervention'}, ${dt}`, texte: `Bonjour,\n\nNotre prochain rendez-vous : ${p.titre || 'intervention'}, le ${dt}${p.horaire ? `, ${p.horaire}` : ''}.${p.detail ? '\n\n' + p.detail : ''}\n\nSi cette date ne vous convient pas, appelez-nous ou répondez à cet e-mail.\n\n${sig}` };
  }
  if(quoi.type==='journal') return { sujet: quoi.titre, texte: `Bonjour,\n\n${quoi.texte || quoi.titre}\n\n${sig}` };
  if(quoi.type==='question') return { sujet: 'Une question pour vous sur votre accompagnement', texte: `Bonjour,\n\nNous avons besoin de votre avis : ${quoi.question}${(quoi.choix||[]).length ? `\n\nRéponses possibles : ${quoi.choix.join(', ')}.` : ''}\n\nVous pouvez répondre directement dans votre espace client, rubrique « À faire ». Votre réponse est datée et visible par vos proches.\n\n${sig}` };
  if(quoi.type==='listing') return { sujet: 'Le listing des objets conservés est prêt à signer', texte: `Bonjour,\n\nLe listing des ${quoi.nb} objets mis de côté pour vous est prêt, avec leurs photos. Merci de le relire et de le signer dans votre espace client : rien ne part du logement avant votre signature.\n\nEn cas d'oubli ou d'erreur, appelez-nous avant de signer.\n\n${sig}` };
  return { sujet: '', texte: `Bonjour,\n\n\n\n${sig}` };
}
async function prevenirFamille(d, cle, quoi){
  if(!navigator.onLine){ showToast('Pas de réseau : l\'e-mail partira quand vous serez connecté.'); return; }
  let acces = espaces[d.id]?.acces;
  if(!acces){ const r = await sb.from('dossier_acces').select('email, role').eq('dossier_id', d.id); acces = r.data || []; }
  const adresses = [...new Map([...acces.map(a => [a.email, a.role==='titulaire' ? 'Titulaire' : 'Proche']), ...(d.contact.email ? [[d.contact.email.toLowerCase(), 'Contact du dossier']] : [])]).entries()];
  if(!adresses.length){ showToast('Aucune adresse e-mail : ajoutez celle du contact (onglet Appel) ou un accès (onglet Espace client).'); return; }
  const { sujet, texte } = messageType(d, quoi), deja = d.envois?.[cle];
  const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-label','Prévenir la famille');
  m.innerHTML = `<div class="sheet"><h2>Prévenir la famille</h2>
    ${deja ? `<div class="suggest warn">Un e-mail a déjà été envoyé pour cela le ${esc(new Date(deja).toLocaleString('fr-FR', { dateStyle:'long', timeStyle:'short' }))}.</div>` : ''}
    <b class="small">Destinataires</b>
    ${adresses.map(([e, r]) => `<label class="row"><input type="checkbox" data-dest="${esc(e)}" checked> ${esc(e)} <span class="muted small">· ${esc(r)}</span></label>`).join('')}
    <label>Objet<input id="pv-sujet" value="${esc(sujet)}" maxlength="200"></label>
    <label>Message<textarea id="pv-texte" rows="11">${esc(texte)}</textarea></label>
    <p class="small muted" style="margin:0">Un bouton « Ouvrir mon espace client » est ajouté sous le message. La famille peut répondre directement à l'e-mail.</p>
    <div class="row"><button class="btn ghost" type="button" id="pv-annul" style="flex:1">Annuler</button><button class="btn" type="button" id="pv-envoyer" style="flex:2">Envoyer l'e-mail</button></div></div>`;
  document.body.appendChild(m);
  $('#pv-annul', m).onclick = () => m.remove();
  $('#pv-envoyer', m).onclick = async (ev) => {
    const destinataires = [...m.querySelectorAll('[data-dest]:checked')].map(x => x.dataset.dest);
    const s2 = $('#pv-sujet', m).value.trim(), t2 = $('#pv-texte', m).value.trim();
    if(!destinataires.length || !s2 || !t2){ showToast('Choisissez au moins un destinataire et écrivez le message.'); return; }
    ev.target.disabled = true; ev.target.textContent = 'Envoi…';
    let rep, corps = {};
    try{
      const { data: { session } } = await sb.auth.getSession();
      rep = await fetch('/api/prevenir', { method:'POST', headers:{ 'content-type':'application/json', authorization:`Bearer ${session?.access_token||''}` }, body: JSON.stringify({ dossier_id: d.id, destinataires, sujet: s2, texte: t2 }) });
      corps = await rep.json().catch(() => ({}));
    }catch(err){ ev.target.disabled = false; ev.target.textContent = "Envoyer l'e-mail"; showToast("Pas de réseau : l'e-mail n'est pas parti."); return; }
    if(!rep.ok){ ev.target.disabled = false; ev.target.textContent = "Envoyer l'e-mail"; showToast(corps.erreur || "L'e-mail n'a pas pu partir."); return; }
    d.envois = {...(d.envois||{}), [cle]: new Date().toISOString()}; persist(d);
    m.remove(); showToast(`E-mail envoyé à ${corps.envoyes?.length || destinataires.length} personne${(corps.envoyes?.length || destinataires.length)>1?'s':''}.`); rerender();
  };
}
const boutonMail = (d, cle, attrs, libelle) => `<button type="button" class="${libelle ? 'btn ghost petit' : 'vis'} ${d.envois?.[cle] ? 'envoye' : ''}" ${attrs} title="${d.envois?.[cle] ? 'Famille prévenue le ' + esc(new Date(d.envois[cle]).toLocaleDateString('fr-FR')) : 'Prévenir la famille par e-mail'}" aria-label="Prévenir la famille par e-mail">${ICONE_MAIL}${libelle ? ' ' + libelle : ''}</button>`;

/* ---------- Parcours guidé : infos du premier appel, prochaine étape ---------- */
const ECHEANCES = ['Compromis ou vente', 'Entrée en résidence', 'Fin de bail', 'Rendez-vous chez le notaire', 'Déménagement', 'Autre'];
const SOURCES = ['Bouche-à-oreille', 'Notaire', 'Agence immobilière', 'Résidence ou EHPAD', 'Site internet', 'Recherche Google', 'Réseaux sociaux', 'Autre'];
function cartePremierAppel(d){
  const m = infosManquantes(d), pro = d.formule==='P', ech = d.echeance || {};
  return `<div class="card"><h3>Infos obligatoires du premier appel</h3>
    ${m.length ? `<div class="suggest warn"><b>${m.length} info${m.length>1?'s':''} à obtenir :</b> ${m.map(esc).join(' · ')}</div>` : '<div class="suggest good">Toutes les infos du premier appel sont recueillies.</div>'}
    <div class="grid2"><label>Échéance qui commande tout<input type="date" data-f="echeance.date" value="${esc(ech.date||'')}"></label>
      <label>Nature de l'échéance<select data-f="echeance.nature"><option value="">Choisir…</option>${ECHEANCES.map(x => `<option ${ech.nature===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label></div>
    ${pro ? '' : `<label>Qui décide et qui signe<input data-f="decideur" value="${esc(d.decideur||'')}" placeholder="${d.formule==='S' ? 'Ex. : les 3 héritiers, Claire signe pour tous' : 'Ex. : la personne elle-même, avec sa fille'}"></label>`}
    ${d.formule==='S' ? `<label>Notaire de la succession<input data-f="notaire" value="${esc(d.notaire||'')}" placeholder="Nom, étude, commune"></label>` : ''}
    <label>Qui a les clés, comment on accède au logement<input data-f="clesQui" value="${esc(d.clesQui||'')}" placeholder="Ex. : la fille (2 jeux), gardien"></label>
    <div class="grid2"><label>Rendez-vous de diagnostic<input type="datetime-local" data-f="rdvDiag" value="${esc(d.rdvDiag||'')}"></label>
      ${pro ? '' : `<label>Comment nous a-t-il connus<select data-f="source"><option value="">Choisir…</option>${SOURCES.map(x => `<option ${d.source===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`}</div>
  </div>`;
}
function bandeauProchaine(d, e){
  const m = infosManquantes(d);
  const t = e?.ligne ? prochaineTache(e.ligne.taches||[]) : null;
  const nomPhase = t ? (PHASES.find(([k]) => k===t.phase)||[])[1] : '';
  if(!t && !m.length) return '';
  return `<div class="prochaine">${t ? `<span class="sur" style="margin:0">Prochaine étape</span><b>${esc(t.libelle)}</b><span class="muted small">${esc(nomPhase)}${t.oblig ? ' · obligatoire' : ''}${t.cote==='famille' ? ' · à faire par la famille' : ''}</span><button class="lien" type="button" data-aller-prepa>Voir le parcours</button>` : ''}
    ${m.length ? `<button class="badge attente" type="button" data-aller-appel style="cursor:pointer">${m.length} info${m.length>1?'s':''} du premier appel à obtenir</button>` : ''}</div>`;
}

/* ---------- Fiche dossier : en-tête, étapes, onglets ---------- */
const ONGLETS = [['synthese','Synthèse'],['appel','Appel et logement'],['diag','Sur place'],['devis','Devis'],['prepa','Préparation'],['courriers','Documents types'],['journal','Journal et décisions'],['courriels','Courriels'],['objets','Objets conservés'],['bons','Interventions'],['suivi','Suivi et paiement'],['espace','Espace client']];
const ONGLETS_ESPACE = ['synthese','prepa','journal','objets','espace'];
function enteteDossier(d, c){
  const e = espaces[d.id]?.ligne ? espaces[d.id] : null;
  const etapes = e?.ligne?.etapes?.length ? e.ligne.etapes : etapesParDefaut(d);
  const nDec = e ? (e.decisions||[]).filter(x => x.statut==='attente').length : 0;
  const nObj = e ? (e.objets||[]).filter(x => !x.valide_le).length : 0;
  const tel = telLien(d.contact.tel);
  return `<div class="fiche-h">
    <div class="fil"><button type="button" id="fil-liste">Dossiers</button><span>${esc(devisNo(d))}</span></div>
    <div class="fiche-t">
      <div class="fiche-n"><h1>${esc(d.contact.nom||'Nouveau dossier')}</h1>
        <p>${[SITU[d.situation], d.contact.adresse || d.adr?.label || d.ville, d.contact.tel].filter(Boolean).map(esc).join(' · ')}</p>
        <div class="chips"><span class="badge ${STATUT_CL[d.statut]||''}">${esc(d.statut)}</span><span class="badge">${esc(FORM[d.formule])}</span><span class="badge">${d.signature ? 'Devis signé · ' : ''}${eur(c.ttc)} ${d.formule==='P'&&d.client==='agence'?'HT':'TTC'}</span></div>
      </div>
      <div class="fiche-a">${tel ? `<a class="btn ghost" href="${tel}">Appeler</a>` : ''}<a class="btn ghost" href="/espace-client#apercu=${encodeURIComponent(d.id)}" target="_blank" rel="noopener">Voir comme la famille</a><button class="btn" type="button" id="b-vers-bons">Bon d'intervention</button></div>
    </div>
    <ol class="phases">${ETAPES.map(([cle, nom]) => { const x = etapes.find(y => y.cle===cle) || {}; const et = x.etat || 'a_venir'; return `<li class="${et}" title="${esc(ETATS.find(([k])=>k===et)?.[1]||'')}${x.date ? ' · '+esc(dateCourte(x.date)) : ''}"><span>${et==='termine' ? coche : ''}</span>${esc(nom)}</li>`; }).join('')}</ol>
    ${bandeauProchaine(d, e)}
    <div class="tabs" role="tablist">${ONGLETS.map(([k,l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${tab===k}">${l}${k==='journal' && nDec ? ` <em>${nDec}</em>` : ''}${k==='objets' && nObj ? ` <em>${nObj}</em>` : ''}</button>`).join('')}</div>
  </div>`;
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
function showNouveau(d){ return d.formule==='T' || ['residence','demenage'].includes(d.situation) ; }
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
  const resume = `<div class="kpis"><div class="kpi"><b>${eur(c.ttc)}</b><span>${f_label(d)} · estimation</span></div><div class="kpi"><b class="${c.marge<0?'bad':c.pct<0.15?'warn':'good'}">${eur(c.marge)}</b><span>Marge société (${Math.round(c.pct*100)} %) après vos heures</span></div><div class="kpi"><b>${num(c.hEquipe,0)} h</b><span>Équipe · ${c.jours} jour${c.jours>1?'s':''}</span></div><div class="kpi"><b>${num(c.hPorteur,0)} h</b><span>Vos heures (${eur(c.cPorteur)})</span></div></div>`;
  let body = '';
  if(tab==='appel') body = `
  <div class="card"><h3>Contact</h3>
    <div class="grid2"><label>Nom<input data-f="contact.nom" value="${esc(d.contact.nom)}" autocomplete="name"></label><label>Téléphone<input data-f="contact.tel" type="tel" value="${esc(d.contact.tel)}"></label></div>
    <div class="grid2"><label>E-mail<input data-f="contact.email" type="email" value="${esc(d.contact.email)}"></label><label>Lien avec la personne<input data-f="contact.lien" placeholder="Fille, fils, lui-même, agence…" value="${esc(d.contact.lien)}"></label></div>
    <label>Personne concernée (si différente)<input data-f="beneficiaire" value="${esc(d.beneficiaire)}"></label>
    <label>Client${seg('client',[['particulier','Particulier'],['agence','Agence ou pro']],d.client)}</label>
  </div>
  ${cartePremierAppel(d)}
  ${carteOrganismes(d)}
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
  ${showNouveau(d) ? nouvCard(d) : ''}
  <div id="espace-fiche">${navigator.onLine ? '' : '<div class="card"><p class="small muted" style="margin:0">Hors ligne : la fiche visible par la famille se modifie avec du réseau.</p></div>'}</div>
  <button class="btn danger" id="b-del" type="button" style="align-self:flex-start">Supprimer ce dossier</button>`;
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
    <label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" data-f="options.box" ${d.options.box?'checked':''} style="width:auto"> Box de stockage (${d.formule==='L' ? eur(S.box) : 'compris'})</label>
    ${d.formule!=='T' ? `<label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" data-f="options.livraison" ${d.options.livraison?'checked':''} style="width:auto"> ${d.formule==='S' ? "Livraison d'objets chez un héritier" : 'Livraison de quelques meubles chez un proche'} (${eur(S.livraison)})</label>`:''}
    ${d.formule==='L' ? `<label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" data-f="options.installationDemi" ${d.options.installationDemi?'checked':''} style="width:auto"> ${LIB_INSTALLATION} (${eur(S.installationDemi ?? DEFAULTS.installationDemi)})</label>`:''}
    ${stepper('options.gardiennage','Gardiennage (mois)',d.options.gardiennage,1)}
    <label class="row" style="flex-direction:row;color:var(--ink);font-size:15px"><input type="checkbox" data-f="options.reportSolde" ${d.options.reportSolde?'checked':''} style="width:auto"> Report du solde (CGV, article 5 bis)</label>
    ${d.options.reportSolde ? `<div class="suggest" style="font-size:13px">${reportPossible(d, calc(d)) ? `Solde de ${eur(calc(d).ttc*0.6)} réglé par le notaire lors de la vente ou de la succession, au plus tard 3 mois après la fin de la prestation, sans frais. Ordre de paiement irrévocable au notaire, coché par le client à la signature.` : `Solde de ${eur(calc(d).ttc*0.6)} : au-delà de ${eur(S.reportMax ?? DEFAULTS.reportMax)} TTC, le report n'est pas possible. Il ne sera pas imprimé sur le devis.`}</div>` : ''}
    <label>Vide-maison, montant TTC<input type="number" inputmode="decimal" min="0" data-f="options.videMaison" value="${d.options.videMaison}"></label>
    ${stepper('options.horsDepJours','Jours hors département',d.options.horsDepJours,1)}
  </div>`:''}
  <div class="card"><h3>Photos</h3>
    ${d.signature ? `<p class="small ${photosPubliables(d)?'':'muted'}" style="margin:0">${photosPubliables(d) ? 'Publication sur le site et les réseaux : autorisée par le client (case « Photos » cochée au devis).' : 'Publication sur le site et les réseaux : non autorisée (case « Photos » non cochée au devis).'}</p>` : ''}
    <div class="thumbs">${(d.photos||[]).filter(p=>p.chemin).map(p=>`<img data-chemin="${esc(p.chemin)}" alt="Photo du logement">`).join('')}</div>
    <label class="btn ghost" style="text-align:center;cursor:pointer">Ajouter des photos<input id="ph" type="file" accept="image/*" capture="environment" multiple hidden></label>
    <label>Notes de visite<textarea data-f="diag.notes" placeholder="Ce que la famille garde, objets de valeur signalés, accès…">${esc(d.diag.notes)}</textarea></label>
  </div>`; }
  if(tab==='devis') body = `
  <div class="card"><h3>Prix</h3>
    <table>${c.lignes.map(([l,v])=>`<tr><td>${esc(l)}</td><td class="n">${eur(v)}</td></tr>`).join('')}
    <tr><td><b>Total ${d.formule==='P' && d.client==='agence' ? 'HT' : 'TTC'}</b></td><td class="n"><b>${eur(c.ttc)}</b></td></tr>
    <tr><td class="muted">Soit HT</td><td class="n muted">${eur(c.ht)}</td></tr>
    ${d.formule!=='P'?`<tr><td class="muted">Acompte 40 %, ${txtAcompte(d)}</td><td class="n muted">${eur(c.ttc*0.4)}</td></tr>`:''}</table>
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
    ${d.formule!=='P' ? ck('acompte',`Acompte de 40 % encaissé (${eur(c.ttc*0.4)}, ${txtAcompte(d)})`) : ''}
    ${ck('solde', d.formule!=='P' ? `Solde encaissé (${eur(c.ttc*0.6)})` : `Facture réglée (${eur(c.ttc)})`)}
  </div>
  <div class="card"><h3>Clôture</h3>
    ${ck('fini','Chantier terminé : compter ce dossier dans le bilan')}
    <label>Ce que j'ai appris sur ce chantier<textarea data-f="suivi.notes" placeholder="Ce qui a pris plus de temps que prévu, ce qu'il faudra demander au prochain diagnostic…">${esc(s.notes)}</textarea></label>
  </div>`; }
  if(tab==='bons') body = `<div id="bons-onglet" style="display:flex;flex-direction:column;gap:18px"></div>`;
  if(tab==='courriers') body = htmlCourriers(d);
  if(tab==='courriels') body = htmlCourrielsDossier(d);
  if(ONGLETS_ESPACE.includes(tab)) body = `<div id="espace" style="display:flex;flex-direction:column;gap:18px">${espaces[d.id]?.ligne ? '' : `<div class="card"><p class="muted" style="margin:0">${navigator.onLine ? 'Chargement…' : 'Hors ligne : cet onglet se consulte avec du réseau. Les onglets Appel, Sur place, Devis et Suivi restent utilisables.'}</p></div>`}</div>`;
  const avecResume = ['appel','diag','devis','suivi'].includes(tab);
  app.innerHTML = enteteDossier(d, c) + (avecResume ? resume + `<div class="deux-col">${body}</div>` : body);
  bind(d);
  if(tab==='appel') bindOrganismes(d);
  if(tab==='courriers') bindCourriers(d);
  if(tab==='courriels') chargerCourrielsDossier(d);
  $('#fil-liste').onclick = () => { view = {name:'list'}; render(); window.scrollTo(0,0); };
  $('#b-vers-bons').onclick = () => { tab = 'bons'; render(); window.scrollTo(0,0); };
  const ap = app.querySelector('[data-aller-prepa]'); if(ap) ap.onclick = () => { tab = 'prepa'; render(); window.scrollTo(0,0); };
  const aa = app.querySelector('[data-aller-appel]'); if(aa) aa.onclick = () => { tab = 'appel'; render(); window.scrollTo(0,0); };
  if(ONGLETS_ESPACE.includes(tab) || tab==='appel'){ if(espaces[d.id]?.ligne) renderEspace(d); else if(navigator.onLine) chargerEspace(d); }
  if(tab==='bons') bonsApi.onglet(d, $('#bons-onglet'));
}
function f_label(d){ return FORM[d.formule]; }
function quoteText(d,c){
  return `Maison Fil Bleu — estimation\n${d.contact.nom ? 'Pour : '+d.contact.nom+'\n':''}Logement : ${d.typeLog}, ${TAILLES[d.taille]}, ${d.surface} m², ${d.ville}\nFormule : ${FORM[d.formule]}\n${showNouveau(d) && d.nouveau && (d.nouveau.adr?.label||d.nouveau.ville) ? `Nouveau logement : ${d.nouveau.nom ? d.nouveau.nom+', ' : ''}${d.nouveau.adr?.label || d.nouveau.ville}\n` : ''}\n` + c.lignes.map(([l,v])=>`• ${l} : ${eur(v)}`).join('\n') + `\n\nTotal ${d.formule==='P'&&d.client==='agence'?'HT':'TTC'} : ${eur(c.ttc)}${d.formule!=='P'?`\nAcompte de 40 % : ${eur(c.ttc*0.4)}, exigible 7 jours après la signature ; solde à la remise des clés.`:''}\nLe déménageur, s'il y en a un, est choisi avec vous et réglé directement.\nDevis définitif remis après le diagnostic.`;
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
function devisNo(d){ const t = new Date(d.created); return `FB-${t.getFullYear()}${String(t.getMonth()+1).padStart(2,'0')}-${d.id.slice(-4).toUpperCase()}`; }

function renderBilan(){
  const all = Object.values(dossiers).map(d => ({...d, suivi:{...SUIVI0, ...(d.suivi||{})}}));
  const finis = all.filter(d => d.suivi.fini);
  let ca=0, mR=0, mP=0, hDeb=0, m3=0, hNet=0, surf=0, nV=0, nN=0;
  finis.forEach(d => { const c = calc(d), r = reel(d,c); ca += c.ht; mP += c.marge; mR += r.saisi ? r.marge : c.marge;
    if(r.vM3!=null){ hDeb += d.suivi.hDeb; m3 += d.suivi.m3; nV++; } if(r.vM2!=null){ hNet += d.suivi.hNet; surf += d.surface; nN++; } });
  const vM3 = m3 ? hDeb/m3 : null, vM2 = surf ? hNet/surf : null;
  const envoyes = all.filter(d => d.statut==='Devis envoyé'), signes = all.filter(d => ['Signé','Terminé'].includes(d.statut));
  const perdus = all.filter(d => d.statut==='Perdu');
  const tSign = (signes.length+perdus.length) ? signes.length/(signes.length+perdus.length) : null;
  app.innerHTML = header('Bilan') + `
  <div class="card"><h3>Les deux chiffres décisifs</h3>
    <div class="kpis">
      <div class="kpi"><b>${vM3!=null?num(vM3,2):'—'}</b><span>h/m³ réels en débarras (${nV} chantier${nV>1?'s':''}) · prévu ${num(S.rythmeM3,2)}</span></div>
      <div class="kpi"><b>${tSign==null?'—':Math.round(tSign*100)+' %'}</b><span>des devis signés (${signes.length} signé${signes.length>1?'s':''}, ${perdus.length} perdu${perdus.length>1?'s':''})</span></div>
    </div>
    <table>
      <tr><td>Vitesse nettoyage</td><td class="n">${vM2!=null?num(vM2,2)+' h/m²':'—'} <span class="muted">(prévu ${num(S.rythmeM2,2)})</span></td></tr>
    </table>
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
  <div class="card"><h3>Devis</h3>
    <table><tr><td>En attente de réponse</td><td class="n">${envoyes.length} · ${eur(envoyes.reduce((a,d)=>a+calc(d).ttc,0))}</td></tr>
    <tr><td>Signés</td><td class="n">${signes.length} · ${eur(signes.reduce((a,d)=>a+calc(d).ttc,0))}</td></tr>
    <tr><td>Perdus</td><td class="n">${perdus.length}</td></tr></table>
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
    ${estConso(d) ? `<div class="suggest" style="font-size:13px;line-height:1.5">${esc(infoRetractation(d, {...DEFAULTS.soc, ...(S.soc||{})}, c.ttc*0.4))}</div>` : ''}
    ${casesDevis(d).map(k => `<label class="row" style="flex-direction:row;align-items:flex-start;gap:10px;color:var(--ink);font-size:14px;line-height:1.45"><input type="checkbox" data-case="${k}" style="width:auto;margin-top:3px"> <span>${esc(CASES[k](d))}${k==='acceptation' ? ' <b>(obligatoire)</b>' : k==='photos' ? ' <span class="muted">(facultatif)</span>' : ''}</span></label>${(k==='succession' || (k==='report' && d.formule!=='S')) ? `<label>${k==='succession' ? 'Notaire chargé de la succession' : 'Notaire chargé de la vente'}<input id="sg-notaire" value="${esc(d.notaire||'')}" placeholder="Nom, étude, commune"></label>` : ''}`).join('')}
    <canvas class="pad" id="sg-pad" aria-label="Zone de signature"></canvas>
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
    const coche = k => !!$(`[data-case="${k}"]`, m)?.checked;
    if(!coche('acceptation')){ showToast('Le client doit cocher la case d\'acceptation du devis.'); return; }
    if(casesDevis(d).includes('report') && coche('report') && !$('#sg-notaire', m)?.value.trim()){ showToast('Indiquez le notaire chargé de la vente ou de la succession.'); return; }
    const out = document.createElement('canvas'); out.width = 480; out.height = Math.round(480*cv.height/cv.width);
    const o = out.getContext('2d'); o.fillStyle='#fff'; o.fillRect(0,0,out.width,out.height); o.drawImage(cv,0,0,out.width,out.height);
    const cases = {}; casesDevis(d).forEach(k => cases[k] = coche(k));
    const notaire = $('#sg-notaire', m)?.value.trim() || '';
    if(notaire) d.notaire = notaire;
    // Date et heure de signature, cases cochées par le client lui-même (jamais pré-cochées).
    d.signature = { img: out.toDataURL('image/jpeg', 0.7), nom: $('#sg-nom', m).value.trim() || d.contact.nom || 'Client', date: new Date().toISOString(), total: c.ttc, cases, notaire };
    const exig = dateAcompte(d); if(exig && d.formule!=='P') d.signature.acompteExigible = exig.toISOString();
    if(['Appel','Diagnostic','Devis envoyé'].includes(d.statut)) d.statut = 'Signé';
    persist(d); close(); showToast('Devis signé.'); render();
    remettreDevisSigne(d);
  };
}
/** Copie du devis signé, avec le formulaire de rétractation : dépôt dans l'espace client, puis envoi au client. */
async function remettreDevisSigne(d){
  let blob; try{ blob = await devisPdf(d); }catch(e){ showToast('Le PDF signé n\'a pas pu être créé.'); return; }
  let depose = false;
  if(navigator.onLine){
    try{
      const chemin = await deposerDevis(d, blob);
      const { error } = await sb.from('documents').upsert({ dossier_id: d.id, chemin, type: 'devis', nom: `Devis ${devisNo(d)} signé`, date: new Date().toISOString() }, { onConflict: 'dossier_id,chemin' });
      depose = !error;
    }catch(e){ depose = false; }
  }
  // Envoi au client : partage natif (Mail, Messages…) en attendant l'envoi automatique par e-mail (prestataire à brancher).
  const nom = `Devis ${devisNo(d)} signé.pdf`, fichier = new File([blob], nom, { type: 'application/pdf' });
  const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-label','Remettre le devis signé');
  m.innerHTML = `<div class="sheet"><h2>Remettre le devis signé</h2>
    <p class="small" style="margin:0">${depose ? 'Le devis signé est déposé dans l\'espace client du dossier.' : 'Le devis n\'a pas pu être déposé dans l\'espace client (hors ligne ?) : utilisez « Publier » dans l\'onglet Espace client dès le retour du réseau.'}</p>
    <p class="small muted" style="margin:0">Le client doit en recevoir une copie maintenant, avec le formulaire de rétractation${d.contact.email ? ` (${esc(d.contact.email)})` : ''}.</p>
    <div class="row"><button class="btn ghost" id="rd-later" style="flex:1">Plus tard</button><button class="btn" id="rd-send" style="flex:2">Envoyer au client</button></div></div>`;
  document.body.appendChild(m);
  $('#rd-later', m).onclick = () => m.remove();
  $('#rd-send', m).onclick = async () => {
    try{
      if(navigator.canShare && navigator.canShare({ files: [fichier] })){ await navigator.share({ files: [fichier], title: nom, text: `Votre devis Maison Fil Bleu signé (${devisNo(d)}), avec le formulaire de rétractation.` }); m.remove(); return; }
    }catch(e){ if(e && e.name === 'AbortError') return; }
    const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u), 4000);
    if(d.contact.email) location.href = `mailto:${encodeURIComponent(d.contact.email)}?subject=${encodeURIComponent('Votre devis Maison Fil Bleu signé')}&body=${encodeURIComponent('Bonjour,\n\nVeuillez trouver ci-joint votre devis signé, avec le formulaire de rétractation.\n\nBien cordialement,')}`;
    m.remove();
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
    text(x,y,s,o={}){ const size=o.size||10, bold=!!o.bold, wd = tw(s,size,bold)*(o.serif?0.9:1); let xx = x; if(o.align==='right') xx = x - wd; else if(o.align==='center') xx = x - wd/2;
      ops.push(`BT /${o.serif?'F3':bold?'F2':'F1'} ${size} Tf ${hexRGB(o.color||'#1E2430')} rg ${xx.toFixed(2)} ${(H-y).toFixed(2)} Td (${pdfStr(s)}) Tj ET`); },
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
      obj(firstPage + pages.length*2, `<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>`);
      images.forEach((im,i) => obj(firstImg+i, [`<< /Type /XObject /Subtype /Image /Width ${im.iw} /Height ${im.ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`, im.bytes, `\nendstream`]));
      const xo = images.map((_,i)=>`/Im${i} ${firstImg+i} 0 R`).join(' ');
      pages.forEach((p,i) => { const id = pageIds[i]; const body = Uint8Array.from(p, ch => ch.charCodeAt(0) & 255);
        obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 ${firstPage + pages.length*2} 0 R >> ${xo?`/XObject << ${xo} >>`:''} >> /Contents ${id+1} 0 R >>`);
        obj(id+1, [`<< /Length ${body.length} >>\nstream\n`, body, `\nendstream`]); });
      const total = firstPage + pages.length*2 + 1; const xref = len;
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

/* ---------- Règles du contrat hors établissement (export juridique, « Clauses à ajouter au devis ») ---------- */
/** Devis « consommateur » : toutes les formules familles, et Fil Bleu Pro pour un particulier. */
function estConso(d){ return d.formule!=='P' || d.client!=='agence'; }
/** Date d'exigibilité de l'acompte : signature + 7 jours (article L221-10 du Code de la consommation). */
function dateAcompte(d){ if(!d.signature?.date) return null; const x = new Date(d.signature.date); x.setDate(x.getDate()+7); return x; }
function dateFr(x){ return x ? x.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) : ''; }
function txtAcompte(d){ const x = dateAcompte(d); return x ? `exigible à partir du ${dateFr(x)}` : 'exigible 7 jours après la signature'; }
const CASES = {
  acceptation: d => d.formule==='P' && d.client==='agence'
    ? "J'accepte le présent devis et les conditions générales professionnelles jointes."
    : "J'accepte le présent devis et les conditions générales de vente qui m'ont été remises.",
  demarrage: () => "Je demande expressément que les prestations commencent avant la fin du délai de rétractation de quatorze jours. Je reconnais que si je me rétracte ensuite, je devrai payer la part des prestations déjà réalisées, proportionnellement au prix total.",
  succession: () => "Je déclare agir avec l'accord de l'ensemble des héritiers, ou en vertu d'un mandat, et je communique les coordonnées du notaire chargé de la succession :",
  report: () => "Je demande le report du solde selon l'article 5 bis des conditions générales et je m'engage à remettre un ordre de paiement irrévocable au notaire chargé de la vente ou de la succession :",
  photos: () => "J'accepte que des photos du logement, sans personne ni élément permettant de m'identifier, soient utilisées sur le site et les réseaux de Maison Fil Bleu. Je peux retirer cet accord à tout moment.",
};
/** Cases proposées au client selon le devis : Pro (professionnel) = acceptation seule ; Succession = case Succession en plus. */
function casesDevis(d){
  if(!estConso(d)) return ['acceptation'];
  const l = d.formule==='S' ? ['acceptation','demarrage','succession'] : ['acceptation','demarrage'];
  if(d.formule!=='P' && reportPossible(d, calc(d))) l.push('report');
  return [...l, 'photos'];
}
/** Option « Report du solde » (CGV, article 5 bis) : familles seulement, solde de 3 000 € TTC au plus. */
function reportPossible(d, c){ return d.formule!=='P' && !!d.options?.reportSolde && c.ttc*0.6 <= (S.reportMax ?? DEFAULTS.reportMax); }
/** Report imprimé comme accordé : option possible et, une fois le devis signé, case « report » cochée par le client. */
function reportApplique(d, c){ return reportPossible(d, c) && (!d.signature || !!d.signature.cases?.report); }
const LIB_INSTALLATION = 'Installation dans la nouvelle chambre ou le nouveau logement (une demi-journée)';
function infoRetractation(d, so, montant){
  return `Vous disposez d'un délai de quatorze jours à compter du lendemain de la signature pour vous rétracter, sans motif, au moyen du formulaire joint ou de toute déclaration claire envoyée à ${so.email}, ${so.adresse}. Aucun paiement ne vous sera demandé avant l'expiration d'un délai de sept jours à compter de la signature.` + (d.formule!=='P' ? ` L'acompte de 40 %, soit ${eur(montant)}, sera ${txtAcompte(d)}.` : '');
}
/** Publication d'une photo du dossier (site, réseaux) : seulement si le client a coché la case « Photos ». */
function photosPubliables(d){ return !!d.signature?.cases?.photos; }

/** Conditions imprimées sur le devis selon les options choisies (brief final, section 3). */
function conditionsOptions(d){
  const o = d.options || {}, f = d.formule, l = [];
  if(o.residence) l.push("Recherche de résidence : jusqu'à 3 visites accompagnées d'établissements dans les Bouches-du-Rhône et constitution du dossier d'admission. Visites supplémentaires ou hors département : devis complémentaire.");
  if(o.gardiennage>0) l.push("Gardiennage : 1 visite du logement par mois (aération, relevé du courrier, contrôle visuel). Autres prestations à la demande. Pas de surveillance permanente.");
  if(o.livraison && f!=='T') l.push(`Livraison ${f==='S' ? 'chez un héritier' : 'chez un proche'} : organisation avec un déménageur indépendant et présence au chargement. Transport facturé et réglé directement par le client au déménageur. Sans installation.`);
  if(o.box) l.push("Box de stockage : recherche, aide à la souscription du contrat au nom du client, coordination avec le déménageur. Location payée par le client au loueur.");
  if(o.installationDemi && f==='L') l.push("Installation : une demi-journée sur place le jour de l'arrivée, en lien avec le déménageur : meubles placés, lit fait, photos accrochées.");
  if(f==='S') l.push("Possibilité de règlement sur les fonds de la succession avec l'accord de tous les héritiers et du notaire.");
  l.push("* Travaux des artisans et transport par le déménageur, à la demande du client : réglés directement par le client, non compris dans le forfait. Non compris : les déchets dangereux.");
  return l;
}
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
  const conso = estConso(d);
  const cond = pro ? [
    conso ? `Facture à la fin de l'intervention. Aucun paiement ne vous sera demandé avant l'expiration d'un délai de sept jours à compter de la signature.` : `Facture à la fin de l'intervention, payable à trente jours par virement.`,
    `Déchets évacués en filières agréées, justificatifs sur demande. Non compris : déchets dangereux (amiante, produits chimiques), travaux des artisans *.`,
    conso ? infoRetractation(d, so, 0) : `Ce devis est complété par les conditions générales professionnelles jointes. Le client professionnel ne bénéficie pas du droit de rétractation des consommateurs.`
  ] : [
    reportApplique(d, c)
      ? `Acompte de 40 % (${eur(c.ttc*0.4)}), ${txtAcompte(d)}. Solde (${eur(c.ttc*0.6)}) reporté selon l'article 5 bis des conditions générales : réglé par le notaire chargé de la vente ou de la succession (${d.signature?.notaire || d.notaire || '[notaire]'}), sur ordre de paiement irrévocable du client, au plus tard 3 mois après la fin de la prestation, même si la vente n'a pas eu lieu. Sans frais.`
      : `Acompte de 40 % (${eur(c.ttc*0.4)}), ${txtAcompte(d)}. Solde (${eur(c.ttc*0.6)}) à la remise des clés. Des facilités de paiement sont possibles, à convenir par écrit.`,
    `Le déménageur éventuel est choisi avec vous sur devis comparés et réglé directement par vous.`,
    infoRetractation(d, so, c.ttc*0.4),
    `Ce devis est complété par les conditions générales de vente jointes. Médiateur de la consommation : ${so.mediateur}.`
  ];
  if(!pro) cond.push(...conditionsOptions(d));
  cond.filter(Boolean).forEach(t => { wrap('• ' + t, 8.5, W).forEach(l => { if(y > 770){ P.addPage(); y = 60; } P.text(L, y, l, {size:8.5, color:muted}); y += 11; }); y += 2; });
  y += 10;
  // Accord du client : cases cochées par lui à l'écran (jamais pré-cochées)
  if(y > 660){ P.addPage(); y = 60; }
  P.text(L, y, 'VOTRE ACCORD', {size:7.5, color:blue}); y += 13;
  const cs = d.signature?.cases || {};
  casesDevis(d).forEach(k => {
    const lib = CASES[k](d) + ((k==='succession' || k==='report') ? ' ' + (d.signature?.notaire || d.notaire || '[notaire]') : '') + (k==='photos' ? ' (facultatif)' : '');
    const ls = wrap(lib, 8.5, W-22);
    if(y + ls.length*11 > 770){ P.addPage(); y = 60; }
    P.box(L, y-8, 9, 9, ink); if(cs[k]) P.text(L+1.6, y, 'X', {size:8, bold:true});
    ls.forEach((l,i) => P.text(L+18, y + i*11, l, {size:8.5, color: ink}));
    y += ls.length*11 + 5;
  });
  if(d.signature?.date) { P.text(L, y+2, `Signé le ${new Date(d.signature.date).toLocaleDateString('fr-FR')} à ${new Date(d.signature.date).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}.`, {size:8, color:muted}); y += 14; }
  y += 8;
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
  const pied = () => { P.line(L, 800, R, 800, line); P.text(L, 812, `SAS Groupe Fil Bleu · ${so.adresse} · SIRET ${so.siret} · RCS Marseille ${so.rcs} · TVA ${so.tva}`, {size:7, color:muted}); };
  pied();
  // Texte courant sur plusieurs pages (formulaire, conditions générales)
  const bloc = (txt, o = {}) => { const size = o.size || 8.5; wrap(txt, size, W - (o.indent||0), o.bold).forEach(l => { if(y > 775){ pied(); P.addPage(); y = 60; } P.text(L + (o.indent||0), y, l, {size, bold:o.bold, color:o.color||ink}); y += size*1.32; }); y += o.after ?? 4; };
  // Formulaire de rétractation : page à part, détachable (modèle légal)
  if(conso){
    P.addPage(); y = 60;
    P.text(L, y, 'FORMULAIRE DE RÉTRACTATION', {size:13, bold:true}); y += 18;
    bloc("Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.", {color:muted, after:14});
    bloc(`À l'attention de Groupe Fil Bleu, ${so.adresse}, ${so.email} :`, {size:10, after:10});
    bloc("Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous :", {size:10, after:16});
    [`Devis n° : ${devisNo(d)}`, `Signé le : ${d.signature?.date ? new Date(d.signature.date).toLocaleDateString('fr-FR') : '…'}`, 'Nom du ou des consommateurs : …', 'Adresse du ou des consommateurs : …', 'Signature du ou des consommateurs (uniquement en cas d\'envoi sur papier) : …', 'Date : …'].forEach(l => { bloc(l, {size:10, after:18}); });
    pied();
  }
  // Conditions générales jointes au devis (texte de la page /cgv)
  const cg = conso && !pro ? CGV_PARTICULIERS : (!conso ? CGV_PRO : CGV_PARTICULIERS);
  P.addPage(); y = 60;
  P.text(L, y, conso ? 'CONDITIONS GÉNÉRALES DE VENTE · PARTICULIERS' : 'CONDITIONS GÉNÉRALES · PROFESSIONNELS (FIL BLEU PRO)', {size:11, bold:true}); y += 18;
  cg.forEach(a => { if(y > 740){ pied(); P.addPage(); y = 60; } bloc(a.titre, {size:9, bold:true, after:3}); a.blocs.forEach(b => { if('p' in b) bloc(texteCgv(b.p), {size:8, color:muted}); else b.ul.forEach(li => bloc('• ' + texteCgv(li), {size:8, color:muted, indent:8, after:2})); }); y += 4; });
  pied();
  return P.build();
}
async function downloadDevis(d){
  let blob; try{ blob = await devisPdf(d); }catch(e){ showToast('Le PDF n\'a pas pu être créé.'); return; }
  const name = `Devis ${devisNo(d)} ${(d.contact.nom||'client').replace(/[\\/:*?"<>|]/g,'')}${d.signature?' signé':''}.pdf`;
  try{ const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u), 4000); }
  catch(e){ showToast('Téléchargement indisponible dans cette vue.'); }
  if(d.statut==='Diagnostic' || d.statut==='Appel'){ d.statut='Devis envoyé'; persist(d); render(); }
  // Copie du PDF dans l'espace de stockage privé « documents » (servira à l'espace client).
  if(navigator.onLine) await deposerDevis(d, blob);
}
async function deposerDevis(d, blob){
  if(!blob) blob = await devisPdf(d);
  const chemin = `${d.id}/devis-${devisNo(d)}${d.signature?'-signe':''}.pdf`;
  const { error } = await sb.storage.from('documents').upload(chemin, blob, { contentType: 'application/pdf', upsert: true });
  if(error) throw error;
  d.devisPdf = { chemin, date: new Date().toISOString(), signe: !!d.signature }; persist(d);
  return chemin;
}

/* ---------- PDF : liste des objets conservés (publiée dans l'espace client) ---------- */
async function jpegDepuis(blob, max){
  const url = URL.createObjectURL(blob);
  try{
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth*k); cv.height = Math.round(im.naturalHeight*k);
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, cv.width, cv.height);
    return { bytes: dataUrlBytes(cv.toDataURL('image/jpeg', 0.75)), w: cv.width, h: cv.height };
  } finally { URL.revokeObjectURL(url); }
}
async function objetsPdf(d, objets){
  const P = makePdf(), so = {...DEFAULTS.soc, ...(S.soc||{})}, pro = d.formule==='P';
  const ink = '#1E2430', blue = '#3D5A80', muted = '#5A5F68', line = '#E2DDD4', good = '#2F6B4F';
  const L = 50, R = 545, W = R-L; let y = 56;
  const pied = () => { P.line(L, 800, R, 800, line); P.text(L, 812, `${pro ? 'Fil Bleu Pro' : 'Maison Fil Bleu'}, une marque de la SAS Groupe Fil Bleu · ${so.adresse} · SIRET ${so.siret}`, {size:7, color:muted}); };
  const entete = () => {
    P.text(L, y, pro ? 'Fil Bleu Pro' : 'Maison Fil Bleu', {size:15, bold:true}); P.text(R, y, 'OBJETS CONSERVÉS', {size:13, bold:true, align:'right'});
    y += 14; P.text(L, y, d.contact.nom ? `Dossier de ${d.contact.nom}` : 'Dossier', {size:9, color:muted});
    P.text(R, y, `Liste établie le ${new Date().toLocaleDateString('fr-FR')}`, {size:9, color:muted, align:'right'});
    y += 10; P.line(L, y, R, y, ink, 0.8); y += 18;
  };
  entete();
  const nv = objets.filter(x => x.valide_le).length;
  wrap(`Objets mis de côté pour la famille, avec leur destinataire. ${nv === objets.length ? 'Liste entièrement validée par la famille.' : nv ? `${nv} objet${nv>1?'s':''} validé${nv>1?'s':''} par la famille sur ${objets.length}.` : 'Liste en attente de validation par la famille.'}`, 9.5, W).forEach(t => { P.text(L, y, t, {size:9.5}); y += 13; });
  y += 8;
  for(const [i, x] of objets.entries()){
    if(y > 730){ pied(); P.addPage(); y = 56; entete(); }
    const h = 58, photos = ((x.photos||[]).length ? x.photos : [x.photo]).filter(Boolean).slice(0, 3);
    // Jusqu'à 3 photos par objet, à droite ; le texte à gauche.
    const pw = 72, gap = 6, px0 = R - (3*pw + 2*gap);
    for(const [k, ch] of photos.entries()){
      const xx = px0 + k*(pw+gap);
      try{
        const { data } = await sb.storage.from('photos').download(ch);
        if(data){ const im = await jpegDepuis(data, 360); const s2 = Math.min(pw/im.w, h/im.h); P.image(im.bytes, im.w, im.h, xx, y, im.w*s2, im.h*s2); }
        else P.box(xx, y, pw, h);
      }catch(err){ P.box(xx, y, pw, h); }
    }
    if(!photos.length) P.text(px0 + (3*pw+2*gap)/2, y+h/2+3, 'Sans photo', {size:7.5, color:muted, align:'center'});
    const tw0 = px0 - L - 14;
    P.text(L, y+13, wrap(`${String(i+1).padStart(2,'0')}. ${x.nom}`, 11, tw0, true)[0], {size:11, bold:true});
    P.text(L, y+28, [x.piece ? `Pièce : ${x.piece}` : '', x.destinataire ? `Pour : ${x.destinataire}` : 'Pour la famille'].filter(Boolean).join(' · '), {size:9.5, color:blue});
    if(x.note) P.text(L, y+41, wrap(x.note, 8.5, tw0)[0], {size:8.5, color:muted});
    P.text(L, y+h-3, x.valide_le ? `Validé par la famille le ${new Date(x.valide_le).toLocaleDateString('fr-FR')}` : 'À valider par la famille', {size:8, color: x.valide_le ? good : muted});
    y += h + 12; P.line(L, y-6, R, y-6, line);
  }
  pied();
  return P.build();
}

/* ---------- Onglet « 5 · Espace client » : ce que voit la famille ---------- */
// Données séparées du dossier (tables espace_client, dossier_acces, photos_partagees, documents) :
// la famille ne lit jamais l'objet dossier, qui contient coûts, marges et notes internes.
const ETAPES = [
  ['diagnostic', 'Diagnostic'], ['devis', 'Devis signé'], ['preparation', 'Préparation'],
  ['interventions', 'Interventions'], ['cles', 'Remise des clés']
];
const ETATS = [['a_venir','À venir'], ['en_cours','En cours'], ['termine','Terminé']];
const TYPES_DOC = { devis:'Devis', facture:'Facture', etat_des_lieux:'État des lieux', bon_intervention:"Bon d'intervention", autre:'Autre document' };
const espaces = {};   // dossier_id -> { ligne, acces, photos, docs }
let espaceTimer = null;
function etapesParDefaut(d){
  const avance = ['Devis envoyé','Signé','Terminé'].includes(d.statut), signe = !!d.signature || ['Signé','Terminé'].includes(d.statut);
  return ETAPES.map(([cle]) => ({ cle, etat: (cle==='diagnostic' && avance) || (cle==='devis' && signe) || (d.statut==='Terminé') ? 'termine' : 'a_venir', date:'', message:'' }));
}
async function chargerEspace(d){
  if(!navigator.onLine || espaces[d.id]?._charge) return;
  espaces[d.id] = { _charge: true };
  const enAttente = fileAttente()[d.id] || saveTimers[d.id];
  if(enAttente){ try{ await envoyer(d); }catch(e){} }
  const [l, a, p, k, o] = await Promise.all([
    sb.from('espace_client').select('*').eq('dossier_id', d.id).maybeSingle(),
    sb.from('dossier_acces').select('*').eq('dossier_id', d.id).order('created_at'),
    sb.from('photos_partagees').select('*').eq('dossier_id', d.id).order('ordre'),
    sb.from('documents').select('*').eq('dossier_id', d.id).order('date'),
    sb.from('objets_conserves').select('*').eq('dossier_id', d.id).order('ordre').order('created_at')
  ]);
  const [j, de, li] = await Promise.all([
    sb.from('journal').select('*').eq('dossier_id', d.id).order('quand', { ascending:false }),
    sb.from('decisions').select('*').eq('dossier_id', d.id).order('posee_le', { ascending:false }),
    sb.from('listings_objets').select('version, signe_le, nom').eq('dossier_id', d.id).order('version', { ascending:false }).limit(1),
  ]);
  const err = l.error || a.error || p.error || k.error || o.error;
  if(err){ delete espaces[d.id]; const box = $('#espace') || $('#espace-fiche'); if(box) box.innerHTML = `<div class="card"><p style="margin:0">Impossible de charger l'espace client : ${esc(err.message)}</p></div>`; return; }
  const so = {...DEFAULTS.soc, ...(S.soc||{})};
  espaces[d.id] = {
    ligne: l.data || { dossier_id: d.id, formule: d.formule, ville: d.ville, interlocuteur: { nom: so.signataire && !/\[/.test(so.signataire) ? so.signataire.replace(/,.*$/, '') : '', tel: so.tel && !/\[/.test(so.tel) ? so.tel : '' }, etapes: etapesParDefaut(d), _nouveau: true },
    acces: a.data || [], photos: p.data || [], docs: k.data || [], objets: o.data || [],
    journal: j.data || [], decisions: de.data || [], listing: (li.data || [])[0] || null
  };
  const L0 = espaces[d.id].ligne; L0.etapes = L0.etapes?.length ? L0.etapes : etapesParDefaut(d); L0.taches = L0.taches?.length ? L0.taches : parcoursPour(d.formule); L0.pieces = L0.pieces || []; L0.contacts = L0.contacts || []; L0.bien = L0.bien || {}; L0.prochain = L0.prochain || {};
  if(view.name==='dossier' && view.id===d.id) rerender();
}
function enregistrerEspace(d, tout){
  const e = espaces[d.id]; if(!e) return;
  clearTimeout(espaceTimer);
  espaceTimer = setTimeout(async () => {
    const { _nouveau, _charge, updated_at, ...ligne } = e.ligne;
    ligne.formule = d.formule; ligne.ville = d.ville;
    const { error } = await sb.from('espace_client').upsert(ligne);
    if(error) showToast("L'espace client n'a pas pu être enregistré : " + error.message);
    else { delete e.ligne._nouveau; if(tout) showToast('Espace client enregistré.'); }
  }, tout ? 0 : 600);
}
const TJ = { contact:'Contact', decision:'Décision', intervention:'Intervention', organisation:'Organisation', document:'Document' };
const TRI = [['a_trier','À trier'], ['en_cours','En cours'], ['trie','Trié']];
const BIEN = [['type','Type de logement'], ['acces','Accès'], ['stationnement','Stationnement'], ['cles','Clés'], ['compteurs','Compteurs'], ['cave','Cave, annexes'], ['devenir','Devenir du bien']];
const maintenantLocal = () => { const x = new Date(); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0,16); };
const parDate = (a,b) => String(a.date||'9999').localeCompare(String(b.date||'9999'));
// Valeurs proposées à partir du dossier, pour pré-remplir la fiche visible par la famille.
function ficheParDefaut(d){
  return {
    titre: d.formule==='S' ? `Succession${d.beneficiaire ? ' de '+d.beneficiaire : d.contact.nom ? ' '+d.contact.nom.split(' ').slice(-1)[0] : ''}` : `${FORM[d.formule]}${d.contact.nom ? ' · '+d.contact.nom : ''}`,
    reference: devisNo(d),
    adresse: d.adr?.label || d.contact.adresse || d.ville || '',
    bien: {
      famille: d.contact.nom ? (d.contact.nom.split(' ').length > 1 ? 'famille '+d.contact.nom.split(' ').slice(-1)[0] : d.contact.nom) : '',
      type: `${d.typeLog==='maison' ? 'Maison' : 'Appartement'} ${TAILLES[d.taille]}, ${d.surface} m²`,
      acces: d.typeLog==='appartement' ? (d.etage ? `${d.etage}e étage${d.ascenseur ? ', ascenseur' : ', sans ascenseur'}` : 'Rez-de-chaussée') : `${d.diag?.etagesMaison||1} niveau${(d.diag?.etagesMaison||1)>1?'x':''}`,
      stationnement: d.diag?.stationnement ? 'Stationnement difficile' : '',
    },
  };
}

/* ---------- Rendu des onglets liés à l'espace client ---------- */
function renderEspace(d){
  const e = espaces[d.id]; if(!e?.ligne) return;
  if(tab==='appel'){ const f = $('#espace-fiche'); if(f){ f.innerHTML = htmlFiche(d, e); bindEspace(d, f); } return; }
  const box = $('#espace'); if(!box) return;
  box.innerHTML = tab==='synthese' ? htmlSynthese(d, e) : tab==='prepa' ? htmlPrepa(d, e) : tab==='journal' ? htmlJournal(d, e) : tab==='objets' ? htmlObjets(d, e) : htmlEspaceClient(d, e);
  bindEspace(d, box);
  remplirVignettes();
}

function htmlSynthese(d, e){
  const c = calc(d), L = e.ligne, pr = L.prochain || {}, taches = (L.taches||[]).map((t,i) => ({...t, i}));
  const af = taches.filter(t => t.etat!=='fait').sort((a,b) => (b.oblig?1:0)-(a.oblig?1:0) || parDate(a,b)).slice(0, 7);
  const manque = infosManquantes(d);
  const pd = pr.date ? new Date(pr.date+'T12:00:00') : null;
  const nonValides = (e.objets||[]).filter(x => !x.valide_le).length, decAtt = (e.decisions||[]).filter(x => x.statut==='attente').length;
  const acompte = d.formule!=='P' ? c.ttc*0.4 : 0, s = d.suivi || {};
  const encaisse = (s.acompte ? acompte : 0) + (s.solde ? c.ttc - acompte : 0);
  return `<div class="grille">
    <div class="col">
      <div class="pan">${pd && !isNaN(pd) ? `<div class="rdv"><b>${pd.getDate()}</b><div><span class="sur" style="margin:0">Prochain rendez-vous · ${esc(pd.toLocaleDateString('fr-FR',{weekday:'long', day:'numeric', month:'long'}))}</span><strong>${esc(pr.titre||'Rendez-vous')}</strong><span>${esc([pr.horaire, pr.detail].filter(Boolean).join(' · '))}</span></div><button class="btn ghost petit" type="button" data-aller="prepa">Modifier</button></div>`
        : `<div class="rdv"><div><span class="sur" style="margin:0">Prochain rendez-vous</span><strong>Aucun rendez-vous prévu</strong><span>Il s'affiche en haut de l'espace client de la famille.</span></div><button class="btn petit" type="button" data-aller="prepa">Programmer</button></div>`}</div>
      ${manque.length ? `<div class="suggest warn"><b>Infos du premier appel à obtenir :</b> ${manque.map(esc).join(' · ')} <button class="lien" type="button" data-aller="appel">Compléter</button></div>` : ''}
      <div class="pan"><div class="pan-h"><h3>À faire</h3><button class="lien" type="button" data-aller="prepa">Tout le parcours</button></div>
        ${af.length ? `<ul class="check">${af.map(t => `<li class="${t.etat}"><button type="button" class="case" data-tache-etat="${t.i}" aria-label="Changer l'état">${t.etat==='fait' ? coche : ''}</button><span>${t.oblig ? '<b class="warn" title="Obligatoire">★</b> ' : ''}${esc(t.libelle || 'Tâche sans titre')}${t.cote==='famille' ? ' <span class="badge attente">Famille</span>' : ''}</span><span>${esc(dateCourte(t.date))}</span></li>`).join('')}</ul>` : `<p class="pan-vide">Aucune tâche en cours. Ajoutez-les dans « Préparation » : la famille les voit dans son espace.</p>`}
      </div>
      <div class="pan"><div class="pan-h"><h3>Derniers événements</h3><button class="lien" type="button" data-aller="journal">Journal complet</button></div>
        ${(e.journal||[]).length ? `<ol class="journal">${e.journal.slice(0,4).map(j => `<li class="t-${esc(j.type)}"><i class="pt"></i><time>${esc(quandFr(j.quand))}</time><div><b>${esc(j.titre)}</b>${j.texte ? `<span>${esc(j.texte)}</span>` : ''}</div></li>`).join('')}</ol>` : '<p class="pan-vide">Aucun événement noté. Notez appels, décisions et interventions dans « Journal et décisions ».</p>'}
      </div>
    </div>
    <div class="col">
      <div class="pan"><div class="pan-h"><h3>Finances</h3></div><dl class="dl">
        <div><dt>Devis${d.signature ? ' signé' : ''}</dt><dd><b>${eur(c.ttc)} ${d.formule==='P'&&d.client==='agence'?'HT':'TTC'}</b></dd></div>
        ${d.formule!=='P' ? `<div><dt>Acompte 40 %</dt><dd>${eur(acompte)} · ${s.acompte ? '<span class="good">encaissé</span>' : 'à encaisser'}</dd></div>` : ''}
        <div><dt>Reste à encaisser</dt><dd>${eur(c.ttc - encaisse)}</dd></div>
        <div><dt>Marge prévue</dt><dd class="${c.marge<0?'bad':c.pct<0.15?'warn':'good'}">${eur(c.marge)} (${Math.round(c.pct*100)} %)</dd></div>
      </dl></div>
      <div class="pan"><div class="pan-h"><h3>Espace client</h3>${L._nouveau ? '<span class="badge">Pas encore ouvert</span>' : e.acces.length ? '<span class="badge ok">Ouvert</span>' : '<span class="badge attente">Sans accès</span>'}</div><dl class="dl">
        <div><dt>Accès</dt><dd>${e.acces.length ? esc(e.acces.map(x => x.email).join(', ')) : 'aucun'}</dd></div>
        <div><dt>En attente de la famille</dt><dd>${[nonValides ? `listing à signer` : '', decAtt ? `${decAtt} question${decAtt>1?'s':''}` : ''].filter(Boolean).join(', ') || 'rien'}</dd></div>
        <div><dt>Tâches</dt><dd>${taches.filter(t => t.etat==='fait').length} faites sur ${taches.length}</dd></div>
      </dl><div class="pan-pied"><button class="lien" type="button" data-aller="espace">Gérer l'espace client</button></div></div>
      <div class="pan"><div class="pan-h"><h3>Logement</h3></div><dl class="dl">
        <div><dt>Adresse</dt><dd>${esc(L.adresse || d.adr?.label || d.ville || '—')}</dd></div>
        <div><dt>Logement</dt><dd>${esc(d.typeLog)} ${esc(TAILLES[d.taille])}, ${d.surface} m²</dd></div>
        <div><dt>Volume</dt><dd>${num(d.diag.volume)} m³ · ${d.diag.evac} % à évacuer</dd></div>
        <div><dt>Distance</dt><dd>${num(d.km,0)} km du siège</dd></div>
      </dl></div>
      <div class="pan"><div class="pan-h"><h3>Contact</h3></div><dl class="dl">
        <div><dt>Nom</dt><dd>${esc(d.contact.nom||'—')}${d.contact.lien ? ` (${esc(d.contact.lien)})` : ''}</dd></div>
        <div><dt>Téléphone</dt><dd>${d.contact.tel ? `<a href="${telLien(d.contact.tel)||'#'}">${esc(d.contact.tel)}</a>` : '—'}</dd></div>
        <div><dt>E-mail</dt><dd>${esc(d.contact.email||'—')}</dd></div>
      </dl></div>
    </div>
  </div>`;
}

function htmlPrepa(d, e){
  const L = e.ligne, pr = L.prochain || {}, taches = (L.taches||[]).map((t,i) => ({...t, i})), pieces = L.pieces || [];
  const fait = taches.filter(t => t.etat==='fait').length;
  const vol = pieces.reduce((a,p) => a + (Number(p.volume)||0), 0), triees = pieces.filter(p => p.tri==='trie').length;
  return `<div class="card"><h3>Prochain rendez-vous (affiché en haut de l'espace client)</h3>
      <div class="grid2"><label>Date<input type="date" data-prochain="date" value="${esc(pr.date||'')}"></label><label>Horaire<input data-prochain="horaire" value="${esc(pr.horaire||'')}" placeholder="Ex. : 8 h à 17 h"></label></div>
      <label>Ce qui est prévu<input data-prochain="titre" value="${esc(pr.titre||'')}" placeholder="Ex. : Débarras sur place"></label>
      <label>Précisions pour la famille<input data-prochain="detail" value="${esc(pr.detail||'')}" placeholder="Ex. : 2 personnes, 1 camion. Votre présence n'est pas nécessaire."></label>
      ${pr.date ? `<div class="row">${boutonMail(d, 'rdv:'+pr.date, 'id="prochain-prevenir"', 'Prévenir la famille')}<button class="lien" type="button" id="prochain-effacer">Effacer le rendez-vous</button></div>` : ''}
    </div>
    <div class="pan"><div class="pan-h"><h3>Parcours du dossier</h3><div class="row"><span class="small muted">${fait} faites sur ${taches.length} · ${taches.filter(t => t.oblig && t.etat!=='fait').length} obligatoires restantes</span><button class="btn ghost petit" type="button" id="parcours-completer">Compléter avec le parcours type</button></div></div>
      <p class="pan-vide" style="padding-top:10px;padding-bottom:4px">Touchez la case pour passer une tâche à « en cours » puis « faite ». <b>★</b> = obligatoire. L'œil indique si la famille voit la tâche dans son espace.</p>
      ${PHASES.map(([cle, nom]) => { const famille = cle !== 'appel'; const x = L.etapes.find(y => y.cle===cle) || { etat:'a_venir', date:'', message:'' }; const tp = taches.filter(t => t.phase===cle); const reste = tp.filter(t => t.oblig && t.etat!=='fait').length; return `<div class="phase-b">
        <div class="phase-b-h"><b>${famille ? boutonMail(d, 'etape:'+cle, `data-prev-etape="${cle}"`) : ''}${esc(nom)}${famille ? '' : ' <span class="small muted">(interne)</span>'} <span class="small muted">· ${tp.filter(t => t.etat==='fait').length}/${tp.length}${reste ? ` · <span class="warn">${reste} obligatoire${reste>1?'s':''}</span>` : ''}</span></b>${famille ? `<select data-etape-etat="${cle}" aria-label="État de l'étape ${esc(nom)}">${ETATS.map(([k,l]) => `<option value="${k}" ${x.etat===k?'selected':''}>${l}</option>`).join('')}</select><input type="date" data-etape-date="${cle}" value="${esc(x.date||'')}" aria-label="Date de l'étape ${esc(nom)}">` : '<span></span><span></span>'}</div>
        ${famille ? `<div class="phase-msg"><textarea data-etape-msg="${cle}" placeholder="Message pour la famille (facultatif), ex. : Le tri est terminé, les dons partent mardi.">${esc(x.message||'')}</textarea></div>` : ''}
        <ul class="taches">${tp.map(t => `<li class="${t.etat}${t.oblig ? ' oblig' : ''}"><button type="button" class="case" data-tache-etat="${t.i}" aria-label="État : ${t.etat==='fait'?'fait':t.etat==='en_cours'?'en cours':'à faire'}">${t.etat==='fait' ? coche : ''}</button><input class="lib" data-tache="${t.i}" data-champ="libelle" value="${esc(t.libelle||'')}" placeholder="Tâche" aria-label="Tâche"><span class="reperes">${famille && !t.interne ? boutonMail(d, 'tache:'+(t.modele || t.libelle), `data-prev-tache="${t.i}"`) : ''}${DOC_DE_TACHE[t.modele] ? `<button type="button" class="vis on" data-vers-doc="${DOC_DE_TACHE[t.modele]}" title="Préparer le document" aria-label="Préparer le document"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg></button>` : ''}<button type="button" class="ob ${t.oblig?'on':''}" data-tache-oblig="${t.i}" title="${t.oblig?'Obligatoire':'Facultative'}" aria-label="Obligatoire : ${t.oblig?'oui':'non'}">★</button><button type="button" class="vis ${t.interne || !famille ?'':'on'}" data-tache-vis="${t.i}" title="${t.interne || !famille ? 'Interne : la famille ne la voit pas' : 'Visible par la famille'}" aria-label="${t.interne || !famille ? 'Interne' : 'Visible par la famille'}" ${famille ? '' : 'disabled'}>${t.interne || !famille ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c7 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3 7 10 7a10 10 0 0 0 5.4-1.6"/></svg>' : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>'}</button></span><button type="button" class="qui ${t.cote==='famille'?'famille':''}" data-tache-qui="${t.i}" title="Qui s'en charge">${t.cote==='famille' ? 'Famille' : 'Nous'}</button><input type="date" data-tache="${t.i}" data-champ="date" value="${esc(t.date||'')}" aria-label="Date"><button type="button" class="suppr" data-tache-suppr="${t.i}" aria-label="Supprimer la tâche">×</button></li>`).join('')}
          <li style="display:block"><button type="button" class="ajout" data-tache-ajout="${cle}">+ Ajouter une tâche</button></li></ul>
      </div>`; }).join('')}
    </div>
    <div class="pan"><div class="pan-h"><h3>Pièces du logement</h3><span class="small muted">${triees} triée${triees>1?'s':''} sur ${pieces.length}${vol ? ` · ${num(vol)} m³ à évacuer` : ''}</span></div>
      ${pieces.length ? `<div class="tab"><table class="saisie"><thead><tr><th>Pièce</th><th>Tri</th><th>Objets conservés</th><th>Dons</th><th>Volume dons (m³)</th><th>Volume à évacuer (m³)</th><th></th></tr></thead><tbody>
        ${pieces.map((p,i) => `<tr><td><input data-piece="${i}" data-champ="nom" value="${esc(p.nom||'')}" aria-label="Pièce"></td><td><select data-piece="${i}" data-champ="tri" aria-label="Tri">${TRI.map(([k,l]) => `<option value="${k}" ${p.tri===k?'selected':''}>${l}</option>`).join('')}</select></td><td><input class="court" type="number" min="0" data-piece="${i}" data-champ="conserves" value="${esc(p.conserves ?? '')}" aria-label="Objets conservés"></td><td><input data-piece="${i}" data-champ="dons" value="${esc(p.dons||'')}" placeholder="—" aria-label="Dons"></td><td><input class="court" type="number" min="0" step="0.5" data-piece="${i}" data-champ="dons_volume" value="${esc(p.dons_volume ?? '')}" aria-label="Volume des dons"></td><td><input class="court" type="number" min="0" step="0.5" data-piece="${i}" data-champ="volume" value="${esc(p.volume ?? '')}" aria-label="Volume"></td><td><button type="button" class="suppr" data-piece-suppr="${i}" aria-label="Supprimer la pièce">×</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="pan-vide">Ajoutez les pièces pour suivre le tri : la famille voit l\'avancement pièce par pièce.</p>'}
      <div class="pan-pied row"><button class="btn ghost petit" type="button" id="piece-ajout">+ Ajouter une pièce</button>${!pieces.length ? '<button class="btn ghost petit" type="button" id="pieces-type">Pièces types (séjour, cuisine, chambres…)</button>' : ''}</div>
    </div>`;
}

function htmlJournal(d, e){
  const jEd = e._jEdit;
  return `<div class="grille">
    <div class="col">
      <div class="card"><h3>Ajouter au journal (visible par la famille)</h3>
        <div class="seg types" data-jtype role="group" aria-label="Type d'événement">${Object.entries(TJ).map(([k,l]) => `<button type="button" class="t-${k}" data-v="${k}" aria-pressed="${(e._jType||'contact')===k}">${l}</button>`).join('')}</div>
        <input id="j-titre" placeholder="Titre, ex. : Appel avec Claire Martin" maxlength="160">
        <textarea id="j-texte" placeholder="Ce qui a été dit ou fait, en une ou deux phrases." maxlength="1000"></textarea>
        <label class="row"><input type="checkbox" id="j-prevenir"> Prévenir aussi la famille par e-mail</label>
        <div class="row" style="justify-content:space-between"><input id="j-quand" type="datetime-local" value="${maintenantLocal()}" style="width:auto"><button class="btn" type="button" id="j-ajout">Ajouter</button></div>
      </div>
      <div class="pan"><div class="pan-h"><h3>Journal</h3><span class="small muted">${(e.journal||[]).length} événement${(e.journal||[]).length>1?'s':''}</span></div>
        ${(e.journal||[]).length ? `<ol class="journal">${e.journal.map(j => jEd===j.id ? `<li style="grid-template-columns:1fr"><div style="gap:8px"><input data-jed="titre" value="${esc(j.titre)}" maxlength="160"><textarea data-jed="texte" maxlength="1000">${esc(j.texte||'')}</textarea><div class="row"><button class="btn petit" type="button" data-j-enreg="${esc(j.id)}">Enregistrer</button><button class="btn ghost petit" type="button" data-j-annul>Annuler</button><button class="btn danger petit" type="button" data-j-suppr="${esc(j.id)}">Supprimer</button></div></div></li>`
          : `<li class="t-${esc(j.type)}"><i class="pt"></i><time>${esc(quandFr(j.quand))}</time><div><span class="jtype">${esc(TJ[j.type]||'')}</span><b>${esc(j.titre)}</b>${j.texte ? `<span>${esc(j.texte)}</span>` : ''}</div><button class="lien" type="button" data-j-edit="${esc(j.id)}">Modifier</button></li>`).join('')}</ol>` : '<p class="pan-vide">Rien pour l\'instant. Chaque appel, décision ou intervention noté ici apparaît dans l\'espace de la famille.</p>'}
      </div>
    </div>
    <div class="col">
      <div class="card"><h3>Poser une question à la famille</h3>
        <input id="q-question" placeholder="Ex. : Bibliothèque du bureau, vendre ou donner ?" maxlength="300">
        <div class="choix" id="q-choix">${(e._choix||[]).map((c,i) => `<em>${esc(c)}<button type="button" data-choix-suppr="${i}" aria-label="Retirer">×</button></em>`).join('')}<input id="q-choix-in" placeholder="Réponse proposée" style="width:170px;padding:6px 10px;font-size:13.5px"><button class="btn ghost petit" type="button" id="q-choix-ajout">+ Ajouter</button></div>
        <p class="small muted" style="margin:0">Sans réponse proposée, la famille écrit sa réponse. Elle la voit dans « À faire » de son espace.</p>
        <label class="row"><input type="checkbox" id="q-prevenir" checked> Prévenir la famille par e-mail</label>
        <button class="btn" type="button" id="q-envoyer" style="align-self:flex-start">Poser la question</button>
      </div>
      <div class="pan tab"><div class="pan-h"><h3>Décisions</h3></div>
        ${(e.decisions||[]).length ? `<table><thead><tr><th>Date</th><th>Décision</th><th>Par</th><th>Statut</th><th></th></tr></thead><tbody>${e.decisions.map(x => `<tr class="${x.statut==='attente'?'attente':''}"><td class="muted">${esc(dateCourte(x.decide_le || x.posee_le))}</td><td><b>${esc(x.question)}</b>${x.reponse ? `<br><span class="small muted">${esc(x.reponse)}</span>` : (x.choix||[]).length ? `<br><span class="small muted">${esc(x.choix.join(' / '))}</span>` : ''}</td><td>${esc(x.decide_par||'—')}</td><td>${x.statut==='validee' ? '<span class="badge ok">Validée</span>' : '<span class="badge attente">En attente</span>'}</td><td><button class="suppr" type="button" data-dec-suppr="${esc(x.id)}" aria-label="Supprimer">×</button></td></tr>`).join('')}</tbody></table>` : '<p class="pan-vide">Aucune décision notée.</p>'}
        <div class="pan-c" style="border-top:1px solid var(--line)"><b class="small">Noter une décision déjà prise</b>
          <input id="dp-question" placeholder="Ex. : Mobilier de la chambre 2 donné à l'association" maxlength="300">
          <div class="grid2"><input id="dp-reponse" placeholder="Réponse (ex. : Oui)" maxlength="500"><input id="dp-par" placeholder="Décidé par (ex. : Claire et Paul)" maxlength="160"></div>
          <button class="btn ghost petit" type="button" id="dp-ajout" style="align-self:flex-start">Noter la décision</button></div>
      </div>
    </div>
  </div>`;
}

function htmlObjets(d, e){
  const objets = e.objets || [], nv = objets.filter(x => !x.valide_le).length, li = e.listing;
  const pieces = [...new Set([...(e.ligne.pieces||[]).map(p => p.nom).filter(Boolean)])];
  const pdf = (e.docs||[]).find(x => /objets-conserves\.pdf$/.test(x.chemin));
  const photosDe = x => ((x.photos||[]).length ? x.photos : [x.photo]).filter(Boolean);
  return `${objets.length ? `<div class="bandeau ${nv ? '' : 'ok'}"><div>${nv ? '<span class="badge attente">Non signé</span>' : '<span class="badge ok">Signé</span>'}
      <b>${objets.length} objet${objets.length>1?'s':''}${li ? ` · version ${li.version + (nv?1:0)}` : ''}</b>
      <span>${nv ? (li ? `Version ${li.version} signée par ${esc(li.nom)} le ${esc(dateCourte(li.signe_le))}. Le listing a changé : la famille doit signer à nouveau.` : 'La famille signe le listing depuis son espace. Rien ne part avant sa signature.') : `Signé par ${esc(li?.nom||'la famille')} le ${esc(dateCourte(li?.signe_le))}.`}${pdf ? ` PDF publié le ${esc(dateCourte(pdf.date))}.` : ' PDF pas encore publié.'}</span></div>
      ${nv ? boutonMail(d, 'listing:'+objets.length, 'id="oc-prevenir"', 'Prévenir la famille') : ''}<button class="btn ${pdf?'ghost':''}" type="button" id="oc-pdf">${pdf ? 'Republier le PDF' : 'Publier le PDF'}</button></div>` : ''}
    <div class="pan tab"><div class="pan-h"><h3>Listing des objets conservés</h3><span class="small muted">3 photos par objet au plus</span></div>
      ${objets.length ? `<table class="saisie"><thead><tr><th>N°</th><th>Objet</th><th>Pièce</th><th>Destinataire</th><th>Photos</th><th>Statut</th><th></th></tr></thead><tbody>
        ${objets.map((x,i) => { const ph = photosDe(x); return `<tr><td class="muted">${String(i+1).padStart(2,'0')}</td>
          <td style="min-width:220px"><input data-oc="${esc(x.id)}" data-oc-champ="nom" value="${esc(x.nom)}" aria-label="Objet"><input data-oc="${esc(x.id)}" data-oc-champ="note" value="${esc(x.note||'')}" placeholder="Note (facultatif)" aria-label="Note" style="margin-top:4px;font-size:13px"></td>
          <td><input data-oc="${esc(x.id)}" data-oc-champ="piece" value="${esc(x.piece||'')}" list="oc-pieces" placeholder="Pièce" aria-label="Pièce" style="width:140px"></td>
          <td><input data-oc="${esc(x.id)}" data-oc-champ="destinataire" value="${esc(x.destinataire||'')}" placeholder="Pour qui ?" aria-label="Destinataire" style="width:150px"></td>
          <td><div class="phs">${ph.map(c => `<span class="vign"><img data-chemin="${esc(c)}" alt=""><button type="button" class="x" data-oc-ph-suppr="${esc(x.id)}" data-ch="${esc(c)}" aria-label="Retirer la photo">×</button></span>`).join('')}${ph.length < 3 ? `<label class="vign vide" title="Prendre une photo">${icPhoto}<input type="file" accept="image/*" capture="environment" data-oc-ph="${esc(x.id)}" hidden></label>` : ''}</div></td>
          <td>${x.valide_le ? `<span class="badge ok">Validé</span>` : '<span class="badge attente">À signer</span>'}</td>
          <td><button type="button" class="suppr" data-oc-retirer="${esc(x.id)}" aria-label="Retirer l'objet">×</button></td></tr>`; }).join('')}
      </tbody></table>` : '<p class="pan-vide">Aucun objet pour l\'instant. Photographiez chaque objet mis de côté : la famille signe ensuite le listing depuis son espace.</p>'}
      <datalist id="oc-pieces">${pieces.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      <div class="pan-c" style="border-top:1px solid var(--line)"><b class="small">Ajouter un objet</b>
        <div class="grid2" style="grid-template-columns:2fr 1fr 1fr"><input id="oc-nom" placeholder="Ex. : Album de photos de famille"><input id="oc-piece" list="oc-pieces" placeholder="Pièce"><input id="oc-dest" placeholder="Pour qui"></div>
        <div class="row"><label class="btn ghost" style="cursor:pointer">${icPhoto} Photos (3 au plus)<input id="oc-photo" type="file" accept="image/*" capture="environment" multiple hidden></label><button type="button" class="btn" id="oc-ajout">Ajouter l'objet</button><span class="small muted" id="oc-photo-etat">${(e._ocPhotos||[]).length ? `${e._ocPhotos.length} photo${e._ocPhotos.length>1?'s':''} prête${e._ocPhotos.length>1?'s':''}` : 'Photos facultatives, mais conseillées.'}</span></div>
      </div>
    </div>`;
}

function htmlEspaceClient(d, e){
  const L = e.ligne, partagees = new Map(e.photos.map(x => [x.chemin, x])), photos = (d.photos||[]).filter(x => x.chemin);
  return `<div class="grille">
    <div class="col">
      ${L._nouveau ? `<div class="suggest">L'espace de cette famille n'est pas encore ouvert. Préparez-le (fiche du logement dans « Appel et logement », étapes dans « Préparation »), puis ajoutez les personnes qui y auront accès.</div>` : ''}
      <div class="card"><h3>Accès de la famille</h3>
        <p class="small muted" style="margin:0">La personne concernée et ses proches se connectent avec leur adresse e-mail : ils reçoivent un code à 6 chiffres par e-mail.</p>
        ${e.acces.length ? `<table>${e.acces.map(x => `<tr><td>${esc(x.email)}<br><span class="small muted">${x.role==='titulaire'?'Titulaire':'Proche'}${x.invite_le?` · invité le ${new Date(x.invite_le).toLocaleDateString('fr-FR')}`:' · pas encore invité'}</span></td><td class="n" style="white-space:nowrap"><button type="button" class="btn petit ${x.invite_le?'ghost':''}" data-inviter="${esc(x.email)}">${x.invite_le?'Renvoyer':'Inviter'}</button> <button type="button" class="btn ghost petit" data-retirer="${esc(x.email)}">Retirer</button></td></tr>`).join('')}</table>` : `<p class="small" style="margin:0">Aucun accès pour l'instant.</p>`}
        <div class="grid2"><label>E-mail<input id="ac-email" type="email" inputmode="email" placeholder="prenom.nom@exemple.fr" value="${e.acces.length ? '' : esc(d.contact.email||'')}"></label>
        <label>Rôle${seg('ac-role', [['titulaire','Titulaire'],['proche','Proche']], e.acces.some(x=>x.role==='titulaire') ? 'proche' : 'titulaire')}</label></div>
        <div class="row"><button type="button" class="btn ghost" id="ac-ajout">Ajouter cet accès</button>
        ${e.acces.some(x=>!x.invite_le) ? `<button type="button" class="btn" id="ac-inviter">Inviter ${e.acces.filter(x=>!x.invite_le).length>1?'les personnes pas encore invitées':'la personne pas encore invitée'}</button>` : ''}</div>
      </div>
      <div class="card"><h3>Photos visibles par la famille</h3>
        <p class="small muted" style="margin:0">Cochez les photos à montrer et indiquez « avant » et « après » : la famille voit un comparateur avant/après. La photo choisie en couverture s'affiche en haut de son espace.</p>
        ${photos.length ? `<div class="thumbs" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">${photos.map(x => { const p = partagees.get(x.chemin); return `<div class="partage ${p?'on':''}"><img data-chemin="${esc(x.chemin)}" alt="Photo du logement">
          <label class="row" style="font-size:13px!important"><input type="checkbox" data-partage="${esc(x.chemin)}" ${p?'checked':''}> Visible</label>
          ${p ? `<select data-moment="${esc(x.chemin)}" aria-label="Moment"><option value="">Moment…</option>${[['avant','Avant'],['pendant','Pendant'],['apres','Après']].map(([k,l]) => `<option value="${k}" ${p.moment===k?'selected':''}>${l}</option>`).join('')}</select>` : ''}
          <label class="row" style="font-size:13px!important"><input type="radio" name="couverture" data-couv="${esc(x.chemin)}" ${L.couverture===x.chemin?'checked':''}> Couverture</label></div>`; }).join('')}</div>` : `<p class="small" style="margin:0">Aucune photo dans ce dossier (ajoutez-en dans « Sur place »).</p>`}
      </div>
    </div>
    <div class="col">
      ${L._nouveau ? '' : `<a class="btn ghost" href="/espace-client#apercu=${encodeURIComponent(d.id)}" target="_blank" rel="noopener">Voir l'espace comme la famille</a>`}
      <div class="card"><h3>Interlocuteur affiché</h3>
        <label>Nom<input data-esp="interlocuteur.nom" value="${esc(L.interlocuteur?.nom||'')}" placeholder="Prénom Nom"></label>
        <label>Téléphone<input data-esp="interlocuteur.tel" type="tel" value="${esc(L.interlocuteur?.tel||'')}"></label>
      </div>
      <div class="card"><h3>Documents publiés</h3>
        ${e.docs.length ? `<table>${e.docs.map(x => `<tr><td>${esc(x.nom)}<br><span class="small muted">${esc(TYPES_DOC[x.type]||'Document')} · ${new Date(x.date).toLocaleDateString('fr-FR')}</span></td><td class="n" style="white-space:nowrap"><button type="button" class="btn ghost petit" data-voir="${esc(x.chemin)}">Voir</button> <button type="button" class="btn danger petit" data-retdoc="${esc(x.id)}">Retirer</button></td></tr>`).join('')}</table>` : `<p class="small" style="margin:0">Aucun document publié.</p>`}
        <button type="button" class="btn ghost" id="doc-devis">Publier le devis${d.signature?' signé':''} (PDF)</button>
        <label>Type du document à ajouter${seg('doc-type', Object.entries(TYPES_DOC).filter(([k])=>k!=='devis' && k!=='bon_intervention'), espaces._type||'facture')}</label>
        <label class="btn ghost" style="cursor:pointer">Ajouter un document (PDF ou photo)<input id="doc-fichier" type="file" accept="application/pdf,image/jpeg,image/png" hidden></label>
      </div>
    </div>
  </div>`;
}

function htmlFiche(d, e){
  const L = e.ligne, b = L.bien || {}, def = ficheParDefaut(d);
  return `<div class="card"><h3>Fiche visible par la famille</h3>
    <p class="small muted" style="margin:0">Ces informations s'affichent dans l'espace client (en-tête et « Le logement »).${L._nouveau ? ' L\'espace n\'est pas encore ouvert : rien n\'est visible tant qu\'aucun accès n\'est ajouté.' : ''}</p>
    <div class="grid2"><label>Titre du dossier<input data-esp="titre" value="${esc(L.titre||'')}" placeholder="${esc(def.titre)}"></label><label>Accueil (« Bonjour, … »)<input data-esp="bien.famille" value="${esc(b.famille||'')}" placeholder="${esc(def.bien.famille || 'famille Martin')}"></label></div>
    <div class="grid2"><label>N° de dossier<input data-esp="reference" value="${esc(L.reference||'')}" placeholder="${esc(def.reference)}"></label><label>Adresse affichée<input data-esp="adresse" value="${esc(L.adresse||'')}" placeholder="${esc(def.adresse)}"></label></div>
    <div class="grid2">${BIEN.map(([k,l]) => `<label>${esc(l)}<input data-esp="bien.${k}" value="${esc(b[k]||'')}" placeholder="${esc(def.bien[k]||'')}"></label>`).join('')}</div>
    <button class="btn ghost" type="button" id="fiche-remplir" style="align-self:flex-start">Remplir les champs vides depuis le dossier</button>
    <b class="small" style="margin-top:4px">Contacts du dossier (notaire, syndic, gardien, proches…)</b>
    ${(L.contacts||[]).map((c,i) => `<div class="grid2" style="grid-template-columns:1fr 1fr 1.4fr 32px;align-items:center"><input data-contact="${i}" data-champ="nom" value="${esc(c.nom||'')}" placeholder="Nom" aria-label="Nom"><input data-contact="${i}" data-champ="role" value="${esc(c.role||'')}" placeholder="Rôle" aria-label="Rôle"><input data-contact="${i}" data-champ="detail" value="${esc(c.detail||'')}" placeholder="Précision" aria-label="Précision"><button type="button" class="suppr" data-contact-suppr="${i}" aria-label="Retirer">×</button></div>`).join('')}
    <button class="lien" type="button" id="contact-ajout" style="align-self:flex-start">+ Ajouter un contact</button>
  </div>`;
}

/* ---------- Interactions des onglets liés à l'espace client ---------- */
function bindEspace(d, box){
  const e = espaces[d.id], L = e.ligne;
  const val = sel => box.querySelector(sel);
  const ouvrirSiNouveau = () => L._nouveau ? new Promise(r => { enregistrerEspace(d, true); setTimeout(r, 400); }) : Promise.resolve();
  const redessiner = (complet) => { const y = window.scrollY; if(complet) render(); else renderEspace(d); window.scrollTo(0, y); };
  box.querySelectorAll('[data-aller]').forEach(b => b.onclick = () => { tab = b.dataset.aller; render(); window.scrollTo(0,0); });

  // Champs simples de la ligne espace_client (titre, fiche du logement, interlocuteur)
  box.querySelectorAll('[data-esp]').forEach(el => el.addEventListener('input', () => { setPath(L, el.dataset.esp, el.value.trim()); enregistrerEspace(d); }));
  const fr = val('#fiche-remplir'); if(fr) fr.onclick = () => { const def = ficheParDefaut(d); ['titre','reference','adresse'].forEach(k => { if(!L[k]) L[k] = def[k]; }); L.bien = {...def.bien, ...Object.fromEntries(Object.entries(L.bien||{}).filter(([,v]) => v))}; enregistrerEspace(d); redessiner(); };
  box.querySelectorAll('[data-contact]').forEach(el => el.addEventListener('input', () => { L.contacts[+el.dataset.contact][el.dataset.champ] = el.value.trim(); enregistrerEspace(d); }));
  box.querySelectorAll('[data-contact-suppr]').forEach(b => b.onclick = () => { L.contacts.splice(+b.dataset.contactSuppr, 1); enregistrerEspace(d); redessiner(); });
  const ca = val('#contact-ajout'); if(ca) ca.onclick = () => { L.contacts = [...(L.contacts||[]), { nom:'', role:'', detail:'' }]; redessiner(); box.querySelector(`[data-contact="${L.contacts.length-1}"]`)?.focus(); };

  // Prochain rendez-vous
  box.querySelectorAll('[data-prochain]').forEach(el => el.addEventListener(el.type==='date' ? 'change' : 'input', () => { L.prochain = {...(L.prochain||{}), [el.dataset.prochain]: el.value.trim()}; enregistrerEspace(d); }));
  const pe = val('#prochain-effacer'); if(pe) pe.onclick = () => { L.prochain = {}; enregistrerEspace(d); redessiner(); };

  // Étapes (état, date, message à la famille)
  const etape = cle => { let x = L.etapes.find(y => y.cle===cle); if(!x){ x = { cle, etat:'a_venir', date:'', message:'' }; L.etapes.push(x); } return x; };
  box.querySelectorAll('[data-etape-etat]').forEach(el => el.onchange = () => {
    const cle = el.dataset.etapeEtat;
    if(el.value==='termine'){
      const reste = (L.taches||[]).filter(t => t.phase===cle && t.oblig && t.etat!=='fait');
      if(reste.length && !confirm(`Il reste ${reste.length} tâche${reste.length>1?'s':''} obligatoire${reste.length>1?'s':''} dans cette étape :\n\n${reste.map(t => '• '+t.libelle).join('\n')}\n\nMarquer l'étape comme terminée quand même ?`)){ el.value = etape(cle).etat; return; }
    }
    etape(cle).etat = el.value; enregistrerEspace(d); redessiner(true);
  });
  box.querySelectorAll('[data-tache-oblig]').forEach(b => b.onclick = () => { const t = L.taches[+b.dataset.tacheOblig]; t.oblig = !t.oblig; enregistrerEspace(d); redessiner(true); });
  box.querySelectorAll('[data-tache-vis]').forEach(b => b.onclick = () => { const t = L.taches[+b.dataset.tacheVis]; t.interne = !t.interne; enregistrerEspace(d); redessiner(); });
  box.querySelectorAll('[data-vers-doc]').forEach(b => b.onclick = () => { const doc = documentsDuDossier(d, ctxCourriers).find(x => x.type===b.dataset.versDoc); view.doc = doc?.cle || (b.dataset.versDoc==='resiliation' ? 'aucune-resiliation' : null); tab = 'courriers'; render(); window.scrollTo(0,0); });
  box.querySelectorAll('[data-prev-etape]').forEach(b => b.onclick = () => prevenirFamille(d, 'etape:'+b.dataset.prevEtape, { type:'etape', etape: etape(b.dataset.prevEtape) }));
  box.querySelectorAll('[data-prev-tache]').forEach(b => b.onclick = () => { const t = L.taches[+b.dataset.prevTache]; prevenirFamille(d, 'tache:'+(t.modele || t.libelle), { type:'tache', tache: t }); });
  const ppv = val('#prochain-prevenir'); if(ppv) ppv.onclick = () => prevenirFamille(d, 'rdv:'+L.prochain.date, { type:'rdv', prochain: L.prochain });
  const ocp = val('#oc-prevenir'); if(ocp) ocp.onclick = () => prevenirFamille(d, 'listing:'+(e.objets||[]).length, { type:'listing', nb: (e.objets||[]).length });
  const pc = val('#parcours-completer'); if(pc) pc.onclick = () => { const n = completerParcours(L.taches, d.formule); if(n){ enregistrerEspace(d); redessiner(true); } showToast(n ? `${n} tâche${n>1?'s':''} du parcours type ajoutée${n>1?'s':''}.` : 'Le parcours type est déjà complet.'); };
  box.querySelectorAll('[data-etape-date]').forEach(el => el.addEventListener('change', () => { etape(el.dataset.etapeDate).date = el.value; enregistrerEspace(d); }));
  box.querySelectorAll('[data-etape-msg]').forEach(el => el.addEventListener('input', () => { etape(el.dataset.etapeMsg).message = el.value; enregistrerEspace(d); }));

  // Tâches
  L.taches = L.taches || [];
  const SUITE = { a_faire:'en_cours', en_cours:'fait', fait:'a_faire' };
  box.querySelectorAll('[data-tache-etat]').forEach(b => b.onclick = () => { const t = L.taches[+b.dataset.tacheEtat]; t.etat = SUITE[t.etat] || 'en_cours'; enregistrerEspace(d); redessiner(); });
  box.querySelectorAll('[data-tache-qui]').forEach(b => b.onclick = () => { const t = L.taches[+b.dataset.tacheQui]; t.cote = t.cote==='famille' ? 'nous' : 'famille'; enregistrerEspace(d); redessiner(); });
  box.querySelectorAll('[data-tache]').forEach(el => el.addEventListener(el.type==='date' ? 'change' : 'input', () => { L.taches[+el.dataset.tache][el.dataset.champ] = el.value; enregistrerEspace(d); }));
  box.querySelectorAll('[data-tache-suppr]').forEach(b => b.onclick = () => { L.taches.splice(+b.dataset.tacheSuppr, 1); enregistrerEspace(d); redessiner(); });
  box.querySelectorAll('[data-tache-ajout]').forEach(b => b.onclick = () => { L.taches.push({ phase: b.dataset.tacheAjout, libelle:'', etat:'a_faire', date:'', cote:'nous' }); redessiner(); box.querySelector(`[data-tache="${L.taches.length-1}"][data-champ="libelle"]`)?.focus(); });

  // Pièces
  box.querySelectorAll('[data-piece]').forEach(el => el.addEventListener(el.tagName==='SELECT' ? 'change' : 'input', () => {
    const p = (L.pieces||[])[+el.dataset.piece]; if(!p) return;
    p[el.dataset.champ] = el.type==='number' ? (el.value==='' ? null : parseFloat(el.value)) : el.value; enregistrerEspace(d);
  }));
  box.querySelectorAll('[data-piece-suppr]').forEach(b => b.onclick = () => { L.pieces.splice(+b.dataset.pieceSuppr, 1); enregistrerEspace(d); redessiner(); });
  const pa = val('#piece-ajout'); if(pa) pa.onclick = () => { L.pieces = [...(L.pieces||[]), { nom:'', tri:'a_trier', conserves:0, dons:'', volume:null }]; redessiner(); box.querySelector(`[data-piece="${L.pieces.length-1}"][data-champ="nom"]`)?.focus(); };
  const pt = val('#pieces-type'); if(pt) pt.onclick = () => { const n = d.taille + 1; L.pieces = ['Séjour','Cuisine', ...Array.from({length: Math.max(1, n)}, (_, i) => `Chambre ${i+1}`), 'Salle de bain', ...(d.diag.cave ? ['Cave'] : [])].map(nom => ({ nom, tri:'a_trier', conserves:0, dons:'', volume:null })); enregistrerEspace(d); redessiner(); };

  // Journal
  box.querySelectorAll('[data-jtype] button').forEach(b => b.onclick = () => { e._jType = b.dataset.v; box.querySelectorAll('[data-jtype] button').forEach(x => x.setAttribute('aria-pressed', String(x===b))); });
  const ja = val('#j-ajout'); if(ja) ja.onclick = async () => {
    const titre = val('#j-titre').value.trim(); if(!titre){ showToast('Indiquez un titre.'); return; }
    await ouvrirSiNouveau(); ja.disabled = true;
    const q = val('#j-quand').value ? new Date(val('#j-quand').value).toISOString() : new Date().toISOString();
    const { data, error } = await sb.from('journal').insert({ dossier_id: d.id, type: e._jType || 'contact', titre, texte: val('#j-texte').value.trim(), quand: q }).select().single();
    ja.disabled = false;
    if(error){ showToast('Non ajouté : ' + error.message); return; }
    const prev = val('#j-prevenir')?.checked;
    e.journal = [data, ...(e.journal||[])].sort((a,b) => String(b.quand).localeCompare(String(a.quand))); tb.charge = false; redessiner(); showToast('Ajouté au journal.');
    if(prev) prevenirFamille(d, 'journal:'+data.id, { type:'journal', titre: data.titre, texte: data.texte });
  };
  box.querySelectorAll('[data-j-edit]').forEach(b => b.onclick = () => { e._jEdit = b.dataset.jEdit; redessiner(); });
  box.querySelectorAll('[data-j-annul]').forEach(b => b.onclick = () => { e._jEdit = null; redessiner(); });
  box.querySelectorAll('[data-j-enreg]').forEach(b => b.onclick = async () => {
    const titre = val('[data-jed="titre"]').value.trim(), texte = val('[data-jed="texte"]').value.trim(); if(!titre) return;
    const { data, error } = await sb.from('journal').update({ titre, texte }).eq('id', b.dataset.jEnreg).select().single();
    if(error){ showToast(error.message); return; }
    e.journal = e.journal.map(j => j.id===data.id ? data : j); e._jEdit = null; redessiner();
  });
  box.querySelectorAll('[data-j-suppr]').forEach(b => b.onclick = async () => {
    if(!b.dataset.ok){ b.dataset.ok = '1'; b.textContent = 'Confirmer'; return; }
    const { error } = await sb.from('journal').delete().eq('id', b.dataset.jSuppr);
    if(error){ showToast(error.message); return; }
    e.journal = e.journal.filter(j => j.id !== b.dataset.jSuppr); e._jEdit = null; redessiner();
  });

  // Décisions
  const ajChoix = () => { const i = val('#q-choix-in'), v = i.value.trim(); if(!v) return; e._choix = [...(e._choix||[]), v]; const q = val('#q-question').value; redessiner(); val('#q-question').value = q; val('#q-choix-in').focus(); };
  const qc = val('#q-choix-ajout'); if(qc){ qc.onclick = ajChoix; val('#q-choix-in').onkeydown = ev => { if(ev.key==='Enter'){ ev.preventDefault(); ajChoix(); } }; }
  box.querySelectorAll('[data-choix-suppr]').forEach(b => b.onclick = () => { const q = val('#q-question').value; e._choix.splice(+b.dataset.choixSuppr, 1); redessiner(); val('#q-question').value = q; });
  const qe = val('#q-envoyer'); if(qe) qe.onclick = async () => {
    const question = val('#q-question').value.trim(); if(!question){ showToast('Écrivez la question.'); return; }
    const prevQ = val('#q-prevenir')?.checked, choixQ = [...(e._choix||[])];
    await ouvrirSiNouveau(); qe.disabled = true;
    const { data, error } = await sb.from('decisions').insert({ dossier_id: d.id, question, choix: e._choix || [] }).select().single();
    qe.disabled = false;
    if(error){ showToast('Question non envoyée : ' + error.message); return; }
    await sb.from('journal').insert({ dossier_id: d.id, type: 'decision', titre: 'Question posée à la famille', texte: question });
    e.decisions = [data, ...(e.decisions||[])]; e._choix = []; tb.charge = false;
    const { data: j } = await sb.from('journal').select('*').eq('dossier_id', d.id).order('quand', { ascending:false }); if(j) e.journal = j;
    redessiner(true); showToast('Question posée : la famille la voit dans son espace.');
    if(prevQ) prevenirFamille(d, 'question:'+data.id, { type:'question', question, choix: choixQ });
  };
  const dp = val('#dp-ajout'); if(dp) dp.onclick = async () => {
    const question = val('#dp-question').value.trim(); if(!question){ showToast('Décrivez la décision.'); return; }
    await ouvrirSiNouveau();
    const { data, error } = await sb.from('decisions').insert({ dossier_id: d.id, question, statut: 'validee', reponse: val('#dp-reponse').value.trim() || 'Oui', decide_par: val('#dp-par').value.trim() || null, decide_le: new Date().toISOString() }).select().single();
    if(error){ showToast(error.message); return; }
    e.decisions = [data, ...(e.decisions||[])]; redessiner(); showToast('Décision notée.');
  };
  box.querySelectorAll('[data-dec-suppr]').forEach(b => b.onclick = async () => {
    if(!b.dataset.ok){ b.dataset.ok = '1'; b.textContent = '✓'; b.title = 'Toucher encore pour supprimer'; return; }
    const { error } = await sb.from('decisions').delete().eq('id', b.dataset.decSuppr);
    if(error){ showToast(error.message); return; }
    e.decisions = e.decisions.filter(x => x.id !== b.dataset.decSuppr); redessiner(true);
  });

  // Accès
  const acA = val('#ac-ajout'); if(acA) acA.onclick = async () => {
    const email = val('#ac-email').value.trim().toLowerCase();
    const role = val('[data-seg="ac-role"] [aria-pressed="true"]')?.dataset.v || 'proche';
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ showToast('Adresse e-mail invalide.'); return; }
    if(e.acces.some(x => x.email===email)){ showToast('Cette adresse a déjà accès.'); return; }
    await ouvrirSiNouveau();
    const { data, error } = await sb.from('dossier_acces').insert({ dossier_id: d.id, email, role }).select().single();
    if(error){ showToast("L'accès n'a pas pu être ajouté : " + error.message); return; }
    e.acces.push(data); redessiner(); showToast('Accès ajouté.');
  };
  box.querySelectorAll('[data-seg]').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
    g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x===b)));
    if(g.dataset.seg==='doc-type') espaces._type = b.dataset.v;
  }));
  const inviter = async (email) => {
    const { data: { session } } = await sb.auth.getSession();
    await ouvrirSiNouveau();
    let rep, corps = {};
    try{
      rep = await fetch('/api/inviter', { method:'POST', headers:{ 'content-type':'application/json', authorization:`Bearer ${session?.access_token||''}` }, body: JSON.stringify({ dossier_id: d.id, email }) });
      corps = await rep.json().catch(() => ({}));
    }catch(err){ showToast("Pas de réseau : l'invitation n'est pas partie."); return false; }
    if(!rep.ok){ showToast(corps.erreur || "L'invitation n'a pas pu être envoyée."); return false; }
    const x = e.acces.find(y => y.email===email); if(x) x.invite_le = corps.invite_le;
    return true;
  };
  box.querySelectorAll('[data-inviter]').forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = 'Envoi…'; if(await inviter(b.dataset.inviter)) showToast(`Invitation envoyée à ${b.dataset.inviter}.`); redessiner(); });
  const bi = val('#ac-inviter'); if(bi) bi.onclick = async () => { bi.disabled = true; bi.textContent = 'Envoi…'; let n = 0; for(const x of e.acces.filter(y => !y.invite_le)){ if(await inviter(x.email)) n++; else break; } if(n) showToast(n>1 ? `${n} invitations envoyées.` : 'Invitation envoyée.'); redessiner(); };
  box.querySelectorAll('[data-retirer]').forEach(b => b.onclick = async () => {
    if(!b.dataset.ok){ b.dataset.ok = '1'; b.textContent = 'Confirmer'; return; }
    const { error } = await sb.from('dossier_acces').delete().eq('dossier_id', d.id).eq('email', b.dataset.retirer);
    if(error){ showToast(error.message); return; }
    e.acces = e.acces.filter(x => x.email !== b.dataset.retirer); redessiner(); showToast('Accès retiré.');
  });

  // Photos partagées, moment, couverture
  box.querySelectorAll('[data-partage]').forEach(cb => cb.onchange = async () => {
    const chemin = cb.dataset.partage; await ouvrirSiNouveau();
    if(cb.checked){
      const { data, error } = await sb.from('photos_partagees').insert({ dossier_id: d.id, chemin, ordre: e.photos.length }).select().single();
      if(error){ cb.checked = false; showToast('Photo non publiée : ' + error.message); return; }
      e.photos.push(data);
    } else {
      const { error } = await sb.from('photos_partagees').delete().eq('dossier_id', d.id).eq('chemin', chemin);
      if(error){ cb.checked = true; showToast(error.message); return; }
      e.photos = e.photos.filter(x => x.chemin !== chemin);
    }
    redessiner();
  });
  box.querySelectorAll('[data-moment]').forEach(s => s.onchange = async () => {
    const { error } = await sb.from('photos_partagees').update({ moment: s.value || null }).eq('dossier_id', d.id).eq('chemin', s.dataset.moment);
    if(error){ showToast(error.message); return; }
    const p = e.photos.find(x => x.chemin===s.dataset.moment); if(p) p.moment = s.value || null;
  });
  box.querySelectorAll('[data-couv]').forEach(r => r.onchange = () => { L.couverture = r.dataset.couv; enregistrerEspace(d); showToast('Photo de couverture choisie.'); });

  // Documents
  const publier = async (chemin, type, nom) => {
    await ouvrirSiNouveau();
    const { data, error } = await sb.from('documents').upsert({ dossier_id: d.id, chemin, type, nom, date: new Date().toISOString() }, { onConflict: 'dossier_id,chemin' }).select().single();
    if(error){ showToast('Document non publié : ' + error.message); return; }
    e.docs = [...e.docs.filter(x => x.chemin !== chemin), data]; redessiner(); showToast('Document publié dans l\'espace client.');
  };
  const dd = val('#doc-devis'); if(dd) dd.onclick = async () => { try{ showToast('Préparation du devis…'); const chemin = await deposerDevis(d); await publier(chemin, 'devis', `Devis ${devisNo(d)}${d.signature?' signé':''}`); }catch(err){ showToast('Le devis n\'a pas pu être publié.'); } };
  const df = val('#doc-fichier'); if(df) df.onchange = async (ev) => {
    const f = ev.target.files[0]; if(!f) return;
    if(f.size > 25*1024*1024){ showToast('Fichier trop lourd (25 Mo au plus).'); return; }
    const propre = f.name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-80);
    const chemin = `${d.id}/${Date.now().toString(36)}-${propre}`;
    const { error } = await sb.storage.from('documents').upload(chemin, f, { contentType: f.type });
    if(error){ showToast('Envoi impossible : ' + error.message); return; }
    await publier(chemin, espaces._type || 'facture', f.name.replace(/\.[^.]+$/, ''));
  };
  box.querySelectorAll('[data-voir]').forEach(b => b.onclick = async () => {
    const w = window.open('', '_blank');
    const { data, error } = await sb.storage.from('documents').createSignedUrl(b.dataset.voir, 300);
    if(error || !data?.signedUrl){ w?.close(); showToast('Document introuvable.'); return; }
    if(w) w.location = data.signedUrl; else location.href = data.signedUrl;
  });
  box.querySelectorAll('[data-retdoc]').forEach(b => b.onclick = async () => {
    if(!b.dataset.ok){ b.dataset.ok = '1'; b.textContent = 'Confirmer'; return; }
    const doc = e.docs.find(x => String(x.id) === b.dataset.retdoc);
    const { error } = await sb.from('documents').delete().eq('id', b.dataset.retdoc);
    if(error){ showToast(error.message); return; }
    if(doc && doc.type !== 'devis') await sb.storage.from('documents').remove([doc.chemin]);
    e.docs = e.docs.filter(x => x !== doc); redessiner(); showToast('Document retiré de l\'espace client.');
  });

  // Objets conservés (jusqu'à 3 photos chacun)
  const envoyerPhotoObjet = async (blob) => {
    const chemin = `${d.id}/oc-${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}.jpg`;
    const { error } = await sb.storage.from('photos').upload(chemin, blob, { contentType: 'image/jpeg' });
    if(error) throw error;
    urlsPhotos[chemin] = URL.createObjectURL(blob); return chemin;
  };
  const ocInput = val('#oc-photo');
  if(ocInput) ocInput.onchange = async () => {
    const fs = [...(ocInput.files||[])].slice(0, 3 - (e._ocPhotos||[]).length);
    e._ocPhotos = [...(e._ocPhotos||[]), ...(await Promise.all(fs.map(reduireImage)))].slice(0, 3);
    val('#oc-photo-etat').textContent = `${e._ocPhotos.length} photo${e._ocPhotos.length>1?'s':''} prête${e._ocPhotos.length>1?'s':''} : ${e._ocPhotos.length>1?'elles seront envoyées':'elle sera envoyée'} avec l'objet.`;
  };
  const ocAjout = val('#oc-ajout');
  if(ocAjout) ocAjout.onclick = async () => {
    const nom = val('#oc-nom').value.trim(); if(!nom){ showToast('Indiquez l\'objet.'); return; }
    if(!navigator.onLine){ showToast('Ajout impossible hors connexion.'); return; }
    await ouvrirSiNouveau(); ocAjout.disabled = true;
    let photos = [];
    try{ for(const b of (e._ocPhotos||[])) photos.push(await envoyerPhotoObjet(b)); }
    catch(err){ ocAjout.disabled = false; showToast('Photo non envoyée : ' + err.message); return; }
    const { data, error } = await sb.from('objets_conserves').insert({ dossier_id: d.id, nom, piece: val('#oc-piece').value.trim(), destinataire: val('#oc-dest').value.trim(), photos, photo: photos[0] || null, ordre: (e.objets||[]).length }).select().single();
    ocAjout.disabled = false;
    if(error){ showToast('Objet non ajouté : ' + error.message); return; }
    e.objets.push(data); e._ocPhotos = []; redessiner(true); showToast('Objet ajouté.');
  };
  box.querySelectorAll('[data-oc-ph]').forEach(inp => inp.onchange = async () => {
    const x = e.objets.find(y => y.id === inp.dataset.ocPh), f = inp.files?.[0]; if(!x || !f) return;
    try{
      const ch = await envoyerPhotoObjet(await reduireImage(f));
      const photos = [...((x.photos||[]).length ? x.photos : [x.photo]).filter(Boolean), ch].slice(0, 3);
      const { data, error } = await sb.from('objets_conserves').update({ photos, photo: photos[0] }).eq('id', x.id).select().single();
      if(error) throw error;
      Object.assign(x, data); redessiner(true);
    }catch(err){ showToast('Photo non ajoutée : ' + (err.message||'')); }
  });
  box.querySelectorAll('[data-oc-ph-suppr]').forEach(b => b.onclick = async () => {
    const x = e.objets.find(y => y.id === b.dataset.ocPhSuppr); if(!x) return;
    const photos = ((x.photos||[]).length ? x.photos : [x.photo]).filter(c => c && c !== b.dataset.ch);
    const { data, error } = await sb.from('objets_conserves').update({ photos, photo: photos[0] || null }).eq('id', x.id).select().single();
    if(error){ showToast(error.message); return; }
    await sb.storage.from('photos').remove([b.dataset.ch]);
    Object.assign(x, data); redessiner(true);
  });
  box.querySelectorAll('[data-oc]').forEach(inp => inp.addEventListener('change', async () => {
    const x = e.objets.find(y => y.id === inp.dataset.oc); if(!x) return;
    const champ = inp.dataset.ocChamp, v = inp.value.trim();
    if(champ === 'nom' && !v){ inp.value = x.nom; return; }
    if((x[champ]||'') === v) return;
    const { data, error } = await sb.from('objets_conserves').update({ [champ]: v }).eq('id', x.id).select().single();
    if(error){ showToast(error.message); inp.value = x[champ]||''; return; }
    Object.assign(x, data); redessiner(true);
  }));
  box.querySelectorAll('[data-oc-retirer]').forEach(b => b.onclick = async () => {
    if(!b.dataset.ok){ b.dataset.ok = '1'; b.textContent = '✓'; b.title = 'Toucher encore pour retirer'; return; }
    const x = e.objets.find(y => y.id === b.dataset.ocRetirer);
    const { error } = await sb.from('objets_conserves').delete().eq('id', x.id);
    if(error){ showToast(error.message); return; }
    const chemins = [...new Set([...(x.photos||[]), x.photo].filter(Boolean))]; if(chemins.length) await sb.storage.from('photos').remove(chemins);
    e.objets = e.objets.filter(y => y !== x); redessiner(true); showToast('Objet retiré.');
  });
  const ocPdf = val('#oc-pdf');
  if(ocPdf) ocPdf.onclick = async () => {
    ocPdf.disabled = true; showToast('Préparation du PDF…');
    try{
      const blob = await objetsPdf(d, e.objets);
      const chemin = `${d.id}/objets-conserves.pdf`;
      const { error } = await sb.storage.from('documents').upload(chemin, blob, { contentType: 'application/pdf', upsert: true });
      if(error) throw error;
      await publier(chemin, 'autre', 'Listing des objets conservés');
    }catch(err){ showToast('Le listing n\'a pas pu être publié.'); }
    ocPdf.disabled = false;
  };
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
    if(bd.dataset.confirm){ removeDossier(d.id); view={name:'list'}; render(); window.scrollTo(0,0); }
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
  app.innerHTML = header('Réglages') + `<div class="row"><button class="btn ghost" type="button" id="b-carnet">Carnet d'adresses</button><button class="btn ghost" type="button" id="b-registre">Registre des bons</button></div>
  <div class="card"><h3>Société (mentions du devis PDF)</h3><label>Commune du siège (point de départ des distances)<select data-st="siegeVille">${Object.keys(COORDS).filter(k=>COORDS[k]).map(v=>`<option ${v===so.siegeVille?'selected':''}>${esc(v)}</option>`).join('')}</select></label>${tf('adresse','Adresse du siège')}<div class="grid2">${tf('siret','SIRET')}${tf('rcs','RCS')}${tf('tva','N° de TVA')}${tf('tel','Téléphone')}</div>${tf('email','E-mail')}${tf('mediateur','Médiateur de la consommation')}${tf('signataire','Signataire pour la société')}</div>
  <div class="card"><h3>Prix TTC (1-2 p. / 3 p. / 4 p. / 5 p.+)</h3>${grid('grids.L','Clés en main')}${grid('grids.T','Nouveau départ')}${grid('grids.S','Succession')}
  <div class="grid2">${f('m3Sup','Volume en plus, €/m³ TTC','1')}${f('residence','Recherche de résidence','1')}${f('gardiennage','Gardiennage, €/mois','1')}${f('urgence','Urgence, %','1')}</div>
  <div class="suggest">Ces prix (Clés en main, Nouveau départ, Succession, volume en plus, recherche de résidence, gardiennage, urgence) sont aussi ceux du site : simulateur, page Tarifs, pages des formules. Après une modification, mettez le site à jour.</div>
  <button class="btn" id="b-prix-site" type="button">Mettre à jour les prix du site</button></div>
  <div class="card"><h3>Fil Bleu Pro (HT)</h3>${grid('proNettoyage','Nettoyage seul (jusqu\'à 30 m² / 55 m² / 75 m² / 100 m²)')}<div class="grid2">${PRO_OPTS.map(([k,l,u])=>`<label>${esc(l)}, € HT/${u}<input type="number" inputmode="decimal" step="0.5" data-s="proOpts.${k}.0" value="${(S.proOpts?.[k]||DEFAULTS.proOpts[k])[0]}"></label>`).join('')}</div><div class="grid2">${f('proForfait','Forfait d\'intervention','1')}${f('proM3','Débarras au-delà du forfait, €/m³','1')}${f('proM3Inclus','m³ compris dans le forfait','1')}</div></div>
  <div class="card"><h3>Coûts</h3><div class="grid2">${f('interim','Intérim, €/h')}${f('porteur','Vos heures, €/h chargé')}${f('decheterie','Déchèterie, €/m³')}${f('camionJour','Camion, €/jour','1')}${f('kmCout','Trajet, €/km')}${f('consommables','Consommables par chantier','1')}</div></div>
  <div class="card"><h3>Rythmes de travail</h3><div class="grid2">${f('rythmeM3','Débarras, h/m³')}${f('rythmeM2','Nettoyage, h/m²')}${f('baie','Baie vitrée, h')}${f('partPorteur','Votre part des heures (0 à 1)')}</div>
  <p class="small muted" style="margin:0">Après vos 5 premiers chantiers, remplacez le rythme prudent (1,3 h/m³) par votre vraie vitesse.</p></div>
  <div class="card"><h3>Dossier de démonstration</h3>
    <p class="small muted" style="margin:0">Un faux dossier « Succession » complet (tâches, journal, décisions, listing d'objets) pour voir l'espace client comme une famille. Pour vous connecter comme un client : page <b>Espace client</b> du site, adresse <b>${esc(DEMO_EMAIL)}</b>, le code arrive dans votre Gmail. Il n'apparaît pas dans les chiffres de l'accueil. Supprimez-le avant l'ouverture.</p>
    <div class="row">${dossiers[DEMO_ID] ? `<button class="btn ghost" type="button" data-ouvrir-demo>Ouvrir le dossier</button><a class="btn ghost" href="/espace-client#apercu=${DEMO_ID}" target="_blank" rel="noopener">Voir comme la famille</a><button class="btn ghost" type="button" id="b-demo">Remettre à zéro</button><button class="btn ghost" type="button" id="b-demo-suppr">Supprimer</button>` : '<button class="btn" type="button" id="b-demo">Créer le dossier de démo</button>'}</div></div>
  <button class="btn ghost" id="b-reset">Revenir aux réglages d'origine</button>
  <div class="card"><h3>Sauvegarde</h3><p class="small muted" style="margin:0">Téléchargez tous vos dossiers et réglages dans un fichier (format JSON). Gardez-le en lieu sûr : il contient des données personnelles de vos clients. Les photos et documents restent dans le stockage en ligne.</p>
    <button class="btn ghost" id="b-export" type="button">Exporter mes dossiers</button></div>
  <div class="card"><h3>Mon compte</h3><p class="small muted" style="margin:0">Connecté : ${esc(utilisateur?.email||'')}</p>
    <button class="btn ghost" id="b-mdp">Choisir ou changer mon mot de passe</button>
    <button class="btn danger" id="b-deco">Se déconnecter de cet appareil</button></div>`;
  $('#b-export').onclick = async () => {
    let liste = Object.values(dossiers);
    if(navigator.onLine){ try{ await viderFile(); await chargerDistant(); liste = Object.values(dossiers); }catch(e){} }
    const contenu = JSON.stringify({ export: 'Fil Bleu Dossiers', date: new Date().toISOString(), nombre: liste.length, reglages: S, dossiers: liste }, null, 2);
    const u = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = u; a.download = `fil-bleu-dossiers-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    showToast(`${liste.length} dossier${liste.length>1?'s':''} exporté${liste.length>1?'s':''}.`);
  };
  $('#b-carnet').onclick = () => { view = { name:'carnet' }; render(); window.scrollTo(0,0); };
  $('#b-registre').onclick = () => { view = { name:'registre' }; render(); window.scrollTo(0,0); };
  $('#b-mdp').onclick = () => actions.motDePasse();
  $('#b-deco').onclick = () => actions.deconnexion();
  app.querySelectorAll('[data-s]').forEach(el => el.addEventListener('change', () => { setPath(S, el.dataset.s, parseFloat(el.value)||0); persistSettings(); showToast('Réglage enregistré.'); }));
  app.querySelectorAll('[data-st]').forEach(el => el.addEventListener('change', () => { S.soc = {...DEFAULTS.soc, ...(S.soc||{}), [el.dataset.st]: el.value.trim()}; persistSettings(); showToast('Réglage enregistré.'); }));
  const bDemo = $('#b-demo');
  if(bDemo) bDemo.onclick = async () => {
    if(!navigator.onLine){ showToast('Connexion nécessaire pour créer le dossier de démo.'); return; }
    if(dossiers[DEMO_ID] && !confirm('Remettre le dossier de démo dans son état d\'origine ? Vos essais dessus (réponses, signatures, notes) seront effacés.')) return;
    bDemo.disabled = true; bDemo.textContent = 'Préparation…';
    try{ const d = await creerDemo(sb, newDossier(), envoyer); dossiers[DEMO_ID] = d; localSet(K_CACHE, dossiers); delete espaces[DEMO_ID]; tb.charge = false; showToast(`Dossier de démo prêt. Connexion sur le site avec ${DEMO_EMAIL}.`); }
    catch(e){ console.warn(e); showToast("Le dossier de démo n'a pas pu être créé. Réessayez dans un instant."); }
    render();
  };
  const bDemoSuppr = $('#b-demo-suppr');
  if(bDemoSuppr) bDemoSuppr.onclick = async () => { if(!confirm('Supprimer le dossier de démo ?')) return; await removeDossier(DEMO_ID); tb.charge = false; showToast('Dossier de démo supprimé.'); render(); };
  app.querySelector('[data-ouvrir-demo]')?.addEventListener('click', () => { view = {name:'dossier', id:DEMO_ID}; tab = 'synthese'; render(); });
  $('#b-reset').onclick =() => { S = structuredClone(DEFAULTS); persistSettings(); render(); };
  $('#b-prix-site').onclick = async (e) => {
    const b = e.currentTarget; if(!navigator.onLine){ showToast('Pas de réseau : réessayez plus tard.'); return; }
    b.disabled = true; b.textContent = 'Mise à jour en cours…';
    let ok = false, msg = '';
    try{
      await persistSettings();
      const { data: { session } } = await sb.auth.getSession();
      const r = await fetch('/api/republier', { method:'POST', headers:{ authorization:`Bearer ${session?.access_token||''}` } });
      const j = await r.json().catch(()=>({})); ok = r.ok; msg = j.erreur||'';
    }catch(err){ msg = navigator.onLine ? 'La mise à jour du site a échoué.' : 'Pas de réseau.'; }
    finally{ b.disabled = false; b.textContent = 'Mettre à jour les prix du site'; }
    showToast(ok ? 'C\'est parti : le site affichera les nouveaux prix d\'ici 1 à 2 minutes.' : (msg || 'La mise à jour du site a échoué.'));
  };
}

let toastT; function showToast(t){ let el = $('#toast'); if(!el){ el = document.createElement('div'); el.id='toast'; el.setAttribute('role','status'); el.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom,0px));background:var(--ink);color:var(--paper);padding:10px 16px;border-radius:999px;font-size:14px;z-index:9'; document.body.appendChild(el); } el.textContent=t; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>el.hidden=true,2200); }

function startNettoyage(){ const d = newDossier(); d.situation='vide'; d.formule='P'; d.client='agence'; d.diag.volume=0; d.diag.evac=100; persist(d); view={name:'dossier', id:d.id}; tab='appel'; render(); window.scrollTo(0,0); }
function startNew(){ const d = newDossier(); d.formule = suggest(d); persist(d); view={name:'dossier', id:d.id}; tab='appel'; render(); window.scrollTo(0,0); }


/* ---------- Démarrage ---------- */
document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => { view = {name: b.dataset.nav}; if(b.dataset.nav==='accueil') tb.charge = false; render(); window.scrollTo(0,0); });
['#nav-new', '#bnav-new'].forEach(s => { const b = $(s); if(b) b.onclick = startNew; });
// Bons d'intervention et registre des déchets : module à part, qui réutilise le générateur PDF et les calculs du devis.
bonsApi = creerBons({ sb, $, esc, eur, num, showToast, makePdf, wrap, tw, dataUrlBytes, imgSize, calc, devisNo, persist, header, majBandeau, rerender,
  soc: () => ({...DEFAULTS.soc, ...(S.soc||{})}), dossiers: () => dossiers,
  setView: (v, t) => { view = v; if(t) tab = t; render(); } });
document.querySelector('nav.bottom').hidden = false;
const side = document.getElementById('side'); if(side){ side.hidden = false; document.getElementById('shell')?.classList.remove('sans-menu'); }
const moi = document.getElementById('side-moi'); if(moi) moi.textContent = utilisateur?.email ? `Connecté : ${utilisateur.email}` : '';
// Lien direct vers un dossier (ex. depuis l'e-mail d'une demande du site : /admin#dossier=<référence>).
const cible = new URLSearchParams(location.hash.slice(1)).get('dossier');
const ouvrirCible = () => { if(cible && dossiers[cible] && view.name==='accueil'){ view = {name:'dossier', id:cible}; tab='appel'; history.replaceState(null, '', '/admin'); return true; } return false; };
loadLocal(); ouvrirCible(); render();
/* ---------- Rechargement depuis le serveur ----------
   L'envoi des modifications en attente et le rechargement des dossiers sont indépendants : un échec
   d'envoi (photo, bon…) n'empêche plus de voir les nouveaux dossiers. Un échec de rechargement reste
   affiché dans le bandeau (avec « Réessayer ») au lieu d'un message de 2 secondes. */
let actualisationEnCours = null;
function actualiser({ manuel = false, demarrage = false } = {}){
  if(actualisationEnCours) return actualisationEnCours;
  actualisationEnCours = (async () => {
    const bouton = document.getElementById('side-actualiser'); bouton?.setAttribute('aria-busy', 'true');
    if(!navigator.onLine){ majBandeau(); if(manuel) showToast('Hors ligne : impossible de recharger pour le moment.'); return; }
    const avant = new Set(Object.keys(dossiers));
    try{ await viderFile(); }catch(e){ console.warn('Envoi des modifications en attente :', e); }
    try{
      await chargerDistant();
      erreurSync = ''; derniereSync = Date.now(); tb.charge = false;
    }catch(e){
      console.warn('Rechargement des dossiers :', e);
      erreurSync = "Les dossiers n'ont pas pu être rechargés depuis le serveur : ceux affichés sont ceux gardés sur l'appareil et peuvent dater.";
      if(demarrage) render();
      return;
    }
    const nouveaux = Object.keys(dossiers).filter(id => !avant.has(id));
    if(demarrage){ ouvrirCible(); render(); if(cible && !dossiers[cible]) showToast("Ce dossier n'existe pas (ou plus)."); }
    else rerender();
    if(nouveaux.length && avant.size) showToast(nouveaux.length > 1 ? `${nouveaux.length} nouveaux dossiers.` : `Nouveau dossier : ${nomDossier(nouveaux[0])}.`);
    else if(manuel) showToast('Dossiers à jour.');
  })().finally(() => { actualisationEnCours = null; document.getElementById('side-actualiser')?.removeAttribute('aria-busy'); majBandeau(); });
  return actualisationEnCours;
}
(async () => {
  await compterPhotosEnAttente(); majBandeau();
  await actualiser({ demarrage: true });
})();
document.getElementById('side-actualiser')?.addEventListener('click', () => actualiser({ manuel: true }));
document.getElementById('etat-reseau')?.addEventListener('click', e => { if(e.target.closest('[data-actualiser]')) actualiser({ manuel: true }); });
addEventListener('online', () => { majBandeau(); actualiser(); });
addEventListener('offline', majBandeau);
const actualisationPossible = () => document.visibilityState === 'visible' && navigator.onLine && !Object.keys(saveTimers).length;
document.addEventListener('visibilitychange', () => { if(actualisationPossible()) actualiser(); });
// Toutes les 2 minutes tant que l'appli est au premier plan (sans gêner une saisie : rerender attend).
setInterval(() => { if(actualisationPossible() && Date.now() - derniereSync > 100e3) actualiser(); }, 120e3);
return { viderCache(){ [K_CACHE, K_FILE, K_SUPPR, K_REGL].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} }); bonsApi?.viderCache(); } };
}
