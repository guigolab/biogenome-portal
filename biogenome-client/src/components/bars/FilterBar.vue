<template>
    <div class="row justify-space-between align-center">
        <div class="flex">
            <div class="row">
                <div class="flex">
                    <SearchInput :value="filter" @onSearchChange="debouncedUpdateSearch" />
                </div>
                <div v-if="hasFilters" class="flex">
                    <VaButton preset="primary" color="secondary" @click="itemStore.showFilters = !itemStore.showFilters"
                        icon="fa-filter">
                        {{ t('buttons.filters') }}</VaButton>
                </div>
                <div v-if="columns.length" class="flex">
                    <FieldMenu :model="model" />
                </div>
            </div>
        </div>
        <div class="flex">
            <div class="row">
                <div class="flex">
                    <ExportMenu />
                </div>
                <div v-if="hasCharts" class="flex">
                    <VaButton color="secondary" class="ml-6"
                        :preset="opt.value === itemStore.view ? undefined : 'primary'" v-for="opt in options"
                        :icon="opt.icon" @click="itemStore.view = opt.value"></VaButton>
                </div>
            </div>
        </div>
    </div>

</template>
<script setup lang="ts">
import { computed, watch } from 'vue'
import { useItemStore } from '../../stores/items-store'
import { useI18n } from 'vue-i18n'
import SearchInput from '../inputs/SearchInput.vue'
import ExportMenu from '../menus/ExportMenu.vue'
import FieldMenu from '../menus/FieldMenu.vue'
import { DataModels } from '../../data/types'
import { useConfig } from '../../composable/useConfig'

const { t } = useI18n()

const props = defineProps<{
    hasCharts: boolean,
    model: DataModels,
}>()

const itemStore = useItemStore()

watch(() => props.hasCharts, () => {
    if (!props.hasCharts) itemStore.view = 'table'
})

const filter = computed(() => itemStore.stores[props.model]?.searchForm?.filter ?? "")

const columns = computed(() => {
    const { columnsToShow = [] } = itemStore.stores[props.model]
    return columnsToShow.map((c: string) => { return { key: c, sortable: true, label: mapField(c) } })
})

const debouncedUpdateSearch = debounce(async (filter: string) => {
    itemStore.setSearchFormField(props.model, 'filter', filter)
    itemStore.resetPagination(props.model);
    await itemStore.fetchItems(props.model);
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
const mapField = (key: string) => {
    return key.split('.').length ? key.split('.')[key.split('.').length - 1] : key
}

const options: { value: 'table' | 'charts', icon: string }[] = [
    { value: "table", icon: "table_rows", },
    { value: "charts", icon: "leaderboard", },
]

const hasFilters = computed(() => {
    const { filters } = useConfig(props.model)
    return filters.value.length > 0
})


</script>