<template>
   <div class="cms-user-form" :class="{ 'cms-user-form--embedded': embedded }">
      <header v-if="!embedded" class="cms-user-form__header">
         <div class="cms-page-header">
            <h1 class="cms-page-header__title">{{ props.name ? `Edit ${props.name}` : 'Create User' }}</h1>
            <p class="cms-page-header__desc">
               {{ props.name ? 'Update user account details and organism assignments.' : 'Add a new portal user and optionally assign species to them.' }}
            </p>
         </div>
      </header>

      <section class="cms-user-form__section" aria-labelledby="user-details-heading">
         <CmsSectionCard
            title="Account details"
            description="Basic account information for this user."
         >
            <form
               id="cms-user-mgmt-form"
               class="cms-user-form__fields"
               autocomplete="off"
               data-lpignore="true"
               data-1p-ignore
               data-bwignore
               @submit.prevent
            >
               <CmsInput
                  ref="usernameInputRef"
                  v-model="user.name"
                  label="Username"
                  required
                  :name="`cms-user-form-username-${formFieldSuffix}`"
                  autocomplete="section-cms-user-mgmt organization"
                  :disabled="!!props.name"
                  :error="!!fieldErrors.name"
                  :error-message="fieldErrors.name"
               />
               <template v-if="passwordSectionVisible">
                  <CmsInput
                     ref="passwordInputRef"
                     v-model="user.password"
                     label="Password"
                     type="password"
                     required
                     :name="`cms-user-form-password-${formFieldSuffix}`"
                     autocomplete="section-cms-user-mgmt new-password"
                     :error="!!fieldErrors.password"
                     :error-message="fieldErrors.password"
                  />
                  <CmsBtn
                     v-if="isAdminEditingDataManager && showPasswordFields"
                     variant="secondary"
                     size="sm"
                     class="cms-user-form__password-cancel"
                     type="button"
                     @click="cancelPasswordChange"
                  >
                     Keep existing password
                  </CmsBtn>
               </template>
               <div v-else class="cms-user-form__password-gate">
                  <CmsInlineAlert type="info" message="Password is not shown by default. You can save email and species assignments without changing this user’s password." />
                  <CmsBtn variant="secondary" size="sm" type="button" @click="confirmPasswordChange">
                     Change password
                  </CmsBtn>
               </div>
               <CmsInput
                  v-model="user.email"
                  label="Email address"
                  type="email"
                  required
                  :name="`cms-user-form-email-${formFieldSuffix}`"
                  autocomplete="section-cms-user-mgmt work email"
                  :error="!!fieldErrors.email"
                  :error-message="fieldErrors.email"
               />
               <CmsSelect
                  v-model="user.role"
                  label="Role"
                  required
                  :options="roleOptions"
               />
            </form>
         </CmsSectionCard>
      </section>

      <section
         v-if="user.role === 'DataManager'"
         class="cms-user-form__section"
         aria-labelledby="organism-assignment-heading"
      >
         <CmsSectionCard>
            <template #header>
               <h2 id="organism-assignment-heading" class="cms-organism-block__title">Organism assignment</h2>
               <p class="cms-organism-block__lead">
                  Search the catalogue, add species with one click, or remove them from the assigned list. Use the filter to narrow
                  assigned species.
               </p>
            </template>

            <div class="cms-user-assignment">
               <!-- Available -->
               <div class="cms-user-assignment__column">
                  <div class="cms-user-assignment__column-head">
                     <h3 class="cms-user-assignment__column-title">Available</h3>
                     <CmsCheckbox v-model="onlyUnassigned" label="Unassigned only" @update:model-value="onToggleFilter" />
                  </div>
                  <div class="cms-user-assignment__search-wrap">
                     <CmsSearchInput
                        v-model="searchFilter"
                        field-name="cms-user-form-org-search"
                        placeholder="Search by species name or taxid"
                        autocomplete="off"
                        @update:model-value="debouncedSearch"
                        @clear="onClearSearch"
                     />
                  </div>

                  <div class="cms-user-assignment__list-shell">
                     <div v-if="searchLoading" class="cms-user-assignment__loading" aria-busy="true">
                        <span class="cms-user-assignment__spinner" />
                        <span>Loading…</span>
                     </div>
                     <template v-else-if="availableOrganisms.length === 0">
                        <div class="cms-user-assignment__empty" role="status">
                           <svg class="cms-user-assignment__empty-ico" width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="1.5"/>
                              <path d="M14.5 14.5L20 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                           </svg>
                           <p>No organisms match this search.</p>
                        </div>
                     </template>
                     <ul v-else class="cms-user-assignment__list" role="list">
                        <li
                           v-for="org in availableOrganisms"
                           :key="org.taxid"
                           role="listitem"
                           class="cms-user-assignment__row"
                           :class="{ 'cms-user-assignment__row--on-assigned': isAssigned(org.taxid) }"
                        >
                           <div class="cms-user-assignment__row-main">
                              <span class="cms-user-assignment__sci-name">{{ org.scientific_name }}</span>
                              <span class="cms-user-assignment__taxid">{{ org.taxid }}</span>
                           </div>
                           <div class="cms-user-assignment__row-meta">
                              <CmsStatusPill v-if="org.goat_status" :value="org.goat_status" type="goat" />
                           </div>
                           <div class="cms-user-assignment__row-action">
                              <CmsBtn
                                 v-if="!isAssigned(org.taxid)"
                                 variant="primary"
                                 size="sm"
                                 icon="fa-plus"
                                 type="button"
                                 :aria-label="`Assign ${org.scientific_name}`"
                                 @click="assignOrganism(org)"
                              />
                              <span v-else class="cms-user-assignment__badge-assigned" aria-label="Already assigned">
                                 <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                    <path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                                 </svg>
                                 Assigned
                              </span>
                           </div>
                        </li>
                     </ul>
                  </div>

                  <div v-if="searchTotal > searchLimit" class="cms-user-assignment__pagination">
                     <CmsPagination
                        v-model="searchPage"
                        :total="searchTotal"
                        :page-size="searchLimit"
                        @update:model-value="onSearchPage"
                     />
                  </div>
               </div>

               <!-- Assigned -->
               <div class="cms-user-assignment__column">
                  <div class="cms-user-assignment__column-head">
                     <h3 class="cms-user-assignment__column-title">
                        Assigned
                        <span class="cms-user-assignment__count">{{ assignedOrganisms.length }}</span>
                     </h3>
                  </div>
                  <div class="cms-user-assignment__search-wrap">
                     <CmsSearchInput
                        v-model="assignedFilter"
                        field-name="cms-user-form-assigned-filter"
                        placeholder="Filter assigned species"
                        autocomplete="off"
                     />
                  </div>

                  <div class="cms-user-assignment__list-shell">
                     <div v-if="filteredAssigned.length === 0" class="cms-user-assignment__empty" role="status">
                        <svg class="cms-user-assignment__empty-ico" width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                           <path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12z" stroke="currentColor" stroke-width="1.5"/>
                           <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        <p v-if="assignedOrganisms.length === 0">No species assigned yet. Add from the left.</p>
                        <p v-else>No matches for this filter.</p>
                     </div>
                     <ul v-else class="cms-user-assignment__list cms-user-assignment__list--assigned" role="list">
                        <li
                           v-for="org in filteredAssigned"
                           :key="org.taxid"
                           role="listitem"
                           class="cms-user-assignment__row cms-user-assignment__row--assigned"
                        >
                           <div class="cms-user-assignment__row-main">
                              <span class="cms-user-assignment__sci-name">{{ org.scientific_name }}</span>
                              <span class="cms-user-assignment__taxid">{{ org.taxid }}</span>
                           </div>
                           <div class="cms-user-assignment__row-meta">
                              <CmsStatusPill v-if="org.goat_status" :value="org.goat_status" type="goat" />
                           </div>
                           <div class="cms-user-assignment__row-action">
                              <CmsBtn
                                 variant="danger"
                                 size="sm"
                                 icon="fa-minus"
                                 type="button"
                                 :aria-label="`Remove ${org.scientific_name}`"
                                 @click="unassignOrganism(org)"
                              />
                           </div>
                        </li>
                     </ul>
                  </div>
               </div>
            </div>
         </CmsSectionCard>
      </section>

      <footer class="cms-user-form__footer">
         <CmsBtn
            v-if="embedded"
            variant="danger"
            type="button"
            @click="drawer.close()"
         >
            Cancel
         </CmsBtn>
         <CmsBtn
            v-else
            variant="danger"
            :to="{ name: 'admin' }"
         >
            Cancel
         </CmsBtn>
         <CmsBtn
            variant="primary"
            :loading="isSubmitting"
            :disabled="!isValid"
            type="button"
            @click="handleSubmit"
         >
            {{ props.name ? 'Save changes' : 'Create user' }}
         </CmsBtn>
      </footer>
   </div>
