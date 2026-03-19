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
      name: 'home',
      path: '/',
      component: Home,
      meta: { layout: 'DataLayout' },
   },
   {
      path: '/data',
      redirect: { name: 'model', params: { model: 'organisms' } },
   },
   {
      name: 'dataMap',
      path: '/data/map',
      component: () => import('../pages/front/Data.vue'),
      meta: { layout: 'DataExplorerLayout' },
   },
   {
      name: 'model',
      path: '/data/:model',
      props: true,
      meta: { layout: 'DataExplorerLayout' },
      component: () => import('../pages/front/Data.vue'),
      beforeEnter: [isDataModel],
   },
   {
      name: 'item',
      path: '/data/:model/:id',
      props: true,
      meta: { layout: 'DataExplorerLayout' },
      component: () => import('../pages/front/Data.vue'),
      beforeEnter: [isDataModel],
   },
   {
      name: 'tree',
      path: '/tree',
      component: () => import('../pages/front/Tree.vue'),
   },
   {
      path: '/map',
      redirect: { name: 'dataMap' },
   },
   {
      name: 'jbrowse',
      path: '/jbrowse',
      component: () => import('../pages/front/GenomeBrowser.vue'),
      meta: { layout: 'DataLayout' },
   },
   {
      name: 'login',
      path: '/login',
      component: () => import('../pages/cms/Login.vue'),
   },
   {
      name: 'unauthorized',
      path: '/unauthorized',
      component: () => import('../pages/cms/Unauthorized.vue'),
   },
   {
      path: '/:catchAll(.*)',
      redirect: { name: 'home' },
   },
]

function initRoutes() {
   const routes = [...defaultRoutes, ...(cmsRoutes as RouteRecordRaw[])]
   return routes
}

const routes = initRoutes()

const router = createRouter({
   history: createWebHistory(
      import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH : import.meta.env.BASE_URL,
   ),
   routes,
   scrollBehavior(to, from, savedPosition) {
      // Always scroll to top
      return { top: 0 }
   },
})

export default router
