import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/:catchAll(.*)',
    redirect: { name: 'dashboard' },
  },
  {
    name: 'dashboard',
    path: '/',
    component: () => import('../pages/dashboard/DashboardPage.vue'),
  },
  {
    name: 'taxonomy-explorer',
    path:'/taxonomy-explorer',
    component: () => import('../pages/taxonomy/TaxonomyExplorer.vue')
  },
  {
    name: 'login',
    path: '/login',
    component: () => import('../pages/auth/login/Login.vue'),
  },
  {
    name: 'taxons',
    path: '/taxons',
    component: () => import('../pages/taxons/Taxons.vue'),
  },
  {
    name: 'taxon',
    path: '/taxons/:taxid',
    component: () => import('../pages/taxons/Taxon.vue'),
    props:true
  },
  {
    path: '/assemblies',
    name: 'assemblies',
    component: () => import('../pages/assemblies/Assemblies.vue'),
  },
  {
    path: '/assemblies/:accession',
    name: 'assembly',
    props: true,
    component: () => import('../pages/assemblies/Assembly.vue'),
    meta: {
      name: 'assemblies',
    },
  },
  {
    path: '/annotations',
    name: 'annotations',
    component: () => import('../pages/genome-annotations/GenomeAnnotations.vue'),
  },
  {
    path: '/annotations/:name',
    name: 'annotation',
    props: true,
    component: () => import('../pages/genome-annotations/GenomeAnnotation.vue'),
    meta: {
      name: 'assemblies',
    },
  },
  {
    path: '/experiments',
    name: 'experiments',
    component: () => import('../pages/experiments/Experiments.vue'),
  },
  {
    path: '/experiments/:accession',
    name: 'experiment',
    props: true,
    component: () => import('../pages/experiments/Experiment.vue'),
    meta: {
      name: 'experiments',
    },
  },
  {
    path: '/biosamples',
    name: 'biosamples',
    component: () => import('../pages/biosamples/BioSamples.vue'),
  },
  {
    path: '/biosamples/:accession',
    name: 'biosample',
    props: true,
    component: () => import('../pages/biosamples/BioSample.vue')
  },
  {
    name: 'organisms',
    path: '/organisms',
    component: () => import('../pages/organisms/Organisms.vue'),
  },
  {
    name: 'organism',
    path: '/organisms/:taxid',
    props: true,
    component: () => import('../pages/organisms/Organism.vue'),
    meta: {
      name: 'organisms',
    },
  },
  {
    name: 'local_samples',
    path: '/local_samples',
    component: () => import('../pages/local-samples/LocalSamples.vue'),
  },
  {
    name: 'local_sample',
    path: '/local_samples/:id',
    props: true,
    component: () => import('../pages/local-samples/LocalSample.vue'),
    meta: {
      name: 'local_samples',
    },
  },
  {
    name: 'status',
    path: '/status',
    component: () => import('../pages/status/Status.vue'),
  },
  {
    name: '2d-map',
    path: '/2d-map',
    component: () => import('../pages/maps/2DOrganisms.vue'),
  },
  {
    name: '3d-map',
    path: '/3d-map',
    component: () => import('../layouts/RouterBypass.vue'),
    children: [
      {
        name: 'countries-map',
        path: 'countries-map',
        component: () => import('../pages/maps/3DCountries.vue'),
      },
      {
        name: 'organisms-map',
        path: 'organisms-map',
        component: () => import('../pages/maps/3DOrganisms.vue'),
      },
    ],
  },
  {
    name: 'forms',
    path: '/forms',
    component: () => import('../layouts/RouterBypass.vue'),
    children: [
      {
        name: 'crud-table',
        path: 'admin',
        component: () => import('../pages/forms/AdminPage.vue'),
      },
      {
        name: 'insdc-forms',
        path: 'insdc-form',
        component: () => import('../pages/forms/INSDCForm.vue'),
      },
      {
        name: 'spreadsheet-upload',
        path: 'spreadsheet-upload',
        component: () => import('../pages/forms/SpreadsheetUpload.vue'),
      },
      {
        name: 'goat-upload',
        path: 'goat-upload',
        component: () => import('../pages/forms/GoaTUpload.vue'),
      },
      {
        name: 'organism-form',
        path: 'organism-form/:taxid?',
        props: true,
        component: () => import('../pages/forms/OrganismForm.vue'),
      },
      {
        name: 'annotation-form',
        path: 'annotation-form/:assemblyAccession/:id?',
        props: true,
        component: () => import('../pages/forms/AnnotationForm.vue'),
      },
      {
        name: 'local-sample-form',
        path: 'local-sample-form/:id?',
        props: true,
        component: () => import('../pages/forms/LocalSampleForm.vue'),
      },
    ],
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
