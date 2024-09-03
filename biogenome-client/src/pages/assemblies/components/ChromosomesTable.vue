<template>
    <VaDataTable :items="items" :columns="['accession_version', 'metadata.name', 'metadata.length', 'actions']">
        <template #column(metadata.name)>
            Name
        </template>
        <template #column(metadata.length)>
            Length
        </template>
        <template #cell(metadata.name)="{ rowData }">
            {{ rowData.metadata.name || rowData.metadata.chr_name }}
        </template>
        <template #cell(actions)="{ row, isExpanded }">
            <VaButton :icon="isExpanded ? 'va-arrow-up' : 'va-arrow-down'" preset="secondary" class="w-full"
                @click="row.toggleRowDetails()">{{ t('buttons.view') }}
            </VaButton>
        </template>
        <template #expandableRow="{ rowData }">
            <div class="">
                <MetadataTreeCard
                    :metadata="Object.entries(rowData.metadata).length ? Object.entries(rowData.metadata) : []" />
            </div>
        </template>
    </VaDataTable>
</template>
<script setup lang="ts">
import MetadataTreeCard from '../../../components/ui/MetadataTreeCard.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
    items: Record<string, any>
}>()

</script>