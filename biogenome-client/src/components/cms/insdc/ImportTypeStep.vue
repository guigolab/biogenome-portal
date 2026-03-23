<template>
   <div class="import-type-step">
      <p class="import-type-step__lead">
         Choose the type of record you want to import from the INSDC (International Nucleotide Sequence Database Collaboration).
      </p>
      <div class="import-type-step__options" role="radiogroup" aria-label="Import type">
         <button
            v-for="opt in options"
            :key="opt.key"
            role="radio"
            :aria-checked="modelValue === opt.key"
            :class="['import-type-option', { 'import-type-option--selected': modelValue === opt.key }]"
            @click="$emit('update:modelValue', opt.key)"
         >
            <div class="import-type-option__icon-wrap">
               <!-- biosample: vial/flask -->
               <svg v-if="opt.key === 'biosamples'" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M7 2v6l-3.5 7a1 1 0 00.9 1.5h11.2a1 1 0 00.9-1.5L13 8V2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M7 2h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <circle cx="9" cy="13" r="1" fill="currentColor" opacity="0.5"/>
               </svg>
               <!-- assembly: DNA/structure -->
               <svg v-else-if="opt.key === 'assemblies'" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 3c3 2 9 2 12 0M4 17c3-2 9-2 12 0M4 10h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <path d="M4 3s1 3.5 1 7-1 7-1 7M16 3s-1 3.5-1 7 1 7 1 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
               </svg>
               <!-- reads: sequence lines -->
               <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/>
                  <path d="M5 8h4M5 12h6M13 8h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
               </svg>
            </div>
            <div class="import-type-option__body">
               <span class="import-type-option__label">{{ opt.label }}</span>
               <span class="import-type-option__desc">{{ opt.description }}</span>
            </div>
            <svg
               v-if="modelValue === opt.key"
               class="import-type-option__check"
               width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            >
               <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15"/>
               <path d="M5 8l2.5 2.5 4-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
         </button>
      </div>
   </div>
</template>

<script setup lang="ts">
   import type { InsdcModel, InsdcModelMeta } from '../../../composable/useInsdcImportFlow'
   import { MODEL_META } from '../../../composable/useInsdcImportFlow'

   defineProps<{ modelValue: InsdcModel }>()
   defineEmits<{ (e: 'update:modelValue', v: InsdcModel): void }>()

   const options: InsdcModelMeta[] = Object.values(MODEL_META)
</script>

<style lang="scss" scoped>
   .import-type-step {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      font-family: var(--cms-font);
   }

   .import-type-step__lead {
      font-size: 0.875rem;
      color: var(--cms-text-muted);
      margin: 0;
      line-height: 1.5;
   }

   .import-type-step__options {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
   }

   .import-type-option {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.9rem 1rem;
      border: 1.5px solid var(--cms-border-strong);
      border-radius: 8px;
      background: none;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s, background 0.15s;
      width: 100%;
      font-family: var(--cms-font);

      &:hover {
         border-color: var(--cms-primary);
         background: var(--cms-primary-soft);
      }

      &--selected {
         border-color: var(--cms-primary);
         background: var(--cms-primary-soft);
      }
   }

   .import-type-option__icon-wrap {
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: var(--cms-bg-muted);
      color: var(--cms-text-muted);
      flex-shrink: 0;

      .import-type-option--selected & {
         background: rgba(37, 99, 235, 0.1);
         color: var(--cms-primary);
      }
   }

   .import-type-option__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
   }

   .import-type-option__label {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--cms-text);
   }

   .import-type-option__desc {
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
   }

   .import-type-option__check {
      flex-shrink: 0;
      color: var(--cms-primary);
   }
</style>
