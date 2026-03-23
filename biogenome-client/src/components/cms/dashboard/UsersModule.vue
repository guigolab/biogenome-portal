<template>
   <section aria-labelledby="users-module-title">
      <CmsCard
         title="Users"
         description="Manage curator accounts — create, edit, or remove portal users."
         icon="fa-users"
         color="slate"
         :loading="isLoading"
      >
         <template #actions>
            <CmsBtn icon="fa-user-plus" variant="primary" @click="drawer.open({ panel: 'user' })">
               New User
            </CmsBtn>
         </template>

         <template #filters>
            <CmsSearchInput
               v-model="filter"
               field-name="cms-users-module-filter"
               placeholder="Filter by name or email…"
               @update:model-value="debouncedFetch"
            />
         </template>

         <template v-if="!isLoading">
            <DashboardEmptyState
               v-if="users.length === 0"
               icon="fa-users"
               title="No users found"
               description="No users match your current filter."
            >
               <template #actions>
                  <CmsBtn icon="fa-user-plus" variant="primary" @click="drawer.open({ panel: 'user' })">
                     New User
                  </CmsBtn>
               </template>
            </DashboardEmptyState>

            <ul v-else class="cms-user-list" role="list">
               <li
                  v-for="user in users"
                  :key="user.name"
                  class="cms-user-card"
               >
                  <!-- Avatar -->
                  <span class="cms-user-card__avatar" aria-hidden="true">
                     {{ user.name?.charAt(0)?.toUpperCase() ?? '?' }}
                  </span>

                  <!-- Identity -->
                  <div class="cms-user-card__identity">
                     <span class="cms-user-card__name">{{ user.name }}</span>
                     <a
                        v-if="user.email"
                        :href="`mailto:${user.email}`"
                        class="cms-user-card__email"
                     >{{ user.email }}</a>
                     <span v-else class="cms-user-card__email cms-user-card__email--empty">—</span>
                  </div>

                  <!-- Role pill -->
                  <span class="cms-role-pill" :class="`cms-role-pill--${user.role?.toLowerCase()}`">
                     {{ user.role ?? '—' }}
                  </span>

                  <!-- Actions: admins may edit/delete DataManagers; only self among admins -->
                  <div class="cms-user-card__actions">
                     <template v-if="canEditUser(user)">
                        <CmsBtn
                           icon="fa-edit"
                           variant="secondary"
                           :title="editButtonTitle(user)"
                           @click="drawer.open({ panel: 'user', userName: user.name })"
                        />
                     </template>
                     <template v-if="canDeleteUser(user)">
                        <CmsBtn
                           icon="fa-trash"
                           variant="danger"
                           :title="`Delete ${user.name}`"
                           @click="promptDelete(user)"
                        />
                     </template>
                     <span
                        v-if="!canEditUser(user) && user.role === 'Admin'"
                        class="cms-user-card__protected"
                        title="Other admin accounts cannot be edited here"
                     >—</span>
                  </div>
               </li>
            </ul>
         </template>

         <template v-if="!isLoading && total > limit" #footer>
            <CmsPagination
               v-model="currentPage"
               :total="total"
               :page-size="limit"
               @update:model-value="fetchData"
            />
         </template>
      </CmsCard>

      <CmsModal v-model="showDeleteModal">
         <template #header="{ titleId }">
            <h3 :id="titleId" class="cms-modal-heading cms-modal-heading--danger">Delete user</h3>
         </template>
         <p>
            Are you sure you want to permanently delete
            <strong>{{ pendingDeleteUser?.name }}</strong>?
            This action cannot be undone.
         </p>
         <template #footer>
            <CmsBtn variant="secondary" @click="showDeleteModal = false">Cancel</CmsBtn>
            <CmsBtn variant="danger" :loading="deleting" @click="confirmDelete">
               Delete user
            </CmsBtn>
         </template>
      </CmsModal>
   </section>
</template>

