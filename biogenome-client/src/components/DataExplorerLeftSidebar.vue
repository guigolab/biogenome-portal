<template>
   <div class="left-wrap" :class="{ 'left-wrap--hidden': !visible }">
      <aside class="left">
         <div class="left__header">
            <VaIcon name="fa-sitemap" size="small" color="primary" />
            <span class="left__title">{{ t('data.taxonomyTree') || 'Taxonomy' }}</span>
         </div>
         <div class="left__body">
            <div class="tree-panel">
               <div class="search">
                  <VaIcon name="fa-magnifying-glass" size="small" class="search__icon" />
                  <input
                     v-model="searchQuery"
                     class="search__input"
                     :placeholder="t('taxon.searchPlaceholder') || 'Search taxon...'"
                     @focus="onSearchFocus"
                     @blur="onSearchBlur"
                     @keydown.down.prevent="moveSearchHighlight(1)"
                     @keydown.up.prevent="moveSearchHighlight(-1)"
                     @keydown.enter.prevent="onSearchEnter"
                  />
                  <button v-if="searchQuery.trim()" class="search__btn" @click="clearSearch">
                     <VaIcon name="close" size="12px" />
                  </button>
                  <button class="search__btn search__btn--go" :disabled="isSearching" @click="runSearch">
                     <VaIcon v-if="!isSearching" name="fa-arrow-right" size="small" />
                     <VaIcon v-else name="loop" size="small" spin="counter-clockwise" />
                  </button>
                  <div v-if="showSearchDropdown" class="search__dropdown">
                     <div v-if="isSearching" class="search__state">
                        <VaIcon name="loop" size="small" spin="counter-clockwise" />{{ t('loading') || 'Loading...' }}
                     </div>
                     <button
                        v-for="(taxon, idx) in searchResults"
                        :key="`${taxon.taxid}-${idx}`"
                        class="search__result"
                        :class="{ 'search__result--active': idx === highlightedSearchIndex }"
                        @mousedown.prevent="selectSearchResult(taxon)"
                     >
                        <span>{{ taxon.name || taxon.taxid }}</span>
                        <small>{{ taxon.rank || '-' }} · {{ taxon.taxid }}</small>
                     </button>
                     <div
                        v-if="!isSearching && !searchResults.length && searchQuery.trim().length >= MIN_SEARCH_CHARS"
                        class="search__state"
                     >
                        {{ t('taxon.noTaxons') || 'No taxons found' }}
                     </div>
                  </div>
               </div>
               <p v-if="searchError" class="error">{{ searchError }}</p>

               <div class="controls">
                  <select
                     class="rank"
                     :value="selectedRank ?? ''"
                     @change="selectedRank = ($event.target as HTMLSelectElement).value || null"
                  >
                     <option value="">{{ t('data.allRanks') || 'All ranks' }}</option>
                     <option v-for="opt in rankOptions" :key="opt.rank" :value="opt.rank">{{ opt.label }}</option>
                  </select>
                  <span v-if="selectedRank && rankRootCount > 0" class="count">{{ rankRootCount }}</span>
                  <button
                     v-if="!selectedRank"
                     class="toggle"
                     :class="{ 'toggle--active': relevantRanksOnly }"
                     @click="relevantRanksOnly = !relevantRanksOnly"
                  >
                     <VaIcon name="fa-filter" size="12px" />
                  </button>
               </div>

               <div class="tree-wrap" :aria-label="treeAriaLabel">
                  <div ref="scrollRef" class="tree-scroll">
                     <div v-if="isTreeLoading && !treeData" class="state">{{ t('loading') || 'Loading tree...' }}</div>
                     <div v-else-if="!treeIndex" class="state">{{ t('noData') || 'No tree data available' }}</div>
                     <div v-else-if="flattenedNodes.length === 0" class="state">
                        {{ t('noData') || 'No tree data available' }}
                     </div>
                     <div v-else class="tree-list">
                        <div
                           v-for="node in flattenedNodes"
                           :key="node.taxid"
                           class="row"
                           :class="{ 'row--selected': isTaxonSelected(node.taxid) }"
                           :style="{ paddingLeft: `${node.level * 10 + 2}px` }"
                           :data-taxid="node.taxid"
                        >
                           <button
                              v-if="hasCompactChildren(node.taxid)"
                              class="row__expand"
                              @click.stop="toggleExpanded(node.taxid)"
                           >
                              <VaIcon
                                 :name="expandedNodes.has(node.taxid) ? 'fa-chevron-down' : 'fa-chevron-right'"
                                 size="small"
                              />
                           </button>
                           <span v-else class="row__expand-placeholder" />
                           <button
                              class="row__dot"
                              :style="{ '--rank-color': getRankColor(node.data.rank) }"
                              @click.stop="onTreeTaxonToggle(node.data)"
                           />
                           <button class="row__label" @click.stop="onTreeTaxonToggle(node.data)">
                              {{ node.data.name || node.taxid }}
                           </button>
                           <span v-if="node.data.leaves && node.data.leaves > 0" class="row__count">{{
                              formatCount(node.data.leaves)
                           }}</span>
                        </div>
                     </div>
                  </div>
               </div>

               <div class="legend">
                  <span
                     v-for="r in rankOptions"
                     :key="r.rank"
                     class="legend__item"
                     :style="{ '--legend-color': getRankColor(r.rank) }"
                  >
                     <span class="legend__dot" />
                     <span>{{ t(`data.ranks.${r.rank}`, formatRank(r.rank)) }}</span>
                  </span>
               </div>
               <RouterLink :to="{ name: 'tree' }" class="tree-panel__visual-link">
                  <VaIcon name="fa-sitemap" size="small" />
                  {{ t('data.exploreTaxonomyVisual') || 'Explore taxonomy (visual)' }}
               </RouterLink>
            </div>
         </div>
      </aside>
   </div>
