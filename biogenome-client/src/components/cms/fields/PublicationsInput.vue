<template>
   <div class="publications-input">
      <div class="publications-input__intro">
         <p class="publications-input__hint">
            Link DOI or PubMed identifiers. Each ID must be unique. After entering an ID you can verify it fetches
            the correct paper before saving.
         </p>
         <ul class="publications-input__hint-list">
            <li><strong>DOI</strong> — full string, e.g. <code>10.1093/nar/gks1195</code></li>
            <li><strong>PubMed ID</strong> — digits only, e.g. <code>23193287</code></li>
            <li>
               <strong>PubMed Central ID</strong> — include PMC prefix, e.g. <code>PMC3531190</code>
            </li>
         </ul>
      </div>

      <div v-if="!organismStore.publications.length" class="publications-input__empty">
         <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" class="publications-input__empty-icon">
            <rect x="4" y="3" width="20" height="22" rx="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 9h10M9 13h10M9 17h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         </svg>
         <p class="publications-input__empty-text">No publications added yet.</p>
      </div>

      <div class="publications-input__stack">
         <div
            v-for="(pub, index) in organismStore.publications"
            :key="index"
            class="publications-input__row"
            :class="{
               'publications-input__row--confirmed': pub._confirmed,
               'publications-input__row--warning': pub._lookupWarning,
            }"
         >
            <div class="publications-input__row-header">
               <div class="publications-input__row-fields">
                  <CmsSelect
                     v-model="pub.source"
                     label="Source"
                     placeholder="Select type"
                     :options="['DOI', 'PubMed ID', 'PubMed CentralID']"
                     @update:model-value="onPublicationFieldChange(index)"
                  />
                  <div class="publications-input__id-wrap">
                     <CmsInput
                        v-model="pub.id"
                        label="Identifier"
                        placeholder="Paste ID"
                        clearable
                        :loading="lookupLoading[index]"
                        :error="submitted && publicationIdError(index)"
                        :error-message="publicationIdErrorMsg(index)"
                        class="publications-input__id-input"
                        @update:model-value="onPublicationFieldChange(index)"
                     />
                     <span
                        v-if="pub._confirmed"
                        class="publications-input__confirmed-badge"
                        aria-label="Verified"
                     >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                           <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" stroke-width="1.3"/>
                           <path d="M3.5 6.5l2 2 4-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Verified
                     </span>
                  </div>
               </div>
               <CmsBtn
                  variant="danger"
                  size="sm"
                  aria-label="Remove this publication"
                  class="publications-input__row-remove"
                  @click="removePublication(index)"
               >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                     <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
               </CmsBtn>
            </div>

            <!-- Lookup result confirmation card -->
            <Transition name="pub-lookup">
               <div
                  v-if="lookupResults[index]"
                  class="publications-input__lookup-result"
                  :class="lookupResults[index]!.found ? 'publications-input__lookup-result--found' : 'publications-input__lookup-result--notfound'"
               >
                  <template v-if="lookupResults[index]!.found">
                     <div class="publications-input__lookup-header">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" class="publications-input__lookup-icon">
                           <rect x="2" y="1" width="10" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/>
                           <path d="M4 4h6M4 7h6M4 10h3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                        </svg>
                        <span class="publications-input__lookup-label">Is this the correct paper?</span>
                     </div>
                     <div class="publications-input__lookup-meta">
                        <p class="publications-input__lookup-title">{{ lookupResults[index]!.data.title }}</p>
                        <p v-if="lookupResults[index]!.data.authors" class="publications-input__lookup-detail">
                           {{ lookupResults[index]!.data.authors }}
                        </p>
                        <p class="publications-input__lookup-detail">
                           <span v-if="lookupResults[index]!.data.journal">{{ lookupResults[index]!.data.journal }}</span>
                           <span v-if="lookupResults[index]!.data.year"> · {{ lookupResults[index]!.data.year }}</span>
                        </p>
                     </div>
                     <div class="publications-input__lookup-actions">
                        <CmsBtn variant="secondary" size="sm" @click="dismissLookup(index)">
                           Not this paper
                        </CmsBtn>
                        <CmsBtn size="sm" @click="confirmLookup(index)">
                           Yes, this is correct
                        </CmsBtn>
                     </div>
                  </template>
                  <template v-else>
                     <div class="publications-input__lookup-header">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" class="publications-input__lookup-icon--warn">
                           <path d="M7 2L13 12H1L7 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
                           <path d="M7 6v3M7 11v.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                        </svg>
                        <span class="publications-input__lookup-label">Could not find this publication</span>
                     </div>
                     <p class="publications-input__lookup-detail">
                        No matching paper was found in Europe PMC. Double-check the identifier. You can still save
                        it — the ID will be stored as entered.
                     </p>
                     <div class="publications-input__lookup-actions">
                        <CmsBtn variant="secondary" size="sm" @click="dismissLookup(index)">
                           Dismiss
                        </CmsBtn>
                        <CmsBtn size="sm" @click="acceptUnverified(index)">
                           Keep anyway
                        </CmsBtn>
                     </div>
                  </template>
               </div>
            </Transition>
         </div>
      </div>

      <CmsBtn variant="secondary" @click="addPublication">
         <template #prefix>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
               <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
         </template>
         Add publication
      </CmsBtn>
   </div>
