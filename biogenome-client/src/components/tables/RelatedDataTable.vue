<template>
    <VaDataTable @row:click="handleClick" clickable hoverable :items="data" :columns="columns">
        <template v-for="column in columns" :key="column" v-slot:[`header(${column})`]="{ key }">
            {{ key.split('.').length ? key.split('.')[key.split('.').length - 1] : key }}
        </template>
        <template #cell(gff_gz_location)="{ rowData }">
            <VaChip @click.stop :href="rowData.gff_gz_location" outline size="small">{{
                t('buttons.download') }}
            </VaChip>
        </template>
        <template #cell(tab_index_location)="{ rowData }">
            <VaChip @click.stop :href="rowData.tab_index_location" outline size="small">{{
                t('buttons.download')
            }}</VaChip>
        </template>
    </VaDataTable>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import OrganismService from '../../services/clients/OrganismService'
import BioSampleService from '../../services/clients/BioSampleService'
import { computed } from 'vue';
import columnsCongif from '../../configs/columns.json'
import { useRouter } from 'vue-router'

const router = useRouter()
const { t } = useI18n()
const cols = columnsCongif as Record<string, string[]>
const props = defineProps<{
    model: string,
    taxid?: string
    accession?: string
}>()

const { data } = props.taxid ?
    await OrganismService.getOrganismRelatedData(props.taxid, props.model)
    : await BioSampleService.getBioSampleRelatedData(props.accession, props.model)

const columns = computed(() => {
    if (props.model in cols) {
        return cols[props.model]
    } else if (props.model === 'sub_samples') {
        return cols.biosamples
    } else {
        return []
    }
})

const handleLinkClick = (event: MouseEvent) => {
    event.stopPropagation(); // Prevent event from bubbling to the row
};

const handleClick = (event: any) => {
    const { item } = event
    const routeMap: Record<string, any> = {
        assemblies: { name: 'assembly', params: { accession: item.accession } },
        biosamples: { name: 'biosample', params: { accession: item.accession } },
        sub_samples: { name: 'biosample', params: { accession: item.accession } },
        experiments: { name: 'experiment', params: { accession: item.experiment_accession } },
        organisms: { name: 'organism', params: { taxid: item.taxid } },
        local_samples: { name: 'local_sample', params: { id: item.local_id } },
        annotations: { name: 'annotation', params: { name: item.name } }
    };
    router.push(routeMap[props.model])
}
</script>