</template>

<script setup lang="ts">
   import { computed, nextTick, onMounted, reactive, ref, watch, withDefaults } from 'vue'
   import { useRouter } from 'vue-router'
   import { useToast } from 'vuestic-ui'
   import { AxiosError } from 'axios'
   import AuthService from '../../../services/AuthService'
   import ItemService from '../../../services/CommonService'
   import OrganismService from '../../../services/OrganismService'
   import { useCmsDashboardDrawerStore } from '../../../stores/cms-dashboard-drawer-store'
   import { useGlobalStore } from '../../../stores/global-store'
   import CmsSectionCard from '../ui/CmsSectionCard.vue'
   import CmsInput from '../ui/CmsInput.vue'
   import CmsSelect from '../ui/CmsSelect.vue'
   import CmsBtn from '../ui/CmsBtn.vue'
   import CmsSearchInput from '../dashboard/CmsSearchInput.vue'
   import CmsPagination from '../dashboard/CmsPagination.vue'
   import CmsInlineAlert from '../ui/CmsInlineAlert.vue'
   import CmsCheckbox from '../ui/CmsCheckbox.vue'
   import CmsStatusPill from '../dashboard/CmsStatusPill.vue'

   const props = withDefaults(defineProps<{ name?: string; embedded?: boolean }>(), { embedded: false })
   const drawer = useCmsDashboardDrawerStore()
   const globalStore = useGlobalStore()
   const router = useRouter()
   const { init } = useToast()

   const formFieldSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

   const usernameInputRef = ref<InstanceType<typeof CmsInput> | null>(null)
   const passwordInputRef = ref<InstanceType<typeof CmsInput> | null>(null)

   const user = reactive({
      name: '',
      password: '',
      role: 'DataManager' as 'DataManager' | 'Admin',
      email: '',
      species: [] as string[], // present when API loads user
   })

   const roleOptions = [
      { label: 'Data manager', value: 'DataManager' },
      { label: 'Admin', value: 'Admin' },
   ]

   const isAdminEditingDataManager = computed(
      () =>
         !!props.name &&
         globalStore.userRole === 'Admin' &&
         user.role === 'DataManager',
   )

   const showPasswordFields = ref(false)

   const passwordSectionVisible = computed(
      () => !isAdminEditingDataManager.value || showPasswordFields.value,
   )

   const fieldErrors = computed(() => {
      const name = !user.name?.trim() ? 'Username is required' : ''
      let email = ''
      if (!user.email?.trim()) email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim())) email = 'Enter a valid email address'
      let password = ''
      if (!passwordSectionVisible.value) {
         /* omit */
      } else if (!props.name) {
         if (!user.password?.trim()) password = 'Password is required'
      } else if (isAdminEditingDataManager.value && !showPasswordFields.value) {
         /* omit */
      } else if (!user.password?.trim()) {
         password = 'Password is required'
      }
      return { name, email, password }
   })

   const isValid = computed(() => {
      if (!user.name?.trim() || !user.email?.trim()) return false
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim())) return false
      if (!props.name) return !!user.password?.trim()
      if (isAdminEditingDataManager.value && !showPasswordFields.value) return true
      return !!user.password?.trim()
   })

   const isSubmitting = ref(false)

   function confirmPasswordChange() {
      showPasswordFields.value = true
   }

   function cancelPasswordChange() {
      user.password = ''
      showPasswordFields.value = false
   }

   function applyReadonlyAutofillGuard(vaRef: typeof usernameInputRef) {
      nextTick(() => {
         const root = vaRef.value?.$el as HTMLElement | undefined
         const inp = root?.querySelector?.('input') as HTMLInputElement | undefined | null
         if (!inp || inp.disabled) return
         inp.setAttribute('readonly', 'readonly')
         const onFocus = () => {
            inp.removeAttribute('readonly')
            inp.removeEventListener('focus', onFocus)
         }
         inp.addEventListener('focus', onFocus)
      })
   }

   function scheduleAutofillGuards() {
      applyReadonlyAutofillGuard(usernameInputRef)
      if (passwordSectionVisible.value) {
         applyReadonlyAutofillGuard(passwordInputRef)
      }
      window.setTimeout(() => {
         applyReadonlyAutofillGuard(usernameInputRef)
         if (passwordSectionVisible.value) {
            applyReadonlyAutofillGuard(passwordInputRef)
         }
      }, 100)
   }

   const searchFilter = ref('')
   const onlyUnassigned = ref(true)
   const searchPage = ref(1)
   const searchLimit = 8
   const searchTotal = ref(0)
   const availableOrganisms = ref<Record<string, any>[]>([])
   const searchLoading = ref(false)

   const assignedOrganisms = ref<Record<string, any>[]>([])
   const assignedFilter = ref('')

   const filteredAssigned = computed(() => {
      const q = assignedFilter.value.toLowerCase()
      if (!q) return assignedOrganisms.value
      return assignedOrganisms.value.filter(
         (o) =>
            o.scientific_name?.toLowerCase().includes(q) ||
            String(o.taxid).includes(q),
      )
   })

   function isAssigned(taxid: string | number) {
      return assignedOrganisms.value.some((o) => String(o.taxid) === String(taxid))
   }

   function assignOrganism(org: Record<string, any>) {
      if (!isAssigned(org.taxid)) {
         assignedOrganisms.value.push(org)
      }
   }

   function unassignOrganism(org: Record<string, any>) {
      assignedOrganisms.value = assignedOrganisms.value.filter(
         (o) => String(o.taxid) !== String(org.taxid),
      )
   }

   function debounce<T extends (...args: any[]) => void>(fn: T, ms = 350) {
      let t: ReturnType<typeof setTimeout>
      return (...args: Parameters<T>) => {
         clearTimeout(t)
         t = setTimeout(() => fn(...args), ms)
      }
   }

   async function fetchAvailableOrganisms() {
      searchLoading.value = true
      try {
         const params = {
            filter: searchFilter.value,
            limit: searchLimit,
            offset: (searchPage.value - 1) * searchLimit,
         }
         if (onlyUnassigned.value) {
            const { data } = await OrganismService.getUnassignedOrganisms(params)
            availableOrganisms.value = data.data ?? []
            searchTotal.value = data.total ?? 0
         } else {
            const { data } = await ItemService.getItems('organisms', params)
            availableOrganisms.value = data.data ?? []
            searchTotal.value = data.total ?? 0
         }
      } catch {
         availableOrganisms.value = []
      } finally {
         searchLoading.value = false
      }
   }

   const debouncedSearch = debounce(() => {
      searchPage.value = 1
      fetchAvailableOrganisms()
   })

   function onClearSearch() {
      searchFilter.value = ''
      searchPage.value = 1
      fetchAvailableOrganisms()
   }

   function onToggleFilter() {
      searchPage.value = 1
      fetchAvailableOrganisms()
   }

   function onSearchPage() {
      fetchAvailableOrganisms()
   }

   async function loadUser() {
      try {
         const { data } = await AuthService.getUser(props.name!)
         Object.assign(user, data)
         if (user.role === 'DataManager') {
            await loadAssignedOrganisms()
         }
      } catch (err) {
         const ax = err as AxiosError
         const msg =
            ax.response?.status === 403
               ? 'You cannot view or edit this account.'
               : (ax.response?.data as string) ?? 'Failed to load user.'
         init({ message: String(msg), color: 'danger' })
         if (props.embedded) {
            drawer.close()
         } else {
            router.push({ name: 'admin' })
         }
      }
   }

   async function loadAssignedOrganisms() {
      const { data } = await AuthService.getUserSpecies(user.name, { limit: 1000 })
      assignedOrganisms.value = data.data ?? []
   }

   watch(
      () => user.role,
      async (role) => {
         if (role === 'DataManager' && user.name) {
            await loadAssignedOrganisms()
         }
      },
   )

   watch(passwordSectionVisible, (vis) => {
      if (vis) scheduleAutofillGuards()
   })

   onMounted(async () => {
      if (props.name) {
         await loadUser()
      }
      await fetchAvailableOrganisms()
      scheduleAutofillGuards()
   })

   async function handleSubmit() {
      isSubmitting.value = true
      try {
         const species = assignedOrganisms.value.map((o) => String(o.taxid))
         const payload: Record<string, unknown> = {
            name: user.name,
            role: user.role,
            email: user.email,
            species,
         }
         const omitPassword =
            !!props.name && isAdminEditingDataManager.value && !showPasswordFields.value
         if (!omitPassword) {
            payload.password = user.password
         }
         if (props.name) {
            await AuthService.updateUser(props.name, payload)
            init({ message: `${user.name} updated successfully.`, color: 'success' })
         } else {
            await AuthService.createUser(payload)
            init({ message: `${user.name} created successfully.`, color: 'success' })
         }
         if (props.embedded) {
            drawer.close()
         } else {
            router.push({ name: 'admin' })
         }
      } catch (err: any) {
         const msg = err?.response?.data ?? 'Something went wrong. Please try again.'
         init({ message: String(msg), color: 'danger' })
      } finally {
         isSubmitting.value = false
      }
   }
