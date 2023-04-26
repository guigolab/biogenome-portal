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
    name: 'login',
    path: '/login',
    component: () => import('../pages/auth/login/Login.vue'),
  },
  {
    name: 'taxons',
    path: '/taxons',
    component: () => import('../pages/taxons/TaxonPage.vue'),
  },
  {
    name: 'taxon',
    path: '/taxons/:taxid',
    component: () => import('../pages/taxons/TaxonDetails.vue'),
    props:true
  },
  {
    path: '/assemblies',
    name: 'assemblies',
    component: () => import('../pages/assemblies/AssemblyPage.vue'),
  },
  {
    path: '/assemblies/:accession',
    name: 'assembly',
    props: true,
    component: () => import('../pages/assemblies/AssemblyDetails.vue'),
    meta: {
      name: 'assemblies',
    },
  },
  {
    path: '/annotations',
    name: 'annotations',
    component: () => import('../pages/genome-annotations/GenomeAnnotationPage.vue'),
  },
  {
    path: '/annotations/:name',
    name: 'annotation',
    props: true,
    component: () => import('../pages/genome-annotations/GenomeAnnotationDetails.vue'),
    meta: {
      name: 'assemblies',
    },
  },
  {
    path: '/reads',
    name: 'reads',
    component: () => import('../pages/reads/ReadPage.vue'),
  },
  {
    path: '/reads/:accession',
    name: 'read',
    props: true,
    component: () => import('../pages/reads/ReadDetails.vue'),
    meta: {
      name: 'reads',
    },
  },
  {
    path: '/biosamples',
    name: 'biosamples',
    component: () => import('../pages/biosamples/BioSamplePage.vue'),
  },
  {
    path: '/biosamples/:accession',
    name: 'biosample',
    props: true,
    component: () => import('../pages/biosamples/BioSampleDetails.vue'),
    meta: {
      name: 'reads',
    },
  },
  {
    name: 'organisms',
    path: '/organisms',
    component: () => import('../pages/organisms/OrganismPage.vue'),
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
    component: () => import('../pages/local-samples/LocalSamplePage.vue'),
  },
  {
    name: 'local_sample',
    path: '/local_samples/:id',
    props: true,
    component: () => import('../pages/local-samples/LocalSampleDetails.vue'),
    meta: {
      name: 'local_samples',
    },
  },
  {
    name: 'status',
    path: '/status',
    component: () => import('../pages/status/StatusPage.vue'),
  },
  {
    name: 'maps',
    path: '/maps',
    component: () => import('../layouts/RouterBypass.vue'),
    children: [
      {
        name: 'countries-map',
        path: 'countries',
        component: () => import('../pages/maps/CountriesMap.vue'),
      },
      {
        name: 'organisms-map',
        path: 'organisms',
        component: () => import('../pages/maps/OrganismsMap.vue'),
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
        name: 'goat_upload',
        path: 'goat_upload',
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
  },

  {
    name: 'taxonomy',
    path: '/taxonomy',
    component: () => import('../pages/taxons/Taxonomy.vue'),
  },

]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
