<template>
   <div class="data-explorer-table" role="region" aria-label="Data table">
      <VaInnerLoading :loading="itemStore.isTableLoading" class="data-explorer-table__loading">
         <div
            v-if="!itemStore.isTableLoading && displayItems.length === 0"
            class="data-explorer-table__empty"
            role="status"
            aria-live="polite"
         >
            <VaCard class="data-explorer-table__empty-card">
               <div class="data-explorer-table__empty-content">
                  <div class="data-explorer-table__empty-icon-wrap">
                     <VaIcon name="fa-table-cells" size="large" class="data-explorer-table__empty-icon" aria-hidden="true" />
                  </div>
                  <h3 class="data-explorer-table__empty-title">{{ t('items.data.noResultsTitle') || 'No results' }}</h3>
                  <p class="data-explorer-table__empty-message va-text-secondary">
                     {{ t('items.data.noResultsMessage') || 'No records match your query. Try adjusting filters or search.' }}
                  </p>
               </div>
            </VaCard>
         </div>
         <div v-else ref="scrollContainer" class="data-explorer-table__scroll" @scroll.passive="onTableScroll">
            <table class="data-explorer-table__table" :aria-label="t('items.data.results') || 'Results'">
               <thead class="data-explorer-table__thead">
                  <tr class="data-explorer-table__tr">
                     <th
                        v-for="col in tableColumns"
                        :key="col.key"
                        class="data-explorer-table__th"
                        :class="{ 'data-explorer-table__th--sortable': col.sortable }"
                        @click="col.sortable && toggleSort(col.key)"
                     >
                        <span class="data-explorer-table__th-label">{{ col.label }}</span>
                        <span v-if="col.sortable && sortColumn === col.key" class="data-explorer-table__th-sort">
                           <VaIcon
                              :name="sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down'"
                              size="10px"
                              class="data-explorer-table__th-sort-icon"
                           />
                        </span>
                     </th>
                  </tr>
               </thead>
               <tbody class="data-explorer-table__tbody">
                  <tr
                     v-for="item in displayItems"
                     :key="rowKey(item)"
                     class="data-explorer-table__tr data-explorer-table__tr--body"
                     @click="handleRowClick(item)"
                  >
                     <td
                        v-for="col in tableColumns"
                        :key="col.key"
                        class="data-explorer-table__td"
                        :class="cellClass(col.key)"
                     >
                        <!-- Image -->
                        <template v-if="col.key === 'image'">
                           <div v-if="item.image" class="data-explorer-table__img-wrap">
                              <img :src="item.image" alt="" class="data-explorer-table__img" />
                           </div>
                           <div v-else class="data-explorer-table__img-placeholder"></div>
                        </template>
                        <!-- Scientific name (italic) -->
                        <template v-else-if="col.key === 'scientific_name'">
                           <span class="data-explorer-table__scientific-name">{{
                              getCellValue(item, col.key) || '—'
                           }}</span>
                        </template>
                        <!-- Status chips -->
                        <template v-else-if="statusChipColumns.includes(col.key)">
                           <span
                              v-if="getCellValue(item, col.key)"
                              class="data-explorer-table__chip"
                              :class="`data-explorer-table__chip--${statusColorClass(
                                 getCellValue(item, col.key) ?? '',
                                 col.key,
                              )}`"
                           >
                              {{ getCellValue(item, col.key) }}
                           </span>
                           <span
                              v-else-if="col.key === 'insdc_status'"
                              class="data-explorer-table__chip data-explorer-table__chip--neutral"
                           >
                              {{ t('items.data.noDataSubmitted') || 'No data submitted' }}
                           </span>
                           <span v-else class="data-explorer-table__empty">—</span>
                        </template>
                        <!-- Assembly level badge -->
                        <template v-else-if="col.key === 'metadata.assembly_info.assembly_level'">
                           <span v-if="getCellValue(item, col.key)" class="data-explorer-table__badge">
                              {{ getCellValue(item, col.key) }}
                           </span>
                           <span v-else class="data-explorer-table__empty">—</span>
                        </template>
                        <!-- Download links -->
                        <template v-else-if="col.key === 'gff_gz_location' || col.key === 'tab_index_location'">
                           <a
                              v-if="getCellValue(item, col.key)"
                              :href="getCellValue(item, col.key) ?? '#'"
                              class="data-explorer-table__link"
                              target="_blank"
                              rel="noopener"
                              @click.stop
                           >
                              <VaIcon name="fa-file-arrow-down" size="11px" />
                              {{ t('buttons.download') }}
                           </a>
                           <span v-else class="data-explorer-table__empty">—</span>
                        </template>
                        <!-- Actions column -->
                        <template v-else-if="col.key === '__actions'">
                           <div class="data-explorer-table__actions" @click.stop>
                              <template v-if="model === 'biosamples'">
                                 <a
                                    :href="enaUrl('biosample', item)"
                                    target="_blank"
                                    rel="noopener"
                                    class="data-explorer-table__action-link"
                                 >
                                    <VaIcon name="fa-arrow-up-right-from-square" size="11px" />
                                    ENA
                                 </a>
                              </template>
                              <template v-else-if="model === 'assemblies'">
                                 <a
                                    :href="enaUrl('assembly', item)"
                                    target="_blank"
                                    rel="noopener"
                                    class="data-explorer-table__action-link"
                                 >
                                    <VaIcon name="fa-arrow-up-right-from-square" size="11px" />
                                    ENA
                                 </a>
                                 <a
                                    :href="ncbiAssemblyUrl(item)"
                                    target="_blank"
                                    rel="noopener"
                                    class="data-explorer-table__action-link"
                                 >
                                    NCBI
                                 </a>
                                 <RouterLink
                                    v-if="showGenomeBrowserAssembly(item)"
                                    :to="{ name: 'jbrowse', query: { assembly: item.accession } }"
                                    class="data-explorer-table__action-link data-explorer-table__action-link--accent"
                                 >
                                    <VaIcon name="fa-dna" size="11px" />
                                    {{ t('item.genomeBrowserLink') }}
                                 </RouterLink>
                              </template>
                              <template v-else-if="model === 'annotations'">
                                 <RouterLink
                                    v-if="item.assembly_accession"
                                    :to="{
                                       name: 'jbrowse',
                                       query: {
                                          assembly: item.assembly_accession,
                                          annotation: item.name,
                                       },
                                    }"
                                    class="data-explorer-table__action-link data-explorer-table__action-link--accent"
                                 >
                                    <VaIcon name="fa-dna" size="11px" />
                                    {{ t('item.genomeBrowserLink') }}
                                 </RouterLink>
                              </template>
                              <template v-else-if="model === 'reads'">
                                 <a
                                    :href="enaUrl('read_run', item)"
                                    target="_blank"
                                    rel="noopener"
                                    class="data-explorer-table__action-link"
                                 >
                                    <VaIcon name="fa-arrow-up-right-from-square" size="11px" />
                                    ENA
                                 </a>
                              </template>
                              <template v-else>
                                 <span class="data-explorer-table__empty">—</span>
                              </template>
                           </div>
                        </template>
                        <!-- Default cell -->
                        <template v-else>
                           <span class="data-explorer-table__cell-text">{{ formatCellValue(item, col.key) }}</span>
                        </template>
                     </td>
                  </tr>
               </tbody>
            </table>
            <div v-if="itemStore.isLoadMoreLoading" class="data-explorer-table__load-more">
               <VaIcon name="loop" size="small" spin="counter-clockwise" />
               <span class="va-text-secondary">{{ t('loading') }}</span>
            </div>
         </div>
      </VaInnerLoading>
   </div>
</template>

<script setup lang="ts">
   import { computed, nextTick, ref, watch } from 'vue'
   import { useBreakpoint } from 'vuestic-ui'
   import { RouterLink } from 'vue-router'
   import { useI18n } from 'vue-i18n'
   import { useItemStore } from '../stores/items-store'
   import { routeMap } from '../composable/useRouteMap'
   import { insdcSteps, goatSteps } from '../composable/itemConfigs'
   import type { DataModels } from '../data/types'

   const { t } = useI18n()
   const breakpoints = useBreakpoint()
   const itemStore = useItemStore()

   const props = defineProps<{
      model: DataModels
      columns: string[]
   }>()

   const sortColumn = ref<string | null>(itemStore.searchForm?.sort_column ?? null)
   const sortOrder = ref<'asc' | 'desc'>((itemStore.searchForm?.sort_order as 'asc' | 'desc') || 'asc')
   const isLoadingMore = ref(false)
   const scrollContainer = ref<HTMLElement | null>(null)

   watch(
      () => [itemStore.searchForm?.sort_column, itemStore.searchForm?.sort_order] as const,
      ([col, order]) => {
         sortColumn.value = col ?? null
         sortOrder.value = (order as 'asc' | 'desc') || 'asc'
      },
      { immediate: true },
   )

   const items = computed(() => itemStore.items)

   const hasMore = computed(() => itemStore.items.length < itemStore.total && itemStore.total > 0)

   function getNested(obj: Record<string, any>, path: string): any {
      return path.split('.').reduce((o: any, k) => o?.[k], obj)
   }

   function columnLabel(key: string): string {
      if (key === '__actions') return t('buttons.actions') || 'Actions'
      const parts = key.split('.')
      return parts.length > 1 ? parts[parts.length - 1].replace(/_/g, ' ') : key.replace(/_/g, ' ')
   }

   function isEssentialColumn(key: string): boolean {
      return [
         'image',
         'scientific_name',
         'assembly_name',
         'accession',
         'run_accession',
         'experiment_accession',
         'local_id',
         'taxid',
         'metadata.assembly_info.assembly_level',
         '__actions',
      ].includes(key)
   }

   const tableColumns = computed(() => {
      const cols = props.columns.map((key) => ({
         key,
         label: columnLabel(key),
         sortable: key !== '__actions' && key !== 'image' && key !== 'gff_gz_location' && key !== 'tab_index_location',
      }))
      const hasActions =
         props.model === 'assemblies' ||
         props.model === 'biosamples' ||
         props.model === 'reads' ||
         props.model === 'annotations'
      if (hasActions) {
         cols.push({ key: '__actions', label: columnLabel('__actions'), sortable: false })
      }

      if (breakpoints.smDown) {
         const compactCols = cols.filter((col) => isEssentialColumn(col.key))
         return compactCols.length ? compactCols : cols.slice(0, 4)
      }

      if (breakpoints.mdDown) {
         return cols.filter((col) => !['gff_gz_location', 'tab_index_location'].includes(col.key))
      }

      return cols
   })

   const displayItems = computed(() => {
      return items.value.map((item) => {
         const flat = { ...item }
         for (const col of props.columns) {
            if (!(col in flat) && col.includes('.')) {
               flat[col] = getNested(item, col)
            }
         }
         return flat
      })
   })

   const statusChipColumns = ['insdc_status', 'goat_status', 'target_list_status']

   function cellClass(key: string): string {
      if (key === 'image') return 'data-explorer-table__td--img'
      if (key === '__actions') return 'data-explorer-table__td--actions'
      return ''
   }

   function getCellValue(item: Record<string, any>, col: string): string | null {
      const v = col.includes('.') ? getNested(item, col) : item[col]
      return v != null && v !== '' ? String(v) : null
   }

   function formatCellValue(item: Record<string, any>, col: string): string {
      const v = getCellValue(item, col)
      return v ?? '—'
   }

   function statusColorClass(value: string, columnKey?: string): string {
      if (columnKey === 'goat_status') {
         const step = goatSteps.find((s) => s.value === value)
         return step?.color ?? 'neutral'
      }
      if (columnKey === 'insdc_status') {
         const step = insdcSteps.find((s) => s.value === value)
         return step?.color ?? 'neutral'
      }
      const v = value.toLowerCase().replace(/_/g, ' ')
      if (
         v.includes('submitted') ||
         v.includes('complete') ||
         v.includes('done') ||
         v.includes('chromosome') ||
         v.includes('sequenced')
      )
         return 'success'
      if (v.includes('progress') || v.includes('pending') || v.includes('registered') || v.includes('target'))
         return 'warning'
      if (v.includes('fail') || v.includes('error') || v.includes('rejected')) return 'danger'
      return 'neutral'
   }

   function rowKey(item: Record<string, any>): string {
      const idKeys: Record<DataModels, string> = {
         organisms: 'taxid',
         biosamples: 'accession',
         assemblies: 'accession',
         local_samples: 'local_id',
         annotations: 'name',
         reads: 'run_accession',
         submitted_biosamples: 'accession',
      }
      const k = idKeys[props.model] ?? 'id'
      return String(getNested(item, k) ?? item.id ?? Math.random())
   }

   async function toggleSort(key: string) {
      if (sortColumn.value === key) {
         sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
      } else {
         sortColumn.value = key
         sortOrder.value = 'asc'
      }
      itemStore.setSearchFormField('sort_column', sortColumn.value)
      itemStore.setSearchFormField('sort_order', sortOrder.value)
      itemStore.resetPagination()
      await itemStore.fetchItems(props.model)
   }

   async function onLoadMore() {
      if (isLoadingMore.value || !hasMore.value) return
      isLoadingMore.value = true
      try {
         await itemStore.fetchMoreItems(props.model)
      } finally {
         isLoadingMore.value = false
      }
   }

   function onTableScroll() {
      const el = scrollContainer.value
      if (!el || isLoadingMore.value || itemStore.isLoadMoreLoading || !hasMore.value) return
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
      if (remaining < 180) {
         void onLoadMore()
      }
   }

   watch(
      () => [itemStore.items.length, hasMore.value, itemStore.isTableLoading] as const,
      async () => {
         await nextTick()
         const el = scrollContainer.value
         if (!el || itemStore.isTableLoading || isLoadingMore.value || itemStore.isLoadMoreLoading || !hasMore.value) {
            return
         }
         if (el.scrollHeight <= el.clientHeight + 8) {
            void onLoadMore()
         }
      },
      { immediate: true },
   )

   function enaUrl(type: 'assembly' | 'biosample' | 'read_run', item: Record<string, any>): string {
      const base = 'https://www.ebi.ac.uk/ena/browser/view/'
      if (type === 'assembly' || type === 'biosample') return base + (item.accession ?? '')
      return base + (item.run_accession ?? item.experiment_accession ?? '')
   }

   function ncbiAssemblyUrl(item: Record<string, any>): string {
      return `https://www.ncbi.nlm.nih.gov/assembly/${item.accession ?? ''}`
   }

   function showGenomeBrowserAssembly(item: Record<string, any>): boolean {
      const level = getNested(item, 'metadata.assembly_info.assembly_level')
      if (!level) return false
      const s = String(level).toLowerCase()
      return s === 'complete genome' || s === 'chromosome'
   }

   function handleRowClick(item: Record<string, any>) {
      const map = routeMap(item)
      const route = map[props.model as keyof typeof map]
      if (!route) return
      itemStore.item = { ...item }
      itemStore.selectItem(route.params.id as string)
   }
