<template>
   <div class="sequencing-step">
      <section class="sequencing-step__section">
         <div class="sequencing-step__field-head">
            <h3 class="sequencing-step__field-label">Sequencing technologies</h3>
            <p class="sequencing-step__field-hint">
               Select all technologies planned or already completed for this organism.
            </p>
         </div>
         <div class="sequencing-step__tech-grid">
            <button
               v-for="tech in sequencingOptions"
               :key="tech"
               type="button"
               class="sequencing-step__tech-card"
               :class="{ 'sequencing-step__tech-card--selected': isSelected(tech) }"
               @click="toggleTech(tech)"
            >
               <!-- check icon when selected -->
               <svg v-if="isSelected(tech)" class="sequencing-step__tech-icon sequencing-step__tech-icon--checked" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15"/>
                  <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M5 8l2.5 2.5 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
               <!-- unchecked ring -->
               <svg v-else class="sequencing-step__tech-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
               </svg>
               <div class="sequencing-step__tech-body">
                  <span class="sequencing-step__tech-name">{{ tech.name }}</span>
                  <span class="sequencing-step__tech-category">{{ tech.category }}</span>
               </div>
            </button>
         </div>
         <p v-if="!hasAnyTech" class="sequencing-step__none-hint">
            No technologies selected yet. You can skip this section.
         </p>
      </section>
   </div>
</template>

<script setup lang="ts">
   import { computed } from 'vue'
   import { useOrganismStore } from '../../../stores/organism-store'

   const organismStore = useOrganismStore()

   const sequencingOptions = [
      { name: 'ONT (Long Reads)', category: 'Long read' },
      { name: 'PACBIO (Long Reads)', category: 'Long read' },
      { name: 'Illumina (Short Reads)', category: 'Short read' },
      { name: 'RNAseq (Transcriptomics)', category: 'Transcriptomics' },
      { name: 'Isoseq (Transcriptomics)', category: 'Transcriptomics' },
      { name: 'HIC (Scaffolding)', category: 'Scaffolding' },
      { name: 'OmniC (Scaffolding)', category: 'Scaffolding' },
      { name: 'Other', category: 'Other' },
   ]

   const hasAnyTech = computed(() => (organismStore.organismForm.sequencing_type ?? []).length > 0)

   function isSelected(tech: { name: string }): boolean {
      return (organismStore.organismForm.sequencing_type ?? []).includes(tech.name)
   }

   function toggleTech(tech: { name: string }) {
      const current = organismStore.organismForm.sequencing_type ?? []
      if (current.includes(tech.name)) {
         organismStore.organismForm.sequencing_type = current.filter((t) => t !== tech.name)
      } else {
         organismStore.organismForm.sequencing_type = [...current, tech.name]
      }
   }
</script>

<style lang="scss" scoped>
   .sequencing-step {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
   }

   .sequencing-step__section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   .sequencing-step__field-head {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
   }

   .sequencing-step__field-label {
      font-size: 0.9375rem;
      font-weight: 600;
      margin: 0;
      color: var(--cms-text);
      font-family: var(--cms-font);
   }

   .sequencing-step__field-hint {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.45;
      color: var(--cms-text-muted);
   }

   .sequencing-step__tech-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.625rem;
   }

   .sequencing-step__tech-card {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding: 0.75rem 0.875rem;
      border: 1.5px solid var(--cms-border-strong);
      border-radius: 10px;
      background: var(--cms-bg-muted);
      cursor: pointer;
      text-align: left;
      transition: border-color 0.12s ease, box-shadow 0.12s ease;
      width: 100%;
      font-family: var(--cms-font);

      &:hover {
         border-color: var(--cms-primary);
         box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      &--selected {
         border-color: var(--cms-primary);
         background: var(--cms-primary-soft);
         box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
      }
   }

   .sequencing-step__tech-icon {
      flex-shrink: 0;
      margin-top: 0.1rem;
      color: var(--cms-text-muted);
      transition: color 0.12s;

      &--checked { color: var(--cms-primary); }
   }

   .sequencing-step__tech-card--selected .sequencing-step__tech-icon { color: var(--cms-primary); }

   .sequencing-step__tech-body {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
   }

   .sequencing-step__tech-name {
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.3;
      color: var(--cms-text);
   }

   .sequencing-step__tech-category {
      font-size: 0.75rem;
      line-height: 1.3;
      color: var(--cms-text-muted);
   }

   .sequencing-step__none-hint {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
   }
</style>
