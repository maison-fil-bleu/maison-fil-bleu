/**
 * Texte des conditions générales (export juridique du 17/11/2026), source unique :
 * page /cgv et pages jointes au devis PDF de l'appli. Crochets à compléter.
 */
import { SITE } from './site';

export type Bloc = { p: string } | { ul: string[] };
export interface Article { titre: string; blocs: Bloc[] }

const r = (s: string) => s.replaceAll('{EMAIL}', SITE.emailContact);

export const CGV_PARTICULIERS: Article[] = [
  {
    "titre": "1. Objet",
    "blocs": [
      {
        "p": "Les présentes conditions s'appliquent aux prestations Maison Fil Bleu réalisées par Groupe Fil Bleu (ci-après « nous ») pour des particuliers (ci-après « le client »). Elles sont remises avec chaque devis. Le devis signé et les présentes conditions forment le contrat."
      }
    ]
  },
  {
    "titre": "2. Prestations",
    "blocs": [
      {
        "p": "Nous proposons trois formules, décrites sur notre site et détaillées dans le devis : Clés en main, Nouveau départ et Succession, ainsi que des options (gardiennage, recherche de résidence, box de stockage, livraison de quelques meubles chez un proche organisée avec un déménageur, caves et volumes supplémentaires)."
      },
      {
        "ul": [
          "Les journées de tri comprises dépendent de la formule et de la taille du logement ; elles sont indiquées dans le devis. Au-delà, une journée supplémentaire fait l'objet d'un devis complémentaire, accepté par le client avant d'être réalisée.",
          "Les travaux de remise en état ou d'aménagement sont réalisés par des artisans indépendants, sur leur propre devis, accepté et payé directement par le client. Nous les sélectionnons, comparons les devis et suivons le chantier, sans être responsables de leur exécution.",
          "La location d'un box de stockage est souscrite au nom du client et payée par lui au loueur.",
          "Le déménagement et la livraison de meubles chez un proche sont réalisés par une entreprise de déménagement indépendante, sur son propre devis, accepté et payé directement par le client. Nous la sélectionnons et coordonnons son intervention, sans être responsables de son exécution.",
          "Le gardiennage consiste en une visite du logement par mois (aération, relevé du courrier, contrôle visuel), sauf fréquence différente prévue au devis ; d'autres prestations peuvent être ajoutées à la demande du client. Il ne constitue pas une surveillance permanente.",
          "La recherche de résidence comprend jusqu'à trois visites accompagnées d'établissements situés dans les Bouches-du-Rhône et la constitution du dossier d'admission. Les visites supplémentaires ou hors du département font l'objet d'un devis complémentaire.",
          "La livraison de quelques meubles chez un proche comprend l'organisation avec un déménageur indépendant et notre présence au chargement. Le transport est facturé et réglé directement par le client au déménageur ; il ne comprend pas l'installation.",
          "La recherche d'un box de stockage comprend la recherche, l'aide à la souscription du contrat (au nom du client) et la coordination avec le déménageur.",
          "L'installation dans la nouvelle chambre ou le nouveau logement comprend une demi-journée sur place le jour de l'arrivée, en lien avec le déménageur : meubles placés, lit fait, photos accrochées.",
          "Lorsque le client vend ou loue, nous l'aidons gratuitement à préparer ses rendez-vous avec les agences de son choix (questions à poser, documents à réunir). Nous ne prenons aucun mandat et ne percevons aucune commission ; le client choisit librement."
        ]
      }
    ]
  },
  {
    "titre": "3. Diagnostic et devis",
    "blocs": [
      {
        "p": "Le diagnostic est gratuit et n’engage pas le client. Il donne lieu à un devis forfaitaire détaillé, valable un mois. Le prix est ferme pour les prestations décrites ; toute prestation non prévue fait l'objet d'un devis complémentaire accepté par écrit avant d'être réalisée."
      }
    ]
  },
  {
    "titre": "4. Prix",
    "blocs": [
      {
        "p": "Les prix sont exprimés en euros toutes taxes comprises (TVA au taux en vigueur). Les prix affichés sur le site sont des prix de départ. Une intervention en urgence (sous sept jours) est majorée de 25 %. Une intervention hors des Bouches-du-Rhône fait l'objet d'un supplément indiqué au devis."
      }
    ]
  },
  {
    "titre": "5. Paiement",
    "blocs": [
      {
        "p": "Un acompte de 40 % est demandé avant le début des interventions, le solde à la remise des clés. Lorsque le contrat est signé au domicile du client ou hors de nos locaux, aucun paiement n'est demandé avant l'expiration d'un délai de sept jours à compter de la signature. Des facilités de paiement peuvent être accordées ; elles sont précisées au devis. En cas de retard de paiement, des pénalités au taux de l'intérêt légal peuvent être appliquées après mise en demeure."
      }
    ]
  },
  {
    "titre": "5 bis. Report du solde",
    "blocs": [
      {
        "p": "Lorsque le devis prévoit l'option « Report du solde », le solde peut être réglé lors de la vente du logement ou sur les fonds de la succession, aux conditions suivantes :"
      },
      {
        "ul": [
          "le solde reporté ne dépasse pas 3 000 € TTC ;",
          "le client remet un ordre de paiement irrévocable adressé au notaire chargé de la vente ou de la succession, qui nous règle le solde lors de la vente ou sur les fonds de la succession ;",
          "le solde est dû au plus tard trois mois après la fin de la prestation, même si la vente n'a pas eu lieu ;",
          "ce report est accordé sans frais."
        ]
      },
      {
        "p": "L'acompte reste dû dans les conditions de l'article 5."
      }
    ]
  },
  {
    "titre": "6. Droit de rétractation",
    "blocs": [
      {
        "p": "Le client dispose d'un délai de quatorze jours pour se rétracter, sans avoir à se justifier, à compter du lendemain de la signature du devis lorsque celui-ci a été signé à son domicile, hors de nos locaux ou à distance. Il exerce ce droit en nous adressant le formulaire de rétractation joint au devis, ou toute déclaration dénuée d'ambiguïté, par courrier ou par e-mail à {EMAIL}. Les sommes éventuellement versées sont remboursées dans les quatorze jours. Si le client a expressément demandé que les prestations commencent avant la fin de ce délai, il reste redevable, en cas de rétractation, d'un montant proportionnel aux prestations déjà réalisées. Le droit de rétractation ne peut plus être exercé lorsque la prestation a été entièrement exécutée avec son accord avant la fin du délai."
      }
    ]
  },
  {
    "titre": "7. Engagements du client",
    "blocs": [
      {
        "p": "Le client :"
      },
      {
        "ul": [
          "garantit qu'il a qualité pour commander la prestation (propriétaire, locataire, héritier ou mandataire). En cas de succession, il déclare agir avec l'accord de l'ensemble des héritiers ou en vertu d'un mandat, et nous fournit sur demande les coordonnées du notaire chargé de la succession ;",
          "nous donne accès au logement et nous informe des contraintes (étage, stationnement, horaires de copropriété, produits dangereux) ;",
          "valide par écrit, avant tout débarras, la liste de ce qui est conservé, donné ou évacué ;",
          "retire ou nous signale avant le début des interventions les sommes d'argent, valeurs, documents et objets auxquels il tient particulièrement."
        ]
      }
    ]
  },
  {
    "titre": "8. Nos engagements",
    "blocs": [
      {
        "p": "Nous exécutons les prestations avec soin, dans les délais convenus, par du personnel encadré. Les documents, photos de famille, valeurs et souvenirs découverts pendant le tri sont mis de côté et remis au client. Les biens donnés sont remis à des associations ou ressourceries ; les biens évacués rejoignent des filières de traitement autorisées. Nous sommes tenus à la confidentialité sur tout ce que nous voyons et apprenons dans le logement."
      }
    ]
  },
  {
    "titre": "9. Report et annulation",
    "blocs": [
      {
        "p": "Un report demandé par le client plus de sept jours avant l'intervention est sans frais. Après le délai de rétractation, une annulation par le client donne lieu au paiement des seuls frais réellement engagés à la date de l'annulation, sur justificatifs."
      }
    ]
  },
  {
    "titre": "10. Responsabilité et assurance",
    "blocs": [
      {
        "p": "Nous sommes assurés en responsabilité civile professionnelle auprès de [assureur]. Tout dommage constaté doit nous être signalé par écrit dans les sept jours suivant l'intervention, avec photos si possible. Nous ne pouvons être tenus responsables des travaux réalisés par des artisans indépendants ou du transport réalisé par un déménageur, ni des biens que le client a choisi de conserver dans le logement pendant le gardiennage."
      }
    ]
  },
  {
    "titre": "11. Force majeure",
    "blocs": [
      {
        "p": "Ni le client ni nous ne sommes responsables d'un retard ou d'une inexécution causés par un événement de force majeure au sens de l'article 1218 du Code civil."
      }
    ]
  },
  {
    "titre": "12. Photos",
    "blocs": [
      {
        "p": "Nous ne publions aucune photo du logement sans l'accord écrit du client, donné sur le devis. Les photos publiées ne montrent ni personne, ni adresse, ni élément permettant d'identifier le client."
      }
    ]
  },
  {
    "titre": "13. Données personnelles",
    "blocs": [
      {
        "p": "Voir notre politique de confidentialité."
      }
    ]
  },
  {
    "titre": "14. Réclamations, médiation et litiges",
    "blocs": [
      {
        "p": "Toute réclamation est adressée par écrit à [adresse e-mail et postale]. À défaut de solution amiable dans un délai de deux mois, le client peut saisir gratuitement le médiateur de la consommation : [nom], [site], [adresse]. Les présentes conditions sont soumises au droit français. Le client peut saisir, à son choix, la juridiction du lieu où il demeurait lors de la signature ou celle du lieu de l'intervention."
      }
    ]
  }

];

