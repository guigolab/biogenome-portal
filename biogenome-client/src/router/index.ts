import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import DashboardPageVue from '../pages/dashboard/DashboardPage.vue'
import general from '../../configs/general.json'
import pages from '../../configs/pages.json'
import { modelRoutes, mapRoutes } from './custom-routes'

const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'

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
    path: '/taxonomy',
    component: () => import('../pages/taxonomy/Taxonomy.vue'),
    children: [
      {
        name: 'taxonomy',
        path: '',
        redirect: { name: 'wiki', params: { lineage: rootNode } },
        meta: { name: 'taxonomy' }
      },
      {
        name: 'taxon',
        path: ':lineage',
        props: true,
        component: () => import('../pages/taxonomy/Taxon.vue'),
        meta: { name: 'taxonomy' },
        children: [
          {
            name: 'wiki',
            path: '',
            props: true,
            component: () => import('../pages/taxonomy/components/Wikipedia.vue')
          },
          {
            name: 'items',
            path: ':model',
            props: true,
            component: () => import('../pages/common/Items.vue')
          },
          {
            name: 'map',
            path: 'map',
            props: true,
            component: () => import('../components/maps/LeafletMap.vue')
          }
        ]
      }
    ],
    meta: { name: 'taxonomy' }
  },
]

function createRoutes() {

  const routes = [...defaultRoutes]

  const modelConfigs = { ...pages } as Record<string, any>

  if (general.maps && general.maps.length) routes.push(...mapRoutes.filter(r => general.maps.includes(r.name)) as RouteRecordRaw[])

  const validNames = Object.keys(modelConfigs)

  const customRoutes = modelRoutes
    .filter(route => validNames.includes(route.meta.name))
    .map(route => {

      const { title, description } = modelConfigs[route.meta.name]
      const config = { title, description }
      //inject configs props
      return {
        props: { config },
        ...route
      }
    }) as RouteRecordRaw[]

  routes.push(...customRoutes)

  return routes
}

const routes = [...createRoutes()]

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH : import.meta.env.BASE_URL),
  routes,
})

export default router
