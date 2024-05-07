<template>
    <VaDataTable :items="items" :columns="columns">
        <template #cell(metadata.submitted_bytes)="{ rowData }">
            {{ convertBytesToMBOrGB(rowData.metadata.submitted_bytes) }}
        </template>
        <template #cell(actions)="{ row, isExpanded }">
            <VaButton :icon="isExpanded ? 'va-arrow-up' : 'va-arrow-down'" preset="secondary" class="w-full"
                @click="row.toggleRowDetails()">
            </VaButton>
        </template>

        <template #expandableRow="{ rowData }">
            <div class="">
                <MetadataTreeCard :metadata="rowData.metadata" />
            </div>
        </template>
    </VaDataTable>
</template>
<script setup lang="ts">
import MetadataTreeCard from './MetadataTreeCard.vue';

const props = defineProps<{
    items: Record<string, any>[],
    columns: string[]
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

    // Remove trailing comma and space
    result = result.slice(0, -2);

    return result;
}

</script>