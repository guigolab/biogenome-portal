<template>
   <div class="data-filters">
      <div class="data-filters__panel">
         <div class="data-filters__row">
            <div class="data-filters__filters-group">
               <button
                  class="data-filters__advanced-toggle"
                  :aria-expanded="showFiltersPanel"
                  @click="showFiltersPanel = !showFiltersPanel"
               >
                  <VaIcon :name="showFiltersPanel ? 'fa-chevron-up' : 'fa-chevron-down'" size="12px" />
                  {{ t('items.filters.title') || 'Filters' }}
                  <span v-if="activeFilterCount > 0" class="data-filters__advanced-count">
                     {{ activeFilterCount }}
                  </span>
               </button>
               <div class="data-filters__field data-filters__field--search">
                  <div class="data-filters__search-wrap" :class="{ 'data-filters__search-wrap--active': searchText }">
                     <VaIcon name="fa-magnifying-glass" size="12px" class="data-filters__search-icon" />
                     <input
                        :value="searchText"
                        type="text"
                        class="data-filters__search-input"
                        :placeholder="searchPlaceholder"
                        @input="onSearchInput"
                     />
                     <button
                        v-if="searchText"
                        class="data-filters__search-clear"
                        :aria-label="t('buttons.clear')"
                        @click="clearGlobalSearch"
                     >
                        <VaIcon name="fa-times" size="10px" />
                     </button>
                  </div>
               </div>
            </div>

            <div class="data-filters__meta">
               <span
                  class="data-filters__results"
                  :aria-label="`${itemStore.total.toLocaleString()} ${t('items.data.results')}`"
               >
                  <span class="data-filters__results-count">{{ itemStore.total.toLocaleString() }}</span>
                  <span class="data-filters__results-label va-text-secondary">{{ t('items.data.results') }}</span>
               </span>
               <span v-if="activeFilterCount > 0" class="data-filters__active-pill">
                  {{ activeFilterCount }} {{ t('items.filters.modalTitle') || 'active' }}
               </span>
               <div class="data-filters__actions-group" role="group" aria-label="View and export actions">
                  <div class="data-filters__view-toggle" role="group" :aria-label="'View mode'">
                     <button
                        v-for="opt in viewOptions"
                        :key="opt.value"
                        class="data-filters__view-btn"
                        :class="{ 'data-filters__view-btn--active': opt.value === itemStore.view }"
                        :title="opt.value"
                        @click="setView(opt.value)"
                     >
                        <VaIcon :name="opt.icon" size="14px" />
                     </button>
                  </div>
                  <VaMenu
                     :options="exportOptions"
                     @selected="handleExportSelected"
                  >
                     <template #anchor>
                        <button class="data-filters__action-btn">
                           <VaIcon name="fa-file-arrow-down" size="13px" />
                           {{ t('items.data.exportBtn') || 'Export' }}
                           <VaIcon name="fa-chevron-down" size="10px" />
                        </button>
                     </template>
                  </VaMenu>
               </div>
            </div>
         </div>
         <Transition name="advanced-filters">
            <div v-if="showFiltersPanel" class="data-filters__advanced">
               <div class="data-filters__advanced-grid">
                  <div v-for="field in currentFilters" :key="field.key" class="data-filters__field">
                     <component
                        :is="getFieldComponent(field.type)"
                        :label="getLabel(field.key)"
                        :value="getValue(field)"
                        :field="field.key"
                        :model="model"
                        class="data-filters__input"
                        @value-change="(v: any) => updateSearchForm(field, v)"
                     />
                     <button
                        v-if="getValue(field)"
                        class="data-filters__clear-btn"
                        :aria-label="t('buttons.clear')"
                        @click="clearFilter(field)"
                     >
                        <VaIcon name="fa-times" size="11px" />
                     </button>
                  </div>
                  <CountriesDropdown
                     v-if="showCountries"
                     :model="model"
                     class="data-filters__dropdown-wrap"
                     @form-updated="emitFiltersChanged"
                  />
                  <EBPMetricsDropdown
                     v-if="showEBPMetrics"
                     :model="model"
                     class="data-filters__dropdown-wrap"
                     @form-updated="emitFiltersChanged"
                  />
                  <button
                     class="data-filters__add-btn"
                     :title="t('items.filters.addBtn')"
                     @click="showAddFilter = true"
                  >
                     <VaIcon name="fa-plus" size="12px" />
                     <span>{{ t('items.filters.createBtn') || 'Add custom filter' }}</span>
                  </button>
               </div>
            </div>
         </Transition>
      </div>

      <VaModal v-model="showAddFilter" hide-default-actions close-button class="data-filters__add-modal">
         <div class="data-filters__add-inner">
            <header class="data-filters__add-header">
               <p class="data-filters__add-kicker">{{ t('items.filters.addBtn') }}</p>
               <h2 class="data-filters__add-title">{{ t('items.filters.modalTitle') || 'Add filter' }}</h2>
            </header>
            <p class="data-filters__add-hint va-text-secondary">
               {{ t('items.filters.modalDescription') }}
               <code class="data-filters__add-code">parent.child.subchild</code>.
            </p>
            <div class="data-filters__add-field">
               <FieldLookup :model="model" @field-exists="handleFieldExists" />
            </div>
            <div class="data-filters__add-field">
               <label class="data-filters__add-label">{{ t('items.filters.selectLabel') }}</label>
               <select v-model="customFilter.type" class="data-filters__add-select-native">
                  <option v-for="opt in addFilterTypeOptions" :key="opt" :value="opt">{{ opt }}</option>
               </select>
            </div>
            <button
               type="button"
               class="data-filters__add-submit"
               :disabled="!customFilter.key"
               @click="addCustomFilter"
            >
               {{ t('items.filters.createBtn') }}
            </button>
         </div>
      </VaModal>

      <DataExportModal
         :key="`${model}-tsv`"
         v-model="showTSVExportModal"
         mode="tsv"
         :model="model"
         :columns="columns"
         :filters="filters"
      />
      <DataExportModal
         :key="`${model}-chart`"
         v-model="showChartExportModal"
         mode="chart"
         :model="model"
         :columns="columns"
         :filters="filters"
      />
   </div>