</template>

<script setup lang="ts">
   import { onBeforeUnmount, reactive } from 'vue'
   import { useOrganismStore } from '../../../stores/organism-store'
   import AuthService from '../../../services/AuthService'
   import CmsInput from '../ui/CmsInput.vue'
   import CmsSelect from '../ui/CmsSelect.vue'
   import CmsBtn from '../ui/CmsBtn.vue'

   withDefaults(defineProps<{ submitted?: boolean }>(), { submitted: false })

   type EnrichedPublication = {
      source: string
      id: string
      _confirmed?: boolean
      _lookupWarning?: boolean
   }

   type LookupResult = {
      found: boolean
      data: {
         title?: string
         authors?: string
         journal?: string
         year?: string
         doi?: string
         pmid?: string
         pmcid?: string
      }
   }

   const organismStore = useOrganismStore()
   const lookupLoading = reactive<Record<number, boolean>>({})
   const lookupResults = reactive<Record<number, LookupResult | null>>({})
   const lookupDebounceTimers: Record<number, ReturnType<typeof setTimeout> | undefined> = {}
   const lookupRequestId = reactive<Record<number, number>>({})
   const LOOKUP_DEBOUNCE_MS = 550

   function publicationIdError(index: number): boolean {
      const s = (organismStore.publications[index]?.id ?? '').trim()
      if (!s) return true
      return organismStore.publications.some((p, i) => i !== index && p.id.trim() === s)
   }

   function publicationIdErrorMsg(index: number): string {
      const s = (organismStore.publications[index]?.id ?? '').trim()
      if (!s) return 'Identifier is required'
      return 'This identifier is already listed'
   }

   function addPublication() {
      ;(organismStore.publications as EnrichedPublication[]).push({ id: '', source: '', _confirmed: false })
   }

   function removePublication(index: number) {
      organismStore.publications.splice(index, 1)
      delete lookupResults[index]
      delete lookupLoading[index]
      delete lookupDebounceTimers[index]
      delete lookupRequestId[index]
   }

   function resetVerification(index: number) {
      const pub = organismStore.publications[index] as EnrichedPublication
      if (!pub) return
      pub._confirmed = false
      pub._lookupWarning = false
      lookupResults[index] = null
   }

   function clearDebounce(index: number) {
      const timer = lookupDebounceTimers[index]
      if (timer) {
         clearTimeout(timer)
         delete lookupDebounceTimers[index]
      }
   }

   function onPublicationFieldChange(index: number) {
      resetVerification(index)
      clearDebounce(index)
      const pub = organismStore.publications[index] as EnrichedPublication
      if (!pub || !pub.id.trim() || !pub.source) return
      lookupDebounceTimers[index] = setTimeout(() => {
         delete lookupDebounceTimers[index]
         void verifyPublication(index)
      }, LOOKUP_DEBOUNCE_MS)
   }

   async function verifyPublication(index: number) {
      const pub = organismStore.publications[index] as EnrichedPublication
      if (!pub.id.trim() || !pub.source) return
      const requestId = (lookupRequestId[index] ?? 0) + 1
      lookupRequestId[index] = requestId
      lookupLoading[index] = true
      lookupResults[index] = null
      try {
         const { data } = await AuthService.lookupPublication(pub.source, pub.id.trim())
         if (lookupRequestId[index] !== requestId) return
         lookupResults[index] = data as LookupResult
      } catch {
         if (lookupRequestId[index] !== requestId) return
         lookupResults[index] = { found: false, data: {} }
      } finally {
         if (lookupRequestId[index] !== requestId) return
         lookupLoading[index] = false
      }
   }

   function confirmLookup(index: number) {
      const pub = organismStore.publications[index] as EnrichedPublication
      pub._confirmed = true
      pub._lookupWarning = false
      lookupResults[index] = null
   }

   function dismissLookup(index: number) {
      const pub = organismStore.publications[index] as EnrichedPublication
      pub._lookupWarning = true
      lookupResults[index] = null
   }

   function acceptUnverified(index: number) {
      const pub = organismStore.publications[index] as EnrichedPublication
      pub._lookupWarning = true
      pub._confirmed = false
      lookupResults[index] = null
   }

   onBeforeUnmount(() => {
      Object.keys(lookupDebounceTimers).forEach((k) => clearDebounce(Number(k)))
   })
