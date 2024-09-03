<template>
    <VaDataTable :items="items" :columns="['run_accession', 'metadata.submitted_bytes', 'actions']">
        <template #column(metadata.submitted_bytes)>
            submitted_bytes
        </template>
        <template #cell(metadata.submitted_bytes)="{ rowData }">
            {{ convertBytesToMBOrGB(rowData.metadata.submitted_bytes) }}
        </template>
        <template #cell(actions)="{ row, isExpanded }">
            <VaButton :icon="isExpanded ? 'va-arrow-up' : 'va-arrow-down'" preset="secondary" class="w-full"
                @click="row.toggleRowDetails()">{{ t('buttons.view') }}
            </VaButton>
        </template>
        <template #expandableRow="{ rowData }">
            <div class="">
                <MetadataTreeCard :metadata="Object.entries(rowData.metadata)" />
            </div>
        </template>
    </VaDataTable>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import MetadataTreeCard from '../../../components/ui/MetadataTreeCard.vue'
import { useToast } from 'vuestic-ui/web-components'

const { t } = useI18n()

const props = defineProps<{
    items: Record<string, any>[]
}>()

function convertBytesToMBOrGB(submittedBytes: string): string {
    const byteStrings: string[] = submittedBytes.split(';');

    let result: string = "";

    byteStrings.forEach(byteString => {
        const bytes: number = parseInt(byteString, 10);
        const mb: number = bytes / (1024 * 1024);
        const gb: number = mb / 1024;

        if (gb >= 1) {
            result += gb.toFixed(2) + ' GB, ';
        } else {
            result += mb.toFixed(2) + ' MB, ';
        }
    });
    result = result.slice(0, -2);

    return result;
}

</script>