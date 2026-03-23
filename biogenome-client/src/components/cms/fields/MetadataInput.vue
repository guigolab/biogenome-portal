<template>
   <div class="metadata-input">
      <div class="metadata-input__intro">
         <p class="metadata-input__hint">
            Optional key–value fields stored alongside the organism record. Attribute names must be unique. Use them
            for project-specific annotations that don't fit standard fields.
         </p>
      </div>

      <div v-if="!organismStore.metadataList.length" class="metadata-input__empty">
         <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" class="metadata-input__empty-icon">
            <rect x="4" y="3" width="20" height="22" rx="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 8h10M9 13h10M9 18h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
         </svg>
         <p class="metadata-input__empty-text">No custom attributes added yet.</p>
      </div>

      <div class="metadata-input__stack">
         <div
            v-for="(mt, index) in organismStore.metadataList"
            :key="index"
            class="metadata-input__row"
         >
            <div class="metadata-input__row-fields">
               <CmsInput
                  v-model="mt.key"
                  label="Attribute name"
                  placeholder="e.g. project_code"
                  :error="duplicateKeyError(index)"
                  error-message="This attribute name is already used"
               />
               <CmsInput
                  v-model="mt.value"
                  label="Value"
                  placeholder="Attribute value"
                  type="textarea"
                  :rows="1"
               />
            </div>
            <CmsBtn
               variant="danger"
               size="sm"
               aria-label="Remove this attribute"
               class="metadata-input__row-remove"
               @click="removeAttribute(index)"
            >
               <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
               </svg>
            </CmsBtn>
         </div>
      </div>

      <CmsBtn variant="secondary" @click="addAttribute">
         <template #prefix>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
               <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
         </template>
         Add attribute
      </CmsBtn>
   </div>
</template>

<script setup lang="ts">
   import { useOrganismStore } from '../../../stores/organism-store'
   import CmsInput from '../ui/CmsInput.vue'
   import CmsBtn from '../ui/CmsBtn.vue'

   const organismStore = useOrganismStore()

   function duplicateKeyError(index: number): boolean {
      const v = (organismStore.metadataList[index]?.key ?? '').trim()
      if (!v) return false
      return organismStore.metadataList.some((mt, i) => i !== index && mt.key.trim() === v)
   }

   function addAttribute() {
      organismStore.metadataList.push({ key: '', value: '' })
   }

   function removeAttribute(index: number) {
      organismStore.metadataList.splice(index, 1)
   }
</script>

<style lang="scss" scoped>
   .metadata-input {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
   }

   .metadata-input__intro {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
   }

   .metadata-input__hint {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--cms-text-muted);
      font-family: var(--cms-font);
   }

   .metadata-input__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.5rem 1rem;
      border-radius: 10px;
      border: 1px dashed var(--cms-border-strong);
      text-align: center;
      font-size: 0.875rem;
   }

   .metadata-input__empty-icon {
      opacity: 0.35;
      color: var(--cms-text-muted);
   }

   .metadata-input__empty-text {
      margin: 0;
      color: var(--cms-text-muted);
      font-family: var(--cms-font);
   }

   .metadata-input__stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
   }

   .metadata-input__row {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 1rem;
      border: 1px solid var(--cms-border);
      border-radius: 10px;
      background: var(--cms-bg-muted);
   }

   .metadata-input__row-fields {
      flex: 1;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
      gap: 0.875rem;
      min-width: 0;

      @media (max-width: 640px) {
         grid-template-columns: 1fr;
      }
   }

   .metadata-input__row-remove {
      flex-shrink: 0;
      margin-top: 0.125rem;
   }
</style>
