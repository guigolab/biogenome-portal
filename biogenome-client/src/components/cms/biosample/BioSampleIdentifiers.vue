<template>
   <div class="bsi">
      <!-- Selected organism context banner -->
      <div v-if="sampleStore.scientificName && sampleStore.taxid" class="bsi__context">
         <div class="bsi__context-text">
            <span class="bsi__context-label">Selected organism</span>
            <h3 class="bsi__context-name">{{ sampleStore.scientificName }}</h3>
            <p class="bsi__context-meta">Taxid <span class="bsi__context-taxid">{{ sampleStore.taxid }}</span></p>
         </div>
         <div class="bsi__context-actions">
            <CmsBtn variant="secondary" icon="fa-rotate-left" @click="resetOrganismSelection">
               Change organism
            </CmsBtn>
         </div>
      </div>

      <!-- Organism searchable select -->
      <template v-else>
         <div class="bsi__section-header">
            <span class="bsi__section-mode">
               {{ isAdmin ? 'All portal species' : 'Your assigned species' }}
            </span>
            <p class="bsi__section-hint">
               <template v-if="isAdmin">
                  Search and select any organism in the portal.
               </template>
               <template v-else>
                  Search and select only species assigned to your account.
               </template>
               If the organism does not exist yet,
               <RouterLink :to="{ name: 'create-organism' }" class="bsi__link">create a new organism</RouterLink>.
            </p>
         </div>

         <div class="bsi__field-group">
            <label class="bsi__field-label" for="bsi-organism-search">
               Organism <span class="bsi__field-required">*</span>
            </label>
            <div class="bsi__input-wrap" :class="{ 'bsi__input-wrap--error': organismError }">
               <svg class="bsi__input-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5" />
                  <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
               </svg>
               <input
                  id="bsi-organism-search"
                  class="bsi__input"
                  :placeholder="isAdmin ? 'Search any species by name or taxid...' : 'Search your assigned species...'"
                  autocomplete="off"
                  v-model="organismSearch"
                  @focus="showDropdown = true"
                  @input="onOrganismSearchInput"
               />
            </div>

            <div v-if="showDropdown" class="bsi__dropdown">
               <div v-if="organismLoading" class="bsi__dropdown-empty">Loading species...</div>
               <template v-else>
                  <button
                     v-for="item in filteredSpecies"
                     :key="item.taxid"
                     class="bsi__dropdown-item"
                     type="button"
                     @click="selectOrganism(item)"
                  >
                     <span class="bsi__dropdown-name">{{ item.scientific_name }}</span>
                     <span class="bsi__dropdown-taxid">taxid {{ item.taxid }}</span>
                  </button>
                  <div v-if="!filteredSpecies.length" class="bsi__dropdown-empty">
                     No species found.
                  </div>
               </template>
            </div>
            <p v-if="organismError" class="bsi__field-error" role="alert">{{ organismError }}</p>
         </div>
      </template>

      <!-- Sample identifier input -->
      <div class="bsi__field-group">
         <label class="bsi__field-label" for="bsi-sample-id">
            Sample Identifier <span class="bsi__field-required">*</span>
         </label>
         <p class="bsi__field-hint">A unique internal label for this biosample (e.g. BGE_12345_A).</p>
         <div class="bsi__input-wrap" :class="{ 'bsi__input-wrap--error': identifierError }">
            <svg class="bsi__input-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
               <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.4" />
               <path d="M5 7h6M5 10h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
            </svg>
            <input
               id="bsi-sample-id"
               class="bsi__input"
               placeholder="e.g. BGE_12345_A"
               autocomplete="off"
               v-model="sampleStore.sampleIdentifier"
               @input="identifierError = ''"
            />
         </div>
         <p v-if="identifierError" class="bsi__field-error" role="alert">{{ identifierError }}</p>
      </div>
   </div>
</template>

