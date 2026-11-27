-- Agenda de l'équipe : rendez-vous saisis dans l'appli (diagnostics, interventions, rendez-vous
-- chez le notaire, livraisons…), liés ou non à un dossier. S'ajoute aux dates déjà connues
-- (prochain rendez-vous, étapes et tâches de l'espace client). Réservé aux administrateurs.

create table public.agenda (
  id uuid primary key default gen_random_uuid(),
  dossier_id text references public.dossiers (id) on delete cascade,
  titre text not null check (length(trim(titre)) between 1 and 160),
  debut timestamptz not null,
  fin timestamptz,
  journee boolean not null default false,
  lieu text not null default '' check (length(lieu) <= 200),
  notes text not null default '' check (length(notes) <= 1000),
  created_at timestamptz not null default now(),
  check (fin is null or fin >= debut)
);
create index agenda_debut on public.agenda (debut);
alter table public.agenda enable row level security;
create policy "agenda : administrateurs" on public.agenda
  for all to authenticated using (prive.est_admin()) with check (prive.est_admin());

revoke all on public.agenda from anon, authenticated;
grant select, insert, update, delete on public.agenda to authenticated;
grant all on public.agenda to service_role;
