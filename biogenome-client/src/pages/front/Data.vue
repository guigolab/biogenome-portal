<template>
   <div class="data-page">
      <template v-if="isMapView">
         <section class="data-page__map-section" aria-label="Map view">
            <div class="data-page__map-wrap">
               <MapView />
            </div>
         </section>
      </template>
      <template v-else>
         <section class="data-page__main-section" aria-label="Data explorer content">
            <header class="data-page__toolbar" role="banner">
               <DataFilters
                  :model="currentModel as DataModels"
                  :has-charts="hasCharts"
                  @filters-changed="onFiltersUpdated"
                  @view-changed="onViewChanged"
                  @form-updated="onFiltersUpdated"
               />
            </header>

            <div class="data-page__content" role="main">
               <div v-if="currentCount === 0 && !isMapView" class="data-page__empty">
                  <div class="data-page__empty-card">
                     <VaIcon name="fa-magnifying-glass" size="large" class="data-page__empty-icon" aria-hidden="true" />
                     <h2 class="data-page__empty-title">{{ t('data.noMatches') || 'No matches for this taxon.' }}</h2>
                     <p class="data-page__empty-hint va-text-secondary">
                        {{ t('data.noMatchesHint', 'Try adjusting your filters or selecting a different taxon.') }}
                     </p>
                  </div>
               </div>
               <DataExplorerTable
                  v-else-if="itemStore.view !== 'charts'"
                  :model="currentModel as DataModels"
                  :columns="columns"
               />
               <div v-else class="data-page__charts row" role="region" aria-label="Charts">
                  <div
                     v-for="(chart, index) in charts"
                     :key="`${currentModel}-${chart.field}-${index}`"
                     class="data-page__chart-item"
                     :class="chartItemClass(chart)"
                  >
                     <Chart :chart="chart" :model="currentModel as DataModels" :ignore-query="false" />
                  </div>
               </div>
            </div>
         </section>
      </template>
   </div>
</template>

<script setup lang="ts">
   import { computed, inject, watch, onMounted } from 'vue'
   import { useRoute } from 'vue-router'
   import { useI18n } from 'vue-i18n'
   import { useTaxonomyStore } from '../../stores/taxonomy-store'
   import { useItemStore } from '../../stores/items-store'
   import { useStatsStore } from '../../stores/stats-store'
   import type { AppConfig, ConfigModel, DataModels, PortalChartConfig } from '../../data/types'
   import DataExplorerTable from '../../components/DataExplorerTable.vue'
   import Chart from '../../components/Chart.vue'
   import DataFilters from '../../components/DataFilters.vue'
   import MapView from './Map.vue'

   const { t } = useI18n()
   const route = useRoute()
   const config = inject('appConfig') as AppConfig
   const taxonomyStore = useTaxonomyStore()
   const itemStore = useItemStore()
   const statsStore = useStatsStore()

   const currentModel = computed<DataModels | 'map'>(() => {
      if (route.name === 'dataMap') return 'map'
      return ((route.params.model as string) || 'organisms') as DataModels
   })
   const isMapView = computed(() => currentModel.value === 'map')

   const currentCount = computed(() => {
      if (currentModel.value === 'map') return 0
      const stats = statsStore.currentStats.length ? statsStore.currentStats : statsStore.portalStats
      const s = stats.find((x) => x.key === currentModel.value)
      return s?.count ?? 0
   })

   const modelConfigs = computed(() => config.models[currentModel.value as DataModels] as ConfigModel | undefined)
   const charts = computed(() => modelConfigs.value?.charts ?? [])
   const columns = computed(() => modelConfigs.value?.columns ?? [])
   const hasCharts = computed(() => charts.value.length > 0)

   /** Layout from portal `size` (1–4); falls back to type-based defaults. */
   function chartItemClass(chart: PortalChartConfig | { type: string; size?: number }): string {
      const size =
         'size' in chart && chart.size != null
            ? chart.size
            : chart.type === 'dateline'
              ? 4
              : 2
      if (size >= 3) return 'data-page__chart-item--full'
      if (size <= 1) return 'data-page__chart-item--quarter'
      return 'data-page__chart-item--half'
   }

   function onFiltersUpdated() {
      itemStore.resetPagination()
      itemStore.fetchItems(currentModel.value as DataModels)
   }

   function onViewChanged(view: 'cards' | 'table' | 'charts') {
      itemStore.view = view === 'cards' ? 'table' : view
      itemStore.resetPagination()
      if (currentModel.value !== 'map') {
         itemStore.fetchItems(currentModel.value as DataModels)
      }
   }

   onMounted(() => {
      if (itemStore.view === 'cards') {
         itemStore.view = 'table'
      }
   })

   watch(
      () => taxonomyStore.currentTaxon?.taxid,
      async (taxid, previousTaxid) => {
         if (taxid) {
            await taxonomyStore.getAncestors(taxid)
            await statsStore.getTaxonStats(taxid)
         } else if (previousTaxid !== undefined) {
            // User cleared taxon; refresh portal stats (skip on initial mount, layout already fetches)
            await statsStore.getPortalStats()
         }
      },
      { immediate: true },
   )

   watch(
      () => currentModel.value,
      async (model) => {
         itemStore.clearSelectedItem()
         if (model && model !== 'map') {
            itemStore.setSearchFormField('taxon_lineage', taxonomyStore.currentTaxon?.taxid)
            await itemStore.handleQuery(model as DataModels)
            if (itemStore.view === 'cards') {
               itemStore.view = 'table'
            }
            if (!hasCharts.value && itemStore.view === 'charts') {
               itemStore.view = 'table'
            }
         }
      },
      { immediate: true },
   )

   watch(
      () => hasCharts.value,
      (isAvailable) => {
         if (!isAvailable && itemStore.view === 'charts') {
            itemStore.view = 'table'
         }
      },
      { immediate: true },
   )

   watch(
      () => taxonomyStore.currentTaxon,
      async () => {
         itemStore.setSearchFormField('taxon_lineage', taxonomyStore.currentTaxon?.taxid)
         if (currentModel.value && currentModel.value !== 'map') {
            itemStore.resetPagination()
            await itemStore.fetchItems(currentModel.value as DataModels)
         }
      },
   )
