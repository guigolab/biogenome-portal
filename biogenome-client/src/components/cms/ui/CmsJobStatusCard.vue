<template>
   <div
      v-if="phase !== 'idle'"
      class="cms-job-status"
      :class="`cms-job-status--${phase}`"
      role="status"
      aria-live="polite"
      aria-label="Import job status"
   >
      <div class="cms-job-status__header">
         <div class="cms-job-status__badge-wrap">
            <span class="cms-job-status__badge" :class="`cms-job-status__badge--${phase}`">
               <span
                  v-if="phase === 'queued' || phase === 'running'"
                  class="cms-job-status__spinner"
                  aria-hidden="true"
               />
               <svg
                  v-else-if="phase === 'success'"
                  width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
               >
                  <circle cx="5.5" cy="5.5" r="5" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M3 5.5l2 2 3-3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
               <svg
                  v-else-if="phase === 'error'"
                  width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
               >
                  <circle cx="5.5" cy="5.5" r="5" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M5.5 3v3M5.5 7.5v.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
               </svg>
               {{ phaseLabel }}
            </span>
            <span class="cms-job-status__title">Import status</span>
         </div>
      </div>

      <!-- Running progress bar -->
      <div v-if="phase === 'queued' || phase === 'running'" class="cms-job-status__progress-track">
         <div class="cms-job-status__progress-bar" />
      </div>

      <!-- Success summary -->
      <div v-if="phase === 'success' && successSummary" class="cms-job-status__log">
         <div class="cms-job-status__log-row">
            <span class="cms-job-status__log-key">Records saved</span>
            <strong class="cms-job-status__log-val">{{ successSummary.recordsSaved }}</strong>
         </div>
         <div class="cms-job-status__log-row">
            <span class="cms-job-status__log-key">New organisms created</span>
            <strong class="cms-job-status__log-val">{{ successSummary.createdOrganisms }}</strong>
         </div>
         <div class="cms-job-status__log-row">
            <span class="cms-job-status__log-key">Skipped or not found</span>
            <strong class="cms-job-status__log-val">{{ successSummary.skippedOrNotFound }}</strong>
         </div>
         <p
            v-if="successSummary.createdOrganisms > 0 && successSummary.createdOrganisms !== successSummary.recordsSaved"
            class="cms-job-status__log-note"
         >
            Created organisms differ from saved records because existing organisms can be updated without being newly created.
         </p>
      </div>

      <!-- Progress / error messages -->
      <div
         v-if="progressMessages.length || errorMessages.length"
         class="cms-job-status__messages"
         aria-live="polite"
      >
         <p
            v-for="(msg, i) in progressMessages"
            :key="`p-${i}`"
            class="cms-job-status__msg"
         >
            {{ msg }}
         </p>
         <ul v-if="phase === 'error' && errorMessages.length" class="cms-job-status__errors">
            <li
               v-for="(msg, i) in errorMessages"
               :key="`e-${i}`"
               class="cms-job-status__msg cms-job-status__msg--error"
            >
               {{ msg }}
            </li>
         </ul>
      </div>
   </div>
</template>

<script setup lang="ts">
   import { computed } from 'vue'
   import type { TaskPhase } from '../../../composable/useCeleryUploadPoll'

   const props = defineProps<{
      phase: TaskPhase
      progressMessages?: string[]
      errorMessages?: string[]
      successSummary?: {
         recordsSaved: number
         createdOrganisms: number
         skippedOrNotFound: number
      } | null
   }>()

   const phaseLabel = computed(() => {
      const map: Record<TaskPhase, string> = {
         idle: '',
         queued: 'Queued',
         running: 'Running',
         success: 'Succeeded',
         error: 'Failed',
      }
      return map[props.phase] ?? ''
   })
</script>

<style lang="scss" scoped>
   @keyframes cms-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
   @keyframes cms-spin { to { transform: rotate(360deg); } }

   .cms-job-status {
      border: 1px solid var(--cms-border);
      border-radius: var(--cms-radius-card);
      background: var(--cms-bg-surface);
      overflow: hidden;
      font-family: var(--cms-font);

      &--success {
         border-color: rgba(22, 163, 74, 0.3);
         background: var(--cms-success-soft);
      }

      &--error {
         border-color: rgba(220, 38, 38, 0.25);
         background: var(--cms-danger-soft);
      }
   }

   .cms-job-status__header {
      padding: 0.875rem 1.125rem;
      display: flex;
      align-items: center;
   }

   .cms-job-status__badge-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
   }

   .cms-job-status__title {
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--cms-text-muted);
   }

   .cms-job-status__badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;

      &--queued, &--running {
         background: var(--cms-primary-soft);
         color: var(--cms-primary);
      }

      &--success {
         background: var(--cms-success-soft);
         color: var(--cms-success-text);
      }

      &--error {
         background: var(--cms-danger-soft);
         color: var(--cms-danger-text);
      }
   }

   .cms-job-status__spinner {
      width: 10px;
      height: 10px;
      border: 1.5px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: cms-spin 0.7s linear infinite;
      opacity: 0.7;
   }

   .cms-job-status__progress-track {
      height: 3px;
      background: var(--cms-border);
      overflow: hidden;
      position: relative;
   }

   .cms-job-status__progress-bar {
      position: absolute;
      inset: 0;
      width: 40%;
      background: var(--cms-primary);
      animation: cms-slide 1.5s ease-in-out infinite;
      border-radius: 2px;
   }

   .cms-job-status__log {
      padding: 0.875rem 1.125rem;
      border-top: 1px solid var(--cms-border);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
   }

   .cms-job-status__log-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      font-size: 0.875rem;
   }

   .cms-job-status__log-key {
      color: var(--cms-text-muted);
   }

   .cms-job-status__log-val {
      color: var(--cms-text);
   }

   .cms-job-status__log-note {
      margin: 0.25rem 0 0;
      font-size: 0.8rem;
      color: var(--cms-text-muted);
      line-height: 1.45;
   }

   .cms-job-status__messages {
      padding: 0.875rem 1.125rem;
      border-top: 1px solid var(--cms-border);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: 40vh;
      overflow-y: auto;
   }

   .cms-job-status__msg {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--cms-text);

      &--error { color: var(--cms-danger-text); }
   }

   .cms-job-status__errors {
      margin: 0;
      padding-left: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
   }
</style>
