<template>
    <VaCard style="width: 100%; max-width: 400px;">
        <VaCardContent>
            <div class="row align-center justify-space-between">
                <div class="flex">
                    <h2 class="va-h6">{{ t('genomeBrowser.assemblies.title') }}</h2>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent>
            <div class="row align-center justify-center">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaInput v-model="searchTerm" :placeholder="t('genomeBrowser.assemblies.placeholder')"
                        @input="handleFilter" :loading="isLoading" class="assembly-search-input">
                        <template #append-inner>
                            <VaIcon name="fa-search" />
                        </template>
                    </VaInput>
                </div>
                <div v-if="displayAnnotations" class="flex lg12 md12 sm12 xs12">
                    <VaCheckbox v-model="onlyAnnotated" @update:model-value="handleToggle"
                        :label="t('genomeBrowser.assemblies.withAnnotations')" />
                </div>
            </div>

            <div class="assembly-infinite-scroll-wrapper">
                <VaInfiniteScroll :disabled="isLoading || allLoaded" :load="fetchMoreAssemblies" :offset="100">
                    <div class="assembly-list">
                        <VaCard v-for="item in assemblies" :key="item.accession"
                            :class="['assembly-list-card', { 'highlighted': isAssemblyInSessions(item.accession) }]"
                            @click="openAssembly(item)">
                            <VaCardContent class="assembly-list-card-content">
                                <div class="assembly-list-main">
                                    <div class="assembly-list-title">{{ item.assembly_name }}</div>
                                    <div class="assembly-list-scientific va-text-secondary" style="font-style: italic;">
                                        {{
                                        item.scientific_name }}</div>
                                </div>
                                <VaPopover message="Chromosomes">
                                    <VaChip class="assembly-list-chip" color="primary">
                                        {{ item.chromosomes?.length ?? '-' }}
                                    </VaChip>
                                </VaPopover>
                            </VaCardContent>
                        </VaCard>
                        <div v-if="isLoading" class="infinite-loading-indicator">
                            <VaInnerLoading :loading="true" />
                        </div>
                    </div>
                </VaInfiniteScroll>
            </div>
            <div class="assembly-total-count">
                {{ t('items.data.results') }}: <b>{{ totalAssemblies }}</b>
            </div>
        </VaCardContent>
    </VaCard>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { Assembly, ChromosomeInterface, Annotation } from '../data/types';
import { useGenomeBrowserStore } from '../stores/genome-browser-store';
import { useStatsStore } from '../stores/stats-store';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const gBStore = useGenomeBrowserStore()
const statsStore = useStatsStore()

const displayAnnotations = computed(() => statsStore.portalStats.filter(({ count }) => count > 0).map(({ key }) => key).includes('annotations'))

const isLoading = ref(false)
const onlyAnnotated = ref(false)
const searchTerm = ref('')
const taxonomyStore = useTaxonomyStore()
const allLoaded = ref(false)

const assemblies = computed(() => gBStore.assemblies)
const selectedAssembly = ref<Assembly>()
const totalAssemblies = computed(() => gBStore.total)

const sessionAccessions = computed(() => gBStore.sessions.map(s => s.assembly?.accession))

function isAssemblyInSessions(accession: string) {
    return sessionAccessions.value.includes(accession)
}

watch(() => taxonomyStore.currentTaxon, async () => {
    gBStore.query.taxon_lineage = taxonomyStore.currentTaxon?.taxid
    gBStore.pagination.limit = 10
    gBStore.pagination.offset = 0
    await fetchAssemblies()
}, { immediate: true })

async function fetchAssemblies(reset = true) {
    isLoading.value = true
    if (reset) {
        gBStore.pagination.offset = 0
    }
    if (onlyAnnotated.value) {
        await gBStore.fetchAssembliesFromAnnotations()
    } else {
        await gBStore.fetchAssemblies()
    }
    allLoaded.value = assemblies.value.length >= gBStore.total
    isLoading.value = false
}

function handleFilter() {
    gBStore.query.filter = searchTerm.value
    fetchAssemblies()
}

function handleToggle() {
    fetchAssemblies()
}

async function fetchMoreAssemblies() {
    if (isLoading.value || allLoaded.value) return
    isLoading.value = true
    gBStore.pagination.offset += gBStore.pagination.limit
    if (onlyAnnotated.value) {
        await gBStore.fetchAssembliesFromAnnotations(true)
    } else {
        await gBStore.fetchAssemblies(true)
    }
    allLoaded.value = assemblies.value.length >= gBStore.total
    isLoading.value = false
}

async function openAssembly(assembly: Assembly) {
    if (isAssemblyInSessions(assembly.accession)) return

    await gBStore.fetchAnnotations(assembly.accession)
    await gBStore.fetchChromosomes(assembly.accession)

    const { chromosomes, annotations } = gBStore
    const session = createGenomeBrowserSession(assembly, chromosomes, annotations)
    gBStore.sessions = [{ assembly, chromosomes, annotations, session }, ...gBStore.sessions]
    //reset form
    gBStore.query.filter = ''
    gBStore.selectedAnnotations = []
    gBStore.selectedChromosomes = []
    selectedAssembly.value = undefined
}

function createGenomeBrowserSession(selectedAssembly: Assembly, selectedChromosomes: ChromosomeInterface[], selectedAnnotations: Annotation[]) {
    const assembly = selectedAssembly
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

<style scoped lang="scss">
.assembly-search-input {
    width: 100%;
    margin-bottom: 1rem;
}

.assembly-total-count {
    font-weight: 500;
    text-align: start;
}

.assembly-infinite-scroll-wrapper {
    width: 100%;
    height: 340px;
    margin-bottom: 0.5rem;
    overflow-y: auto;
}

.assembly-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
}

.assembly-list-card {
    cursor: pointer;
    transition: box-shadow 0.15s, border 0.15s, transform 0.15s;
    margin-bottom: 0.25rem;
    border-radius: 10px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    border: 1.5px solid transparent;

    &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border-color: var(--va-primary-light);
        transform: translateY(-2px) scale(1.01);
    }
}

.assembly-list-card.highlighted {
    border: 2px solid var(--va-primary);
    box-shadow: 0 0 0 2px var(--va-primary-light);
}

.assembly-list-card-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.assembly-list-main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.assembly-list-title {
    font-weight: bold;
    font-size: 1.05rem;
    margin-bottom: 0.15rem;
}

.assembly-list-scientific {
    font-size: 0.97rem;
}

.assembly-list-chip {
    font-size: 0.85rem;
    font-weight: 500;
}

.infinite-loading-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.5rem 0;
}
</style>