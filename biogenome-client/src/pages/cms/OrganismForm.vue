<template>
   <div class="organism-form-page">
      <header class="organism-form-page__toolbar" role="banner">
         <nav class="cms-page-breadcrumbs" aria-label="Breadcrumb">
            <VaBreadcrumbs color="primary">
               <VaBreadcrumbsItem :to="{ name: 'admin' }" label="Dashboard" />
               <VaBreadcrumbsItem :label="breadcrumbCurrentLabel" disabled />
            </VaBreadcrumbs>
         </nav>
         <Header :title="title" :description="description" />
      </header>

      <main class="organism-form-page__main" role="main" :aria-busy="isBusy ? 'true' : 'false'">
         <div class="organism-form-page__inner-loading">

            <!-- Loading skeleton -->
            <div v-if="isBusy" class="ofp-skeleton">
               <div class="ofp-skeleton__bar ofp-skeleton__bar--title" />
               <div class="ofp-skeleton__bar" />
               <div class="ofp-skeleton__bar ofp-skeleton__bar--short" />
            </div>

            <!-- Edit: load failed -->
            <section
               v-else-if="isEditMode && fetchError"
               class="organism-form-page__empty"
               aria-live="polite"
            >
               <div class="organism-form-page__empty-card" role="alert">
                  <svg class="organism-form-page__empty-icon" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                     <path d="M20 8L36 34H4L20 8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                     <path d="M20 17v8M20 28v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  <h2 class="organism-form-page__empty-title">Unable to load this organism</h2>
                  <p class="organism-form-page__empty-hint">{{ fetchError }}</p>
                  <div class="organism-form-page__empty-actions">
                     <CmsBtn variant="secondary" :to="{ name: 'admin' }">
                        Back to organisms
                     </CmsBtn>
                     <CmsBtn variant="primary" @click="retryFetch">Try again</CmsBtn>
                  </div>
               </div>
            </section>

            <!-- Stepper form -->
            <template v-else-if="!isBusy">
               <!-- Organism context banner (edit mode or after selection in create mode) -->
               <div
                  v-if="isEditMode || (organismStore.organismForm.taxid && stepper.activeStep.value?.id !== 'selectOrganism')"
                  class="organism-form-page__context"
               >
                  <div class="organism-form-page__context-text">
                     <span class="organism-form-page__context-label">Selected organism</span>
                     <h2 class="organism-form-page__context-name">
                        {{ organismStore.organismForm.scientific_name || '—' }}
                     </h2>
                     <p class="organism-form-page__context-meta">
                        Taxid <span class="organism-form-page__taxid">{{ organismStore.organismForm.taxid }}</span>
                     </p>
                  </div>
                  <div class="organism-form-page__context-actions">
                     <CmsBtn
                        v-if="!isEditMode"
                        variant="secondary"
                        icon="fa-rotate-left"
                        @click="showChangeOrganismModal = true"
                     >
                        Change organism
                     </CmsBtn>
                     <CmsBtn
                        variant="danger"
                        icon="fa-rotate-left"
                        :disabled="isSubmitting"
                        @click="showResetModal = true"
                     >
                        Reset
                     </CmsBtn>
                  </div>
               </div>

         <!-- Stepper nav -->
         <div class="organism-form-page__stepper-shell">
            <!-- Step sidebar -->
            <nav class="organism-form-page__step-nav" aria-label="Form steps">
               <button
                  v-for="(step, idx) in stepper.runtimeSteps.value"
                  :key="step.id"
                  class="step-nav-item"
                  :class="{
                     'step-nav-item--active': stepper.activeIndex.value === idx,
                     'step-nav-item--complete': step.completion.complete,
                     'step-nav-item--blocked': step.blocked,
                     'step-nav-item--required': step.required,
                  }"
                  :disabled="step.blocked"
                  :aria-current="stepper.activeIndex.value === idx ? 'step' : undefined"
                  @click="stepper.goToStep(idx)"
               >
                  <span class="step-nav-item__indicator">
                     <!-- done icon -->
                     <svg v-if="step.completion.complete" class="step-nav-item__icon step-nav-item__icon--done" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <circle cx="7" cy="7" r="7" fill="#22c55e" opacity="0.18"/>
                        <path d="M4 7l2.5 2.5 4-4.5" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                     </svg>
                     <!-- locked icon -->
                     <svg v-else-if="step.blocked" class="step-nav-item__icon step-nav-item__icon--locked" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <rect x="2" y="5" width="8" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                        <path d="M4 5V4a2 2 0 114 0v1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                     </svg>
                     <span v-else class="step-nav-item__number">{{ idx + 1 }}</span>
                  </span>
                        <span class="step-nav-item__body">
                           <span class="step-nav-item__label">{{ step.title['en'] }}</span>
                           <span v-if="step.required && step.id !== 'reviewSubmit'" class="step-nav-item__badge step-nav-item__badge--required">Required</span>
                           <span v-else-if="step.id !== 'reviewSubmit'" class="step-nav-item__badge step-nav-item__badge--optional">Optional</span>
                        </span>
                     </button>
                  </nav>

                  <!-- Step panel -->
                  <div class="organism-form-page__step-panel">
                     <div class="organism-form-page__step-header">
                        <h2 class="organism-form-page__step-title">
                           {{ stepper.activeStep.value?.title['en'] }}
                        </h2>
                        <p class="organism-form-page__step-desc">
                           {{ stepper.activeStep.value?.description['en'] }}
                        </p>
                     </div>

                     <div class="organism-form-page__step-content">
                        <!-- Step: Select Organism -->
                        <template v-if="stepper.activeStep.value?.id === 'selectOrganism'">
                           <OrganismSelection @selected="handleSelection" is-organism-creation />
                        </template>

                        <!-- Step: GoaT Status -->
                        <template v-else-if="stepper.activeStep.value?.id === 'goatStatus'">
                           <GoaTStep />
                        </template>

                        <!-- Step: Sequencing & Sub-project -->
                        <template v-else-if="stepper.activeStep.value?.id === 'sequencingAndSubproject'">
                           <SequencingStep />
                        </template>

                        <!-- Step: PI or Entity -->
                        <template v-else-if="stepper.activeStep.value?.id === 'piOrEntity'">
                           <PiEntityStep :required="stepper.activeStep.value.required" />
                        </template>

                        <!-- Step: Images -->
                        <template v-else-if="stepper.activeStep.value?.id === 'images'">
                           <ImagesInput :required="stepper.activeStep.value.required" />
                        </template>

                        <!-- Step: Publications -->
                        <template v-else-if="stepper.activeStep.value?.id === 'publications'">
                           <PublicationsInput />
                        </template>

                        <!-- Step: Vernacular Names -->
                        <template v-else-if="stepper.activeStep.value?.id === 'vernacularNames'">
                           <LocalNamesInput />
                        </template>

                        <!-- Step: Extra Metadata -->
                        <template v-else-if="stepper.activeStep.value?.id === 'extraMetadata'">
                           <MetadataInput />
                        </template>

                        <!-- Step: Review & Submit -->
                        <template v-else-if="stepper.activeStep.value?.id === 'reviewSubmit'">
                           <ReviewStep
                              :runtime-steps="stepper.runtimeSteps.value"
                              :can-submit="stepper.canSubmit.value"
                              :is-submitting="isSubmitting"
                              @go-to-step="stepper.goToStep"
                              @submit="handleSubmit"
                           />
                        </template>
                     </div>

                     <!-- Step navigation footer -->
                     <footer
                        v-if="stepper.activeStep.value?.id !== 'reviewSubmit'"
                        class="organism-form-page__step-footer"
                     >
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
                           v-if="stepper.activeIndex.value < stepper.runtimeSteps.value.length - 1"
                           variant="primary"
                           :disabled="isNextBlocked"
                           @click="handleNextStep"
                        >
                           {{ isLastContentStep ? 'Review' : 'Next' }}
                        </CmsBtn>
                     </footer>
                  </div>
               </div>
            </template>
         </div>
      </main>

      <!-- Change organism dialog -->
      <Teleport to="body">
         <div v-if="showChangeOrganismModal" class="ofp-dialog-backdrop" @click.self="showChangeOrganismModal = false">
            <div class="ofp-dialog" role="dialog" aria-modal="true" aria-labelledby="change-org-title">
               <h2 id="change-org-title" class="ofp-dialog__title">Change organism?</h2>
               <p class="ofp-dialog__body">
                  This clears the current draft (images, metadata, publications, and other fields). You will pick a different organism from the directory.
               </p>
               <div class="ofp-dialog__footer">
                  <CmsBtn variant="secondary" @click="showChangeOrganismModal = false">Cancel</CmsBtn>
                  <CmsBtn variant="primary" @click="confirmChangeOrganism">Continue</CmsBtn>
               </div>
            </div>
         </div>
      </Teleport>

      <!-- Reset form dialog -->
      <Teleport to="body">
         <div v-if="showResetModal" class="ofp-dialog-backdrop" @click.self="showResetModal = false">
            <div class="ofp-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-form-title">
               <h2 id="reset-form-title" class="ofp-dialog__title">Reset form?</h2>
               <p class="ofp-dialog__body">
                  All unsaved changes will be lost{{ isEditMode ? ' and the form will reload from the server.' : '.' }}
               </p>
               <div class="ofp-dialog__footer">
                  <CmsBtn variant="secondary" @click="showResetModal = false">Cancel</CmsBtn>
                  <CmsBtn variant="danger" @click="confirmReset">Reset</CmsBtn>
               </div>
            </div>
         </div>
      </Teleport>
   </div>