</template>

<script setup lang="ts">
   import { computed, ref, shallowRef, watch } from 'vue'
   import type { AppConfig, ConfigModel, ConfigFilter, DataModels } from '../data/types'
   import { useItemStore } from '../stores/items-store'
   import { useI18n } from 'vue-i18n'
   import { useDateMapper } from '../composable/useDates'
   import DataExportModal from './DataExportModal.vue'
   import EBPMetricsDropdown from './EBPMetricsDropdown.vue'
   import CountriesDropdown from './CountriesDropdown.vue'
   import { inject } from 'vue'
   import FieldLookup from './FieldLookup.vue'
   import FilterInput from './inputs/FilterInput.vue'
   import FilterSelect from './inputs/FilterSelect.vue'
   import FilterDate from './inputs/FilterDate.vue'
   import FilterCheckbox from './inputs/FilterCheckbox.vue'

   const { t } = useI18n()
   const config = inject<AppConfig>('appConfig')

   const props = defineProps<{
      model: DataModels
      hasCharts: boolean
   }>()

   const showFiltersPanel = ref(false)
   const showAddFilter = ref(false)
   const showTSVExportModal = ref(false)
   const showChartExportModal = ref(false)
   const customFilter = ref<ConfigFilter>({ key: '', type: 'input' })
   const addFilterTypeOptions = ['select', 'input', 'date']
   const searchText = ref('')
   let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

   const modelIdentifierMap: Record<DataModels, string> = {
      annotations: 'annotation',
      assemblies: 'assembly',
      biosamples: 'biosample',
      reads: 'read',
      local_samples: 'localSample',
      organisms: 'organism',
      submitted_biosamples: 'submittedBiosample',
   }

   const ebpRelated = Boolean(config?.general?.ebpRelated)
   const showEBPMetrics = computed(() => props.model === 'assemblies' && ebpRelated)
   const itemStore = useItemStore()
   const customFilters = computed(() => itemStore.customFilters)
   const modelConfigs = computed(() => config?.models[props.model] as ConfigModel | undefined)
   const filters = computed(() => modelConfigs.value?.filters ?? [])
   const showCountries = computed(() => props.model === 'organisms' && config?.general?.showCountries)
   const columns = computed(() => modelConfigs.value?.columns ?? [])
   const searchPlaceholder = computed(() => {
      const identifierKey = modelIdentifierMap[props.model]
      const identifier = t(`items.filters.searchIdentifiers.${identifierKey}`)
      return t('items.filters.searchPlaceholder', { identifier })
   })

   const currentFilters = computed(() =>
      [...customFilters.value, ...filters.value].sort(
         (a, b) => (a.type === 'checkbox' ? 1 : 0) - (b.type === 'checkbox' ? 1 : 0),
      ),
   )

   const searchForm = computed(() => itemStore.searchForm)
   const dateModels = computed(() => useDateMapper(searchForm.value ?? {}))
   const fieldComponents = shallowRef({
      select: FilterSelect,
      checkbox: FilterCheckbox,
      date: FilterDate,
      input: FilterInput,
   })

   const labelCache = new Map<string, string>()
   function getLabel(key: string): string {
      if (labelCache.has(key)) return labelCache.get(key)!
      const label = key.includes('metadata.') ? key.split('.').pop() || key : key.replace(/_/g, ' ')
      labelCache.set(key, label)
      return label
   }

   function getValue(field: ConfigFilter) {
      const { type, key } = field
      if (!searchForm.value) return null
      switch (type) {
         case 'date':
            return dateModels.value[key] ?? null
         case 'checkbox':
            return searchForm.value[`${key}__exists`] ?? null
         case 'select':
            return searchForm.value[`${key}__in`] ?? null
         case 'input':
            return searchForm.value[`${key}__icontains`] ?? null
         default:
            return searchForm.value[key] ?? null
      }
   }

   function getFieldComponent(type: string) {
      return fieldComponents.value[type as keyof typeof fieldComponents.value] || fieldComponents.value.input
   }

   const dateCache = new Map<string, string>()
   function formatDate(date: Date | undefined): string | null {
      if (!date) return null
      const dateStr = date.toISOString()
      if (dateCache.has(dateStr)) return dateCache.get(dateStr)!
      const formatted = dateStr.split('T')[0]
      dateCache.set(dateStr, formatted)
      return formatted
   }

   function updateSearchForm(filter: ConfigFilter, value: any) {
      const { key, type } = filter
      switch (type) {
         case 'date':
            itemStore.setSearchFormField(`${key}__gte`, formatDate(value?.start))
            itemStore.setSearchFormField(`${key}__lte`, formatDate(value?.end))
            break
         case 'checkbox':
            itemStore.setSearchFormField(`${key}__exists`, value)
            break
         case 'input':
            itemStore.setSearchFormField(`${key}__icontains`, value)
            break
         case 'select':
            itemStore.setSearchFormField(`${key}__in`, value)
            break
         default:
            itemStore.setSearchFormField(key, value)
      }
      emitFiltersChanged()
   }

   function clearFilter(filter: ConfigFilter) {
      updateSearchForm(filter, null)
   }

   function setGlobalSearch(value: string | null) {
      if ((itemStore.searchForm?.filter ?? null) === value) return
      itemStore.setSearchFormField('filter', value)
      emitFiltersChanged()
   }

   function onSearchInput(event: Event) {
      const value = (event.target as HTMLInputElement).value
      searchText.value = value
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
      searchDebounceTimer = setTimeout(() => {
         setGlobalSearch(value.trim() || null)
         searchDebounceTimer = null
      }, 250)
   }

   function clearGlobalSearch() {
      if (searchDebounceTimer) {
         clearTimeout(searchDebounceTimer)
         searchDebounceTimer = null
      }
      searchText.value = ''
      setGlobalSearch(null)
   }

   const emit = defineEmits<{
      (e: 'form-updated'): void
      (e: 'filtersChanged'): void
      (e: 'viewChanged', value: 'cards' | 'table' | 'charts'): void
   }>()

   function emitFiltersChanged() {
      emit('filtersChanged')
      emit('form-updated')
   }

   function handleFieldExists(v: string) {
      customFilter.value.key = v
   }

   function addCustomFilter() {
      itemStore.addCustomFilter({ ...customFilter.value })
      customFilter.value = { key: '', type: 'input' }
      showAddFilter.value = false
      emitFiltersChanged()
   }

   const viewOptions = computed<{ value: 'cards' | 'table' | 'charts'; icon: string }[]>(() => {
      const options: { value: 'cards' | 'table' | 'charts'; icon: string }[] = [
         { value: 'table', icon: 'fa-table' },
      ]
      if (props.hasCharts) {
         options.push({ value: 'charts', icon: 'leaderboard' })
      }
      return options
   })

   const activeFilterCount = computed(() => {
      return Object.entries(searchForm.value ?? {}).filter(([key, value]) => {
         if (['sort_column', 'sort_order', 'taxon_lineage'].includes(key)) return false
         return value !== null && value !== undefined && value !== '' && value !== false
      }).length
   })

   function setView(value: 'cards' | 'table' | 'charts') {
      if (itemStore.view === value) return
      itemStore.view = value
      emit('viewChanged', value)
   }

   const exportOptions = computed<string[]>(() => {
      const options = ['TSV']
      if (props.hasCharts) {
         options.push('Chart')
      }
      return options
   })

   function handleExportSelected(option: string) {
      if (option.toLowerCase() === 'chart') {
         showChartExportModal.value = true
         return
      }
      showTSVExportModal.value = true
   }

   watch(
      () => props.hasCharts,
      (newVal) => {
         if (!newVal && itemStore.view === 'charts') itemStore.view = 'cards'
      },
   )
   watch(
      () => itemStore.searchForm?.filter,
      (value) => {
         searchText.value = typeof value === 'string' ? value : ''
      },
      { immediate: true },
   )
