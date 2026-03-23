<template>
   <div class="local-names-input">
      <div class="local-names-input__intro">
         <p class="local-names-input__hint">
            Add common names with language and locality. Each name value must be unique in this list. If you add a
            row, all three fields are required.
         </p>
         <ul class="local-names-input__hint-list">
            <li><strong>Language</strong> — ISO code or abbreviation, e.g. <code>en</code>, <code>es</code></li>
            <li><strong>Locality / region</strong> — scope of use, e.g. <code>UK</code>, <code>global</code></li>
            <li><strong>Name</strong> — the common name in that language</li>
         </ul>
      </div>

      <div v-if="!organismStore.vernacularNames.length" class="local-names-input__empty">
         <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" class="local-names-input__empty-icon">
            <circle cx="14" cy="14" r="11" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 14c0 3.3 2.2 6 5 6s5-2.7 5-6-2.2-6-5-6-5 2.7-5 6z" stroke="currentColor" stroke-width="1.3"/>
            <path d="M3 14h22M14 3c-2 4-2 14 0 22" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         </svg>
         <p class="local-names-input__empty-text">No vernacular names added yet.</p>
      </div>

      <div class="local-names-input__stack">
         <div
            v-for="(name, index) in organismStore.vernacularNames"
            :key="index"
            class="local-names-input__row"
         >
            <div class="local-names-input__row-fields">
               <CmsInput
                  v-model="name.lang"
                  label="Language"
                  placeholder="e.g. en, es"
                  required
                  :error="submitted && !name.lang.trim()"
                  error-message="Language is required"
               />
               <CmsInput
                  v-model="name.locality"
                  label="Locality / region"
                  placeholder="e.g. UK, global"
                  required
                  :error="submitted && !name.locality.trim()"
                  error-message="Locality is required"
               />
               <CmsInput
                  v-model="name.value"
                  label="Name"
                  placeholder="Common name"
                  required
                  :error="submitted && vernacularValueError(index)"
                  :error-message="vernacularValueErrorMsg(index)"
               />
            </div>
            <CmsBtn
               variant="danger"
               size="sm"
               aria-label="Remove this name"
               class="local-names-input__row-remove"
               @click="removeName(index)"
            >
               <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
               </svg>
            </CmsBtn>
         </div>
      </div>

      <CmsBtn variant="secondary" @click="addName">
         <template #prefix>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
               <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
         </template>
         Add vernacular name
      </CmsBtn>
   </div>
</template>

<script setup lang="ts">
   import { useOrganismStore } from '../../../stores/organism-store'
   import CmsInput from '../ui/CmsInput.vue'
   import CmsBtn from '../ui/CmsBtn.vue'

   withDefaults(defineProps<{ submitted?: boolean }>(), { submitted: false })

   const organismStore = useOrganismStore()

   function vernacularValueError(index: number): boolean {
      const s = (organismStore.vernacularNames[index]?.value ?? '').trim()
      if (!s) return true
      return organismStore.vernacularNames.some((n, i) => i !== index && n.value.trim() === s)
   }

   function vernacularValueErrorMsg(index: number): string {
      const s = (organismStore.vernacularNames[index]?.value ?? '').trim()
      if (!s) return 'Name is required'
      return 'This name is already listed'
   }

   function addName() {
      organismStore.vernacularNames.push({ value: '', lang: '', locality: '' })
   }

   function removeName(index: number) {
      organismStore.vernacularNames.splice(index, 1)
   }
</script>

<style lang="scss" scoped>
   .local-names-input {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      font-family: var(--cms-font);
   }

   .local-names-input__intro {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
   }

   .local-names-input__hint {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--cms-text-muted);
   }

   .local-names-input__hint-list {
      margin: 0;
      padding-left: 1.2rem;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--cms-text-muted);

      li {
         margin-bottom: 0.25rem;
      }

      code {
         font-size: 0.92em;
         padding: 0.1em 0.35em;
         border-radius: 4px;
         background: var(--cms-bg-muted);
         font-family: var(--cms-font-mono);
         color: var(--cms-text);
      }
   }

   .local-names-input__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.5rem 1rem;
      border-radius: 10px;
      border: 1px dashed var(--cms-border-strong);
      text-align: center;
   }

   .local-names-input__empty-icon {
      opacity: 0.35;
      color: var(--cms-text-muted);
   }

   .local-names-input__empty-text {
      margin: 0;
      font-size: 0.875rem;
      color: var(--cms-text-muted);
   }

   .local-names-input__stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
   }

   .local-names-input__row {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 1rem;
      border: 1px solid var(--cms-border);
      border-radius: 10px;
      background: var(--cms-bg-muted);
   }

   .local-names-input__row-fields {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.875rem;
      min-width: 0;

      @media (max-width: 640px) {
         grid-template-columns: 1fr;
      }
   }

   .local-names-input__row-remove {
      flex-shrink: 0;
      margin-top: 1.5rem;
   }
</style>
