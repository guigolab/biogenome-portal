import OrganismsVue from '../pages/cms/organism/Organisms.vue'
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
        component: () => import('../pages/auth/login/Login.vue'),
    },
    {
        name: 'unauthorized',
        path: '/unauthorized',
        component: () => import('../pages/auth/unauthorized/Unauthorized.vue'),
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
