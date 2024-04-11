import RouterBypass from '../layouts/RouterBypass.vue'

export const customRoutes = [
    {
        name: 'taxonomy',
        path: '/taxonomy',
        component: () => import('../pages/taxonomy/TaxonomyExplorer.vue'),
        children: [
            { path: 'wiki' },
            { path: 'map' },
            { path: 'assemblies' },
            { path: 'local_samples' }
        ],
        meta: { name: 'taxonomy' }
    },
    {
        path: '/taxons',
        component: RouterBypass,
        children: [
            {
                path: '',
                name: 'taxons',
                component: () => import('../pages/taxons/Taxon.vue'),
            },
            {
                name: 'taxon',
                path: ':taxid',
                component: () => import('../pages/taxons/Taxon.vue'),
                props: true
            }
        ],
        meta: { name: 'taxons' }
    },
    {
        path: '/assemblies',
        component: RouterBypass,
        children: [
            {
                path: '',
                name: 'assemblies',
                component: () => import('../pages/common/CommonItemsPage.vue'),
            },
            {
                path: ':accession',
                name: 'assembly',
                props: true,
                component: () => import('../pages/assemblies/Assembly.vue'),
                meta: {
                    name: 'assemblies',
                },
            },
        ],
        meta: { name: 'assemblies' }
    },
    // {
    //     path: '/annotations',
    //     component: RouterBypass,
    //     children: [
    //         {
    //             path: '',
    //             name: 'annotations',
    //             component: () => import('../pages/genome-annotations/GenomeAnnotations.vue'),
    //         },
    //         {
    //             path: ':name',
    //             name: 'annotation',
    //             props: true,
    //             component: () => import('../pages/genome-annotations/GenomeAnnotation.vue'),
    //         },
    //     ],
    //     meta: { name: 'annotations' }
    // },
    // {
    //     path: '/experiments',
    //     component: RouterBypass,
    //     children: [
    //         {
    //             path: '',
    //             name: 'experiments',
    //             component: () => import('../pages/experiments/Experiments.vue'),
    //         },
    //         {
    //             path: ':accession',
    //             name: 'experiment',
    //             props: true,
    //             component: () => import('../pages/experiments/Experiment.vue'),
    //         },
    //     ],
    //     meta: { name: 'experiments' }
    // },
    // {
    //     path: '/biosamples',
    //     component: RouterBypass,
    //     children: [
    //         {
    //             path: '',
    //             name: 'biosamples',
    //             component: () => import('../pages/biosamples/BioSamples.vue'),
    //         },
    //         {
    //             path: ':accession',
    //             name: 'biosample',
    //             props: true,
    //             component: () => import('../pages/biosamples/BioSample.vue')
    //         },
    //     ],
    //     meta: { name: 'experiments' }
    // },
    // {
    //     path: '/organisms',
    //     component: RouterBypass,
    //     children: [
    //         {
    //             path: '',
    //             name: 'organisms',
    //             component: () => import('../pages/organisms/Organisms.vue'),
    //         },
    //         {
    //             path: ':taxid',
    //             name: 'organism',
    //             props: true,
    //             component: () => import('../pages/organisms/Organism.vue'),
    //         },
    //     ],
    //     meta: { name: 'organisms' }
    // },
    // {
    //     path: '/local_samples',
    //     component: RouterBypass,
    //     children: [
    //         {
    //             path: '',
    //             name: 'local_samples',
    //             component: () => import('../pages/local-samples/LocalSamples.vue'),
    //         },
    //         {
    //             path: ':id',
    //             name: 'local_sample',
    //             props: true,
    //             component: () => import('../pages/local-samples/LocalSample.vue'),
    //         },
    //     ],
    //     meta: { name: 'local_samples' }
    // },
    {
        name: 'status',
        path: '/status',
        component: () => import('../pages/status/Status.vue'),
        meta: { name: 'status' }
    },
    {
        name: '2d-map',
        path: '/2d-map',
        component: () => import('../pages/maps/2DOrganisms.vue'),
        meta: { name: '2d-map' }
    },
    {
        name: '3d-map',
        path: '/3d-map',
        component: () => import('../pages/maps/3DOrganisms.vue'),
        meta: { name: '3d-map' }
    },
    {
        name: 'countries',
        path: 'countries',
        component: () => import('../pages/maps/3DCountries.vue'),
        meta: { name: 'countries' }
    },
    // {
    //     name: '3d-map',
    //     path: '/3d-map',
    //     component: () => import('../layouts/RouterBypass.vue'),
    //     children: [
    //         {
    //             name: 'countries-map',
    //             path: 'countries-map',
    //             component: () => import('../pages/maps/3DCountries.vue'),
    //         },
    //         {
    //             name: 'organisms-map',
    //             path: 'organisms-map',
    //             component: () => import('../pages/maps/3DOrganisms.vue'),
    //         },
    //     ],
    // }
]