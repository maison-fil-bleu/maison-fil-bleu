-- Carnet d'adresses de l'équipe : organismes (énergie, eau, internet, assurances, mairies, syndics,
-- notaires, associations, déchèteries, déménageurs…) réutilisés d'un dossier à l'autre pour les
-- démarches et les courriers types. Réservé aux administrateurs : la famille n'y a jamais accès.

create table public.carnet (
  id uuid primary key default gen_random_uuid(),
  categorie text not null default 'autre' check (categorie in (
    'energie', 'eau', 'internet', 'assurance', 'banque', 'administration', 'mairie', 'syndic',
    'notaire', 'agence', 'residence', 'association', 'ressourcerie', 'decheterie', 'demenageur',
    'stockage', 'artisan', 'autre')),
  nom text not null check (length(trim(nom)) between 1 and 160),
  service text not null default '' check (length(service) <= 160),     -- ex. : Service résiliation
  adresse text not null default '' check (length(adresse) <= 300),     -- rue, boîte postale…
  code_postal text not null default '' check (length(code_postal) <= 10),
  ville text not null default '' check (length(ville) <= 120),
  telephone text not null default '' check (length(telephone) <= 40),
  email text not null default '' check (length(email) <= 160),
  site text not null default '' check (length(site) <= 200),
  notes text not null default '' check (length(notes) <= 1000),
  national boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index carnet_categorie on public.carnet (categorie, nom);
alter table public.carnet enable row level security;
create policy "carnet : administrateurs" on public.carnet
  for all to authenticated using (prive.est_admin()) with check (prive.est_admin());

create or replace function prive.carnet_modifie()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger carnet_modifie before update on public.carnet
  for each row execute function prive.carnet_modifie();

revoke all on public.carnet from anon, authenticated;
grant select, insert, update, delete on public.carnet to authenticated;
grant all on public.carnet to service_role;
revoke execute on function prive.carnet_modifie() from public, anon, authenticated;

-- Organismes nationaux courants. L'adresse de résiliation varie selon le contrat : elle figure sur
-- la dernière facture du client ; on la complète une fois, elle sert ensuite pour tous les dossiers.
insert into public.carnet (categorie, nom, service, site, notes, national) values
  ('energie', 'EDF', 'Service clients particuliers', 'edf.fr', 'Résiliation possible en ligne ou par téléphone. Décès : joindre l''acte de décès. Adresse postale : voir la facture.', true),
  ('energie', 'Engie', 'Service clients particuliers', 'particuliers.engie.fr', 'Adresse postale : voir la facture.', true),
  ('energie', 'TotalEnergies', 'Service clients particuliers', 'totalenergies.fr', 'Adresse postale : voir la facture.', true),
  ('energie', 'Enedis', 'Relève et coupure du compteur électrique', 'enedis.fr', 'Gestionnaire du réseau : relevé final ou mise hors service, quel que soit le fournisseur.', true),
  ('energie', 'GRDF', 'Relève et coupure du compteur de gaz', 'grdf.fr', 'Gestionnaire du réseau gaz : relevé final ou coupure.', true),
  ('eau', 'Distributeur d''eau de la commune', 'Service clients', '', 'Le distributeur dépend de la commune : il figure sur la facture d''eau. Créez une fiche par distributeur rencontré.', true),
  ('internet', 'Orange', 'Service résiliation', 'orange.fr', 'Résiliation par courrier recommandé ou en boutique. Restituer la box. Adresse : voir la facture.', true),
  ('internet', 'SFR', 'Service résiliation', 'sfr.fr', 'Restituer la box. Adresse : voir la facture.', true),
  ('internet', 'Free', 'Service résiliation', 'free.fr', 'Restituer la box. Adresse : voir la facture.', true),
  ('internet', 'Bouygues Telecom', 'Service résiliation', 'bouyguestelecom.fr', 'Restituer la box. Adresse : voir la facture.', true),
  ('administration', 'La Poste', 'Transfert ou réexpédition du courrier', 'laposte.fr', 'Réexpédition définitive ou temporaire, en ligne ou en bureau de poste.', true),
  ('administration', 'Service-Public.fr', 'Démarches en ligne', 'service-public.fr', 'Changement d''adresse en ligne, démarches après un décès.', true),
  ('administration', 'Centre des finances publiques', 'Impôts, taxe d''habitation, taxe foncière', 'impots.gouv.fr', 'Signaler le décès ou le départ du logement.', true),
  ('administration', 'CPAM (Assurance maladie)', 'Signalement d''un décès ou d''un changement d''adresse', 'ameli.fr', '', true),
  ('administration', 'Caisse de retraite', 'Signalement d''un décès ou d''un changement d''adresse', 'info-retraite.fr', 'Préciser la caisse sur le dossier (CARSAT, MSA, complémentaire…).', true),
  ('association', 'Emmaüs', 'Collecte de dons', 'emmaus-france.org', 'Préciser la communauté la plus proche dans une fiche locale.', true),
  ('association', 'Croix-Rouge française', 'Collecte de dons (vêtements, mobilier selon les antennes)', 'croix-rouge.fr', '', true),
  ('association', 'Le Secours populaire', 'Collecte de dons', 'secourspopulaire.fr', '', true),
  ('ressourcerie', 'Ecomaison', 'Filière du mobilier usagé', 'ecomaison.com', 'Points de collecte du mobilier et des articles de maison.', true);
