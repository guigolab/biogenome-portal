<template>
   <div class="review-step">
      <!-- Submit readiness banner -->
      <div
         class="review-step__banner"
         :class="canSubmit ? 'review-step__banner--ready' : 'review-step__banner--blocking'"
         role="status"
      >
         <!-- ready: check icon -->
         <svg
            v-if="canSubmit"
            class="review-step__banner-icon"
            width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
         >
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.4"/>
            <path d="M5 8l2.5 2.5 4-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>
         <!-- blocking: warning icon -->
         <svg
            v-else
            class="review-step__banner-icon"
            width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
         >
            <path d="M8 2L15 13H1L8 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            <path d="M8 6v4M8 11.5v.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
         </svg>

         <div class="review-step__banner-text">
            <p v-if="canSubmit" class="review-step__banner-title">Ready to submit</p>
            <p v-else class="review-step__banner-title">Complete required steps first</p>
            <p class="review-step__banner-hint">
               {{ canSubmit
                  ? 'All required steps are complete. Review your entries below before submitting.'
                  : 'Go back and fill the highlighted required steps before you can submit.' }}
            </p>
         </div>
      </div>

      <!-- Steps summary -->
      <ul class="review-step__steps-list">
         <li
            v-for="(step, idx) in displaySteps"
            :key="step.id"
            class="review-step__step-row"
            :class="{
               'review-step__step-row--complete': step.completion.complete,
               'review-step__step-row--incomplete-required': step.required && !step.completion.complete,
               'review-step__step-row--incomplete-optional': !step.required && !step.completion.complete,
            }"
         >
            <div class="review-step__step-status">
               <!-- done -->
               <svg v-if="step.completion.complete" class="review-step__step-icon review-step__step-icon--done" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M4.5 7l2 2 3-3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
               <!-- required but incomplete -->
               <svg v-else-if="step.required" class="review-step__step-icon review-step__step-icon--error" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M7 4.5v3.5M7 9.5v.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
               </svg>
               <!-- optional and incomplete -->
               <svg v-else class="review-step__step-icon review-step__step-icon--empty" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3"/>
               </svg>
            </div>
            <div class="review-step__step-info">
               <span class="review-step__step-name">{{ step.title['en'] }}</span>
               <span
                  v-if="step.required"
                  class="review-step__step-badge review-step__step-badge--required"
               >Required</span>
               <span v-else class="review-step__step-badge review-step__step-badge--optional">Optional</span>
            </div>
            <button
               type="button"
               class="review-step__step-edit"
               @click="emit('go-to-step', idx)"
            >
               <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M9 2l1 1-6 6-1-1L9 2zM2 9.5l.5-2 1.5 1.5-2 .5z" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
               Edit
            </button>
         </li>
      </ul>

      <!-- Submit button -->
      <footer class="review-step__footer">
         <CmsBtn
            :loading="isSubmitting"
            :disabled="!canSubmit || isSubmitting"
            size="lg"
            @click="emit('submit')"
         >
            <template #suffix>
               <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M2 6.5h9M7.5 2.5l4.5 4-4.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
            </template>
            Submit organism
         </CmsBtn>
         <p v-if="!canSubmit" class="review-step__footer-hint">
            Complete the required steps marked above to enable submission.
         </p>
      </footer>
   </div>
</template>

<script setup lang="ts">
   import { computed } from 'vue'
   import type { RuntimeStep } from '../../../composable/useOrganismFormStepper'
   import CmsBtn from '../ui/CmsBtn.vue'

   const props = defineProps<{
      runtimeSteps: RuntimeStep[]
      canSubmit: boolean
      isSubmitting: boolean
   }>()

   const emit = defineEmits<{
      'go-to-step': [index: number]
      submit: []
   }>()

   /** All steps except reviewSubmit itself */
   const displaySteps = computed(() => props.runtimeSteps.filter((s) => s.id !== 'reviewSubmit'))
</script>

<style lang="scss" scoped>
   .review-step {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      font-family: var(--cms-font);
   }

   .review-step__banner {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 1rem 1.125rem;
      border-radius: 12px;
      border: 1px solid transparent;

      &--ready {
         background: var(--cms-success-soft);
         border-color: rgba(22, 163, 74, 0.2);
      }

      &--blocking {
         background: var(--cms-warning-soft);
         border-color: rgba(217, 119, 6, 0.22);
      }
   }

   .review-step__banner-icon {
      flex-shrink: 0;
      margin-top: 0.15rem;

      .review-step__banner--ready & { color: var(--cms-success); }
      .review-step__banner--blocking & { color: var(--cms-warning); }
   }

   .review-step__banner-title {
      margin: 0 0 0.2rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--cms-text);
   }

   .review-step__banner-hint {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.45;
      color: var(--cms-text-muted);
   }

   .review-step__steps-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid var(--cms-border);
      border-radius: 12px;
      overflow: hidden;
   }

   .review-step__step-row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--cms-border);
      background: var(--cms-bg-surface);
      transition: background 0.1s;

      &:last-child { border-bottom: none; }

      &--complete { background: var(--cms-success-soft); }
      &--incomplete-required { background: var(--cms-danger-soft); }
   }

   .review-step__step-status {
      flex-shrink: 0;
   }

   .review-step__step-icon {
      &--done { color: var(--cms-success); }
      &--error { color: var(--cms-danger); }
      &--empty { color: var(--cms-text-faint); }
   }

   .review-step__step-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      min-width: 0;
   }

   .review-step__step-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--cms-text);
   }

   .review-step__step-badge {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;

      &--required { background: var(--cms-danger-soft); color: var(--cms-danger-text); }
      &--optional { background: var(--cms-bg-muted); color: var(--cms-text-muted); }
   }

   .review-step__step-edit {
      flex-shrink: 0;
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.55rem;
      border: 1px solid var(--cms-border-strong);
      border-radius: var(--cms-radius-sm);
      background: transparent;
      color: var(--cms-text-muted);
      font-size: 0.8rem;
      font-family: var(--cms-font);
      cursor: pointer;
      transition: background 0.12s, color 0.12s;

      &:hover { background: var(--cms-bg-muted); color: var(--cms-text); }
   }

   .review-step__footer {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      align-items: flex-start;
      padding-top: 0.5rem;
      border-top: 1px solid var(--cms-border);
   }

   .review-step__footer-hint {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
   }
</style>
