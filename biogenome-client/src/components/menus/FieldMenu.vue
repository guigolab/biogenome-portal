<template>
    <VaMenu :close-on-content-click="false">
        <template #anchor>
            <VaButton preset="primary" color="secondary" icon="more_horiz">{{ t('buttons.fields') }}</VaButton>
        </template>
        <VaMenuItem v-for="field in columnsToShow" :key="field.value"
            @selected="field.show = !field.show; toggleColumn(field.value)" :icon="getIcon(field.show)">
            {{ getFieldLabel(field.value) }}
        </VaMenuItem>
    </VaMenu>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useItemStore } from '../../stores/items-store'
import { useConfig } from '../../composable/useConfig';
import { DataModels } from '../../data/types';

const { t } = useI18n()

const props = defineProps<{
    model: DataModels
}>()
// Store for managing columns
const itemStore = useItemStore()

const columnsToShow = ref<{ value: string, show: boolean }[]>([])

// Computed property for columns to show
const showedColumns = computed(() => {
    return itemStore.stores[props.model].columnsToShow
})

watch(() => props.model, () => {
    mapCols(props.model as DataModels)
})

function mapCols(model: DataModels) {
    const { columns } = useConfig(model)
    columnsToShow.value = [...columns.value.map((column: string) => ({
        value: column,
        show: showedColumns.value.includes(column),
    }))]
}

onMounted(() => mapCols(props.model as DataModels))

// Get the human-readable label for a column
function getFieldLabel(value: string) {
    const parts = value.split('.')
    return parts.length > 1 ? parts[parts.length - 1] : value
}

function getIcon(show: boolean) {
    return show ? 'check' : undefined
}
// Function to update the shown columns when a toggle is switched
function toggleColumn(column: string) {
    let columnsToShow = itemStore.stores[props.model].columnsToShow
    const col = columnsToShow.find((c: string) => c === column)
    if (!col) columnsToShow.unshift(column)
    else columnsToShow = columnsToShow.filter((c: string) => c !== column)
    // Update the store and emit the change
    itemStore.stores[props.model].columnsToShow = [...columnsToShow]
}
</script>