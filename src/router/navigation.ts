import type { Tab } from '@/types/global';

export type NavigationView = 'timeline' | 'database' | 'graph' | 'events' | 'design-system';

export const navigationTabs: Tab<NavigationView>[] = [
  { label: 'Timeline', value: 'timeline', icon: 'mdi:timeline' },
  { label: 'Frises', value: 'database', icon: 'mdi:book-open-page-variant' },
  { label: 'Périodes', value: 'graph', icon: 'mdi:chart-tree' },
  { label: 'Événements', value: 'events', icon: 'mdi:calendar-clock' },
  { label: 'Design system', value: 'design-system', icon: 'mdi:palette-swatch' },
];

/** Catalogue tools and the design system: admins only (routes carry meta.admin, the guard enforces it). */
const ADMIN_VIEWS: ReadonlySet<NavigationView> = new Set(['graph', 'events', 'design-system']);

export function navigationTabsFor(isAdmin: boolean): Tab<NavigationView>[] {
  return navigationTabs.filter(tab => isAdmin || !ADMIN_VIEWS.has(tab.value));
}

export function navigationViewForRoute(name: unknown): NavigationView | '' {
  return navigationTabs.find(tab => tab.value === name)?.value ?? '';
}
