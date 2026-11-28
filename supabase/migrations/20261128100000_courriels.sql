-- Courriels reçus sur les adresses du site (contact@, pro@) : copiés ici par le Worker Cloudflare
-- « fil-bleu-courriels » (qui les transfère aussi, comme avant, vers la boîte Gmail).
-- Rattachés à un dossier quand l'expéditeur est connu ; sinon ils attendent dans la boîte de
-- réception de l'appli. Réservé aux administrateurs : jamais visible par les familles.

create table public.courriels (
  id uuid primary key default gen_random_uuid(),
  recu_le timestamptz not null default now(),
  adresse text not null default '' check (length(adresse) <= 160),        -- adresse du site qui a reçu (contact@…)
  de text not null check (length(de) <= 320),                               -- e-mail de l'expéditeur
  de_nom text not null default '' check (length(de_nom) <= 200),
  sujet text not null default '' check (length(sujet) <= 500),
  texte text not null default '' check (length(texte) <= 20000),            -- texte brut, tronqué
  pieces jsonb not null default '[]'::jsonb check (jsonb_typeof(pieces) = 'array'),  -- [{ nom, type, taille }] (non conservées)
  message_id text check (length(message_id) <= 500),
  dossier_id text references public.dossiers (id) on delete set null,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'range', 'traite', 'ignore')),
  tri jsonb,                                                                 -- résultat du tri par l'assistant (plus tard)
  created_at timestamptz not null default now(),
  unique (message_id)
);
create index courriels_recu on public.courriels (recu_le desc);
create index courriels_dossier on public.courriels (dossier_id, recu_le desc);
create index courriels_de on public.courriels (lower(de));
alter table public.courriels enable row level security;
create policy "courriels : administrateurs" on public.courriels
  for all to authenticated using (prive.est_admin()) with check (prive.est_admin());

revoke all on public.courriels from anon, authenticated;
grant select, insert, update, delete on public.courriels to authenticated;
grant all on public.courriels to service_role;

-- Rattachement automatique à l'arrivée : l'expéditeur est le contact d'un dossier en cours, ou une
-- personne ayant accès à un dossier en cours. En cas de doute (plusieurs dossiers) ou d'expéditeur
-- inconnu, le courriel reste « nouveau » et le choix se fait dans l'appli.
create or replace function prive.courriel_rattacher()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ids text[];
begin
  if new.dossier_id is not null then return new; end if;
  select array_agg(distinct x.id) into ids from (
    select d.id from public.dossiers d
      where lower(d.data #>> '{contact,email}') = lower(new.de) and d.statut not in ('Terminé', 'Perdu')
    union
    select a.dossier_id from public.dossier_acces a join public.dossiers d on d.id = a.dossier_id
      where a.email = lower(new.de) and d.statut not in ('Terminé', 'Perdu')
  ) x;
  if array_length(ids, 1) = 1 then
    new.dossier_id := ids[1];
    new.statut := 'range';
  end if;
  return new;
end;
$$;
create trigger courriels_rattacher before insert on public.courriels
  for each row execute function prive.courriel_rattacher();
revoke execute on function prive.courriel_rattacher() from public, anon, authenticated;
