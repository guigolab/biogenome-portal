<template>
    <DetailsSkeleton v-if="isLoading" />
    <div v-else-if="errorMessage">
        <VaAlert color="danger" class="mb-6">
            {{ errorMessage }}
        </VaAlert>
    </div>
    <div v-else>
        <h1 class="va-h1">
            {{ props.id }}
        </h1>
        <!-- <p>{{ text }}</p> -->
        <Tabs :tabs="dynamicTabs"></Tabs>
        <VaDivider style="margin-top: 0;" />
        <div style="height: 500px;" class="flex lg12 md12 sm12 xs12">
            <VaSkeleton v-if="isLoading">
            </VaSkeleton>
            <template v-else>
                <component :key="id" :is="currentView.component" :props="currentView.componentProps" />
            </template>
        </div>
    </div>

</template>

<script setup lang="ts">
import Jbrowse2 from '../../components/genome-browser/Jbrowse2.vue'
import { Assembly, TrackData, SampleLocations } from '../../data/types'
// import Ideogram from '../../components/ui/Ideogram.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import { computed, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import Publications from './components/Publications.vue'
import VernacularNames from './components/VernacularNames.vue'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import Images from './components/Images.vue'
import { models } from '../../../config.json'
import RelatedDataTable from './components/RelatedDataTable.vue'
import { tabs } from "./tabs"
import { AxiosError } from 'axios'
import { useRouter } from 'vue-router'
import OrganismService from '../../services/clients/OrganismService'
import BioSampleService from '../../services/clients/BioSampleService'
import GeoLocationService from '../../services/clients/GeoLocationService'
import ExperimentService from '../../services/clients/ExperimentService'
import AssemblyService from '../../services/clients/AssemblyService'
import LocalSampleService from '../../services/clients/LocalSampleService'
import DetailsSkeleton from './components/DetailsSkeleton.vue'
import AnnotationService from '../../services/clients/AnnotationService'

const router = useRouter()

const modelName = computed(() => {
    return router.currentRoute.value.meta.name
})

const { t } = useI18n()
const tab = ref('')

const currentItem = ref<Record<string, any>>()

const props = defineProps<{
    id: string
}>()

const errorMessage = ref('')
const isLoading = ref(false)
const initItemDetailsObject = {
    assemblies: [] as Assembly[],
    images: [] as string[],
    map: [] as SampleLocations[],
    local_samples: [] as Record<string, any>[],
    reads: [] as Record<string, any>[],
    biosamples: [] as Record<string, any>[],
    sub_samples: [] as Record<string, any>[],
    experiments: [] as Record<string, any>[],
    annotations: [] as Record<string, any>[],
    names: [] as Record<string, any>[],
    publications: [] as Record<string, any>[],
    metadata: []
}
const itemDetails = ref({ ...initItemDetailsObject })

const dynamicTabs = computed(() => {
    return tabs.filter(t => Object.entries(itemDetails.value).find(([k, v]) => t.name === k && v))
})

const currentTable = computed(() => {
    switch (tab.value) {
        case 'assemblies':
        case 'experiments':
        case 'local_samples':
        case 'annotations':
        case 'biosamples':
            return { items: itemDetails.value[tab.value], columns: models[tab.value].columns }
        case 'sub_samples':
            return { items: itemDetails.value.sub_samples, columns: models.biosamples.columns }
        case 'reads':
            return { items: itemDetails.value.sub_samples, columns: ['run_accession', 'metadata.submitted_bytes', 'actions'] }
        default:
            return { items: [], columns: [] }
    }
})

const currentView = computed(() => {
    switch (tab.value) {
        case 'metadata':
            return { component: MetadataTreeCard, componentProps: { metadata: itemDetails.value.metadata } }
        case 'publications':
            return { component: Publications, componentProps: { publications: itemDetails.value.publications as Record<string, any>[] } }
        case 'names':
            return { component: VernacularNames, componentProps: { commonNames: itemDetails.value.names as Record<string, any> } };
        case 'map':
            return { component: LeafletMap, componentProps: { coordinates: itemDetails.value.map as SampleLocations[] } };
        case 'images':
            return { component: Images, componentProps: { images: itemDetails.value.images as string[] } };
        case 'jbrowse':
            return { component: Jbrowse2, componentProps: { assembly: currentItem.value as Assembly, annotations: itemDetails.value.annotations as TrackData[] } }; // Pass required props for Jbrowse2 component
        case 'assemblies':
        case 'experiments':
        case 'biosamples':
        case 'annotations':
        case 'local_samples':
        case 'sub_samples':
        case 'reads':
            const { items, columns } = currentTable.value
            return { component: RelatedDataTable, componentProps: { items, columns } };
        // Add cases for other tabs
        default:
            return {};
    }
})

