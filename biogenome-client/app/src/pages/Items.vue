<template>
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-4 space-y-4 sm:space-y-0">
        <!-- Left Section: Title and Description -->
        <div>
            <h1 class="text-4xl font-bold block mb-2">{{ model }}</h1>
            <p class="text-lg text-gray-500">Additional description or information goes here.</p>
        </div>

        <!-- Right Section: Buttons -->
        <div class="flex space-x-4">
            <TaxonInfoPopover />
            <Button severity="secondary" label="Filters" @click="itemStore.showFilters = !itemStore.showFilters"
                icon="pi pi-filter" aria-label="Filter Data" />
            <Button severity="secondary" @click="itemStore.showTsvModal = !itemStore.showTsvModal" label="Export"
                icon="pi pi-download" />
        </div>
    </div>
    <Panel class="mb-4" v-if="activeFilters.length" header="Active filters">
        <template #icons>
            <Button variant="text" icon="pi pi-times" severity="secondary" label="Clear all" @click="resetFilters" />
        </template>
        <div>
            <Chip @remove="resetFilter(f)" removable v-for="f in activeFilters"
                :label="`${useLabel(f.key)}: ${f.value}`">
            </Chip>
        </div>
    </Panel>
    <Panel header="Data table">
        <template #icons>
            <span class="text-lg text-gray-500">Showing {{ total }} results</span>
        </template>
        <DataTable :loading="itemStore.isTableLoading" removableSort :total-records="total" :rows="limit"
            @sort="sortItems" :value="items">

            <Column v-for="col of selectedColumns" :key="col" sortable :field="col" :header="useLabel(col)">
            </Column>
        </DataTable>
        <template #footer>
            <Paginator @update:first="handlePagination" v-model:first="offset" :rows="10" :totalRecords="total">
            </Paginator>
        </template>
    </Panel>
    <Drawer v-model:visible="itemStore.showFilters" :header="model + ' filters'" position="right">
        <Filters :model="model" />
    </Drawer>
</template>
<script setup lang="ts">
import { useItemStore } from '../stores/items-store'
import { computed, onMounted, ref, watch } from 'vue'
import { ConfigFilter, DataModels } from '../data/types'
import { DataTableSortEvent } from 'primevue/datatable';
import { useConfig } from '../composable/useConfig';
import TaxonInfoPopover from '../components/TaxonInfoPopover.vue';
import Filters from '../components/Filters.vue';
import { useRoute } from 'vue-router';
import { useLabel } from '../composable/useLabel';


const itemStore = useItemStore()

const props = defineProps<{
    model: DataModels
}>()

const { columns } = useConfig(props.model)

const selectedColumns = ref(columns.value)


const route = useRoute()

const taxidQuery = computed(() => route.query.taxid)

const activeFilters = computed(() => {
    return itemStore.stores[props.model]?.filters.filter((f: ConfigFilter) => {
        if (Array.isArray(f.value)) {
            // Exclude arrays that contain only null
            return f.value.some(v => v !== null);
        }
        // Exclude non-array values that are null
        return f.value !== null;
    }) || [];
});
watch(() => props.model, async () => await itemStore.fetchItems(props.model), { immediate: true })

async function handlePagination(offset: number) {
    itemStore.stores[props.model].pagination.offset = offset
    await itemStore.fetchItems(props.model)
}

onMounted(() => itemStore.initStore(props.model))

const hasStore = computed(() => !!itemStore.stores[props.model])

const total = computed(() => hasStore.value ? itemStore.stores[props.model].total : 0)

const limit = computed(() => {
    return hasStore.value ? itemStore.stores[props.model].pagination.limit : 10
})

const items = computed(() => hasStore.value ? itemStore.stores[props.model].items : [])

const offset = computed(() => hasStore.value ? itemStore.stores[props.model].pagination.offset : 0)


async function resetFilter(filter: ConfigFilter) {
    await itemStore.updateFilter(props.model, { ...filter, value: null })
}
async function resetFilters() {
    itemStore.resetFilters(props.model)
    await itemStore.fetchItems(props.model)
}

async function sortItems(event: DataTableSortEvent) {
    const { sortField, sortOrder } = event
    itemStore.stores[props.model].sort.sort_column = sortField
    itemStore.stores[props.model].sort.sort_order = sortOrder === -1 ? 'desc' : 'asc'
    await itemStore.fetchItems(props.model)
}



</script>