</template>

<script setup lang="ts">
   import { computed, inject, ref, watch } from 'vue'
   import { useOrganismStore } from '../../stores/organism-store'
   import ImagesInput from '../../components/cms/fields/ImagesInput.vue'
   import GoaTStep from '../../components/cms/organism/GoaTStep.vue'
   import SequencingStep from '../../components/cms/organism/SequencingStep.vue'
   import PiEntityStep from '../../components/cms/organism/PiEntityStep.vue'
   import MetadataInput from '../../components/cms/fields/MetadataInput.vue'
   import PublicationsInput from '../../components/cms/fields/PublicationsInput.vue'
   import LocalNamesInput from '../../components/cms/fields/LocalNamesInput.vue'
   import ReviewStep from '../../components/cms/organism/ReviewStep.vue'
   import AuthService from '../../services/AuthService'
   import { type AppConfig, type OrganismForm } from '../../data/types'
   import { useRouter } from 'vue-router'
   import { AxiosError } from 'axios'
   import Header from '../../components/cms/ui/Header.vue'
   import ItemService from '../../services/CommonService'
   import OrganismSelection from '../../components/cms/organism/OrganismSelection.vue'
   import { useOrganismFormStepper } from '../../composable/useOrganismFormStepper'
   import CmsBtn from '../../components/cms/ui/CmsBtn.vue'
   import { useApiFeedback } from '../../composable/useApiFeedback'

   const appConfig = inject('appConfig') as AppConfig
   const props = defineProps<{ taxid?: string }>()

   const organismStore = useOrganismStore()
   const router = useRouter()
   const { notifySuccess, notifyError, notifyWarning } = useApiFeedback()

   const isSubmitting = ref(false)
   const isFetchingOrganism = ref(false)
   const fetchError = ref<string | null>(null)
   const showChangeOrganismModal = ref(false)
   const showResetModal = ref(false)

   const isEditMode = computed(() => Boolean(props.taxid))
   const isBusy = computed(() => isSubmitting.value || isFetchingOrganism.value)
   const hasGoat = computed(() => Boolean(appConfig.general.goat))

   const stepper = useOrganismFormStepper({
      steps: appConfig.organismFormSteps,
      isEditMode,
      hasGoat,
      form: computed(() => organismStore.organismForm),
      publications: computed(() => organismStore.publications),
      vernacularNames: computed(() => organismStore.vernacularNames),
      metadataList: computed(() => organismStore.metadataList),
      images: computed(() => organismStore.images),
   })

   const breadcrumbCurrentLabel = computed(() =>
      isEditMode.value ? 'Edit organism' : 'Create organism',
   )

   const title = computed(() =>
      isEditMode.value ? `Edit ${organismStore.organismForm.scientific_name || 'organism'}` : 'Create a new organism',
   )
   const description = computed(() =>
      isEditMode.value && organismStore.organismForm.scientific_name
         ? `Editing ${organismStore.organismForm.scientific_name} (taxid ${organismStore.organismForm.taxid})`
         : 'Validate an organism against public taxonomy, then complete sequencing and project details.',
   )

   /** True when the next step is the review step. */
   const isLastContentStep = computed(() => {
      const steps = stepper.runtimeSteps.value
      const nextIdx = stepper.activeIndex.value + 1
      return nextIdx < steps.length && steps[nextIdx].id === 'reviewSubmit'
   })

   /** Whether the "Next" button should be disabled. */
   const isNextBlocked = computed(() => {
      const nextIdx = stepper.activeIndex.value + 1
      return !stepper.canNavigateTo(nextIdx)
   })

   watch(
      () => props.taxid,
      async () => {
         fetchError.value = null
         resetFormLocal()
         stepper.resetStepper()
         if (props.taxid === undefined) return
         await getOrganism(props.taxid)
      },
      { immediate: true },
   )

   function handleSelection(payload: { scientificName: string; taxId: string }) {
      const { scientificName, taxId } = payload
      organismStore.organismForm.scientific_name = scientificName
      organismStore.organismForm.taxid = taxId
      // Advance to the next step after organism selection
      stepper.goNext()
   }

   async function getOrganism(taxid: string) {
      isFetchingOrganism.value = true
      fetchError.value = null
      try {
         const { data } = await ItemService.getItem('organisms', taxid)
         const formEntries = Object.entries(data).filter(([k]) =>
            Object.keys(organismStore.organismForm).includes(k),
         )
         organismStore.organismForm = { ...(Object.fromEntries(formEntries) as OrganismForm) }

         const { image_urls, publications, common_names, metadata } = organismStore.organismForm
         if (Array.isArray(publications) && publications.length) {
            organismStore.publications = [...publications]
         }
         if (Array.isArray(image_urls) && image_urls.length) {
            organismStore.images = image_urls.map((m) => ({ value: m }))
         }
         if (Array.isArray(common_names) && common_names.length) {
            organismStore.vernacularNames = [...common_names]
         }
         if (metadata && typeof metadata === 'object' && Object.keys(metadata).length) {
            organismStore.metadataList = Object.entries(metadata).map(([k, v]) => ({ key: k, value: v }))
         }
         // In edit mode start at the first non-select step (goat or sequencing)
         stepper.resetStepper()
      } catch (error) {
         const axiosError = error as AxiosError
         if (axiosError.response?.status === 404) {
            fetchError.value =
               'No organism with this taxid exists in the portal. You can create it from the organism list.'
         } else {
            const ax = error as AxiosError
            const d = ax.response?.data
            fetchError.value = (typeof d === 'string' && d.trim())
               ? d
               : (d as any)?.detail ?? (d as any)?.message ?? 'We could not load this organism. Please try again.'
         }
      } finally {
         isFetchingOrganism.value = false
      }
   }

   async function retryFetch() {
      if (!props.taxid) return
      fetchError.value = null
      await getOrganism(props.taxid)
   }

   async function handleNextStep() {
      stepper.goNext()
   }

   async function handleSubmit() {
      try {
         isSubmitting.value = true
         const { metadataList, images, publications, vernacularNames } = organismStore
         organismStore.organismForm.metadata = {
            ...Object.fromEntries(metadataList.map(({ key, value }) => [key, value])),
         }
         organismStore.organismForm.image_urls =
            images.length > 0 ? images.filter(({ value }) => value).map(({ value }) => value) : []
         organismStore.organismForm.publications = publications.length
            ? publications.filter(({ id }) => id)
            : []
         organismStore.organismForm.common_names =
            vernacularNames.length > 0 ? vernacularNames.filter(({ value }) => value) : []

         if (props.taxid) {
            await AuthService.updateOrganism(props.taxid, organismStore.organismForm)
            resetFormLocal()
            stepper.resetStepper()
            notifySuccess('Organism updated.')
            router.push({ name: 'admin' })
         } else {
            await AuthService.createOrganism(organismStore.organismForm)
            resetFormLocal()
            stepper.resetStepper()
            notifySuccess('Organism created.')
            router.push({ name: 'admin' })
         }
      } catch (error) {
         notifyError(error, 'Could not save the organism. Please try again.')
      } finally {
         isSubmitting.value = false
      }
   }

   function resetFormLocal() {
      organismStore.metadataList = []
      organismStore.publications = []
      organismStore.images = []
      organismStore.vernacularNames = []
      organismStore.resetOrganimForm()
   }

   function confirmChangeOrganism() {
      showChangeOrganismModal.value = false
      resetFormLocal()
      stepper.resetStepper()
   }

   async function confirmReset() {
      showResetModal.value = false
      if (isEditMode.value && props.taxid) {
         organismStore.metadataList = []
         organismStore.publications = []
         organismStore.images = []
         organismStore.vernacularNames = []
         await getOrganism(props.taxid)
      } else {
         resetFormLocal()
         stepper.resetStepper()
      }
   }
