-- Espace client détaillé : fiche du logement, prochain rendez-vous, tâches, pièces, contacts,
-- journal des événements, décisions (avec réponse de la famille), listing des objets conservés signé.
--
-- Principe inchangé : écriture par les administrateurs seulement ; la famille lit ce qui concerne
-- ses dossiers et n'agit que par des fonctions dédiées (répondre à une décision, signer le listing).

-- 1. Détails affichés dans l'espace (une ligne par dossier, déjà lue par la famille).
alter table public.espace_client
  add column reference text not null default '' check (length(reference) <= 40),
  add column titre text not null default '' check (length(titre) <= 160),
  add column adresse text not null default '' check (length(adresse) <= 200),
  add column bien jsonb not null default '{}'::jsonb,       -- { famille (pour « Bonjour, … »), type, acces, stationnement, cles, compteurs, cave, devenir }
  add column prochain jsonb not null default '{}'::jsonb,   -- { date, horaire, titre, detail }
  add column taches jsonb not null default '[]'::jsonb,     -- [{ phase (clé d'étape), libelle, etat: fait|en_cours|a_faire, date, cote: nous|famille }]
  add column pieces jsonb not null default '[]'::jsonb,     -- [{ nom, tri: a_trier|en_cours|trie, conserves, dons (texte), dons_volume, volume (m³) }]
  add column contacts jsonb not null default '[]'::jsonb,   -- [{ nom, role, detail }]
  add column couverture text;                               -- photo du logement (bucket photos)
alter table public.espace_client
  add constraint espace_client_couverture check (couverture is null or split_part(couverture, '/', 1) = dossier_id),
  add constraint espace_client_json check (jsonb_typeof(bien) = 'object' and jsonb_typeof(prochain) = 'object'
    and jsonb_typeof(taches) = 'array' and jsonb_typeof(pieces) = 'array' and jsonb_typeof(contacts) = 'array');

create policy "stockage : photo de couverture lue par la famille" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and exists (
    select 1 from public.espace_client e where e.couverture = storage.objects.name and prive.a_acces(e.dossier_id)));

-- 2. Photos partagées : moment (avant, pendant, après) pour le comparateur.
alter table public.photos_partagees
  add column moment text check (moment in ('avant', 'pendant', 'apres'));

-- 3. Journal du dossier.
create table public.journal (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  quand timestamptz not null default now(),
  type text not null check (type in ('contact', 'decision', 'intervention', 'organisation', 'document')),
  titre text not null check (length(trim(titre)) between 1 and 160),
  texte text not null default '' check (length(texte) <= 1000),
  created_at timestamptz not null default now()
);
create index journal_dossier on public.journal (dossier_id, quand desc);
alter table public.journal enable row level security;
create policy "journal : administrateurs" on public.journal
  for all to authenticated using (prive.est_admin()) with check (prive.est_admin());
create policy "journal : lecture par la famille" on public.journal
  for select to authenticated using (prive.a_acces(dossier_id));

-- 4. Décisions : posées par l'équipe, tranchées par la famille (ou notées comme déjà prises).
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  posee_le timestamptz not null default now(),
  question text not null check (length(trim(question)) between 1 and 300),
  choix jsonb not null default '[]'::jsonb check (jsonb_typeof(choix) = 'array'),
  statut text not null default 'attente' check (statut in ('attente', 'validee')),
  reponse text check (length(reponse) <= 500),
  decide_par text check (length(decide_par) <= 160),
  decide_le timestamptz,
  created_at timestamptz not null default now()
);
create index decisions_dossier on public.decisions (dossier_id, posee_le desc);
alter table public.decisions enable row level security;
create policy "decisions : administrateurs" on public.decisions
  for all to authenticated using (prive.est_admin()) with check (prive.est_admin());
create policy "decisions : lecture par la famille" on public.decisions
  for select to authenticated using (prive.a_acces(dossier_id));

create or replace function public.repondre_decision(p_id uuid, p_reponse text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare d public.decisions; r text := left(trim(coalesce(p_reponse, '')), 500);
begin
  select * into d from public.decisions where id = p_id;
  if d.id is null or not prive.a_acces(d.dossier_id) then
    raise exception 'Décision introuvable.' using errcode = '42501';
  end if;
  if d.statut <> 'attente' then raise exception 'Cette décision a déjà été prise.' using errcode = '22023'; end if;
  if r = '' then raise exception 'Réponse vide.' using errcode = '22023'; end if;
  update public.decisions
    set statut = 'validee', reponse = r, decide_par = prive.email_courant(), decide_le = now()
    where id = p_id;
  insert into public.journal (dossier_id, type, titre, texte)
    values (d.dossier_id, 'decision', left('Réponse de la famille : ' || d.question, 160), r);
  return jsonb_build_object('ok', true);
end;
$$;

-- 5. Objets conservés : pièce et jusqu'à 3 photos par objet.
alter table public.objets_conserves
  add column piece text not null default '' check (length(piece) <= 60),
  add column photos text[] not null default '{}' check (cardinality(photos) <= 3);
create or replace function prive.objet_conserve_modifie()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.nom is distinct from old.nom or new.destinataire is distinct from old.destinataire
     or new.note is distinct from old.note or new.photo is distinct from old.photo
     or new.photos is distinct from old.photos or new.piece is distinct from old.piece
     or new.dossier_id is distinct from old.dossier_id then
    new.valide_le := null;
    new.valide_par := null;
  end if;
  return new;
end;
$$;
-- Photos d'un objet : toutes dans le dossier de l'objet.
create or replace function prive.objet_photos_ok(p_dossier text, p_photos text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(bool_and(split_part(p, '/', 1) = p_dossier), true) from unnest(p_photos) p;
$$;
alter table public.objets_conserves add constraint objets_conserves_photos check (prive.objet_photos_ok(dossier_id, photos));
create policy "stockage : photos multiples des objets conservés lues par la famille" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and exists (
    select 1 from public.objets_conserves o where storage.objects.name = any (o.photos) and prive.a_acces(o.dossier_id)));

-- 6. Listing des objets conservés signé par la famille (une version par signature).
create table public.listings_objets (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  version integer not null,
  signe_le timestamptz not null default now(),
  signe_par text not null,
  nom text not null,
  img text not null check (length(img) < 300000),
  objets jsonb not null,
  unique (dossier_id, version)
);
alter table public.listings_objets enable row level security;
create policy "listings_objets : administrateurs" on public.listings_objets
  for all to authenticated using (prive.est_admin()) with check (prive.est_admin());
create policy "listings_objets : lecture par la famille" on public.listings_objets
  for select to authenticated using (prive.a_acces(dossier_id));

create or replace function public.signer_listing_objets(p_dossier text, p_nom text, p_img text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v integer; n integer; signataire text := left(trim(coalesce(p_nom, '')), 120);
begin
  if not prive.a_acces(p_dossier) then raise exception 'Dossier introuvable.' using errcode = '42501'; end if;
  if signataire = '' then raise exception 'Nom du signataire manquant.' using errcode = '22023'; end if;
  if coalesce(p_img, '') !~ '^data:image/(png|jpeg);base64,' or length(p_img) >= 300000 then
    raise exception 'Signature invalide.' using errcode = '22023';
  end if;
  select count(*) into n from public.objets_conserves where dossier_id = p_dossier;
  if n = 0 then raise exception 'Aucun objet à signer.' using errcode = '22023'; end if;
  if not exists (select 1 from public.objets_conserves where dossier_id = p_dossier and valide_le is null) then
    raise exception 'Le listing est déjà signé.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('listing:' || p_dossier));
  select coalesce(max(version), 0) + 1 into v from public.listings_objets where dossier_id = p_dossier;
  insert into public.listings_objets (dossier_id, version, signe_par, nom, img, objets)
    select p_dossier, v, prive.email_courant(), signataire, p_img,
      coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'nom', o.nom, 'piece', o.piece, 'destinataire', o.destinataire, 'note', o.note) order by o.ordre, o.created_at), '[]'::jsonb)
    from public.objets_conserves o where o.dossier_id = p_dossier;
  update public.objets_conserves set valide_le = now(), valide_par = prive.email_courant()
    where dossier_id = p_dossier and valide_le is null;
  insert into public.journal (dossier_id, type, titre, texte)
    values (p_dossier, 'decision', 'Listing des objets conservés signé (version ' || v || ')', 'Signé par ' || signataire || ', ' || n || ' objet' || case when n > 1 then 's' else '' end || '.');
  return jsonb_build_object('ok', true, 'version', v);
end;
$$;

-- Droits
revoke all on public.journal, public.decisions, public.listings_objets from anon, authenticated;
grant select, insert, update, delete on public.journal, public.decisions, public.listings_objets to authenticated;
grant all on public.journal, public.decisions, public.listings_objets to service_role;
revoke execute on function public.repondre_decision(uuid, text), public.signer_listing_objets(text, text, text) from public, anon;
grant execute on function public.repondre_decision(uuid, text), public.signer_listing_objets(text, text, text) to authenticated, service_role;
-- prive.objet_photos_ok reste exécutable : la contrainte est évaluée avec les droits de l'administrateur qui écrit.
