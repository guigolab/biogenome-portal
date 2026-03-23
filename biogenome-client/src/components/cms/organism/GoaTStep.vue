<template>
   <div class="goat-step">
      <!-- Sequencing status -->
      <section class="goat-step__section">
         <div class="goat-step__field-head">
            <h3 class="goat-step__field-label">Sequencing status</h3>
            <p class="goat-step__field-hint">
               Track the current pipeline stage for EBP / GoaT reporting.
            </p>
         </div>
         <p v-if="isStatusLocked" class="goat-step__lock-msg">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
               <rect x="2" y="6" width="9" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
               <path d="M4 6V5a2.5 2.5 0 115 0v1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            This status is locked after submission or publication.
         </p>

         <!-- Status description cards (always visible) -->
         <div class="goat-step__status-grid">
            <button
               v-for="step in visibleGoatSteps"
               :key="step.value"
               class="goat-step__status-card"
               :class="{
                  'goat-step__status-card--selected': organismStore.organismForm.goat_status === step.value,
                  'goat-step__status-card--locked': isStatusLocked && step.value !== organismStore.organismForm.goat_status,
               }"
               type="button"
               :disabled="isStatusLocked"
               @click="selectStatus(step.value)"
            >
               <span class="goat-step__status-card-badge" :class="`goat-step__status-card-badge--${step.color}`">
                  {{ step.value }}
               </span>
               <p class="goat-step__status-card-desc">{{ t(step.description) }}</p>
            </button>
         </div>
      </section>

      <!-- Target list status -->
      <section class="goat-step__section">
         <div class="goat-step__field-head">
            <h3 class="goat-step__field-label">Target list status</h3>
            <p class="goat-step__field-hint">
               Defines the organism's role in the project target list and GoaT prioritisation.
            </p>
         </div>

         <!-- Target list description cards (always visible) -->
         <div class="goat-step__status-grid">
            <button
               v-for="(entry, key) in targetListEntries"
               :key="key"
               class="goat-step__status-card"
               :class="{
                  'goat-step__status-card--selected': organismStore.organismForm.target_list_status === key,
               }"
               type="button"
               @click="selectTargetList(key as TargetListKey)"
            >
               <span class="goat-step__status-card-badge goat-step__status-card-badge--neutral">
                  {{ formatTargetLabel(key) }}
               </span>
               <p class="goat-step__status-card-desc">{{ entry.desc }}</p>
            </button>
         </div>
      </section>
   </div>
</template>

