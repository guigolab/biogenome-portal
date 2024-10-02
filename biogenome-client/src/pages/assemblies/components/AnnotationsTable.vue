<template>
    <VaDataTable :items="items" :columns="['name', 'gff_gz_location', 'tab_index_location', 'actions']">
        <template #cell(actions)="{ rowData }">
            <va-chip :to="{ name: 'annotation', params: { name: rowData.name } }" size="small">{{ t('buttons.view')
                }}</va-chip>
        </template>
        <template #cell(gff_gz_location)="{ rowData }">
            <VaChip :href="rowData.gff_gz_location" outline size="small">{{ t('buttons.download') }}</VaChip>
        </template>
        <template #cell(tab_index_location)="{ rowData }">
            <VaChip :href="rowData.tab_index_location" outline size="small">{{ t('buttons.download')
                }}</VaChip>
        </template>
    </VaDataTable>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { TrackData } from '../../../data/types';

const { t } = useI18n()
const props = defineProps<{
    items: TrackData[]
}>()



</script>