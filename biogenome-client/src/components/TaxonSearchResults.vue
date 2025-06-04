<template>
    <div class="search-results">
        <div v-if="results.length" class="results-header">
            <span>{{ t('taxons.resultsFound', { count: results.length }) }}</span>
        </div>
        <div v-if="results.length" class="results-list">
            <div 
                v-for="item in results" 
                :key="item.taxid"
                class="result-item"
                @click="selectItem(item)"
                @mouseenter="hoveredItem = item"
                @mouseleave="hoveredItem = null"
                :class="{ 'is-hovered': hoveredItem?.taxid === item.taxid }"
            >
                <div class="result-main">
                    <span class="result-name">{{ item.name }}</span>
                    <span class="result-rank">{{ item.rank }}</span>
                </div>
                <div v-if="item.leaves" class="result-leaves">
                    {{ item.leaves }} {{ t('taxon.leaves') }}
                </div>
            </div>
        </div>
        <div v-else-if="searchTerm" class="no-results">
            <VaIcon name="fa-circle-info" size="small" />
            <span>{{ t('taxon.noTaxons') }} "{{ searchTerm }}"</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { TaxonNode } from '../data/types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
    results: TaxonNode[];
    searchTerm: string;
}>();

const emit = defineEmits<{
    (e: 'select', item: TaxonNode): void;
}>();

const hoveredItem = ref<TaxonNode | null>(null);

function selectItem(item: TaxonNode) {
    emit('select', item);
}
</script>

<style lang="scss" scoped>
.search-results {
    width: 100%;
    max-height: 400px;
    overflow-y: auto;
    background-color: var(--va-background-secondary);
    border-radius: 8px;
}

.results-header {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    color: var(--va-text-secondary);
    border-bottom: 1px solid var(--va-background-border);
    background-color: var(--va-background-secondary);
    position: sticky;
    top: 0;
    z-index: 1;
}

.results-list {
    padding: 0.5rem 0;
}

.result-item {
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 1px solid var(--va-background-border);

    &:last-child {
        border-bottom: none;
    }

    &:hover, &.is-hovered {
        background-color: var(--va-background-element);
    }

    &:active {
        background-color: var(--va-background-element);
        transform: scale(0.995);
    }
}

.result-main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
}

.result-name {
    font-weight: 500;
    color: var(--va-text-primary);
    font-size: 1rem;
}

.result-rank {
    font-size: 0.75rem;
    color: var(--va-text-secondary);
    background-color: var(--va-background-element);
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    text-transform: capitalize;
}

.result-leaves {
    font-size: 0.875rem;
    color: var(--va-text-secondary);
    margin-left: 0.25rem;
}

.no-results {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    color: var(--va-text-secondary);
    font-size: 0.875rem;
}

@media (max-width: 768px) {
    .result-item {
        padding: 1rem;
    }

    .result-name {
        font-size: 0.95rem;
    }

    .result-rank {
        font-size: 0.7rem;
    }
}
</style> 