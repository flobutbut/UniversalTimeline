import { createRouter, createWebHistory } from 'vue-router';
import DatabaseView from '@/views/DatabaseView/DatabaseView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => null // La vue par défaut est gérée dans App.vue
    },
    {
      path: '/database',
      name: 'database',
      component: DatabaseView
    },
    {
      path: '/graph',
      name: 'graph',
      component: () => null
    },
    {
      path: '/events',
      name: 'events',
      component: () => null
    },
    {
      path: '/design-system',
      name: 'design-system',
      component: () => null
    }
  ]
});

export default router; 