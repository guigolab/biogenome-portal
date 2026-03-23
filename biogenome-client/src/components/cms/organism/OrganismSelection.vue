<template>
   <div class="organism-selection">
      <div class="organism-selection__intro">
         <span class="organism-selection__mode">{{ modeLabel }}</span>
         <p class="organism-selection__hint">
            {{
               isOrganismCreation
                  ? 'Results appear as you type (short pause). Prefer a numeric taxid—names can change. Press Enter to search immediately.'
                  : assignedSpeciesOnly
                     ? 'Only species assigned to your account appear here. Need another species? Create it first (or ask an admin).'
                     : 'Results appear as you type. At least two letters, or any numeric taxid. Press Enter to refresh now.'
            }}
         </p>
      </div>

      <!-- Data manager: no species assigned -->
      <div
         v-if="hasNoAssignedSpeciesBlock"
         class="os-banner os-banner--amber"
         role="alert"
      >
         <svg class="os-banner__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2v6M8 11v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
         </svg>
         <div class="os-banner__body">
            <p class="os-banner__title">No species assigned</p>
            <p class="os-banner__text">
               You don’t have any species assigned yet. Ask an administrator to assign species, or
               <RouterLink :to="{ name: 'create-organism' }" class="os-banner__link">register a new organism</RouterLink>
               first.
            </p>
         </div>
      </div>

      <!-- Search input -->
      <div class="sel-search">
         <label class="sel-search__label" for="os-taxon-input">
            {{
               isOrganismCreation
                  ? 'Scientific name or taxid'
                  : assignedSpeciesOnly
                     ? 'Search your assigned species'
                     : 'Search portal organisms'
            }}
         </label>
         <div
            class="sel-search__wrap"
            :class="{ 'sel-search__wrap--loading': taxonSearchLoading, 'sel-search__wrap--disabled': hasNoAssignedSpeciesBlock }"
         >
            <svg class="sel-search__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
               <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
               <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input
               id="os-taxon-input"
               class="sel-search__input"
               :placeholder="
                  isOrganismCreation
                     ? 'e.g. Homo sapiens or 9606'
                     : assignedSpeciesOnly
                        ? 'Name or taxid among your assignments…'
                        : 'Name, taxid, or filter text'
               "
               v-model="taxonFilter"
               autocomplete="off"
               :disabled="hasNoAssignedSpeciesBlock"
               @keyup.enter="runFetchImmediately"
            />
            <button
               v-if="taxonFilter && !hasNoAssignedSpeciesBlock"
               class="sel-search__clear"
               type="button"
               aria-label="Clear search"
               @click="taxonFilter = ''"
            >
               <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
               </svg>
            </button>
            <span v-if="taxonSearchLoading" class="sel-search__spinner" aria-label="Loading" />
         </div>
         <p v-if="searchFieldMessages.length" class="sel-search__hint">{{ searchFieldMessages.join(' ') }}</p>
      </div>

      <!-- Error banner -->
      <div v-if="searchError" class="os-banner os-banner--danger" role="alert">
         <svg class="os-banner__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
         </svg>
         <div class="os-banner__body">
            <p class="os-banner__title">Something went wrong</p>
            <p class="os-banner__text">{{ searchError }}</p>
         </div>
         <CmsBtn variant="secondary" size="sm" @click="dismissError">Dismiss</CmsBtn>
      </div>

      <!-- No external results -->
      <div
         v-if="noExternalResults"
         class="os-banner os-banner--neutral"
         role="status"
         aria-live="polite"
      >
         <svg class="os-banner__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
         </svg>
         <div class="os-banner__body">
            <p class="os-banner__title">No matches in public taxonomy</p>
            <p class="os-banner__text">We tried NCBI and EBI with your query. Check spelling, try a taxid, or use a broader name.</p>
         </div>
      </div>

      <!-- Results grid -->
      <section
         v-if="taxons.length"
         class="organism-selection__results"
         role="region"
         :aria-busy="taxonSearchLoading ? 'true' : 'false'"
         :aria-label="`Search results, ${taxons.length} organisms`"
      >
         <div class="organism-selection__results-header">
            <h3 class="organism-selection__results-title">Results</h3>
            <span class="organism-selection__results-count">{{ taxons.length }} found</span>
         </div>
         <div class="organism-selection__grid">
            <div
               v-for="taxon in taxons"
               :key="taxon.taxId"
               class="taxon-card"
               :class="{ 'taxon-card--active': selectedTaxon?.taxId === taxon.taxId }"
            >
               <div class="taxon-card__body">
                  <h4 class="taxon-card__name">{{ taxon.scientificName }}</h4>
                  <p class="taxon-card__meta">Taxid {{ taxon.taxId }}</p>
                  <p v-if="formatLineage(taxon.lineage)" class="taxon-card__lineage">
                     {{ formatLineage(taxon.lineage) }}
                  </p>
               </div>
               <div class="taxon-card__action">
                  <CmsBtn
                     variant="primary"
                     size="sm"
                     :loading="checkingTaxId === taxon.taxId"
                     :disabled="checkingTaxId !== null && checkingTaxId !== taxon.taxId"
                     @click="selectTaxon(taxon)"
                  >
                     Select
                  </CmsBtn>
               </div>
            </div>
         </div>
      </section>

      <!-- Outcome: already in portal -->
      <div v-if="goToUpdateForm && selectedTaxon" class="os-outcome os-outcome--warning">
         <p class="os-outcome__title">Already in the portal</p>
         <p class="os-outcome__desc">
            <strong>{{ selectedTaxon.scientificName }}</strong> (taxid {{ selectedTaxon.taxId }}) is already
            registered. You can open it for editing instead of creating a duplicate.
         </p>
         <div class="os-outcome__actions">
            <CmsBtn variant="secondary" size="sm" @click="clearOutcomeState">Back to results</CmsBtn>
            <CmsBtn variant="primary" :to="{ name: 'update-organism', params: { taxid: selectedTaxon.taxId } }">
               Edit organism
            </CmsBtn>
         </div>
      </div>

      <!-- Outcome: not found in DB -->
      <div v-if="notFoundInDB" class="os-outcome os-outcome--neutral">
         <p class="os-outcome__title">
            {{ assignedSpeciesOnly ? 'No matches in your assigned species' : 'No portal matches' }}
         </p>
         <p class="os-outcome__desc">
            {{
               assignedSpeciesOnly
                  ? 'None of your assigned species matched this search. Try another name or taxid, or create a new organism if it isn’t in the portal yet.'
                  : 'No organisms matched your search. Try different keywords or register a new organism first.'
            }}
         </p>
         <div class="os-outcome__actions">
            <CmsBtn variant="secondary" size="sm" @click="clearNotFound">Search again</CmsBtn>
            <CmsBtn variant="primary" :to="{ name: 'create-organism' }">Create organism</CmsBtn>
         </div>
      </div>

      <!-- Outcome: unauthorized -->
      <div v-if="unauthorized" class="os-outcome os-outcome--danger">
         <p class="os-outcome__title">No permission</p>
         <p class="os-outcome__desc">
            <span v-if="selectedTaxon">
               <strong>{{ selectedTaxon.scientificName }}</strong> exists in the portal, but your account cannot
               modify it. Ask an administrator if you need access.
            </span>
            <span v-else>You are not authorized to update this organism.</span>
         </p>
         <div v-if="selectedTaxon" class="os-outcome__actions">
            <CmsBtn variant="secondary" size="sm" @click="clearUnauthorized">Choose another</CmsBtn>
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
   import { computed, onBeforeUnmount, ref, watch } from 'vue'
   import { useToast } from 'vuestic-ui'
   import NCBIService from '../../../services/NCBIService'
   import EBI from '../../../services/EBIService'
   import { AxiosError } from 'axios'
   import CommonService from '../../../services/CommonService'
   import { useGlobalStore } from '../../../stores/global-store'
   import CmsBtn from '../ui/CmsBtn.vue'
   import { RouterLink } from 'vue-router'

   type TaxonHit = {
      taxId: string
      scientificName: string
      lineage?: string
   }

   const props = withDefaults(
      defineProps<{
         isOrganismCreation?: boolean
         /** When true (e.g. ENA BioSample flow for data managers), portal search only returns assigned taxids. */
         assignedSpeciesOnly?: boolean
      }>(),
      { assignedSpeciesOnly: false },
   )

   const isOrganismCreation = computed(() => Boolean(props.isOrganismCreation))
   const assignedSpeciesOnly = computed(() => Boolean(props.assignedSpeciesOnly))

   const taxonFilter = ref('')
   const taxonSearchLoading = ref(false)
   const unauthorized = ref(false)
   const notFoundInDB = ref(false)
   const goToUpdateForm = ref(false)
   const noExternalResults = ref(false)
   const searchError = ref<string | null>(null)
   const taxons = ref<TaxonHit[]>([])
   const searchRequestId = ref(0)
   const checkingTaxId = ref<string | null>(null)

   const { init } = useToast()
   const selectedTaxon = ref<TaxonHit | null>(null)

   const globalStore = useGlobalStore()
   const isAdmin = computed(() => globalStore.userRole === 'Admin')
   const userSpecies = computed(() => globalStore.userSpecies.map((id) => String(id)))

   /** Data managers in restricted mode with zero assigned species — block search. */
   const hasNoAssignedSpeciesBlock = computed(
      () => assignedSpeciesOnly.value && userSpecies.value.length === 0,
   )

   const emits = defineEmits<{
      selected: [payload: { scientificName: string; taxId: string }]
   }>()

   const queryTrimmed = computed(() => taxonFilter.value.trim())

   const DEBOUNCE_MS = 400
   const MIN_LEN_TEXT = 2

   let debounceTimer: ReturnType<typeof setTimeout> | null = null

   const modeLabel = computed(() => {
      if (isOrganismCreation.value) return 'Public taxonomy (NCBI → EBI)'
      if (assignedSpeciesOnly.value) return 'Your assigned species'
      return 'Portal organism list'
   })

   const searchFieldMessages = computed(() => {
      const lines: string[] = []
      if (looksLikeTaxId(queryTrimmed.value)) {
         lines.push('Numeric taxid: results load after you pause typing.')
      } else {
         lines.push(`Type at least ${MIN_LEN_TEXT} letters (or a taxid).`)
      }
      if (taxonSearchLoading.value) {
         lines.push('Searching…')
      }
      return lines
   })

   function looksLikeTaxId(q: string): boolean {
      return /^\d+$/.test(q.trim())
   }

   function minCharsForQuery(q: string): boolean {
      const t = q.trim()
      if (!t.length) return false
      if (/^\d+$/.test(t)) return true
      return t.length >= MIN_LEN_TEXT
   }

   function cancelDebounce() {
      if (debounceTimer) {
         clearTimeout(debounceTimer)
         debounceTimer = null
      }
   }

   function invalidateInFlightSearch() {
      searchRequestId.value += 1
      taxonSearchLoading.value = false
   }

   function formatLineage(lineage?: string): string {
      if (!lineage || typeof lineage !== 'string') return ''
      return lineage
         .split(';')
         .map((s) => s.trim())
         .filter(Boolean)
         .join(' > ')
   }

   function dismissError() {
      searchError.value = null
   }

   function clearOutcomeState() {
      goToUpdateForm.value = false
      selectedTaxon.value = null
   }

   function clearNotFound() {
      notFoundInDB.value = false
      taxonFilter.value = ''
   }

   function clearUnauthorized() {
      unauthorized.value = false
      selectedTaxon.value = null
   }

   function clearSearch() {
      taxons.value = []
      notFoundInDB.value = false
      unauthorized.value = false
      selectedTaxon.value = null
      goToUpdateForm.value = false
      noExternalResults.value = false
      searchError.value = null
   }

   function scheduleLiveSearch() {
      cancelDebounce()
      const q = taxonFilter.value.trim()
      if (!q.length) {
         invalidateInFlightSearch()
         clearSearch()
         return
      }
      if (!minCharsForQuery(q)) {
         invalidateInFlightSearch()
         clearSearch()
         return
      }
      debounceTimer = setTimeout(() => {
         debounceTimer = null
         void runFetch()
      }, DEBOUNCE_MS)
   }

   watch(taxonFilter, scheduleLiveSearch)

   onBeforeUnmount(() => {
      cancelDebounce()
   })

   function runFetchImmediately() {
      cancelDebounce()
      if (!isOrganismCreation.value && hasNoAssignedSpeciesBlock.value) {
         init({
            message: 'You have no species assigned. Contact an administrator or create a new organism first.',
            color: 'warning',
         })
         return
      }
      const q = queryTrimmed.value
      if (!q.length) {
         init({
            message: isOrganismCreation.value
               ? 'Type a scientific name or taxid.'
               : 'Type to search portal organisms.',
            color: 'warning',
         })
         return
      }
      if (!minCharsForQuery(q)) {
         init({
            message:
               isOrganismCreation.value
                  ? `Enter at least ${MIN_LEN_TEXT} letters or a taxid.`
                  : `Enter at least ${MIN_LEN_TEXT} letters to search.`,
            color: 'warning',
         })
         return
      }
      void runFetch()
   }

   async function runFetch() {
      const q = queryTrimmed.value
      if (!minCharsForQuery(q)) return

      if (!isOrganismCreation.value && hasNoAssignedSpeciesBlock.value) {
         taxons.value = []
         return
      }

      const requestId = ++searchRequestId.value
      taxons.value = []
      searchError.value = null
      noExternalResults.value = false
      notFoundInDB.value = false
      unauthorized.value = false
      selectedTaxon.value = null
      goToUpdateForm.value = false

      taxonSearchLoading.value = true
      try {
         if (isOrganismCreation.value) {
            await searchExternalTaxons(requestId)
         } else {
            await searchDatabaseTaxons(requestId)
         }
      } catch (error) {
         if (requestId === searchRequestId.value) {
            searchError.value = messageFromUnknownError(error, 'Search failed. Please try again.')
         }
      } finally {
         if (requestId === searchRequestId.value) {
            taxonSearchLoading.value = false
         }
      }
   }

   function messageFromUnknownError(error: unknown, fallback: string): string {
      const ax = error as AxiosError
      const d = ax.response?.data
      if (typeof d === 'string' && d.trim()) return d
      if (d && typeof d === 'object') {
         const o = d as Record<string, unknown>
         if (typeof o.detail === 'string') return o.detail
         if (typeof o.message === 'string') return o.message
      }
      return fallback
   }

   async function searchExternalTaxons(requestId: number) {
      const q = queryTrimmed.value
      const encoded = encodeURIComponent(q)

      const ncbiResult = await searchNCBI(encoded, requestId)
      if (requestId !== searchRequestId.value) return
      if (ncbiResult.length > 0) {
         taxons.value = ncbiResult
         return
      }

      const ebiResult = await searchEBI(q, requestId)
      if (requestId !== searchRequestId.value) return
      if (ebiResult.length > 0) {
         taxons.value = ebiResult
         return
      }

      noExternalResults.value = true
   }

   async function searchNCBI(encodedQuery: string, requestId: number): Promise<TaxonHit[]> {
      try {
         const { data } = await NCBIService.getTaxon(encodedQuery)
         if (requestId !== searchRequestId.value) return []
         if (!data?.taxonomy_nodes?.length || data.taxonomy_nodes[0]?.errors) {
            return []
         }

         return data.taxonomy_nodes.map((node: { taxonomy: { tax_id: number | string; organism_name: string; lineage?: string } }) => ({
            taxId: String(node.taxonomy.tax_id),
            scientificName: node.taxonomy.organism_name,
            lineage: node.taxonomy.lineage,
         }))
      } catch {
         return []
      }
   }

   function normalizeEbiTaxa(data: unknown): TaxonHit[] {
      if (data == null) return []
      const raw = Array.isArray(data) ? data : [data]
      const out: TaxonHit[] = []
      for (const item of raw) {
         if (!item || typeof item !== 'object') continue
         const o = item as Record<string, unknown>
         const taxId = o.taxId ?? o.tax_id
         const scientificName = o.scientificName ?? o.scientific_name ?? o.name
         if (taxId == null || scientificName == null) continue
         let lineage: string | undefined
         if (typeof o.lineage === 'string') lineage = o.lineage
         else if (Array.isArray(o.lineage)) lineage = o.lineage.map(String).join(';')
         out.push({
            taxId: String(taxId),
            scientificName: String(scientificName),
            lineage,
         })
      }
      return out
   }

   async function searchEBI(rawQuery: string, requestId: number): Promise<TaxonHit[]> {
      try {
         const subPath = looksLikeTaxId(rawQuery) ? 'tax-id' : 'scientific-name'
         const encoded = encodeURIComponent(rawQuery)
         const { data } = await EBI.getTaxon(subPath, encoded)
         if (requestId !== searchRequestId.value) return []
         return normalizeEbiTaxa(data)
      } catch {
         return []
      }
   }

   async function searchDatabaseTaxons(requestId: number) {
      const rows = await getTaxonsFromDB(requestId)
      if (requestId !== searchRequestId.value) return
      if (rows.length > 0) {
         taxons.value = rows
      } else if (!searchError.value) {
         notFoundInDB.value = true
      }
   }

   async function getTaxonsFromDB(requestId: number): Promise<TaxonHit[]> {
      try {
         const { data } = await CommonService.getItems('organisms', { filter: queryTrimmed.value })
         if (requestId !== searchRequestId.value) return []
         const rows = Array.isArray(data?.data) ? data.data : []
         let mapped = rows.map((taxon: { taxid: string | number; scientific_name?: string; lineage?: string }) => ({
            taxId: String(taxon.taxid),
            scientificName: taxon.scientific_name ?? `Taxon ${taxon.taxid}`,
            lineage: taxon.lineage,
         }))
         if (props.assignedSpeciesOnly && userSpecies.value.length > 0) {
            const allowed = new Set(userSpecies.value.map(String))
            mapped = mapped.filter((t: TaxonHit) => allowed.has(t.taxId))
         }
         return mapped
      } catch (error) {
         if (requestId === searchRequestId.value) {
            searchError.value = messageFromUnknownError(
               error,
               'Could not search the portal. Check your connection and try again.',
            )
         }
         return []
      }
   }

   function userCanEditTaxon(taxon: TaxonHit): boolean {
      return isAdmin.value || userSpecies.value.includes(taxon.taxId)
   }

   async function selectTaxon(taxon: TaxonHit) {
      selectedTaxon.value = { ...taxon }
      unauthorized.value = false
      goToUpdateForm.value = false

      if (isOrganismCreation.value) {
         checkingTaxId.value = taxon.taxId
         try {
            await checkExistingOrganism(taxon)
         } finally {
            checkingTaxId.value = null
         }
         return
      }

      if (!userCanEditTaxon(taxon)) {
         unauthorized.value = true
         init({
            message: `You do not have permission to use ${taxon.scientificName} for this action.`,
            color: 'danger',
         })
         return
      }

      emits('selected', {
         scientificName: taxon.scientificName,
         taxId: taxon.taxId,
      })
   }

   async function checkExistingOrganism(taxon: TaxonHit) {
      try {
         const { data } = await CommonService.getItem('organisms', taxon.taxId)
         const existingId = data?.taxid != null ? String(data.taxid) : null
         if (existingId === taxon.taxId) {
            if (userCanEditTaxon(taxon)) {
               goToUpdateForm.value = true
            } else {
               unauthorized.value = true
            }
            return
         }
         emits('selected', {
            scientificName: taxon.scientificName,
            taxId: taxon.taxId,
         })
      } catch (error) {
         const axiosError = error as AxiosError
         if (axiosError.response?.status === 404) {
            emits('selected', {
               scientificName: taxon.scientificName,
               taxId: taxon.taxId,
            })
         } else if (axiosError.response?.status === 403) {
            unauthorized.value = true
         } else {
            searchError.value = messageFromUnknownError(
               error,
               'Could not verify whether this organism already exists. Try again.',
            )
         }
      }
   }
