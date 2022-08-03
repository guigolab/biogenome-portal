import {createWebHistory, createRouter} from 'vue-router'
import Home from '../views/Home.vue'
import {auth} from '../stores/auth'

const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION

const treeOfLife = () => import('../views/TreeOfLife.vue')
const map = () => import('../views/MapPage.vue')
const organism = () => import('../views/Organism.vue')
const admin = () => import('../views/AdminArea.vue')
const adminHP = () => import('../views/admin/LandingPage.vue')
const biosampleForm = () => import('../components/admin/form/BioSampleForm.vue')
const readForm = () => import('../components/admin/form/ReadForm.vue')
const organismForm = () => import('../components/admin/form/OrganismForm.vue')
const assembliesForm = () => import('../components/admin/form/AssemblyForm.vue')
const annotationForm = () => import('../components/admin/form/AnnotationForm.vue')
const genomeBrowserForm = () => import('../components/admin/form/GenomeBrowserForm.vue')
const sunburst = () => import('../components/SunBurst.vue')
const excel = () => import('../components/admin/form/ExcelForm.vue')
const login = () => import('../components/admin/form/Login.vue')

const routes = [
  {
    path: "/",
    name: "home",
    component: Home,
  },
  {
    path: "/sunburst",
    name: "sunburst",
    component: sunburst,
  },
  {
    path: "/admin",
    name: "admin",
    children:[
      {path:'', component:adminHP, name:"admin-hp"},
      {path:'excel-form', component:excel, name:"excel"},
      {path: "organism-form/:taxid?",component:organismForm, name:"organism-form", props:true},
      {path: "assembly-form",component:assembliesForm, name:"assembly-form"},
      {path: "annotation-form",component:annotationForm, name:"annotation-form",props:true},
      {path: "genome-browser-form/:accession",component:genomeBrowserForm, name:"genome-browser-form",props:true},
      {path: "biosample-form",component:biosampleForm, name:"biosample-form"},
      {path: "read-form",component:readForm, name:"read-form"}
    ],
    component: admin,
    meta: { requiresAuth: true }
  },
  {
    path: '/tree-of-life',
    redirect: {name: 'tree-of-life', params: {node: ROOTNODE}}
  },
  {
    path: "/tree-of-life/:node",
    name: "tree-of-life",
    props: true,
    component: treeOfLife
  },
  {
    path: '/map',
    name: 'static-map',
    component: map
  },
  {
    path: "/map/:accession",
    name: "map",
    props:true,
    component: map
  },
  {
    path: "/organisms/:taxid",
    name: "organism-details",
    props: true,
    component: organism,
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to,from)=>{
  const authStore = auth()
  if(to.matched.some((record)=>record.meta.requiresAuth)){
    if(!authStore.isAuthenticated){
      alert('Authentication required')
      authStore.showModal = true
      return 
    }
  }
})
export default router;