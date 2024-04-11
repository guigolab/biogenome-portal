import { biosamples, assemblies, experiments, annotations, local_samples } from '../../config.json'
import { useBioSampleStore } from '../stores/biosample-store'
import { useAssemblyStore } from '../stores/assembly-store'
import { useReadStore } from '../stores/read-store'
import { useAnnotationStore } from '../stores/annotation-store'
import { useLocalSampleStore } from '../stores/local-sample-store'

export function useModel(model:string){
    let store;
    let config;

    // Determine the store and configuration based on the pageType
    if (model === 'biosamples') {
        store = useBioSampleStore();
        config = biosamples;
    } else if (model === 'assemblies') {
        store = useAssemblyStore();
        config = assemblies;
    } else if (model === 'experiments') {
        store = useReadStore();
        config = experiments;
    } else if(model === 'annotations'){
        store = useAnnotationStore()
        config = annotations
    } else {
        store = useLocalSampleStore()
        config = local_samples
    }
    const {charts, filters, metadata, columns} = config
    return {store, charts, filters, metadata, columns}
}