import { useGlobalStore } from '../stores/global-store'

function isAdmin() {
    const { userRole } = useGlobalStore()
    if (userRole !== 'Admin') return { name: 'unauthorized' }
}

async function isAuthenticated() {
    const gStore = useGlobalStore()
    await gStore.checkUserIsLoggedIn()
    if (!gStore.isAuthenticated) return { name: 'login' }
}

export const cmsRoutes = [
    {
        path: '/admin',
        name: 'admin',
        redirect: '/admin/data/organisms',
    },
    {
        name: 'cms-items',
        path: '/admin/data/:model',
        beforeEnter: [isAuthenticated],
        meta: { layout: 'AdminLayout' },
        props: true,
        component: () => import('../pages/cms/Items.vue')
    },
    {
        name: 'spreadsheet-upload',
        path: '/admin/spreadsheet-upload',
        beforeEnter: [isAuthenticated],
        meta: { layout: 'AdminLayout' },
        component: () => import('../pages/cms/SpreadsheetUpload.vue'),
    },
    {
        name: 'goat-upload',
        path: '/admin/goat-upload',
        beforeEnter: [isAuthenticated],
        meta: { layout: 'AdminLayout' },
        component: () => import('../pages/cms/GoaTUpload.vue'),
    },
    {
        name: 'create-organism',
        path: '/admin/create-organism',
        beforeEnter: [isAuthenticated],
        meta: { layout: 'AdminLayout' },
        component: () => import('../pages/cms/OrganismForm.vue')
    },
    {
        name: 'update-organism',
        path: '/admin/update-organism/:taxid',
        beforeEnter: [isAuthenticated],
        meta: { layout: 'AdminLayout' },
        props: true,
        component: () => import('../pages/cms/OrganismForm.vue')
    },
    {
        name: 'create-user',
        path: '/admin/create-user',
        beforeEnter: [isAuthenticated,isAdmin],
        meta: { layout: 'AdminLayout' },
        component: () => import('../pages/cms/UserForm.vue')
    },
    {
        name: 'update-user',
        path: '/admin/update-user/:name',
        beforeEnter: [isAuthenticated,isAdmin],
        meta: { layout: 'AdminLayout' },
        props: true,
        component: () => import('../pages/cms/UserForm.vue')
    },
    {
        name: 'create-annotation',
        path: '/admin/create-annotation',
        meta: { layout: 'AdminLayout' },
        beforeEnter: [isAuthenticated,isAdmin],
        component: () => import('../pages/cms/AnnotationForm.vue'),
    },
    {
        name: 'update-annotation',
        path: '/admin/update-annotation/:name',
        meta: { layout: 'AdminLayout' },
        props: true,
        beforeEnter: [isAuthenticated,isAdmin],
        component: () => import('../pages/cms/AnnotationForm.vue'),
    },
    {
        name: 'insdc-form',
        path: '/admin/insdc-form',
        meta: { layout: 'AdminLayout' },
        beforeEnter: [isAuthenticated,isAdmin],
        component: () => import('../pages/cms/INSDCForm.vue'),
    },
    {
        name: 'users',
        path: '/admin/users',
        beforeEnter: [isAuthenticated,isAdmin],
        meta: { layout: 'AdminLayout' },
        component: () => import('../pages/cms/Users.vue')
    }
]
