<template>
    <VaDropdown placement="bottom-start" v-model="show" :closeOnContentClick="false" stickToEdges
        verticalScrollOnOverflow :width="'anchor'" :offset="[0, 20]">
        <template #anchor>
            <div class="custom-input-container">
                <div class="input-wrapper" :class="{ 'has-taxon': taxonomyStore.currentTaxon }">
                    <div class="input-content">
                        <VaIcon name="fa-magnifying-glass" class="search-icon" />
                        <div class="input-field-wrapper">
                            <input v-model="filter"
                                @input="(e: Event) => debouncedUpdateSearch((e.target as HTMLInputElement).value)"
                                :placeholder="t('taxon.searchPlaceholder')" class="custom-input"
                                :class="{ 'has-taxon': taxonomyStore.currentTaxon }" />
                            <VaBadge v-if="taxonomyStore.currentTaxon" overlap color="success" dot>
                                <div class="taxon-chip prominent" :class="{ 'sidebar-open': taxonomyStore.showSidebar }"
                                    title="Data is filtered by this taxon">
                                    <VaIcon name="fa-filter" class="chip-filter-icon" />
                                    <span class="taxon-name">{{ taxonomyStore.currentTaxon.name }}</span>
                                    <VaIcon name="fa-close" size="small" @click.stop="taxonomyStore.resetTaxon"
                                        class="close-icon" />
                                </div>
                            </VaBadge>

                        </div>
                        <VaIcon size="small" name="loop" spin="counter-clockwise" v-if="isLoading" />
                        <VaButton v-if="taxonomyStore.currentTaxon"
                            :icon="taxonomyStore.showSidebar ? 'fa-chevron-left' : 'fa-chevron-right'"
                            @click.stop="taxonomyStore.showSidebar = !taxonomyStore.showSidebar" preset="secondary"
                            color="primary"
                            :title="t(taxonomyStore.showSidebar ? 'taxon.hideDetails' : 'taxon.showDetails')"
                            class="toggle-button" />
                    </div>
                </div>
                <div class="va-text-secondary">{{ t('taxonsearch.description') }}</div>
            </div>
        </template>
        <VaDropdownContent class="search-dropdown">
            <div v-if="isLoading" class="loading-state">
                <VaSpinner size="small" />
                <span>{{ t('taxon.searching') }}</span>
            </div>
            <TaxonSearchResults v-else :results="taxons" :search-term="filter" @select="updateTaxon" />
        </VaDropdownContent>
    </VaDropdown>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { TaxonNode } from '../data/types';
import TaxonService from '../services/TaxonService';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { useI18n } from 'vue-i18n';
import TaxonSearchResults from './TaxonSearchResults.vue';

const { t } = useI18n()
const taxons = ref<TaxonNode[]>([])
const filter = ref()
const isLoading = ref(false)
const show = ref(false)

const taxonomyStore = useTaxonomyStore()
watch(() => filter.value, () => {
    if (!filter.value) show.value = false
})

function debounce(fn: any, delay: number) {
    let timeoutId: any;
    return function (...args: any) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

const debouncedUpdateSearch = debounce(async (filter: string) => {
    if (!filter && filter.length <= 1) return
    isLoading.value = true
    try {
        const { data } = await TaxonService.getTaxons({ filter: filter, })
        taxons.value = [...data.data]
        show.value = true
    } catch (error) {
        console.log(error)
    } finally {
        isLoading.value = false
    }
}, 500);

async function updateTaxon(taxon: TaxonNode) {
    taxonomyStore.currentTaxon = { ...taxon }
    taxonomyStore.showSidebar = true
    filter.value = ''
}
</script>

<style lang="scss" scoped>
.custom-input-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.input-wrapper {
    width: 100%;
    position: relative;
    display: flex;
    align-items: center;
    background-color: var(--va-background-secondary);
    border: 1px solid var(--va-background-border);
    border-radius: 8px;
    transition: all 0.3s ease;
    height: 3.5rem;

    &:hover {
        border-color: var(--va-primary);
    }
}

.input-content {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
}

.input-field-wrapper {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    gap: 0.5rem;
    background: none;
    border: none;
    padding: 0;
}

.search-icon {
    color: var(--va-text-secondary);
    font-size: 1.25rem;
    flex-shrink: 0;
}

.custom-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: none;
    outline: none;
    font-size: 1.1rem;
    color: var(--va-text-primary);
    padding: 0;

    &::placeholder {
        color: var(--va-text-secondary);
    }
}

.toggle-button {
    opacity: 0.8;
    transition: opacity 0.2s ease;
    height: 2.5rem;
    width: 2.5rem;
    flex-shrink: 0;

    &:hover {
        opacity: 1;
    }
}

.taxon-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    color: white;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    height: 2rem;
    flex-shrink: 0;
    max-width: 300px;

    &:hover {
        transform: translateY(-1px);
    }

    .taxon-name {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 1rem;
    }

    .close-icon {
        opacity: 0.7;
        transition: opacity 0.2s ease;
        font-size: 1rem;
        flex-shrink: 0;

        &:hover {
            opacity: 1;
        }
    }
}

.taxon-chip.prominent {
    background: var(--va-primary);
    color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.10);
    font-weight: 600;
    font-size: 1.05rem;
    padding: 0.35rem 1rem 0.35rem 0.75rem;
    position: relative;
    transition: box-shadow 0.2s, background 0.2s;

    .chip-filter-icon {
        margin-right: 0.5rem;
        font-size: 1.1em;
        opacity: 0.85;
    }

    .taxon-name {
        font-weight: 700;
        margin-right: 0.3em;
    }

    .close-icon {
        opacity: 0.8;
        margin-left: 0.5em;

        &:hover {
            opacity: 1;
        }
    }
}

.search-dropdown {
    background-color: transparent;
    padding: 0.5rem;
}

.loading-state {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    color: var(--va-text-secondary);
}

@media (max-width: 768px) {
    .input-content {
        padding: 0.5rem;
        gap: 0.5rem;
    }

    .custom-input {
        font-size: 1rem;
    }

    .taxon-chip {
        max-width: 200px;
        padding: 0.25rem 0.5rem;

        .taxon-name {
            font-size: 0.9rem;
        }
    }

    .toggle-button {
        height: 2rem;
        width: 2rem;
    }
}

:deep(.va-dropdown__content),
:deep(.va-dropdown__popover) {
    z-index: 2100 !important;
}
</style>