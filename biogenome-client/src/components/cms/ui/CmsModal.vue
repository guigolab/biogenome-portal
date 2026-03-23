<template>
   <Teleport to="body">
      <Transition name="cms-modal">
         <div
            v-if="modelValue"
            class="cms-modal-overlay"
            role="presentation"
            @click.self="onOverlayClick"
         >
            <div
               class="cms-modal"
               role="dialog"
               :aria-modal="true"
               :aria-labelledby="titleId"
            >
               <div class="cms-modal__header">
                  <slot name="header" :title-id="titleId">
                     <h2 v-if="title" :id="titleId" class="cms-modal__title" :class="{ 'cms-modal__title--danger': danger }">
                        {{ title }}
                     </h2>
                  </slot>
                  <button
                     v-if="closable"
                     type="button"
                     class="cms-modal__close"
                     aria-label="Close"
                     @click="close"
                  >
                     <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                     </svg>
                  </button>
               </div>
               <div class="cms-modal__body">
                  <slot />
               </div>
               <div v-if="$slots.footer" class="cms-modal__footer">
                  <div class="cms-modal__footer-inner">
                     <slot name="footer" />
                  </div>
               </div>
            </div>
         </div>
      </Transition>
   </Teleport>
</template>

<script setup lang="ts">
   import { onMounted, onUnmounted, watch } from 'vue'

   const props = withDefaults(
      defineProps<{
         modelValue: boolean
         /** Used when no #header slot */
         title?: string
         danger?: boolean
         closable?: boolean
         /** Close when clicking backdrop */
         closeOnOverlay?: boolean
      }>(),
      {
         closable: true,
         closeOnOverlay: true,
      },
   )

   const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

   const titleId = `cms-modal-title-${Math.random().toString(36).slice(2, 9)}`

   watch(
      () => props.modelValue,
      (open) => {
         document.body.style.overflow = open ? 'hidden' : ''
      },
   )

   function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && props.modelValue) close()
   }

   onMounted(() => document.addEventListener('keydown', onKey))
   onUnmounted(() => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
   })

   function close() {
      emit('update:modelValue', false)
   }

   function onOverlayClick() {
      if (props.closeOnOverlay) close()
   }
</script>

<style lang="scss" scoped>
   .cms-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 2000;
      background: rgba(15, 23, 42, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      font-family: var(--cms-font);
   }

   .cms-modal {
      background: var(--cms-bg-surface);
      border: 1px solid var(--cms-border);
      border-radius: var(--cms-radius-card);
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
      width: 100%;
      max-width: 480px;
      max-height: min(80vh, 640px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
   }

   .cms-modal__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 1.125rem 1.25rem;
      border-bottom: 1px solid var(--cms-border);
      flex-shrink: 0;
   }

   .cms-modal__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--cms-text);
      line-height: 1.35;

      &--danger {
         color: var(--cms-danger);
      }
   }

   .cms-modal__close {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      margin: -0.2rem -0.2rem 0 0;
      border: none;
      background: transparent;
      color: var(--cms-text-muted);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.12s, color 0.12s;

      &:hover {
         background: var(--cms-border);
         color: var(--cms-text);
      }
   }

   .cms-modal__body {
      padding: 1.25rem 1.25rem 1.125rem;
      overflow-y: auto;
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--cms-text);

      :deep(strong) {
         font-weight: 600;
         color: var(--cms-text);
      }

      :deep(em),
      :deep(.cms-modal__italic) {
         font-style: italic;
      }
   }

   .cms-modal__footer {
      padding: 0.875rem 1.25rem 1.125rem;
      border-top: 1px solid var(--cms-border);
      background: var(--cms-bg-muted);
      flex-shrink: 0;
   }

   .cms-modal__footer-inner {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: flex-end;
   }

   .cms-modal-enter-active,
   .cms-modal-leave-active {
      transition: opacity 0.2s ease;
   }

   .cms-modal-enter-from,
   .cms-modal-leave-to {
      opacity: 0;
   }

   .cms-modal-enter-active .cms-modal,
   .cms-modal-leave-active .cms-modal {
      transition: transform 0.2s ease, opacity 0.2s ease;
   }

   .cms-modal-enter-from .cms-modal,
   .cms-modal-leave-to .cms-modal {
      transform: translateY(8px);
      opacity: 0.85;
   }
</style>
