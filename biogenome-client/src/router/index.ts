import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import DashboardPageVue from '../pages/dashboard/DashboardPage.vue'
import { models, maps, cms } from '../../config.json'
import { cmsRoutes } from './cms-routes'
import { modelRoutes, mapRoutes } from './custom-routes'

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

  // const taxonomyRoute = {
  //   name: 'taxonomy',
  //   path: '/taxonomy',
  //   component: () => import('../pages/taxonomy/TaxonomyExplorer.vue'),
  //   children: [
  //     {
  //       path: 'wiki',
  //       component: () => import("../pages/taxonomy/components/Wikipedia.vue"),
  //       name: 'wiki'
  //     },
  //     mapRoutes.find(r => r.name === '2d-map'),
  //     ...customRoutes.filter(r => validNames.includes(r.name as string))
  //   ],
  //   meta: { name: 'taxonomy' }
  // } as RouteRecordRaw

  // routes.push(taxonomyRoute)

  return routes
}

const routes = [...createRoutes()]

console.log(routes)

// routes.push(...customRoutes.map(r => parseRoute(r)))
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
