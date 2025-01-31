<template>
    <VaCard>
        <VaCardContent>
            <div class="row align-center justify-space-between">
                <div class="flex">
                    <h2 class="va-h6">{{ t('genomeBrowser.assemblies.title') }}</h2>
                </div>
                <div v-if="taxonomyStore.currentTaxon" class="flex">
                    <TaxonChip />
                </div>
            </div>
        </VaCardContent>
        <VaCardContent>
            <div class="row align-center justify-center">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaSelect :highlightMatchedText="false" @update:model-value="handleSelection" :loading="isLoading"
                        searchable :textBy="(v: Assembly) => `${v.assembly_name} (${v.scientific_name})`"
                        trackBy="accession" @update:search="handleFilter" v-model="selectedAssembly"
                        :searchPlaceholderText="t('genomeBrowser.assemblies.searchPlaceholder')" :placeholder="t('genomeBrowser.assemblies.placeholder')" :noOptionsText="t('genomeBrowser.assemblies.noOptions')"
                        :options="assemblies">
                    </VaSelect>
                </div>
                <div v-if="displayAnnotations" class="flex lg12 md12 sm12 xs12">
                    <VaCheckbox v-model="gBStore.withAnnotations" :label="t('genomeBrowser.assemblies.withAnnotations')"
                        @update:model-value="fetchAssemblies()"></VaCheckbox>
                </div>
                <div v-if="selectedAssembly" class="flex lg12 md12 sm12 xs12">
                    <VaSelect multiple :placeholder="t('genomeBrowser.assemblies.chromosomesPlaceholder')" :options="chromosomes"
                        track-by="accession_version" v-model="gBStore.selectedChromosomes"
                        :text-by="(chr: ChromosomeInterface) => `Chromosome ${chr.metadata.chr_name || chr.metadata.name}`">
                    </VaSelect>
                </div>
                <div v-if="selectedAssembly && annotations.length" class="flex lg12 md12 sm12 xs12">
                    <p style="margin-bottom: 5px;" class="va-text-bold">{{ t('genomeBrowser.assemblies.annotationsPlaceholder') }}</p>
                    <VaOptionList v-model="gBStore.selectedAnnotations" :options="annotations" text-by="name"
                        track-by="name">
                    </VaOptionList>
                </div>
            </div>
        </VaCardContent>
        <VaCardActions v-if="selectedAssembly">
            <VaButton @click="addSession">
                {{t('genomeBrowser.assemblies.createBtn')}}
            </VaButton>
        </VaCardActions>
    </VaCard>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { Assembly, ChromosomeInterface } from '../data/types';
import { useGenomeBrowserStore } from '../stores/genome-browser-store';
import { useStatsStore } from '../stores/stats-store';
import { useI18n } from 'vue-i18n';
import TaxonChip from './TaxonChip.vue';

const { t } = useI18n()
const gBStore = useGenomeBrowserStore()
const statsStore = useStatsStore()

const displayAnnotations = computed(() => statsStore.portalStats.map(({ key }) => key).includes('annotations'))

const isLoading = ref(false)

const taxonomyStore = useTaxonomyStore()
const currentTaxon = computed(() => taxonomyStore.currentTaxon)

const strippedName = computed(() => currentTaxon.value && currentTaxon.value.name.length > 9 ?
    currentTaxon.value.name.slice(0, 9) + '..'
    : currentTaxon.value?.name)

const assemblies = computed(() => gBStore.assemblies)
const selectedAssembly = ref<Assembly>()
const chromosomes = computed(() => gBStore.chromosomes)
const annotations = computed(() => gBStore.annotations)

watch(() => taxonomyStore.currentTaxon, async () => {
    console.log('Taxon watched')
    gBStore.query.taxon_lineage = taxonomyStore.currentTaxon?.taxid
    gBStore.pagination.limit = 10
    gBStore.pagination.offset = 0
    await fetchAssemblies()
}, { immediate: true })


async function fetchAssemblies() {

    if (gBStore.withAnnotations) {
        await gBStore.fetchAssembliesFromAnnotations()
    } else {
        await gBStore.fetchAssemblies()
    }
}

function debounce(fn: any, delay: number) {
    let timeoutId: any;
    return function (...args: any) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

const handleFilter = debounce(async (filter: string) => {
    if (gBStore.query.filter === filter) return
    isLoading.value = true
    gBStore.query.filter = filter
    gBStore.pagination.limit = 10
    gBStore.pagination.offset = 0

    await fetchAssemblies()
    isLoading.value = false
}, 300);

const handleSelection = async (assembly: Assembly) => {
    await gBStore.fetchAnnotations(assembly.accession)
    await gBStore.fetchChromosomes(assembly.accession)
}

const addSession = () => {
    const { selectedAnnotations, selectedChromosomes, chromosomes, annotations } = gBStore
    const assembly = selectedAssembly.value
    const session = createGenomeBrowserSession()
    gBStore.sessions = [{ selectedAnnotations, selectedChromosomes, assembly, chromosomes, annotations, session }, ...gBStore.sessions]
    //reset form
    gBStore.query.filter = ''
    gBStore.selectedAnnotations = []
    gBStore.selectedChromosomes = []
    selectedAssembly.value = undefined
}


function createGenomeBrowserSession() {
    if (!selectedAssembly.value) return
    const { selectedAnnotations, selectedChromosomes } = gBStore
    const assembly = selectedAssembly.value
    const tracks = [
        {
            type: 'ReferenceSequenceTrack',
            configuration: assembly.accession,
            displays: [
                {
                    type: 'LinearReferenceSequenceDisplay',
                    configuration:
                        `${assembly.accession}-LinearReferenceSequenceDisplay`,
                },
            ],
        },
        ...selectedAnnotations.map(ann => {
            return {
                type: 'FeatureTrack',
                configuration: ann.name,
                displays: [
                    {
                        type: 'LinearBasicDisplay',
                        configuration:
                            `${ann.name}-LinearBasicDisplay`,
                    },
                ],
            }
        })]

    const displayedRegions = [
        ...selectedChromosomes.map(chr => ({
            reversed: false,
            refName: chr.metadata.chr_name || chr.metadata.name || chr.accession_version,
            start: 0,
            end: chr.metadata.length,
            assemblyName: assembly.assembly_name
        }))
    ]
    return {
        id: assembly.accession,
        name: assembly.assembly_name,
        view: {
            id: assembly.accession,
            type: "LinearGenomeView",
            minimized: false,
            tracks,
            displayedRegions
        },

    }

}


</script>