<script setup lang="ts">
   import { computed } from 'vue'
   import { useI18n } from 'vue-i18n'
   import { useOrganismStore } from '../../../stores/organism-store'

   const organismStore = useOrganismStore()
   const { t } = useI18n()

   const SELECTABLE_STATUS = [
      'Sample Collected',
      'Sample Acquired',
      'Data Generation',
      'In Assembly',
   ] as const
   const TERMINAL_STATUS = [
      'INSDC Submitted',
      'Publication Available',
   ] as const

   type TargetListKey = 'long_list' | 'family_representative' | 'other_priority'

   const goatSteps = [
      {
         value: 'Sample Collected',
         color: 'step0',
         label: 'goat.collected.label',
         description: 'goat.collected.description',
      },
      {
         value: 'Sample Acquired',
         color: 'step1',
         label: 'goat.acquired.label',
         description: 'goat.acquired.description',
      },
      {
         value: 'Data Generation',
         color: 'step2',
         label: 'goat.generation.label',
         description: 'goat.generation.description',
      },
      {
         value: 'In Assembly',
         color: 'step3',
         label: 'goat.assembly.label',
         description: 'goat.assembly.description',
      },
      {
         value: 'INSDC Submitted',
         color: 'step4',
         label: 'goat.submitted.label',
         description: 'goat.submitted.description',
      },
      {
         value: 'Publication Available',
         color: 'step5',
         label: 'goat.publication.label',
         description: 'goat.publication.description',
      },
   ] as const

   const targetListEntries: Record<TargetListKey, { label: string; desc: string }> = {
      long_list: {
         label: 'Long list',
         desc: 'Species declared as a target at project scale (e.g. regional biota or a higher taxon).',
      },
      family_representative: {
         label: 'Family representative',
         desc: 'Family reference species for your organisation or project — supports EBP Phase 1 goals; tagged as family representative on GoaT.',
      },
      other_priority: {
         label: 'Other priority',
         desc: 'Prioritised for conservation, pilots, or other project goals; also receives a long_list tag on GoaT.',
      },
   }

   const isStatusLocked = computed(
      () =>
         organismStore.organismForm.goat_status === 'INSDC Submitted' ||
         organismStore.organismForm.goat_status === 'Publication Available',
   )

   const visibleGoatSteps = computed(() => {
      const selectedStatus = organismStore.organismForm.goat_status
      const allowedStatuses: string[] = [...SELECTABLE_STATUS]
      if (TERMINAL_STATUS.includes(selectedStatus as (typeof TERMINAL_STATUS)[number])) {
         allowedStatuses.push(selectedStatus)
      }
      const allowed = new Set<string>(allowedStatuses)
      return goatSteps.filter(({ value }) => allowed.has(value))
   })

   function selectStatus(value: string) {
      if (isStatusLocked.value) return
      if (organismStore.organismForm.goat_status === value) {
         organismStore.organismForm.goat_status = ''
      } else {
         organismStore.organismForm.goat_status = value
      }
   }

   function selectTargetList(key: TargetListKey) {
      if (organismStore.organismForm.target_list_status === key) {
         organismStore.organismForm.target_list_status = null
      } else {
         organismStore.organismForm.target_list_status = key
      }
   }

   function formatTargetLabel(key: string): string {
      return targetListEntries[key as TargetListKey]?.label ?? key
   }
</script>

<style lang="scss" scoped>
   .goat-step {
      display: flex;
      flex-direction: column;
      gap: 2rem;
   }

   .goat-step__section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   .goat-step__field-head {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
   }

   .goat-step__field-label {
      font-size: 0.9375rem;
      font-weight: 600;
      margin: 0;
      color: var(--cms-text);
      font-family: var(--cms-font);
   }

   .goat-step__field-hint {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.45;
      color: var(--cms-text-muted);
   }

   .goat-step__lock-msg {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
   }

   /* Status / target cards grid */
   .goat-step__status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.75rem;
   }

   .goat-step__status-card {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.875rem 1rem;
      border: 1.5px solid var(--cms-border-strong);
      border-radius: 10px;
      background: var(--cms-bg-muted);
      cursor: pointer;
      text-align: left;
      transition: border-color 0.12s ease, box-shadow 0.12s ease;
      width: 100%;
      font-family: var(--cms-font);

      &:hover:not(:disabled) {
         border-color: var(--cms-primary);
         box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      &:disabled {
         cursor: not-allowed;
         opacity: 0.45;
      }

      &--selected {
         border-color: var(--cms-primary);
         background: var(--cms-primary-soft);
         box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
      }
   }

   .goat-step__status-card-badge {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      width: fit-content;
      background: var(--cms-border);
      color: var(--cms-text-muted);

      &--step0 { background: rgba(108, 117, 125, 0.15); }
      &--step1 { background: rgba(13, 110, 253, 0.12); color: #0d6efd; }
      &--step2 { background: rgba(253, 126, 20, 0.12); color: #c86a00; }
      &--step3 { background: rgba(255, 193, 7, 0.15); color: #9a7200; }
      &--step4 { background: rgba(25, 135, 84, 0.12); color: #145e3a; }
      &--step5 { background: rgba(111, 66, 193, 0.12); color: #5433a0; }
      &--neutral { background: var(--cms-border); color: var(--cms-text-muted); }
   }

   .goat-step__status-card--selected .goat-step__status-card-badge {
      color: var(--cms-primary-text);
   }

   .goat-step__status-card-desc {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.45;
      color: var(--cms-text-muted);
   }
</style>
