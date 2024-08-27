<template>
    <VaDataTable :items="data" :columns="columns">
        <template v-for="column in columns" :key="column"
            v-slot:[`header(${column})`]="{ key }">
            {{ key.split('.').length ? key.split('.')[key.split('.').length - 1] : key }}
        </template>
        <template #cell(actions)="{ rowData }">
            <va-chip v-if="getRoute(rowData)" :to="getRoute(rowData)" size="small">{{ t('buttons.view') }}</va-chip>
        </template>
    </VaDataTable>
</template>
<script setup lang="ts">
import { models } from '../../../../config.json'
import { useI18n } from 'vue-i18n'
import BioSampleService from '../../../services/clients/BioSampleService'
import { computed } from 'vue';

type DataModel = 'experiments' | 'sub_samples' | 'assemblies';

const { t } = useI18n()

const props = defineProps<{
    model: DataModel,
    accession: string
}>()

const { data } = await BioSampleService.getBioSampleRelatedData(props.accession, props.model)

const columns = computed(() => {
    if (props.model === 'sub_samples') return [...models.biosamples.columns, 'actions']
    return [...models[props.model].columns, 'actions']
})

function getRoute(rowData: Record<string, any>) {
    const routeMap: Record<string, any> = {
        assemblies: { name: 'assembly', params: { accession: rowData.accession } },
        sub_samples: { name: 'biosample', params: { accession: rowData.accession } },
        experiments: { name: 'experiment', params: { accession: rowData.experiment_accession } },
    };

    return routeMap[props.model];
}
</script>