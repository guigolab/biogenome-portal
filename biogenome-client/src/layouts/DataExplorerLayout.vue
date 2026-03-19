<template>
   <VaLayout
      :top="{ fixed: true, order: 2 }"
      :left="{ fixed: true, absolute: breakpoints.smDown, order: 1 }"
      :right="{ fixed: true, absolute: true, order: 1 }"
   >
      <template #top>
         <NavBar />
      </template>
      <template #right>
         <Transition name="detail-slide">
            <aside v-if="hasItemDetail" class="data-explorer-right">
               <header class="data-explorer-right__header">
                  <div class="data-explorer-right__header-title">
                     <VaIcon name="fa-circle-info" size="small" color="primary" />
                     <span class="data-explorer-right__title">{{ t('item.details') }}</span>
                  </div>
                  <button class="data-explorer-right__close" :aria-label="'Close'" @click="closeDetail">
                     <VaIcon name="fa-xmark" size="small" />
                  </button>
               </header>
               <div class="data-explorer-right__body">
                  <DataItemDetail :id="(itemStore.selectedItemId as string)" :model="(itemStore.model as string)" />
               </div>
            </aside>
         </Transition>
      </template>
      <template #left>
         <DataExplorerLeftSidebar :visible="showTreePanel" />
      </template>
      <template #content>
         <div class="data-explorer-content-wrap">
            <div class="data-explorer-surface">
               <section class="data-explorer-top" aria-label="Context and navigation">
                  <div class="data-explorer-top__breadcrumbs">
                     <VaIcon
                        name="fa-location-dot"
                        size="11px"
                        color="secondary"
                        class="data-explorer-top__breadcrumbs-icon"
                     />
                     <VaBreadcrumbs color="primary" class="data-explorer-top__breadcrumbs-list">
                        <VaBreadcrumbsItem
                           v-for="item in layoutBreadcrumbItems"
                           :key="item.key"
                           :label="item.label"
                           class="data-explorer-top__breadcrumbs-item"
                           :class="{
                              'data-explorer-top__breadcrumbs-item--current': item.isSelected,
                              'data-explorer-top__breadcrumbs-item--clickable': item.clickable,
                           }"
                           @click="item.clickable && item.node && selectAncestor(item.node)"
                        />
                     </VaBreadcrumbs>
                  </div>
                  <header
                     class="data-explorer-top__header"
                     :class="{ 'data-explorer-top__header--compact': isRootSelected }"
                  >
                     <div class="data-explorer-top__header-left">
                        <button
                           class="data-explorer-top__tree-toggle"
                           :title="showTreePanel ? t('data.hideTree') || 'Hide tree' : t('data.showTree') || 'Show tree'"
                           @click="showTreePanel = !showTreePanel"
                        >
                           <VaIcon :name="showTreePanel ? 'fa-chevron-left' : 'fa-sitemap'" size="small" />
                        </button>
                        <div class="data-explorer-top__title-block">
                           <template v-if="isRootSelected">
                              <h1 class="data-explorer-top__title data-explorer-top__title--compact">
                                 {{ taxonomyStore.rootNode?.name ?? t('data.allTaxa') }}
                                 <span class="data-explorer-top__title-meta">
                                    · {{ t('data.allTaxa') || 'All taxa' }}</span
                                 >
                              </h1>
                              <p class="data-explorer-top__subtitle va-text-secondary">
                                 {{ t('data.thisIsRoot') || 'This is the root of the taxonomy.' }}
                              </p>
                           </template>
                           <template v-else-if="taxonomyStore.currentTaxon">
                              <p v-if="taxonomyStore.currentTaxon.rank" class="data-explorer-top__kicker">
                                 {{ formatRank(taxonomyStore.currentTaxon.rank) }}
                              </p>
                              <h1 class="data-explorer-top__title">{{ taxonomyStore.currentTaxon.name }}</h1>
                              <p
                                 v-if="isOrganism && hasOrganismsModel"
                                 class="data-explorer-top__organism-hint va-text-secondary"
                              >
                                 <VaIcon name="fa-circle-info" size="small" class="data-explorer-top__hint-icon" />
                                 {{
                                    t('data.organismSameRecord') ||
                                    'This taxon has a corresponding record in the Organisms table.'
                                 }}
                              </p>
                              <p v-else class="data-explorer-top__subtitle va-text-secondary">
                                 {{
                                    t('data.taxonFilterDescription') || 'Browse data for this taxon and its descendants.'
                                 }}
                              </p>
                           </template>
                           <template v-else>
                              <p class="data-explorer-top__kicker">{{ t('data.explorer') || 'Data Explorer' }}</p>
                              <h1 class="data-explorer-top__title">{{ t('data.title') || 'Data' }}</h1>
                              <p class="data-explorer-top__subtitle va-text-secondary">
                                 {{ t('data.description') || 'Explore and filter data by taxonomy and model.' }}
                              </p>
                           </template>
                        </div>
                     </div>
                  </header>
                  <div class="data-explorer-top__tabs">
                     <div v-if="isCompactTabs" class="data-explorer-top__tabs-compact">
                        <div class="data-explorer-top__tabs-current">
                           <VaIcon
                              :name="activeTab?.icon || 'fa-database'"
                              size="small"
                              :color="activeTab?.color || 'primary'"
                           />
                           <span>{{ activeTab?.label }}</span>
                        </div>
                        <select v-model="compactTabModel" class="data-explorer-top__tabs-select">
                           <option v-for="item in tabItems" :key="item.key" :value="item.key">
                              {{ item.label }}
                           </option>
                        </select>
                     </div>
                     <div v-else class="data-explorer-top__tabs-list" role="tablist">
                        <RouterLink
                           v-for="item in tabItems"
                           :key="item.key"
                           :to="item.route"
                           class="data-explorer-top__tab"
                           :class="{ 'data-explorer-top__tab--active': currentModel === item.key }"
                           role="tab"
                           :aria-selected="currentModel === item.key"
                           :aria-current="currentModel === item.key ? 'page' : undefined"
                           :title="item.label"
                        >
                           <VaIcon
                              :name="item.icon"
                              size="small"
                              class="data-explorer-top__tab-icon"
                              :color="currentModel === item.key ? 'primary' : item.color"
                           />
                           <span class="data-explorer-top__tab-label">{{ item.label }}</span>
                           <span
                              v-if="item.key !== 'map' && item.count !== undefined && item.count > 0"
                              class="data-explorer-top__tab-count"
                           >
                              {{ item.count.toLocaleString() }}
                           </span>
                        </RouterLink>
                     </div>
                  </div>
               </section>
               <router-view v-slot="{ Component }">
                  <Transition name="fade">
                     <component :is="Component" />
                  </Transition>
               </router-view>
            </div>
         </div>
      </template>
   </VaLayout>
