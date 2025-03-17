<template>
  <div>
    <div class="hero-section row align-center">
      <div class="flex lg12 md12 sm12 xs12">
        <div class="row justify-center align-center">
          <div style="text-align: center;" class="flex lg12 md12 sm12 xs12">
            <Header :title="title" :description="description" description-class="va-text-secondary" title-class="va-h1">
            </Header>
          </div>
        </div>
        <div class="row justify-center">
          <div class="flex">
            <VaButton :to="{ name: 'tree' }" color="secondary">
              {{ t('home.taxonomy.exploreBtn') }}
            </VaButton>
          </div>
          <div class="flex" v-if="rootTaxon">
            <VaButton @click="updateTaxon(rootTaxon)">
              {{ t('home.taxonomy.viewBtn') }} {{ rootTaxon.name }}
            </VaButton>
          </div>
        </div>
      </div>
    </div>
    <VaDivider />
    <TaxonRanks />
    <div class="row">
      <div class="flex">
        <h2 class="va-h2">
          {{ t('home.taxonomy.title') }}
        </h2>
        <p class="va-text-secondary">{{ t('home.taxonomy.description') }}</p>
      </div>
    </div>
    <div class="row justify-center section-mb">
      <div class="flex lg12 md12 sm12 xs12">
        <VaCard>
          <VaCardContent>
            <TaxonSearch />
          </VaCardContent>
        </VaCard>
      </div>
    </div>
    <div class="row align-center justify-center">
      <div class="flex">
        <h2 style="text-align: center;" class="va-h2">
          {{ t('home.data.title') }}
        </h2>
      </div>
      <div v-if="taxonomyStore.currentTaxon" class="flex">
        <TaxonChip />
      </div>
    </div>
    <ModelCounts class="section-mb" :counts="stats" :row-class="'justify-center'"></ModelCounts>
    <div v-if="hasGoat" class="row section-mb">
      <div class="flex lg12 md12 sm12 xs12">
        <div class="row align-center justify-space-between">
          <div class="flex">
            <h2 class="va-h2">
              {{ t('home.goat.title') }}
            </h2>
          </div>
          <div v-if="taxonomyStore.currentTaxon" class="flex">
            <TaxonChip />
          </div>
          <div class="flex">
            <VaButton @click="downloadGoatReport" icon="fa-file-arrow-down">{{ t('buttons.goat') }}</VaButton>
          </div>
        </div>
        <div class="row">
          <div v-for="chart, index in goatCharts" :key="`${index}-${chart.model}-${chart.field}`" :class="chart.class">
            <Chart :chart="(chart as InfoBlock)" :index="index" :ignore-query="false" />
          </div>
        </div>
      </div>
    </div>
    <div v-if="insdcStatus" class="row section-mb">
      <div class="flex lg12 md12 sm12 xs12">
        <div class="row align-center justify-space-between">
          <div class="flex">
            <h2 style="text-align: center;" class="va-h2">
              {{ t('home.insdc.title') }}
            </h2>
          </div>
          <div v-if="taxonomyStore.currentTaxon" class="flex">
            <TaxonChip />
          </div>
        </div>
        <div class="row">
          <div class="flex lg12 md12 sm12 xs12">
            <Chart :ignore-query="false"
              :chart="{ model: 'organisms', field: 'insdc_status', type: 'bar', class: '' }" />
          </div>
        </div>
      </div>
    </div>

    <div class="row justify-center">
      <div class="flex">
        <h2 style="text-align: center;" class="va-h2">
          {{ t('home.features.title') }}
        </h2>
      </div>
    </div>
    <div class="row row-equal justify-center">
      <div class="flex lg6 md6 sm12 xs12">
        <VaCard>
          <VaCardContent>
            <div class="row justify-space-between align-center">
              <div class="flex">
                <h3 class="va-h3">{{ t('tree.title') }}</h3>

              </div>
              <div class="flex">
                <VaButton color="textPrimary" :to="{ name: 'tree' }">{{ t('buttons.view') }}</VaButton>

              </div>
            </div>
          </VaCardContent>
          <VaDivider style="margin: 0;" />
          <VaCardContent>
            <p class="va-text-secondary">{{ t('tree.description') }}</p>
          </VaCardContent>
        </VaCard>
      </div>
      <div v-if="settings.models.assemblies" class="flex lg6 md6 sm12 xs12">
        <VaCard>
          <VaCardContent>
            <div class="row justify-space-between align-center">
              <div class="flex">
                <h3 class="va-h3">{{ t('genomeBrowser.title') }}</h3>
              </div>
              <div class="flex">
                <VaButton color="textPrimary" :to="{ name: 'jbrowse' }">{{ t('buttons.view') }}</VaButton>
              </div>
            </div>
          </VaCardContent>
          <VaDivider style="margin: 0;" />
          <VaCardContent>
            <p class="va-text-secondary">{{ t('genomeBrowser.assembly.modelDescription') }}</p>
          </VaCardContent>
        </VaCard>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useStatsStore } from '../../stores/stats-store';
