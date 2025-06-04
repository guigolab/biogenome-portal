import { createRouter, createWebHistory, RouteLocationNormalized, RouteRecordRaw } from 'vue-router'
import { dataModels, DataModels } from '../data/types'
import { cmsRoutes } from './cms-routes'
import Home from '../pages/front/Home.vue'

export function isDataModel(to: RouteLocationNormalized) {
  const model = to.params.model
  if (!dataModels.includes(model as DataModels)) {
    return { name: 'home' }
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
    meta: { layout: 'DataLayout' }
  },
  {
    path: '/data',
    redirect: { name: 'model', params: { model: 'organisms' } },
  },
  {
    name: 'model',
    path: '/data/:model',
    props: true,
    meta: { layout: 'DataLayout' },

    component: () => import('../pages/front/Items.vue'),
    beforeEnter: [isDataModel],
  },
  {
    name: 'item',
    path: '/data/:model/:id',
    props: true,
    meta: { layout: 'DataLayout' },

    component: () => import('../pages/front/Item.vue'),
    beforeEnter: [isDataModel],
  },
  {
    name: 'tree',
    path: '/tree',
    component: () => import('../pages/front/Tree.vue')
  },
  {
    name: 'map',
    path: '/map',
    component: () => import('../pages/front/Map.vue')
  },
  {
    name: 'jbrowse',
    path: '/jbrowse',
    component: () => import('../pages/front/GenomeBrowser.vue')
    //redirect: { name: 'home' }
  },
  {
    name: 'login',
    path: '/login',
    component: () => import('../pages/cms/Login.vue')
  },
  {
    name: 'unauthorized',
    path: '/unauthorized',
    component: () => import('../pages/cms/Unauthorized.vue')
  }

]

function initRoutes() {

  const routes = [...defaultRoutes, ...cmsRoutes as RouteRecordRaw[]]
  return routes
}

const routes = initRoutes()

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH : import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Always scroll to top
    return { top: 0 }
  }
})

export default router
