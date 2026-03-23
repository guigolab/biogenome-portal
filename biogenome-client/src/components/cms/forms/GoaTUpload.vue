<template>
   <div class="goat-upload-page" :class="{ 'goat-upload-page--embedded': embedded }">
      <header v-if="!embedded" class="goat-upload-page__toolbar" role="banner">
         <Header title="GoaT Report Upload" description="Bulk-import or update organisms from a GoaT TSV report." />
      </header>

      <main class="goat-upload-page__main" role="main">
         <div
            class="goat-upload-page__section"
            :class="{ 'goat-upload-page__section--busy': isBusy }"
            :aria-busy="isBusy ? 'true' : 'false'"
         >
            <!-- Upload card -->
            <CmsSectionCard>
               <template #header>
                  <div class="goat-upload-page__card-head">
                     <div>
                        <h2 class="goat-upload-page__card-title">Upload TSV</h2>
                        <p class="goat-upload-page__card-lead">
                           Select a GoaT-format TSV file. Organisms not yet in the portal will be fetched
                           from INSDC automatically.
                        </p>
                     </div>
                     <CmsBtn variant="secondary" size="sm" @click="showGuidelines = true">
                        <template #prefix>
                           <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.3"/>
                              <path d="M6 5v4M6 3.5v.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                           </svg>
                        </template>
                        Guidelines
                     </CmsBtn>
                  </div>
               </template>

               <CmsFileUpload
                  v-model="tsv"
                  accept=".tsv"
                  :disabled="isBusy"
                  upload-text="Click to upload a TSV"
               />
            </CmsSectionCard>

            <!-- Actions -->
            <footer class="goat-upload-page__actions">
               <CmsBtn variant="danger" :disabled="isBusy" @click="handleReset">
                  Reset
               </CmsBtn>
               <CmsBtn
                  :disabled="!tsv || isBusy"
                  :loading="isBusy"
                  @click="handleSubmit"
               >
                  Upload report
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

      <!-- Guidelines dialog -->
      <Teleport to="body">
         <Transition name="cms-dialog">
            <div v-if="showGuidelines" class="cms-dialog-overlay" @click.self="showGuidelines = false">
               <div class="cms-dialog" role="dialog" aria-modal="true" aria-labelledby="goat-guidelines-title">
                  <div class="cms-dialog__header">
                     <h2 id="goat-guidelines-title" class="cms-dialog__title">GoaT Upload Guidelines</h2>
                     <button class="cms-dialog__close" aria-label="Close" @click="showGuidelines = false">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                           <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                     </button>
                  </div>
                  <div class="cms-dialog__body">
                     <p>Upload a GoaT TSV to create or update organism records in bulk.</p>
                     <p>
                        The file must follow
                        <a
                           class="cms-dialog__link"
                           target="_blank"
                           href="https://docs.google.com/spreadsheets/d/1eC6jQctRoUaeGWWDbb1qsWs-7ajC462nnJdHK4N3ivw"
                        ><strong>this template</strong></a>.
                        Remove any help/instruction rows before uploading.
                     </p>
                     <h4 class="cms-dialog__section-title">Before you upload</h4>
                     <ul class="cms-dialog__list">
                        <li>Include one row per species using a valid <strong>ncbi_taxon_id</strong>.</li>
                        <li>Keep the <strong>sub_project</strong> row only if you need to assign ownership metadata.</li>
                        <li>Rows for unresolved taxa are skipped and reported in the result summary.</li>
                        <li>When a taxon already exists, the upload updates that organism instead of creating a duplicate.</li>
                     </ul>
                  </div>
                  <div class="cms-dialog__footer">
                     <CmsBtn @click="showGuidelines = false">Close</CmsBtn>
                  </div>
               </div>
            </div>
         </Transition>
      </Teleport>
   </div>
</template>

