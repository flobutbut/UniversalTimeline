import type { Tab } from '@/types/global';

export type NavigationView = 'timeline' | 'database' | 'graph' | 'events' | 'design-system';

export const navigationTabs: Tab<NavigationView>[] = [
  { label: 'Timeline', value: 'timeline', icon: 'mdi:timeline' },
  { label: 'Frises', value: 'database', icon: 'mdi:book-open-page-variant' },
  { label: 'Periods', value: 'graph', icon: 'mdi:chart-tree' },
  { label: 'Events', value: 'events', icon: 'mdi:calendar-clock' },
  { label: 'Design system', value: 'design-system', icon: 'mdi:palette-swatch' },
];

export function navigationViewForRoute(name: unknown): NavigationView | '' {
  return navigationTabs.find(tab => tab.value === name)?.value ?? '';
}
