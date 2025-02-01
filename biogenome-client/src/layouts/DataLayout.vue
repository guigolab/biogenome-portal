<template>
    <VaLayout :top="{ fixed: true, order: 3, }" :right="{ fixed: true, absolute: breakpoints.smDown, order: 2, }">
      <template #top>
        <NavBar />
        <VaDivider style="margin: 0;" />
        <VaAlert closeable v-model="showAlert" color="warning" class="mb-6">
          <h4 class="va-h6">We Value your feedback</h4>
          <a style="margin-right: 3px;" class="va-text-bold va-link" href="https://forms.gle/NcZXJtXqHQTVRdHW8"
            target="_blank">Fill out our Feedback Form.</a>
          It only takes a few minutes, and your input is invaluable to us.
        </VaAlert>
        <TaxonNavbar v-if="taxonomyStore.currentTaxon" :taxid="taxonomyStore.currentTaxon.taxid"
          :leaves="taxonomyStore.currentTaxon.leaves ?? 0"></TaxonNavbar>
      </template>
      <template #right>
        <TaxonSidebar />
      </template>
      <template #content>
        <main :class="['layout', 'va-gutter-5']">
          <router-view v-slot="{ Component }">
            <Transition name="fade">
              <component :is="Component" />
            </Transition>
          </router-view>
        </main>
      </template>
    </VaLayout>
  
  </template>
  <script setup lang="ts">
  import { useBreakpoint } from 'vuestic-ui';
  import NavBar from '../components/Navbar.vue'
  import TaxonSidebar from '../components/TaxonSidebar.vue'
  import { useTaxonomyStore } from '../stores/taxonomy-store';
  import { onMounted, ref } from 'vue';
  import TaxonNavbar from '../components/TaxonNavbar.vue';
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
  
  ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale, Filler, ArcElement, BarElement)
  
  const breakpoints = useBreakpoint()
  const taxonomyStore = useTaxonomyStore()
  const statsStore = useStatsStore()
  const showAlert = ref(false)

  onMounted(async () => {
    await statsStore.getPortalStats()
    showAlert.value = true
  })
  </script>
  
 