-- Tests des règles d'accès (à lancer avec : npm run test:acces).
-- Tout se passe dans une transaction annulée à la fin : aucune donnée ne reste dans la base,
-- et les vraies données (réglages, dossiers) ne sont pas modifiées.
-- Chaque vérification lève une erreur « ÉCHEC … » si une règle laisse passer ce qu'elle ne devrait pas.

begin;

-- ---------- Données d'essai (créées en tant que propriétaire de la base) ----------
insert into public.admins (email) values ('admin@essai.test') on conflict do nothing;
insert into public.dossiers (id, statut, formule, data) values
  ('dA', 'Signé', 'S', '{"suivi":{"honoraires":12500},"notes":"note interne A"}'),
  ('dB', 'Appel', 'T', '{"notes":"note interne B"}');
insert into public.reglages (id, data) values (1,
  '{"grids":{"L":[1560,2550,3160,4340],"T":[3200,4200,4900,6700],"S":[2600,3900,4600,6300]},
    "m3Sup":75,"residence":700,"installation":[350,400,720,880],"gardiennage":150,"urgence":25,
    "interim":21.64,"porteur":28,"partCom":0.7,"proNettoyage":[225,325,375,540]}')
  on conflict (id) do update set data = excluded.data;   -- annulé par le rollback final
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
  if (select count(*) from public.dossiers where id in ('dA','dB')) <> 2 then raise exception 'ÉCHEC 7a : admin ne lit pas dossiers'; end if;
  if (select count(*) from public.reglages) <> 1 then raise exception 'ÉCHEC 7b : admin ne lit pas reglages'; end if;
  update public.espace_client set ville = 'Cassis' where dossier_id = 'dB';
  if not found then raise exception 'ÉCHEC 7c : admin ne modifie pas espace_client'; end if;
  if (select count(*) from storage.objects where bucket_id in ('photos','documents') and split_part(name,'/',1) in ('dA','dB')) <> 5 then
    raise exception 'ÉCHEC 7d : admin ne voit pas tous les fichiers'; end if;
end $$;
reset role;

-- ---------- 8. Bons d'intervention : verrou après signature, signature du client à distance ----------
insert into public.bons (id, dossier_id, numero, marque, data) values
  ('bA', 'dA', 'BI-2099-0001', 'famille', '{"observations":"brouillon","dechets":[{"nature":"mobilier","cout":40}],"signatures":{}}');
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"famille.a@essai.test","aal":"aal1"}';
do $$ begin
  if exists (select 1 from public.bons) then raise exception 'ÉCHEC 8a : une famille lit la table bons'; end if;
  if jsonb_array_length(public.bon_a_signer()) <> 0 then raise exception 'ÉCHEC 8b : bon non signé par Fil Bleu proposé au client'; end if;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001","email":"admin@essai.test","aal":"aal2"}';
do $$ begin
  update public.bons set data = data || '{"observations":"modifié avant signature"}' where id = 'bA';
  update public.bons set data = jsonb_set(data, '{signatures}', '{"porteur":{"nom":"Essai","img":"x","date":"2099-01-01T10:00:00Z"},"distance":{"email":"famille.a@essai.test"}}') where id = 'bA';
  begin
    update public.bons set data = data || '{"observations":"modifié après signature"}' where id = 'bA';
    raise exception 'ÉCHEC 8c : bon modifié après la signature de Fil Bleu';
  exception when raise_exception then if sqlerrm like 'ÉCHEC%' then raise; end if; end;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000b","email":"famille.b@essai.test","aal":"aal1"}';
do $$ begin
  if jsonb_array_length(public.bon_a_signer()) <> 0 then raise exception 'ÉCHEC 8d : la famille B voit le bon de dA'; end if;
  begin perform public.signer_bon('bA', 'Intrus', '', 'data:image/png;base64,AAAA'); raise exception 'ÉCHEC 8e : la famille B signe le bon de dA';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"famille.a@essai.test","aal":"aal1"}';
do $$ declare r jsonb; begin
  r := public.bon_a_signer();
  if jsonb_array_length(r) <> 1 then raise exception 'ÉCHEC 8f : le bon à signer n''est pas proposé à la famille A'; end if;
  if (r -> 0 -> 'resume' -> 'dechets' -> 0) ? 'cout' then raise exception 'ÉCHEC 8g : le coût des déchets est visible du client'; end if;
  perform public.signer_bon('bA', 'Famille A', 'Héritière', 'data:image/png;base64,AAAA');
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001","email":"admin@essai.test","aal":"aal2"}';
do $$ begin
  if (select signe_client_le from public.bons where id = 'bA') is null then raise exception 'ÉCHEC 8h : signature du client non enregistrée'; end if;
  begin
    update public.bons set data = jsonb_set(data, '{signatures,client,nom}', '"Autre"') where id = 'bA';
    raise exception 'ÉCHEC 8i : bon modifié après la signature du client';
  exception when raise_exception then if sqlerrm like 'ÉCHEC%' then raise; end if; end;
  perform public.noter_pdf_bon('bA', '{"chemin":"dA/bon-BI-2099-0001.pdf"}');
  if (select data #>> '{pdf,chemin}' from public.bons where id = 'bA') is null then raise exception 'ÉCHEC 8j : emplacement du PDF non noté'; end if;
end $$;
reset role;

-- ---------- 9. Objets conservés : lecture par la famille, validation, remise à zéro ----------
insert into public.objets_conserves (dossier_id, nom, destinataire, photo) values
  ('dA', 'Album de famille', 'Paul', 'dA/oc-album.jpg'),
  ('dB', 'Horloge', 'Claire', 'dB/oc-horloge.jpg');
insert into storage.objects (bucket_id, name) values ('photos', 'dA/oc-album.jpg'), ('photos', 'dB/oc-horloge.jpg');
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"famille.a@essai.test","aal":"aal1"}';
do $$ begin
  if (select count(*) from public.objets_conserves) <> 1 then raise exception 'ÉCHEC 9a : la famille A ne voit pas uniquement ses objets'; end if;
  if (select count(*) from storage.objects where bucket_id = 'photos' and name like '%/oc-%') <> 1 then raise exception 'ÉCHEC 9b : photos d''objets d''un autre dossier visibles'; end if;
  begin insert into public.objets_conserves (dossier_id, nom) values ('dA', 'Ajout famille'); raise exception 'ÉCHEC 9c : la famille ajoute un objet';
  exception when insufficient_privilege then null; end;
  update public.objets_conserves set nom = 'Modifié' where dossier_id = 'dA';
  if exists (select 1 from public.objets_conserves where nom = 'Modifié') then raise exception 'ÉCHEC 9d : la famille modifie un objet'; end if;
  begin perform public.valider_objets_conserves('dB'); raise exception 'ÉCHEC 9e : la famille A valide la liste de dB';
  exception when insufficient_privilege then null; end;
  perform public.valider_objets_conserves('dA');
  if (select valide_le from public.objets_conserves where dossier_id = 'dA') is null then raise exception 'ÉCHEC 9f : validation non enregistrée'; end if;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001","email":"admin@essai.test","aal":"aal2"}';
