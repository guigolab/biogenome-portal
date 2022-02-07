import Vue from "vue";
import Router from "vue-router";



Vue.use(Router);

const routes = [
  {
    path: "/",
    name: "home-page",
    component: () => import(/* webpackPrefetch: true */ './views/HomePage.vue'),
    // children: [
    //   {
    //     path: "/login",
    //     name: "login",
    //     component: () => import(/* webpackPrefetch: true */ '../src/components/modal/LoginModal.vue')
    //   },
    // ]
  },
  {
    path: "/login",
    name: "login",
    component: () => import(/* webpackPrefetch: true */ '../src/components/modal/LoginModal.vue')
  },
  {
    path: "/admin",
    name: "admin",
    component: () => import(/* webpackPrefetch: true */ '../src/views/AdminPage.vue'),
    // children: [
    //   {createSample},
    //   {updateSample},
    // ]
  },
  {
    path: "/docs",
    name: "docs",
    component: () => import(/* webpackPrefetch: true */ '../src/views/SwaggerPage.vue')
  },
  {
    path: "/organisms/:name",
    name: "organism-details",
    props: true,
    component: () => import(/* webpackPrefetch: true */ '../src/views/OrganismDetailsPage.vue')
  },
  {
    path: "/samples/:accession",
    name: "sample-details",
    props: true,
    component: () => import(/* webpackPrefetch: true */ '../src/views/SampleDetailsPage.vue')
  },
  {
    path: '/tree-of-life',
    redirect: {name: 'tree-of-life', params: {node: 'Eukaryota'}}
  },
  {
    path: "/tree-of-life/:node",
    name: "tree-of-life",
    props: true,
    component: () => import(/* webpackPrefetch: true */ '../src/views/TreeOfLife.vue')
  },
  {
    path: "/submit-sample",
    name: "Submit sample",
    component:() => import(/* webpackPrefetch: true */ '../src/views/SampleFormPage.vue'),
  },
  {
    path: "/submit-excel",
    name: "Submit excel",
    component: () => import(/* webpackPrefetch: true */ '../src/views/ExcelFormPage.vue')
  },
  {
    path: '/submit-ena',
    name: 'ENA submission',
    component: () => import(/* webpackPrefetch: true */ '../src/views/ENASubmissionPage.vue')
  }
]
const router = new Router({
    base: process.env.BASE_URL,
    routes: routes
})

// router.beforeEach((to, from, next) => {
//   if (to.matched.some((record) => record.meta.requiresAuth)) {
//     if (store.getters.isAuthenticated) {
//       next();
//       return;
//     }
//     next("/login");
//   } else {
//     next();
//   }
// });

// router.beforeEach((to, from, next) => {
//   if (to.matched.some((record) => record.meta.guest)) {
//     if (store.getters.isAuthenticated) {
//       next("/posts");
//       return;
//     }
//     next();
//   } else {
//     next();
//   }
// });

export default router
