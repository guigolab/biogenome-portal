<template>
  <div>
    <div class="row align-center hero-section section-mb">
      <div class="flex lg12 md12 sm12 xs12">
        <div class="row justify-center">
          <div class="flex">
            <VaIcon style="text-align: center;" name="app-logo" size="6rem" />
          </div>
        </div>
        <div class="row justify-center align-center">
          <div style="text-align: center;" class="flex lg12 md12 sm12 xs12">
            <Header :title="title" :description="description" description-class="description-class" title-class="va-h1">
            </Header>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="row align-center">
    <div class="flex">
      <h2 class="va-h2">
        {{ t('home.taxonomy.title') }}
      </h2>
      <p>{{ t('home.taxonomy.description') }}</p>
    </div>
  </div>
  <div class="row justify-center section-mb">
    <div class="flex lg12 md12 sm12 xs12">
      <TaxonSearch />
      <div class="row">
        <div class="flex lg6 md6 sm12 xs12">
          <VaButton preset="primary" block :to="{ name: 'tree' }" color="secondary">
            {{ t('home.taxonomy.exploreBtn') }}
          </VaButton>
        </div>
        <div v-if="rootTaxon" class="flex lg6 md6 sm12 xs12">
          <VaButton @click="updateTaxon(rootTaxon)" preset="primary" block>
            {{ t('home.taxonomy.viewBtn') }} {{ rootTaxon.name }}
          </VaButton>
        </div>
      </div>
    </div>
  </div>
  <div class="row align-end justify-space-between">
    <div class="flex">
      <h2 class="va-h2">
        {{ t('home.data.title') }}
      </h2>
    </div>
    <div v-if="taxonomyStore.currentTaxon" class="flex">
      <TaxonChip />
    </div>
  </div>
  <ModelCounts :counts="stats"></ModelCounts>


  <!-- 
      hero section
      stats section
      charts section
      features section
     
     -->
</template>
<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useStatsStore } from '../stores/stats-store';
import TaxonSearch from '../components/TaxonSearch.vue';
import ModelCounts from '../components/ModelCounts.vue';
import { AppConfig, LangOption, TaxonNode } from '../data/types';
import Header from '../components/Header.vue';
import TaxonService from '../services/TaxonService';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { useI18n } from 'vue-i18n';
import TaxonChip from '../components/TaxonChip.vue';


const { t } = useI18n()
const statsStore = useStatsStore()
const taxonomyStore = useTaxonomyStore()
const settings = inject('appConfig') as AppConfig

const currentTaxon = computed(() => taxonomyStore.currentTaxon)
const rootNode = import.meta.env.VITE_ROOT_NODE ?
  import.meta.env.VITE_ROOT_NODE : '131567' // default to cellular organism
const dashboardDefaultTitle = "BioGenome Portal"
const dashboardDefaultDescription = "Welcome to the BioGenome Portal, explore all the data contained in this instance"

const title = computed<LangOption | string>(() => settings.dashboard.title as LangOption ?? dashboardDefaultTitle)
const description = computed<LangOption | string>(() => settings.dashboard.description as LangOption ?? dashboardDefaultDescription)

const stats = computed(() => statsStore.currentStats.length ? statsStore.currentStats : statsStore.portalStats)

const rootTaxon = ref<TaxonNode>()

watch(() => currentTaxon.value, async () => {
  if (!currentTaxon.value) {
    statsStore.currentStats = []
    return
  }
  await statsStore.getTaxonStats(currentTaxon.value?.taxid)
})
//fetch root node on mounting
onMounted(async () => {
  const { data } = await TaxonService.getTaxon(rootNode)
  rootTaxon.value = { ...data }
})

async function updateTaxon(root: TaxonNode) {
  taxonomyStore.currentTaxon = { ...root }
  taxonomyStore.showSidebar = true
}


</script>
<style>
.section-mb {
  margin-bottom: 3rem !important;
}

.hero-section {
  height: 50vh;
}

.description-class {
  max-width: 700px;
  line-height: 1.5rem;
  margin: auto;
}
</style>