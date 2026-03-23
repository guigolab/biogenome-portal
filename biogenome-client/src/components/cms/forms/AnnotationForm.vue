<template>
   <div class="annotation-form-page" :class="{ 'annotation-form-page--embedded': embedded }">
      <header v-if="!embedded" class="annotation-form-page__toolbar" role="banner">
         <Header :title="title" :description="description" />
      </header>

      <main class="annotation-form-page__main" role="main">
         <div v-if="isLoading" class="annotation-form-page__loading" aria-live="polite">
            <span class="afp-spinner" />
            <span>Loading…</span>
         </div>

         <template v-else>
            <!-- Name + Assembly card (create mode only) -->
            <CmsSectionCard
               v-if="!name"
               title="Annotation Name and Related Assembly"
               description="Enter a unique annotation name and select the related assembly."
            >
               <div class="annotation-form-page__two-col">
                  <NameInput />
                  <AssemblyInput />
               </div>
            </CmsSectionCard>

            <!-- Annotation data card -->
            <CmsSectionCard
               title="Annotation Data"
               description="Upload files or insert links. Required: one bgzipped GFF file and its tabix index."
            >
               <!-- Upload mode toggle -->
               <div class="afp-toggle-group" role="group" aria-label="Upload mode">
                  <button
                     v-for="mode in uploadModes"
                     :key="mode.value"
                     type="button"
                     class="afp-toggle-group__btn"
                     :class="{ 'afp-toggle-group__btn--active': uploadMode === mode.value }"
                     @click="uploadMode = mode.value as 'files' | 'links'"
                  >
                     {{ mode.label }}
                  </button>
               </div>

               <!-- Links mode -->
               <template v-if="uploadMode === 'links'">
                  <CmsInput
                     v-model="annotationStore.annotationForm.gff_gz_location"
                     label="gzipped GFF3 URL"
                     placeholder="https://…/annotation.gff.gz"
                     :disabled="!!annotationStore.annotationForm.gzipAnnotation"
                     hint="URL of the bgzipped GFF3 file"
                  />
                  <CmsInput
                     v-model="annotationStore.annotationForm.tab_index_location"
                     label="Tabindexed GFF3 URL"
                     placeholder="https://…/annotation.gff.gz.tbi"
                     :disabled="!!annotationStore.annotationForm.tabixAnnotation"
                     hint="URL of the tabindex (.tbi) file"
                  />
               </template>

               <!-- Files mode -->
               <template v-else>
                  <div v-if="name" class="afp-notice">
                     <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3"/>
                        <path d="M7 6v4M7 4v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                     </svg>
                     Updating uploaded files is not supported. Delete this annotation and create a new one to change the files.
                  </div>
                  <template v-else>
                     <div>
                        <p class="afp-field-label">bgzipped GFF3 file <span class="afp-required">*</span></p>
                        <CmsFileUpload
                           accept=".gz"
                           upload-text="Select .gz file"
                           :model-value="annotationStore.annotationForm.gzipAnnotation"
                           :disabled="!!annotationStore.annotationForm.gff_gz_location"
                           @update:model-value="annotationStore.annotationForm.gzipAnnotation = $event"
                        />
                     </div>
                     <div>
                        <p class="afp-field-label">Tabix index file (.tbi) <span class="afp-required">*</span></p>
                        <CmsFileUpload
                           accept=".tbi"
                           upload-text="Select .tbi file"
                           :model-value="annotationStore.annotationForm.tabixAnnotation"
                           :disabled="!!annotationStore.annotationForm.tab_index_location"
                           @update:model-value="annotationStore.annotationForm.tabixAnnotation = $event"
                        />
                     </div>
                  </template>
               </template>
            </CmsSectionCard>

            <!-- Metadata card -->
            <CmsSectionCard title="Metadata">
               <template #header>
                  <div class="afp-card-header-row">
                     <div>
                        <h2 class="cms-section-card__title">Metadata</h2>
                        <p class="cms-section-card__desc">Optional key–value fields. Attribute names must be unique.</p>
                     </div>
                     <CmsBtn variant="secondary" @click="addNewAttribute">
                        <template #prefix>
                           <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                           </svg>
                        </template>
                        Add attribute
                     </CmsBtn>
                  </div>
               </template>

               <div v-if="!metadataList.length" class="afp-empty">
                  <p>No custom attributes yet. Click "Add attribute" to start.</p>
               </div>

               <div class="afp-meta-stack">
                  <div
                     v-for="(mt, index) in metadataList"
                     :key="index"
                     class="afp-meta-row"
                  >
                     <div class="afp-meta-row__fields">
                        <CmsInput
                           v-model="mt.key"
                           label="Attribute name"
                           placeholder="e.g. genome_size"
                           :error="isDuplicateAttribute(mt.key)"
                           :error-message="`'${mt.key}' is already present`"
                        />
                        <CmsInput
                           v-model="mt.value"
                           label="Value"
                           placeholder="Attribute value"
                           type="textarea"
                           :rows="1"
                        />
                     </div>
                     <CmsBtn
                        variant="danger"
                        @click="removeAttribute(index)"
                        aria-label="Remove attribute"
                     >
                        <template #prefix>
                           <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                           </svg>
                        </template>
                        Remove
                     </CmsBtn>
                  </div>
               </div>
            </CmsSectionCard>

            <!-- Actions footer -->
            <footer class="annotation-form-page__footer">
               <CmsBtn variant="danger" @click="resetForm">Reset</CmsBtn>
               <CmsBtn variant="primary" :loading="isLoading" @click="handleSubmit">
                  {{ name ? 'Update annotation' : 'Create annotation' }}
               </CmsBtn>
            </footer>
         </template>
      </main>
   </div>
