<template>
   <div class="accession-step">
      <!-- Context banner -->
      <div class="accession-step__context">
         <div class="accession-step__context-icon">
            <!-- biosample -->
            <svg v-if="meta.key === 'biosamples'" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
               <path d="M7 2v6l-3.5 7a1 1 0 00.9 1.5h11.2a1 1 0 00.9-1.5L13 8V2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
               <path d="M7 2h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <!-- assembly -->
            <svg v-else-if="meta.key === 'assemblies'" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
               <path d="M4 3c3 2 9 2 12 0M4 17c3-2 9-2 12 0M4 10h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
               <path d="M4 3s1 3.5 1 7-1 7-1 7M16 3s-1 3.5-1 7 1 7 1 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <!-- reads -->
            <svg v-else width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
               <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/>
               <path d="M5 8h4M5 12h6M13 8h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
         </div>
         <div>
            <p class="accession-step__context-title">{{ meta.label }}</p>
            <p class="accession-step__context-desc">{{ meta.description }}</p>
         </div>
      </div>

      <!-- Accession input -->
      <div class="accession-step__field">
         <CmsInput
            :model-value="modelValue"
            :label="`${meta.label} accession`"
            :placeholder="meta.accessionHint"
            clearable
            required
            :error="showError"
            :error-message="`Not a recognised ${meta.label.toLowerCase()} accession format.`"
            @update:model-value="$emit('update:modelValue', $event)"
            @blur="touched = true"
         />
         <p class="accession-step__hint">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" class="accession-step__hint-icon">
               <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/>
               <path d="M6 5v3.5M6 3.5v.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            {{ meta.accessionHint }}
         </p>
      </div>

      <!-- Side effects notice -->
      <div v-if="meta.sideEffects" class="accession-step__notice" role="note">
         <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" class="accession-step__notice-icon">
            <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" stroke-width="1.2"/>
            <path d="M6.5 5v3.5M6.5 3.5v.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
         </svg>
         <p class="accession-step__notice-text">{{ meta.sideEffects }}</p>
      </div>
   </div>
</template>

<script setup lang="ts">
   import { ref, computed } from 'vue'
   import type { InsdcModelMeta } from '../../../composable/useInsdcImportFlow'
   import CmsInput from '../ui/CmsInput.vue'

   const props = defineProps<{
      modelValue: string
      meta: InsdcModelMeta
      isValid: boolean
   }>()

   defineEmits<{ (e: 'update:modelValue', v: string): void }>()

   const touched = ref(false)
   const showError = computed(() => touched.value && props.modelValue.length > 0 && !props.isValid)
</script>

<style lang="scss" scoped>
   .accession-step {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      font-family: var(--cms-font);
   }

   .accession-step__context {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      background: var(--cms-primary-soft);
      border: 1px solid rgba(37, 99, 235, 0.15);
   }

   .accession-step__context-icon {
      flex-shrink: 0;
      margin-top: 0.1rem;
      color: var(--cms-primary);
   }

   .accession-step__context-title {
      font-weight: 600;
      font-size: 0.9rem;
      margin: 0 0 0.2rem;
      color: var(--cms-text);
   }

   .accession-step__context-desc {
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
      margin: 0;
   }

   .accession-step__field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
   }

   .accession-step__hint {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: var(--cms-text-muted);
      margin: 0;
   }

   .accession-step__hint-icon {
      opacity: 0.6;
      flex-shrink: 0;
      color: var(--cms-text-muted);
   }

   .accession-step__notice {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      background: var(--cms-bg-muted);
      border: 1px solid var(--cms-border);
   }

   .accession-step__notice-icon {
      flex-shrink: 0;
      margin-top: 0.1rem;
      opacity: 0.55;
      color: var(--cms-text-muted);
   }

   .accession-step__notice-text {
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
      margin: 0;
   }
</style>
