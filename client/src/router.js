import Vue from "vue";
import Router from "vue-router";
const HomePage = () => import(/* webpackPrefetch: true */ './views/HomePage.vue')



Vue.use(Router);

export default new Router({
  base: process.env.BASE_URL,
  routes: [
    {
      path: "/",
      name: "home-page",
      component: HomePage
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
});