</template>

<script setup lang="ts">
   import { onMounted, computed, ref, watch, withDefaults } from 'vue'
   import { useAnnotationStore } from '../../../stores/annotation-store'
   import AuthService from '../../../services/AuthService'
   import { useRouter } from 'vue-router'
   import CommonService from '../../../services/CommonService'
   import Header from '../ui/Header.vue'
   import CmsSectionCard from '../ui/CmsSectionCard.vue'
   import CmsInput from '../ui/CmsInput.vue'
   import CmsFileUpload from '../ui/CmsFileUpload.vue'
   import CmsBtn from '../ui/CmsBtn.vue'
   import NameInput from '../fields/NameInput.vue'
   import AssemblyInput from '../fields/AssemblyInput.vue'
   import { useApiFeedback } from '../../../composable/useApiFeedback'
   import { useCmsDashboardDrawerStore } from '../../../stores/cms-dashboard-drawer-store'

   const { notifySuccess, notifyError, notifyWarning } = useApiFeedback()
   const drawer = useCmsDashboardDrawerStore()
   const annotationStore = useAnnotationStore()
   const router = useRouter()

   const uploadMode = ref<'files' | 'links'>('files')
   const uploadModes = [
      { label: 'Upload files', value: 'files' },
      { label: 'Insert links', value: 'links' },
   ]
   const isLocal = ref(false)
   const metadataList = ref<{ key: string; value: any }[]>([])
   const isLoading = ref(false)

   const props = withDefaults(defineProps<{ name?: string; embedded?: boolean }>(), { embedded: false })

   watch(
      () => props.name,
      async (name) => {
         resetForm()
         if (name) {
            uploadMode.value = 'links'
            await retrieveAnnotation(name)
         }
      },
   )

   onMounted(async () => {
      if (props.name) {
         await retrieveAnnotation(props.name)
         uploadMode.value = 'links'
      }
   })

   function resetForm() {
      annotationStore.resetForm()
      metadataList.value = []
      isLocal.value = false
   }

   async function retrieveAnnotation(name: string) {
      isLoading.value = true
      try {
         const { data } = await CommonService.getItem('annotations', name)
         isLocal.value = Boolean(data.external)
         Object.entries(data).forEach(([key, value]) => {
            if (key in annotationStore.annotationForm) {
               annotationStore.annotationForm[key] = value
            }
         })
         metadataList.value = Object.entries(data.metadata || {}).map(([key, value]) => ({ key, value }))
      } catch (err) {
         notifyError(err, 'Unable to retrieve annotation data.')
      } finally {
         isLoading.value = false
      }
   }

   async function handleSubmit() {
      if (!annotationStore.annotationForm.assembly_accession) {
         notifyWarning('Please select an assembly before submitting.')
         return
      }
      if (uploadMode.value === 'links') {
         if (!annotationStore.annotationForm.gff_gz_location || !annotationStore.annotationForm.tab_index_location) {
            notifyWarning('Please provide both the GFF3 URL and the tabix index URL.')
            return
         }
      } else if (!props.name) {
         if (!annotationStore.annotationForm.gzipAnnotation) {
            notifyWarning('Please upload the bgzipped GFF3 file.')
            return
         }
         if (!annotationStore.annotationForm.tabixAnnotation) {
            notifyWarning('Please upload the tabix index (.tbi) file.')
            return
         }
      }

      const requestData = parseRequestData()

      try {
         isLoading.value = true
         if (props.name) {
            await AuthService.updateAnnotation(props.name, requestData)
            notifySuccess(`Annotation "${props.name}" updated successfully.`)
         } else {
            const { data } = await AuthService.createAnnotation(requestData)
            const label = typeof data === 'string' ? data : (data as any)?.name ?? 'Annotation'
            notifySuccess(`${label} created successfully.`)
         }
         if (props.embedded) {
            drawer.close()
         } else {
            router.push({ name: 'admin' })
         }
      } catch (err) {
         notifyError(err, 'Could not save the annotation. Please try again.')
      } finally {
         isLoading.value = false
      }
   }

   function parseRequestData() {
      const metadata = Object.fromEntries(
         metadataList.value.filter((m) => m.key && m.value).map((m) => [m.key, m.value]),
      )
      const request = new FormData()
      for (const [key, value] of Object.entries(annotationStore.annotationForm)) {
         if (value) request.append(key, value)
      }
      Object.entries(metadata).forEach(([key, value]) => {
         request.append(`metadata.${key}`, value)
      })
      return request
   }

   function addNewAttribute() {
      metadataList.value.push({ key: '', value: '' })
   }

   function removeAttribute(index: number) {
      metadataList.value.splice(index, 1)
   }

   function isDuplicateAttribute(key: string): boolean {
      return metadataList.value.filter((m) => m.key === key).length > 1
   }

   const title = 'Annotation Form'
   const description = computed(() => (props.name ? `Edit ${props.name}` : 'Create a new annotation'))
