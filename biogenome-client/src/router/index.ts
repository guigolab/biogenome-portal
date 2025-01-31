import { createRouter, createWebHistory, RouteLocationNormalized, RouteRecordRaw } from 'vue-router'
import Home from '../pages/Home.vue'
import { dataModels, DataModels } from '../data/types'


export function isDataModel(to: RouteLocationNormalized) {
  const model = to.params.model
  if (!dataModels.includes(model as DataModels))
  {
    return {name: 'home'}
  }
}

const defaultRoutes: Array<RouteRecordRaw> = [
  {
    path: '/:catchAll(.*)',
    redirect: { name: 'home' },
  },
  {
    name: 'home',
    path: '/',
    component: Home,
  },
  {
    path: '/data',
    redirect: { name: 'model', params: { model: 'organisms' } },
  },
  {
    name: 'model',
    path: '/data/:model',
    props: true,
    component: () => import('../pages/Items.vue'),
    beforeEnter: [isDataModel],
  },
  {
    name: 'item',
    path: '/data/:model/:id',
    props: true,
    component: () => import('../pages/Item.vue'),
    beforeEnter: [isDataModel],
  },
  {
    name: 'tree',
    path: '/tree',
    redirect : '/'

    // component: () => import('../pages/Tree.vue')
  },
  {
    name: 'jbrowse',
    path: '/jbrowse',
    redirect : '/'
    // component: () => import('../pages/GenomeBrowser.vue')
  }

]

function initRoutes() {

  const routes = [...defaultRoutes]

  // if (general.cms) routes.push(...cmsRoutes)

  return routes
}

const routes = initRoutes()
const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH : import.meta.env.BASE_URL),
  routes,
})

export default router
