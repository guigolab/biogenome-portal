<template>
   <div class="ena-form-page">
      <header class="ena-form-page__toolbar" role="banner">
         <nav class="cms-page-breadcrumbs" aria-label="Breadcrumb">
            <VaBreadcrumbs color="primary">
               <VaBreadcrumbsItem :to="{ name: 'admin' }" label="Dashboard" />
               <VaBreadcrumbsItem label="BioSample creation" disabled />
            </VaBreadcrumbs>
         </nav>
         <div class="cms-page-header">
            <h1 class="cms-page-header__title">BioSample Creation</h1>
            <p class="cms-page-header__desc">
               Fill the form and submit the biosample to EBI BioSamples. The biosample will become public and can be
               referenced by experiments and assemblies published to ENA or NCBI.
            </p>
         </div>
      </header>

      <main class="ena-form-page__main" role="main">

         <!-- Validation errors banner -->
         <div v-if="sampleStore.validationErrors.length" class="ena-form-page__errors" role="alert">
            <p class="ena-form-page__errors-title">Validation Errors</p>
            <ol class="ena-form-page__errors-list">
               <li v-for="err in sampleStore.validationErrors" :key="err">{{ err }}</li>
            </ol>
         </div>

            <!-- Stepper shell: sidebar + panel -->
            <div class="ena-form-page__stepper-shell">
               <!-- Step sidebar -->
               <nav class="ena-form-page__step-nav" aria-label="Form steps">
                  <button
                     v-for="(step, idx) in stepper.runtimeSteps.value"
                     :key="step.id"
                     class="step-nav-item"
                     :class="{
                        'step-nav-item--active': stepper.activeIndex.value === idx,
                        'step-nav-item--complete': step.complete,
                        'step-nav-item--blocked': step.blocked,
                        'step-nav-item--required': step.required,
                     }"
                     :disabled="!stepper.canNavigateTo(idx)"
                     :aria-current="stepper.activeIndex.value === idx ? 'step' : undefined"
                     @click="stepper.goToStep(idx)"
                  >
                     <span class="step-nav-item__indicator">
                        <svg
                           v-if="step.complete"
                           class="step-nav-item__icon step-nav-item__icon--done"
                           width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                        >
                           <circle cx="7" cy="7" r="7" fill="#22c55e" opacity="0.18"/>
                           <path d="M4 7l2.5 2.5 4-4.5" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <svg
                           v-else-if="step.blocked"
                           class="step-nav-item__icon step-nav-item__icon--locked"
                           width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
                        >
                           <rect x="2" y="5" width="8" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                           <path d="M4 5V4a2 2 0 114 0v1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                        </svg>
                        <span v-else class="step-nav-item__number">{{ idx + 1 }}</span>
                     </span>
                     <span class="step-nav-item__body">
                        <span class="step-nav-item__label">{{ step.title }}</span>
                        <span
                           v-if="step.kind !== 'reviewSubmit'"
                           class="step-nav-item__badge"
                           :class="step.required ? 'step-nav-item__badge--required' : 'step-nav-item__badge--optional'"
                        >
                           {{ step.required ? 'Required' : 'Optional' }}
                        </span>
                     </span>
                  </button>
               </nav>

               <!-- Step panel -->
               <VaForm ref="sampleForm" class="ena-form-page__step-panel">
                  <div class="ena-form-page__step-header">
                     <h2 class="ena-form-page__step-title">{{ stepper.activeStep.value.title }}</h2>
                     <p v-if="stepper.activeStep.value.description" class="ena-form-page__step-desc">
                        {{ stepper.activeStep.value.description }}
                     </p>
                  </div>

                  <div class="ena-form-page__step-content">
                     <!-- Step: Sample Information -->
                     <BioSampleIdentifiers
                        v-if="stepper.activeStep.value.kind === 'sampleInfo'"
                        ref="bioSampleIdentifiersRef"
                     />

                     <!-- Step: Checklist group -->
                     <template v-else-if="stepper.activeStep.value.kind === 'checklistGroup'">
                        <ENAChecklistForm
                           v-if="checklist"
                           :checklist="checklist"
                           :active-group-index="stepper.activeStep.value.groupIndex"
                        />
                        <div v-else class="ena-loading">
                           <span class="ena-loading__spinner" />
                           <span class="ena-loading__text">Loading ENA checklist…</span>
                        </div>
                     </template>

                     <!-- Step: Review & Submit -->
                     <template v-else-if="stepper.activeStep.value.kind === 'reviewSubmit'">
                        <div v-if="sampleStore.loading" class="ena-loading">
                           <span class="ena-loading__spinner" />
                           <span class="ena-loading__text">Submitting…</span>
                        </div>
                        <div v-else class="ena-review-layout">
                           <div class="ena-review-layout__resume">
                              <BioSampleResume />
                           </div>
                           <div class="ena-review-layout__aside">
                              <CoordinatesPreview :available-fields="allChecklistFields" />
                           </div>
                        </div>
                     </template>
                  </div>

                  <!-- Step footer -->
                  <footer class="ena-form-page__step-footer">
                     <CmsBtn
                        v-if="stepper.activeIndex.value > 0"
                        variant="secondary"
                        icon="fa-chevron-left"
                        @click="stepper.goPrev()"
                     >
                        Back
                     </CmsBtn>
                     <span />
                     <CmsBtn
                        v-if="stepper.activeStep.value.kind !== 'reviewSubmit'"
                        variant="primary"
                        :disabled="stepper.isNextBlocked.value"
                        @click="handleNextStep"
                     >
                        Next
                     </CmsBtn>
                     <CmsBtn
                        v-else
                        variant="primary"
                        :disabled="!stepper.canSubmit.value || sampleStore.loading"
                        :loading="sampleStore.loading"
                        @click="handleSubmit"
                     >
                        Submit BioSample
                     </CmsBtn>
                  </footer>
               </VaForm>
            </div>
      </main>
   </div>