<script setup lang="ts">
   import { onMounted, ref } from 'vue'
   import { useCmsDashboardDrawerStore } from '../../../stores/cms-dashboard-drawer-store'
   import { useToast } from 'vuestic-ui'
   import { AxiosError } from 'axios'
   import { useGlobalStore } from '../../../stores/global-store'
   import AuthService from '../../../services/AuthService'
   import CmsCard from './CmsCard.vue'
   import CmsBtn from '../ui/CmsBtn.vue'
   import CmsSearchInput from './CmsSearchInput.vue'
   import CmsPagination from './CmsPagination.vue'
   import DashboardEmptyState from './DashboardEmptyState.vue'
   import CmsModal from '../ui/CmsModal.vue'

   const globalStore = useGlobalStore()
   const drawer = useCmsDashboardDrawerStore()
   const { init } = useToast()

   const users = ref<Record<string, any>[]>([])
   const total = ref(0)
   const isLoading = ref(false)
   const filter = ref('')
   const currentPage = ref(1)
   const limit = 8

   const showDeleteModal = ref(false)
   const pendingDeleteUser = ref<Record<string, any> | null>(null)
   const deleting = ref(false)

   /** DataManagers: editable; Admins: only your own account. Root is omitted from the API list. */
   function canEditUser(user: Record<string, any>) {
      if (user.role === 'DataManager') return true
      if (user.role === 'Admin' && user.name === globalStore.userName) return true
      return false
   }

   function canDeleteUser(user: Record<string, any>) {
      if (user.name === globalStore.userName) return false
      if (user.role === 'Admin') return false
      return true
   }

   function editButtonTitle(user: Record<string, any>) {
      if (user.role === 'DataManager') {
         return `Edit ${user.name} — assigning species does not require changing their password`
      }
      return `Edit ${user.name}`
   }

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
         const { data } = await AuthService.getUsers({
            filter: filter.value,
            limit,
            offset: (currentPage.value - 1) * limit,
         })
         users.value = data.data ?? []
         total.value = data.total ?? 0
      } catch {
         users.value = []
      } finally {
         isLoading.value = false
      }
   }

   const debouncedFetch = debounce(() => {
      currentPage.value = 1
      fetchData()
   })

   function promptDelete(user: Record<string, any>) {
      pendingDeleteUser.value = user
      showDeleteModal.value = true
   }

   async function confirmDelete() {
      if (!pendingDeleteUser.value?.name) return
      deleting.value = true
      try {
         await AuthService.deleteUser(pendingDeleteUser.value.name)
         init({ message: `${pendingDeleteUser.value.name} deleted.`, color: 'success' })
         showDeleteModal.value = false
         currentPage.value = 1
         await fetchData()
      } catch (err) {
         const ax = err as AxiosError
         init({ message: (ax.response?.data as string) ?? 'Deletion failed.', color: 'danger' })
      } finally {
         deleting.value = false
      }
   }

   onMounted(fetchData)
</script>

<style lang="scss" scoped>
   /* ─── User card list ─── */
   .cms-user-list {
      list-style: none;
      margin: 0;
      padding: 0;
   }

   .cms-user-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 1.1rem;
      transition: background 0.1s;

      & + & { border-top: 1px solid var(--cms-border); }
      &:hover { background: var(--cms-bg-hover); }
   }

   /* Avatar circle */
   .cms-user-card__avatar {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--cms-slate);
      color: var(--cms-text-on-dark);
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
   }

   /* Identity block */
   .cms-user-card__identity {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
   }

   .cms-user-card__name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--cms-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
   }

   .cms-user-card__email {
      font-size: 0.75rem;
      color: var(--cms-text-muted);
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &:not(&--empty):hover {
         color: var(--cms-primary);
         text-decoration: underline;
      }

      &--empty { color: var(--cms-text-faint); }
   }

   /* Role pill */
   .cms-role-pill {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
      background: var(--cms-border);
      color: var(--cms-text-muted);
      white-space: nowrap;

      &--admin {
         background: var(--cms-slate-soft);
         color: var(--cms-slate-text);
      }

      &--datamanager {
         background: var(--cms-info-soft);
         color: var(--cms-info-text);
      }
   }

   /* Actions */
   .cms-user-card__actions {
      flex-shrink: 0;
      display: flex;
      gap: 0.3rem;
      align-items: center;
   }

   .cms-user-card__protected {
      font-size: 0.75rem;
      color: var(--cms-text-faint);
      padding: 0 0.35rem;
      cursor: help;
   }

   .cms-modal-heading {
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
