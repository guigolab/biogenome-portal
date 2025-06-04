<template>
    <div class="table-wrapper">
        <div class="table-header">
            <div class="results-info">
                <VaChip color="primary" flat class="results-chip">
                    {{ t('items.data.results') }} <span class="va-text-bold ml-2">{{ itemStore.total }}</span>
                </VaChip>
            </div>
            <div class="pagination-wrapper">
                <VaPagination color="primary" v-model="offset" :page-size="limit" :total="itemStore.total"
                    :visible-pages="3" buttons-preset="secondary" gapped class="custom-pagination" />
            </div>
        </div>
        <VaDivider style="margin: 0;" />
        <VaDataTable @columnSorted="sortItems" disableClientSideSorting @row:click="handleClick" hoverable clickable
            :loading="itemStore.isTableLoading" :items="items" :columns="columnsToShow" class="custom-table">
            <template #cell(image)="{ rowData }">
                <VaAvatar v-if="rowData.image" size="large">
                    <img :src="rowData.image" />
                </VaAvatar>
            </template>
            <template #cell(scientific_name)="{ rowData }">
                <span class="scientific-name">{{ rowData.scientific_name }}</span>
            </template>
            <template #cell(gff_gz_location)="{ rowData }">
                <VaChip @click.stop :href="rowData.gff_gz_location" outline size="small">
                    {{ t('buttons.download') }}
                </VaChip>
            </template>
            <template #cell(tab_index_location)="{ rowData }">
                <VaChip @click.stop :href="rowData.tab_index_location" outline size="small">
                    {{ t('buttons.download') }}
                </VaChip>
            </template>
        </VaDataTable>
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
        await itemStore.fetchItems(props.model)
    }
})

const limit = computed(() => {
    return itemStore.pagination.limit
})

const mapField = (key: string) => {
    return key.split('.').length ? key.split('.')[key.split('.').length - 1] : key
}

async function sortItems(event: { columnName: string, value: 'asc' | 'desc' | null, column: any }) {
    const { columnName, value } = event
    itemStore.setSearchFormField('sort_column', value ? columnName : null)
    itemStore.setSearchFormField('sort_order', value)
    await itemStore.fetchItems(props.model)
}

const handleClick = async (event: any) => {
    const { item } = event
    const map = routeMap(item)
    //fetch data
    const route = map[props.model as keyof typeof map]
    itemStore.item = { ...item }
    router.push(route)
}

</script>

<style lang="scss" scoped>
.table-wrapper {
    width: 100%;
}

.custom-table {
    :deep(.va-data-table__table) {
        border-radius: 8px;
        overflow: hidden;
        background: var(--va-background-secondary);
    }

    :deep(.va-data-table__table-header) {
        background: var(--va-background-secondary);
        border-bottom: 1px solid var(--va-background-element);
    }

    :deep(.va-data-table__table-th) {
        padding: 1rem;
        font-weight: 600;
        color: var(--va-text-primary);
        transition: all 0.2s ease;

        &:hover {
            background: var(--va-background-primary);
        }
    }

    :deep(.va-data-table__table-td) {
        padding: 1rem;
        color: var(--va-text-primary);
    }

    :deep(.va-data-table__table-tr) {
        transition: all 0.2s ease;

        &:hover {
            background: var(--va-background-secondary);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
    }
}

.table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0;
    background: var(--va-background-secondary);
}

.results-info {
    display: flex;
    align-items: center;
}

.results-chip {
    height: 32px;
    padding: 0 0.75rem;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .va-text-bold {
        font-size: 1rem;
    }
}

.pagination-wrapper {
    display: flex;
    align-items: center;
}

.custom-pagination {
    padding-right: 0.75rem;

    :deep(.va-pagination__item) {
        height: 32px;
        min-width: 32px;
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: 6px;
        transition: all 0.2s ease;

        &:hover:not(.va-pagination__item--active) {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        &:active:not(.va-pagination__item--active) {
            box-shadow: 0 0 0 2px var(--va-primary);
        }
    }

    :deep(.va-pagination__item--active) {
        font-weight: 600;
    }
}

.ml-2 {
    margin-left: 0.5rem;
}

@media (max-width: 768px) {
    .table-header {
        flex-direction: column;
        gap: 0.75rem;
        align-items: stretch;
    }

    .results-info {
        justify-content: flex-end;
    }

    .pagination-wrapper {
        justify-content: center;
    }
}

.scientific-name {
    font-style: italic;
}
</style>