import { useBioSampleStore } from '../stores/biosample-store'
import { useAssemblyStore } from '../stores/assembly-store'
import { useReadStore } from '../stores/read-store'
import { useAnnotationStore } from '../stores/annotation-store'
import { useLocalSampleStore } from '../stores/local-sample-store'
import { useOrganismStore } from '../stores/organism-store'
import { DataModel } from '../data/types'

export function useStore(model: DataModel) {
    let store;
    switch (model) {
        case 'biosamples':
            store = useBioSampleStore();
            break
        case 'experiments':
            store = useReadStore();
            break

        case 'annotations':
            store = useAnnotationStore()
            break
        case 'assemblies':
            store = useAssemblyStore();
            break
        case 'local_samples':
            store = useLocalSampleStore()
            break
        default:
            store = useOrganismStore()
            break
    }
    // Determine the store and configuration based on the pageType
    return { store }
}