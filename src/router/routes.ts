import type { RouteRecordRaw } from 'vue-router';

/** The router loads each page only when its route is first visited. */
export const appRoutes: RouteRecordRaw[] = [
  { path: '/', name: 'landing', meta: { public: true, landing: true }, component: () => import('@/views/LandingView.vue') },
  { path: '/voyage', name: 'landing-scroll', meta: { public: true, landing: true }, component: () => import('@/views/ScrollLandingView.vue') },
  { path: '/timeline', name: 'timeline', meta: { public: true }, component: () => import('@/views/HomeView.vue') },
  { path: '/database', name: 'database', component: () => import('@/views/DatabaseView/DatabaseView.vue') },
  { path: '/periods', alias: '/graph', name: 'graph', component: () => import('@/views/GraphView/Periods.vue') },
  { path: '/events', name: 'events', component: () => import('@/views/EventsView/EventsView.vue') },
  { path: '/profile', name: 'profile', component: () => import('@/views/ProfileView.vue') },
  { path: '/legal', redirect: { name: 'legal', params: { page: 'mentions-legales' } } },
  { path: '/legal/:page(mentions-legales|confidentialite|cookies|conditions)', name: 'legal', meta: { public: true }, component: () => import('@/views/LegalView.vue') },
  { path: '/design-system', name: 'design-system', meta: { admin: true }, component: () => import('@/views/DesignSystemView/DesignSystemView.vue') },
  { path: '/login', name: 'login', meta: { public: true }, component: () => import('@/views/LoginView.vue') },
  { path: '/forbidden', name: 'forbidden', meta: { public: true }, component: () => import('@/views/ForbiddenView.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', meta: { public: true }, component: () => import('@/views/NotFoundView.vue') },
];