</script>

<style lang="scss" scoped>
   .data-filters {
      width: 100%;
   }

   /* Panel: HomeNew feature-card language — 12px radius, subtle border & shadow */
   .data-filters__panel {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0.875rem 1rem;
      border-radius: 12px;
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
   }

   .data-filters__row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      min-width: 0;
      justify-content: space-between;
   }

   .data-filters__filters-group {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      min-width: 0;
      flex: 1 1 320px;
   }

   /* Results + actions — subtle separator, no heavy border */
   .data-filters__meta {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      flex-shrink: 0;
      padding-left: 0.625rem;
      margin-left: auto;
      border-left: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));

      @media (max-width: 768px) {
         width: 100%;
         margin-left: 0;
         margin-top: 0.5rem;
         padding-left: 0;
         padding-top: 0.5rem;
         border-left: none;
         border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
      }
   }

   .data-filters__active-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.625rem;
      border-radius: 999px;
      background: rgba(var(--va-primary-rgb, 59, 130, 246), 0.1);
      color: var(--va-primary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
   }

   /* Add filter — dashed outline, low emphasis */
   .data-filters__add-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      padding: 0.4rem 0.65rem;
      min-height: 2rem;
      border-radius: 8px;
      border: 1px dashed var(--va-background-border, rgba(0, 0, 0, 0.1));
      background: transparent;
      color: var(--va-text-secondary);
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
      line-height: 1.4;

      &:hover {
         background: var(--va-background-secondary);
         color: var(--va-text-primary);
         border-color: var(--va-primary);
         border-style: solid;
      }
   }

   /* Filter field with input and clear */
   .data-filters__field {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      min-width: 0;
   }

   .data-filters__field--search {
      flex: 0 1 260px;
      min-width: 160px;
      max-width: 260px;
   }

   .data-filters__search-wrap {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
      min-height: 2rem;
      padding: 0 0.5rem;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      background: var(--va-background-secondary);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &:focus-within {
         border-color: var(--va-primary);
         box-shadow: 0 0 0 2px rgba(var(--va-primary-rgb, 59, 130, 246), 0.1);
      }

      &--active {
         border-color: color-mix(in srgb, var(--va-primary) 35%, transparent);
      }
   }

   .data-filters__search-icon {
      color: var(--va-text-secondary);
      opacity: 0.7;
      flex-shrink: 0;
   }

   .data-filters__search-input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      padding: 0.45rem 0;
      font-size: 0.8125rem;
      color: var(--va-text-primary);

      &::placeholder {
         color: var(--va-text-secondary);
         opacity: 0.75;
      }
   }

   .data-filters__search-clear {
      width: 1.5rem;
      height: 1.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: var(--va-text-secondary);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover {
         background: var(--va-background-element);
         color: var(--va-text-primary);
      }
   }

   .data-filters__input {
      min-width: 160px;
      max-width: 240px;
   }

   .data-filters__clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      flex-shrink: 0;
      border: none;
      background: transparent;
      color: var(--va-text-secondary);
      cursor: pointer;
      border-radius: 4px;
      margin-right: 0.15rem;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover {
         background: rgba(0, 0, 0, 0.06);
         color: var(--va-text-primary);
      }
   }

   .data-filters__dropdown-wrap {
      flex-shrink: 0;
   }

   /* Results count — hero-stat-pill style weight */
   .data-filters__results {
      display: inline-flex;
      align-items: baseline;
      gap: 0.25rem;
      font-size: 0.8125rem;
   }

   .data-filters__results-count {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--va-text-primary);
      letter-spacing: -0.02em;
   }

   .data-filters__results-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--va-text-secondary);
   }

   /* Actions group */
   .data-filters__actions-group {
      display: flex;
      align-items: center;
      gap: 0.625rem;
   }

   /* Filters toggle — kicker-style, light weight (match HomeNew controls) */
   .data-filters__advanced-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.65rem;
      min-height: 2rem;
      border-radius: 8px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      background: var(--va-background-secondary);
      color: var(--va-text-secondary);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

      &:hover {
         background: var(--va-background-element);
         color: var(--va-text-primary);
         border-color: rgba(0, 0, 0, 0.08);
      }
   }

   .data-filters__advanced-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.1rem;
      height: 1.1rem;
      padding: 0 0.25rem;
      border-radius: 999px;
      background: rgba(var(--va-primary-rgb, 59, 130, 246), 0.14);
      color: var(--va-primary);
      font-weight: 600;
      line-height: 1;
   }

   .data-filters__advanced {
      border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
      padding-top: 0.75rem;
      margin-top: 0.75rem;
   }

   .data-filters__advanced-grid {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.625rem;
   }

   .data-filters__action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      padding: 0.4rem 0.65rem;
      min-height: 2rem;
      border-radius: 8px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      background: var(--va-background-secondary);
      color: var(--va-text-secondary);
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
      line-height: 1.4;

      &:hover {
         background: var(--va-background-element);
         color: var(--va-text-primary);
         border-color: rgba(0, 0, 0, 0.08);
      }
   }

   /* View toggle — pill group (match HomeNew hero stat pill feel) */
   .data-filters__view-toggle {
      display: flex;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      overflow: hidden;
      background: var(--va-background-secondary);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
   }

   .data-filters__view-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: none;
      background: transparent;
      color: var(--va-text-secondary);
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;

      &:not(:last-child) {
         border-right: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.05));
      }

      &:hover {
         background: var(--va-background-element);
         color: var(--va-text-primary);
      }

      &--active {
         background: var(--va-primary);
         color: white;

         &:hover {
            background: var(--va-primary);
            color: white;
         }
      }
   }

   .advanced-filters-enter-active,
   .advanced-filters-leave-active {
      transition: opacity 0.2s ease, transform 0.2s ease;
   }

   .advanced-filters-enter-from,
   .advanced-filters-leave-to {
      opacity: 0;
      transform: translateY(-4px);
   }

   /* Add filter modal — aligned with DataExportModal */
   .data-filters__add-inner {
      padding: 0.25rem 0;
      min-width: 320px;
      max-width: 520px;
   }

   .data-filters__add-header {
      margin-bottom: 1.25rem;
   }

   .data-filters__add-kicker {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--va-text-secondary);
      margin: 0 0 0.25rem 0;
      line-height: 1.3;
   }

   .data-filters__add-title {
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--va-text-primary);
      line-height: 1.3;
   }

   .data-filters__add-hint {
      font-size: 0.875rem;
      margin: 0 0 1rem;
      line-height: 1.45;
   }

   .data-filters__add-code {
      font-size: 0.8125rem;
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      background: var(--va-background-element);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
   }

   .data-filters__add-field {
      margin-bottom: 1rem;
   }

   .data-filters__add-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--va-text-secondary);
      margin-bottom: 0.35rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
   }

   .data-filters__add-select-native {
      display: block;
      width: 100%;
      min-width: 140px;
      padding: 0.4rem 0.5rem;
      padding-right: 1.75rem;
      font-size: 0.8125rem;
      color: var(--va-text-primary);
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.09));
      border-radius: 8px;
      outline: none;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      transition: border-color 0.15s ease;

      &:focus {
         border-color: var(--va-primary);
      }
   }

   .data-filters__add-submit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      background: var(--va-primary);
      color: #fff;
      cursor: pointer;
      transition: opacity 0.15s ease;

      &:hover:not(:disabled) {
         opacity: 0.9;
      }

      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }

</style>
