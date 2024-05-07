import AnnotationService from "../../services/clients/AnnotationService"
import AssemblyService from "../../services/clients/AssemblyService"
import BioSampleService from "../../services/clients/BioSampleService"
import ExperimentService from "../../services/clients/ExperimentService"
import LocalSampleService from "../../services/clients/LocalSampleService"



export const tabs =
    [
        {
            title: 'uiComponents.wikipedia',
            icon: 'wiki'
        },
        {
            title: 'modelStats.organisms',
            icon: 'fa-paw'
        },
        {
            title: 'menu.organismsMap',
            icon: 'fa-map'
        }
    ]

export const relatedData: Record<string, any>[] = [
    {
        title: 'uiComponents.relatedDataCard.biosamples',
        icon: 'fa-vial',
        key: 'biosamples',
        color: 'success',
        route: 'biosample',
        columns: ['accession', 'organism_part'],
    },
    {
        title: 'uiComponents.relatedDataCard.local_samples',
        icon: 'fa-vial',
        key: 'local_samples',
        color: 'warning',
        route: 'local_sample',
        columns: ['local_id'],
    },
    {
        title: 'uiComponents.relatedDataCard.experiments',
        icon: 'fa-file-lines',
        color: 'secondary',
        key: 'experiments',
        route: 'experiment',
        columns: ['experiment_accession', 'instrument_platform'],
    },
    {
        title: 'uiComponents.relatedDataCard.assemblies',
        icon: 'fa-dna',
        color: 'primary',
        key: 'assemblies',
        route: 'assembly',
        columns: ['accession', 'assembly_name', 'assembly_level'],
    },
    {
        title: 'uiComponents.relatedDataCard.annotations',
        icon: 'fa-bars-progress',
        color: 'info',
        key: 'annotations',
        route: 'annotation',
        columns: ['name', 'assembly_name'],
    },
]


export const relatedDataMapper: Record<string, any> = {
    biosamples: {
        clb: BioSampleService.getBioSamples,
        columns: ['accession', 'scientific_name'],
        filters: []
    },
    assemblies: { clb: AssemblyService.getAssemblies },
    local_samples: { clb: LocalSampleService.getLocalSamples },
    experiments: { clb: ExperimentService.getExperiments },
    annotations: { clb: AnnotationService.getAnnotations }
}