</template>

<script setup lang="ts">
   import { computed, onMounted, ref } from 'vue'
   import { useForm } from 'vuestic-ui'
   import BioSampleService from '../../services/BioSampleService'
   import ENAChecklistForm from '../../components/cms/biosample/ENAChecklistForm.vue'
   import { useSampleStore } from '../../stores/sample-store'
   import CoordinatesPreview from '../../components/cms/biosample/CoordinatesPreview.vue'
   import BioSampleResume from '../../components/cms/biosample/BioSampleResume.vue'
   import BioSampleIdentifiers from '../../components/cms/biosample/BioSampleIdentifiers.vue'
   import CmsBtn from '../../components/cms/ui/CmsBtn.vue'
   import { useRouter } from 'vue-router'
   import { useEnaUploadStepper } from '../../composable/useEnaUploadStepper'
   import { useApiFeedback } from '../../composable/useApiFeedback'

   const bioSampleIdentifiersRef = ref<InstanceType<typeof BioSampleIdentifiers> | null>(null)

   const checklist = ref<Record<string, any> | null>(null)
   const sampleStore = useSampleStore()
   const { validate } = useForm('sampleForm')
   const router = useRouter()
   const { notifySuccess } = useApiFeedback()

   const stepper = useEnaUploadStepper(checklist)

   onMounted(async () => {
      const { data } = await BioSampleService.getENAChecklist()
      checklist.value = { ...data.checklist }
      sampleStore.checklist = checklist.value?.identifiers?.primary_id?.text
   })

   const allChecklistFields = computed<string[]>(() => {
      if (!checklist.value?.descriptor?.field_group) return []
      return (checklist.value.descriptor.field_group as any[]).flatMap((group) => {
         if (Array.isArray(group.field)) return group.field.map((f: any) => String(f.name.text))
         return [String(group.field.name.text)]
      })
   })

   const fields = computed(() =>
      checklist.value?.descriptor.field_group
         .map((group: Record<string, any>) => {
            if (Array.isArray(group.field)) {
               return group.field.map((f: { name: { text: string }; units?: { unit: { text: string } } }) => ({
                  name: f.name.text,
                  unit: f.units?.unit.text,
               }))
            }
            return [{ name: group.field.name.text, unit: group.field.units?.unit.text }]
         })
         ?.flat(),
   )

   function handleNextStep() {
      if (stepper.activeStep.value.kind === 'sampleInfo') {
         if (!bioSampleIdentifiersRef.value?.validate()) return
      } else {
         if (!validate()) return
      }
      stepper.goNext()
   }

   function resetEnaForm() {
      sampleStore.sampleIdentifier = ''
      sampleStore.scientificName = ''
      sampleStore.taxid = ''
      sampleStore.showModal = false
      sampleStore.validationErrors = []
      sampleStore.resetForm()
      stepper.resetStepper()
   }

   async function handleSubmit() {
      if (!validate()) return
      await sampleStore.submitSample(fields.value)
      if (sampleStore.showModal) {
         const message = sampleStore.responseMessage
            ? `BioSample published: ${sampleStore.responseMessage}`
            : 'BioSample successfully published to EBI BioSamples.'
         resetEnaForm()
         notifySuccess(message)
         router.push({ name: 'admin' })
      }
   }
</script>

