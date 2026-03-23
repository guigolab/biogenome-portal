<template>
   <div class="images-input">
      <!-- Primary image -->
      <section class="images-input__section">
         <div class="images-input__field-head">
            <h3 class="images-input__field-label">
               Primary image
               <span v-if="props.required" class="images-input__badge images-input__badge--required">Required</span>
               <span v-else class="images-input__badge images-input__badge--optional">Optional</span>
            </h3>
            <p class="images-input__hint">
               The main thumbnail shown in listings and organism profiles. Use a direct image URL from an open
               repository — right-click a browser image and choose "Copy image address".
            </p>
         </div>
         <div class="images-input__primary-row">
            <CmsInput
               v-model="organismStore.organismForm.image"
               label="Primary image URL"
               placeholder="https://upload.wikimedia.org/…"
               clearable
               class="images-input__url-field"
               :error="props.required && submitted && !primaryValid"
               error-message="A primary image URL is required"
            />
            <div v-if="primaryValid" class="images-input__preview-wrap">
               <img
                  :src="organismStore.organismForm.image"
                  alt="Primary image preview"
                  class="images-input__preview-thumb"
               />
            </div>
         </div>
      </section>

      <!-- Additional images -->
      <section class="images-input__section">
         <div class="images-input__field-head">
            <h3 class="images-input__field-label">
               Additional images
               <span class="images-input__badge images-input__badge--optional">Optional</span>
            </h3>
            <p class="images-input__hint">
               Gallery images displayed in the organism profile. Order matters — first is shown first.
            </p>
         </div>

         <div class="images-input__stack">
            <div
               v-for="(img, index) in organismStore.images"
               :key="index"
               class="images-input__row"
            >
               <CmsInput
                  v-model="img.value"
                  :label="`Image URL ${index + 1}`"
                  placeholder="https://…"
                  clearable
                  class="images-input__url-field"
               />
               <div class="images-input__row-actions">
                  <img
                     v-if="img.value?.trim()"
                     :src="img.value"
                     alt=""
                     class="images-input__row-thumb"
                     loading="lazy"
                  />
                  <CmsBtn
                     variant="danger"
                     size="sm"
                     :disabled="!img.value"
                     aria-label="Remove this image"
                     @click="removeImage(index)"
                  >
                     <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                        <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                     </svg>
                  </CmsBtn>
               </div>
            </div>
         </div>
         <CmsBtn variant="secondary" size="sm" @click="addImage">
            <template #prefix>
               <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
               </svg>
            </template>
            Add image URL
         </CmsBtn>

         <!-- Gallery preview -->
         <div v-if="validAdditional.length" class="images-input__gallery-preview">
            <p class="images-input__gallery-label">Gallery preview</p>
            <div class="images-input__gallery-grid">
               <img
                  v-for="(url, i) in validAdditional"
                  :key="i"
                  :src="url"
                  :alt="`Gallery image ${i + 1}`"
                  class="images-input__gallery-thumb"
                  loading="lazy"
               />
            </div>
         </div>
      </section>
   </div>
</template>

<script setup lang="ts">
   import { computed } from 'vue'
   import { useOrganismStore } from '../../../stores/organism-store'
   import CmsInput from '../ui/CmsInput.vue'
   import CmsBtn from '../ui/CmsBtn.vue'

   const props = withDefaults(defineProps<{ required?: boolean; submitted?: boolean }>(), { submitted: false })
   const organismStore = useOrganismStore()

   const primaryValid = computed(() => {
      const url = (organismStore.organismForm.image || '').trim()
      return url.length > 0 && /^https?:\/\//i.test(url)
   })

   const validAdditional = computed(() => organismStore.images.map((v) => v.value).filter(Boolean))

   function addImage() {
      organismStore.images.push({ value: '' })
   }

   function removeImage(index: number) {
      organismStore.images.splice(index, 1)
   }
</script>

<style lang="scss" scoped>
   .images-input {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      font-family: var(--cms-font);
   }

   .images-input__section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   .images-input__field-head {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
   }

   .images-input__field-label {
      font-size: 0.9375rem;
      font-weight: 600;
      margin: 0;
      color: var(--cms-text);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
   }

   .images-input__badge {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;

      &--required {
         background: var(--cms-danger-soft);
         color: var(--cms-danger-text);
      }

      &--optional {
         background: var(--cms-bg-muted);
         color: var(--cms-text-muted);
      }
   }

   .images-input__hint {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--cms-text-muted);
   }

   .images-input__primary-row {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      flex-wrap: wrap;
   }

   .images-input__url-field {
      flex: 1;
      min-width: 0;
   }

   .images-input__preview-wrap {
      flex-shrink: 0;
   }

   .images-input__preview-thumb {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid var(--cms-border);
   }

   .images-input__stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
   }

   .images-input__row {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.875rem 1rem;
      border: 1px solid var(--cms-border);
      border-radius: 10px;
      background: var(--cms-bg-muted);
   }

   .images-input__row-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
      padding-top: 1.5rem;
   }

   .images-input__row-thumb {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--cms-border);
   }

   .images-input__gallery-preview {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
   }

   .images-input__gallery-label {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--cms-text-muted);
   }

   .images-input__gallery-grid {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
   }

   .images-input__gallery-thumb {
      width: 80px;
      height: 60px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--cms-border);
   }
</style>
