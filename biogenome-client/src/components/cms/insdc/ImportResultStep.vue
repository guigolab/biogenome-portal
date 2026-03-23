<template>
   <div class="result-step">
      <!-- Submitting state -->
      <div v-if="phase === 'submitting'" class="result-step__state result-step__state--loading">
         <span class="result-step__spinner" aria-hidden="true" />
         <p class="result-step__status-text">Importing from INSDC…</p>
         <p class="result-step__sub">This usually takes a few seconds.</p>
      </div>

      <!-- Success state -->
      <div v-else-if="phase === 'success'" class="result-step__state result-step__state--success">
         <div class="result-step__icon-wrap result-step__icon-wrap--success">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
               <circle cx="14" cy="14" r="13" stroke="currentColor" stroke-width="1.5"/>
               <path d="M8.5 14l4 4 7-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
         </div>
         <p class="result-step__status-text">Import successful</p>
         <p class="result-step__message">{{ message }}</p>
         <p v-if="details" class="result-step__details">{{ details }}</p>
         <div class="result-step__actions">
            <CmsBtn variant="secondary" @click="$emit('newImport')">Import another</CmsBtn>
            <CmsBtn :to="{ name: 'admin' }">Back to dashboard</CmsBtn>
         </div>
      </div>

      <!-- Error state -->
      <div v-else-if="phase === 'error'" class="result-step__state result-step__state--error">
         <div class="result-step__icon-wrap result-step__icon-wrap--error">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
               <circle cx="14" cy="14" r="13" stroke="currentColor" stroke-width="1.5"/>
               <path d="M14 9v7M14 18v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
         </div>
         <p class="result-step__status-text">Import failed</p>
         <p class="result-step__message result-step__message--error">{{ message }}</p>
         <div class="result-step__actions">
            <CmsBtn variant="danger" @click="$emit('reset')">Start over</CmsBtn>
            <CmsBtn @click="$emit('retry')">Try again</CmsBtn>
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
   import type { ImportPhase, InsdcModel } from '../../../composable/useInsdcImportFlow'
   import CmsBtn from '../ui/CmsBtn.vue'

   defineProps<{
      phase: ImportPhase
      message: string
      details?: string
      importedModel: InsdcModel
   }>()

   defineEmits<{
      (e: 'newImport'): void
      (e: 'reset'): void
      (e: 'retry'): void
   }>()
</script>

<style lang="scss" scoped>
   @keyframes result-spin { to { transform: rotate(360deg); } }

   .result-step {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      font-family: var(--cms-font);
   }

   .result-step__state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      text-align: center;
      padding: 2rem 1rem;
      width: 100%;
      max-width: 480px;
   }

   .result-step__spinner {
      width: 3rem;
      height: 3rem;
      border: 3px solid var(--cms-border);
      border-top-color: var(--cms-primary);
      border-radius: 50%;
      animation: result-spin 0.8s linear infinite;
   }

   .result-step__icon-wrap {
      width: 4rem;
      height: 4rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;

      &--success {
         background: var(--cms-success-soft);
         color: var(--cms-success);
      }

      &--error {
         background: var(--cms-danger-soft);
         color: var(--cms-danger-text);
      }
   }

   .result-step__status-text {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
      color: var(--cms-text);
   }

   .result-step__message {
      font-size: 0.9rem;
      color: var(--cms-text-muted);
      margin: 0;
      max-width: 380px;
      line-height: 1.5;

      &--error { color: var(--cms-danger-text); }
   }

   .result-step__details {
      font-size: 0.8125rem;
      margin: 0;
      color: var(--cms-text-muted);
   }

   .result-step__sub {
      font-size: 0.8125rem;
      margin: 0;
      color: var(--cms-text-muted);
   }

   .result-step__actions {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 0.5rem;
   }
</style>