do $$ begin
  update public.objets_conserves set destinataire = 'Claire' where dossier_id = 'dA';
  if (select valide_le from public.objets_conserves where dossier_id = 'dA') is not null then raise exception 'ÉCHEC 9g : validation conservée après modification'; end if;
end $$;
reset role;

-- ---------- 10. Espace détaillé : journal, décisions, listing signé, photos multiples ----------
insert into public.journal (dossier_id, type, titre) values ('dA', 'contact', 'Appel A'), ('dB', 'contact', 'Appel B');
insert into public.decisions (id, dossier_id, question) values
  ('00000000-0000-0000-0000-0000000000d1', 'dA', 'Bibliothèque : vendre ou donner ?'),
  ('00000000-0000-0000-0000-0000000000d2', 'dB', 'Question B');
update public.objets_conserves set photos = array['dA/oc-a1.jpg', 'dA/oc-a2.jpg'], valide_le = null where dossier_id = 'dA';
insert into storage.objects (bucket_id, name) values ('photos', 'dA/oc-a1.jpg'), ('photos', 'dA/oc-a2.jpg'), ('photos', 'dB/oc-b1.jpg');
do $$ begin
  begin update public.objets_conserves set photos = array['dB/oc-b1.jpg'] where dossier_id = 'dA'; raise exception 'ÉCHEC 10a : photo d''un autre dossier acceptée';
  exception when check_violation then null; end;
end $$;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"famille.a@essai.test","aal":"aal1"}';
do $$ declare r jsonb; begin
  if (select count(*) from public.journal) <> 1 then raise exception 'ÉCHEC 10b : journal d''un autre dossier visible'; end if;
  if (select count(*) from public.decisions) <> 1 then raise exception 'ÉCHEC 10c : décisions d''un autre dossier visibles'; end if;
  if (select count(*) from storage.objects where bucket_id = 'photos' and name in ('dA/oc-a1.jpg', 'dA/oc-a2.jpg', 'dB/oc-b1.jpg')) <> 2 then raise exception 'ÉCHEC 10d : photos multiples mal filtrées'; end if;
  begin insert into public.journal (dossier_id, type, titre) values ('dA', 'contact', 'Faux'); raise exception 'ÉCHEC 10e : la famille écrit dans le journal';
  exception when insufficient_privilege then null; end;
  begin perform public.repondre_decision('00000000-0000-0000-0000-0000000000d2', 'Donner'); raise exception 'ÉCHEC 10f : la famille A répond pour dB';
  exception when insufficient_privilege then null; end;
  perform public.repondre_decision('00000000-0000-0000-0000-0000000000d1', 'Donner');
  if (select statut from public.decisions where id = '00000000-0000-0000-0000-0000000000d1') <> 'validee' then raise exception 'ÉCHEC 10g : réponse non enregistrée'; end if;
  begin perform public.repondre_decision('00000000-0000-0000-0000-0000000000d1', 'Vendre'); raise exception 'ÉCHEC 10h : décision modifiable après réponse';
  exception when invalid_parameter_value then null; end;
  begin perform public.signer_listing_objets('dB', 'A', 'data:image/jpeg;base64,AAAA'); raise exception 'ÉCHEC 10i : la famille A signe le listing de dB';
  exception when insufficient_privilege then null; end;
  r := public.signer_listing_objets('dA', 'Claire Martin', 'data:image/jpeg;base64,AAAA');
  if (r->>'version')::int <> 1 then raise exception 'ÉCHEC 10j : version de listing inattendue'; end if;
  if exists (select 1 from public.objets_conserves where dossier_id = 'dA' and valide_le is null) then raise exception 'ÉCHEC 10k : objets non validés après signature'; end if;
  if (select count(*) from public.journal where dossier_id = 'dA') <> 3 then raise exception 'ÉCHEC 10l : signature ou réponse absente du journal'; end if;
  begin perform public.signer_listing_objets('dA', 'Claire Martin', 'data:image/jpeg;base64,AAAA'); raise exception 'ÉCHEC 10m : double signature acceptée';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;

rollback;

select 'TOUS LES TESTS D''ACCÈS SONT PASSÉS' as resultat;
