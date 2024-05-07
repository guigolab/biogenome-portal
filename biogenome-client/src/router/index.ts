import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import DashboardPageVue from '../pages/dashboard/DashboardPage.vue'
import { models, maps, cms } from '../../config.json'
import { cmsRoutes } from './cms-routes'
import { modelRoutes, mapRoutes } from './custom-routes'

const rootNode = import.meta.env.VITE_ROOT_NODE ?
  import.meta.env.VITE_ROOT_NODE : '131567'


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
  },
  {
    name: 'taxonomy',
    path: '/taxonomy',
    component: () => import('../pages/taxonomy/Taxonomy.vue'),
    children: [
      {
        name: 'taxon',
        path: ':taxid',
        props: true,
        component: () => import('../pages/taxonomy/Taxon.vue'),
        meta: { name: 'taxonomy' }
      }
    ],
    meta: { name: 'taxonomy' }
  },

]

function createRoutes() {

  const routes = [...defaultRoutes]

  const modelConfigs = { ...models } as Record<string, any>
  if (cms) routes.push(...cmsRoutes)

  if (maps) routes.push(...mapRoutes.filter(r => maps.includes(r.name)) as RouteRecordRaw[])

  const validNames = Object.keys(modelConfigs)

  const customRoutes = modelRoutes
    .filter(route => validNames.includes(route.meta.name))
    .map(route => {

      //inject configs props
      return {
        props: { config: modelConfigs[route.meta.name] },
        ...route
      }
    }) as RouteRecordRaw[]

  routes.push(...customRoutes)

  return routes
}

const routes = [...createRoutes()]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
