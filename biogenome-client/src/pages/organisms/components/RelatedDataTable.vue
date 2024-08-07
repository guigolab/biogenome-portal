<template>
    <VaDataTable :items="data" :columns="columns">
        <template #cell(actions)="{ rowData }">
            <va-chip v-if="getRoute(rowData)" :to="getRoute(rowData)" size="small">{{ t('buttons.view') }}</va-chip>
        </template>
        <template #cell(gff_gz_location)="{ rowData }">
            <va-chip :href="rowData.gff_gz_location">{{ t('buttons.download') }}</va-chip>
        </template>
        <template #cell(tab_index_location)="{ rowData }">
            <va-chip :href="rowData.tab_index_location" size="small">{{ t('buttons.download') }}</va-chip>
        </template>
    </VaDataTable>
</template>
<script setup lang="ts">
import { models } from '../../../../config.json'
import { useI18n } from 'vue-i18n'
import OrganismService from '../../../services/clients/OrganismService'
import { computed } from 'vue';

type DataModel = keyof typeof models;

const { t } = useI18n()

const props = defineProps<{
    model: DataModel,
    taxid: string
}>()

const { data } = await OrganismService.getOrganismRelatedData(props.taxid, props.model)

const columns = computed(() => {
   return [...models[props.model].columns, 'actions']
})

function getRoute(rowData: Record<string, any>) {
    const routeMap: Record<string, any> = {
        assemblies: { name: 'assembly', params: { accession: rowData.accession } },
        biosamples: { name: 'biosample', params: { accession: rowData.accession } },
        experiments: { name: 'experiment', params: { accession: rowData.experiment_accession } },
        organisms: { name: 'organism', params: { taxid: rowData.taxid } },
        local_samples: { name: 'local_sample', params: { id: rowData.local_id } },
        annotations: { name: 'annotation', params: { name: rowData.name } }
    };

    return routeMap[props.model];
}
</script>