-- Tests des règles d'accès (à lancer avec : npm run test:acces).
-- Tout se passe dans une transaction annulée à la fin : aucune donnée ne reste dans la base.
-- Chaque vérification lève une erreur « ÉCHEC … » si une règle laisse passer ce qu'elle ne devrait pas.

begin;

-- ---------- Données d'essai (créées en tant que propriétaire de la base) ----------
insert into public.admins (email) values ('admin@essai.test');
insert into public.dossiers (id, statut, formule, data) values
  ('dA', 'Signé', 'S', '{"suivi":{"honoraires":12500},"notes":"note interne A"}'),
  ('dB', 'Appel', 'T', '{"notes":"note interne B"}');
insert into public.reglages (id, data) values (1,
  '{"grids":{"L":[1560,2550,3160,4340],"T":[3200,4200,4900,6700],"S":[2600,3900,4600,6300]},
    "m3Sup":75,"residence":700,"installation":[350,400,720,880],"gardiennage":150,"urgence":25,
    "interim":21.64,"porteur":28,"partCom":0.7,"proNettoyage":[225,325,375,540]}');
insert into public.dossier_acces (dossier_id, email, role) values
  ('dA', 'famille.a@essai.test', 'titulaire'),
  ('dA', 'proche.a@essai.test', 'proche'),
  ('dB', 'famille.b@essai.test', 'titulaire');
insert into public.espace_client (dossier_id, formule, ville, etapes) values
  ('dA', 'S', 'Marseille', '[{"cle":"diagnostic","etat":"termine"}]'),
  ('dB', 'T', 'Aubagne', '[]');
insert into public.photos_partagees (dossier_id, chemin) values ('dA', 'dA/salon.jpg'), ('dB', 'dB/cuisine.jpg');
insert into public.documents (dossier_id, chemin, type, nom) values
  ('dA', 'dA/devis.pdf', 'devis', 'Devis signé'), ('dB', 'dB/devis.pdf', 'devis', 'Devis');
insert into storage.objects (bucket_id, name) values
  ('photos', 'dA/salon.jpg'), ('photos', 'dA/non-partagee.jpg'), ('photos', 'dB/cuisine.jpg'),
  ('documents', 'dA/devis.pdf'), ('documents', 'dB/devis.pdf');

-- ---------- 1. Visiteur non connecté (anon) ----------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  begin perform 1 from public.dossiers; raise exception 'ÉCHEC 1a : anon lit dossiers';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.reglages; raise exception 'ÉCHEC 1b : anon lit reglages';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.espace_client; raise exception 'ÉCHEC 1c : anon lit espace_client';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.dossier_acces; raise exception 'ÉCHEC 1d : anon lit dossier_acces';
  exception when insufficient_privilege then null; end;
  if (select count(*) from storage.objects where bucket_id in ('photos','documents')) <> 0 then
    raise exception 'ÉCHEC 1e : anon voit des fichiers'; end if;
  -- Prix publics : grilles visibles, coûts et marge jamais.
  if public.prix_publics() -> 'grids' -> 'S' ->> 0 <> '2600' then raise exception 'ÉCHEC 1f : prix publics absents'; end if;
  if public.prix_publics() ->> 'gardiennage' <> '150' then raise exception 'ÉCHEC 1g : gardiennage absent'; end if;
  if public.prix_publics() ?| array['interim','porteur','partCom','proNettoyage'] then
    raise exception 'ÉCHEC 1h : prix_publics révèle des données internes'; end if;
end $$;
reset role;