export const CGV_PRO: Article[] = [
  {
    "titre": "1. Champ d'application",
    "blocs": [
      {
        "p": "Ces conditions s'appliquent aux prestations Fil Bleu Pro (débarras, nettoyage de logements vides, remise en état coordonnée) commandées par des professionnels : agences immobilières, syndics, bailleurs, notaires, mandataires. Elles prévalent sur les conditions d'achat du client, sauf accord écrit contraire."
      }
    ]
  },
  {
    "titre": "2. Devis et commande",
    "blocs": [
      {
        "p": "Le devis est établi sous 24 heures ouvrées, sur photos ou après visite, et reste valable un mois. La commande est ferme à réception du devis signé ou d'un bon de commande. Le client professionnel ne bénéficie pas du droit de rétractation des consommateurs."
      }
    ]
  },
  {
    "titre": "3. Prix",
    "blocs": [
      {
        "p": "Les prix sont exprimés hors taxes, selon la grille tarifaire professionnelle en vigueur à la date du devis. Une intervention urgente (sous 72 heures) est majorée de 25 %. Les déchets dangereux (amiante, produits chimiques, bouteilles de gaz) font l'objet d'un devis spécifique."
      }
    ]
  },
  {
    "titre": "4. Exécution",
    "blocs": [
      {
        "p": "Le client fournit les accès (clés, codes, autorisations du syndic) et nous signale toute contrainte. Des photos avant et après sont transmises à la fin de chaque intervention. Les justificatifs de traitement des déchets sont fournis sur demande."
      }
    ]
  },
  {
    "titre": "5. Annulation",
    "blocs": [
      {
        "p": "Une intervention annulée moins de 48 heures à l'avance, ou rendue impossible faute d'accès, donne lieu à la facturation d'un forfait de déplacement de [montant] € HT."
      }
    ]
  },
  {
    "titre": "6. Paiement",
    "blocs": [
      {
        "p": "Les factures sont payables à trente jours à compter de leur date d'émission, par virement. Tout retard entraîne de plein droit des pénalités au taux d'intérêt appliqué par la Banque centrale européenne à son opération de refinancement la plus récente majoré de 10 points, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (article L441-10 du Code de commerce). Aucun escompte n'est accordé pour paiement anticipé."
      }
    ]
  },
  {
    "titre": "7. Réception et responsabilité",
    "blocs": [
      {
        "p": "Le client dispose de trois jours ouvrés après réception des photos de fin d'intervention pour formuler par écrit une réserve ; passé ce délai, la prestation est réputée conforme. Notre responsabilité est couverte par notre assurance responsabilité civile professionnelle ([assureur])."
      }
    ]
  },
  {
    "titre": "8. Litiges",
    "blocs": [
      {
        "p": "Ces conditions sont soumises au droit français. À défaut d'accord amiable, tout litige relève du tribunal de commerce de [ville du siège]."
      }
    ]
  }
];

/** Remplace les variables du texte (e-mail de contact). */
export const texte = (s: string) => r(s);
