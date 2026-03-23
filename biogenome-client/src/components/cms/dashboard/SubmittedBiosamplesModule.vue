<template>
   <section aria-labelledby="biosamples-module-title">
      <CmsCard
         :title="isAdmin ? 'Submitted Biosamples' : 'My EBI Biosamples'"
         :description="isAdmin
            ? 'All biosamples submitted to EBI across all curators.'
            : 'Biosamples you have submitted to EBI BioSamples.'"
         icon="fa-vial"
         color="teal"
         :loading="isLoading"
      >
         <!-- Header actions -->
         <template v-if="hasENATemplate" #actions>
            <CmsBtn :to="{ name: 'publish-biosample' }" icon="fa-plus" variant="primary">
               Submit Biosample
            </CmsBtn>
         </template>

         <!-- Filters -->
         <template #filters>
            <CmsSearchInput
               v-model="filter"
               field-name="cms-submitted-biosamples-filter"
               placeholder="Filter by name or accession…"
               @update:model-value="debouncedFetch"
            />
            <div v-if="isAdmin" class="cms-toggle-group">
               <button
                  v-for="opt in viewOptions"
                  :key="opt.value"
                  class="cms-toggle-group__btn"
                  :class="{ 'cms-toggle-group__btn--active': viewMode === opt.value }"
                  @click="setViewMode(opt.value as typeof viewMode)"
               >
                  {{ opt.label }}
               </button>
            </div>
         </template>

         <!-- Table -->
         <template v-if="!isLoading">
            <DashboardEmptyState
               v-if="items.length === 0"
               icon="fa-vial"
               title="No biosamples found"
               description="No submitted biosamples match your current filters."
            >
               <template v-if="hasENATemplate" #actions>
                  <CmsBtn :to="{ name: 'publish-biosample' }" icon="fa-plus" variant="primary">
                     Submit Biosample
                  </CmsBtn>
               </template>
            </DashboardEmptyState>

            <table v-else class="cms-table" role="grid">
               <thead>
                  <tr class="cms-table__head-row">
                     <th class="cms-table__th">Species</th>
                     <th class="cms-table__th">Sample name</th>
                     <th class="cms-table__th">Accession</th>
                     <th v-if="isAdmin" class="cms-table__th">Submitted by</th>
                  </tr>
               </thead>
               <tbody>
                  <tr
                     v-for="item in items"
                     :key="item.accession ?? item.name"
                     class="cms-table__row"
                  >
                     <td class="cms-table__td">
                        <span class="cms-table__sci-name">{{ item.scientific_name ?? '—' }}</span>
                     </td>
                     <td class="cms-table__td cms-table__td--mono">{{ item.name ?? '—' }}</td>
                     <td class="cms-table__td">
                        <router-link
                           v-if="item.accession"
                           :to="{ name: 'item', params: { model: 'biosamples', id: item.accession } }"
                           class="cms-accession-link"
                        >
                           {{ item.accession }}
                        </router-link>
                        <span v-else class="cms-table__muted">—</span>
                     </td>
                     <td v-if="isAdmin" class="cms-table__td">
                        <span class="cms-table__muted">{{ item.user ?? '—' }}</span>
                     </td>
                  </tr>
               </tbody>
            </table>
         </template>

         <!-- Pagination footer -->
         <template v-if="!isLoading && total > limit" #footer>
            <CmsPagination
               v-model="currentPage"
               :total="total"
               :page-size="limit"
               @update:model-value="fetchData"
            />
         </template>
      </CmsCard>
   </section>
</template>

<script setup lang="ts">
   import { computed, inject, onMounted, ref, watch } from 'vue'
   import { useGlobalStore } from '../../../stores/global-store'
   import EBIService from '../../../services/EBIService'
   import type { AppConfig } from '../../../data/types'
   import CmsCard from './CmsCard.vue'
   import CmsBtn from '../ui/CmsBtn.vue'
   import CmsSearchInput from './CmsSearchInput.vue'
   import CmsPagination from './CmsPagination.vue'
   import DashboardEmptyState from './DashboardEmptyState.vue'

   const globalStore = useGlobalStore()
   const configs = inject('appConfig') as AppConfig
   const isAdmin = computed(() => globalStore.userRole === 'Admin')
   const hasENATemplate = computed(() => configs?.general?.enaTemplate)

   const items = ref<Record<string, any>[]>([])
   const total = ref(0)
   const isLoading = ref(false)
   const filter = ref('')
   const currentPage = ref(1)
   const limit = 6
   const viewMode = ref<'filtered' | 'all'>(isAdmin.value ? 'all' : 'filtered')

   const viewOptions = [
      { label: 'My Biosamples', value: 'filtered' },
      { label: 'All Biosamples', value: 'all' },
   ]

   function debounce<T extends (...args: any[]) => void>(fn: T, ms = 350) {
      let timer: ReturnType<typeof setTimeout>
      return (...args: Parameters<T>) => {
         clearTimeout(timer)
         timer = setTimeout(() => fn(...args), ms)
      }
   }

   function setViewMode(val: 'filtered' | 'all') {
      viewMode.value = val
   }

   async function fetchData() {
      isLoading.value = true
      try {
         const query: Record<string, any> = {
            filter: filter.value,
            limit,
            offset: (currentPage.value - 1) * limit,
         }
         if (!isAdmin.value || viewMode.value === 'filtered') {
            query.user = globalStore.userName
         }
         const { data } = await EBIService.getSubmittedBioSamples(query)
         items.value = data.data ?? []
         total.value = data.total ?? 0
      } catch {
         items.value = []
      } finally {
         isLoading.value = false
      }
   }

   const debouncedFetch = debounce(() => {
      currentPage.value = 1
      fetchData()
   })

   watch(viewMode, () => {
      currentPage.value = 1
      fetchData()
   })

   onMounted(fetchData)
</script>
