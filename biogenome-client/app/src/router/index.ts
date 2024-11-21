import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '../pages/Home.vue'

const defaultRoutes: Array<RouteRecordRaw> = [
  {
    path: '/:catchAll(.*)',
    redirect: { name: 'dashboard' },
  },
  {
    name: 'home',
    path: '/',
    component: Home,
  },
  {
    path: '/:model',
    name: 'items',
    component: () => import('../pages/Items.vue'),
    props: true,
  },
  {
    path: '/:model/:id',
    name: 'item',
    component: () => import('../pages/Items.vue'),
    props: true,
  },
  {
    path: '/taxons',
    name: 'taxonomy',
    component: () => import('../pages/Items.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH : import.meta.env.BASE_URL),
  routes: defaultRoutes,
})

export default router
