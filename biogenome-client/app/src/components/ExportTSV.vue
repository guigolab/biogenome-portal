<template>
    <div class="card flex justify-center">
        <Dialog v-model:visible="itemStore.showTsvModal" modal header="Export TSV" :style="{ width: '50vw' }"
            :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
            <div class="flex items-center gap-4 mb-4">
                <MultiSelect :selected-items-label="selectedColumns.length + ' Columns selected'" id="columns-select"
                    :show-toggle-all="false" :max-selected-labels="0" v-model="selectedColumns" :options="columns"
                    class="w-full md:w-80">
                </MultiSelect>
                <Message></Message>
            </div>
            <div class="flex items-center gap-4 mb-8">
                <label for="email" class="font-semibold w-24">Email</label>
                <InputText id="email" class="flex-auto" autocomplete="off" />
            </div>
        </Dialog>
    </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useItemStore } from '../stores/items-store'
import { DataModels } from '../data/types';
import { useConfig } from '../composable/useConfig';

const props = defineProps<{
    model: DataModels
}>()

const itemStore = useItemStore()

const applyFilters = ref(true)

const { columns } = useConfig(props.model)
const selectedColumns = ref(columns.value)


async function downloadData() {
    await itemStore.downloadData(props.model, selectedFields.value, applyFilters.value)
}

</script>