<style lang="scss" scoped>
   .ena-form-page {
      width: 100%;
      max-width: 100%;
      --efp-space-y: 1.25rem;
      --efp-space-x: 1.5rem;
      --efp-max-w: 1400px;
   }

   .ena-form-page__toolbar {
      padding: var(--efp-space-y) var(--efp-space-x);
      max-width: var(--efp-max-w);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      border-bottom: 1px solid var(--cms-border);
      margin-bottom: var(--efp-space-y);
   }

   .ena-form-page__main {
      padding: 0 var(--efp-space-x) var(--efp-space-y);
      max-width: var(--efp-max-w);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
   }

   /* Errors banner */
   .ena-form-page__errors {
      padding: 1rem 1.25rem;
      background: var(--cms-danger-soft);
      border: 1px solid rgba(220, 38, 38, 0.2);
      border-radius: 10px;
      font-family: var(--cms-font);
   }

   .ena-form-page__errors-title {
      margin: 0 0 0.5rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--cms-danger-text);
   }

   .ena-form-page__errors-list {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.875rem;
      color: var(--cms-danger-text);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
   }

   /* Stepper shell */
   .ena-form-page__stepper-shell {
      display: flex;
      gap: 1.5rem;
      align-items: flex-start;
   }

   /* Step sidebar */
   .ena-form-page__step-nav {
      flex: 0 0 220px;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      position: sticky;
      top: 1.5rem;
      max-height: calc(100vh - 3rem);
      overflow-y: auto;
   }

   .step-nav-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border: 1px solid transparent;
      border-radius: 10px;
      background: transparent;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s ease;
      width: 100%;
      color: var(--cms-text);
      font-family: var(--cms-font);

      &:hover:not(:disabled) { background: var(--cms-bg-muted); }

      &:disabled { cursor: not-allowed; opacity: 0.5; }

      &--active {
         background: var(--cms-bg-muted);
         border-color: var(--cms-border);
         box-shadow: var(--cms-shadow-sm);
      }

      &--blocked { opacity: 0.45; }
   }

   .step-nav-item__indicator {
      flex-shrink: 0;
      width: 1.625rem;
      height: 1.625rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 0.1rem;
      background: var(--cms-border-strong);

      .step-nav-item--active & { background: var(--cms-primary); }
   }

   .step-nav-item__number {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--cms-text-muted);

      .step-nav-item--active & { color: #fff; }
   }

   .step-nav-item__icon { font-size: 1rem; }
   .step-nav-item__icon--done { color: var(--cms-success); }
   .step-nav-item__icon--locked {
      color: var(--cms-text-faint);
      .step-nav-item--active & { color: rgba(255,255,255,.7); }
   }

   .step-nav-item__body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
   }

   .step-nav-item__label {
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.35;
      color: var(--cms-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      .step-nav-item--active & { font-weight: 600; color: var(--cms-text); }
   }

   .step-nav-item__badge {
      display: inline-block;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      width: fit-content;

      &--required { background: var(--cms-danger-soft); color: var(--cms-danger-text); }
      &--optional { background: var(--cms-bg-muted); color: var(--cms-text-muted); }
   }

   /* Step panel */
   .ena-form-page__step-panel {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
   }

   .ena-form-page__step-header {
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--cms-border);
   }

   .ena-form-page__step-title {
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.015em;
      margin: 0 0 0.35rem;
      color: var(--cms-text);
      font-family: var(--cms-font);
   }

   .ena-form-page__step-desc {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--cms-text-muted);
   }

   .ena-form-page__step-content {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
   }

   .ena-form-page__step-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid var(--cms-border);
      margin-top: 0.5rem;
   }

   /* Loading spinner */
   @keyframes ena-spin { to { transform: rotate(360deg); } }

   .ena-loading {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 1.5rem 0;
      color: var(--cms-text-muted);
      font-size: 0.875rem;
      font-family: var(--cms-font);
   }

   .ena-loading__spinner {
      width: 18px;
      height: 18px;
      border: 2px solid var(--cms-border);
      border-top-color: var(--cms-text-muted);
      border-radius: 50%;
      animation: ena-spin 0.75s linear infinite;
      flex-shrink: 0;
   }

   /* Review step: resume left, coordinates card right (sticky) */
   .ena-review-layout {
      display: grid;
      grid-template-columns: 1fr 290px;
      gap: 1.5rem;
      align-items: start;
   }

   .ena-review-layout__aside {
      position: sticky;
      top: 1.75rem;
   }

   /* Responsive */
   @media (max-width: 768px) {
      .ena-form-page {
         --efp-space-y: 1rem;
         --efp-space-x: 1rem;
      }

      .ena-form-page__stepper-shell {
         flex-direction: column;
         gap: 1rem;
      }

      .ena-form-page__step-nav {
         flex: none;
         flex-direction: row;
         flex-wrap: wrap;
         position: static;
         max-height: none;
         width: 100%;
         gap: 0.375rem;
      }

      .step-nav-item {
         flex: 0 0 auto;
         padding: 0.4rem 0.6rem;
         gap: 0.4rem;
      }

      .step-nav-item__body { display: none; }
      .step-nav-item--active .step-nav-item__body { display: flex; }

      .ena-review-layout {
         grid-template-columns: 1fr;
      }

      .ena-review-layout__aside {
         position: static;
         order: -1;
      }
   }
</style>
