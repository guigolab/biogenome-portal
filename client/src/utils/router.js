import Vue from "vue";
import Router from "vue-router";
import {ROOTNODE} from '../utils/static-config'


Vue.use(Router);

const routes = [
  {
    path: "/",
    name: "home-page",
    component: () => import(/* webpackPrefetch: true */ '../views/HomePage.vue'),
  },
  {
    path: "/admin",
    name: "admin",
    component: () => import(/* webpackPrefetch: true */ '../views/admin/AdminPage.vue'),
  },
  {
    path:"/form",
    name:"sample-form",
    component: () => import(/* webpackPrefetch: true */  '../views/admin/SampleFormPage.vue')
  },
  {
    path:"/excel",
    name:"excel-import",
    component: () => import(/* webpackPrefetch: true */  '../views/admin/ExcelFormPage.vue')
  },
  {
    path: "/docs",
    name: "docs",
    component: () => import(/* webpackPrefetch: true */ '../views/SwaggerPage.vue')
  },
  {
    path: "/map",
    name: "Map",
    component:() => import(/* webpackPrefetch: true */ '../views/MapPage.vue'),
  },
  {
    path: "/organisms/:name",
    name: "organism-details",
    props: true,
    component: () => import(/* webpackPrefetch: true */ '../views/OrganismDetailsPage.vue')
  },
  {
    path: "/samples/:accession",
    name: "sample-details",
    props: true,
    component: () => import(/* webpackPrefetch: true */ '../views/SampleDetailsPage.vue')
  },
  {
    path: '/tree-of-life',
    redirect: {name: 'tree-of-life', params: {node: ROOTNODE}}
  },
  {
    path: "/tree-of-life/:node",
    name: "tree-of-life",
    props: true,
    component: () => import(/* webpackPrefetch: true */ '../views/TreeOfLife.vue')
  },
  {
    path: "/submit-sample",
    name: "Submit sample",
    component:() => import(/* webpackPrefetch: true */ '../views/admin/SampleFormPage.vue'),
  },

]
const router = new Router({
    base: process.env.BASE_URL,
    routes: routes
})


export default router