</script>

<style lang="scss" scoped>
   .publications-input {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      font-family: var(--cms-font);
   }

   .publications-input__intro {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
   }

   .publications-input__hint {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--cms-text-muted);
   }

   .publications-input__hint-list {
      margin: 0;
      padding-left: 1.2rem;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--cms-text-muted);

      li {
         margin-bottom: 0.25rem;
      }

      code {
         font-size: 0.92em;
         padding: 0.1em 0.35em;
         border-radius: 4px;
         background: var(--cms-bg-muted);
         font-family: var(--cms-font-mono);
         color: var(--cms-text);
      }
   }

   .publications-input__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.5rem 1rem;
      border-radius: 10px;
      border: 1px dashed var(--cms-border-strong);
      text-align: center;
   }

   .publications-input__empty-icon {
      opacity: 0.35;
      color: var(--cms-text-muted);
   }

   .publications-input__empty-text {
      margin: 0;
      font-size: 0.875rem;
      color: var(--cms-text-muted);
   }

   .publications-input__stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
   }

   .publications-input__row {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 1rem;
      border: 1.5px solid var(--cms-border);
      border-radius: 10px;
      background: var(--cms-bg-muted);
      flex-direction: column;
      transition: border-color 0.15s;

      &--confirmed {
         border-color: rgba(22, 163, 74, 0.35);
         background: var(--cms-success-soft);
      }

      &--warning {
         border-color: rgba(217, 119, 6, 0.3);
      }
   }

   .publications-input__row-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      width: 100%;
   }

   .publications-input__row-fields {
      flex: 1;
      display: grid;
      grid-template-columns: minmax(160px, 0.4fr) 1fr;
      gap: 0.875rem;

      @media (max-width: 640px) {
         grid-template-columns: 1fr;
      }
   }

   .publications-input__id-wrap {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
   }

   .publications-input__id-input {
      flex: 1;
   }

   .publications-input__confirmed-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      margin-top: 1.75rem;
      padding: 0.25rem 0.55rem;
      border-radius: 20px;
      background: var(--cms-success-soft);
      color: var(--cms-success-text);
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
   }

   .publications-input__row-remove {
      flex-shrink: 0;
      margin-top: 1.5rem;
   }

   /* Lookup result card */
   .publications-input__lookup-result {
      width: 100%;
      padding: 0.875rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--cms-border);

      &--found {
         background: var(--cms-primary-soft);
         border-color: rgba(37, 99, 235, 0.2);
      }

      &--notfound {
         background: var(--cms-warning-soft);
         border-color: rgba(217, 119, 6, 0.22);
      }
   }

   .publications-input__lookup-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
   }

   .publications-input__lookup-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--cms-text);
   }

   .publications-input__lookup-icon {
      color: var(--cms-primary);
      flex-shrink: 0;
   }

   .publications-input__lookup-icon--warn {
      color: var(--cms-warning);
      flex-shrink: 0;
   }

   .publications-input__lookup-meta {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      margin-bottom: 0.75rem;
   }

   .publications-input__lookup-title {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.4;
      color: var(--cms-text);
   }

   .publications-input__lookup-detail {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.4;
      color: var(--cms-text-muted);
   }

   .publications-input__lookup-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
   }

   /* Transition */
   .pub-lookup-enter-active,
   .pub-lookup-leave-active {
      transition: opacity 0.2s ease, transform 0.2s ease;
   }

   .pub-lookup-enter-from,
   .pub-lookup-leave-to {
      opacity: 0;
      transform: translateY(-4px);
   }
</style>
