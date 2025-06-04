<template>
  <div class="home">

    <div class="content-section layout fluid va-gutter-5">
      <div class="section section-header">
        <h2 class="va-h3">{{ t('home.data.title') }}</h2>
      </div>
      <div class="section">
        <ModelCounts :counts="stats" />
      </div>

      <div v-if="hasGoat" class="data-card section">
        <div class="goat-header-row">
          <div class="card-header">
            <h2 class="va-h3">{{ t('home.goat.title') }}</h2>
            <TargetListStatus v-if="!targetListLoading && Object.keys(targetListStatus).length"
              :counts="targetListStatus" />
          </div>
          <div class="header-actions">
            <VaButton @click="downloadGoatReport" icon="fa-file-export" color="primary" size="large"
              :loading="goatReportLoading" class="download-goat-btn">
              {{ t('buttons.goat') }}
            </VaButton>
          </div>
        </div>
        <div class="goat-content">
          <div v-if="targetListLoading">{{ t('loading') }}</div>
          <div v-else-if="targetListError">{{ t('error') }}</div>
          <PortalSequencingStatus v-if="!goatStatusLoading && goatStatusSteps.length" :steps="goatStatusSteps" />
          <div v-else-if="goatStatusLoading">{{ t('loading') }}</div>
          <div v-else-if="goatStatusError">{{ t('error') }}</div>
        </div>
      </div>

      <div v-if="insdcStatus" class="data-card section">
        <div class="card-header">
          <h2 style="text-align: center;" class="va-h3">{{ t('home.insdc.title') }}</h2>
        </div>
        <PortalSequencingStatus v-if="!insdcStatusLoading && insdcStatusSteps.length" :steps="insdcStatusSteps" />
        <div v-else-if="insdcStatusLoading">{{ t('loading') }}</div>
        <div v-else-if="insdcStatusError">{{ t('error') }}</div>
      </div>

      <div class="features-section section layout fluid va-gutter-5">
        <h2 class="va-h3">{{ t('home.features.title') }}</h2>
        <div class="row row-equal justify-center features-row">
          <div v-for="feat in features" :key="feat.title" class="flex lg3 md4 sm12 xs12">
            <VaCard class="feature-card">
              <VaCardContent>
                <div class="feature-content">
                  <div class="feature-icon" :style="{ backgroundColor: `var(--va-${feat.color || 'primary'})` }">
                    <VaIcon :color="'#fff'" :name="feat.icon || 'fa-star'" size="32px" />
                  </div>
                  <h3 class="va-h5 feature-title">{{ t(feat.title) }}</h3>
                  <VaButton color="primary" :to="feat.route" class="feature-btn" size="large">
                    <VaIcon name="fa-arrow-right" class="mr-2" />
                    {{ t('buttons.view') }}
                  </VaButton>
                </div>
              </VaCardContent>
            </VaCard>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch, onUnmounted, Ref } from 'vue';
import { useStatsStore } from '../../stores/stats-store';
import ModelCounts from '../../components/ModelCounts.vue';
import { AppConfig, InfoBlock, LangOption, TaxonNode } from '../../data/types';
import TaxonService from '../../services/TaxonService';
import { useTaxonomyStore } from '../../stores/taxonomy-store';
import { useI18n } from 'vue-i18n';
import TaxonChip from '../../components/TaxonChip.vue';
import { useItemStore } from '../../stores/items-store';
import Chart from '../../components/Chart.vue';
import { useToast } from 'vuestic-ui/web-components';
import GoaTService from '../../services/GoaTService';
import TaxonRanks from '../../components/TaxonRanks.vue';
import { insdcSteps, goatSteps } from '../../composable/itemConfigs';
import PortalSequencingStatus from '../../components/PortalSequencingStatus.vue';
import StatisticsService from '../../services/StatisticsService';
import TargetListStatus from '../../components/TargetListStatus.vue';
import PieChart from '../../components/charts/PieChart.vue';

const { t } = useI18n()
const statsStore = useStatsStore()
const taxonomyStore = useTaxonomyStore()
const settings = inject('appConfig') as AppConfig
const itemStore = useItemStore()

const { init } = useToast()

const hasGoat = settings.general.goat //show goat status
const insdcStatus = settings.general.insdcStatus //show indsc status


const defaultFeatures = [
  {
    title: 'tree.title',
    description: 'tree.description',
    route: { name: 'tree' },
    icon: 'fa-sitemap',
    color: 'success'
  },
  {
    title: 'map.title',
    description: 'map.description',
    route: { name: 'map' },
    icon: 'fa-map-location-dot',
    color: 'warning'
  }
]

const jbrowseFeature = {
  title: 'genomeBrowser.title',
  route: { name: 'jbrowse' },
  description: 'genomeBrowser.assembly.modelDescription',
  icon: 'fa-dna',
  color: 'info'
}

const features = computed(() => settings.models.assemblies ? [jbrowseFeature, ...defaultFeatures] : [...defaultFeatures])

