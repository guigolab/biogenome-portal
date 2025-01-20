<template>
    <section>
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <VaDataTable striped @columnSorted="sortItems" disableClientSideSorting @row:click="handleClick"
                    hoverable clickable :loading="itemStore.isTableLoading" :items="items" :columns="columns">
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
        <VaDivider />
        <div class="row justify-center">
            <div class="flex">
                <VaPagination v-model="offset" :page-size="limit" :total="itemStore.stores[model].total"
                    :visible-pages="3" rounded buttons-preset="primary" color="secondary" gapped />
            </div>
        </div>
    </section>
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
}>()


const columns = computed(() => {
    const { columnsToShow } = itemStore.stores[props.model]
    return columnsToShow.map((c: string) => { return { key: c, sortable: true, label: mapField(c) } })
})
const items = computed(() => itemStore.stores[props.model].items)

const offset = computed({
    get() {
        return itemStore.stores[props.model].pagination.offset + 1
    },
    async set(v: number) {
        itemStore.stores[props.model].pagination.offset = v - 1
        await itemStore.fetchItems(props.model)
    }
})

const limit = computed(() => {
    return itemStore.stores[props.model].pagination.limit
})

const mapField = (key: string) => {
    return key.split('.').length ? key.split('.')[key.split('.').length - 1] : key
}

async function sortItems(event: { columnName: string, value: 'asc' | 'desc' | null, column: any },) {
    const { columnName, value } = event
    itemStore.stores[props.model].searchForm.sort_column = columnName
    itemStore.stores[props.model].searchForm.sort_order = value
    await itemStore.fetchItems(props.model)
}

const handleClick = (event: any) => {
    const { item } = event
    const rMap = routeMap(item)
    router.push(rMap[props.model])
}

</script>