import type { Tab } from '@/types/global';

export type NavigationView = 'timeline' | 'catalogue' | 'database' | 'graph' | 'events' | 'admin';

export const navigationTabs: Tab<NavigationView>[] = [
  { label: 'Exploration', value: 'timeline', icon: 'mdi:timeline' },
  { label: 'Catalogue', value: 'catalogue', icon: 'mdi:view-grid-outline' },
  { label: 'Mes frises', value: 'database', icon: 'mdi:book-open-page-variant' },
  { label: 'Administration', value: 'admin', icon: 'mdi:shield-account-outline' },
];

/** Catalogue tools and administration: admins only (routes carry meta.admin, the guard enforces it). */
const ADMIN_VIEWS: ReadonlySet<NavigationView> = new Set(['graph', 'events', 'admin']);
/** Pages without a tab of their own, shown under the tab they belong to. */
const PARENT_VIEWS: Partial<Record<string, NavigationView>> = { graph: 'admin', events: 'admin', 'design-system': 'admin', 'wikidata-generation': 'database', 'navigation-prototype': 'timeline' };

export function navigationTabsFor(isAdmin: boolean, signedIn = true): Tab<NavigationView>[] {
  return navigationTabs.filter(tab => signedIn
    ? isAdmin || !ADMIN_VIEWS.has(tab.value)
    : tab.value === 'timeline' || tab.value === 'catalogue');
}

export function navigationViewForRoute(name: unknown): NavigationView | '' {
  if (typeof name === 'string' && PARENT_VIEWS[name]) return PARENT_VIEWS[name]!;
  return navigationTabs.find(tab => tab.value === name)?.value ?? '';
}