watchEffect(async () => {
    await getData(props.id)
})

function reset() {
    currentItem.value = undefined
    itemDetails.value = { ...initItemDetailsObject }
    errorMessage.value = ''
}

async function getData(id: string) {
    reset()
    try {
        isLoading.value = true
        switch (modelName.value) {
            case 'organisms':
                await getOrganism(id)
                break
            case 'biosamples':
                await getBioSample(id)
                break
            case 'local_samples':
                await getLocalSample(id)
                break
            case 'assemblies':
                await getAssembly(id)
                break
            case 'experiments':
                await getExperiment(id)
                break
            case 'annotations':
                await getAnnotation(id)
                break
        }
    } catch (error) {
        const axiosError = error as AxiosError
        if (axiosError.code === "404") {
            errorMessage.value = `${id} not found`
        } else {
            errorMessage.value = axiosError.cause as string
        }
    } finally {
        isLoading.value = false
    }
}

async function getOrganism(taxid: string) {
    const { data } = await OrganismService.getOrganism(taxid)
    currentItem.value = { ...data }

    if (data.publications) itemDetails.value.publications = [...data.publications]

    if (data.image_urls) itemDetails.value.images = [...data.image_urls]

    if (data.common_names) itemDetails.value.names = [...data.common_names]

    const organismRelatedData = ['biosamples', 'assemblies', 'local_samples', 'experiments', 'annotations']
    organismRelatedData.forEach(async (d) => {
        itemDetails.value[d as 'assemblies' | 'biosamples' | 'local_samples' | 'experiments' | 'annotations'] = [...await getRelatedData(taxid, d)]
    })
    await getOrganismCoordinates(taxid)
}

async function getOrganismCoordinates(taxid: string) {
    const { data } = await GeoLocationService.getLocationsByOrganims(taxid)
    itemDetails.value.map = [...data]
}

async function getBioSampleCoordinates(id: string) {
    const { data } = await GeoLocationService.getLocationsByBioSample(id)
    itemDetails.value.map = [...data]
}

async function getLocalSampleCoordinates(id: string) {
    const { data } = await GeoLocationService.getLocationsByLocalSample(id)
    itemDetails.value.map = [...data]
}

async function getBioSample(accession: string) {
    const { data } = await BioSampleService.getBioSample(accession)
    currentItem.value = { ...data }
    const biosampleRelatedData = ['sub_samples', 'assemblies', 'experiments']
    biosampleRelatedData.forEach(async (d) => {
        itemDetails.value[d as 'assemblies' | 'sub_samples' | 'experiments'] = [...await getRelatedData(accession, d)]
    })
    await getBioSampleCoordinates(accession)
}

async function getAssembly(accession: string) {
    const { data } = await AssemblyService.getAssembly(accession)
    currentItem.value = { ...data }
    if (currentItem.value && currentItem.value.chromosomes && currentItem.value.chromosomes.length) {
        const { data } = await AssemblyService.getRelatedAnnotations(accession)
        itemDetails.value.annotations = [...data]
    }
}

async function getReads(accession: string) {
    const { data } = await ExperimentService.getReadsByExperiment(accession)
    itemDetails.value.reads = [...data]

}
async function getExperiment(accession: string) {
    const { data } = await ExperimentService.getExperiment(accession)
    currentItem.value = { ...data }
    await getReads(accession)
}

async function getAnnotation(name: string) {
    const { data } = await AnnotationService.getAnnotation(name)
    currentItem.value = { ...data }
    await getRelatedAssembly(data.assembly_accession)
}

async function getLocalSample(id: string) {
    const { data } = await LocalSampleService.getLocalSample(id)
    currentItem.value = { ...data }
    await getLocalSampleCoordinates(id)
}

async function getRelatedData(accession: string, model: string) {
    const { data } = await OrganismService.getOrganismRelatedData(accession, model)
    return data
}

async function getRelatedAssembly(accession: string) {
    const { data } = await AssemblyService.getAssembly(accession)
    itemDetails.value.assemblies = [data]
}

</script>