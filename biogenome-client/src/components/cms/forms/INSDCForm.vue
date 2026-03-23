<template>
   <div class="insdc-page" :class="{ 'insdc-page--embedded': embedded }">
      <header v-if="!embedded" class="insdc-page__toolbar" role="banner">
         <Header
            title="Import from INSDC"
            description="Import BioSamples, Assemblies, or Read runs by their INSDC accession."
         />
      </header>

      <main class="insdc-page__main" role="main">
         <section class="insdc-page__section">
            <CmsSectionCard class="insdc-wizard">
               <!-- Step progress indicator -->
               <template #header>
                  <div class="insdc-wizard__steps" role="list" aria-label="Import steps">
                     <div
                        v-for="(s, i) in STEPS"
                        :key="s.id"
                        role="listitem"
                        class="insdc-wizard__step"
                        :class="{
                           'insdc-wizard__step--active': flow.step.value === s.id,
                           'insdc-wizard__step--done': flow.step.value > s.id,
                        }"
                        :aria-current="flow.step.value === s.id ? 'step' : undefined"
                     >
                        <div class="insdc-wizard__step-dot">
                           <svg
                              v-if="flow.step.value > s.id"
                              width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
                           >
                              <path d="M2.5 5.5l2.5 2.5 4-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                           </svg>
                           <span v-else>{{ i + 1 }}</span>
                        </div>
                        <span class="insdc-wizard__step-label">{{ s.label }}</span>
                        <div v-if="i < STEPS.length - 1" class="insdc-wizard__step-connector" />
                     </div>
                  </div>
               </template>

               <!-- Step body -->
               <div class="insdc-wizard__body">
                  <!-- Step 1 — choose type -->
                  <template v-if="flow.step.value === 1">
                     <h2 class="insdc-wizard__step-title">Choose import type</h2>
                     <ImportTypeStep
                        :model-value="flow.model.value"
                        @update:model-value="flow.setModel"
                     />
                  </template>

                  <!-- Step 2 — enter accession -->
                  <template v-else-if="flow.step.value === 2">
                     <h2 class="insdc-wizard__step-title">Enter accession</h2>
                     <AccessionStep
                        :model-value="flow.accession.value"
                        :meta="flow.activeMeta.value"
                        :is-valid="flow.accessionValid.value"
                        @update:model-value="flow.accession.value = $event"
                     />
                  </template>

                  <!-- Step 3 — review -->
                  <template v-else-if="flow.step.value === 3">
                     <h2 class="insdc-wizard__step-title">Review & confirm</h2>
                     <ReviewSubmitStep
                        :meta="flow.activeMeta.value"
                        :accession="flow.normalizedAccession.value"
                     />
                  </template>

                  <!-- Step 4 — result -->
                  <template v-else-if="flow.step.value === 4">
                     <ImportResultStep
                        :phase="flow.phase.value"
                        :message="flow.resultMessage.value"
                        :details="flow.resultDetails.value"
                        :imported-model="flow.model.value"
                        @new-import="flow.newImport"
                        @reset="flow.resetToStep1"
                        @retry="flow.submit"
                     />
                  </template>
               </div>

               <!-- Navigation footer — hidden on step 4 -->
               <template v-if="flow.step.value < 4" #footer>
                  <footer class="insdc-wizard__nav">
                     <CmsBtn
                        v-if="flow.step.value > 1"
                        variant="secondary"
                        @click="flow.back"
                     >
                        <template #prefix>
                           <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <path d="M8 2L4 6l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                           </svg>
                        </template>
                        Back
                     </CmsBtn>
                     <span v-else />

                     <!-- Final step: submit -->
                     <CmsBtn
                        v-if="flow.step.value === 3"
                        :disabled="!flow.isStepValid.value"
                        @click="flow.submit"
                     >
                        {{ flow.activeMeta.value.createLabel }}
                     </CmsBtn>
                     <!-- Intermediate steps: continue -->
                     <CmsBtn
                        v-else
                        :disabled="!flow.isStepValid.value"
                        @click="flow.next"
                     >
                        Continue
                        <template #suffix>
                           <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                           </svg>
                        </template>
                     </CmsBtn>
                  </footer>
               </template>
            </CmsSectionCard>
         </section>
      </main>
   </div>