</template>

<script setup lang="ts">
   import * as d3 from 'd3'
   import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
   import { RouterLink } from 'vue-router'
   import { useI18n } from 'vue-i18n'
   import { useTaxonomyStore } from '../stores/taxonomy-store'
   import TaxonService from '../services/TaxonService'
   import StatisticsService from '../services/StatisticsService'
   import type { TaxonNode } from '../data/types'
   import { useRankPalette } from '../composable/useRankPalette'
   import {
      createTaxonomyTreeIndex,
      getTaxonAncestors,
      getTaxonChildren,
      hasTaxonChildren,
   } from '../composable/useTaxonomyTreeGraph'

   type CompactTreeNode = {
      taxid: string
      data: TaxonNode & { leaves?: number }
      children: CompactTreeNode[]
      level: number
   }
   withDefaults(defineProps<{ visible?: boolean }>(), { visible: true })
   const { t } = useI18n()
   const taxonomyStore = useTaxonomyStore()
   const MIN_SEARCH_CHARS = 2
   const SEARCH_DEBOUNCE_MS = 300
   const { rankPalette, rankColorMap } = useRankPalette()
   const searchQuery = ref('')
   const searchResults = ref<TaxonNode[]>([])
   const highlightedSearchIndex = ref(-1)
   const showSearchResults = ref(false)
   const selectedRank = ref<string | null>(null)
   const relevantRanksOnly = ref(false)
   const rankOptions = ref<{ rank: string; label: string }[]>([])
   const isSearching = ref(false)
   const searchError = ref<string | null>(null)
   const expandedNodes = ref<Set<string>>(new Set())
   const scrollRef = ref<HTMLDivElement | null>(null)
   const isSelectingSearchResult = ref(false)
   let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
   let searchRequestSeq = 0

   const isTreeLoading = computed(() => taxonomyStore.isTreeLoading)
   const treeData = computed(() => taxonomyStore.treeData)
   const treeAriaLabel = computed(() => t('data.treeAriaLabel', { count: '' }) || 'Taxonomy tree')
   const showSearchDropdown = computed(
      () => showSearchResults.value && searchQuery.value.trim().length >= MIN_SEARCH_CHARS,
   )
   const allowedRanksSet = computed<Set<string>>(() => new Set(rankPalette.value.map((r) => r.rank)))

   function formatRank(rank: string) {
      return rank ? rank.charAt(0).toUpperCase() + rank.slice(1).replace(/_/g, ' ') : ''
   }
   function formatCount(n: number) {
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
      if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
      return n.toLocaleString()
   }
   function getRankColor(rank: string | undefined) {
      return (rank && rankColorMap.value[rank]) || 'var(--va-text-secondary, #64748b)'
   }

   function buildPrunedTreeData(raw: Record<string, any>) {
      const root = d3.hierarchy(raw, (d: any) => d.children)
      const allowed = allowedRanksSet.value
      const top: d3.HierarchyNode<Record<string, any>>[] = []
      const parentMap = new Map<string, d3.HierarchyNode<Record<string, any>>[]>()
      function dfs(n: d3.HierarchyNode<Record<string, any>>, stack: d3.HierarchyNode<Record<string, any>>[]) {
         if (allowed.has(n.data?.rank as string)) {
            const p = stack.length ? stack[stack.length - 1] : null
            if (p) parentMap.set(p.data.taxid as string, [...(parentMap.get(p.data.taxid as string) || []), n])
            else top.push(n)
            stack.push(n)
         }
         for (const c of n.children || []) dfs(c, stack)
         if (allowed.has(n.data?.rank as string)) stack.pop()
      }
      for (const c of root.children || []) dfs(c, [])
      function toData(n: d3.HierarchyNode<Record<string, any>>): Record<string, any> {
         const kids = (parentMap.get(n.data.taxid as string) || []).map(toData)
         return { ...n.data, children: kids.length ? kids : undefined }
      }
      return { ...root.data, children: top.map(toData) }
   }

   const sortedRankNodes = computed(() => {
      const rank = selectedRank.value
      if (!rank || !treeData.value || typeof treeData.value !== 'object') return []
      const root = d3.hierarchy(treeData.value as Record<string, any>, (d: any) => d.children)
      const out: d3.HierarchyNode<Record<string, any>>[] = []
      root.each((n) => {
         if (n.data?.rank === rank) out.push(n)
      })
      return out.sort((a, b) => (b.data.leaves ?? 0) - (a.data.leaves ?? 0))
   })
   const rankRootCount = computed(() => sortedRankNodes.value.length)
   const treeDataForDisplay = computed(() => {
      if (!treeData.value || typeof treeData.value !== 'object') return null
      if (selectedRank.value) return treeData.value as Record<string, any>
      if (relevantRanksOnly.value) return buildPrunedTreeData(treeData.value as Record<string, any>)
      return treeData.value as Record<string, any>
   })
   const rankRootsForTree = computed(() =>
      selectedRank.value ? sortedRankNodes.value.map((n) => ({ ...n.data, taxid: n.data.taxid as string })) : undefined,
   )
   const rootTaxidForTree = computed(() => taxonomyStore.rootNode?.taxid ?? '2759')
   const treeIndex = computed(() => createTaxonomyTreeIndex(treeDataForDisplay.value))

   function setExpandedTaxids(taxids: string[]) {
      expandedNodes.value = new Set([...expandedNodes.value, ...taxids.filter(Boolean)])
   }
   function buildCompactTree(taxid: string, data: TaxonNode & { leaves?: number }, level: number): CompactTreeNode {
      const children = getTaxonChildren(treeIndex.value, taxid) as (TaxonNode & { leaves?: number })[]
      const node: CompactTreeNode = { taxid, data: { ...data, name: data.name ?? taxid, taxid }, children: [], level }
      if (expandedNodes.value.has(taxid) && children.length)
         node.children = children
            .sort((a, b) => (b.leaves ?? 0) - (a.leaves ?? 0))
            .map((c) => buildCompactTree(c.taxid, c, level + 1))
      return node
   }
   const compactTrees = computed(() => {
      if (!treeIndex.value) return []
      if (rankRootsForTree.value?.length)
         return rankRootsForTree.value.map((r) => buildCompactTree(r.taxid, r as any, 0))
      const rootNode = treeIndex.value.byTaxid.get(rootTaxidForTree.value) as any
      return rootNode ? [buildCompactTree(rootTaxidForTree.value, rootNode, 0)] : []
   })
   const flattenedNodes = computed(() => {
      const out: CompactTreeNode[] = []
      const stack = [...compactTrees.value].reverse()
      while (stack.length) {
         const n = stack.pop()!
         out.push(n)
         for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i])
      }
      return out
   })
   function hasCompactChildren(taxid: string) {
      return hasTaxonChildren(treeIndex.value, taxid)
   }
   function toggleExpanded(taxid: string) {
      const next = new Set(expandedNodes.value)
      next.has(taxid) ? next.delete(taxid) : next.add(taxid)
      expandedNodes.value = next
   }
   function isTaxonSelected(taxid: string) {
      return taxonomyStore.currentTaxon?.taxid === taxid
   }
   function onTreeTaxonToggle(taxon: TaxonNode) {
      taxonomyStore.setCurrentTaxon(taxon)
      taxonomyStore.showSidebar = true
   }
   function scrollToTaxon(taxid: string) {
      const row = scrollRef.value?.querySelector(`[data-taxid="${taxid}"]`) as HTMLElement | null
      if (row) row.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
   }
   async function revealTaxon(taxid: string) {
      const chain = getTaxonAncestors(treeIndex.value, taxid)
      setExpandedTaxids(chain)
      await nextTick()
      scrollToTaxon(taxid)
   }

   async function fetchRanks() {
      const { data } = await StatisticsService.getModelFieldStats('taxons', 'rank', {})
      const counts = (data || {}) as Record<string, number>
      const keys = Object.keys(counts)
      rankOptions.value = rankPalette.value.filter((r) => keys.includes(r.rank)).map((r) => ({
         rank: r.rank,
         label: `${formatRank(r.rank)} (${(counts[r.rank] ?? 0).toLocaleString()})`,
      }))
   }
   async function fetchSearchResults(query: string): Promise<TaxonNode[]> {
      const requestId = ++searchRequestSeq
      isSearching.value = true
      try {
         const { data } = await TaxonService.getTaxons({ filter: query })
         const list = (data?.data || data || []) as TaxonNode[]
         if (requestId === searchRequestSeq) {
            searchResults.value = list
            highlightedSearchIndex.value = list.length ? 0 : -1
         }
         return list
      } finally {
         if (requestId === searchRequestSeq) isSearching.value = false
      }
   }
   function queueSearch(query: string) {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
      searchDebounceTimer = setTimeout(async () => {
         if (query.trim().length < MIN_SEARCH_CHARS) {
            searchResults.value = []
            highlightedSearchIndex.value = -1
            return
         }
         await fetchSearchResults(query.trim())
      }, SEARCH_DEBOUNCE_MS)
   }
   async function selectSearchResult(taxon: TaxonNode) {
      isSelectingSearchResult.value = true
      showSearchResults.value = false
      selectedRank.value = null
      relevantRanksOnly.value = false
      searchQuery.value = taxon.name || taxon.taxid
      await taxonomyStore.setCurrentTaxon({ name: taxon.name ?? '', rank: taxon.rank ?? '', taxid: taxon.taxid })
      await revealTaxon(taxon.taxid)
      isSelectingSearchResult.value = false
   }
   async function runSearch() {
      const q = searchQuery.value.trim()
      if (q.length < MIN_SEARCH_CHARS) return
      const chosen =
         highlightedSearchIndex.value >= 0 ? searchResults.value[highlightedSearchIndex.value] : searchResults.value[0]
      if (chosen) await selectSearchResult(chosen)
   }
   function onSearchFocus() {
      if (searchQuery.value.trim().length >= MIN_SEARCH_CHARS) showSearchResults.value = true
   }
   function onSearchBlur() {
      setTimeout(() => (showSearchResults.value = false), 120)
   }
   function moveSearchHighlight(direction: 1 | -1) {
      if (!showSearchDropdown.value || !searchResults.value.length) return
      const len = searchResults.value.length
      const base = highlightedSearchIndex.value < 0 ? 0 : highlightedSearchIndex.value
      highlightedSearchIndex.value = (base + direction + len) % len
   }
   async function onSearchEnter() {
      await runSearch()
   }
   function clearSearch() {
      searchQuery.value = ''
      searchError.value = null
      searchResults.value = []
      highlightedSearchIndex.value = -1
      showSearchResults.value = false
   }

   onMounted(async () => {
      await taxonomyStore.getTree()
      await fetchRanks()
   })
   onBeforeUnmount(() => {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
   })

   watch(
      () => taxonomyStore.currentTaxon?.taxid,
      (taxid) => {
         if (taxid) revealTaxon(taxid)
      },
   )
   watch(
      () => [rootTaxidForTree.value, rankRootsForTree.value?.[0]?.taxid] as const,
      ([rootTaxid, rankRootTaxid]) => {
         const first = rankRootTaxid || rootTaxid
         if (first) expandedNodes.value = new Set([first])
      },
      { immediate: true },
   )
   watch(selectedRank, (rank) => {
      if (!rank) expandedNodes.value = new Set([rootTaxidForTree.value])
      else expandedNodes.value = new Set(rankRootsForTree.value?.[0]?.taxid ? [rankRootsForTree.value[0].taxid] : [])
   })
   watch(relevantRanksOnly, () => {
      expandedNodes.value = new Set([rootTaxidForTree.value])
   })
   watch(searchQuery, () => {
      searchError.value = null
      if (isSelectingSearchResult.value) return
      showSearchResults.value = true
      queueSearch(searchQuery.value)
   })
