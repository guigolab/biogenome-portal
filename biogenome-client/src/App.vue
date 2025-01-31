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
import NavBar from './components/Navbar.vue'
import TaxonSidebar from './components/TaxonSidebar.vue'
import { useTaxonomyStore } from './stores/taxonomy-store';
import { onMounted, ref } from 'vue';
import TaxonNavbar from './components/TaxonNavbar.vue';
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
import { useStatsStore } from './stores/stats-store';
import { useGlobalStore } from './stores/global-store';

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale, Filler, ArcElement, BarElement)

const breakpoints = useBreakpoint()
const taxonomyStore = useTaxonomyStore()
const statsStore = useStatsStore()
const globalStore = useGlobalStore()
const showAlert = ref(false)
onMounted(async () => {
  await statsStore.getPortalStats()
  showAlert.value = true
})
</script>

<style lang="scss">
@import 'scss/main.scss';

/* Initial state when the element is inserted */
.slide-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

/* Active transition state when the element is entering */
.slide-enter-active {
  transition: all 0.3s ease;
}

/* Final state when the element has entered */
.slide-enter-to {
  transform: translateY(0);
  opacity: 1;
}

/* Initial state when the element is leaving */
.slide-leave-from {
  transform: translateY(0);
  opacity: 1;
}

/* Active transition state when the element is leaving */
.slide-leave-active {
  transition: all 0.3s ease;
}

/* Final state when the element has left */
.slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

#app {
  font-family: 'Source Sans Pro', Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.row-equal {
  .flex {
    .va-card {
      height: 100%;
    }
  }
}

.custom-chip {
  border: 2px solid;
  border-radius: 1rem;
  padding: 3px;
  font-size: 0.75rem;
}

.mr-2 {
  margin-right: 2px;
}

.mt-0 {
  margin-top: 0;
}

.m-0 {
  margin: 0
}

.p-0 {
  padding: 0 !important;
}

.pb-0 {
  padding-bottom: 0;
}

.ml-2 {
  margin-left: 2px;
}

.navbar-h {
  height: 4rem;
}

.h-450 {
  height: 450;
}


.w-300 {
  width: 300px;
}

.mt-6 {
  margin-top: 6;
}

.pt-0 {
  padding-top: 0;
}


.p-10 {
  padding: 10;
}


.pb-10 {
  padding-bottom: 10px;
}

.ml-6 {
  margin-left: 6px;
}

.mb-15 {
  margin-bottom: 15px;
}

.mh-450 {
  min-height: 450px;
}

.w-250 {
  width: 250px;
}

.mw-200 {
  min-width: 200px
}

.mw-250 {
  min-width: 250px
}

.mb-6 {
  margin-bottom: 6px
}

.gap-1 {
  gap: 1rem
}

.mb-12 {
  margin-bottom: 12px
}

body {
  margin: 0;
}

.light-paragraph {
  color: var(--va-light, #666E75);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active {
  transition: opacity 0.5s ease;
}

text {
  font-size: .8rem;
}

.c-h {
  min-height: 400px;
}
</style>