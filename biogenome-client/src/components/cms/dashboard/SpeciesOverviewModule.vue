<template>
   <section aria-labelledby="species-module-title">
      <CmsCard
         :title="isAdmin ? 'Species Overview' : 'My Species'"
         :description="isAdmin
            ? 'All portal species with curator assignments and curation statuses.'
            : 'Species assigned to you and their current curation statuses.'"
         icon="fa-paw"
         color="primary"
         :loading="isLoading"
      >
         <template #actions>
            <CmsBtn :to="{ name: 'create-organism' }" icon="fa-plus" variant="primary">
               Add Species
            </CmsBtn>
         </template>

         <template #filters>
            <CmsSearchInput
               v-model="filter"
               field-name="cms-species-overview-filter"
               placeholder="Filter by name or taxid…"
               @update:model-value="debouncedFetch"
            />
            <div v-if="isAdmin" class="cms-toggle-group">
               <button
                  v-for="opt in toggleOptions"
                  :key="opt.value"
                  class="cms-toggle-group__btn"
                  :class="{ 'cms-toggle-group__btn--active': toggle === opt.value }"
                  @click="onToggleChange(opt.value as 'assigned' | 'unassigned')"
               >
                  {{ opt.label }}
               </button>
            </div>
            <CmsUserSelect
               v-if="isAdmin && toggle === 'assigned'"
               v-model="selectedUsers"
               :users="users"
               :loading="fetchingUsers"
               @update:model-value="debouncedFetch"
            />
            <CmsBtn
               v-if="isAdmin"
               icon="fa-file-arrow-down"
               variant="secondary"
               :loading="downloadingData"
               @click="downloadReport"
            >
               {{ exportLabel }}
            </CmsBtn>
         </template>

         <template v-if="!isLoading">
            <DashboardEmptyState
               v-if="organisms.length === 0"
               icon="fa-paw"
               title="No species found"
               :description="toggle === 'unassigned'
                  ? 'All species are currently assigned to curators.'
                  : 'No species match your filters, or none have been assigned yet.'"
            >
               <template #actions>
                  <CmsBtn :to="{ name: 'create-organism' }" icon="fa-plus" variant="primary">
                     Add Species
                  </CmsBtn>
               </template>
            </DashboardEmptyState>

            <table v-else class="cms-table" role="grid">
               <thead>
                  <tr class="cms-table__head-row">
                     <th class="cms-table__th">Species</th>
                     <th class="cms-table__th">GoaT</th>
                     <th class="cms-table__th">INSDC</th>
                     <th class="cms-table__th">Target list</th>
                     <th v-if="isAdmin && toggle === 'assigned'" class="cms-table__th">Curators</th>
                     <th class="cms-table__th cms-table__th--right">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  <tr
                     v-for="org in organisms"
                     :key="org.taxid"
                     class="cms-table__row"
                     :class="{ 'cms-table__row--muted': org.pending_deletion }"
                  >
                     <td class="cms-table__td cms-table__td--name">
                        <span class="cms-table__sci-name">{{ org.scientific_name }}</span>
                        <span class="cms-table__sub">{{ org.taxid }}</span>
                     </td>
                     <td class="cms-table__td"><CmsStatusPill :value="org.goat_status" type="goat" /></td>
                     <td class="cms-table__td"><CmsStatusPill :value="org.insdc_status" type="insdc" /></td>
                     <td class="cms-table__td"><CmsStatusPill :value="org.target_list_status" type="target" /></td>
                     <td v-if="isAdmin && toggle === 'assigned'" class="cms-table__td">
                        <div class="cms-table__chips">
                           <button
                              v-for="user in (org.assigned_users ?? [])"
                              :key="user"
                              type="button"
                              class="cms-user-chip"
                              @click="drawer.open({ panel: 'user', userName: user })"
                           >
                              {{ user }}
                           </button>
                           <span v-if="!org.assigned_users?.length" class="cms-table__muted">—</span>
                        </div>
                     </td>
                     <td class="cms-table__td cms-table__td--right">
                        <div class="cms-table__actions">
                           <!-- Pending deletion indicator (data manager only) -->
                           <span v-if="org.pending_deletion && !isAdmin" class="cms-badge cms-badge--warning">
                              <CmsIcon name="fa-clock" size="0.65rem" />
                              Pending deletion
                           </span>
                           <template v-else>
                              <CmsBtn
                                 :to="{ name: 'update-organism', params: { taxid: org.taxid } }"
                                 icon="fa-edit"
                                 variant="secondary"
                              >
                                 Edit
                              </CmsBtn>
                              <!-- Admin: direct delete -->
                              <CmsBtn
                                 v-if="isAdmin"
                                 icon="fa-trash"
                                 variant="danger"
                                 @click="promptAdminDelete(org)"
                              >
                                 Delete
                              </CmsBtn>
                              <!-- Data manager: request deletion -->
                              <CmsBtn
                                 v-else
                                 icon="fa-trash"
                                 variant="danger"
                                 @click="requestDeletion(org)"
                              >
                                 Delete
                              </CmsBtn>
                           </template>
                        </div>
                     </td>
                  </tr>
               </tbody>
            </table>
         </template>

         <template v-if="!isLoading && organisms.length > 0" #footer>
            <CmsPagination
               v-model="currentPage"
               :total="total"
               :page-size="pagination.limit"
               @update:model-value="handlePage"
            />
         </template>
      </CmsCard>

      <CmsModal v-model="showDeleteModal">
         <template #header="{ titleId }">
            <h3 :id="titleId" class="cms-species-modal__title">Request organism deletion</h3>
         </template>
         <p>
            Are you sure you want to request deletion of
            <em>{{ pendingDeleteOrg?.scientific_name }}</em>?
            An admin will review and approve or deny your request.
         </p>
         <template #footer>
            <CmsBtn variant="secondary" @click="showDeleteModal = false">Cancel</CmsBtn>
            <CmsBtn variant="danger" :loading="deletingOrg" @click="confirmDeletion">
               Send request
            </CmsBtn>
         </template>
      </CmsModal>

      <CmsModal v-model="showAdminDeleteModal">
         <template #header="{ titleId }">
            <h3 :id="titleId" class="cms-species-modal__title cms-species-modal__title--danger">Delete organism</h3>
         </template>
         <p>
            This will permanently delete
            <em>{{ pendingAdminDeleteOrg?.scientific_name }}</em>
            and all related data. This action is irreversible.
         </p>
         <template #footer>
            <CmsBtn variant="secondary" @click="showAdminDeleteModal = false">Cancel</CmsBtn>
            <CmsBtn variant="danger" :loading="deletingOrg" @click="confirmAdminDelete">
               Delete organism
            </CmsBtn>
         </template>
      </CmsModal>
   </section>