const currentTaxon = computed(() => taxonomyStore.currentTaxon)
const rootNode = import.meta.env.VITE_ROOT_NODE ?
  import.meta.env.VITE_ROOT_NODE : '131567' // default to cellular organism

const stats = computed(() => statsStore.currentStats.length ? statsStore.currentStats : statsStore.portalStats)

const rootTaxon = ref<TaxonNode>()

// Status refs
const insdcStatusSteps = ref<any[]>([]);
const insdcStatusLoading = ref(false);
const insdcStatusError = ref<null | any>(null);
const goatStatusSteps = ref<any[]>([]);
const goatStatusLoading = ref(false);
const goatStatusError = ref<null | any>(null);
const targetListStatus = ref<Record<string, number>>({});
const targetListLoading = ref(false);
const targetListError = ref<null | any>(null);
const goatReportLoading = ref(false)

type StatusType = 'insdc_status' | 'goat_status';

interface StatusState {
  steps: typeof insdcSteps | typeof goatSteps;
  loading: Ref<boolean>;
  error: Ref<any>;
  value: Ref<any[]>;
}

const statusStates: Record<StatusType, StatusState> = {
  insdc_status: {
    steps: insdcSteps,
    loading: insdcStatusLoading,
    error: insdcStatusError,
    value: insdcStatusSteps
  },
  goat_status: {
    steps: goatSteps,
    loading: goatStatusLoading,
    error: goatStatusError,
    value: goatStatusSteps
  }
};

async function fetchStatus(key: StatusType, query: Record<string, any>) {
  const state = statusStates[key];
  if (!state) return;

  state.loading.value = true;
  state.error.value = null;

  try {
    const { data } = await StatisticsService.getModelFieldStats('organisms', key, query);
    const statusData = data as Record<string, number>;

    if (key === 'goat_status') {
      // Also fetch target list status when fetching GOAT status
      targetListLoading.value = true;
      try {
        const { data: targetData } = await StatisticsService.getModelFieldStats('organisms', 'target_list_status', query);
        targetListStatus.value = targetData as Record<string, number>;
      } catch (err) {
        targetListError.value = err;
        console.error('Error fetching target list status:', err);
      } finally {
        targetListLoading.value = false;
      }
    }

    state.value.value = state.steps.map(step => ({
      ...step,
      count: statusData[step.value] || 0
    }));
  } catch (err) {
    state.error.value = err;
    console.error(`Error fetching ${key}:`, err);
  } finally {
    state.loading.value = false;
  }
}

watch(() => currentTaxon.value, async () => {
  itemStore.searchForm = { taxon_lineage: currentTaxon.value?.taxid }
  if (insdcStatus) await fetchStatus('insdc_status', { taxon_lineage: currentTaxon.value?.taxid })
  if (hasGoat) await fetchStatus('goat_status', { taxon_lineage: currentTaxon.value?.taxid })
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

const isSearchFixed = ref(false);

function handleScroll() {
  const searchElement = document.querySelector('.search-container');
  if (!searchElement) return;

  const navbarHeight = 100; // Height of the main navbar
  const scrollPosition = window.scrollY;
  const searchOffset = searchElement.getBoundingClientRect().top + scrollPosition;

  isSearchFixed.value = scrollPosition > searchOffset - navbarHeight;
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  handleScroll();
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  // Cleanup handled by TaxonSearch component
})

async function downloadGoatReport() {
  try {
    goatReportLoading.value = true
    const response = await GoaTService.getGoatReport()
    const data = response.data
    const href = URL.createObjectURL(data);
    let name = 'goat_report.tsv'
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  } catch (err) {
    console.error(err)
    init({ message: 'Error downloading Goat Report', color: 'danger' })
  } finally {
    goatReportLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
}

.content-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.section {
  margin-bottom: 3rem;
}

.section:last-child {
  margin-bottom: 0;
}

.section-header {
  text-align: center;
  margin: 1rem 0 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.data-card {
  background: var(--va-background-secondary);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.goat-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.card-header {
  display: flex;
  margin: 0;
  flex-direction: column;
}

.header-actions {
  display: flex;
  align-items: center;
}

.download-goat-btn {
  font-weight: bold;
  min-width: 160px;
  transition: box-shadow 0.2s;
}

.download-goat-btn:active {
  box-shadow: 0 0 0 2px var(--va-primary);
}

.features-section {
  margin: 4rem 0;

  h2 {
    text-align: center;
    margin-bottom: 2rem;
  }
}

.features-row {
  gap: 2rem;
  justify-content: center;
}

.feature-card {
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s, transform 0.2s;
  text-align: center;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10);
    transform: translateY(-2px) scale(1.03);
  }
}

.feature-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1rem;
}

.feature-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.feature-desc {
  font-size: 1rem;
  color: var(--va-text-secondary);
  margin-bottom: 1.5rem;
}

.feature-btn {
  margin-top: auto;
  width: 100%;
  max-width: 220px;
  font-weight: 600;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .features-row {
    flex-direction: column;
    gap: 1.5rem;
  }

  .feature-btn {
    width: 100%;
    max-width: 100%;
  }
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-bottom: 0.5rem;
  background: var(--va-primary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
}
</style>