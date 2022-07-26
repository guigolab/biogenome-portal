import { createWebHistory, createRouter } from 'vue-router';
import Home from '../views/Home.vue';

const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION
const treeOfLife = () => import('../views/TreeOfLife.vue')
const map = () => import('../views/MapPage.vue')
const organism = () => import('../views/Organism.vue')
const admin = () => import('../views/AdminArea.vue')
const adminHP = () => import('../views/admin/LandingPage.vue')
const biosampleForm = () => import('../components/admin/form/BioSampleForm.vue')
const readForm = () => import('../components/admin/form/ReadForm.vue')
const users = () => import('../components/admin/Users.vue')
const organismForm = () => import('../components/admin/form/OrganismForm.vue')
const samples = () => import('../components/admin/LocalSamples.vue')
const assembliesForm = () => import('../components/admin/form/AssemblyForm.vue')
const annotationForm = () => import('../components/admin/form/AnnotationForm.vue')
//form pages/components
const sunburst = () => import('../components/SunBurst.vue')
const excel = () => import('../components/admin/form/ExcelForm.vue')

// const jBrowseComponent = () => import('../views/JBrowse.vue')
// const humanPage = () => import('../views/Human.vue')
// const humanNew = () => import('../views/HumanNew.vue')
// const flyNew = () => import('../views/FlyNew.vue')

// const flyPage = () => import('../views/Fly.vue')
// const expDetails = () => import('../views/ExperimentDetails.vue')
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
      {path: "organism-form/:taxid?",component:organismForm, name:"organism-form", props:true, },
      {path: "assembly-form",component:assembliesForm, name:"assembly-form"},
      {path: "annotation-form",component:annotationForm, name:"annotation-form"},
      {path: "biosample-form",component:biosampleForm, name:"biosample-form"},
      {path: "read-form",component:readForm, name:"read-form"}


      // {path:'/users', component:users, name:"users"}
    ],
    component: admin,
  },
  // {
  //   path: "/excel",
  //   name: "excel",
  //   component: excel
  // },
  // {
  //   path: "/organism-form/:taxid?",
  //   props: true,
  //   name: "organism-form",
  //   component: organismForm
  // },
  // {
  //   path: "/assemblies",
  //   props: true,
  //   name: "assemblies",
  //   component: assembliesForm
  // },
  // {
  //   path: "/organisms",
  //   name: "organisms",
  //   component: Home,
  // },
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
    children: [
      {
        path:'taxid'
      }
    ]
  },
  // {
  //   path: "/human",
  //   name: "human",
  //   component: humanPage,
  // },
  // {
  //   path: "/human-new",
  //   name: "human-new",
  //   component: humanNew,
  // },
  // {
  //   path: "/fly-new",
  //   name: "fly-new",
  //   component: flyNew,
  // },
  // {
  //   path: "/fly",
  //   name: "fly",
  //   component: flyPage,
  // },
  // {
  //   path: "/experiments/:id",
  //   name: "experiments",
  //   component: expDetails,
  //   props:true
  // },
  // {
  //   path: "/jbrowse2",
  //   name: "jbrowse2",
  //   component: jBrowseComponent,
  // },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;