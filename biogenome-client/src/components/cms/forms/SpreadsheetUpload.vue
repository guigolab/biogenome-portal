<template>
   <div class="spreadsheet-upload-page" :class="{ 'spreadsheet-upload-page--embedded': embedded }">
      <header v-if="!embedded" class="spreadsheet-upload-page__toolbar" role="banner">
         <Header
            title="Sample metadata upload"
            description="Upload a spreadsheet containing sample metadata. Samples are stored locally in the portal."
         />
      </header>

      <main
         class="spreadsheet-upload-page__main"
         role="main"
         :aria-busy="isBusy ? 'true' : 'false'"
      >
         <div
            class="spreadsheet-upload-page__section"
            :class="{ 'spreadsheet-upload-page__section--busy': isBusy }"
         >
            <div class="spreadsheet-upload-page__grid">
               <!-- Field mapping card -->
               <CmsSectionCard title="Field mapping" description="Map the column names in your spreadsheet to the required fields. If columns matching &quot;lat&quot; or &quot;long&quot; are found, geographic coordinates will be generated automatically from their values (decimal degrees recommended).">
                  <div class="spreadsheet-upload-page__fields">
                     <CmsInput
                        v-model="formData.id"
                        label="ID column"
                        placeholder="Column name used as unique identifier"
                        hint="Unique identifier column name"
                        required
                        :error="submitted && !formData.id.trim()"
                        error-message="ID column name is required"
                     />
                     <CmsInput
                        v-model="formData.taxid"
                        label="Taxid column"
                        placeholder="Column name for NCBI taxonomic identifier"
                        hint="NCBI Taxonomic ID column name"
                        required
                        :error="submitted && !formData.taxid.trim()"
                        error-message="Taxid column name is required"
                     />
                     <CmsInput
                        v-model="formData.scientific_name"
                        label="Scientific name column"
                        placeholder="Column name for scientific name"
                        hint="Scientific name column name"
                        required
                        :error="submitted && !formData.scientific_name.trim()"
                        error-message="Scientific name column name is required"
                     />
                  </div>
               </CmsSectionCard>

               <!-- Import options card -->
               <CmsSectionCard title="Import options" description="Set the header row (1-based) and choose how to handle samples whose ID already exists in the portal.">
                  <div class="spreadsheet-upload-page__fields">
                     <CmsSelect
                        v-model="formData.option"
                        label="Existing ID behaviour"
                        :options="['SKIP', 'UPDATE']"
                        hint="SKIP keeps existing rows; UPDATE overwrites them"
                     />
                     <div class="spreadsheet-upload-page__counter-field">
                        <label class="spreadsheet-upload-page__counter-label" for="header-row">
                           Header row number
                        </label>
                        <p class="spreadsheet-upload-page__counter-hint">Row number of column definitions (1-based)</p>
                        <div class="spreadsheet-upload-page__counter-row">
                           <button
                              type="button"
                              class="spreadsheet-upload-page__counter-btn"
                              :disabled="formData.header <= 1"
                              aria-label="Decrease"
                              @click="formData.header = Math.max(1, formData.header - 1)"
                           >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                 <path d="M2 5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                              </svg>
                           </button>
                           <input
                              id="header-row"
                              v-model.number="formData.header"
                              type="number"
                              min="1"
                              class="spreadsheet-upload-page__counter-input"
                           />
                           <button
                              type="button"
                              class="spreadsheet-upload-page__counter-btn"
                              aria-label="Increase"
                              @click="formData.header = formData.header + 1"
                           >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                 <path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                              </svg>
                           </button>
                        </div>
                     </div>
                     <CmsFileUpload
                        v-model="excel"
                        accept=".xlsx"
                        :disabled="isBusy"
                        upload-text="Click to upload an XLSX"
                     />
                  </div>
               </CmsSectionCard>
            </div>

            <!-- Actions -->
            <footer class="spreadsheet-upload-page__actions">
               <CmsBtn variant="danger" :disabled="isBusy" @click="handleReset">
                  Reset form
               </CmsBtn>
               <CmsBtn
                  :disabled="!excel || isBusy"
                  :loading="isBusy"
                  @click="handleSubmit"
               >
                  Submit spreadsheet
               </CmsBtn>
            </footer>

            <!-- Job status card -->
            <CmsJobStatusCard
               :phase="phase"
               :progress-messages="progressMessages"
               :error-messages="errorMessages"
               :success-summary="successSummary"
            />
         </div>
      </main>
   </div>
</template>

