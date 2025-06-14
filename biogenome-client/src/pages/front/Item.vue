<template>
    <div class="home">
        <div class="content-section layout fluid va-gutter-5">
            <VaBreadcrumbs color="primary">
                <VaBreadcrumbsItem style="cursor: pointer;" :to="{ name: 'model', params: { model } }"
                    :label="t(`models.${model}`)" />
                <VaBreadcrumbsItem class="va-text-bold" :label="id" />
            </VaBreadcrumbs>
            <div v-if="detailsObject">
                <div class="section-header">
                    <Header :key="id" title-class="va-h1" description-class="va-text-secondary"
                        :title="detailsObject.title" :description="detailsObject.description" />
                </div>
                <div class="row">
                    <div class="flex lg4 md4 sm12 xs12">
                        <div class="row">
                            <div v-if="groupedImages.length" class="flex lg12 md12 sm12 xs12">
                                <VaCard class="image-card">
                                    <VaCarousel lazy height="300px" stateful :items="groupedImages" />
                                </VaCard>
                            </div>
                            <div v-if="detailsObject.insdcStatus" class="flex lg12 md12 sm12 xs12">
                                <SequencingStatusCard :current-status="detailsObject.insdcStatus"
                                    :statuses="filteredInsdcStatus" title="insdc.title">
                                </SequencingStatusCard>
                            </div>
                            <div class="flex lg12 md12 sm12 xs12"
                                v-if="hasGoat && detailsObject.goat && detailsObject.goat.status">
                                <SequencingStatusCard :current-status="detailsObject.goat.status"
                                    :statuses="filteredGoatStatus" :target-list="detailsObject.goat.targetList"
                                    title="goat.title">
                                </SequencingStatusCard>
                            </div>
                            <div class="flex lg12 md12 sm12 xs12" v-if="detailsObject.sub_project">
                                <VaCard class="data-card">
                                    <VaCardContent>
                                        <div class="row align-center">
                                            <div class="flex">
                                                <h3 class="va-h6">Sub Project</h3>
                                            </div>
                                        </div>
                                    </VaCardContent>
                                    <VaCardContent>
                                        <div class="row">
                                            <div class="flex">
                                                <p class="va-text-bold">{{ detailsObject.sub_project }}</p>
                                            </div>
                                        </div>
                                    </VaCardContent>
                                </VaCard>
                            </div>
                            <div class="flex lg12 md12 sm12 xs12" v-if="detailsObject.sequencing_type?.length">
                                <VaCard class="data-card">
                                    <VaCardContent>
                                        <div class="row align-center">
                                            <div class="flex">
                                                <h3 class="va-h6">Sequencing Type</h3>
                                            </div>
                                        </div>
                                    </VaCardContent>
                                    <VaCardContent>
                                        <div class="row">
                                            <div class="flex">
                                                <p class="va-text-bold">{{ detailsObject.sequencing_type.join(', ') }}
                                                </p>
                                            </div>
                                        </div>
                                    </VaCardContent>
                                </VaCard>
                            </div>
                            <div v-if="hasInternalLinks" class="flex lg12 md12 sm12 xs12">
                                <VaCard class="data-card">
                                    <VaCardContent>
                                        <div class="row align-center">
                                            <div class="flex">
                                                <h3 class="va-h6"> {{ t('item.internalLinks') }}</h3>
                                            </div>
                                        </div>
                                    </VaCardContent>
                                    <VaCardActions align="stretch" vertical>
                                        <VaButton preset="primary" icon-right="fa-up-right-from-square"
                                            v-if="detailsObject.downloadLink" :href="detailsObject.downloadLink">
                                            {{ t('buttons.download') }}</VaButton>
                                        <VaButton preset="primary" icon-right="fa-up-right-from-square"
                                            v-if="detailsObject.speciesLink" :to="detailsObject.speciesLink">
                                            {{ item ? item.scientific_name || item.metadata.scientific_name : ""
                                            }}
                                        </VaButton>
                                        <VaButton preset="primary" icon-right="fa-up-right-from-square"
                                            v-if="detailsObject.assemblyLink" :to="detailsObject.assemblyLink">
                                            {{ item ? item.assembly_name || item.metadata.assembly_name : ""
                                            }}
                                        </VaButton>
                                        <VaButton preset="primary" icon-right="fa-up-right-from-square"
                                            v-if="detailsObject.sampleLink" :to="detailsObject.sampleLink">
                                            {{ item ? item.sample_accession || item.metadata.sample_accession ||
                                                item.metadata['sample derived from'] : ""
                                            }}
                                        </VaButton>
                                        <VaButton icon-right="fa-up-right-from-square" preset="primary" block
                                            color="#742061" v-if="detailsObject.jbrowseLink"
                                            @click="createGenomeBrowserSession"> {{ t('item.genomeBrowserLink') }}
                                        </VaButton>
                                    </VaCardActions>
                                </VaCard>
                            </div>
                            <div v-if="hasExternalLinks" class="flex lg12 md12 sm12 xs12">
                                <VaCard class="data-card">
                                    <VaCardContent>
                                        <div class="row align-center">
                                            <div class="flex">
                                                <h3 class="va-h6">{{ t('item.externalLinks') }}</h3>
                                            </div>
                                        </div>
                                    </VaCardContent>
                                    <VaCardActions align="stretch" vertical>
                                        <VaButton icon-right="fa-up-right-from-square" preset="primary"
                                            v-if="detailsObject.ncbiLink" :href="detailsObject.ncbiLink"
                                            target="_blank">
                                            NCBI
                                        </VaButton>
                                        <VaButton icon-right="fa-up-right-from-square" preset="primary"
                                            v-if="detailsObject.enaLink" :href="detailsObject.enaLink" target="_blank">
                                            ENA</VaButton>
                                        <VaButton icon-right="fa-up-right-from-square" color="#9b518a" preset="primary"
                                            v-if="detailsObject.blobtoolkitLink" :href="detailsObject.blobtoolkitLink"
                                            target="_blank">
                                            Blobtoolkit</VaButton>
                                    </VaCardActions>
                                </VaCard>
                            </div>
                            <div v-if="detailsObject.publications?.length" class="flex lg12 md12 sm12 xs12">
                                <VaCard class="data-card">
                                    <VaCardContent>
                                        <div class="row align-center">
                                            <div class="flex">
                                                <h3 class="va-h6">{{ t('item.publications') }}</h3>
                                            </div>
                                        </div>
                                    </VaCardContent>
                                    <VaCardActions align="stretch" vertical>
                                        <VaButton icon-right="fa-up-right-from-square" preset="primary"
                                            :href="getLink(pub)" target="_blank"
                                            v-for="pub in detailsObject.publications" :key="pub.id">
                                            {{ pub.source }}
                                        </VaButton>
                                    </VaCardActions>
                                </VaCard>
                            </div>
                            <div v-if="detailsObject.vernacularNames?.length" class="flex lg12 md12 sm12 xs12">
                                <VaCard class="data-card">
                                    <VaCardContent>
                                        <div class="row align-center">
                                            <div class="flex">
                                                <h3 class="va-h6">{{ t('item.vernacularNames') }}</h3>
                                            </div>
                                        </div>
                                    </VaCardContent>
                                    <VaCardContent v-for="n in detailsObject.vernacularNames" :key="n.value">
                                        <div class="row align-center">
                                            <div class="flex">
                                                <p class="va-text-bold">{{ n.value }}</p>
                                            </div>
                                            <div class="flex">
                                                <p class="va-text-secondary">{{ n.lang }}</p>
                                            </div>
                                            <div class="flex">
                                                <p class="va-text-secondary">{{ n.locality }}</p>
                                            </div>
                                        </div>
                                    </VaCardContent>
                                </VaCard>
                            </div>
                        </div>
                    </div>
                    <div class="flex lg8 md8 sm12 xs12">
                        <div class="row">
                            <div class="flex lg12 md12 sm12 xs12" v-if="detailsObject.chromosomes?.length">
                                <VaCard class="data-card">
                                    <VaCardContent>
                                        <div class="row">
                                            <div class="flex lg12 md12 sm12 xs12">
                                                <h3 class="va-h6">{{ t('item.chromosomes') }}</h3>
                                            </div>
                                        </div>
                                        <Chromosomes :chromosomes="detailsObject.chromosomes" :selected-chromosomes="[]"
                                            :accession="id" />
                                    </VaCardContent>
                                </VaCard>
                            </div>
                            <div v-if="hasRelatedData.length" class="flex lg12 md12 sm12 xs12">
                                <VaCard class="data-card">
                                    <VaCardContent>
                                        <div class="row align-center">
                                            <div class="flex">
                                                <h3 class="va-h6">{{ t('item.data') }}</h3>
                                            </div>
                                        </div>
                                    </VaCardContent>
                                    <VaCardContent>
                                        <VaCollapse :key="k" v-for="[k, v] in hasRelatedData"
                                            :header="t(`models.${k}`) + ` (${Array.isArray(v) ? v.length : null})`">
                                            <template #content>
                                                <VaCard outlined square>
                                                    <VaCardContent>
                                                        <VaDataTable
                                                            @row:click="(event) => handleClick(event, (k as DataModels | 'reads'))"
                                                            hoverable :items="(Array.isArray(v) ? v : [])"
                                                            :columns="getColumns(k as DataModels | 'reads')">
                                                            <template #cell(metadata.submitted_bytes)="{ rowData }">
                                                                {{
                                                                    convertBytesToMBOrGB(rowData.metadata.submitted_bytes)
                                                                }}
                                                            </template> <template #cell(actions)="{ row, isExpanded }">
                                                                <VaButton
                                                                    :icon="isExpanded ? 'va-arrow-up' : 'va-arrow-down'"
                                                                    preset="secondary" class="w-full"
                                                                    @click="row.toggleRowDetails()">{{ t('item.details')
                                                                    }}
                                                                </VaButton>
                                                            </template>
                                                            <template #expandableRow="{ rowData }">
                                                                <div class="row">
                                                                    <div class="flex lg12 md12 sm12 xs12">
                                                                        <VaCard>
                                                                            <VaCardContent>
                                                                                <MetadataTreeCard
                                                                                    :id="rowData.run_accession"
                                                                                    :metadata="Object.entries(rowData.metadata)" />
                                                                            </VaCardContent>
                                                                        </VaCard>
                                                                    </div>
                                                                </div>
                                                            </template>
                                                        </VaDataTable>
                                                    </VaCardContent>
                                                </VaCard>
                                            </template>
                                        </VaCollapse>
                                    </VaCardContent>
                                </VaCard>
                            </div>
                            <div v-if="detailsObject.coordinates?.length" class="flex lg12 md12 sm12 xs12">
                                <VaCard class="data-card">
                                    <VaCardContent>
                                        <div class="row align-center">
                                            <div class="flex">
                                                <h3 class="va-h6">{{ t('item.coordinates') }}</h3>
                                            </div>
                                        </div>
                                    </VaCardContent>
                                    <LeafletMap :key="id" v-if="detailsObject.coordinates?.length"
                                        :selected-countries="[]" :map-type="'points'" :countries="[]"
                                        :locations="detailsObject.coordinates" />
                                </VaCard>
                            </div>

                            <div class="flex lg12 md12 sm12 xs12"
                                v-if="detailsObject.metadata && Object.keys(detailsObject.metadata).length">
                                <VaCard class="data-card">
                                    <VaCardContent>
                                        <MetadataTreeCard :id="id" :metadata="Object.entries(detailsObject.metadata)" />
                                    </VaCardContent>
                                </VaCard>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { Annotation, AppConfig, Assembly, DataModels, ItemDetails, ChromosomeInterface } from '../../data/types';
