-- Maison Fil Bleu : schéma initial du back-office (appli Fil Bleu Dossiers) et de l'espace client.
--
-- Principe de sécurité :
--   * `dossiers` et `reglages` contiennent des données strictement internes (coûts, marge, heures,
--     commissions, notes). Seuls les administrateurs y ont accès, jamais un client.
--   * L'espace client ne lit que `dossier_acces`, `espace_client`, `photos_partagees` et `documents`,
--     alimentées par l'onglet « Espace client » de l'appli, et seulement pour ses propres dossiers.
--   * Les prix publics du simulateur passent par la fonction `prix_publics()`, qui ne renvoie
--     que les grilles et options publiques (jamais les coûts, la marge ni la grille pro).
--   * Row Level Security sur toutes les tables ; aucun droit par défaut pour `anon`.

-- ---------------------------------------------------------------------------
-- Administrateurs
-- ---------------------------------------------------------------------------
-- La liste est remplie à part (l'e-mail du fondateur n'est pas écrit dans le code).
create table public.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

-- E-mail de l'utilisateur connecté, en minuscules.
create or replace function public.email_courant()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(nullif(auth.jwt() ->> 'email', ''));
$$;

-- Vrai si l'utilisateur connecté est administrateur ET a validé sa double authentification (aal2).
create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from public.admins a where a.email = public.email_courant());
$$;

-- Vrai si l'utilisateur connecté est administrateur, même avant la double authentification
-- (sert uniquement à l'interface de /admin pour proposer l'activation de la double authentification).
create or replace function public.est_admin_sans_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.email = public.email_courant());
$$;

create policy "admins : lecture par les administrateurs" on public.admins
  for select to authenticated using (public.est_admin());

-- ---------------------------------------------------------------------------
-- Dossiers (objet complet de l'appli, tel quel) : administrateurs seulement
-- ---------------------------------------------------------------------------
create table public.dossiers (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  statut text not null default 'Appel',
  formule text not null default 'L' check (formule in ('L', 'T', 'S', 'P')),
  data jsonb not null default '{}'::jsonb
);
alter table public.dossiers enable row level security;
create policy "dossiers : administrateurs" on public.dossiers
  for all to authenticated using (public.est_admin()) with check (public.est_admin());

-- ---------------------------------------------------------------------------
-- Réglages de l'appli (une seule ligne) : administrateurs seulement
-- ---------------------------------------------------------------------------
create table public.reglages (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.reglages enable row level security;
create policy "reglages : administrateurs" on public.reglages
  for all to authenticated using (public.est_admin()) with check (public.est_admin());

-- Prix publics pour le simulateur du site : grilles famille et options publiques uniquement.
create or replace function public.prix_publics()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'grids',        r.data -> 'grids',
    'm3Sup',        r.data -> 'm3Sup',
    'residence',    r.data -> 'residence',
    'installation', r.data -> 'installation',
    'gardiennage',  r.data -> 'gardiennage',
    'urgence',      r.data -> 'urgence',
    'updated_at',   to_jsonb(r.updated_at)
  ))
  from public.reglages r
  where r.id = 1;
$$;

