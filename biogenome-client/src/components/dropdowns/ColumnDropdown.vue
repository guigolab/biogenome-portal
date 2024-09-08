<template>
    <VaButtonDropdown left-icon preset="primary" stickToEdges :closeOnContentClick="false" icon="hide_source"
        :label="t('buttons.fields')">
        <div class="w-200">
            <div v-for="(field, index) in columnsToShow" :key="index">
                <VaSwitch class="mt-2" v-model="field.show" :label="getFieldLabel(field.value)" size="small"
                    @change="toggleColumn(field.value, field.show)" />
            </div>
        </div>
    </VaButtonDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useItemStore } from '../../stores/items-store'
import columnsConfig from '../../../configs/columns.json'
// Props

// Internationalization
const { t } = useI18n()

// Store for managing columns
const itemStore = useItemStore()

const model = computed(() => itemStore.currentModel as keyof typeof columnsConfig)

const columns = computed(() => {
    return columnsConfig[model.value]
})
// Computed property for columns to show
const showedColumns = computed(() => {
    return itemStore.stores[model.value].columnsToShow
})
// Computed property for generating the columns to display in the dropdown with their "show" state
const columnsToShow = computed(() => {
    return columns.value.map((column: string) => ({
        value: column,
        show: showedColumns.value.includes(column),
    }))
})
// Get the human-readable label for a column
function getFieldLabel(value: string) {
    const parts = value.split('.')
    return parts.length > 1 ? parts[parts.length - 1] : value
}
// Function to update the shown columns when a toggle is switched
function toggleColumn(column: string, show: boolean) {
    const updatedColumns = show
        ? [...showedColumns.value, column] // Add column
        : showedColumns.value.filter((c: string) => c !== column) // Remove column

    // Update the store and emit the change
    itemStore.stores[model.value].columnsToShow = [...updatedColumns]
}
</script>