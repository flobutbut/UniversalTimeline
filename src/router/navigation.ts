import type { Tab } from '@/types/global';

export type NavigationView = 'timeline' | 'database' | 'graph' | 'events' | 'admin';

export const navigationTabs: Tab<NavigationView>[] = [
  { label: 'Exploration', value: 'timeline', icon: 'mdi:timeline' },
  { label: 'Frises', value: 'database', icon: 'mdi:book-open-page-variant' },
  { label: 'Périodes', value: 'graph', icon: 'mdi:chart-tree' },
  { label: 'Événements', value: 'events', icon: 'mdi:calendar-clock' },
  { label: 'Administration', value: 'admin', icon: 'mdi:shield-account-outline' },
];

/** Catalogue tools and administration: admins only (routes carry meta.admin, the guard enforces it). */
const ADMIN_VIEWS: ReadonlySet<NavigationView> = new Set(['graph', 'events', 'admin']);
/** Pages without a tab of their own, shown under the tab they belong to. */
const PARENT_VIEWS: Partial<Record<string, NavigationView>> = { 'design-system': 'admin' };

export function navigationTabsFor(isAdmin: boolean): Tab<NavigationView>[] {
  return navigationTabs.filter(tab => isAdmin || !ADMIN_VIEWS.has(tab.value));
}

export function navigationViewForRoute(name: unknown): NavigationView | '' {
  if (typeof name === 'string' && PARENT_VIEWS[name]) return PARENT_VIEWS[name]!;
  return navigationTabs.find(tab => tab.value === name)?.value ?? '';
}