</template>

<script setup lang="ts">
   import { useBreakpoint } from 'vuestic-ui'
   import { computed, ref, watch, onMounted } from 'vue'
   import { useRoute, useRouter, RouterLink } from 'vue-router'
   import { useI18n } from 'vue-i18n'
   import { inject } from 'vue'
   import NavBar from '../components/Navbar.vue'
   import DataExplorerLeftSidebar from '../components/DataExplorerLeftSidebar.vue'
   import DataItemDetail from '../components/DataItemDetail.vue'
   import { useTaxonomyStore } from '../stores/taxonomy-store'
   import { useItemStore } from '../stores/items-store'
   import { useStatsStore } from '../stores/stats-store'
   import { iconMap } from '../composable/useIconMap'
   import type { AppConfig } from '../data/types'
   import type { TaxonNode } from '../data/types'
   import { dataModels } from '../data/types'
   import type { DataModels } from '../data/types'

   const CELLULAR_ORGANISM_TAXID = '131567'

   const { t } = useI18n()
   const breakpoints = useBreakpoint()
   const route = useRoute()
   const router = useRouter()
   const taxonomyStore = useTaxonomyStore()
   const statsStore = useStatsStore()
   const itemStore = useItemStore()
   const config = inject<AppConfig>('appConfig')
   const showTreePanel = ref(true)

   const currentModel = computed<DataModels | 'map'>(() => {
      if (route.name === 'dataMap') return 'map'
      return ((route.params.model as string) || 'organisms') as DataModels
   })

   type TabItem = {
      key: DataModels | 'map'
      label: string
      icon: string
      color: string
      count: number | undefined
      route: { name: string; params?: { model?: DataModels } }
   }

   const tabItems = computed<TabItem[]>(() => {
      if (!config?.models) return []
      const models = Object.keys(config.models).filter((k) => dataModels.includes(k as DataModels)) as DataModels[]
      const stats = statsStore.currentStats.length ? statsStore.currentStats : statsStore.portalStats
      const statMap = Object.fromEntries(stats.map((s) => [s.key, s.count]))
      const items: TabItem[] = models.map((key) => {
         const { icon, color } = iconMap[key] || { icon: 'fa-database', color: 'primary' }
         return {
            key,
            label: t(`models.${key}`),
            icon,
            color,
            count: statMap[key],
            route: { name: 'model', params: { model: key } },
         }
      })
      const mapConfig = iconMap.map || { icon: 'fa-map-location-dot', color: 'info' }
      items.push({
         key: 'map',
         label: t('map.title'),
         icon: mapConfig.icon,
         color: mapConfig.color,
         count: undefined,
         route: { name: 'dataMap' },
      })
      return items
   })
   const isCompactTabs = computed(() => breakpoints.mdDown)
   const activeTab = computed(() => tabItems.value.find((item) => item.key === currentModel.value))
   const compactTabModel = computed<DataModels | 'map'>({
      get: () => currentModel.value,
      set: (value) => {
         const next = tabItems.value.find((item) => item.key === value)
         if (!next) return
         itemStore.clearSelectedItem()
         router.push(next.route)
      },
   })

   onMounted(async () => {
      await statsStore.getPortalStats()
   })
   const hasChildren = ref(true)

   const hasItemDetail = computed(() => Boolean(itemStore.selectedItemId && itemStore.model))
   const hasOrganismsModel = computed(() => Boolean(config?.models?.organisms))

   function closeDetail() {
      itemStore.clearSelectedItem()
   }

   const isRootSelected = computed(() => {
      const current = taxonomyStore.currentTaxon
      const root = taxonomyStore.rootNode
      if (!current || !root) return !current && !!root
      return current.taxid === root.taxid
   })

   const isOrganism = computed(() => !hasChildren.value && !!taxonomyStore.currentTaxon)

   function formatRank(rank: string): string {
      return rank ? rank.charAt(0).toUpperCase() + rank.slice(1).replace(/_/g, ' ') : ''
   }

   type LayoutBreadcrumbItem = {
      key: string
      label: string
      isSelected: boolean
      clickable?: boolean
      node?: TaxonNode
   }

   const layoutBreadcrumbItems = computed<LayoutBreadcrumbItem[]>(() => {
      const rawAncestors = taxonomyStore.ancestors.filter((a) => a.taxid !== CELLULAR_ORGANISM_TAXID)
      const current = taxonomyStore.currentTaxon
      const root = taxonomyStore.rootNode
      const ancestors =
         current && rawAncestors.length > 0 && rawAncestors[rawAncestors.length - 1].taxid === current.taxid
            ? rawAncestors.slice(0, -1)
            : rawAncestors
      if (!current) {
         if (root) {
            return [
               {
                  key: 'root',
                  label: `${root.name} (${t('data.allTaxa') || 'all'})`,
                  isSelected: true,
                  clickable: false,
               },
            ]
         }
         return [{ key: 'all', label: t('data.allTaxa') || 'All taxa', isSelected: true, clickable: false }]
      }
      const fullList: TaxonNode[] = [...ancestors, current]
      if (fullList.length <= 10) {
         return fullList.map((node, i) => ({
            key: node.taxid,
            label: node.name ?? '',
            isSelected: i === fullList.length - 1,
            clickable: i < fullList.length - 1,
            node,
         }))
      }
      const first = fullList[0]
      const lastNine = fullList.slice(-9)
      return [
         { key: first.taxid, label: first.name ?? '', isSelected: false, clickable: true, node: first },
         { key: 'ellipsis', label: '…', isSelected: false, clickable: false },
         ...lastNine.map((node, i) => ({
            key: node.taxid,
            label: node.name ?? '',
            isSelected: i === lastNine.length - 1,
            clickable: i < lastNine.length - 1,
            node,
         })),
      ]
   })

   function selectAncestor(ancestor: TaxonNode) {
      taxonomyStore.setCurrentTaxon(ancestor)
   }

   watch(
      () => taxonomyStore.currentTaxon?.taxid,
      async (taxid) => {
         if (!taxid) {
            hasChildren.value = true
            return
         }
         try {
            await taxonomyStore.getChildren(taxid)
            hasChildren.value = (taxonomyStore.children?.length ?? 0) > 0
         } catch {
            hasChildren.value = true
         }
      },
      { immediate: true },
   )
