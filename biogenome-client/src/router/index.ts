import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useGlobalStore } from '../stores/global-store'
import OrganismsVue from '../pages/cms/organism/Organisms.vue'
import DashboardPageVue from '../pages/dashboard/DashboardPage.vue'

function isAdmin() {
  const { userRole } = useGlobalStore()
  if (userRole !== 'Admin') {
    return { name: 'unauthorized' }
  }
}

function isAuthenticated() {
  const { isAuthenticated } = useGlobalStore()
  if (!isAuthenticated) return { name: 'login' }
}

const routes: Array<RouteRecordRaw> = [
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
    name: 'taxonomy-explorer',
    path: '/taxonomy-explorer',
    component: () => import('../pages/taxonomy/TaxonomyExplorer.vue')
  },
  {
    name: 'login',
    path: '/login',
    component: () => import('../pages/auth/login/Login.vue'),
  },
  {
    name: 'unauthorized',
    path: '/unauthorized',
    component: () => import('../pages/auth/unauthorized/Unauthorized.vue'),
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
    props: true
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
    name: 'cms-dashboard',
    path: '/cms-dashboard',
    component: () => import('../pages/cms/CMSDashboard.vue'),
    beforeEnter: [isAuthenticated],
    children: [
      {
        path: '',
        name: 'cms-organisms',
        component: OrganismsVue
      },
      {
        name: 'spreadsheet-upload',
        path: 'spreadsheet-upload',
        component: () => import('../pages/cms/uploads/SpreadsheetUpload.vue'),
      },
      {
        name: 'goat-upload',
        path: 'goat-upload',
        component: () => import('../pages/cms/uploads/GoaTUpload.vue'),
      },
      {
        name: 'create-organism',
        path: 'create-organism',
        component: () => import('../pages/cms/organism/OrganismForm.vue')
      },
      {
        name: 'update-organism',
        path: 'update-organism/:taxid',
        props: true,
        component: () => import('../pages/cms/organism/OrganismForm.vue')
      },
      {
        name: 'create-user',
        path: 'create-user',
        component: () => import('../pages/cms/user/UserForm.vue')
      },
      {
        name: 'update-user',
        path: 'update-user/:name',
        props: true,
        component: () => import('../pages/cms/user/UserForm.vue')
      },
      {
        name: 'create-annotation',
        path: 'create-annotation',
        beforeEnter: [isAdmin],
        component: () => import('../pages/cms/annotation/AnnotationForm.vue'),
      },
      {
        name: 'update-annotation',
        path: 'update-annotation/:name',
        props: true,
        beforeEnter: [isAdmin],
        component: () => import('../pages/cms/annotation/AnnotationForm.vue'),
      },
      {
        name: 'chr-aliases',
        path: 'chr-aliases/:accession',
        props: true,
        beforeEnter: [isAdmin],
        component: () => import('../pages/cms/uploads/ChrAliasesForm.vue')
      },
      {
        name: 'insdc-form',
        path: 'insdc-form',
        beforeEnter: [isAdmin],
        component: () => import('../pages/cms/uploads/INSDCForm.vue'),
      },
      {
        name: 'cms-assemblies',
        path: 'assemblies',
        component: () => import('../pages/cms/assembly/Assemblies.vue')
      },
      {
        name: 'cms-biosamples',
        path: 'biosamples',
        component: () => import('../pages/cms/biosample/BioSamples.vue')
      },
      {
        name: 'cms-local_samples',
        path: 'local_samples',
        component: () => import('../pages/cms/localsample/LocalSamples.vue')
      },
      {
        name: 'cms-experiments',
        path: 'experiments',
        component: () => import('../pages/cms/experiment/Experiments.vue')
      },
      {
        name: 'cms-annotations',
        path: 'annotations',
        component: () => import('../pages/cms/annotation/Annotations.vue')
      },
      {
        name: 'cms-users',
        path: 'users',
        component: () => import('../pages/cms/user/Users.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
