<template>
   <div class="taxon-ranks-section">
      <h2 class="section__title">{{ t('home.targetRanks.title') }}</h2>
      <p class="section__description va-text-secondary">
         {{ t('home.targetRanks.description') }}
      </p>

      <div v-if="loading" class="section__loading">{{ t('loading') }}</div>
      <div v-else-if="error" class="section__error">{{ t('error') }}</div>

      <ul v-else-if="mappedRanks.length" class="ranks-list" role="list">
         <li v-for="r in mappedRanks" :key="r.rank" class="ranks-list__item" :style="{ '--rank-color': r.color }">
            <VaCollapse
               v-model="openState[r.rank]"
               :header="headerContent(r)"
               class="ranks-list__collapse"
               @update:model-value="onPanelToggle(r.rank, $event)"
            >
               <div class="ranks-list__panel-content">
                  <div class="ranks-list__scroller">
                     <VaInfiniteScroll
                        v-if="loadedRanks.has(r.rank)"
                        :key="r.rank"
                        :disabled="allLoadedByRank[r.rank] || loadingByRank[r.rank]"
                        :load="() => loadMore(r.rank)"
                        :offset="100"
                     >
                        <div
                           v-for="item in taxonsByRank[r.rank] || []"
                           :key="item.taxid"
                           class="ranks-list__taxon-item"
                           role="button"
                           tabindex="0"
                           @click="handleTaxonClick(item)"
                           @keydown.enter="handleTaxonClick(item)"
                        >
                           <span class="ranks-list__taxon-name">{{ item.name }}</span>
                           <VaChip v-if="item.leaves != null && item.leaves > 0" size="small" color="backgroundPrimary">
                              {{ item.leaves }}
                           </VaChip>
                        </div>
                        <div v-if="loadingByRank[r.rank]" class="ranks-list__loading-more">
                           <VaInnerLoading :loading="true" />
                        </div>
                     </VaInfiniteScroll>
                     <div v-else-if="loadingByRank[r.rank]" class="ranks-list__loading-more">
                        {{ t('loading') }}
                     </div>
                     <div
                        v-else-if="loadedRanks.has(r.rank) && !taxonsByRank[r.rank]?.length"
                        class="ranks-list__empty va-text-secondary"
                     >
                        {{ t('noData') }}
                     </div>
                  </div>
               </div>
            </VaCollapse>
         </li>
      </ul>

      <p v-else class="section__empty va-text-secondary">{{ t('noData') }}</p>
   </div>
</template>

