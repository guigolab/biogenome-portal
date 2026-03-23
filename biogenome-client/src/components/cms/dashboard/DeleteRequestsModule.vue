<template>
   <section aria-labelledby="delete-requests-module-title">
      <CmsCard
         title="Deletion Requests"
         description="Pending organism deletion requests from curators. Approving permanently removes the organism."
         icon="fa-trash-can"
         color="danger"
         :loading="isLoading"
      >
         <!-- Badge count in header -->
         <template v-if="total > 0" #actions>
            <span class="cms-count-badge">{{ total }}</span>
         </template>

         <!-- Filters -->
         <template #filters>
            <CmsSearchInput
               v-model="filter"
               field-name="cms-delete-requests-filter"
               placeholder="Filter by name or taxid…"
               @update:model-value="debouncedFetch"
            />
         </template>

         <!-- Table -->
         <template v-if="!isLoading">
            <DashboardEmptyState
               v-if="items.length === 0"
               icon="fa-circle-check"
               title="No pending requests"
               description="All organism deletion requests have been resolved."
            />

            <table v-else class="cms-table" role="grid">
               <thead>
                  <tr class="cms-table__head-row">
                     <th class="cms-table__th">Species</th>
                     <th class="cms-table__th">TaxID</th>
                     <th class="cms-table__th cms-table__th--right">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  <tr
                     v-for="item in items"
                     :key="item.taxid"
                     class="cms-table__row"
                  >
                     <td class="cms-table__td">
                        <span class="cms-table__sci-name">{{ item.scientific_name }}</span>
                     </td>
                     <td class="cms-table__td cms-table__td--mono">{{ item.taxid }}</td>
                     <td class="cms-table__td cms-table__td--right">
                        <div class="cms-table__actions">
                           <CmsBtn
                              icon="fa-xmark"
                              variant="warning"
                              :disabled="!!processingTaxid"
                              :loading="processingTaxid === item.taxid && processingAction === 'deny'"
                              @click="handleDeny(item.taxid)"
                           >
                              Deny
                           </CmsBtn>
                           <CmsBtn
                              icon="fa-trash"
                              variant="danger"
                              :disabled="!!processingTaxid"
                              :loading="processingTaxid === item.taxid && processingAction === 'approve'"
                              @click="promptApprove(item)"
                           >
                              Delete
                           </CmsBtn>
                        </div>
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
               @update:model-value="fetchData"
            />
         </template>
      </CmsCard>

      <CmsModal v-model="showApproveModal">
         <template #header="{ titleId }">
            <h3 :id="titleId" class="cms-delete-req-modal__title">Approve deletion request</h3>
         </template>
         <p>
            This will permanently delete
            <em>{{ pendingApproveItem?.scientific_name }}</em>
            and all related data. This action is irreversible.
         </p>
         <template #footer>
            <CmsBtn variant="secondary" @click="showApproveModal = false">Cancel</CmsBtn>
            <CmsBtn
               variant="danger"
               :loading="processingTaxid === pendingApproveItem?.taxid"
               @click="confirmApprove"
            >
               Delete organism
            </CmsBtn>
         </template>
      </CmsModal>
   </section>
</template>

<script setup lang="ts">
   import { onMounted, ref } from 'vue'
   import { useToast } from 'vuestic-ui'
   import { AxiosError } from 'axios'
   import AuthService from '../../../services/AuthService'
   import CommonService from '../../../services/CommonService'
   import CmsCard from './CmsCard.vue'
   import CmsBtn from '../ui/CmsBtn.vue'
   import CmsSearchInput from './CmsSearchInput.vue'
   import CmsPagination from './CmsPagination.vue'
   import DashboardEmptyState from './DashboardEmptyState.vue'
   import CmsModal from '../ui/CmsModal.vue'

   const { init } = useToast()

   const items = ref<Record<string, any>[]>([])
   const total = ref(0)
   const isLoading = ref(false)
   const filter = ref('')
   const currentPage = ref(1)
   const limit = 7

   const processingTaxid = ref<string | null>(null)
   const processingAction = ref<'approve' | 'deny' | null>(null)
   const showApproveModal = ref(false)
   const pendingApproveItem = ref<Record<string, any> | null>(null)

   function debounce<T extends (...args: any[]) => void>(fn: T, ms = 350) {
      let timer: ReturnType<typeof setTimeout>
      return (...args: Parameters<T>) => {
         clearTimeout(timer)
         timer = setTimeout(() => fn(...args), ms)
      }
   }

   async function fetchData() {
      isLoading.value = true
      try {
         const { data } = await CommonService.getItems('organisms', {
            pending_deletion: true,
            filter: filter.value,
            limit,
            offset: (currentPage.value - 1) * limit,
         })
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

   function promptApprove(item: Record<string, any>) {
      pendingApproveItem.value = item
      showApproveModal.value = true
   }

   async function confirmApprove() {
      if (!pendingApproveItem.value) return
      const taxid = pendingApproveItem.value.taxid
      processingTaxid.value = taxid
      processingAction.value = 'approve'
      try {
         await AuthService.deleteItem('organisms', taxid)
         init({ message: `${pendingApproveItem.value.scientific_name} deleted.`, color: 'success' })
         showApproveModal.value = false
         currentPage.value = 1
         await fetchData()
      } catch (err) {
         const ax = err as AxiosError
         init({ message: (ax.response?.data as string) ?? 'Deletion failed.', color: 'danger' })
      } finally {
         processingTaxid.value = null
         processingAction.value = null
      }
   }

   async function handleDeny(taxid: string) {
      processingTaxid.value = taxid
      processingAction.value = 'deny'
      try {
         await AuthService.deleteOrganismsToDeleteRequest(taxid)
         init({ message: 'Request denied.', color: 'success' })
         await fetchData()
      } catch (err) {
         const ax = err as AxiosError
         init({ message: (ax.response?.data as string) ?? 'Failed to deny request.', color: 'danger' })
      } finally {
         processingTaxid.value = null
         processingAction.value = null
      }
   }

   onMounted(fetchData)
</script>

<style lang="scss" scoped>
   .cms-delete-req-modal__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.35;
      color: var(--cms-danger);
   }
</style>
