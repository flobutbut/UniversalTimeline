/** Shared by the HTML response and SPA navigation. No account data belongs in this module. */
export const SITE_ORIGIN = 'https://universaltimeline.net';
const BRAND = 'Universal Timeline';
export interface PageMetadata { title: string; description: string; robots: 'index, follow' | 'noindex, follow'; canonical?: string }
export interface PublicStoryMetadata { id: string; title: string; description: string }

const pages: Record<string, { title: string; description: string; index?: boolean }> = {
  '/': { title: 'Frises chronologiques interactives', description: 'Explorez des frises chronologiques, du Big Bang à l’histoire humaine. Comparez les durées et créez vos propres frises avec Universal Timeline.', index: true },
  '/timeline': { title: 'Explorer les frises chronologiques', description: 'Parcourez les périodes et les événements des frises chronologiques publiques d’Universal Timeline.' },
  '/catalogue': { title: 'Catalogue des frises chronologiques', description: 'Découvrez les frises chronologiques publiques par thème et par époque, puis explorez leurs périodes et événements.' },
  '/voyage': { title: 'Du cosmos à l’instant', description: 'Un voyage visuel dans les échelles du temps, de l’Univers à une seconde.' },
  '/search': { title: 'Rechercher une frise', description: 'Recherchez une frise chronologique ou un sujet Wikidata dans Universal Timeline.' },
  '/generate': { title: 'Préparer une frise depuis Wikidata', description: 'Préparez et vérifiez les éléments d’une frise chronologique à partir de Wikidata.' },
  '/database': { title: 'Mes frises', description: 'Gérez vos frises chronologiques dans votre espace Universal Timeline.' },
  '/periods': { title: 'Catalogue des périodes', description: 'Administration du catalogue des périodes d’Universal Timeline.' },
  '/graph': { title: 'Catalogue des périodes', description: 'Administration du catalogue des périodes d’Universal Timeline.' },
  '/events': { title: 'Catalogue des événements', description: 'Administration du catalogue des événements d’Universal Timeline.' },
  '/admin': { title: 'Administration', description: 'Espace d’administration d’Universal Timeline.' },
  '/profile': { title: 'Mon profil', description: 'Gérez votre profil et vos préférences Universal Timeline.' },
  '/design-system': { title: 'Design system', description: 'Composants et styles d’Universal Timeline.' },
  '/contact': { title: 'Contact', description: 'Contactez l’éditeur d’Universal Timeline pour une question ou pour signaler une erreur dans une frise.', index: true },
  '/legal': { title: 'Informations légales', description: 'Informations légales d’Universal Timeline.' },
  '/legal/mentions-legales': { title: 'Mentions légales', description: 'Éditeur, hébergement et informations légales du site Universal Timeline.', index: true },
  '/legal/confidentialite': { title: 'Confidentialité', description: 'Utilisation et protection de vos données personnelles sur Universal Timeline.', index: true },
  '/legal/cookies': { title: 'Cookies et mesure d’audience', description: 'Comprenez les cookies, la mesure d’audience et vos choix sur Universal Timeline.', index: true },
  '/legal/conditions': { title: 'Conditions d’utilisation', description: 'Règles d’utilisation du service et de publication des frises Universal Timeline.', index: true },
  '/login': { title: 'Connexion et inscription', description: 'Connectez-vous ou créez un compte Universal Timeline pour gérer vos frises chronologiques.' },
  '/reset-password': { title: 'Réinitialiser mon mot de passe', description: 'Récupérez l’accès à votre compte Universal Timeline.' },
  '/forbidden': { title: 'Accès réservé', description: 'Cette page Universal Timeline nécessite des droits supplémentaires.' },
};
export const SEO_PATHS = Object.keys(pages);
/** Acquisition pages with existing visible content; do not advertise empty app states. */
export const SITEMAP_PATHS = ['/', '/contact'];
export const normalizePath = (path: string) => path.replace(/\/+$/, '').toLowerCase() || '/';
export const isKnownPage = (path: string) => Object.prototype.hasOwnProperty.call(pages, normalizePath(path));
export function timelineStoryId(params: URLSearchParams): string | null {
  const values = params.getAll('story');
  if (!values.length) return '1'; // Same entry frise as useHomeNavigation.
  return values.length === 1 && /^[1-9]\d{0,9}$/.test(values[0]) && Number(values[0]) <= 2147483647 ? values[0] : null;
}
const compact = (value: string) => value.replace(/\s+/g, ' ').trim();

export function pageMetadata(url: URL, story?: PublicStoryMetadata | null, allowIndexing = true): PageMetadata {
  const path = normalizePath(url.pathname);
  const page = pages[path];
  let title = page?.title ?? 'Page introuvable';
  let description = page?.description ?? 'Ce lien ne correspond à aucune page d’Universal Timeline.';
  let index = page?.index === true;
  let canonical = page && index ? `${SITE_ORIGIN}${path}` : undefined;
  if (path === '/timeline' && story && story.id === timelineStoryId(url.searchParams) && compact(story.title)) {
    title = `${compact(story.title)} — frise chronologique`;
    description = compact(story.description) || `Explorez la frise « ${compact(story.title)} », ses périodes et ses événements dans Universal Timeline.`;
    // Only a public frise's entry/overview is an acquisition page in this first lot.
    // Other positions keep working, without a canonical pointing at a different view.
    index = !['compare', 'period', 'context', 'reference'].some(key => url.searchParams.has(key));
    if (url.searchParams.has('view') && (url.searchParams.get('view') !== 'overview' || url.searchParams.has('period'))) index = false;
    if (url.searchParams.has('entry') && (url.searchParams.get('entry') !== 'universe' || url.searchParams.getAll('entry').length !== 1)) index = false;
    const reference = new URL('/timeline', SITE_ORIGIN);
    reference.searchParams.set('story', story.id);
    for (const key of ['period', 'context', 'reference', 'view']) {
      const values = url.searchParams.getAll(key);
      if (values.length > 1) index = false;
      else if (values.length) {
        if (!values[0].trim() || values[0].length > 200 || /[\u0000-\u001f\u007f]/.test(values[0])) index = false;
        if (key === 'context' && timelineStoryId(new URLSearchParams({ story: values[0] })) === null) index = false;
        reference.searchParams.set(key, values[0]);
      }
    }
    canonical = index ? reference.href : undefined;
  }
  if (!allowIndexing) { index = false; canonical = undefined; }
  return { title: `${title} | ${BRAND}`, description, robots: index ? 'index, follow' : 'noindex, follow', ...(canonical ? { canonical } : {}) };
}

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Replace only managed head tags. The app, assets, fonts and visible markup are preserved. */
export function renderMetadata(html: string, metadata: PageMetadata): string {
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0) throw new Error('HTML template has no head');
  const head = html.slice(0, headEnd)
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*\bname=["'](?:description|robots)["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '');
  const tags = [`<title>${escapeHtml(metadata.title)}</title>`, `<meta name="description" content="${escapeHtml(metadata.description)}" />`, `<meta name="robots" content="${metadata.robots}" />`];
  if (metadata.canonical) tags.push(`<link rel="canonical" href="${escapeHtml(metadata.canonical)}" />`);
  return `${head}${tags.join('\n    ')}\n  ${html.slice(headEnd)}`;
}