-- ---------- 2. Famille A (connectée, dossier dA) ----------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"Famille.A@essai.test","aal":"aal1"}';
do $$ begin
  if (select count(*) from public.dossiers) <> 0 then raise exception 'ÉCHEC 2a : la famille lit dossiers'; end if;
  if (select count(*) from public.reglages) <> 0 then raise exception 'ÉCHEC 2b : la famille lit reglages'; end if;
  if (select count(*) from public.admins) <> 0 then raise exception 'ÉCHEC 2c : la famille lit admins'; end if;
  if (select string_agg(dossier_id, ',' order by dossier_id) from public.espace_client) is distinct from 'dA' then
    raise exception 'ÉCHEC 2d : espace_client ne montre pas uniquement dA'; end if;
  if (select count(*) from public.dossier_acces) <> 1 then
    raise exception 'ÉCHEC 2e : la famille voit les accès des autres (ou ses proches)'; end if;
  if (select string_agg(chemin, ',') from public.photos_partagees) is distinct from 'dA/salon.jpg' then
    raise exception 'ÉCHEC 2f : photos partagées incorrectes'; end if;
  if (select string_agg(chemin, ',') from public.documents) is distinct from 'dA/devis.pdf' then
    raise exception 'ÉCHEC 2g : documents incorrects'; end if;
  -- Fichiers : la photo partagée et le devis de dA, rien d'autre (ni la photo non partagée, ni dB).
  if (select string_agg(bucket_id || ':' || name, ',' order by bucket_id, name) from storage.objects
      where bucket_id in ('photos','documents')) is distinct from 'documents:dA/devis.pdf,photos:dA/salon.jpg' then
    raise exception 'ÉCHEC 2h : fichiers visibles incorrects'; end if;
  -- Écritures interdites.
  update public.espace_client set ville = 'piratée' where dossier_id = 'dA';
  if found then raise exception 'ÉCHEC 2i : la famille modifie espace_client'; end if;
  update public.dossiers set statut = 'Perdu';
  if found then raise exception 'ÉCHEC 2j : la famille modifie dossiers'; end if;
  begin
    insert into public.dossier_acces (dossier_id, email) values ('dB', 'famille.a@essai.test');
    raise exception 'ÉCHEC 2k : la famille s''ajoute un accès';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.photos_partagees (dossier_id, chemin) values ('dA', 'dA/non-partagee.jpg');
    raise exception 'ÉCHEC 2l : la famille partage une photo elle-même';
  exception when insufficient_privilege then null; end;
  delete from public.documents;
  if found then raise exception 'ÉCHEC 2m : la famille supprime des documents'; end if;
  begin
    insert into public.admins (email) values ('famille.a@essai.test');
    raise exception 'ÉCHEC 2n : la famille se déclare administrateur';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ---------- 3. Un proche de A voit aussi dA ----------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a2","email":"proche.a@essai.test","aal":"aal1"}';
do $$ begin
  if (select string_agg(dossier_id, ',') from public.espace_client) is distinct from 'dA' then
    raise exception 'ÉCHEC 3a : le proche ne voit pas dA'; end if;
end $$;
reset role;

-- ---------- 4. Famille B ne voit que dB ----------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000b","email":"famille.b@essai.test","aal":"aal1"}';
do $$ begin
  if (select string_agg(dossier_id, ',') from public.espace_client) is distinct from 'dB' then
    raise exception 'ÉCHEC 4a : la famille B ne voit pas uniquement dB'; end if;
  if exists (select 1 from storage.objects where name like 'dA/%') then
    raise exception 'ÉCHEC 4b : la famille B voit des fichiers de dA'; end if;
end $$;
reset role;

-- ---------- 5. Inconnu connecté : rien ----------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ff","email":"inconnu@essai.test","aal":"aal2"}';
do $$ begin
  if (select count(*) from public.espace_client) + (select count(*) from public.documents)
     + (select count(*) from public.photos_partagees) + (select count(*) from public.dossier_acces) <> 0 then
    raise exception 'ÉCHEC 5a : un inconnu voit des données'; end if;
end $$;
reset role;

-- ---------- 6. Administrateur sans double authentification : rien ----------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001","email":"admin@essai.test","aal":"aal1"}';
do $$ begin
  if (select count(*) from public.dossiers) <> 0 then raise exception 'ÉCHEC 6a : admin sans MFA lit dossiers'; end if;
  if not public.est_admin_sans_mfa() then raise exception 'ÉCHEC 6b : admin non reconnu avant MFA'; end if;
end $$;
reset role;

-- ---------- 7. Administrateur avec double authentification : tout ----------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001","email":"admin@essai.test","aal":"aal2"}';
do $$ begin
  if (select count(*) from public.dossiers) <> 2 then raise exception 'ÉCHEC 7a : admin ne lit pas dossiers'; end if;
  if (select count(*) from public.reglages) <> 1 then raise exception 'ÉCHEC 7b : admin ne lit pas reglages'; end if;
  update public.espace_client set ville = 'Cassis' where dossier_id = 'dB';
  if not found then raise exception 'ÉCHEC 7c : admin ne modifie pas espace_client'; end if;
  if (select count(*) from storage.objects where bucket_id in ('photos','documents')) <> 5 then
    raise exception 'ÉCHEC 7d : admin ne voit pas tous les fichiers'; end if;
end $$;
reset role;

rollback;

select 'TOUS LES TESTS D''ACCÈS SONT PASSÉS' as resultat;