</script>

<style lang="scss" scoped>
   .annotation-form-page {
      width: 100%;
      max-width: 100%;
      --afp-max-w: 1200px;
      --afp-space-y: 1.25rem;
      --afp-space-x: 1.5rem;

      &--embedded {
         .annotation-form-page__main {
            padding-top: 0.75rem;
         }
      }
   }

   .annotation-form-page__toolbar {
      padding: var(--afp-space-y) var(--afp-space-x);
      max-width: var(--afp-max-w);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      border-bottom: 1px solid var(--cms-border);
      margin-bottom: var(--afp-space-y);
   }

   .annotation-form-page__main {
      padding: 0 var(--afp-space-x) var(--afp-space-y);
      max-width: var(--afp-max-w);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
   }

   .annotation-form-page__loading {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 2rem 0;
      color: var(--cms-text-muted);
      font-size: 0.9rem;
      font-family: var(--cms-font);
   }

   .annotation-form-page__two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;

      @media (max-width: 680px) { grid-template-columns: 1fr; }
   }

   .annotation-form-page__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding-top: 0.25rem;
   }

   @keyframes afp-spin { to { transform: rotate(360deg); } }

   .afp-spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid var(--cms-border-strong);
      border-top-color: var(--cms-primary);
      border-radius: 50%;
      animation: afp-spin 0.75s linear infinite;
   }

   .afp-toggle-group {
      display: inline-flex;
      border: 1px solid var(--cms-border-strong);
      border-radius: var(--cms-radius-sm);
      overflow: hidden;
   }

   .afp-toggle-group__btn {
      padding: 0.45rem 1rem;
      font-size: 0.875rem;
      font-family: var(--cms-font);
      font-weight: 500;
      background: var(--cms-bg-surface);
      color: var(--cms-text-muted);
      border: none;
      border-right: 1px solid var(--cms-border-strong);
      cursor: pointer;
      transition: background 0.12s, color 0.12s;

      &:last-child { border-right: none; }

      &:hover:not(.afp-toggle-group__btn--active) {
         background: var(--cms-bg-hover);
         color: var(--cms-text);
      }

      &--active {
         background: var(--cms-primary);
         color: var(--cms-text-on-dark);
         font-weight: 600;
      }
   }

   .afp-notice {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: var(--cms-info-soft);
      border: 1px solid rgba(8, 145, 178, 0.2);
      border-radius: 8px;
      font-size: 0.875rem;
      color: var(--cms-info-text);
      font-family: var(--cms-font);
      line-height: 1.5;

      svg { flex-shrink: 0; margin-top: 0.1rem; }
   }

   .afp-field-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--cms-text);
      margin: 0 0 0.4rem;
      font-family: var(--cms-font);
   }

   .afp-required { color: var(--cms-danger); }

   .afp-empty {
      padding: 1.25rem 1rem;
      border-radius: 8px;
      border: 1px dashed var(--cms-border-strong);
      text-align: center;
      font-size: 0.875rem;
      color: var(--cms-text-muted);
      font-family: var(--cms-font);
   }

   .afp-meta-stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
   }

   .afp-meta-row {
      display: flex;
      gap: 0.75rem;
      align-items: flex-end;
      padding: 1rem;
      border: 1px solid var(--cms-border);
      border-radius: 10px;
      background: var(--cms-bg-muted);

      @media (max-width: 640px) {
         flex-direction: column;
         align-items: stretch;
      }
   }

   .afp-meta-row__fields {
      flex: 1;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
      gap: 0.875rem;
      min-width: 0;

      @media (max-width: 640px) { grid-template-columns: 1fr; }
   }

   .afp-card-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
   }

   /* Override CmsSectionCard's internal .cms-section-card__title/.desc */
   :deep(.cms-section-card__title) { margin-bottom: 0.3rem; }

   @media (max-width: 768px) {
      .annotation-form-page {
         --afp-space-y: 1rem;
         --afp-space-x: 1rem;
      }
   }
</style>
