-- E-mails envoyés depuis l'appli (réponses aux courriels, « Prévenir la famille ») : gardés dans la
-- même table que les courriels reçus, pour voir l'échange complet dans chaque dossier.
alter table public.courriels
  add column sens text not null default 'recu' check (sens in ('recu', 'envoye')),
  add column destinataires text not null default '' check (length(destinataires) <= 2000);
create index courriels_sens on public.courriels (sens, recu_le desc);

-- Le rattachement automatique ne concerne que les courriels reçus.
create or replace function prive.courriel_rattacher()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ids text[];
begin
  if new.sens <> 'recu' or new.dossier_id is not null then return new; end if;
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
