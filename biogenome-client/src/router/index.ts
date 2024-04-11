import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import DashboardPageVue from '../pages/dashboard/DashboardPage.vue'
import { navigationRoutes } from '../../config.json'
import { cmsRoutes } from './cms-routes'
import { customRoutes } from './custom-routes'

const defaultRoutes: Array<RouteRecordRaw> = [
  {
    path: '/:catchAll(.*)',
    redirect: { name: 'dashboard' },
  },
  {
    name: 'dashboard',
    path: '/',
    component: DashboardPageVue,
  },
  {
    name: 'login',
    path: '/login',
    component: () => import('../pages/auth/login/Login.vue'),
  },
  {
    name: 'unauthorized',
    path: '/unauthorized',
    component: () => import('../pages/auth/unauthorized/Unauthorized.vue'),
  }
]

function filteredRoutes():RouteRecordRaw[]{
  const validNames = navigationRoutes.map(navRoute => navRoute.name)
  return customRoutes.filter(n => validNames.includes(n.meta.name)) as RouteRecordRaw[]

}

const routes = [...defaultRoutes,...cmsRoutes, ...filteredRoutes()]
// routes.push(...customRoutes.map(r => parseRoute(r)))
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
