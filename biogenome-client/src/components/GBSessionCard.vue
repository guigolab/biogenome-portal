<template>
    <VaCard>
        <VaCardContent>
            <div class="row align-center justify-space-between">
                <div class="flex">
                    <h2 class="va-h6">{{ assembly.assembly_name }} ({{ assembly.scientific_name
                        }}) </h2>

                </div>
                <div class="flex">
                    <VaButton @click="emits('onDelete')" color="textPrimary" preset="secondary" icon="fa-close" />
                </div>
            </div>
            <div class="row align-center">
                <div style="padding-top: 0;" class="flex">
                    <span class="va-text-secondary">{{ t('genomeBrowser.assembly.accession') }} </span>
                    <span class="va-text-bold">{{ assembly.accession }}</span>
                </div>
                <div style="padding-top: 0;" class="flex">
                    <span class="va-text-secondary">{{ t('genomeBrowser.assembly.sampleAccession') }}</span>
                    <span class="va-text-bold">{{ assembly.sample_accession }}</span>
                </div>
                <div style="padding-top: 0;" class="flex">
                    <VaButton preset="primary" @click="showMetadata(assembly)">{{ t('genomeBrowser.assembly.metadata')
                        }}</VaButton>
                </div>
            </div>
        </VaCardContent>
        <VaDivider style="margin: 0;" />
        <VaCardContent>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <p class="va-text-bold">{{ t('genomeBrowser.assembly.chromosomes') }}</p>
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