</template>

<script setup lang="ts">
   import { computed, onMounted, ref } from 'vue'
   import { useToast } from 'vuestic-ui'
   import { AxiosError } from 'axios'
   import { useGlobalStore } from '../../../stores/global-store'
   import AuthService from '../../../services/AuthService'
   import OrganismService from '../../../services/OrganismService'
   import UserService from '../../../services/UserService'
   import CmsCard from './CmsCard.vue'
   import CmsBtn from '../ui/CmsBtn.vue'
   import CmsSearchInput from './CmsSearchInput.vue'
   import CmsStatusPill from './CmsStatusPill.vue'
   import CmsPagination from './CmsPagination.vue'
   import DashboardEmptyState from './DashboardEmptyState.vue'
   import CmsModal from '../ui/CmsModal.vue'
   import CmsIcon from '../ui/CmsIcon.vue'
   import { useCmsDashboardDrawerStore } from '../../../stores/cms-dashboard-drawer-store'

   const CmsUserSelect = {
      name: 'CmsUserSelect',
      props: {
         modelValue: { type: Array as () => string[], default: () => [] },
         users: { type: Array as () => Record<string, any>[], default: () => [] },
         loading: Boolean,
      },
      emits: ['update:modelValue'],
      template: `
         <select
            multiple
            class="cms-select"
            :disabled="loading"
            :value="modelValue"
            @change="$emit('update:modelValue', Array.from($event.target.selectedOptions).map(o => o.value))"
         >
            <option v-for="u in users" :key="u.name" :value="u.name">{{ u.name }}</option>
         </select>
      `,
   }

   const globalStore = useGlobalStore()
   const drawer = useCmsDashboardDrawerStore()
   const { init } = useToast()
   const isAdmin = computed(() => globalStore.userRole === 'Admin')

   const organisms = ref<Record<string, any>[]>([])
   const total = ref(0)
   const isLoading = ref(false)
   const filter = ref('')
   const currentPage = ref(1)
   const pagination = { limit: 10, offset: 0 }

   const toggle = ref<'assigned' | 'unassigned'>('assigned')
   const exportLabel = computed(() =>
      toggle.value === 'assigned' ? 'Export assigned' : 'Export unassigned',
   )
   const toggleOptions = [
      { label: 'Assigned', value: 'assigned' },
      { label: 'Unassigned', value: 'unassigned' },
   ]
   const users = ref<Record<string, any>[]>([])
   const selectedUsers = ref<string[]>([])
   const fetchingUsers = ref(false)
   const downloadingData = ref(false)

   // Data manager deletion request
   const showDeleteModal = ref(false)
   const pendingDeleteOrg = ref<Record<string, any> | null>(null)
   const deletingOrg = ref(false)

   // Admin direct delete
   const showAdminDeleteModal = ref(false)
   const pendingAdminDeleteOrg = ref<Record<string, any> | null>(null)

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
         const params: Record<string, any> = {
            filter: filter.value,
            limit: pagination.limit,
            offset: (currentPage.value - 1) * pagination.limit,
         }
         if (isAdmin.value) {
            if (toggle.value === 'assigned') {
               if (selectedUsers.value.length) params.name__in = selectedUsers.value.join(',')
               const { data } = await OrganismService.getOrganismsWithUsers(params)
               organisms.value = data.data
               total.value = data.total
            } else {
               const { data } = await OrganismService.getUnassignedOrganisms(params)
               organisms.value = data.data
               total.value = data.total
            }
         } else {
            const { data } = await AuthService.getUserSpecies(globalStore.userName, params)
            organisms.value = data.data
            total.value = data.total
         }
      } catch {
         organisms.value = []
      } finally {
         isLoading.value = false
      }
   }

   const debouncedFetch = debounce(() => {
      currentPage.value = 1
      fetchData()
   })

   function onToggleChange(val: 'assigned' | 'unassigned') {
      toggle.value = val
      filter.value = ''
      selectedUsers.value = []
      currentPage.value = 1
      fetchData()
   }

   function handlePage() { fetchData() }

   async function fetchUsers() {
      fetchingUsers.value = true
      try {
         const { data } = await UserService.getUsers({ limit: 10000 })
         users.value = data.data?.filter((u: any) => u.role !== 'Admin') ?? []
      } catch { users.value = [] } finally { fetchingUsers.value = false }
   }

   async function downloadReport() {
      downloadingData.value = true
      try {
         const params: Record<string, any> = { format: 'tsv', filter: filter.value }
         if (toggle.value === 'assigned' && selectedUsers.value.length) params.name__in = selectedUsers.value.join(',')
         const cb = toggle.value === 'assigned' ? OrganismService.getOrganismsWithUsers : OrganismService.getUnassignedOrganisms
         const { data } = await cb(params, true)
         const href = URL.createObjectURL(data)
         const link = document.createElement('a')
         link.href = href
         link.setAttribute('download', `${toggle.value}_species.tsv`)
         document.body.appendChild(link); link.click()
         document.body.removeChild(link); URL.revokeObjectURL(href)
      } catch { init({ message: 'Download failed', color: 'danger' })
      } finally { downloadingData.value = false }
   }

   // Data manager: request deletion
   function requestDeletion(org: Record<string, any>) {
      pendingDeleteOrg.value = org
      showDeleteModal.value = true
   }

   async function confirmDeletion() {
      if (!pendingDeleteOrg.value) return
      deletingOrg.value = true
      try {
         await AuthService.createOrganismToDeleteRequest(pendingDeleteOrg.value.taxid)
         init({ message: 'Deletion request sent successfully.', color: 'success' })
         showDeleteModal.value = false
         await fetchData()
      } catch (err) {
         const ax = err as AxiosError
         init({ message: (ax.response?.data as string) ?? 'Failed to send request.', color: 'danger' })
      } finally { deletingOrg.value = false }
   }

   // Admin: direct delete
   function promptAdminDelete(org: Record<string, any>) {
      pendingAdminDeleteOrg.value = org
      showAdminDeleteModal.value = true
   }

   async function confirmAdminDelete() {
      if (!pendingAdminDeleteOrg.value) return
      deletingOrg.value = true
      try {
         await AuthService.deleteItem('organisms', pendingAdminDeleteOrg.value.taxid)
         init({ message: `${pendingAdminDeleteOrg.value.scientific_name} deleted.`, color: 'success' })
         showAdminDeleteModal.value = false
         await fetchData()
      } catch (err) {
         const ax = err as AxiosError
         init({ message: (ax.response?.data as string) ?? 'Deletion failed.', color: 'danger' })
      } finally { deletingOrg.value = false }
   }

   onMounted(async () => {
      if (isAdmin.value) await fetchUsers()
      await fetchData()
   })
</script>

<style lang="scss" scoped>
   .cms-species-modal__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.35;
      color: var(--cms-text);

      &--danger {
         color: var(--cms-danger);
      }
   }
</style>
