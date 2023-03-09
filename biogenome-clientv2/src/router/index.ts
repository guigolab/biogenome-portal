import { createRouter, createWebHistory, RouteRecordRaw, RouterScrollBehavior } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/:catchAll(.*)',
    redirect: { name: 'dashboard' },
  },
  {
    name: 'dashboard',
    path: '/',
    component: () => import('../pages/admin/dashboard/Dashboard.vue'),
  },
  {
    name: 'home',
    path: '/home',
    component: () => import('../pages/home/Home.vue'),
  },
  {
    name: 'login',
    path: '/login',
    component: () => import('../pages/auth/login/Login.vue'),
  },
  {
    name: 'bioprojects',
    path: '/bioprojects',
    redirect: {name: 'bioproject', params: {accession: 'PRJNA533106'}}
    // component: () => import('../pages/bioprojects/BioProjects.vue'),
  },
  {
    name: 'bioproject',
    path: '/bioprojects/:accession',
    component: () => import('../pages/bioprojects/BioProjectDetails.vue'),
    props: true
  },
  {
    name: 'taxons',
    path: '/taxons',
    component: () => import('../pages/taxons/Taxon.vue'),
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
    name: 'local-samples',
    path: '/local-samples',
    component: () => import('../pages/local-samples/LocalSamplePage.vue'),
  },
  {
    name: 'local-sample',
    path: '/local-samples/:id',
    props: true,
    component: () => import('../pages/local-samples/LocalSampleDetails.vue'),
    meta: {
      name: 'local-samples',
    },
  },
  {
    name: 'status',
    path: '/status',
    component: () => import('../pages/status/StatusPage.vue'),
  },
  {
    name: 'cesium',
    path: '/cesium',
    component: () => import('../pages/maps/Cesium.vue'),
  },
  {
    name: 'cesium-node',
    path: '/cesium-node',
    component: () => import('../pages/maps/CesiumNode.vue'),
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
  // {
  //   path: "/admin",
  //   name: "admin",
  //   children:[
  //     {path:'', component:adminHP, name:"admin-hp"},
  //     {path: "excel-form", component:excel, name:"excel"},
  //     {path: "organism-form/:taxid?",component:organismForm, name:"organism-form", props:true},
  //     {path: "assembly-form",component:assembliesForm, name:"assembly-form"},
  //     {path: "annotation-form/:accession/:name?",component:annotationForm, name:"annotation-form",props:true},
  //     {path: "genome-browser-form/:accession",component:genomeBrowserForm, name:"genome-browser-form",props:true},
  //     {path: "biosample-form",component:biosampleForm, name:"biosample-form"},
  //     {path: "read-form",component:readForm, name:"read-form"}
  //   ],
  //   component: admin,
  //   meta: { requiresAuth: true }
  // },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  //  mode: process.env.VUE_APP_ROUTER_MODE_HISTORY === 'true' ? 'history' : 'hash',
  routes,
  scrollBehavior (to, from, savedPosition) {
    console.log(to)
    // window.scrollTo({});
    const el = document.getElementById('top-container')
    if(el) el.scrollTop = -100
    return {el: '#top-container',top:-50, behavior:'smooth' }
  }

  // scrollBehavior(to, from, savedPosition): RouterScrollBehavior {
  //   // savedPosition is only available for popstate navigations.
  //   if (savedPosition) return savedPosition
  //   // if the returned position is falsy or an empty object,
  //   // will retain current scroll position.
  //   if (to.params.savePosition) return {}

  //   // scroll to anchor by returning the selector
  //   if (to.hash) {
  //     const position = { selector: to.hash }

  //     // specify offset of the element
  //     // if (to.hash === '#anchor2') {
  //     //   position.offset = { y: 100 }
  //     // }
  //     return position
  //   }

  //   // scroll to top by default
  //   return { x: 0, y: 0 }
  // },
})

// router.beforeEach(async (to,from)=>{
//   const authStore = auth()
//   if(to.matched.some((record)=>record.meta.requiresAuth)){
//     if(!authStore.isAuthenticated){
//       alert('Authentication required')
//       authStore.showModal = true
//       return
//     }
//   }
// })
export default router