</script>

<style lang="scss" scoped>
   .data-page {
      width: 100%;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0;
      --data-content-max-width: 1200px;
      --data-content-space-y: 1.25rem;
      --data-content-space-x: 1.5rem;
   }

   .data-page__main-section {
      padding: var(--data-content-space-y) var(--data-content-space-x);
      max-width: var(--data-content-max-width);
      margin: 0 auto;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   .data-page__toolbar {
      flex-shrink: 0;
   }

   .data-page__content {
      flex: 1;
      min-height: 0;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   /* Empty state — card treatment for hierarchy and focus */
   .data-page__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 0.5rem;
   }

   .data-page__empty-card {
      text-align: center;
      max-width: 360px;
      padding: 2rem 1.75rem;
      background: var(--va-background-secondary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
   }

   .data-page__empty-icon {
      margin-bottom: 1rem;
      opacity: 0.4;
      color: var(--va-text-secondary);
   }

   .data-page__empty-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--va-text-primary);
      margin: 0 0 0.5rem;
      letter-spacing: -0.01em;
      line-height: 1.35;
   }

   .data-page__empty-hint {
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0;
   }

   /* Charts grid — match HomeNew features gap */
   .data-page__charts {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
   }

   .data-page__chart-item {
      min-width: 0;
      box-sizing: border-box;
      /* Mobile: all charts full width */
      flex: 0 0 100%;
      max-width: 100%;
   }

   /* Line charts: always full width */
   .data-page__chart-item--full {
      flex: 0 0 100%;
      max-width: 100%;
   }

   /* Pie and bar: 2 per row from tablet up */
   .data-page__chart-item--half {
      @media (min-width: 768px) {
         flex: 0 0 calc(50% - 0.625rem);
         max-width: calc(50% - 0.625rem);
      }
   }

   .data-page__chart-item--quarter {
      @media (min-width: 768px) {
         flex: 0 0 calc(25% - 0.9375rem);
         max-width: calc(25% - 0.9375rem);
      }
   }

   .data-page__map-section {
      padding: var(--data-content-space-y) var(--data-content-space-x);
   }

   .data-page__map-wrap {
      min-height: 400px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      background: var(--va-background-secondary);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
   }

   @media (max-width: 768px) {
      .data-page {
         --data-content-space-y: 1rem;
         --data-content-space-x: 1rem;
      }

      .data-page__main-section {
         gap: 0.875rem;
      }
   }
</style>