<script setup lang="ts">
   import { onMounted, ref, reactive } from 'vue'
   import { useRouter } from 'vue-router'
   import StatisticsService from '../services/StatisticsService'
   import TaxonService from '../services/TaxonService'
   import { useI18n } from 'vue-i18n'
   import { useToast } from 'vuestic-ui'
   import { useRankPalette } from '../composable/useRankPalette'
   import { useTaxonomyStore } from '../stores/taxonomy-store'
   import type { TaxonNode } from '../data/types'

   const { t } = useI18n()
   const { init } = useToast()
   const router = useRouter()
   const taxonomyStore = useTaxonomyStore()
   const { rankPalette } = useRankPalette()

   const PAGE_SIZE = 20

   const loading = ref(false)
   const error = ref<unknown>(null)
   const mappedRanks = ref<{ rank: string; color: string; value: number }[]>([])
   const openState = reactive<Record<string, boolean>>({})

   const taxonsByRank = reactive<Record<string, TaxonNode[]>>({})
   const loadingByRank = reactive<Record<string, boolean>>({})
   const allLoadedByRank = reactive<Record<string, boolean>>({})
   const offsetByRank = reactive<Record<string, number>>({})
   const totalByRank = reactive<Record<string, number>>({})
   const loadedRanks = ref<Set<string>>(new Set())

   function headerContent(r: { rank: string; color: string; value: number }) {
      return `${formatRankLabel(r.rank)} (${formatCount(r.value)})`
   }

   async function fetchRanks() {
      const { data } = await StatisticsService.getModelFieldStats('taxons', 'rank', {})
      const dataKeys = Object.keys(data)
      mappedRanks.value = rankPalette.value
         .filter(({ rank }) => dataKeys.includes(rank))
         .map(({ rank, color }) => ({
            rank,
            color,
            value: data[rank],
         }))
      mappedRanks.value.forEach((r) => {
         if (!(r.rank in openState)) openState[r.rank] = false
      })
   }

   async function fetchTaxons(rank: string, append = false) {
      if (loadingByRank[rank] && !append) return
      loadingByRank[rank] = true
      try {
         const offset = append ? offsetByRank[rank] ?? 0 : 0
         const { data } = await TaxonService.getTaxons({
            rank,
            sort_column: 'leaves',
            sort_order: 'desc',
            offset,
            limit: PAGE_SIZE,
         })
         const list = (data?.data ?? data) as TaxonNode[]
         const total = (data as { total?: number })?.total ?? list.length
         if (!append) {
            taxonsByRank[rank] = [...list]
            offsetByRank[rank] = list.length
         } else {
            taxonsByRank[rank] = [...(taxonsByRank[rank] || []), ...list]
            offsetByRank[rank] = (offsetByRank[rank] ?? 0) + list.length
         }
         totalByRank[rank] = total
         allLoadedByRank[rank] = (taxonsByRank[rank]?.length ?? 0) >= total
      } catch (e) {
         console.error(e)
      } finally {
         loadingByRank[rank] = false
      }
   }

   function onPanelToggle(rank: string, isOpen: boolean) {
      if (isOpen && !loadedRanks.value.has(rank)) {
         loadedRanks.value = new Set([...loadedRanks.value, rank])
         fetchTaxons(rank)
      }
   }

   function loadMore(rank: string) {
      if (allLoadedByRank[rank] || loadingByRank[rank]) return
      fetchTaxons(rank, true)
   }

   async function handleTaxonClick(item: TaxonNode) {
      try {
         await taxonomyStore.setCurrentTaxon({
            name: item.name ?? '',
            rank: item.rank ?? '',
            taxid: item.taxid,
         } as TaxonNode)
         taxonomyStore.showSidebar = true
         router.push({ name: 'model', params: { model: 'organisms' } })
      } catch (err) {
         init({ message: 'Error selecting taxon', color: 'danger' })
         console.error(err)
      }
   }

   function formatRankLabel(rank: string): string {
      return rank.charAt(0).toUpperCase() + rank.slice(1).replace(/_/g, ' ')
   }

   function formatCount(n: number): string {
      return n.toLocaleString()
   }

   onMounted(async () => {
      try {
         loading.value = true
         error.value = null
         await fetchRanks()
      } catch (err) {
         error.value = err
         init({ message: 'Error fetching rank counts', color: 'danger' })
         console.error(err)
      } finally {
         loading.value = false
      }
   })
</script>

<style lang="scss" scoped>
   .taxon-ranks-section {
      width: 100%;
   }

   .section__title {
      text-align: center;
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--va-text-primary);
   }

   .section__description {
      margin: 0 0 1.75rem 0;
      font-size: 0.9375rem;
      line-height: 1.5;
      text-align: center;
      max-width: 520px;
      margin-left: auto;
      margin-right: auto;
   }

   .section__empty {
      text-align: center;
      padding: 1.5rem 0;
      margin: 0;
   }

   .ranks-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding-top: 0.25rem;
      border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
   }

   .ranks-list__item {
      display: flex;
      flex-direction: column;
      border-radius: 8px;
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition: background 0.15s ease, box-shadow 0.15s ease;

      &:hover {
         background: var(--va-background-element);
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
      }
   }

   .ranks-list__collapse {
      width: 100%;
      border-radius: 8px;
   }

   .ranks-list__collapse :deep(.va-collapse__header) {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;

      &::before {
         content: '';
         width: 4px;
         height: 1.25rem;
         border-radius: 2px;
         background: var(--rank-color);
         flex-shrink: 0;
      }
   }

   .ranks-list__collapse :deep(.va-collapse__header-content) {
      flex: 1;
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--va-text-primary);
   }

   .ranks-list__panel-content {
      padding: 0.25rem 0.75rem 0.5rem;
      border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
   }

   .ranks-list__scroller {
      max-height: 220px;
      overflow-y: auto;
   }

   .ranks-list__taxon-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.35rem 0.5rem;
      margin-bottom: 0.2rem;
      background: var(--va-background-secondary);
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8125rem;
      transition: background 0.15s;

      &:hover {
         background: var(--va-background-element, rgba(0, 0, 0, 0.04));
      }
   }

   .ranks-list__taxon-name {
      font-weight: 500;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
   }

   .ranks-list__loading-more {
      display: flex;
      justify-content: center;
      padding: 0.5rem;
      font-size: 0.75rem;
      color: var(--va-text-secondary);
   }

   .ranks-list__empty {
      font-size: 0.8125rem;
      padding: 0.75rem;
      text-align: center;
   }

   @media (max-width: 768px) {
      .ranks-list__collapse :deep(.va-collapse__header) {
         padding: 0.4rem 0.625rem;
      }

      .ranks-list__label,
      .ranks-list__count {
         font-size: 0.875rem;
      }
   }
</style>