import TaxonSearch from '../../components/TaxonSearch.vue';
import ModelCounts from '../../components/ModelCounts.vue';
import { AppConfig, InfoBlock, LangOption, TaxonNode } from '../../data/types';
import Header from '../../components/Header.vue';
import TaxonService from '../../services/TaxonService';
import { useTaxonomyStore } from '../../stores/taxonomy-store';
import { useI18n } from 'vue-i18n';
import TaxonChip from '../../components/TaxonChip.vue';
import { useItemStore } from '../../stores/items-store';
import Chart from '../../components/Chart.vue';
import { useToast } from 'vuestic-ui/web-components';
import GoaTService from '../../services/GoaTService';
import TaxonRanks from '../../components/TaxonRanks.vue';

const { t } = useI18n()
const statsStore = useStatsStore()
const taxonomyStore = useTaxonomyStore()
const settings = inject('appConfig') as AppConfig
const itemStore = useItemStore()

const { init } = useToast()

const hasGoat = settings.general.goat //show goat status
const insdcStatus = settings.general.insdcStatus //show indsc status

const goatCharts = [
  {
    "model": "organisms",
    "field": "goat_status",
    "class": "flex lg6 md6 sm12 xs12",
    "type": "pie"
  },
  {
    "model": "organisms",
    "field": "target_list_status",
    "class": "flex lg6 md6 sm12 xs12",
    "type": "pie"
  }
]

const currentTaxon = computed(() => taxonomyStore.currentTaxon)
const rootNode = import.meta.env.VITE_ROOT_NODE ?
  import.meta.env.VITE_ROOT_NODE : '131567' // default to cellular organism
const dashboardDefaultTitle = "BioGenome Portal"
const dashboardDefaultDescription = "Welcome to the BioGenome Portal, explore all the data contained in this instance"

const title = computed<LangOption | string>(() => settings.general.title as LangOption ?? dashboardDefaultTitle)
const description = computed<LangOption | string>(() => settings.general.description as LangOption ?? dashboardDefaultDescription)

const stats = computed(() => statsStore.currentStats.length ? statsStore.currentStats : statsStore.portalStats)

const rootTaxon = ref<TaxonNode>()

watch(() => currentTaxon.value, async () => {
  itemStore.searchForm = { taxon_lineage: currentTaxon.value?.taxid }
  if (!currentTaxon.value) {
    statsStore.currentStats = []
    return
  }
  await statsStore.getTaxonStats(currentTaxon.value?.taxid)
}, { immediate: true })
//fetch root node on mounting
onMounted(async () => {
  const { data } = await TaxonService.getTaxon(rootNode)
  rootTaxon.value = { ...data }
})

async function updateTaxon(root: TaxonNode) {
  taxonomyStore.currentTaxon = { ...root }
  taxonomyStore.showSidebar = true
}

async function downloadGoatReport() {
  try {
    const response = await GoaTService.getGoatReport()
    const data = response.data
    const href = URL.createObjectURL(data);
    let name = 'goat_report.tsv'
    // create "a" HTML element with href to file & click
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('download', name); //or any other extension
    document.body.appendChild(link);
    link.click();
    // clean up "a" element & remove ObjectURL
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  } catch (err) {
    console.error(err)
    init({ message: 'Error downloading Goat Report', color: 'danger' })
  }
}
</script>
<style>
.section-mb {
  margin-bottom: 3rem !important;
}

.hero-section {
  height: min(50vh, 400px);
}
</style>