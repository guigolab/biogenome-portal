<template>
  <div>
    <div class="row align-center section-mb">
      <div class="flex lg12 md12 sm12 xs12">
        <div class="row justify-center">
          <div class="flex">
            <VaIcon style="text-align: center;" name="app-logo" size="6rem" />
          </div>
        </div>
        <div class="row justify-center align-center">
          <div style="text-align: center;" class="flex lg8 md8 sm12 xs12">
            <Header :title="title" :description="description" title-class="va-h1"></Header>
          </div>
        </div>
      </div>
    </div>

  </div>
  <div class="row justify-center align-center">
    <div class="flex lg">
      <h2 class="va-h3">
        Explore by taxonomy
      </h2>
      <p>Search and select a taxon to filter its related data</p>
    </div>
  </div>
  <div class="row justify-center section-mb">
    <div class="flex lg6 md6 sm12 xs12">
      <VaCard>
        <VaCardContent>
          <TaxonSearch />
        </VaCardContent>
        <VaCardActions align="center">
          <VaButton color="secondary">
            Explore
          </VaButton>
          <VaButton color="secondary">
            Eukaryota
          </VaButton>
        </VaCardActions>
      </VaCard>
    </div>
  </div>
  <div class="row justify-center">
    <div class="flex lg6 md8 sm12 xs12">
      <h2 class="va-h3">
        Explore by Data
      </h2>
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
import { computed, inject, onMounted } from 'vue';
import { useStatsStore } from '../stores/stats-store';
import TaxonSearch from '../components/TaxonSearch.vue';
import ModelCounts from '../components/ModelCounts.vue';
import { AppConfig, LangOption } from '../data/types';
import Header from '../components/Header.vue';

const statsStore = useStatsStore()

const settings = inject('appConfig') as AppConfig

const dashboardDefaultTitle = "BioGenome Portal"
const dashboardDefaultDescription = "Welcome to the BioGenome Portal, explore all the data contained in this instance"

const title = computed<LangOption | string>(() => settings.dashboard.title as LangOption ?? dashboardDefaultTitle)
const description = computed<LangOption | string>(() => settings.dashboard.description as LangOption ?? dashboardDefaultDescription)

const stats = computed(() => statsStore.portalStats)
onMounted(async () => {
  await statsStore.getPortalStats()
})

</script>
<style scoped>
.section-mb {
  margin-bottom: 3rem !important;
}

.hero-section {
  height: 50vh;
}
</style>