import { createRouter, createWebHistory, RouteRecord, RouteRecordRaw } from 'vue-router'
import DashboardPageVue from '../pages/dashboard/DashboardPage.vue'
import general from '../../configs/general.json'
import pages from '../../configs/pages.json'
import { cmsRoutes } from './cms-routes'
import { modelRoutes } from './custom-routes'


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
    path: '/data',
    redirect: { name: 'taxon', params: { taxid: 'root' } }
  },
]

function createCustomRoutes() {

  const taxonRoute = {
    path: '/taxons/:taxid',
    props: (route: any) => ({ taxid: route.params.taxid || 'root' }),
    component: () => import('../layouts/DataLayout.vue'),
    children: [
      {
        name: 'taxon',
        props: true,
        path: '',
        component: () => import('../pages/DashBoard.vue')
      },


      {
        path: 'tree',
        props: true,
        component: () => import('../pages/Tree.vue'),
        name: 'tree'
      }
    ] as RouteRecordRaw[],
  }

  const modelConfigs = { ...pages } as Record<string, any>
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
    })
  taxonRoute.children.push(...customRoutes)
  return taxonRoute
}

function initRoutes() {

  const routes = [...defaultRoutes]


  if (general.cms) routes.push(...cmsRoutes)


  const dataRoute = createCustomRoutes()

  routes.push(dataRoute)


  return routes
}

const routes = initRoutes()

console.log(routes)

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH : import.meta.env.BASE_URL),
  routes,
})

export default router
