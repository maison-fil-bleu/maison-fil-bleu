-- Objets conservés pour la famille (onglet « 5 · Espace client » de l'appli, et espace client du site).
--
-- Principe :
--   * Chaque objet mis de côté pour la famille : nom, destinataire, photo prise sur place.
--   * Écriture : administrateurs seulement. Lecture : administrateurs et personnes ayant accès au dossier.
--   * La famille valide la liste depuis son espace (valider_objets_conserves) : date et adresse de la
--     personne qui valide sont enregistrées. Si un objet est modifié ensuite, sa validation est remise
--     à zéro et la famille doit valider à nouveau.
--   * Photos : bucket privé « photos », chemin « <dossier_id>/oc-… .jpg ». La famille ne peut lire que
--     les photos rattachées à un objet conservé de ses dossiers.
--   * Suppression avec le dossier (cascade), selon la politique de confidentialité.

create table public.objets_conserves (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  nom text not null check (length(trim(nom)) between 1 and 160),
  destinataire text not null default '' check (length(destinataire) <= 120),
  note text not null default '' check (length(note) <= 500),
  photo text check (photo is null or split_part(photo, '/', 1) = dossier_id),
  ordre integer not null default 0,
  valide_le timestamptz,
  valide_par text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index objets_conserves_dossier on public.objets_conserves (dossier_id, ordre);
alter table public.objets_conserves enable row level security;
create policy "objets_conserves : administrateurs" on public.objets_conserves
  for all to authenticated using (prive.est_admin()) with check (prive.est_admin());
create policy "objets_conserves : lecture par la famille" on public.objets_conserves
  for select to authenticated using (prive.a_acces(dossier_id));

-- Un objet modifié après validation doit être validé à nouveau par la famille.
create or replace function prive.objet_conserve_modifie()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.nom is distinct from old.nom or new.destinataire is distinct from old.destinataire
     or new.note is distinct from old.note or new.photo is distinct from old.photo
     or new.dossier_id is distinct from old.dossier_id then
    new.valide_le := null;
    new.valide_par := null;
  end if;
  return new;
end;
$$;
create trigger objets_conserves_modifie before update on public.objets_conserves
  for each row execute function prive.objet_conserve_modifie();

-- Validation de la liste par la famille, depuis son espace : horodatée par le serveur.
create or replace function public.valider_objets_conserves(p_dossier text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  if not prive.a_acces(p_dossier) then
    raise exception 'Dossier introuvable.' using errcode = '42501';
  end if;
  update public.objets_conserves
    set valide_le = now(), valide_par = prive.email_courant()
    where dossier_id = p_dossier and valide_le is null;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'valides', n, 'date', now());
end;
$$;

-- La famille lit les photos rattachées à un objet conservé de ses dossiers.
create policy "stockage : photos des objets conservés lues par la famille" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.objets_conserves o
      where o.photo = storage.objects.name and prive.a_acces(o.dossier_id)
    )
  );

-- Droits
revoke all on public.objets_conserves from anon, authenticated;
grant select, insert, update, delete on public.objets_conserves to authenticated;
grant all on public.objets_conserves to service_role;
revoke execute on function public.valider_objets_conserves(text) from public, anon;
grant execute on function public.valider_objets_conserves(text) to authenticated, service_role;
revoke execute on function prive.objet_conserve_modifie() from public, anon, authenticated;
