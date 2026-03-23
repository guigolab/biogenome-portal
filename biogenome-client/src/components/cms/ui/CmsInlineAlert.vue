<template>
   <div
      v-if="visible"
      class="cms-inline-alert"
      :class="`cms-inline-alert--${type}`"
      :role="type === 'danger' ? 'alert' : 'status'"
      :aria-live="type === 'danger' ? 'assertive' : 'polite'"
   >
      <svg class="cms-inline-alert__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
         <!-- success -->
         <template v-if="type === 'success'">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.4"/>
            <path d="M5 8l2.5 2.5 4-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
         </template>
         <!-- warning -->
         <template v-else-if="type === 'warning'">
            <path d="M8 3L14.5 14H1.5L8 3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            <path d="M8 7v3M8 12v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
         </template>
         <!-- danger -->
         <template v-else-if="type === 'danger'">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.4"/>
            <path d="M8 5v4M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
         </template>
         <!-- info -->
         <template v-else>
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.4"/>
            <path d="M8 7v5M8 5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
         </template>
      </svg>

      <div class="cms-inline-alert__body">
         <p v-if="title" class="cms-inline-alert__title">{{ title }}</p>
         <slot>
            <p v-if="message" class="cms-inline-alert__message">{{ message }}</p>
         </slot>
      </div>

      <button
         v-if="dismissible"
         type="button"
         class="cms-inline-alert__dismiss"
         aria-label="Dismiss"
         @click="visible = false"
      >
         <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
         </svg>
      </button>
   </div>
</template>

<script setup lang="ts">
   import { ref, watch } from 'vue'

   const props = withDefaults(defineProps<{
      type?: 'success' | 'warning' | 'danger' | 'info'
      title?: string
      message?: string
      dismissible?: boolean
      modelValue?: boolean
   }>(), {
      type: 'info',
      modelValue: true,
   })

   const emit = defineEmits<{ 'update:modelValue': [val: boolean] }>()

   const visible = ref(props.modelValue !== false)

   watch(() => props.modelValue, (v) => { visible.value = v !== false })
   watch(visible, (v) => emit('update:modelValue', v))
</script>

<style lang="scss" scoped>
   .cms-inline-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 0.9rem 1.125rem;
      border-radius: 10px;
      border: 1px solid transparent;
      font-family: var(--cms-font);

      &--success {
         background: var(--cms-success-soft);
         border-color: rgba(22, 163, 74, 0.2);
         color: var(--cms-success-text);
      }

      &--warning {
         background: var(--cms-warning-soft);
         border-color: rgba(217, 119, 6, 0.22);
         color: var(--cms-warning-text);
      }

      &--danger {
         background: var(--cms-danger-soft);
         border-color: rgba(220, 38, 38, 0.2);
         color: var(--cms-danger-text);
      }

      &--info {
         background: var(--cms-info-soft);
         border-color: rgba(8, 145, 178, 0.2);
         color: var(--cms-info-text);
      }
   }

   .cms-inline-alert__icon {
      flex-shrink: 0;
      margin-top: 0.1rem;
   }

   .cms-inline-alert__body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
   }

   .cms-inline-alert__title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      line-height: 1.35;
   }

   .cms-inline-alert__message {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
   }

   .cms-inline-alert__dismiss {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
      opacity: 0.6;
      color: inherit;
      margin-top: -0.1rem;
      transition: opacity 0.12s;

      &:hover { opacity: 1; }
   }
</style>
