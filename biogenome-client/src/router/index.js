import { createWebHistory, createRouter } from 'vue-router';
import Home from '../views/Home.vue';
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