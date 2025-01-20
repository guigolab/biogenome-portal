export const modelRoutes = [
    {
        path: 'assemblies',
        component: () => import('../pages/Data.vue'),
        name: 'assemblies',
        meta: { name: 'assemblies' }
    },
    {
        path: 'assemblies/:accession',
        name: 'assembly',
        props: true,
        component: () => import('../pages/assemblies/Assembly.vue'),
        meta: {
            name: 'assemblies',
        },
    },
    {
        path: 'annotations',
        name: 'annotations',
        component: () => import('../pages/Data.vue'),
        meta: { name: 'annotations' }
    },
    {
        path: 'annotations/:name',
        name: 'annotation',
        props: true,
        component: () => import('../pages/genome-annotations/GenomeAnnotation.vue'),
        meta: { name: 'annotations' }

    },
    {
        path: 'experiments',
        name: 'experiments',
        component: () => import('../pages/Data.vue'),
        meta: { name: 'experiments' }
    },
    {
        path: 'experiments/:accession',
        name: 'experiment',
        props: true,
        component: () => import('../pages/experiments/Experiment.vue'),
        meta: { name: 'experiments' }

    },
    {
        path: 'biosamples',
        name: 'biosamples',
        component: () => import('../pages/Data.vue'),
        meta: { name: 'biosamples' }
    },
    {
        path: 'biosamples/:accession',
        name: 'biosample',
        props: true,
        component: () => import('../pages/biosamples/BioSample.vue'),
        meta: { name: 'biosamples' }

    },
    {
        path: 'status',
        name: 'status',
        component: () => import('../pages/Data.vue'),
        meta: { name: 'status' }
    },
    {
        path: 'organisms',
        component: () => import('../pages/Data.vue'),
        name: 'organisms',
        meta: { name: 'organisms' }
    },
    {
        path: 'organisms/:taxid',
        name: 'organism',
        props: true,
        meta: { name: 'organisms' },
        component: () => import('../pages/organisms/Organism.vue'),
    },
    {
        path: 'local_samples',
        name: 'local_samples',
        component: () => import('../pages/Data.vue'),
        meta: { name: 'local_samples' }
    },
    {
        path: 'local_samples/:id',
        name: 'local_sample',
        props: true,
        component: () => import('../pages/local-samples/LocalSample.vue'),
        meta: { name: 'local_samples' }
    },
]
