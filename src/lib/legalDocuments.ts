// Legal texts. Every « [À compléter …] » marks content the publisher must supply before going public;
// facts about the current technical setup are written in full. Keep them in sync with
// Documentation/RGPD.md (register of processing activities).
import { CURRENT_TERMS_VERSION } from '@account-rules';

export const LEGAL_PAGES = ['mentions-legales', 'confidentialite', 'cookies', 'conditions'] as const;
export type LegalPage = typeof LEGAL_PAGES[number];
export interface LegalSection { title: string; paragraphs: string[]; items?: string[] }
export interface LegalDocument { title: string; summary: string; updated: string; sections: LegalSection[] }

const TODO = (what: string) => `[À compléter : ${what}]`;

/** Single public contact address: legal pages, Contact page and Supabase e-mail templates. */
export const CONTACT_EMAIL = 'florian@universaltimeline.net';

export const legalDocuments: Record<LegalPage, LegalDocument> = {
  'mentions-legales': {
    title: 'Mentions légales',
    summary: 'Qui édite et héberge Universal Timeline.',
    updated: CURRENT_TERMS_VERSION,
    sections: [
      { title: 'Éditeur du site', paragraphs: [
        'Florian Butour, particulier. Universal Timeline est un projet personnel, gratuit et non commercial, édité à titre non professionnel : ce n’est pas une entreprise, il n’y a ni numéro SIREN ni immatriculation.',
        'Éditeur non professionnel, il ne publie pas son adresse postale (article 6, III, 2 de la loi pour la confiance dans l’économie numérique) ; ses coordonnées complètes sont connues de ses prestataires d’hébergement.',
        `Contact : ${CONTACT_EMAIL}, ou depuis la page Contact du site.`,
      ] },
      { title: 'Directeur de la publication', paragraphs: ['Florian Butour.'] },
      { title: 'Hébergement', paragraphs: [
        'Site, application et API : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com).',
        'Base de données et authentification : Supabase, Inc., 65 Chulia Street, OCBC Centre, Singapour 049513 (supabase.com) ; données hébergées dans l’Union européenne (région Francfort, Allemagne).',
        'Nom de domaine et messagerie : Hostinger International Ltd., 61 Lordou Vironos, Lumiel Building, 4e étage, 6023 Larnaca, Chypre (hostinger.com).',
      ] },
      { title: 'Propriété intellectuelle', paragraphs: [
        'Les données du catalogue issues de Wikidata sont publiées sous licence Creative Commons CC0.',
        TODO('licence du code, des textes éditoriaux et des frises publiées par les utilisateurs'),
      ] },
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    summary: 'Les données personnelles que nous traitons, pourquoi, combien de temps et vos droits.',
    updated: CURRENT_TERMS_VERSION,
    sections: [
      { title: 'Responsable du traitement', paragraphs: [
        'Florian Butour, éditeur du site, particulier agissant à titre non professionnel (voir les mentions légales). Aucun délégué à la protection des données n’est désigné : ce n’est pas obligatoire pour un projet de cette taille.',
        `Contact pour vos données personnelles : ${CONTACT_EMAIL} (objet « Données personnelles »), ou depuis la page Contact du site.`,
      ] },
      { title: 'Données traitées', paragraphs: ['Nous ne collectons que les données nécessaires au service :'], items: [
        'Compte : adresse e-mail et mot de passe (stocké sous forme chiffrée par le service d’authentification), date d’inscription.',
        'Profil : nom d’utilisateur, couleur et icône d’avatar, version et date d’acceptation des conditions.',
        'Contenus : les frises que vous créez, leur visibilité et leurs liens avec le catalogue. Une frise publique affiche votre nom d’utilisateur.',
        'Données techniques : journaux de connexion et d’erreur des hébergeurs (adresse IP, date, requête), utilisés pour la sécurité.',
        'Mesure d’audience, seulement avec votre accord : pages consultées, clics, provenance, type de navigateur et d’appareil, associés à un identifiant pseudonyme. L’adresse IP n’est pas conservée et les sessions ne sont pas enregistrées.',
      ] },
      { title: 'Finalités et bases légales', paragraphs: [], items: [
        'Créer et gérer votre compte, publier vos frises : exécution du contrat (article 6.1.b du RGPD).',
        'Sécuriser le service et prévenir les abus : intérêt légitime (article 6.1.f).',
        'Mesurer l’audience avec des cookies (PostHog) pour améliorer le site : votre consentement (article 6.1.a), retirable à tout moment.',
      ] },
      { title: 'Durées de conservation', paragraphs: [], items: [
        'Compte, profil et frises : jusqu’à la suppression de votre compte. ' + TODO('durée de conservation des comptes inactifs'),
        'Journaux techniques : ' + TODO('durée fixée avec les hébergeurs'),
        'Choix relatif aux cookies : six mois, puis la question vous est reposée.',
        'Mesure d’audience : cookie conservé douze mois au plus et supprimé dès le retrait de votre accord ; statistiques conservées un an.',
      ] },
      { title: 'Destinataires et sous-traitants', paragraphs: [
        'Vos données ne sont ni vendues ni cédées. Elles sont traitées pour notre compte par :',
      ], items: [
        'Supabase Inc. : base de données et authentification, hébergées dans l’Union européenne.',
        'Vercel Inc. : hébergement de l’application et de l’API (États-Unis). ' + TODO('garanties de transfert hors UE : Data Privacy Framework ou clauses contractuelles types'),
        'Hostinger International Ltd. : messagerie (envoi des e-mails du compte, réception des messages adressés au contact), société établie dans l’Union européenne (Chypre).',
        'PostHog Inc. : mesure d’audience, avec votre accord, hébergée dans l’Union européenne (PostHog Cloud EU). ' + TODO('accord de sous-traitance (DPA) signé avec PostHog'),
      ] },
      { title: 'Vos droits', paragraphs: [
        'Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité, ainsi que du droit de définir des directives sur le sort de vos données après votre décès.',
        'Depuis la page Profil, section « Données et confidentialité », vous pouvez modifier votre profil, télécharger toutes vos données (format JSON) et supprimer votre compte et vos frises.',
        `Pour toute autre demande, écrivez à ${CONTACT_EMAIL} ou passez par la page Contact. Nous répondons dans un délai d’un mois, qui peut être prolongé de deux mois pour une demande complexe ; nous pouvons vous demander de justifier votre identité. Vous pouvez aussi saisir la CNIL (www.cnil.fr).`,
      ] },
      { title: 'Sécurité', paragraphs: [
        'Les échanges sont chiffrés (HTTPS). L’accès aux données est limité par des règles de sécurité au niveau de la base : chaque compte ne lit et ne modifie que ses propres données privées.',
      ] },
      { title: 'Âge minimum', paragraphs: [
        'La timeline et la recherche sont accessibles à tous, sans compte.',
        'Créer un compte est possible seul à partir de 15 ans. Avant 15 ans, il faut l’accord d’un parent (ou d’une autre personne titulaire de l’autorité parentale), comme pour accepter la mesure d’audience : c’est l’âge retenu en France par l’article 45 de la loi Informatique et Libertés.',
        'Nous ne demandons aucune pièce d’identité. Un parent qui constate qu’un enfant de moins de 15 ans a créé un compte sans son accord peut le supprimer depuis le profil ou nous demander sa suppression depuis la page Contact.',
      ] },
    ],
  },
  cookies: {
    title: 'Politique cookies',
    summary: 'Les informations stockées sur votre appareil et comment gérer votre choix.',
    updated: CURRENT_TERMS_VERSION,
    sections: [
      { title: 'Stockage nécessaire au fonctionnement', paragraphs: [
        'Ces éléments sont indispensables au service ou mémorisent un choix que vous avez fait. Ils ne nécessitent pas de consentement et ne servent à aucun suivi :',
      ], items: [
        'Session de connexion (stockage local « sb-…-auth-token ») : vous garder connecté, jusqu’à la déconnexion.',
        'Thème clair ou sombre (stockage local « theme »), affichage de la galerie (« frises:view »).',
        'Onglets de frises ouverts (stockage de session « frises:open-tabs ») : effacés à la fermeture de l’onglet.',
        'Votre choix sur les cookies (stockage local « ut-consent ») : six mois.',
      ] },
      { title: 'Mesure d’audience', paragraphs: [
        'Avec votre accord, nous utilisons PostHog (PostHog Inc., données hébergées dans l’Union européenne) pour savoir quelles pages et quelles fonctions sont utilisées, afin d’améliorer le site. Les sessions ne sont pas enregistrées et l’adresse IP n’est pas conservée. Sans votre accord, l’outil n’est même pas chargé.',
      ], items: [
        'Cookie « ph_<clé du projet>_posthog » et stockage local du même nom : identifiant pseudonyme de l’appareil et de la visite, douze mois au plus.',
        'Stockage de session « ph_<clé du projet>_… » : identifiant de l’onglet, effacé à sa fermeture.',
        'Si vous retirez votre accord, ces éléments sont supprimés et l’outil cesse toute mesure.',
      ] },
      { title: 'Gérer votre choix', paragraphs: [
        'Vous pouvez modifier ou retirer votre consentement à tout moment avec le bouton « Gérer mes préférences » ci-dessous ou depuis votre profil.',
      ] },
    ],
  },
  conditions: {
    title: 'Conditions d’utilisation',
    summary: 'Les règles d’utilisation du service et de publication des frises.',
    updated: CURRENT_TERMS_VERSION,
    sections: [
      { title: 'Objet', paragraphs: ['Universal Timeline permet de consulter des frises chronologiques et, avec un compte, d’en créer et d’en publier.', 'Le service est gratuit, sans publicité ni vente. C’est un projet personnel maintenu sur le temps libre de son éditeur, un particulier.'] },
      { title: 'Compte', paragraphs: [
        'Un compte nécessite une adresse e-mail valide et un nom d’utilisateur unique. Ce nom signe les frises que vous créez et apparaît sur les frises publiques.',
        'Vous devez avoir au moins 15 ans pour créer un compte, ou l’accord d’un parent si vous avez moins de 15 ans (voir la politique de confidentialité).',
        'Vous êtes responsable de la confidentialité de votre mot de passe. Vous pouvez supprimer votre compte à tout moment depuis votre profil : vos frises sont alors supprimées.',
      ] },
      { title: 'Contenus publiés', paragraphs: [
        'Une frise publique est visible par tous. Vous restez responsable des textes que vous publiez et vous engagez à respecter la loi et les droits des tiers.',
        'Les périodes et événements du catalogue sont partagés entre les utilisateurs et sont conservés après la suppression d’un compte.',
        `Pour signaler un contenu qui vous semble illicite ou porter atteinte à vos droits, écrivez à ${CONTACT_EMAIL} (objet « Signalement ») ou passez par la page Contact, en indiquant l’adresse de la frise.`,
        TODO('licence accordée sur les contenus publiés, règles et délais de modération'),
      ] },
      { title: 'Responsabilité et disponibilité', paragraphs: [
        'Universal Timeline est fourni tel quel, sans garantie de disponibilité continue, d’exactitude des contenus ni de durée. Le service peut être interrompu, modifié ou arrêté à tout moment ; exportez régulièrement vos frises depuis votre profil.',
        'Les données du catalogue proviennent en partie de Wikidata et des utilisateurs : elles peuvent contenir des erreurs. Dans les limites permises par la loi, l’éditeur ne peut être tenu responsable de leur usage.',
      ] },
      { title: 'Modification des conditions', paragraphs: [
        `Version en vigueur : ${CURRENT_TERMS_VERSION}. Lorsqu’elles changent, une nouvelle acceptation vous est demandée depuis votre profil.`,
      ] },
      { title: 'Droit applicable', paragraphs: [
        'Ces conditions sont soumises au droit français. En cas de désaccord, écrivez d’abord à l’éditeur depuis la page Contact pour chercher une solution amiable.',
      ] },
    ],
  },
};

export const isLegalPage = (value: unknown): value is LegalPage => LEGAL_PAGES.includes(value as LegalPage);

/** Menu shared by the legal pages and the Contact page. */
export const legalMenu = [
  ...LEGAL_PAGES.map(key => ({ key, label: legalDocuments[key].title, to: { name: 'legal', params: { page: key } } })),
  { key: 'contact', label: 'Contact', to: { name: 'contact' } },
];