import { useItemStore } from '../../stores/items-store';
import Header from '../../components/Header.vue';
import MetadataTreeCard from '../../components/MetadataTreeCard.vue';
import Chromosomes from '../../components/Chromosomes.vue';
import LeafletMap from '../../components/LeafletMap.vue';
import { useGenomeBrowserStore } from '../../stores/genome-browser-store';
import { useRouter } from 'vue-router';
import SequencingStatusCard from '../../components/SequencingStatusCard.vue';
import { useI18n } from 'vue-i18n';
import { VaCard } from 'vuestic-ui/web-components';
import { getLink, getColumns, getIdKey, convertBytesToMBOrGB, goatSteps, insdcSteps, extendedModels } from '../../composable/itemConfigs';

const { t } = useI18n()
const gBStore = useGenomeBrowserStore()
const itemStore = useItemStore()
const settings = inject('appConfig') as AppConfig
const hasGoat = settings.general.goat
const router = useRouter()
const props = defineProps<{
    id: string,
    model: DataModels
}>()


const detailsObject = ref<ItemDetails>()
const item = computed(() => itemStore.item)
const filteredInsdcStatus = insdcSteps.filter(step => step.value !== 'No Entry')
const filteredGoatStatus = goatSteps.filter(step => step.value !== 'No Entry')