-- ---------------------------------------------------------------------------
-- Espace client
-- ---------------------------------------------------------------------------
-- Qui a accès à quel dossier (la personne elle-même, un ou plusieurs proches).
create table public.dossier_acces (
  dossier_id text not null references public.dossiers (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%@%'),
  role text not null default 'proche' check (role in ('titulaire', 'proche')),
  invite_le timestamptz,
  created_at timestamptz not null default now(),
  primary key (dossier_id, email)
);
create index dossier_acces_email_idx on public.dossier_acces (email);
alter table public.dossier_acces enable row level security;

-- Vrai si l'utilisateur connecté a accès au dossier.
create or replace function public.a_acces(p_dossier_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.dossier_acces a
    where a.dossier_id = p_dossier_id and a.email = public.email_courant()
  );
$$;

create policy "dossier_acces : administrateurs" on public.dossier_acces
  for all to authenticated using (public.est_admin()) with check (public.est_admin());
create policy "dossier_acces : le client lit ses propres lignes" on public.dossier_acces
  for select to authenticated using (email = public.email_courant());

-- Ce que voit la famille : formule, ville, interlocuteur, étapes (avec messages).
create table public.espace_client (
  dossier_id text primary key references public.dossiers (id) on delete cascade,
  formule text not null check (formule in ('L', 'T', 'S', 'P')),
  ville text,
  interlocuteur jsonb not null default '{}'::jsonb,
  etapes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.espace_client enable row level security;
create policy "espace_client : administrateurs" on public.espace_client
  for all to authenticated using (public.est_admin()) with check (public.est_admin());
create policy "espace_client : lecture par la famille" on public.espace_client
  for select to authenticated using (public.a_acces(dossier_id));

-- Photos que la famille peut voir (par défaut, aucune).
create table public.photos_partagees (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  chemin text not null,
  legende text,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  unique (dossier_id, chemin),
  check (split_part(chemin, '/', 1) = dossier_id)
);
alter table public.photos_partagees enable row level security;
create policy "photos_partagees : administrateurs" on public.photos_partagees
  for all to authenticated using (public.est_admin()) with check (public.est_admin());
create policy "photos_partagees : lecture par la famille" on public.photos_partagees
  for select to authenticated using (public.a_acces(dossier_id));

-- Documents (devis signé, facture, état des lieux, autres).
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  chemin text not null,
  type text not null default 'autre' check (type in ('devis', 'facture', 'etat_des_lieux', 'autre')),
  nom text not null,
  date timestamptz not null default now(),
  unique (dossier_id, chemin),
  check (split_part(chemin, '/', 1) = dossier_id)
);
alter table public.documents enable row level security;
create policy "documents : administrateurs" on public.documents
  for all to authenticated using (public.est_admin()) with check (public.est_admin());
create policy "documents : lecture par la famille" on public.documents
  for select to authenticated using (public.a_acces(dossier_id));

-- ---------------------------------------------------------------------------
-- Mise à jour automatique de updated_at
-- ---------------------------------------------------------------------------
create or replace function public.maj_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger dossiers_updated_at before update on public.dossiers
  for each row execute function public.maj_updated_at();
create trigger reglages_updated_at before update on public.reglages
  for each row execute function public.maj_updated_at();
create trigger espace_client_updated_at before update on public.espace_client
  for each row execute function public.maj_updated_at();

-- ---------------------------------------------------------------------------
-- Droits (l'exposition automatique des nouvelles tables est désactivée)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke execute on function public.email_courant(), public.est_admin(), public.est_admin_sans_mfa(),
  public.a_acces(text), public.prix_publics(), public.maj_updated_at()
  from public, anon, authenticated;

grant select on public.admins to authenticated;
grant select, insert, update, delete on
  public.dossiers, public.reglages, public.dossier_acces,
  public.espace_client, public.photos_partagees, public.documents
  to authenticated;
grant all on all tables in schema public to service_role;

grant execute on function public.email_courant(), public.est_admin(), public.est_admin_sans_mfa(),
  public.a_acces(text) to authenticated;
grant execute on function public.prix_publics() to anon, authenticated;
grant execute on function public.email_courant(), public.est_admin(), public.est_admin_sans_mfa(),
  public.a_acces(text), public.prix_publics() to service_role;

-- ---------------------------------------------------------------------------
-- Stockage des fichiers : buckets privés, chemins « <dossier_id>/<fichier> »
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos', 'photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('documents', 'documents', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "stockage : administrateurs" on storage.objects
  for all to authenticated
  using (bucket_id in ('photos', 'documents') and public.est_admin())
  with check (bucket_id in ('photos', 'documents') and public.est_admin());

-- Une famille ne peut lire que les photos explicitement partagées de ses dossiers…
create policy "stockage : photos partagées lues par la famille" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.photos_partagees p
      where p.chemin = storage.objects.name and public.a_acces(p.dossier_id)
    )
  );

-- … et les documents publiés de ses dossiers.
create policy "stockage : documents lus par la famille" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.chemin = storage.objects.name and public.a_acces(d.dossier_id)
    )
  );