</script>

<style lang="scss" scoped>
   .organism-selection {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
   }

   .organism-selection__intro {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
   }

   .organism-selection__mode {
      display: inline-block;
      width: fit-content;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #475569;
      background: rgba(71, 85, 105, 0.08);
      border: 1px solid rgba(71, 85, 105, 0.15);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
   }

   .organism-selection__hint {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--cms-text-muted);
   }

   /* Search input */
   .sel-search {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
   }

   .sel-search__label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #374151;
   }

   .sel-search__wrap {
      position: relative;
      display: flex;
      align-items: center;
      background: #fff;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      transition: border-color 0.15s ease;

      &:focus-within {
         border-color: #64748b;
         box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.1);
      }

      &--disabled {
         opacity: 0.65;
         background: #f9fafb;
         pointer-events: none;
      }
   }

   .sel-search__icon {
      flex-shrink: 0;
      margin-left: 0.75rem;
      color: #9ca3af;
      pointer-events: none;
   }

   .sel-search__input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      padding: 0.625rem 0.75rem;
      font-size: 0.9375rem;
      color: #1e293b;

      &::placeholder { color: #9ca3af; }
   }

   .sel-search__clear {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      margin-right: 0.25rem;
      border: none;
      background: transparent;
      color: #9ca3af;
      border-radius: 4px;
      cursor: pointer;
      transition: color 0.12s, background 0.12s;

      &:hover { color: #374151; background: rgba(0,0,0,.05); }
   }

   @keyframes sel-spin { to { transform: rotate(360deg); } }

   .sel-search__spinner {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      margin-right: 0.75rem;
      border: 2px solid #d1d5db;
      border-top-color: #64748b;
      border-radius: 50%;
      animation: sel-spin 0.7s linear infinite;
   }

   .sel-search__hint {
      margin: 0;
      font-size: 0.75rem;
      color: #6b7280;
      line-height: 1.4;
   }

   /* Banners */
   .os-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 1rem 1.125rem;
      border-radius: 10px;
      border: 1px solid rgba(0,0,0,.06);
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
   }

   .os-banner--danger {
      background: color-mix(in srgb, #ef4444 8%, #f9fafb);
      border-color: color-mix(in srgb, #ef4444 25%, transparent);
   }

   .os-banner--neutral {
      background: #f8fafc;
      border-color: #e2e8f0;
   }

   .os-banner--amber {
      background: color-mix(in srgb, #f59e0b 10%, #fffbeb);
      border-color: color-mix(in srgb, #f59e0b 30%, transparent);
   }

   .os-banner__icon {
      flex-shrink: 0;
      margin-top: 0.1rem;
      color: #ef4444;

      .os-banner--neutral & { color: #6b7280; }
      .os-banner--amber & { color: #d97706; }
   }

   .os-banner__link {
      color: #2563eb;
      font-weight: 500;
      text-decoration: underline;
      text-underline-offset: 2px;

      &:hover { color: #1d4ed8; }
   }

   .os-banner__body { flex: 1; min-width: 0; }

   .os-banner__title {
      margin: 0 0 0.2rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #1e293b;
   }

   .os-banner__text {
      margin: 0;
      font-size: 0.8125rem;
      color: #64748b;
      line-height: 1.45;
   }

   /* Results */
   .organism-selection__results-header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
   }

   .organism-selection__results-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #1e293b;
   }

   .organism-selection__results-count {
      font-size: 0.8125rem;
      color: #64748b;
   }

   .organism-selection__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 0.875rem;
   }

   /* Taxon result card */
   .taxon-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem 1.125rem;
      background: #fff;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
      transition: border-color 0.15s, box-shadow 0.15s;

      &:hover {
         border-color: #cbd5e1;
         box-shadow: 0 2px 8px rgba(0,0,0,.07);
      }

      &--active {
         border-color: #475569;
         box-shadow: 0 2px 8px rgba(71,85,105,.12);
      }
   }

   .taxon-card__body { flex: 1; min-width: 0; }

   .taxon-card__name {
      margin: 0 0 0.3rem;
      font-size: 0.9375rem;
      font-weight: 600;
      line-height: 1.35;
      color: #1e293b;
   }

   .taxon-card__meta {
      margin: 0 0 0.25rem;
      font-size: 0.8125rem;
      color: #64748b;
   }

   .taxon-card__lineage {
      margin: 0;
      font-size: 0.75rem;
      line-height: 1.4;
      color: #94a3b8;
      display: -webkit-box;
      line-clamp: 3;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
   }

   .taxon-card__action { align-self: flex-end; }

   /* Outcome cards */
   .os-outcome {
      padding: 1.125rem 1.25rem;
      border-radius: 10px;
      border: 1.5px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;

      &--warning {
         background: color-mix(in srgb, #f59e0b 8%, #fffbf0);
         border-color: color-mix(in srgb, #f59e0b 30%, transparent);
      }
      &--danger {
         background: color-mix(in srgb, #ef4444 8%, #fff5f5);
         border-color: color-mix(in srgb, #ef4444 25%, transparent);
      }
   }

   .os-outcome__title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #1e293b;
   }

   .os-outcome__desc {
      margin: 0;
      font-size: 0.875rem;
      color: #4b5563;
      line-height: 1.5;
   }

   .os-outcome__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding-top: 0.25rem;
   }
</style>
