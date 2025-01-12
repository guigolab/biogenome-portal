import { useGlobalStore } from '../stores/global-store'

function isAdmin() {
    const { userRole } = useGlobalStore()
    if (userRole !== 'Admin') {
        return { name: 'unauthorized' }
    }
}

async function isAuthenticated() {
    const gStore = useGlobalStore()
    await gStore.checkUserIsLoggedIn()
    if (!gStore.isAuthenticated) return { name: 'login' }
}

export const cmsRoutes = [
    {
        name: 'login',
        path: '/login',
        component: () => import('../pages/Login.vue'),
    },
    {
        name: 'unauthorized',
        path: '/unauthorized',
        component: () => import('../pages/Unauthorized.vue'),
    },
    {
        name: 'dashboard',
        path: '/',
        component: () => import('../layouts/DashBoard.vue'),
        beforeEnter: [isAuthenticated],
        children: [
            {
                path: '',
                redirect: (to:any) => {
                    return { path: '/data/organisms', params: { model: 'organisms' } }
                },
            },
            {
                name: 'items',
                path: '/data/:model',
                props: true,
                component: () => import('../pages/Items.vue')
            },
            {
                name: 'spreadsheet-upload',
                path: 'spreadsheet-upload',
                component: () => import('../pages/SpreadsheetUpload.vue'),
            },
            {
                name: 'goat-upload',
                path: 'goat-upload',
                component: () => import('../pages/GoaTUpload.vue'),
            },
            {
                name: 'create-organism',
                path: 'create-organism',
                component: () => import('../pages/OrganismForm.vue')
            },
            {
                name: 'update-organism',
                path: 'update-organism/:taxid',
                props: true,
                component: () => import('../pages/OrganismForm.vue')
            },
            {
                name: 'create-user',
                path: 'create-user',
                component: () => import('../pages/UserForm.vue')
            },
            {
                name: 'update-user',
                path: 'update-user/:name',
                props: true,
                component: () => import('../pages/UserForm.vue')
            },
            {
                name: 'create-annotation',
                path: 'create-annotation',
                beforeEnter: [isAdmin],
                component: () => import('../pages/AnnotationForm.vue'),
            },
            {
                name: 'update-annotation',
                path: 'update-annotation/:name',
                props: true,
                beforeEnter: [isAdmin],
                component: () => import('../pages/AnnotationForm.vue'),
            },
            {
                name: 'insdc-form',
                path: 'insdc-form',
                beforeEnter: [isAdmin],
                component: () => import('../pages/INSDCForm.vue'),
            },
            {
                name: 'users',
                path: 'users',
                beforeEnter: [isAdmin],
                component: () => import('../pages/Users.vue')
            }
        ]
    }
]
