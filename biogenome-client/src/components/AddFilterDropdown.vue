<template>
    <VaDropdown placement="bottom-start" stickToEdges v-model="showAddFilterDropdown" :closeOnContentClick="false">
        <template #anchor>
            <VaButton
                icon="fa-plus"
                preset="primary"
                color="primary"
                class="action-button"
            >
                {{ t('items.filters.addBtn') }}
            </VaButton>
        </template>

        <div class="filter-dropdown-content">
            <div class="add-filter-content">
                <p class="va-text-secondary">
                    {{ t('items.filters.modalDescription') }}
                    <code>parent.child.subchild</code>.
                </p>
                <FieldLookup @field-exists="handleFieldExists" :model="model" />
                <VaSelect 
                    v-model="customFilter.type" 
                    :options="['select', 'input', 'date']"
                    :label="t('items.filters.selectLabel')" 
                    class="filter-type-select" 
                />
                <VaButton 
                    :disabled="!customFilter.key" 
                    @click="addCustomFilter" 
                    block 
                    color="primary"
                    class="action-button"
                >
                    {{ t('items.filters.createBtn') }}
                </VaButton>
            </div>
        </div>
    </VaDropdown>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DataModels, ConfigFilter } from '../data/types'
import FieldLookup from './FieldLookup.vue'
import { useItemStore } from '../stores/items-store'

const { t } = useI18n()
const itemStore = useItemStore()

const props = defineProps<{
    model: DataModels
}>()

const initCustomFilter = {
    key: '',
    type: 'input'
} as ConfigFilter

const showAddFilterDropdown = ref(false)

const customFilter = ref<ConfigFilter>({ ...initCustomFilter })

function handleFieldExists(v: string) {
    customFilter.value.key = v
}

function addCustomFilter() {
    itemStore.addCustomFilter({ ...customFilter.value })
    customFilter.value = { ...initCustomFilter }
    showAddFilterDropdown.value = false
}
</script>

<style lang="scss" scoped>
.action-button {
    font-weight: 500;
    min-width: 100px;
    height: 32px;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem;
    border-radius: 6px;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    &:active {
        box-shadow: 0 0 0 2px var(--va-primary);
    }
}

.filter-dropdown-content {
    padding: 1rem;
    max-width: 300px;
    background: var(--va-background-secondary);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.add-filter-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .va-h3 {
        margin: 0;
    }

    .mb-4 {
        margin-bottom: .5rem;
    }
}

.filter-type-select {
    margin: 0.5rem 0;
}
</style> 