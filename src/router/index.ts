import { createRouter, createWebHistory } from 'vue-router';
import { AppRouteShell } from './AppRouteShell';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/timeline',
    },
    {
      path: '/timeline',
      name: 'timeline',
      component: AppRouteShell,
    },
    {
      path: '/database',
      name: 'database',
      component: AppRouteShell,
    },
    {
      path: '/graph',
      name: 'graph',
      component: AppRouteShell,
    },
    {
      path: '/events',
      name: 'events',
      component: AppRouteShell,
    },
    {
      path: '/design-system',
      name: 'design-system',
      component: AppRouteShell,
    }
  ]
});

export default router; 