</script>

<style lang="scss" scoped>
   .left-wrap {
      height: 100%;
      width: 320px;
      min-width: 320px;
      max-width: 320px;
      transition: width 0.25s, min-width 0.25s, max-width 0.25s;
   }
   .left-wrap--hidden {
      width: 0;
      min-width: 0;
      max-width: 0;
      overflow: hidden;
   }
   .left {
      height: 100%;
      width: 320px;
      min-width: 320px;
      max-width: 320px;
      background: var(--va-background-element);
      border-right: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      --de-font-body: 0.9375rem;
      --de-font-secondary: 0.875rem;
      --de-font-meta: 0.8125rem;
      --de-font-kicker: 0.75rem;
   }
   .left__header {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
   }
   .left__title {
      font-size: var(--de-font-meta);
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--va-text-secondary);
      line-height: 1.3;
   }
   .left__body {
      flex: 1;
      min-height: 0;
      padding: 0.625rem 1rem;
   }
   .tree-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      gap: 0.625rem;
   }
   .search {
      position: relative;
      display: flex;
      align-items: center;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 10px;
      overflow: visible;
      background: var(--va-background-primary);
   }
   .search__icon {
      padding-left: 0.625rem;
      opacity: 0.4;
      color: var(--va-text-secondary);
   }
   .search__input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      padding: 0.5rem 0.625rem;
      font-size: var(--de-font-secondary);
      line-height: 1.45;
   }
   .search__btn {
      border: none;
      background: transparent;
      color: var(--va-text-secondary);
      width: 2rem;
      min-height: 2rem;
      cursor: pointer;
   }
   .search__btn--go {
      width: 2.25rem;
      border-left: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
   }
   .search__dropdown {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + 4px);
      z-index: 20;
      max-height: 260px;
      overflow: auto;
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
   }
   .search__state {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.6rem 0.75rem;
      font-size: var(--de-font-meta);
      line-height: 1.4;
      color: var(--va-text-secondary);
   }
   .search__result {
      width: 100%;
      border: none;
      border-bottom: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
      background: transparent;
      padding: 0.625rem 0.8125rem;
      text-align: left;
      display: flex;
      flex-direction: column;
      cursor: pointer;
   }
   .search__result small {
      color: var(--va-text-secondary);
      font-size: var(--de-font-kicker);
      line-height: 1.3;
   }
   .search__result--active,
   .search__result:hover {
      background: var(--va-background-element);
   }
   .error {
      margin: 0;
      font-size: var(--de-font-meta);
      line-height: 1.4;
      color: var(--va-danger);
   }
   .controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
   }
   .rank {
      flex: 1;
      min-width: 0;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 10px;
      background: var(--va-background-primary);
      padding: 0.5rem 0.625rem;
      font-size: var(--de-font-secondary);
      line-height: 1.45;
   }
   .count {
      font-size: var(--de-font-kicker);
      font-weight: 700;
      padding: 0.2rem 0.45rem;
      border-radius: 20px;
      background: var(--va-primary);
      color: #fff;
   }
   .toggle {
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      background: var(--va-background-primary);
      color: var(--va-text-secondary);
      cursor: pointer;
   }
   .toggle--active {
      background: var(--va-primary);
      border-color: var(--va-primary);
      color: #fff;
   }
   .tree-wrap {
      flex: 1;
      min-height: 0;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 10px;
      background: var(--va-background-primary);
      overflow: hidden;
   }
   .tree-scroll {
      height: 100%;
      width: 100%;
      overflow-y: auto;
      overflow-x: auto;
   }
   .tree-list {
      width: max-content;
      min-width: 100%;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
   }
   .state {
      padding: 16px;
      color: var(--va-text-secondary);
      font-size: var(--de-font-secondary);
      line-height: 1.45;
      text-align: center;
   }
   .row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 28px;
      min-width: 100%;
      width: max-content;
      padding: 4px 6px;
      border-radius: 8px;
      font-size: var(--de-font-meta);
      line-height: 1.4;
   }
   .row:hover {
      background: var(--va-background-element, rgba(0, 0, 0, 0.04));
   }
   .row--selected {
      background: color-mix(in srgb, var(--va-primary) 12%, transparent);
      color: var(--va-primary);
   }
   .row__expand {
      width: 16px;
      height: 16px;
      border: none;
      background: transparent;
      color: var(--va-text-secondary);
      cursor: pointer;
      padding: 0;
   }
   .row__expand-placeholder {
      width: 16px;
   }
   .row__dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.12);
      background: var(--rank-color);
      border: none;
      padding: 0;
      cursor: pointer;
   }
   .row__label {
      border: none;
      background: transparent;
      padding: 0;
      text-align: left;
      white-space: nowrap;
      cursor: pointer;
      color: var(--va-text-primary);
   }
   .row__count {
      margin-left: 4px;
      font-size: var(--de-font-kicker);
      font-family: ui-monospace, monospace;
      color: var(--va-text-secondary);
      line-height: 1.3;
   }
   .legend {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem 0.875rem;
      padding-top: 0.625rem;
      border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
   }
   .legend__item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: var(--de-font-kicker);
      line-height: 1.3;
      color: var(--va-text-secondary);
   }
   .legend__dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.12);
      background: var(--legend-color);
   }
   .tree-panel__visual-link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0;
      margin-top: 0.25rem;
      font-size: var(--de-font-meta);
      color: var(--va-primary);
      text-decoration: none;
      border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
      transition: opacity 0.2s ease;
   }
   .tree-panel__visual-link:hover {
      opacity: 0.85;
   }
</style>
