<template>
   <div class="goat-input">
      <div class="goat-input__section">
         <h2 class="goat-input__title">GoaT sequencing status</h2>
         <p class="goat-input__lead">
            Track pipeline progress and target-list classification for Earth BioGenome / GoaT reporting.
         </p>
      </div>

      <CmsSelect
         v-model="goatStatus"
         label="Sequencing status"
         placeholder="Select current stage"
         :options="STATUS"
         :disabled="isLocked"
         :hint="isLocked ? 'This status is locked after submission or publication.' : undefined"
      />

      <div v-if="currentStep" class="goat-input__callout">
         <p class="goat-input__callout-title">{{ currentStep.value }}</p>
         <p class="goat-input__callout-text">{{ t(currentStep.description) }}</p>
      </div>

      <CmsSelect
         v-model="targetListStatus"
         label="Target list status"
         placeholder="Select list role"
         :options="LIST"
      />

      <div v-if="targetListStatus" class="goat-input__callout">
         <p class="goat-input__callout-title">{{ formatTargetLabel(targetListStatus) }}</p>
         <p class="goat-input__callout-text">{{ targetList[targetListStatus as keyof typeof targetList] }}</p>
      </div>
   </div>
</template>

<script setup lang="ts">
   import { useI18n } from 'vue-i18n'
   import { computed } from 'vue'
   import { useOrganismStore } from '../../../stores/organism-store'
   import CmsSelect from './CmsSelect.vue'

   const organismStore = useOrganismStore()
   const { t } = useI18n()

   const STATUS = [
      'Sample Collected',
      'Sample Acquired',
      'Data Generation',
      'In Assembly',
      'INSDC Submitted',
      'Publication Available',
   ]
   const LIST = ['long_list', 'family_representative', 'other_priority']

   const goatStatus = computed({
      get: () => organismStore.organismForm.goat_status ?? '',
      set: (v: string) => { organismStore.organismForm.goat_status = v },
   })

   const targetListStatus = computed({
      get: () => organismStore.organismForm.target_list_status ?? '',
      set: (v: string) => { organismStore.organismForm.target_list_status = (v || null) as 'long_list' | 'family_representative' | 'other_priority' | null },
   })

   const isLocked = computed(() =>
      organismStore.organismForm.goat_status === 'INSDC Submitted' ||
      organismStore.organismForm.goat_status === 'Publication Available',
   )

   const goatSteps = [
      { value: 'Sample Collected', label: 'goat.collected.label', description: 'goat.collected.description' },
      { value: 'Sample Acquired', label: 'goat.acquired.label', description: 'goat.acquired.description' },
      { value: 'Data Generation', label: 'goat.generation.label', description: 'goat.generation.description' },
      { value: 'In Assembly', label: 'goat.assembly.label', description: 'goat.assembly.description' },
      { value: 'INSDC Submitted', label: 'goat.submitted.label', description: 'goat.submitted.description' },
      { value: 'Publication Available', label: 'goat.publication.label', description: 'goat.publication.description' },
   ]

   const targetList: Record<(typeof LIST)[number], string> = {
      long_list: 'Species declared as a target at project scale (e.g. regional biota or a higher taxon).',
      family_representative: 'Family reference species for your organisation or project—supports EBP Phase 1 goals; tagged as family representative on GoaT.',
      other_priority: 'Prioritised for conservation, pilots, or other project goals; also receives a long_list tag on GoaT.',
   }

   const currentStep = computed(() =>
      goatSteps.find(({ value }) => value === organismStore.organismForm.goat_status),
   )

   function formatTargetLabel(key: string): string {
      if (key === 'long_list') return 'Long list'
      if (key === 'family_representative') return 'Family representative'
      if (key === 'other_priority') return 'Other priority'
      return key
   }
</script>

<style lang="scss" scoped>
   .goat-input {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      font-family: var(--cms-font);
   }

   .goat-input__title {
      margin: 0 0 0.3rem;
      font-size: 1rem;
      font-weight: 600;
      color: var(--cms-text);
   }

   .goat-input__lead {
      margin: 0;
      font-size: 0.875rem;
      color: var(--cms-text-muted);
      line-height: 1.5;
   }

   .goat-input__callout {
      padding: 0.875rem 1rem;
      background: var(--cms-bg-muted);
      border: 1px solid var(--cms-border);
      border-left: 3px solid var(--cms-primary);
      border-radius: var(--cms-radius-sm);
   }

   .goat-input__callout-title {
      margin: 0 0 0.2rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--cms-text);
   }

   .goat-input__callout-text {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
      line-height: 1.45;
   }
</style>
