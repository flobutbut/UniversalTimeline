import { createRouter, createWebHistory } from 'vue-router';
import { appRoutes } from './routes';

export default createRouter({ history: createWebHistory(), routes: appRoutes });
