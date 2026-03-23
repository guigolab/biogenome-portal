<template>
   <div class="cms-dashboard">
      <!-- Page header -->
      <header class="cms-dashboard__header">
         <div class="cms-dashboard__header-text">
            <div class="cms-page-header">
               <h1 class="cms-page-header__title">{{ pageTitle }}</h1>
               <p class="cms-page-header__desc">{{ pageLead }}</p>
            </div>
         </div>
         <div class="cms-dashboard__header-actions">
            <CmsBtn :to="{ name: 'create-organism' }" icon="fa-plus" variant="primary">
               Create Organism
            </CmsBtn>
            <CmsBtn
               v-if="hasENATemplate"
               :to="{ name: 'publish-biosample' }"
               icon="fa-vial"
               variant="primary"
            >
               Submit Biosample
            </CmsBtn>

            <!-- Import dropdown -->
            <VaDropdown
               placement="bottom-end"
               :close-on-content-click="true"
               teleport="#cms-admin-dropdown-portal"
            >
               <template #anchor>
                  <button type="button" class="cms-dash-dd-btn">
                     <VaIcon name="fa-file-import" size="small" class="cms-dash-dd-btn__icon" />
                     Import
                     <svg class="cms-dash-dd-btn__chevron" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                        <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                     </svg>
                  </button>
               </template>
               <VaDropdownContent>
                  <nav class="cms-dash-dd-menu" aria-label="Import menu">
                     <button
                        v-if="isAdmin"
                        type="button"
                        class="cms-dash-dd-item"
                        @click="openDrawerInsdc()"
                     >
                        <VaIcon name="fa-cloud-arrow-down" size="small" class="cms-dash-dd-item__icon" />
                        Import from INSDC
                     </button>
                     <button type="button" class="cms-dash-dd-item" @click="drawer.open({ panel: 'goat' })">
                        <VaIcon name="fa-file-arrow-up" size="small" class="cms-dash-dd-item__icon" />
                        Import GoaT report
                     </button>
                     <button type="button" class="cms-dash-dd-item" @click="drawer.open({ panel: 'spreadsheet' })">
                        <VaIcon name="fa-table" size="small" class="cms-dash-dd-item__icon" />
                        Import from spreadsheet
                     </button>
                  </nav>
               </VaDropdownContent>
            </VaDropdown>

            <!-- Create dropdown (admin-only entries per route guards) -->
            <VaDropdown
               v-if="isAdmin"
               placement="bottom-end"
               :close-on-content-click="true"
               teleport="#cms-admin-dropdown-portal"
            >
               <template #anchor>
                  <button type="button" class="cms-dash-dd-btn">
                     <VaIcon name="fa-plus" size="small" class="cms-dash-dd-btn__icon" />
                     Create
                     <svg class="cms-dash-dd-btn__chevron" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                        <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                     </svg>
                  </button>
               </template>
               <VaDropdownContent>
                  <nav class="cms-dash-dd-menu" aria-label="Create menu">
                     <button type="button" class="cms-dash-dd-item" @click="drawer.open({ panel: 'annotation' })">
                        <VaIcon name="fa-bars-staggered" size="small" class="cms-dash-dd-item__icon" />
                        Create annotation
                     </button>
                     <button type="button" class="cms-dash-dd-item" @click="drawer.open({ panel: 'user' })">
                        <VaIcon name="fa-user-plus" size="small" class="cms-dash-dd-item__icon" />
                        Create user
                     </button>
                  </nav>
               </VaDropdownContent>
            </VaDropdown>
         </div>
      </header>

      <!-- === KPI + organism status strip (admins only) ================== -->
      <DashboardStatStrip v-if="isAdmin" :raw-stats="rawStats" :is-admin="isAdmin" />

      <!-- === DataManager view =========================================== -->
      <template v-if="!isAdmin">
         <!-- With ENA template: left column = species + biosamples, right = sankey -->
         <template v-if="hasENATemplate">
            <div class="cms-dashboard__grid cms-dashboard__grid--sankey">
               <div class="cms-dashboard__main">
                  <SpeciesOverviewModule />
                  <SubmittedBiosamplesModule />
               </div>
               <div class="cms-dashboard__aside cms-dashboard__aside--sankey">
                  <SpeciesBiosampleSankeyModule />
               </div>
            </div>
         </template>
         <!-- Without ENA template: only species overview, full width -->
         <template v-else>
            <SpeciesOverviewModule />
         </template>
      </template>

      <!-- === Admin view ================================================= -->
      <template v-else>
         <div class="cms-dashboard__grid">
            <!-- Left: primary data columns -->
            <div class="cms-dashboard__main">
               <SpeciesOverviewModule />
               <SubmittedBiosamplesModule />
               <RecordModelsModule
                  v-if="nonOrganismStats.length"
                  :stats="nonOrganismStats"
               />
            </div>
            <!-- Right: management columns -->
            <div class="cms-dashboard__aside">
               <UsersModule />
               <DeleteRequestsModule />
            </div>
         </div>
      </template>

      <CmsDashboardFormDrawer />
   </div>
