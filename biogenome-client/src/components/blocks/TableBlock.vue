<template>
    <div class="row">
        <div class="flex lg4 md6 sm12 xs12">
            <SearchInput :value="filter" @onSearchChange="debouncedUpdateSearch" />
        </div>
        <div v-if="columns.length" class="flex">
            <ColumnDropdown />
        </div>
    </div>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <VaDataTable @columnSorted="sortItems" disableClientSideSorting @row:click="handleClick" hoverable clickable
                :loading="itemStore.isTableLoading" :items="items" :columns="columns">
                <template #cell(image)="{ rowData }">
                    <va-avatar v-if="rowData.image" size="large">
                        <img :src="rowData.image" />
                    </va-avatar>
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
        </div>
    </div>
    <div class="row justify-center">
        <div class="flex">
            <VaPagination v-model="offset" :page-size="limit" :total="itemStore.stores[model].total" :visible-pages="3"
                rounded buttons-preset="primary" gapped />
        </div>
    </div>
</template>
<script setup lang="ts">
import { useItemStore } from '../../stores/items-store'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import SearchInput from '../inputs/SearchInput.vue'
import ColumnDropdown from '../dropdowns/ColumnDropdown.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { t } = useI18n()
const itemStore = useItemStore()

const model = computed(() => {
    return itemStore.currentModel
})

const filter = computed(() => itemStore.stores[model.value].searchForm.filter)

const columns = computed(() => {
    const { columnsToShow } = itemStore.stores[model.value]
    return columnsToShow.map((c: string) => { return { key: c, sortable: true, label: mapField(c) } })
})
const items = computed(() => itemStore.stores[model.value].items)

const offset = computed({
    get() {
        return itemStore.stores[model.value].pagination.offset + 1
    },
    async set(v: number) {
        itemStore.stores[model.value].pagination.offset = v - 1
        await itemStore.fetchItems()
    }
})

const limit = computed(() => {
    return itemStore.stores[model.value].pagination.limit
})

const mapField = (key: string) => {
    return key.split('.').length ? key.split('.')[key.split('.').length - 1] : key
}

async function sortItems(event: { columnName: string, value: 'asc' | 'desc' | null, column: any },) {
    const { columnName, value } = event
    itemStore.stores[model.value].searchForm.sort_column = columnName
    itemStore.stores[model.value].searchForm.sort_order = value
    await itemStore.fetchItems()
}

const debouncedUpdateSearch = debounce(async (filter: string) => {
    itemStore.stores[model.value].searchForm.filter = filter;
    itemStore.resetPagination();
    await itemStore.fetchItems();
}, 200);


function debounce(fn: any, delay: number) {
    let timeoutId: any;
    return function (...args: any) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}
const handleClick = (event: any) => {
    const { item } = event
    const routeMap: Record<string, any> = {
        assemblies: { name: 'assembly', params: { accession: item.accession } },
        biosamples: { name: 'biosample', params: { accession: item.accession } },
        experiments: { name: 'experiment', params: { accession: item.experiment_accession } },
        organisms: { name: 'organism', params: { taxid: item.taxid } },
        local_samples: { name: 'local_sample', params: { id: item.local_id } },
        annotations: { name: 'annotation', params: { name: item.name } }
    };
    router.push(routeMap[model.value])
}

</script>