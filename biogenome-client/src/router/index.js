import {createWebHistory, createRouter} from 'vue-router'
import Home from '../views/NewHome.vue'
import {auth} from '../stores/auth'

const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const BASE_PATH = import.meta.env.VITE_BASE_PATH
const organism = () => import('../views/OrganismPage.vue')
const admin = () => import('../views/AdminArea.vue')
const adminHP = () => import('../views/admin/LandingPage.vue')
const biosampleForm = () => import('../components/admin/form/BioSampleForm.vue')
const readForm = () => import('../components/admin/form/ReadForm.vue')
const organismForm = () => import('../components/admin/form/OrganismForm.vue')
const assembliesForm = () => import('../components/admin/form/AssemblyForm.vue')
const annotationForm = () => import('../components/admin/form/AnnotationForm.vue')
const genomeBrowserForm = () => import('../components/admin/form/GenomeBrowserForm.vue')
const excel = () => import('../components/admin/form/ExcelForm.vue')
const treeGenerator = () => import('../views/TreeGeneratorPage.vue')
const nodePage = () => import('../views/NodePage.vue')
const routes = [
  {
    path: "/",
    name: "home",
    component: Home,
  },
  {
    path: "/taxons/:id",
    name: "taxons",
    component: nodePage,
    props:true
  },
  {
    path: "/bioprojects/:id",
    name: "bioprojects",
    component: nodePage,
    props:true
  },
  {
    path: '/tree',
    name: 'tree-of-life',
    redirect: {name: 'tree', params: {taxid: ROOTNODE}}
  },
  {
    path: "/tree/:taxid",
    name: "tree",
    component: treeGenerator,
    props:true
  },
  {
    path: "/admin",
    name: "admin",
    children:[
      {path:'', component:adminHP, name:"admin-hp"},
      {path: "excel-form", component:excel, name:"excel"},
      {path: "organism-form/:taxid?",component:organismForm, name:"organism-form", props:true},
      {path: "assembly-form",component:assembliesForm, name:"assembly-form"},
      {path: "annotation-form/:accession/:name?",component:annotationForm, name:"annotation-form",props:true},
      {path: "genome-browser-form/:accession",component:genomeBrowserForm, name:"genome-browser-form",props:true},
      {path: "biosample-form",component:biosampleForm, name:"biosample-form"},
      {path: "read-form",component:readForm, name:"read-form"}
    ],
    component: admin,
    meta: { requiresAuth: true }
  },
  {
    path: "/organisms/:taxid",
    name: "organism-details",
    props: true,
    component: organism,
  }
]

const router = createRouter({
  history: createWebHistory(BASE_PATH),
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