import { createRouter, createWebHistory } from 'vue-router'
import { cmsRoutes } from './cms-routes'


const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH : import.meta.env.BASE_URL),
  routes: cmsRoutes,
})

export default router
