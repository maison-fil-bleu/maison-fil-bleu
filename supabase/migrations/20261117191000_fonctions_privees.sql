-- Range les fonctions de contrôle d'accès dans un schéma non exposé par l'API (`prive`),
-- pour qu'elles ne soient pas appelables via /rest/v1/rpc. Les règles (policies) continuent
-- de les utiliser : elles sont liées à la fonction elle-même, pas à son nom.
--
-- Restent volontairement appelables via l'API :
--   * prix_publics()       : prix du simulateur, lecture publique (grilles et options publiques seulement) ;
--   * est_admin_sans_mfa() : indique à /admin si la personne connectée doit activer sa double authentification
--                            (ne renseigne que sur soi-même).

create schema if not exists prive;
revoke all on schema prive from public;
grant usage on schema prive to authenticated, service_role;

alter function public.est_admin() set schema prive;
alter function public.a_acces(text) set schema prive;
alter function public.email_courant() set schema prive;

-- Les fonctions déplacées s'appellent entre elles par leur nom complet : on les redéfinit.
create or replace function prive.est_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from public.admins a where a.email = prive.email_courant());
$$;

create or replace function prive.a_acces(p_dossier_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.dossier_acces a
    where a.dossier_id = p_dossier_id and a.email = prive.email_courant()
  );
$$;

create or replace function public.est_admin_sans_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.email = prive.email_courant());
$$;

-- La règle de lecture de dossier_acces utilisait email_courant() : elle suit le déplacement.

revoke execute on all functions in schema prive from public, anon;
grant execute on all functions in schema prive to authenticated, service_role;

-- Fonction créée par l'option « RLS automatique » de Supabase : réservée aux déclencheurs
-- d'événements, elle n'a pas à être appelable par l'API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
