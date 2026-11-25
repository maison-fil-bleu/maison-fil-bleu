-- Bons d'intervention numériques (appli Fil Bleu Dossiers, onglet « Intervention »).
--
-- Principe :
--   * Un bon par intervention, rattaché à un dossier. Le contenu complet (client, logement,
--     prestations réalisées, déchets, horaires, photos, observations, signatures) est dans `data`.
--   * Lecture et écriture : administrateurs seulement (comme les dossiers). Le client ne lit jamais
--     la table : il passe par bon_a_signer() (résumé sans coûts) et signer_bon() (sa signature seule).
--   * Verrouillage : dès que le porteur a signé, le contenu ne change plus. Seule la signature du
--     client peut encore être ajoutée, une fois. Ensuite, plus aucune modification : une correction
--     passe par un bon rectificatif (colonne `rectifie`), qui pointe vers le premier.
--   * Le registre des déchets est tiré des lignes « déchets » des bons signés.
--   * Photos et bons de dépôt photographiés : bucket privé « photos », chemin
--     « <dossier_id>/bi-<bon>-… .jpg », administrateurs seulement. Le PDF signé (photos en annexe)
--     est publié dans `documents` (type « bon_intervention »), lisible par le client de ce dossier.
--   * Suppression : avec le dossier (cascade), selon la politique de confidentialité.

create table public.bons (
  id text primary key,
  dossier_id text not null references public.dossiers (id) on delete cascade,
  numero text not null unique check (numero ~ '^BI-[0-9]{4}-[0-9]{4}$'),
  marque text not null check (marque in ('pro', 'famille')),
  rectifie text references public.bons (id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  signe_porteur_le timestamptz,
  signe_client_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bons_dossier on public.bons (dossier_id);
alter table public.bons enable row level security;
create policy "bons : administrateurs" on public.bons
  for all to authenticated using (prive.est_admin()) with check (prive.est_admin());

-- Verrouillage, appliqué par la base elle-même (même si l'appli était modifiée).
create or replace function prive.verrou_bon()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Les dates de signature suivent les signatures enregistrées dans `data`.
  new.signe_porteur_le := nullif(new.data #>> '{signatures,porteur,date}', '')::timestamptz;
  new.signe_client_le := nullif(new.data #>> '{signatures,client,date}', '')::timestamptz;
  new.updated_at := now();
  if tg_op = 'INSERT' then return new; end if;

  -- Seule exception : noter_pdf_bon() range l'emplacement du PDF après signature complète.
  if current_setting('fb.noter_pdf', true) = 'oui' then return new; end if;
  if old.signe_client_le is not null then
    raise exception 'Bon % signé et verrouillé : établissez un bon rectificatif.', old.numero
      using errcode = 'P0001';
  end if;
  if old.signe_porteur_le is not null then
    -- Seule la signature du client peut s'ajouter (et la demande de signature à distance) ; le reste est figé.
    if new.id <> old.id or new.dossier_id <> old.dossier_id or new.numero <> old.numero
       or new.marque <> old.marque or new.rectifie is distinct from old.rectifie
       or (new.data #- '{signatures,client}' #- '{signatures,distance}')
          <> (old.data #- '{signatures,client}' #- '{signatures,distance}') then
      raise exception 'Bon % signé par Fil Bleu : seul le client peut encore le signer.', old.numero
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger bons_verrou before insert or update on public.bons
  for each row execute function prive.verrou_bon();

-- Après signature complète, l'appli note où est rangé le PDF : seule cette information
-- (`pdf`, `envoye_le`) peut encore être ajoutée, par un administrateur, via cette fonction.
create or replace function public.noter_pdf_bon(p_id text, p_pdf jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not prive.est_admin() then raise exception 'Accès réservé.' using errcode = '42501'; end if;
  perform set_config('fb.noter_pdf', 'oui', true);
  update public.bons set data = jsonb_set(data, '{pdf}', p_pdf, true)
    where id = p_id and signe_client_le is not null;
  perform set_config('fb.noter_pdf', '', true);
end;
$$;

-- Ce que voit le client qui signe à distance : le bon sans les coûts de déchets ni les photos.
create or replace function public.bon_a_signer()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'dossier_id', b.dossier_id, 'numero', b.numero, 'marque', b.marque,
      'resume', (b.data - 'photos' - 'pdf' - 'facture')
                || jsonb_build_object('dechets', coalesce((
                     select jsonb_agg(l.v - 'cout' - 'photo') from jsonb_array_elements(coalesce(b.data -> 'dechets', '[]'::jsonb)) as l(v)), '[]'::jsonb))
                || jsonb_build_object('signatures', jsonb_build_object(
                     'porteur', (b.data #> '{signatures,porteur}') - 'img'))
                || jsonb_build_object('rectifie_numero', (select r.numero from public.bons r where r.id = b.rectifie))
    ) order by b.created_at), '[]'::jsonb)
  from public.bons b
  where prive.a_acces(b.dossier_id)
    and b.signe_porteur_le is not null
    and b.signe_client_le is null
    and (b.data #> '{signatures,distance}') is not null;
$$;

-- Signature du client depuis son espace : ajoute sa seule signature, horodatée par le serveur.
create or replace function public.signer_bon(p_id text, p_nom text, p_qualite text, p_img text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare b public.bons;
begin
  select * into b from public.bons where id = p_id for update;
  if b.id is null or not prive.a_acces(b.dossier_id) then
    raise exception 'Bon introuvable.' using errcode = '42501';
  end if;
  if b.signe_porteur_le is null or b.signe_client_le is not null then
    raise exception 'Ce bon ne peut pas être signé.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_nom), '') = '' or p_img !~ '^data:image/(png|jpeg);base64,' or length(p_img) > 400000 then
    raise exception 'Nom ou signature manquant.' using errcode = '22023';
  end if;
  update public.bons set data = jsonb_set(data, '{signatures,client}', jsonb_build_object(
      'nom', left(trim(p_nom), 120), 'qualite', left(trim(coalesce(p_qualite, '')), 120),
      'img', p_img, 'date', now(), 'lieu', 'espace client', 'email', prive.email_courant()), true)
    where id = p_id;
  return jsonb_build_object('ok', true, 'date', now());
end;
$$;

-- Le PDF du bon est publié dans `documents` avec un type à lui.
alter table public.documents drop constraint documents_type_check;
alter table public.documents add constraint documents_type_check
  check (type in ('devis', 'facture', 'etat_des_lieux', 'bon_intervention', 'autre'));

-- Droits
revoke all on public.bons from anon, authenticated;
grant select, insert, update, delete on public.bons to authenticated;
grant all on public.bons to service_role;
revoke execute on function public.noter_pdf_bon(text, jsonb), public.bon_a_signer(), public.signer_bon(text, text, text, text)
  from public, anon;
grant execute on function public.noter_pdf_bon(text, jsonb), public.bon_a_signer(), public.signer_bon(text, text, text, text)
  to authenticated, service_role;
revoke execute on function prive.verrou_bon() from public, anon, authenticated;
