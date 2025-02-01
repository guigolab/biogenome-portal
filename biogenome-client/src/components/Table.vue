<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <VaDataTable @columnSorted="sortItems" disableClientSideSorting @row:click="handleClick" hoverable clickable
                :loading="itemStore.isTableLoading" :items="items" :columns="columnsToShow">
                <template #cell(image)="{ rowData }">
                    <VaAvatar v-if="rowData.image" size="large">
                        <img :src="rowData.image" />
                    </VaAvatar>
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
    <VaDivider />
    <div class="row justify-center">
        <div class="flex">
            <VaPagination color="textPrimary" v-model="offset" :page-size="limit" :total="itemStore.total" :visible-pages="3" rounded
                buttons-preset="primary" gapped />
        </div>
    </div>
</template>
<script setup lang="ts">
import { useItemStore } from '../stores/items-store'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { routeMap } from '../composable/useRouteMap'
import { DataModels } from '../data/types'

const router = useRouter()
const { t } = useI18n()
const itemStore = useItemStore()

const props = defineProps<{
    model: DataModels
    columns: string[]
}>()


const columnsToShow = computed(() => {
    return props.columns.map((c: string) => { return { key: c, sortable: true, label: mapField(c) } })
})

const items = computed(() => itemStore.items)

const offset = computed({
    get() {
        return itemStore.pagination.offset + 1
    },
    async set(v: number) {
        itemStore.pagination.offset = v - 1
        await itemStore.fetchItems()
    }
})

const limit = computed(() => {
    return itemStore.pagination.limit
})

const mapField = (key: string) => {
    return key.split('.').length ? key.split('.')[key.split('.').length - 1] : key
}

async function sortItems(event: { columnName: string, value: 'asc' | 'desc' | null, column: any },) {
    const { columnName, value } = event
    itemStore.setSearchFormField('sort_column', columnName)
    itemStore.setSearchFormField('sort_order', value)
    await itemStore.fetchItems()
}

const handleClick = async (event: any) => {
    const { item } = event
    const map = routeMap(item)
    //fetch data
    const route = map[props.model]
    itemStore.item = { ...item }
    router.push(route)
}

</script>