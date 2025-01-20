import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '../pages/Home.vue'


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
    component: () => import('../pages/Items.vue')
  }
  // {
  //   name: 'data',
  //   props: true,
  //   path: ':model/:id',
  //   component: () => import('../pages/Item.vue')
  // },
  // {
  //   path: '/taxons/:taxid',
  //   props: (route: RouteLocationNormalizedLoaded) => ({ taxid: route.query.taxid || 'root' }),
  //   component: () => import('../layouts/DataLayout.vue'),
  //   children: [
  //     {
  //       name: 'taxon',
  //       props: true,
  //       path: '',
  //       component: () => import('../pages/DashBoard.vue')
  //       // taxon details
  //     },
  //     {
  //       name: 'items',
  //       props: true,
  //       path: ':model',
  //       component: () => import('../pages/Items.vue')
  //     },
  //     {
  //       name: 'item',
  //       props: true,
  //       path: ':model/:id',
  //       component: () => import('../pages/Item.vue')
  //     },
  //     {
  //       path: 'tree',
  //       props: true,
  //       component: () => import('../pages/Tree.vue'),
  //       name: 'tree'
  //     },
  //     {
  //       path: 'countries',
  //       props: true,
  //       component: () => import('../pages/Tree.vue'),
  //       name: 'countries'
  //     },
  //     {
  //       path: 'genome-browser',
  //       props: true,
  //       component: () => import('../pages/Tree.vue'),
  //       name: 'browser'
  //     }
  //   ] as RouteRecordRaw[],
  // }
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