<script setup lang="ts">
   import { computed, ref, withDefaults } from 'vue'

   withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
   import Header from '../ui/Header.vue'
   import CmsSectionCard from '../ui/CmsSectionCard.vue'
   import CmsFileUpload from '../ui/CmsFileUpload.vue'
   import CmsBtn from '../ui/CmsBtn.vue'
   import CmsJobStatusCard from '../ui/CmsJobStatusCard.vue'
   import AuthService from '../../../services/AuthService'
   import { useCeleryUploadPoll, type TaskPhase } from '../../../composable/useCeleryUploadPoll'
   import { useApiFeedback } from '../../../composable/useApiFeedback'

   const { notifyError } = useApiFeedback()
   const { messages, phase, isPolling, taskData, startPoll, reset: resetPoll } = useCeleryUploadPoll()

   const tsv = ref<File | null>(null)
   const isSubmitting = ref(false)
   const showGuidelines = ref(false)

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

   function handleReset() {
      tsv.value = null
      resetPoll()
      isSubmitting.value = false
   }

   async function handleSubmit() {
      if (!tsv.value) return

      resetPoll()
      isSubmitting.value = true

      const formData = new FormData()
      formData.append('goat_report', tsv.value)

      try {
         const { data } = await AuthService.importGoatReport(formData)
         startPoll(data.id)
      } catch (error) {
         messages.value = [useApiFeedback().extractApiMessage(error, 'Upload failed')]
         phase.value = 'error' as TaskPhase
         notifyError(error, 'Upload failed')
      } finally {
         isSubmitting.value = false
      }
   }
</script>

<style lang="scss" scoped>
   .goat-upload-page {
      width: 100%;
      max-width: 100%;
      --gup-max-w: 1200px;
      --gup-space-y: 1.25rem;
      --gup-space-x: 1.5rem;
      font-family: var(--cms-font);

      &--embedded {
         .goat-upload-page__main {
            padding-top: 0.75rem;
         }
      }
   }

   .goat-upload-page__toolbar {
      padding: var(--gup-space-y) var(--gup-space-x);
      max-width: var(--gup-max-w);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      border-bottom: 1px solid var(--cms-border);
      margin-bottom: var(--gup-space-y);
   }

   .goat-upload-page__main {
      padding: 0 var(--gup-space-x) var(--gup-space-y);
      max-width: var(--gup-max-w);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
   }

   .goat-upload-page__section {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      transition: opacity 0.2s ease;

      &--busy { opacity: 0.65; pointer-events: none; }
   }

   .goat-upload-page__card-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
   }

   .goat-upload-page__card-title {
      margin: 0 0 0.25rem;
      font-size: 1rem;
      font-weight: 600;
      color: var(--cms-text);
   }

   .goat-upload-page__card-lead {
      margin: 0;
      font-size: 0.875rem;
      color: var(--cms-text-muted);
      line-height: 1.5;
      max-width: 540px;
   }

   .goat-upload-page__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--cms-border);
   }

   /* Dialog */
   .cms-dialog-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(15, 23, 42, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
   }

   .cms-dialog {
      background: var(--cms-bg-surface);
      border: 1px solid var(--cms-border);
      border-radius: var(--cms-radius-card);
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
      width: 100%;
      max-width: 520px;
      max-height: 80vh;
      overflow-y: auto;
      font-family: var(--cms-font);
   }

   .cms-dialog__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.125rem 1.375rem;
      border-bottom: 1px solid var(--cms-border);
   }

   .cms-dialog__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--cms-text);
   }

   .cms-dialog__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      border: none;
      background: transparent;
      color: var(--cms-text-muted);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.12s, color 0.12s;

      &:hover { background: var(--cms-bg-muted); color: var(--cms-text); }
   }

   .cms-dialog__body {
      padding: 1.375rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      font-size: 0.9rem;
      color: var(--cms-text);
      line-height: 1.6;

      p { margin: 0; }
   }

   .cms-dialog__section-title {
      margin: 0.5rem 0 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--cms-text);
   }

   .cms-dialog__list {
      margin: 0;
      padding-left: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.875rem;
      color: var(--cms-text);
   }

   .cms-dialog__link {
      color: var(--cms-primary);
      text-decoration: underline;
      text-underline-offset: 2px;

      &:hover { color: var(--cms-primary-hover); }
   }

   .cms-dialog__footer {
      padding: 0.875rem 1.375rem;
      border-top: 1px solid var(--cms-border);
      display: flex;
      justify-content: flex-end;
   }

   /* Dialog transition */
   .cms-dialog-enter-active, .cms-dialog-leave-active { transition: opacity 0.2s ease; }
   .cms-dialog-enter-from, .cms-dialog-leave-to { opacity: 0; }

   @media (max-width: 768px) {
      .goat-upload-page {
         --gup-space-y: 1rem;
         --gup-space-x: 1rem;
      }
   }
</style>
