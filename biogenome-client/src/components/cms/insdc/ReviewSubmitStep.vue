<template>
   <div class="review-step">
      <p class="review-step__lead">
         Review the details below before submitting. The import will fetch the record from INSDC and save it to the portal database.
      </p>

      <div class="review-step__summary">
         <div class="review-step__row">
            <span class="review-step__label">Import type</span>
            <span class="review-step__value">
               <!-- biosample -->
               <svg v-if="meta.key === 'biosamples'" width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" class="review-step__icon">
                  <path d="M7 2v6l-3.5 7a1 1 0 00.9 1.5h11.2a1 1 0 00.9-1.5L13 8V2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M7 2h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
               </svg>
               <!-- assembly -->
               <svg v-else-if="meta.key === 'assemblies'" width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" class="review-step__icon">
                  <path d="M4 3c3 2 9 2 12 0M4 17c3-2 9-2 12 0M4 10h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <path d="M4 3s1 3.5 1 7-1 7-1 7M16 3s-1 3.5-1 7 1 7 1 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
               </svg>
               <!-- reads -->
               <svg v-else width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" class="review-step__icon">
                  <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/>
                  <path d="M5 8h4M5 12h6M13 8h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
               </svg>
               {{ meta.label }}
            </span>
         </div>
         <div class="review-step__row">
            <span class="review-step__label">Accession</span>
            <code class="review-step__accession">{{ accession }}</code>
         </div>
         <div v-if="meta.sideEffects" class="review-step__row review-step__row--notice">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" class="review-step__notice-icon">
               <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" stroke-width="1.2"/>
               <path d="M6.5 5v3.5M6.5 3.5v.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            <span class="review-step__notice-text">{{ meta.sideEffects }}</span>
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
   import type { InsdcModelMeta } from '../../../composable/useInsdcImportFlow'

   defineProps<{
      meta: InsdcModelMeta
      accession: string
   }>()
</script>

<style lang="scss" scoped>
   .review-step {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      font-family: var(--cms-font);
   }

   .review-step__lead {
      font-size: 0.875rem;
      color: var(--cms-text-muted);
      margin: 0;
      line-height: 1.5;
   }

   .review-step__summary {
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid var(--cms-border);
      border-radius: 8px;
      overflow: hidden;
   }

   .review-step__row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--cms-border);

      &:last-child { border-bottom: none; }

      &--notice {
         background: var(--cms-bg-muted);
      }
   }

   .review-step__label {
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--cms-text-muted);
      min-width: 120px;
      flex-shrink: 0;
   }

   .review-step__value {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--cms-text);
   }

   .review-step__icon {
      opacity: 0.75;
      color: var(--cms-text-muted);
   }

   .review-step__accession {
      font-family: var(--cms-font-mono);
      font-size: 0.95rem;
      background: var(--cms-bg-muted);
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      color: var(--cms-text);
   }

   .review-step__notice-icon {
      flex-shrink: 0;
      opacity: 0.55;
      color: var(--cms-text-muted);
   }

   .review-step__notice-text {
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
   }
</style>
