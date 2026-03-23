<template>
   <div class="pi-entity-step">
      <div class="pi-entity-step__field-head">
         <h3 class="pi-entity-step__field-label">
            PI / entity / sub-project
            <span v-if="props.required" class="pi-entity-step__required-badge">Required</span>
         </h3>
         <p class="pi-entity-step__field-hint">
            Provide who owns this record: principal investigator, responsible entity, or sub-project code. Used for
            attribution and filtering.
         </p>
      </div>
      <CmsInput
         v-model="organismStore.organismForm.sub_project"
         label="PI / entity / sub-project"
         placeholder="e.g. CBP-Invertebrates, John Doe Lab, PRJEB49670"
         clearable
         :required="props.required"
         :error="props.required && subProjectEmpty"
         error-message="This field is required"
      />
      <div class="pi-entity-step__examples">
         <p class="pi-entity-step__examples-title">Examples</p>
         <ul class="pi-entity-step__examples-list">
            <li>PI name — <em>Dr. Jane Smith</em></li>
            <li>Entity or lab name — <em>Biodiversity Genomics Group</em></li>
            <li>Sub-project code — <em>CBP-Plants-Phase2</em></li>
            <li>INSDC project accession — <em>PRJEB49670</em></li>
         </ul>
      </div>
   </div>
</template>

<script setup lang="ts">
   import { computed } from 'vue'
   import { useOrganismStore } from '../../../stores/organism-store'
   import CmsInput from '../ui/CmsInput.vue'

   const props = defineProps<{ required?: boolean }>()
   const organismStore = useOrganismStore()
   const subProjectEmpty = computed(() => !String(organismStore.organismForm.sub_project || '').trim())
</script>

<style lang="scss" scoped>
   .pi-entity-step {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
   }

   .pi-entity-step__field-head {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
   }

   .pi-entity-step__field-label {
      font-size: 0.9375rem;
      font-weight: 600;
      margin: 0;
      color: var(--cms-text);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      font-family: var(--cms-font);
   }

   .pi-entity-step__required-badge {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: var(--cms-danger-soft);
      color: var(--cms-danger-text);
   }

   .pi-entity-step__field-hint {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--cms-text-muted);
   }

   .pi-entity-step__examples {
      padding: 0.875rem 1rem;
      border-radius: 10px;
      background: var(--cms-bg-muted);
      border: 1px solid var(--cms-border);
      font-family: var(--cms-font);
   }

   .pi-entity-step__examples-title {
      margin: 0 0 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--cms-text-muted);
   }

   .pi-entity-step__examples-list {
      margin: 0;
      padding-left: 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.8125rem;
      line-height: 1.45;
      color: var(--cms-text-muted);
   }
</style>