<script setup lang="ts">
   import { computed, reactive, ref, withDefaults } from 'vue'

   withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
   import Header from '../ui/Header.vue'
   import CmsSectionCard from '../ui/CmsSectionCard.vue'
   import CmsInput from '../ui/CmsInput.vue'
   import CmsSelect from '../ui/CmsSelect.vue'
   import CmsFileUpload from '../ui/CmsFileUpload.vue'
   import CmsBtn from '../ui/CmsBtn.vue'
   import CmsJobStatusCard from '../ui/CmsJobStatusCard.vue'
   import AuthService from '../../../services/AuthService'
   import { useCeleryUploadPoll, type TaskPhase } from '../../../composable/useCeleryUploadPoll'
   import { useApiFeedback } from '../../../composable/useApiFeedback'

   const { notifyWarning, notifyError, extractApiMessage } = useApiFeedback()
   const { messages, phase, isPolling, taskData, startPoll, reset: resetPoll } = useCeleryUploadPoll()

   const excel = ref<File | null>(null)
   const isSubmitting = ref(false)
   const submitted = ref(false)

   const defaultForm = {
      id: '',
      taxid: '',
      scientific_name: '',
      header: 1,
      option: 'SKIP',
   }
   const formData = reactive({ ...defaultForm })

   const isBusy = computed(() => isSubmitting.value || isPolling.value)

   const progressMessages = computed(() =>
      phase.value === 'running' || phase.value === 'queued' ? messages.value : [],
   )

   const errorMessages = computed<string[]>(() => {
      if (phase.value !== 'error') return []
      const data = taskData.value as Record<string, unknown> | null
      const err = data?.error
      if (err && typeof err === 'object') {
         const errs = (err as Record<string, unknown>).errors
         if (Array.isArray(errs)) return errs.map(String)
         const msg = (err as Record<string, unknown>).message
         if (typeof msg === 'string') return msg.split('\n').map((s) => s.trim()).filter(Boolean)
      }
      if (typeof err === 'string') return err.split('\n').map((s) => s.trim()).filter(Boolean)
      return messages.value.length ? messages.value : ['Upload failed.']
   })

   const successSummary = computed(() => {
      const data = taskData.value as Record<string, unknown> | null
      const result =
         data?.result && typeof data.result === 'object' ? (data.result as Record<string, unknown>) : {}
      const summary =
         result.summary && typeof result.summary === 'object'
            ? (result.summary as Record<string, unknown>)
            : {}
      return {
         recordsSaved: Number(summary.records_saved ?? 0),
         createdOrganisms: Number(summary.created_organisms ?? 0),
         skippedOrNotFound: Number(summary.records_skipped_or_not_found ?? 0),
      }
   })

   function isFormValid(): boolean {
      return (
         formData.id.trim() !== '' &&
         formData.taxid.trim() !== '' &&
         formData.scientific_name.trim() !== ''
      )
   }

   function handleReset() {
      excel.value = null
      submitted.value = false
      Object.assign(formData, defaultForm)
      resetPoll()
      isSubmitting.value = false
   }

   async function handleSubmit() {
      if (!excel.value) return

      submitted.value = true
      if (!isFormValid()) {
         notifyWarning('Please fill in all required fields before submitting.')
         return
      }

      resetPoll()
      isSubmitting.value = true

      const payload = new FormData()
      payload.append('excel', excel.value)
      Object.entries(formData).forEach(([k, v]) => {
         if (v !== '' && v !== null && v !== undefined) payload.append(k, String(v))
      })

      try {
         const { data } = await AuthService.importSpreadsheet(payload)
         startPoll(data.id)
      } catch (error) {
         messages.value = [extractApiMessage(error, 'Upload failed')]
         phase.value = 'error' as TaskPhase
         notifyError(error, 'Upload failed')
      } finally {
         isSubmitting.value = false
      }
   }
</script>

<style lang="scss" scoped>
   .spreadsheet-upload-page {
      width: 100%;
      max-width: 100%;
      --sup-max-w: 1200px;
      --sup-space-y: 1.25rem;
      --sup-space-x: 1.5rem;
      font-family: var(--cms-font);

      &--embedded {
         .spreadsheet-upload-page__main {
            padding-top: 0.75rem;
         }
      }
   }

   .spreadsheet-upload-page__toolbar {
      padding: var(--sup-space-y) var(--sup-space-x);
      max-width: var(--sup-max-w);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      border-bottom: 1px solid var(--cms-border);
      margin-bottom: var(--sup-space-y);
   }

   .spreadsheet-upload-page__main {
      padding: 0 var(--sup-space-x) var(--sup-space-y);
      max-width: var(--sup-max-w);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
   }

   .spreadsheet-upload-page__section {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      transition: opacity 0.2s ease;

      &--busy { opacity: 0.65; pointer-events: none; }
   }

   .spreadsheet-upload-page__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;

      @media (max-width: 768px) {
         grid-template-columns: 1fr;
      }
   }

   .spreadsheet-upload-page__fields {
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   .spreadsheet-upload-page__counter-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
   }

   .spreadsheet-upload-page__counter-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--cms-text);
   }

   .spreadsheet-upload-page__counter-hint {
      margin: 0;
      font-size: 0.8rem;
      color: var(--cms-text-muted);
   }

   .spreadsheet-upload-page__counter-row {
      display: flex;
      align-items: center;
      gap: 0;
      width: fit-content;
   }

   .spreadsheet-upload-page__counter-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2.375rem;
      border: 1.5px solid var(--cms-border-strong);
      background: var(--cms-bg-surface);
      color: var(--cms-text);
      cursor: pointer;
      transition: background 0.12s;

      &:first-child { border-radius: var(--cms-radius-sm) 0 0 var(--cms-radius-sm); }
      &:last-child { border-radius: 0 var(--cms-radius-sm) var(--cms-radius-sm) 0; border-left: none; }

      &:hover:not(:disabled) { background: var(--cms-bg-muted); }
      &:disabled { opacity: 0.45; cursor: not-allowed; }
   }

   .spreadsheet-upload-page__counter-input {
      width: 3.5rem;
      height: 2.375rem;
      text-align: center;
      border: 1.5px solid var(--cms-border-strong);
      border-left: none;
      border-right: none;
      background: var(--cms-bg-surface);
      font-size: 0.9375rem;
      font-family: var(--cms-font);
      color: var(--cms-text);
      outline: none;

      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
   }

   .spreadsheet-upload-page__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--cms-border);
   }

   @media (max-width: 768px) {
      .spreadsheet-upload-page {
         --sup-space-y: 1rem;
         --sup-space-x: 1rem;
      }
   }
</style>
