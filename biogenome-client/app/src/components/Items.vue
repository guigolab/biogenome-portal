<template>
    <Card>
        <template #title>
            <div class="">
                <div>
                    <h1 class="text-2xl font-bold block mb-2">Organisms</h1>
                </div>
                <div>
                    <div>
                        <TaxonInfoPopover />
                    </div>
                    <div>
                        <Button @click="filterStore.showFilters = !filterStore.showFilters" icon="pi pi-filter"
                            aria-label="Filter Data" />
                    </div>
                    <div>
                        <SelectButton />
                    </div>
                </div>
            </div>
        </template>
        <template #content>
            <Toolbar>
                <template #start>
                    <Fluid>
                        <div class="grid sm:grid-cols-2 gap-2">
                            <div>
                                <InputText v-tooltip.focus.bottom="'Search by scientific name or by'" id="items-search"
                                    placeholder="Search.." class="w-full md:w-80"></InputText>
                            </div>
                            <div>
                                <MultiSelect :selected-items-label="selectedColumns.length + ' Columns selected'"
                                    id="columns-select" :show-toggle-all="false" :max-selected-labels="0"
                                    v-model="selectedColumns" :options="columns" class="w-full md:w-80">
                                </MultiSelect>
                            </div>
                        </div>
                    </Fluid>
                </template>
                <template #end>
                    <Button @click="itemStore.showTsvModal = !itemStore.showTsvModal" label="Export"
                        icon="pi pi-download" />
                </template>
            </Toolbar>

            <DataTable :loading="itemStore.isTableLoading" removableSort :total-records="total" :rows="limit"
                @sort="sortItems" :value="items">
                <Column v-for="col of selectedColumns" :key="col" sortable :field="col" :header="mapField(col)">
                </Column>
            </DataTable>
            <Paginator v-model:first="offset" :rows="10" :totalRecords="total"></Paginator>
        </template>
    </Card>
    <Filters :model="props.model" />
</template>
<script setup lang="ts">
import { useItemStore } from '../stores/items-store'
import { computed, onMounted, ref } from 'vue'
import { DataModels } from '../data/types'
import { DataTableSortEvent } from 'primevue/datatable';
import { useConfig } from '../composable/useConfig';
import TaxonInfoPopover from './TaxonInfoPopover.vue';
import Filters from './Filters.vue';
import { useFilterStore } from '../stores/filter-store';

const filterStore = useFilterStore()
const itemStore = useItemStore()

const props = { model: 'assemblies' as DataModels }
// const props = defineProps<{
//     model: DataModels
// }>()

const { columns } = useConfig(props.model)
const selectedColumns = ref(columns.value)


const items = computed(() => itemStore.stores[props.model].items)

const offset = computed({
    get() {
        return itemStore.stores[props.model].pagination.offset
    },
    async set(v: number) {
        itemStore.stores[props.model].pagination.offset = v
        await itemStore.fetchItems(props.model)
    }
})

const total = computed(() => itemStore.stores[props.model]?.total)

const limit = computed(() => {
    return itemStore.stores[props.model].pagination.limit
})

const mapField = (key: string) => {
    return key.split('.').length ? key.split('.')[key.split('.').length - 1] : key
}

async function sortItems(event: DataTableSortEvent) {
    const { sortField, sortOrder } = event
    itemStore.stores[props.model].searchForm.sort_column = sortField
    itemStore.stores[props.model].searchForm.sort_order = sortOrder === -1 ? 'desc' : 'asc'
    await itemStore.fetchItems(props.model)
}

if (!itemStore.stores[props.model]) itemStore.initStore(props.model)

onMounted(async () => {
    await itemStore.fetchItems(props.model)
})
// async function sortItems(event: { columnName: string, value: 'asc' | 'desc' | null, column: any },) {
//     const { columnName, value } = event
//     itemStore.stores[props.model].searchForm.sort_column = columnName
//     itemStore.stores[props.model].searchForm.sort_order = value
//     await itemStore.fetchItems(props.model)
// }

// const handleClick = (event: any) => {
//     const { item } = event
//     const rMap = routeMap(item)
//     router.push(rMap[props.model])
// }

</script>