</script>

<style lang="scss" scoped>
   .data-explorer-table {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      --table-font-body: 0.9375rem;
      --table-font-secondary: 0.875rem;
      --table-font-meta: 0.8125rem;
      --table-font-kicker: 0.75rem;
   }

   .data-explorer-table__loading {
      min-height: 200px;
      width: 100%;
      min-width: 0;
   }

   /* Table container — fixed to parent width so wide tables scroll inside, don't overflow layout */
   .data-explorer-table__scroll {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: auto;
      max-height: min(60vh, 40rem);
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      border-radius: 12px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      background: var(--va-background-primary);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
   }

   .data-explorer-table__table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--table-font-body);
      line-height: 1.5;
   }

   .data-explorer-table__thead {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--va-background-primary);
      border-bottom: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      box-shadow: 0 1px 0 0 var(--va-background-border, rgba(0, 0, 0, 0.04));
   }

   .data-explorer-table__tr {
      transition: background 0.15s ease;
   }

   .data-explorer-table__th {
      padding: 0.625rem 1rem;
      text-align: left;
      font-weight: 600;
      font-size: var(--table-font-kicker);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--va-text-secondary);
      white-space: nowrap;
      line-height: 1.3;
      border-bottom: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));

      &--sortable {
         cursor: pointer;
         user-select: none;

         &:hover {
            background: var(--va-background-secondary);
            color: var(--va-primary);
         }
      }
   }

   .data-explorer-table__th-label {
      margin-right: 0.25rem;
   }

   .data-explorer-table__th-sort {
      display: inline-flex;
      align-items: center;
      opacity: 0.8;
   }

   .data-explorer-table__th-sort-icon {
      flex-shrink: 0;
   }

   .data-explorer-table__tbody .data-explorer-table__tr--body {
      cursor: pointer;
      background: var(--va-background-primary);
      min-height: 2.5rem;

      &:hover {
         background: var(--va-background-element);
      }

      &:not(:last-child) {
         border-bottom: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.04));
      }
   }

   .data-explorer-table__td {
      padding: 0.625rem 1rem;
      color: var(--va-text-primary);
      vertical-align: middle;
      font-size: var(--table-font-secondary);
      line-height: 1.45;

      &--img {
         width: 4rem;
         padding: 0.5rem 0.875rem;
      }

      &--actions {
         white-space: nowrap;
      }
   }

   .data-explorer-table__img-placeholder {
      width: 3.25rem;
      height: 3.25rem;
      min-height: 3.25rem;
      flex-shrink: 0;
   }

   .data-explorer-table__img-wrap {
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--va-background-element);

      .data-explorer-table__img {
         width: 100%;
         height: 100%;
         object-fit: cover;
      }
   }

   .data-explorer-table__scientific-name {
      font-style: italic;
   }

   .data-explorer-table__empty {
      color: var(--va-text-secondary);
      opacity: 0.7;
   }

   .data-explorer-table__chip {
      display: inline-flex;
      align-items: center;
      font-size: var(--table-font-kicker);
      font-weight: 500;
      padding: 0.25rem 0.625rem;
      border-radius: 20px;
      text-transform: capitalize;

      @mixin chip-status($color-var) {
         background: color-mix(in srgb, var($color-var) 12%, transparent);
         color: var($color-var);
         border: 1px solid color-mix(in srgb, var($color-var) 25%, transparent);
      }

      &--success {
         @include chip-status(--va-success);
      }
      &--warning {
         @include chip-status(--va-warning);
      }
      &--danger {
         @include chip-status(--va-danger);
      }
      &--status0 {
         @include chip-status(--va-status0);
      }
      &--status1 {
         @include chip-status(--va-status1);
      }
      &--status2 {
         @include chip-status(--va-status2);
      }
      &--status3 {
         @include chip-status(--va-status3);
      }
      &--status4 {
         @include chip-status(--va-status4);
      }
      &--status5 {
         @include chip-status(--va-status5);
      }
      &--status6 {
         @include chip-status(--va-status6);
      }
      &--neutral {
         background: var(--va-background-element);
         color: var(--va-text-secondary);
         border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.07));
      }
   }

   .data-explorer-table__badge {
      display: inline-block;
      font-size: var(--table-font-kicker);
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 0.25rem 0.625rem;
      border-radius: 8px;
      background: var(--va-background-element);
      color: var(--va-text-secondary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.07));
   }

   .data-explorer-table__link,
   .data-explorer-table__action-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: var(--table-font-meta);
      font-weight: 500;
      padding: 0.3rem 0.625rem;
      border-radius: 6px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      background: var(--va-background-element);
      color: var(--va-text-secondary);
      text-decoration: none;
      transition: background 0.15s ease, color 0.15s ease;
      margin-right: 0.25rem;
      margin-bottom: 0.15rem;

      &:hover {
         background: var(--va-background-secondary);
         color: var(--va-text-primary);
         border-color: rgba(0, 0, 0, 0.14);
      }

      &--accent {
         background: rgba(var(--va-primary-rgb, 59, 130, 246), 0.08);
         color: var(--va-primary);
         border-color: rgba(var(--va-primary-rgb, 59, 130, 246), 0.2);

         &:hover {
            background: rgba(var(--va-primary-rgb, 59, 130, 246), 0.14);
            color: var(--va-primary);
         }
      }
   }

   .data-explorer-table__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      align-items: center;
   }

   .data-explorer-table__cell-text {
      word-break: break-word;
      max-width: 18rem;
      display: inline-block;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: middle;
      line-height: 1.45;
   }

   .data-explorer-table__load-more {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem;
      font-size: var(--table-font-secondary);
      color: var(--va-text-secondary);
   }

   /* Empty state — no records match the query */
   .data-explorer-table__empty {
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      background: var(--va-background-primary);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
   }

   .data-explorer-table__empty-card {
      max-width: 28rem;
      width: 100%;
      border-radius: 12px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
   }

   .data-explorer-table__empty-content {
      text-align: center;
      padding: 2rem 1.5rem;
   }

   .data-explorer-table__empty-icon-wrap {
      margin-bottom: 1rem;
   }

   .data-explorer-table__empty-icon {
      color: var(--va-primary);
      opacity: 0.85;
   }

   .data-explorer-table__empty-title {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--va-text-primary);
   }

   .data-explorer-table__empty-message {
      margin: 0.5rem 0 0;
      font-size: 0.9375rem;
      line-height: 1.5;
   }

   @media (max-width: 1024px) {
      .data-explorer-table__scroll {
         max-height: min(62vh, 36rem);
      }
   }

   @media (max-width: 768px) {
      .data-explorer-table__th,
      .data-explorer-table__td {
         padding: 0.625rem 0.75rem;
      }

      .data-explorer-table__th {
         font-size: 0.6875rem;
      }

      .data-explorer-table__cell-text {
         max-width: 12rem;
      }
   }
</style>
