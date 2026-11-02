// Legal texts. Every « [À compléter …] » marks content the publisher must supply before going public;
// facts about the current technical setup are written in full. Keep them in sync with
// Documentation/RGPD.md (register of processing activities).
import { CURRENT_TERMS_VERSION } from '@account-rules';

export const LEGAL_PAGES = ['mentions-legales', 'confidentialite', 'cookies', 'conditions'] as const;
export type LegalPage = typeof LEGAL_PAGES[number];
export interface LegalSection { title: string; paragraphs: string[]; items?: string[] }
export interface LegalDocument { title: string; summary: string; updated: string; sections: LegalSection[] }

const TODO = (what: string) => `[À compléter : ${what}]`;

export const legalDocuments: Record<LegalPage, LegalDocument> = {
  'mentions-legales': {
    title: 'Mentions légales',
    summary: 'Qui édite et héberge Universal Timeline.',
    updated: CURRENT_TERMS_VERSION,
    sections: [
      { title: 'Éditeur du site', paragraphs: [TODO('nom ou raison sociale de l’éditeur, adresse postale, adresse e-mail de contact, numéro SIREN/RCS le cas échéant')] },
      { title: 'Directeur de la publication', paragraphs: [TODO('nom du directeur ou de la directrice de la publication')] },
      { title: 'Hébergement', paragraphs: [
        'Application et API : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com).',
        'Base de données et authentification : Supabase Inc., données hébergées dans l’Union européenne (région Francfort, Allemagne).',
        TODO('vérifier ces adresses au moment de la publication'),
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
      { title: 'Responsable du traitement', paragraphs: [TODO('identité et coordonnées du responsable du traitement ; délégué à la protection des données si désigné')] },
      { title: 'Données traitées', paragraphs: ['Nous ne collectons que les données nécessaires au service :'], items: [
        'Compte : adresse e-mail et mot de passe (stocké sous forme chiffrée par le service d’authentification), date d’inscription.',
        'Profil : nom d’utilisateur, couleur et icône d’avatar, version et date d’acceptation des conditions.',
        'Contenus : les frises que vous créez, leur visibilité et leurs liens avec le catalogue. Une frise publique affiche votre nom d’utilisateur.',
        'Données techniques : journaux de connexion et d’erreur des hébergeurs (adresse IP, date, requête), utilisés pour la sécurité.',
      ] },
      { title: 'Finalités et bases légales', paragraphs: [], items: [
        'Créer et gérer votre compte, publier vos frises : exécution du contrat (article 6.1.b du RGPD).',
        'Sécuriser le service et prévenir les abus : intérêt légitime (article 6.1.f).',
        'Mesurer l’audience avec des cookies : votre consentement (article 6.1.a). Aucune mesure d’audience n’est active à ce jour.',
      ] },
      { title: 'Durées de conservation', paragraphs: [], items: [
        'Compte, profil et frises : jusqu’à la suppression de votre compte. ' + TODO('durée de conservation des comptes inactifs'),
        'Journaux techniques : ' + TODO('durée fixée avec les hébergeurs'),
        'Choix relatif aux cookies : six mois, puis la question vous est reposée.',
      ] },
      { title: 'Destinataires et sous-traitants', paragraphs: [
        'Vos données ne sont ni vendues ni cédées. Elles sont traitées pour notre compte par :',
      ], items: [
        'Supabase Inc. : base de données et authentification, hébergées dans l’Union européenne.',
        'Vercel Inc. : hébergement de l’application et de l’API (États-Unis). ' + TODO('garanties de transfert hors UE : Data Privacy Framework ou clauses contractuelles types'),
      ] },
      { title: 'Vos droits', paragraphs: [
        'Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité, ainsi que du droit de définir des directives sur le sort de vos données après votre décès.',
        'Depuis la page Profil, section « Données et confidentialité », vous pouvez modifier votre profil, télécharger toutes vos données (format JSON) et supprimer votre compte et vos frises.',
        'Pour toute autre demande : ' + TODO('adresse e-mail de contact dédiée aux données personnelles') + '. Vous pouvez aussi saisir la CNIL (www.cnil.fr).',
      ] },
      { title: 'Sécurité', paragraphs: [
        'Les échanges sont chiffrés (HTTPS). L’accès aux données est limité par des règles de sécurité au niveau de la base : chaque compte ne lit et ne modifie que ses propres données privées.',
      ] },
      { title: 'Âge minimum', paragraphs: [TODO('âge minimum pour créer un compte et, le cas échéant, recueil de l’accord parental')] },
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
        'Aucun cookie de mesure d’audience n’est déposé aujourd’hui. Lorsqu’un outil sera installé, il ne fonctionnera qu’après votre accord, et le bandeau vous permettra de refuser aussi simplement que d’accepter.',
        TODO('nom de l’outil, finalités précises, cookies déposés et durée de vie, le jour de son installation'),
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
      { title: 'Objet', paragraphs: ['Universal Timeline permet de consulter des frises chronologiques et, avec un compte, d’en créer et d’en publier.', TODO('présentation juridique complète du service')] },
      { title: 'Compte', paragraphs: [
        'Un compte nécessite une adresse e-mail valide et un nom d’utilisateur unique. Ce nom signe les frises que vous créez et apparaît sur les frises publiques.',
        'Vous êtes responsable de la confidentialité de votre mot de passe. Vous pouvez supprimer votre compte à tout moment depuis votre profil : vos frises sont alors supprimées.',
      ] },
      { title: 'Contenus publiés', paragraphs: [
        'Une frise publique est visible par tous. Vous restez responsable des textes que vous publiez et vous engagez à respecter la loi et les droits des tiers.',
        'Les périodes et événements du catalogue sont partagés entre les utilisateurs et sont conservés après la suppression d’un compte.',
        TODO('licence accordée sur les contenus publiés, modération et signalement'),
      ] },
      { title: 'Responsabilité et disponibilité', paragraphs: [TODO('limitation de responsabilité, disponibilité du service')] },
      { title: 'Modification des conditions', paragraphs: [
        `Version en vigueur : ${CURRENT_TERMS_VERSION}. Lorsqu’elles changent, une nouvelle acceptation vous est demandée depuis votre profil.`,
      ] },
      { title: 'Droit applicable', paragraphs: [TODO('droit applicable et juridiction compétente')] },
    ],
  },
};

export const isLegalPage = (value: unknown): value is LegalPage => LEGAL_PAGES.includes(value as LegalPage);