</script>

<style lang="scss" scoped>
   .cms-user-form {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 2rem;
      font-family: var(--cms-font);
      color: var(--cms-text);

      &--embedded {
         max-width: 100%;
         padding: 0 1rem 1.5rem;
         margin: 0;
      }
   }

   .cms-user-form__header {
      padding-top: 0.25rem;
   }

   .cms-user-form__section {
      display: flex;
      flex-direction: column;
      gap: 0;
   }

   .cms-user-form__fields {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;

      @media (max-width: 640px) {
         grid-template-columns: 1fr;
      }
   }

   .cms-user-form__password-gate {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
   }

   .cms-user-form__password-cancel {
      grid-column: 1 / -1;
      justify-self: start;
   }

   /* Assignment — two columns, dashboard-aligned tokens */
   .cms-user-assignment {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      align-items: start;

      @media (max-width: 900px) {
         grid-template-columns: 1fr;
      }
   }

   .cms-user-assignment__column {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 0;
   }

   .cms-user-assignment__column-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
   }

   .cms-user-assignment__column-title {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--cms-text);
      line-height: 1.3;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
   }

   .cms-user-assignment__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.35rem;
      height: 1.35rem;
      padding: 0 0.35rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      background: var(--cms-primary-soft);
      color: var(--cms-primary-text);
   }

   .cms-user-assignment__search-wrap {
      width: 100%;

      :deep(.cms-search) {
         max-width: none;
      }
   }

   .cms-user-assignment__list-shell {
      position: relative;
      border: 1px solid var(--cms-border);
      border-radius: var(--cms-radius-sm);
      background: var(--cms-bg-muted);
      min-height: 280px;
   }

   .cms-user-assignment__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 200px;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
   }

   @keyframes cms-user-spin {
      to { transform: rotate(360deg); }
   }

   .cms-user-assignment__spinner {
      width: 22px;
      height: 22px;
      border: 2px solid var(--cms-border-strong);
      border-top-color: var(--cms-primary);
      border-radius: 50%;
      animation: cms-user-spin 0.7s linear infinite;
   }

   .cms-user-assignment__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 200px;
      padding: 1rem;
      text-align: center;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);

      p {
         margin: 0;
         max-width: 16rem;
         line-height: 1.45;
      }
   }

   .cms-user-assignment__empty-ico {
      color: var(--cms-text-faint);
      opacity: 0.55;
   }

   .cms-user-assignment__list {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 360px;
      overflow-y: auto;
   }

   .cms-user-assignment__row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid var(--cms-border);
      background: var(--cms-bg-surface);
      transition: background 0.1s;

      &:last-child {
         border-bottom: none;
      }

      &:hover {
         background: var(--cms-bg-hover);
      }

      &--on-assigned {
         background: var(--cms-success-soft);
      }

      &--assigned {
         grid-template-columns: 1fr auto auto;
      }
   }

   .cms-user-assignment__row-main {
      min-width: 0;
   }

   .cms-user-assignment__sci-name {
      display: block;
      font-style: italic;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--cms-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
   }

   .cms-user-assignment__taxid {
      font-size: 0.75rem;
      color: var(--cms-text-muted);
      font-family: var(--cms-font-mono);
   }

   .cms-user-assignment__row-meta {
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
   }

   .cms-user-assignment__row-action {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
   }

   .cms-user-assignment__badge-assigned {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--cms-success-text);
      white-space: nowrap;
   }

   .cms-user-assignment__pagination {
      padding-top: 0.25rem;
   }

   .cms-user-form__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--cms-border);
   }
</style>