</template>

<script setup lang="ts">
   import { onMounted, withDefaults } from 'vue'
   import Header from '../ui/Header.vue'
   import CmsSectionCard from '../ui/CmsSectionCard.vue'
   import CmsBtn from '../ui/CmsBtn.vue'
   import ImportTypeStep from '../insdc/ImportTypeStep.vue'
   import AccessionStep from '../insdc/AccessionStep.vue'
   import ReviewSubmitStep from '../insdc/ReviewSubmitStep.vue'
   import ImportResultStep from '../insdc/ImportResultStep.vue'
   import { useInsdcImportFlow, type InsdcModel } from '../../../composable/useInsdcImportFlow'

   const props = withDefaults(
      defineProps<{ importModel?: string; embedded?: boolean }>(),
      { embedded: false },
   )

   const STEPS = [
      { id: 1, label: 'Import type' },
      { id: 2, label: 'Accession' },
      { id: 3, label: 'Review' },
      { id: 4, label: 'Result' },
   ] as const

   const validModels: InsdcModel[] = ['biosamples', 'assemblies', 'reads']
   const initModel = validModels.includes(props.importModel as InsdcModel)
      ? (props.importModel as InsdcModel)
      : undefined

   const flow = useInsdcImportFlow(initModel)

   onMounted(() => {
      if (initModel) {
         flow.step.value = 2
      }
   })
</script>

<style lang="scss" scoped>
   .insdc-page {
      width: 100%;
      max-width: 720px;
      margin: 0 auto;
      font-family: var(--cms-font);

      &--embedded {
         max-width: 100%;
         margin: 0;

         .insdc-page__main {
            padding-top: 0.75rem;
         }
      }
   }

   .insdc-page__toolbar {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--cms-border);
      margin-bottom: 1.25rem;
   }

   .insdc-page__main {
      padding: 0 1.5rem 2rem;
   }

   .insdc-page__section {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
   }

   /* Step progress indicator */
   .insdc-wizard__steps {
      display: flex;
      align-items: center;
      gap: 0;
      width: 100%;
   }

   .insdc-wizard__step {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 0;
   }

   .insdc-wizard__step-dot {
      width: 1.6rem;
      height: 1.6rem;
      border-radius: 50%;
      border: 2px solid var(--cms-border-strong);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
      transition: background 0.2s, border-color 0.2s;
      color: var(--cms-text-muted);
      background: var(--cms-bg-surface);

      .insdc-wizard__step--active & {
         border-color: var(--cms-primary);
         color: var(--cms-primary);
      }

      .insdc-wizard__step--done & {
         background: var(--cms-primary);
         border-color: var(--cms-primary);
         color: #fff;
      }
   }

   .insdc-wizard__step-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--cms-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      .insdc-wizard__step--active & {
         color: var(--cms-primary);
         font-weight: 600;
      }

      .insdc-wizard__step--done & {
         color: var(--cms-text);
      }
   }

   .insdc-wizard__step-connector {
      flex: 1;
      height: 1px;
      background: var(--cms-border);
      min-width: 16px;
      margin: 0 0.35rem;
   }

   .insdc-wizard__body {
      min-height: 240px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   .insdc-wizard__step-title {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--cms-text);
   }

   .insdc-wizard__nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
   }

   @media (max-width: 480px) {
      .insdc-wizard__step-label { display: none; }
      .insdc-page__main { padding: 0 1rem 1.5rem; }
      .insdc-page__toolbar { padding: 1rem; }
   }
</style>
