<template>
   <div
      class="cms-file-upload"
      :class="{
         'cms-file-upload--dragover': isDragOver,
         'cms-file-upload--has-file': !!modelValue,
         'cms-file-upload--disabled': disabled,
      }"
      role="button"
      tabindex="0"
      :aria-label="modelValue ? `File selected: ${modelValue.name}` : `Upload ${accept ? accept + ' ' : ''}file`"
      @click="triggerInput"
      @keydown.enter.prevent="triggerInput"
      @keydown.space.prevent="triggerInput"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="handleDrop"
   >
      <input
         ref="fileInputRef"
         type="file"
         class="cms-file-upload__hidden-input"
         :accept="accept"
         @change="handleFileChange"
      />

      <!-- File selected -->
      <template v-if="modelValue">
         <div class="cms-file-upload__file-info">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" class="cms-file-upload__file-icon">
               <rect x="3" y="2" width="12" height="14" rx="2" stroke="currentColor" stroke-width="1.4"/>
               <path d="M6 6h6M6 9h6M6 12h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <span class="cms-file-upload__file-name">{{ modelValue.name }}</span>
            <span class="cms-file-upload__file-size">{{ formatSize(modelValue.size) }}</span>
         </div>
         <button
            v-if="!disabled"
            type="button"
            class="cms-file-upload__clear"
            aria-label="Remove selected file"
            @click.stop="clearFile"
         >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
               <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Clear
         </button>
      </template>

      <!-- Empty state -->
      <template v-else>
         <div class="cms-file-upload__empty">
            <svg class="cms-file-upload__upload-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
               <path d="M12 16V8M12 8l-3 3M12 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
               <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 104 16.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p class="cms-file-upload__text">
               <span class="cms-file-upload__text-action">{{ uploadText }}</span>
               <span class="cms-file-upload__text-or"> or drag and drop</span>
            </p>
            <p v-if="accept" class="cms-file-upload__accept">Accepted: {{ accept }}</p>
         </div>
      </template>
   </div>
</template>

<script setup lang="ts">
   import { ref } from 'vue'

   const props = withDefaults(defineProps<{
      modelValue?: File | null
      accept?: string
      disabled?: boolean
      uploadText?: string
   }>(), {
      uploadText: 'Click to upload',
   })

   const emit = defineEmits<{ 'update:modelValue': [file: File | null] }>()

   const fileInputRef = ref<HTMLInputElement | null>(null)
   const isDragOver = ref(false)

   function triggerInput() {
      if (!props.disabled) fileInputRef.value?.click()
   }

   function handleFileChange(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0] ?? null
      emit('update:modelValue', file)
   }

   function handleDrop(event: DragEvent) {
      isDragOver.value = false
      if (props.disabled) return
      const file = event.dataTransfer?.files?.[0] ?? null
      if (file) emit('update:modelValue', file)
   }

   function clearFile() {
      emit('update:modelValue', null)
      if (fileInputRef.value) fileInputRef.value.value = ''
   }

   function formatSize(bytes: number): string {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
   }
</script>

<style lang="scss" scoped>
   .cms-file-upload {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      padding: 1.25rem 1.5rem;
      border: 2px dashed var(--cms-border-strong);
      border-radius: var(--cms-radius-card);
      background: var(--cms-bg-muted);
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
      font-family: var(--cms-font);
      outline: none;

      &:hover:not(.cms-file-upload--disabled) {
         border-color: var(--cms-primary);
         background: var(--cms-primary-soft);
      }

      &:focus-visible {
         box-shadow: var(--cms-focus-ring);
         border-color: var(--cms-primary);
      }

      &--dragover {
         border-color: var(--cms-primary);
         background: var(--cms-primary-soft);
      }

      &--has-file {
         border-style: solid;
         background: var(--cms-bg-surface);
         border-color: var(--cms-success);
         justify-content: space-between;
         min-height: auto;
         padding: 0.875rem 1.25rem;
         gap: 0.75rem;
         flex-wrap: wrap;
      }

      &--disabled {
         opacity: 0.55;
         cursor: not-allowed;
         pointer-events: none;
      }
   }

   .cms-file-upload__hidden-input {
      display: none;
   }

   .cms-file-upload__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.625rem;
      text-align: center;
      pointer-events: none;
   }

   .cms-file-upload__upload-icon {
      color: var(--cms-text-muted);
      opacity: 0.7;
   }

   .cms-file-upload__text {
      margin: 0;
      font-size: 0.875rem;
   }

   .cms-file-upload__text-action {
      font-weight: 600;
      color: var(--cms-primary);
   }

   .cms-file-upload__text-or {
      color: var(--cms-text-muted);
   }

   .cms-file-upload__accept {
      margin: 0;
      font-size: 0.75rem;
      color: var(--cms-text-faint);
   }

   .cms-file-upload__file-info {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      flex: 1;
      min-width: 0;
      pointer-events: none;
   }

   .cms-file-upload__file-icon {
      flex-shrink: 0;
      color: var(--cms-success);
   }

   .cms-file-upload__file-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--cms-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
   }

   .cms-file-upload__file-size {
      font-size: 0.8rem;
      color: var(--cms-text-muted);
      flex-shrink: 0;
      font-family: var(--cms-font-mono);
   }

   .cms-file-upload__clear {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.6rem;
      border: 1px solid var(--cms-border-strong);
      border-radius: var(--cms-radius-sm);
      background: var(--cms-bg-surface);
      color: var(--cms-text-muted);
      font-size: 0.8rem;
      font-family: var(--cms-font);
      cursor: pointer;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
      flex-shrink: 0;

      &:hover {
         background: var(--cms-danger-soft);
         color: var(--cms-danger);
         border-color: var(--cms-danger);
      }
   }
</style>