const groupedImages = computed(() => detailsObject.value?.avatar ? [detailsObject.value.avatar, ...detailsObject.value.images ?? []] : [...detailsObject.value?.images ?? []])

const hasRelatedData = computed(() => {
    return detailsObject.value ?
        Object.entries(detailsObject.value)
            .filter(([k, v]) => extendedModels.includes(k) && v && Array.isArray(v) && v.length > 0)
        : []
})

watch(() => props.id, async () => {
    if (!itemStore.itemId || itemStore.itemId !== props.id) {
        itemStore.item = await itemStore.fetchItem(props.model, props.id);
        itemStore.itemId = props.id
    }
    await getRelatedData(props.model, props.id)
}, { immediate: true })


const hasExternalLinks = computed(() => detailsObject.value && (detailsObject.value.ncbiLink || detailsObject.value.enaLink || detailsObject.value.blobtoolkitLink))
const hasInternalLinks = computed(() => detailsObject.value && (detailsObject.value.speciesLink || detailsObject.value.sampleLink || detailsObject.value.downloadLink || detailsObject.value.jbrowseLink))


const handleClick = async (event: any, key: DataModels | 'reads') => {
    const { item } = event
    if (key !== 'reads') {
        const idKey = getIdKey(key)
        router.push({ name: 'item', params: { model: key, id: item[idKey] } })
    }
}

