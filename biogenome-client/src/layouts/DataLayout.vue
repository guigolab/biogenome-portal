<template>
  <VaLayout :bottom="{ fixed: true, order: 4, }" :top="{ fixed: true, order: 3, }" :left="{ fixed: true, absolute: breakpoints.smDown, order: 2, }">
    <template #top>
      <NavBar />
    </template>
    <template #left>
      <TaxonSidebar />
    </template>
    <template #content>
      <main>
        <PageHero 
          v-if="currentHeader"
          :title="currentHeader.title"
          :description="currentHeader.description"
          :is-home="route.name === 'home'"
        >
        </PageHero>
        <router-view v-slot="{ Component }">
          <Transition name="fade">
            <component :is="Component" />
          </Transition>
        </router-view>
      </main>
    </template>
    <template #bottom>
      <VaAlert closeable v-model="showAlert" color="warning" class="mb-6">
        <h4 class="va-h6">We Value your feedback</h4>
        <a style="margin-right: 3px;" class="va-text-bold va-link" href="https://forms.gle/NcZXJtXqHQTVRdHW8"
          target="_blank">Fill out our Feedback Form.</a>
        It only takes a few minutes, and your input is invaluable to us.
      </VaAlert>
    </template>
  </VaLayout>
</template>

<script setup lang="ts">
import { useBreakpoint } from 'vuestic-ui';
import NavBar from '../components/Navbar.vue'
import TaxonSidebar from '../components/TaxonSidebar.vue'
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { computed, inject, onMounted, ref } from 'vue';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  ArcElement,
  Filler,
} from 'chart.js'
import { useStatsStore } from '../stores/stats-store';
import { AppConfig, ConfigModel, LangOption, TaxonNode, DataModels } from '../data/types';
import { useRoute } from 'vue-router';
import PageHero from '../components/PageHero.vue';
import { useI18n } from 'vue-i18n';
import TaxonService from '../services/TaxonService';

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale, Filler, ArcElement, BarElement)

const config = inject('appConfig') as AppConfig
const { t } = useI18n()

const breakpoints = useBreakpoint()
const route = useRoute()
const taxonomyStore = useTaxonomyStore()
const statsStore = useStatsStore()
const showAlert = ref(false)
const dashboardDefaultTitle = "BioGenome Portal"
const dashboardDefaultDescription = "Welcome to the BioGenome Portal, explore all the data contained in this instance"

const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'
const rootTaxon = ref<TaxonNode>()

onMounted(async () => {
  const { data } = await TaxonService.getTaxon(rootNode)
  rootTaxon.value = { ...data }
  await statsStore.getPortalStats()
  showAlert.value = true
})

interface HeroAction {
  text: string;
  color: string;
  icon?: string;
  to?: { name: string };
  onClick?: () => void;
}

interface HeaderConfig {
  title: string | LangOption;
  description: string | LangOption;
  actions?: HeroAction[];
}

const currentHeader = computed<HeaderConfig | undefined>(() => {
  switch(route.name) {
    case 'home': {
      const actions: HeroAction[] = [
        {
          text: t('home.taxonomy.exploreBtn'),
          to: { name: 'tree' },
          color: 'primary',
          icon: 'fa-diagram-project'
        }
      ];
      
      if (rootTaxon.value) {
        actions.push({
          text: `${t('home.taxonomy.viewBtn')} ${rootTaxon.value.name}`,
          onClick: () => updateTaxon(rootTaxon.value!),
          color: 'secondary',
          icon: 'fa-eye'
        });
      }

      return {
        title: config.general.title as LangOption ?? dashboardDefaultTitle,
        description: config.general.description as LangOption ?? dashboardDefaultDescription,
        actions
      };
    }
    case 'tree':
      return {
        title: t('tree.title'),
        description: t('tree.description')
      };
    case 'map':
      return {
        title: t('map.title'),
        description: t('map.description')
      };
    case 'jbrowse':
      return {
        title: t('genomeBrowser.title'),
        description: t('genomeBrowser.description')
      };
    case 'model':
      const model = route.params.model as DataModels;
      const modelConfig = config.models[model];
      return {
        title: modelConfig.title as LangOption,
        description: modelConfig.description as LangOption
      };
    default:
      return undefined;
  }
})

async function updateTaxon(taxon: TaxonNode) {
  taxonomyStore.currentTaxon = { ...taxon }
  taxonomyStore.showSidebar = true
}
</script>

<style lang="scss" scoped>
.layout {
  position: relative;
  min-height: calc(100vh - 64px); // Account for navbar height
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;

  .action-button {
    min-width: 200px;
  }
}

@media (max-width: 768px) {
  .hero-actions {
    flex-direction: column;
    align-items: center;

    .action-button {
      width: 100%;
      max-width: 300px;
    }
  }
}
</style>