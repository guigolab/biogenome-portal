<template>
   <section aria-labelledby="records-module-title">
      <CmsCard
         :title="isAdmin ? 'Data Records' : 'My Data Records'"
         description="Browse and manage your data records by type. Click a tab to explore that model."
         icon="fa-database"
         color="purple"
         :loading="isLoading"
      >
         <!-- Tab bar lives in the filters slot so it's visually inside the card -->
         <template #filters>
            <div class="cms-tabs" role="tablist" aria-label="Data model tabs">
               <button
                  v-for="tab in tabs"
                  :key="tab.key"
                  role="tab"
                  :aria-selected="activeTab === tab.key"
                  :class="['cms-tabs__tab', { 'cms-tabs__tab--active': activeTab === tab.key }]"
                  @click="selectTab(tab.key)"
               >
                  <CmsIcon :name="tab.icon" size="0.75rem" class="cms-tabs__icon" />
                  <span>{{ tab.label }}</span>
                  <span class="cms-tabs__count" :class="{ 'cms-tabs__count--active': activeTab === tab.key }">
                     {{ tab.count }}
                  </span>
               </button>
            </div>
         </template>

         <!-- Records table / empty state -->
         <template v-if="!isLoading">
            <DashboardEmptyState
               v-if="items.length === 0"
               :icon="activeTabDef?.icon ?? 'fa-box-open'"
               :title="`No ${activeTabDef?.label ?? 'records'} yet`"
               description="Nothing has been imported or created for this model yet."
            >
               <template v-if="activeTabDef?.createLabel" #actions>
                  <CmsBtn icon="fa-plus" variant="primary" @click="openCreateForActiveTab">
                     {{ activeTabDef.createLabel }}
                  </CmsBtn>
               </template>
            </DashboardEmptyState>

            <table v-else class="cms-table" role="grid">
               <thead>
                  <tr class="cms-table__head-row">
                     <th
                        v-for="col in activeTabDef?.columns ?? []"
                        :key="col"
                        class="cms-table__th"
                     >
                        {{ col.split('_').join(' ') }}
                     </th>
                     <th class="cms-table__th cms-table__th--right">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  <tr v-for="(row, i) in items" :key="i" class="cms-table__row">
                     <td
                        v-for="col in activeTabDef?.columns ?? []"
                        :key="col"
                        class="cms-table__td cms-table__td--truncated"
                     >
                        {{ cellValue(row, col) }}
                     </td>
                     <td class="cms-table__td cms-table__td--right">
                        <router-link
                           :to="{ name: 'admin' }"
                           class="cms-link-btn"
                        >
                           Open dashboard
                           <CmsIcon name="fa-arrow-right" size="0.65rem" />
                        </router-link>
                     </td>
                  </tr>
               </tbody>
            </table>
         </template>

         <!-- Pagination -->
         <template v-if="!isLoading && total > limit" #footer>
            <CmsPagination
               v-model="currentPage"
               :total="total"
               :page-size="limit"
               @update:model-value="fetchTabData"
            />
         </template>
      </CmsCard>
   </section>
</template>

<script setup lang="ts">
   import { computed, onMounted, ref, watch } from 'vue'
   import { useGlobalStore } from '../../../stores/global-store'
   import ItemService from '../../../services/CommonService'
   import AuthService from '../../../services/AuthService'
   import type { DataModels } from '../../../data/types'
   import { iconMap } from '../../../composable/useIconMap'
   import CmsCard from './CmsCard.vue'
   import CmsIcon from '../ui/CmsIcon.vue'
   import CmsBtn from '../ui/CmsBtn.vue'
   import CmsPagination from './CmsPagination.vue'
   import DashboardEmptyState from './DashboardEmptyState.vue'
   import { useCmsDashboardDrawerStore } from '../../../stores/cms-dashboard-drawer-store'

   const props = defineProps<{
      stats: { key: DataModels; count: number }[]
   }>()

   const globalStore = useGlobalStore()
   const drawer = useCmsDashboardDrawerStore()
   const isAdmin = computed(() => globalStore.userRole === 'Admin')

   function openCreateForActiveTab() {
      const k = activeTab.value
      if (k === 'biosamples') drawer.open({ panel: 'insdc', insdcImportModel: 'biosamples' })
      else if (k === 'reads') drawer.open({ panel: 'insdc', insdcImportModel: 'reads' })
      else if (k === 'assemblies') drawer.open({ panel: 'insdc', insdcImportModel: 'assemblies' })
      else if (k === 'local_samples') drawer.open({ panel: 'spreadsheet' })
      else if (k === 'annotations') drawer.open({ panel: 'annotation' })
   }

   type TabDef = {
      key: DataModels
      label: string
      icon: string
      count: number
      columns: string[]
      createLabel?: string
   }

   const tabMeta: Record<string, Omit<TabDef, 'key' | 'count'>> = {
      biosamples: {
         label: 'Biosamples',
         icon: 'fa-vial',
         columns: ['accession', 'scientific_name'],
         createLabel: 'Import Biosample',
      },
      reads: {
         label: 'Reads',
         icon: 'fa-folder',
         columns: ['run_accession', 'scientific_name'],
         createLabel: 'Import Reads',
      },
      assemblies: {
         label: 'Assemblies',
         icon: 'fa-dna',
         columns: ['accession', 'assembly_name', 'scientific_name'],
         createLabel: 'Import Assembly',
      },
      local_samples: {
         label: 'Local Samples',
         icon: 'fa-flask',
         columns: ['sample_id', 'scientific_name'],
         createLabel: 'Import Samples',
      },
      annotations: {
         label: 'Annotations',
         icon: 'fa-bars-staggered',
         columns: ['name', 'scientific_name'],
         createLabel: 'Create Annotation',
      },
   }

   const tabs = computed<TabDef[]>(() =>
      props.stats
         .filter(({ key }) => key in tabMeta && key !== 'organisms')
         .map(({ key, count }) => ({ key, count, ...tabMeta[key] })),
   )

   const activeTab = ref<DataModels>(tabs.value[0]?.key ?? 'biosamples')
   const activeTabDef = computed(() => tabs.value.find((t) => t.key === activeTab.value))

   const items = ref<Record<string, any>[]>([])
   const total = ref(0)
   const isLoading = ref(false)
   const currentPage = ref(1)
   const limit = 5

   function cellValue(row: Record<string, any>, col: string) {
      const val = row[col] ?? row.metadata?.[col] ?? '—'
      if (Array.isArray(val)) return val.join(', ')
      return val
   }

   async function fetchTabData() {
      if (!activeTab.value) return
      isLoading.value = true
      try {
         const params = { limit, offset: (currentPage.value - 1) * limit }
         if (activeTab.value === 'local_samples' && !isAdmin.value) {
            const { data } = await AuthService.getUserSamples(globalStore.userName, params)
            items.value = data.data ?? []
            total.value = data.total ?? 0
         } else {
            const { data } = await ItemService.getItems(activeTab.value, params)
            items.value = data.data ?? []
            total.value = data.total ?? 0
         }
      } catch {
         items.value = []
         total.value = 0
      } finally {
         isLoading.value = false
      }
   }

   function selectTab(key: DataModels) {
      activeTab.value = key
      currentPage.value = 1
   }

   watch(activeTab, fetchTabData)

   onMounted(() => {
      if (tabs.value.length) {
         const firstKey = tabs.value[0].key
         if (activeTab.value === firstKey) {
            fetchTabData()
         } else {
            activeTab.value = firstKey
         }
      }
   })
</script>