async function createGenomeBrowserSession() {

    if (!item.value) return

    const accession = item.value.accession || item.value.assembly_accession
    //fetch chromosomes and related annotations
    await gBStore.fetchAnnotations(accession)
    await gBStore.fetchChromosomes(accession)
    // Set assembly
    if (props.model === 'annotations') {
        await gBStore.fetchAssembly(accession)
        gBStore.selectedAnnotations = [{ ...item.value } as Annotation]
    } else if (props.model === 'assemblies') {
        gBStore.assembly = { ...item.value } as Assembly
    }

    //create session
    const { chromosomes, annotations, assembly } = gBStore
    if (!assembly) return
    const session = mapSession(assembly, annotations, chromosomes)
    gBStore.sessions = [{ assembly, chromosomes, annotations, session }]
    //reset form
    gBStore.assembly = null
    gBStore.chromosomes = []
    gBStore.annotations = []
    router.push({ name: 'jbrowse' })

}

async function getRelatedData(model: DataModels, id: string) {

    let relatedData
    const { item } = itemStore
    if (!item) return

    if (model === 'assemblies') {
        relatedData = await itemStore.fetchAssemblyData(id)
        detailsObject.value = {
            ...{
                title: item.assembly_name,
                description: `Accession: ${id}`,
                ncbiLink: `https://www.ncbi.nlm.nih.gov/assembly/${id}`,
                enaLink: `https://www.ebi.ac.uk/ena/browser/view/${id}`,
                jbrowseLink: relatedData?.chromosomes?.length > 0,
                speciesLink: { name: 'item', params: { model: 'organisms', id: item.taxid } },
                sampleLink: { name: 'item', params: { model: 'biosamples', id: item.sample_accession } },
                blobtoolkitLink: item.blobtoolkit_id ? `https://blobtoolkit.genomehubs.org/view/${id}#Filters` : undefined,
                metadata: item.metadata
            },
            ...relatedData ?? {}
        }
    }
    else if (model === 'experiments') {
        relatedData = await itemStore.fetchExperimentData(id)
        detailsObject.value = {
            ...{
                title: item.experiment_accession,
                description: item.metadata.experiment_title,
                ncbiLink: `https://www.ncbi.nlm.nih.gov/sra/${id}`,
                enaLink: `https://www.ebi.ac.uk/ena/browser/view/${id}`,
                speciesLink: { name: 'item', params: { model: 'organisms', id: item.taxid } },
                sampleLink: { name: 'item', params: { model: 'biosamples', id: item.sample_accession || item.metadata.sample_accession } },
                metadata: item.metadata
            },
            ...relatedData ?? {}
        }

    } else if (model === 'biosamples') {
        relatedData = await itemStore.fetchBioSampleData(id)
        detailsObject.value = {
            ...{
                title: item.accession,
                description: item.metadata.tissue,
                ncbiLink: `https://www.ncbi.nlm.nih.gov/biosample/${id}`,
                enaLink: `https://www.ebi.ac.uk/ena/browser/view/${id}`,
                speciesLink: { name: 'item', params: { model: 'organisms', id: item.taxid } },
                sampleLink: item.metadata['sample derived from'] ? { name: 'item', params: { model: 'biosamples', id: item.metadata['sample derived from'] } } : undefined,
                metadata: item.metadata
            },
            ...relatedData ?? {}
        }
    } else if (model === 'local_samples') {
        relatedData = await itemStore.fetchLocalSampleData(id)
        detailsObject.value = {
            ...{
                title: item.local_id,
                description: item.metadata.tissue || '',
                speciesLink: { name: 'item', params: { model: 'organisms', id: item.taxid } },
                metadata: item.metadata
            },
            ...relatedData ?? {}
        }
    } else if (model === 'organisms') {
        relatedData = await itemStore.fetchOrganismData(id)
        detailsObject.value = {
            ...{
                title: item.scientific_name,
                description: item.insdc_common_name ?? `Taxid: ${item.taxid}`,
                ncbiLink: `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${item.taxid}`,
                enaLink: `https://www.ebi.ac.uk/ena/browser/view/${id}`,
                metadata: item.metadata ?? {},
                sequencing_type: item.sequencing_type,
                sub_project: item.sub_project,
                images: item.image_urls,
                avatar: item.image,
                insdcStatus: item.insdc_status,
                goat: {
                    targetList: item.target_list_status,
                    status: item.goat_status,
                },
                publications: item.publications,
                vernacularNames: item.common_names

            },
            ...relatedData ?? {}
        }
        //handle annotation
    } else {
        detailsObject.value = {
            ...{
                title: item.name,
                description: "",
                jbrowseLink: true,
                assemblyLink: { name: 'item', params: { model: 'assemblies', id: item.assembly_accession } },
                speciesLink: { name: 'item', params: { model: 'organisms', id: item.taxid } },
                metadata: item.metadata,
                downloadLink: item.gff_gz_location
            },
            ...relatedData ?? {}
        }
    }

}

function mapSession(assembly: Assembly, selectedAnnotations: Annotation[], selectedChromosomes: ChromosomeInterface[]) {

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
<style lang="scss" scoped>
.data-card {
    background: var(--va-background-secondary);
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-header {
    margin-bottom: 2rem;
    margin-top: 2rem;
}

.image-card {
    background: var(--va-background-secondary);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
</style>