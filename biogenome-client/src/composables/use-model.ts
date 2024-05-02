import { useBioSampleStore } from '../stores/biosample-store'
import { useAssemblyStore } from '../stores/assembly-store'
import { useReadStore } from '../stores/read-store'
import { useAnnotationStore } from '../stores/annotation-store'
import { useLocalSampleStore } from '../stores/local-sample-store'

export function useStore(model: string) {
    let store;
    // Determine the store and configuration based on the pageType
    if (model === 'biosamples') {
        store = useBioSampleStore();
    } else if (model === 'assemblies') {
        store = useAssemblyStore();
    } else if (model === 'experiments') {
        store = useReadStore();
    } else if (model === 'annotations') {
        store = useAnnotationStore()
    } else {
        store = useLocalSampleStore()
    }
    return { store }
}