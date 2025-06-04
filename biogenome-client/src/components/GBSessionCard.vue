<template>
    <VaCard class="data-card gb-session-card">
        <VaCardContent>
            <div class="row align-center justify-space-between">
                <div class="flex">
                    <h2 class="va-h6">{{ assembly.assembly_name }} <span class="va-text-secondary" style="font-style: italic;">({{ assembly.scientific_name }})</span></h2>
                </div>
                <div class="flex">
                    <VaButton @click="emits('onDelete')" color="danger" preset="primary" icon="fa-close" />
                </div>
            </div>
            <div class="row align-center mt-2 mb-2">
                <div class="flex">
                    <span class="va-text-secondary">{{ t('genomeBrowser.assembly.accession') }} </span>
                    <VaChip flat :to="{ name: 'item', params: { model: 'assemblies', id: assembly.accession } }">{{ assembly.accession }}</VaChip>
                </div>
                <div class="flex">
                    <span class="va-text-secondary">{{ t('genomeBrowser.assembly.sampleAccession') }}</span>
                    <VaChip flat :to="{ name: 'item', params: { model: 'biosamples', id: assembly.sample_accession } }">
                        {{ assembly.sample_accession }}</VaChip>
                </div>
                <div class="flex">
                    <VaButton preset="secondary" @click="showMetadata(assembly)" icon="fa-circle-info">
                        {{ t('genomeBrowser.assembly.metadata') }}
                    </VaButton>
                </div>
                <div v-if="annotations.length > 0" class="flex">
                    <VaDropdown placement="bottom-end">
                        <template #anchor>
                            <VaButton preset="primary" icon="fa-list">
                                {{ t('genomeBrowser.assembly.annotations') }} ({{ annotations.length }})
                            </VaButton>
                        </template>
                        <div class="annotations-dropdown-list">
                            <VaChip v-for="ann in annotations" :key="ann.name" :to="{ name: 'item', params: { model: 'annotations', id: ann.name } }" target="_blank" class="mb-1 mr-1" color="primary" size="small">
                                {{ ann.name }}
                            </VaChip>
                        </div>
                    </VaDropdown>
                </div>
            </div>
        </VaCardContent>
        <VaDivider style="margin: 0;" />
        <VaCardContent>
            <div class="row align-center mb-2">
                <div class="flex">
                    <h3 class="va-h6">{{ t('genomeBrowser.assembly.chromosomes') }}</h3>
                </div>
            </div>
            <Chromosomes :chromosomes="chromosomes" :selected-chromosomes="[]" :accession="assembly.accession" />
        </VaCardContent>
        <VaCardContent>
            <Jbrowse2 :default-session="session" :assembly="assembly" :annotations="annotations"
                :chromosomes="chromosomes" />
        </VaCardContent>
        <VaModal v-model="showModal">
            <MetadataTreeCard v-if="selectedAssembly" :id="selectedAssembly.assembly_name"
                :metadata="Object.entries(selectedAssembly.metadata)" />
        </VaModal>
    </VaCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Chromosomes from '../components/Chromosomes.vue';
import { Annotation, Assembly, ChromosomeInterface } from '../data/types';
import MetadataTreeCard from './MetadataTreeCard.vue';
import { useI18n } from 'vue-i18n';
import { defineAsyncComponent } from 'vue'

const Jbrowse2 = defineAsyncComponent(() =>
    import('../components/Jbrowse2.vue')
)

const { t } = useI18n()

const props = defineProps<{
    assembly: Assembly,
    chromosomes: ChromosomeInterface[],
    annotations: Annotation[],
    session: Record<string, any>,

}>()

const emits = defineEmits(['onDelete'])

const showModal = ref(false)
const selectedAssembly = ref<Assembly>()

function showMetadata(ass: Assembly) {
    selectedAssembly.value = { ...ass }
    showModal.value = true
}

</script>

<style scoped lang="scss">
.data-card.gb-session-card {
    background: var(--va-background-secondary);
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    margin-bottom: 2rem;
    transition: box-shadow 0.2s, border 0.2s;
    &:hover {
        box-shadow: 0 4px 16px rgba(0,0,0,0.10);
        border-color: var(--va-primary-light);
    }
}
.mt-2 {
    margin-top: 1rem;
}
.mb-2 {
    margin-bottom: 1rem;
}
.annotations-dropdown-list {
    min-width: 180px;
    max-width: 320px;
    padding: 0.5rem 0.75rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    background: var(--va-background-element);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
</style>