</script>

<style lang="scss" scoped>
   .data-explorer-content-wrap {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      --de-space-1: 0.5rem;
      --de-space-2: 0.75rem;
      --de-space-3: 1rem;
      --de-space-4: 1.25rem;
      --de-space-5: 1.5rem;
      --de-space-6: 2rem;
      --de-content-max-width: 1200px;
      --de-surface-radius: 12px;
      --de-radius-sm: 8px;
      --de-radius-md: 12px;
      --de-font-title: 1.5rem;
      --de-font-title-compact: 1.25rem;
      --de-font-body: 0.9375rem;
      --de-font-secondary: 0.875rem;
      --de-font-meta: 0.8125rem;
      --de-font-kicker: 0.75rem;
      --de-control-h: 2.25rem;
      --de-control-h-sm: 2rem;
      --de-bg-primary: var(--va-background-primary);
      --de-bg-secondary: var(--va-background-secondary);
      --de-bg-element: var(--va-background-element);
   }

   .data-explorer-surface {
      background: var(--de-bg-secondary);
      min-height: 100%;
      min-width: 0;
      flex: 1;
   }

   /* Top strip: breadcrumbs + header + tabs — compact, one visual unit */
   .data-explorer-top {
      flex-shrink: 0;
      padding: var(--de-space-3) var(--de-space-4) var(--de-space-2);
      max-width: var(--de-content-max-width);
      margin: 0 auto;
      width: 100%;
      border-bottom: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
   }

   /* Breadcrumbs — minimal, kicker-style (match HomeNew section__kicker) */
   .data-explorer-top__breadcrumbs {
      display: flex;
      align-items: center;
      gap: var(--de-space-1);
      margin-bottom: var(--de-space-2);
   }

   .data-explorer-top__breadcrumbs-icon {
      flex-shrink: 0;
      opacity: 0.5;
   }

   .data-explorer-top__breadcrumbs-list {
      font-size: var(--de-font-secondary);
      line-height: 1.45;
      letter-spacing: 0.01em;
   }

   .data-explorer-top__breadcrumbs-item--clickable {
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 2px;
      &:hover {
         opacity: 0.85;
      }
   }

   .data-explorer-top__breadcrumbs-item--current {
      font-weight: 600;
      color: var(--va-text-primary);
   }

   /* Header — clear hierarchy; compact when at root */
   .data-explorer-top__header {
      margin-bottom: var(--de-space-3);

      &--compact {
         margin-bottom: var(--de-space-2);
      }
   }

   .data-explorer-top__title--compact {
      font-size: var(--de-font-title-compact);
      font-weight: 600;
   }

   .data-explorer-top__title-meta {
      font-weight: 400;
      color: var(--va-text-secondary);
   }

   .data-explorer-top__header-left {
      display: flex;
      align-items: center;
      gap: var(--de-space-2);
   }

   .data-explorer-top__tree-toggle {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--de-control-h-sm);
      height: var(--de-control-h-sm);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: var(--de-radius-sm);
      background: var(--de-bg-secondary);
      color: var(--va-text-secondary);
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;

      &:hover {
         background: var(--de-bg-element);
         border-color: var(--va-primary);
         color: var(--va-primary);
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      }
   }

   .data-explorer-top__title-block {
      min-width: 0;
      flex: 1;
   }

   /* Kicker — overline label, small caps */
   .data-explorer-top__kicker {
      font-size: var(--de-font-kicker);
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--va-text-secondary);
      margin: 0 0 0.125rem 0;
      line-height: 1.3;
   }

   /* Title — primary focus */
   .data-explorer-top__title {
      font-size: var(--de-font-title);
      font-weight: 600;
      letter-spacing: -0.025em;
      margin: 0;
      color: var(--va-text-primary);
      line-height: 1.25;
   }

   /* Subtitle / supporting text */
   .data-explorer-top__subtitle {
      font-size: var(--de-font-secondary);
      margin: 0.25rem 0 0 0;
      line-height: 1.45;
      color: var(--va-text-secondary);
   }

   .data-explorer-top__organism-hint {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: var(--de-font-secondary);
      margin: 0.375rem 0 0 0;
      padding: 0.4rem 0.625rem;
      background: var(--de-bg-primary);
      border-radius: var(--de-radius-sm);
      border-left: 3px solid var(--va-primary);
      line-height: 1.45;
   }

   .data-explorer-top__hint-icon {
      flex-shrink: 0;
      margin-top: 0.125rem;
      opacity: 0.75;
   }

   /* Tabs */
   .data-explorer-top__tabs {
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: thin;
   }

   .data-explorer-top__tabs-list {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      gap: 0.3125rem;
      min-width: max-content;
      padding: 0;
   }

   .data-explorer-top__tabs-compact {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--de-space-2);
      padding: 0;
   }

   .data-explorer-top__tabs-current {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: var(--de-font-meta);
      color: var(--va-text-primary);
      font-weight: 600;
      min-width: 0;
      padding: 0.375rem 0.625rem;
      border-radius: 999px;
      background: var(--de-bg-primary);
   }

   .data-explorer-top__tabs-select {
      min-width: 12rem;
      max-width: 100%;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.09));
      border-radius: 999px;
      background: var(--de-bg-primary);
      color: var(--va-text-primary);
      font-size: var(--de-font-secondary);
      padding: 0.5rem 0.75rem;
      outline: none;
      cursor: pointer;

      &:focus {
         border-color: var(--va-primary);
      }
   }

   .data-explorer-top__tab {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.875rem;
      background: var(--de-bg-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      border-radius: 999px;
      transition: box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
      text-decoration: none;
      color: var(--va-text-secondary);
      font-size: var(--de-font-meta);
      font-weight: 500;
      line-height: 1.4;
      letter-spacing: 0.015em;
      white-space: nowrap;
      user-select: none;

      &:hover:not(.data-explorer-top__tab--active) {
         background: var(--de-bg-element);
         border-color: rgba(var(--va-primary-rgb, 59, 130, 246), 0.35);
         color: var(--va-text-primary);
      }

      &:focus-visible {
         outline: 2px solid rgba(var(--va-primary-rgb, 59, 130, 246), 0.45);
         outline-offset: 2px;
      }

      &--active {
         background: rgba(var(--va-primary-rgb, 59, 130, 246), 0.16);
         border-color: rgba(var(--va-primary-rgb, 59, 130, 246), 0.55);
         color: var(--va-primary);
         font-weight: 600;
         box-shadow:
            0 0 0 1px rgba(var(--va-primary-rgb, 59, 130, 246), 0.2),
            0 2px 8px rgba(var(--va-primary-rgb, 59, 130, 246), 0.22);
      }
   }

   .data-explorer-top__tab-icon {
      flex-shrink: 0;
   }

   .data-explorer-top__tab-label {
      line-height: inherit;
   }

   .data-explorer-top__tab-count {
      font-size: 0.75rem;
      font-weight: 600;
      margin-left: 0.2rem;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      background: var(--de-bg-secondary);
      color: var(--va-text-primary);
      line-height: 1.2;

      .data-explorer-top__tab--active & {
         background: rgba(var(--va-primary-rgb, 59, 130, 246), 0.24);
         color: var(--va-primary);
      }
   }

   @media (max-width: 768px) {
      .data-explorer-top {
         padding: var(--de-space-2) var(--de-space-3) var(--de-space-2);
      }

      .data-explorer-top__title {
         font-size: 1.25rem;
      }

      .data-explorer-top__breadcrumbs {
         margin-bottom: var(--de-space-1);
      }

      .data-explorer-top__header {
         margin-bottom: var(--de-space-2);
      }

      .data-explorer-right {
         width: 100vw;
         max-width: 100vw;
         background: var(--de-bg-element);
      }
   }

   /* ─── Right overlay panel ─── */
   .data-explorer-right {
      display: flex;
      flex-direction: column;
      width: clamp(20rem, 36vw, 28rem);
      max-width: 95vw;
      height: 100%;
      background: var(--de-bg-primary, var(--va-background-primary));
      border-left: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
      box-shadow: -4px 0 32px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      z-index: 100;
   }

   .data-explorer-right__header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.625rem;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
      background: var(--va-background-element);
   }

   .data-explorer-right__header-title {
      display: inline-flex;
      align-items: center;
      gap: 0.625rem;
      min-width: 0;
   }

   .data-explorer-right__title {
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--va-text-secondary);
      margin: 0;
      line-height: 1.3;
   }

   .data-explorer-right__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      background: var(--va-background-primary);
      color: var(--va-text-secondary);
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;

      &:hover {
         background: var(--de-bg-element, var(--va-background-element));
         border-color: var(--va-primary);
         color: var(--va-primary);
      }
   }

   .data-explorer-right__body {
      flex: 1;
      overflow-y: auto;
   }

   /* ─── Transitions ─── */
   .detail-slide-enter-active,
   .detail-slide-leave-active {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
   }

   .detail-slide-enter-from,
   .detail-slide-leave-to {
      transform: translateX(100%);
      opacity: 0;
   }
</style>