</script>

<style lang="scss" scoped>
   .organism-form-page {
      width: 100%;
      max-width: 100%;
      --organism-form-max-width: 1400px;
      --organism-form-space-y: 1.25rem;
      --organism-form-space-x: 1.5rem;
   }

   .organism-form-page__toolbar {
      padding: var(--organism-form-space-y) var(--organism-form-space-x);
      max-width: var(--organism-form-max-width);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
   }

   .organism-form-page__main {
      padding: 0 var(--organism-form-space-x) var(--organism-form-space-y);
      max-width: var(--organism-form-max-width);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
   }

   .organism-form-page__inner-loading {
      min-height: 220px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   /* Skeleton loader */
   @keyframes ofp-shimmer {
      0% { background-position: -600px 0; }
      100% { background-position: 600px 0; }
   }

   .ofp-skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.25rem 0;
   }

   .ofp-skeleton__bar {
      height: 1.125rem;
      border-radius: 6px;
      background: linear-gradient(90deg, rgba(0,0,0,.06) 25%, rgba(0,0,0,.03) 50%, rgba(0,0,0,.06) 75%);
      background-size: 600px 100%;
      animation: ofp-shimmer 1.4s infinite linear;
      width: 100%;

      &--title { height: 1.5rem; width: 40%; }
      &--short { width: 60%; }
   }

   /* Dialog overlay */
   .ofp-dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
   }

   .ofp-dialog {
      background: var(--cms-bg-surface);
      border: 1px solid var(--cms-border);
      border-radius: 14px;
      box-shadow: var(--cms-shadow-md);
      padding: 1.5rem;
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      font-family: var(--cms-font);
   }

   .ofp-dialog__title {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--cms-text);
   }

   .ofp-dialog__body {
      margin: 0;
      font-size: 0.875rem;
      color: var(--cms-text-muted);
      line-height: 1.55;
   }

   .ofp-dialog__footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
   }

   /* Context banner */
   .organism-form-page__context {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: var(--cms-bg-muted);
      border: 1px solid var(--cms-border);
      border-radius: 12px;
      box-shadow: var(--cms-shadow-sm);
   }

   .organism-form-page__context-text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
   }

   .organism-form-page__context-label {
      display: block;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--cms-text-muted);
   }

   .organism-form-page__context-name {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
      line-height: 1.3;
      color: var(--cms-text);
   }

   .organism-form-page__context-meta {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
   }

   .organism-form-page__taxid {
      font-weight: 600;
      color: var(--cms-text);
   }

   .organism-form-page__context-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
   }

   /* Stepper shell: sidebar + panel */
   .organism-form-page__stepper-shell {
      display: flex;
      gap: 1.5rem;
      align-items: flex-start;
   }

   /* Step sidebar nav */
   .organism-form-page__step-nav {
      flex: 0 0 220px;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      position: sticky;
      top: 1.5rem;
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

      &:hover:not(:disabled) { background: var(--cms-bg-hover); }

      &:disabled { cursor: not-allowed; opacity: 0.5; }

      &--active {
         background: var(--cms-bg-hover);
         box-shadow: var(--cms-shadow-sm);
         border-color: var(--cms-border);
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
      background: var(--cms-border);
   }

   .step-nav-item--active .step-nav-item__indicator {
      background: var(--cms-slate);
   }

   .step-nav-item__number {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--cms-text-muted);
   }

   .step-nav-item--active .step-nav-item__number { color: #fff; }

   .step-nav-item__icon { display: block; }
   .step-nav-item__icon--done { color: var(--cms-success); }

   .step-nav-item__icon--locked {
      color: var(--cms-text-muted);
      opacity: 0.7;
   }

   .step-nav-item--active .step-nav-item__icon--locked { color: rgba(255,255,255,.75); }

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
      color: var(--cms-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
   }

   .step-nav-item--active .step-nav-item__label { font-weight: 600; }

   .step-nav-item__badge {
      display: inline-block;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      width: fit-content;
   }

   .step-nav-item__badge--required {
      background: var(--cms-danger-soft);
      color: var(--cms-danger-text);
   }

   .step-nav-item__badge--optional {
      background: var(--cms-border);
      color: var(--cms-text-muted);
   }

   /* Step panel */
   .organism-form-page__step-panel {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
   }

   .organism-form-page__step-header {
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--cms-border);
   }

   .organism-form-page__step-title {
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.015em;
      margin: 0 0 0.35rem;
      color: var(--cms-text);
      font-family: var(--cms-font);
   }

   .organism-form-page__step-desc {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--cms-text-muted);
      font-family: var(--cms-font);
   }

   .organism-form-page__step-content {
      flex: 1;
      min-height: 0;
   }

   .organism-form-page__step-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid var(--cms-border);
      margin-top: 0.5rem;
   }

   /* Empty / error state */
   .organism-form-page__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 0.5rem;
   }

   .organism-form-page__empty-card {
      text-align: center;
      max-width: 400px;
      padding: 2rem 1.75rem;
      background: var(--cms-bg-surface);
      border: 1px solid var(--cms-border);
      border-radius: 12px;
      box-shadow: var(--cms-shadow-sm);
      font-family: var(--cms-font);
   }

   .organism-form-page__empty-icon {
      margin-bottom: 1rem;
      opacity: 0.45;
      color: var(--cms-warning);
   }

   .organism-form-page__empty-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--cms-text);
      margin: 0 0 0.5rem;
      letter-spacing: -0.01em;
      line-height: 1.35;
   }

   .organism-form-page__empty-hint {
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0 0 1.25rem;
      color: var(--cms-text-muted);
   }

   .organism-form-page__empty-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
   }

   /* Responsive: stack sidebar above panel on mobile */
   @media (max-width: 768px) {
      .organism-form-page {
         --organism-form-space-y: 1rem;
         --organism-form-space-x: 1rem;
      }

      .organism-form-page__stepper-shell {
         flex-direction: column;
         gap: 1rem;
      }

      .organism-form-page__step-nav {
         flex: none;
         flex-direction: row;
         flex-wrap: wrap;
         position: static;
         width: 100%;
         gap: 0.375rem;
      }

      .step-nav-item {
         flex: 0 0 auto;
         padding: 0.4rem 0.6rem;
         gap: 0.4rem;
      }

      .step-nav-item__body {
         display: none;
      }

      .step-nav-item--active .step-nav-item__body {
         display: flex;
      }
   }
</style>
