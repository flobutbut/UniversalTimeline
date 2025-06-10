import { createRouter, createWebHistory } from 'vue-router';
import DatabaseView from '../components/DatabaseView.vue';

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
    }
  ]
});

export default router; 