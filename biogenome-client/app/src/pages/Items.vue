<template>
    <div class="">
        <div>
            <h1 class="text-2xl font-bold block mb-2">{{ model }}</h1>
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

    <Card>
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
            <Paginator @update:first="handlePagination" v-model:first="offset" :rows="10" :totalRecords="total">
            </Paginator>
        </template>
    </Card>
    <Filters :model="props.model" />
</template>
<script setup lang="ts">
import { useItemStore } from '../stores/items-store'
import { computed, onMounted, ref, watchEffect } from 'vue'
import { DataModels } from '../data/types'
import { DataTableSortEvent } from 'primevue/datatable';
import { useConfig } from '../composable/useConfig';
import TaxonInfoPopover from '../components/TaxonInfoPopover.vue';
import Filters from '../components/Filters.vue';
import { useFilterStore } from '../stores/filter-store';
import { useRoute } from 'vue-router';


const filterStore = useFilterStore()
const itemStore = useItemStore()

const props = defineProps<{
    model: DataModels
}>()

const { columns } = useConfig(props.model)

const selectedColumns = ref(columns.value)

const route = useRoute()

const taxidQuery = computed(() => route.query.taxid)

const searchForm = computed(() => filterStore.getForm(props.model))

watchEffect(async () => await itemStore.fetchItems(props.model))

const items = computed(() => itemStore.stores[props.model].items)

const offset = computed(() => itemStore.stores[props.model].pagination.offset)

async function handlePagination(offset: number) {
    itemStore.stores[props.model].pagination.offset = offset
    await itemStore.fetchItems(props.model)
}

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

</script>