</template>

<script setup lang="ts">
   import { computed, inject, onMounted } from 'vue'
   import { useGlobalStore } from '../../stores/global-store'
   import { useStatsStore } from '../../stores/stats-store'
   import { useCmsDashboardDrawerStore } from '../../stores/cms-dashboard-drawer-store'
   import { iconMap } from '../../composable/useIconMap'
   import type { AppConfig } from '../../data/types'
   import SpeciesOverviewModule from '../../components/cms/dashboard/SpeciesOverviewModule.vue'
   import SubmittedBiosamplesModule from '../../components/cms/dashboard/SubmittedBiosamplesModule.vue'
   import RecordModelsModule from '../../components/cms/dashboard/RecordModelsModule.vue'
   import SpeciesBiosampleSankeyModule from '../../components/cms/dashboard/SpeciesBiosampleSankeyModule.vue'
   import DeleteRequestsModule from '../../components/cms/dashboard/DeleteRequestsModule.vue'
   import UsersModule from '../../components/cms/dashboard/UsersModule.vue'
   import DashboardStatStrip from '../../components/cms/dashboard/DashboardStatStrip.vue'
   import CmsDashboardFormDrawer from '../../components/cms/dashboard/CmsDashboardFormDrawer.vue'
   import CmsBtn from '../../components/cms/ui/CmsBtn.vue'

   const globalStore = useGlobalStore()
   const statsStore = useStatsStore()
   const drawer = useCmsDashboardDrawerStore()
   const configs = inject('appConfig') as AppConfig

   const isAdmin = computed(() => globalStore.userRole === 'Admin')
   const hasENATemplate = computed(() => configs?.general?.enaTemplate)
   const pageTitle = computed(() => (isAdmin.value ? 'Dashboard' : 'My Data'))
   const pageLead = computed(() =>
      isAdmin.value
         ? 'Portal-wide overview of species, curators, submitted data, and pending requests.'
         : 'Your assigned species, submitted biosamples, and their relationships at a glance.',
   )

   const rawStats = computed(() => (isAdmin.value ? statsStore.portalStats : statsStore.userStats))

   const nonOrganismStats = computed(() =>
      rawStats.value
         .filter(({ key }) => key !== 'organisms')
         .map(({ key, count }) => ({
            key,
            count,
            ...(iconMap[key] ?? { icon: 'fa-folder', color: 'primary' }),
         })),
   )

   function openDrawerInsdc(model?: string) {
      drawer.open({
         panel: 'insdc',
         insdcImportModel: model,
      })
   }

   onMounted(async () => {
      if (!rawStats.value.length) {
         if (isAdmin.value) {
            await statsStore.getPortalStats()
         } else {
            await statsStore.getUserStats(globalStore.userName)
         }
      }
   })
</script>
