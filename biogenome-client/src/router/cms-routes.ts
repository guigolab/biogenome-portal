import { useGlobalStore } from '../stores/global-store'

async function isAuthenticated() {
   const gStore = useGlobalStore()

   // If not authenticated in state, redirect immediately
   if (!gStore.isAuthenticated) {
      return { name: 'login' }
   }

   // Check with server to validate session
   try {
      const isLoggedIn = await gStore.checkUserIsLoggedIn()
      if (!isLoggedIn) {
         return { name: 'login' }
      }
   } catch (error) {
      console.error('Route guard authentication check failed:', error)
      return { name: 'login' }
   }
}

export const cmsRoutes = [
   {
      path: '/admin',
      name: 'admin',
      meta: { layout: 'AdminLayout' },
      beforeEnter: [isAuthenticated],
      component: () => import('../pages/cms/Dashboard.vue'),
   },
   {
      name: 'create-organism',
      path: '/admin/create-organism',
      beforeEnter: [isAuthenticated],
      meta: { layout: 'AdminLayout' },
      component: () => import('../pages/cms/OrganismForm.vue'),
   },
   {
      name: 'update-organism',
      path: '/admin/update-organism/:taxid',
      beforeEnter: [isAuthenticated],
      meta: { layout: 'AdminLayout' },
      props: true,
      component: () => import('../pages/cms/OrganismForm.vue'),
   },
   {
      name: 'publish-biosample',
      path: '/admin/publish-biosample',
      beforeEnter: [isAuthenticated],
      meta: { layout: 'AdminLayout' },
      component: () => import('../pages/cms/ENAUpload.vue'),
   },
]
