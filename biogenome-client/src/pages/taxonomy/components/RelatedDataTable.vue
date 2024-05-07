<template>
    <va-card>
        <FilterForm :search-form="" :filters="" @on-submit="" @on-reset="" />
        <va-card-content>
            <va-data-table :items="items" :columns="">

            </va-data-table>
            <div class="row justify-center">
                <div class="flex">
                    <va-pagination v-model="offset" :page-size="pagination.limit" :total="total" :visible-pages="3"
                        buttons-preset="secondary" rounded gapped border-color="primary"
                        @update:model-value="handlePagination" />
                </div>
            </div>
        </va-card-content>
    </va-card>

</template>
<script setup lang="ts">
import { watchEffect, ref } from 'vue';
import BioSampleService from '../../../services/clients/BioSampleService'
import AssemblyService from '../../../services/clients/AssemblyService'
import LocalSampleService from '../../../services/clients/LocalSampleService'
import ExperimentService from '../../../services/clients/ExperimentService'
import AnnotationService from '../../../services/clients/AnnotationService'
import FilterForm from '../../../components/ui/FilterForm.vue'
import { AxiosResponse } from 'axios';

const props = defineProps<{
    model: 'biosamples' | 'assemblies' | 'experiments' | 'local_samples' | 'annotations',
    taxid: string
}>()



const callbackMapper = {
    biosamples: BioSampleService.getBioSamples,
    assemblies: AssemblyService.getAssemblies,
    local_samples: LocalSampleService.getLocalSamples,
    experiments: ExperimentService.getExperiments,
    annotations: AnnotationService.getAnnotations
}

const items = ref<Record<string, any>[]>([])
const initPagination = {
    offset: 0,
    limit: 10,
}
const pagination = ref({ ...initPagination })
const offset = ref(1 + pagination.value.offset)
const total = ref(0)

watchEffect(async () => {

})

async function getData(callback: (params: any) => Promise<AxiosResponse<any, any>>, query: Record<string, any>) {
    try {
        const { data } = await callback({ ...query })
        items.value = [...data.data]
        total.value = data.total

    } catch (error) {

    } finally {

    }
}



</script>