<script setup lang="ts">
   import { useSampleStore } from '../../../stores/sample-store'
   import CmsBtn from '../ui/CmsBtn.vue'
   import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
   import { RouterLink } from 'vue-router'
   import { useGlobalStore } from '../../../stores/global-store'
   import CommonService from '../../../services/CommonService'

   type SpeciesOption = {
      taxid: string
      scientific_name: string
   }

   const sampleStore = useSampleStore()
   const globalStore = useGlobalStore()
   const isAdmin = computed(() => globalStore.userRole === 'Admin')

   const allSpecies = ref<SpeciesOption[]>([])
   const organismSearch = ref('')
   const organismLoading = ref(false)
   const showDropdown = ref(false)
   const searchDebounce = ref<ReturnType<typeof setTimeout> | null>(null)

   const identifierError = ref('')
   const organismError = ref('')

   const filteredSpecies = computed(() => {
      const q = organismSearch.value.trim().toLowerCase()
      const source = allSpecies.value
      if (!q) return source.slice(0, 80)
      return source
         .filter(
            (s) =>
               s.scientific_name.toLowerCase().includes(q) ||
               String(s.taxid).includes(q),
         )
         .slice(0, 80)
   })

   function resetOrganismSelection() {
      sampleStore.scientificName = ''
      sampleStore.taxid = ''
      organismError.value = ''
      organismSearch.value = ''
      showDropdown.value = true
   }

   function selectOrganism(item: SpeciesOption) {
      sampleStore.scientificName = item.scientific_name
      sampleStore.taxid = item.taxid
      organismError.value = ''
      showDropdown.value = false
      organismSearch.value = ''
   }

   async function fetchAdminSpecies(query = '') {
      organismLoading.value = true
      try {
         const { data } = await CommonService.getItems('organisms', {
            filter: query,
            page_size: 150,
         })
         const rows = Array.isArray(data?.data) ? data.data : []
         allSpecies.value = rows.map((r: { taxid: string | number; scientific_name?: string }) => ({
            taxid: String(r.taxid),
            scientific_name: r.scientific_name ?? `Taxon ${r.taxid}`,
         }))
      } finally {
         organismLoading.value = false
      }
   }

   async function fetchAssignedSpecies() {
      organismLoading.value = true
      try {
         const taxids = (globalStore.userSpecies || []).map(String)
         const responses = await Promise.all(
            taxids.map(async (taxid) => {
               try {
                  const { data } = await CommonService.getItem('organisms', taxid)
                  return {
                     taxid: String(data?.taxid ?? taxid),
                     scientific_name: data?.scientific_name ?? `Taxon ${taxid}`,
                  } as SpeciesOption
               } catch {
                  return null
               }
            }),
         )
         allSpecies.value = responses.filter((v): v is SpeciesOption => Boolean(v))
      } finally {
         organismLoading.value = false
      }
   }

   function onOrganismSearchInput() {
      organismError.value = ''
      showDropdown.value = true
      if (!isAdmin.value) return
      if (searchDebounce.value) clearTimeout(searchDebounce.value)
      searchDebounce.value = setTimeout(() => {
         void fetchAdminSpecies(organismSearch.value.trim())
      }, 300)
   }

   onMounted(async () => {
      if (isAdmin.value) {
         await fetchAdminSpecies()
      } else {
         await fetchAssignedSpecies()
      }
   })

   onBeforeUnmount(() => {
      if (searchDebounce.value) clearTimeout(searchDebounce.value)
   })

   /** Called by ENAUpload before advancing to the next step. */
   function validate(): boolean {
      organismError.value = sampleStore.scientificName ? '' : 'Please select an organism before continuing.'
      identifierError.value = sampleStore.sampleIdentifier.trim()
         ? ''
         : 'Sample identifier is required.'
      return !organismError.value && !identifierError.value
   }

   defineExpose({ validate })
</script>

<style lang="scss" scoped>
   .bsi {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
   }

   /* Context banner (organism selected) */
   .bsi__context {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: var(--cms-bg-muted);
      border: 1px solid var(--cms-border);
      border-radius: 10px;
      border-left: 3px solid var(--cms-primary);
      font-family: var(--cms-font);
   }

   .bsi__context-text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
   }

   .bsi__context-label {
      display: block;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--cms-text-muted);
   }

   .bsi__context-name {
      font-size: 1.0625rem;
      font-weight: 600;
      margin: 0;
      line-height: 1.3;
      color: var(--cms-text);
   }

   .bsi__context-meta {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
   }

   .bsi__context-taxid {
      font-weight: 600;
      color: var(--cms-text);
      font-family: var(--cms-font-mono);
   }

   .bsi__context-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
   }

   /* Section header (organism search intro) */
   .bsi__section-header {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
   }

   .bsi__section-mode {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--cms-text-muted);
      background: var(--cms-bg-muted);
      border: 1px solid var(--cms-border);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-family: var(--cms-font);
   }

   .bsi__section-hint {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--cms-text-muted);
      font-family: var(--cms-font);
   }

   .bsi__link {
      color: var(--cms-primary);
      text-decoration: underline;
      text-underline-offset: 2px;

      &:hover { color: var(--cms-primary-hover); }
   }

   /* Organism field wrapper (for error state) */
   .bsi__field-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      &--error {
         border-radius: 8px;
         outline: 1.5px solid var(--cms-danger);
         outline-offset: 3px;
      }
   }

   /* Field group (label + input) */
   .bsi__field-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      position: relative;
      font-family: var(--cms-font);
   }

   .bsi__field-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--cms-text);
   }

   .bsi__field-required { color: var(--cms-danger); }

   .bsi__field-hint {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
   }

   /* Custom input */
   .bsi__input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--cms-bg-surface);
      border: 1.5px solid var(--cms-border-strong);
      border-radius: 8px;
      transition: border-color 0.15s ease;

      &:focus-within {
         border-color: var(--cms-primary);
         box-shadow: var(--cms-focus-ring);
      }

      &--error {
         border-color: var(--cms-danger);
         &:focus-within { border-color: var(--cms-danger); box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }
      }
   }

   .bsi__input-icon {
      flex-shrink: 0;
      margin-left: 0.75rem;
      color: var(--cms-text-faint);
      pointer-events: none;
   }

   .bsi__input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      padding: 0.625rem 0.75rem;
      font-size: 0.9375rem;
      color: var(--cms-text);
      font-family: var(--cms-font);

      &::placeholder { color: var(--cms-text-faint); }
   }

   .bsi__dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 10;
      background: var(--cms-bg-surface);
      border: 1px solid var(--cms-border-strong);
      border-radius: 8px;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
      max-height: 260px;
      overflow-y: auto;
   }

   .bsi__dropdown-item {
      width: 100%;
      border: none;
      background: transparent;
      text-align: left;
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.55rem 0.7rem;
      cursor: pointer;
      font-family: var(--cms-font);

      &:hover { background: var(--cms-bg-muted); }
   }

   .bsi__dropdown-name {
      font-size: 0.875rem;
      color: var(--cms-text);
      font-weight: 500;
   }

   .bsi__dropdown-taxid {
      font-size: 0.75rem;
      color: var(--cms-text-muted);
      white-space: nowrap;
      font-family: var(--cms-font-mono);
   }

   .bsi__dropdown-empty {
      padding: 0.7rem;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
      font-family: var(--cms-font);
   }

   .bsi__field-error {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--cms-danger-text);
      display: flex;
      align-items: center;
      gap: 0.3rem;

      &::before {
         content: '⚠';
         font-size: 0.75rem;
      }
   }
</style>
