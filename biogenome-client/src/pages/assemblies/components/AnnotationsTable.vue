<template>
    <VaDataTable :items="items" :columns="['name', 'gff_gz_location', 'tab_index_location', 'actions']">
        <template #cell(actions)="{ rowData }">
            <va-chip :to="{ name: 'annotation', params: { name: rowData.name } }" size="small">{{ t('buttons.view')
                }}</va-chip>
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
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{
    items: string
}>()



</script>