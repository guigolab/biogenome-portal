import { createWebHistory, createRouter } from 'vue-router';
import Home from '../views/Home.vue';
import {ROOTNODE,PROJECT_ACCESSION} from '../../config'

const treeOfLife = () => import('../views/TreeOfLife.vue')
const map = () => import('../views/MapPage.vue')
const organism = () => import('../views/Organism.vue')
const admin = () => import('../views/Admin.vue')
const users = () => import('../components/admin/Users.vue')
const organismForm = () => import('../components/admin/form/OrganismForm.vue')
const samples = () => import('../components/admin/LocalSamples.vue')
//form pages/components

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
    path: "/admin",
    name: "admin",
    children:[
      {path:'/local_samples', component:samples, name:"local_samples"},
      // {path:'/users', component:users, name:"users"}
    ],
    component: admin,
  },
  {
    path: "/excel",
    name: "excel",
    component: excel
  },
  {
    path: "/organism-form",
    name: "organism-form",
    component: organismForm
  },
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