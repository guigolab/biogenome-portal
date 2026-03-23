<template>
   <component
      :is="to ? RouterLink : href ? 'a' : 'button'"
      class="cms-btn"
      :class="[
         `cms-btn--${variant}`,
         `cms-btn--${size}`,
         { 'cms-btn--loading': loading, 'cms-btn--disabled': disabled || loading },
      ]"
      v-bind="linkProps"
      :disabled="!to && !href && (disabled || loading)"
      @click="!disabled && !loading && $emit('click', $event)"
   >
      <span v-if="loading" class="cms-btn__spinner" aria-hidden="true" />
      <CmsIcon v-else-if="icon" :name="icon" class="cms-btn__icon" size="0.8rem" />
      <span v-if="$slots.default" class="cms-btn__label"><slot /></span>
   </component>
</template>

<script setup lang="ts">
   import { computed } from 'vue'
   import { RouterLink } from 'vue-router'
   import CmsIcon from './CmsIcon.vue'
   import type { RouteLocationRaw } from 'vue-router'

   const props = withDefaults(
      defineProps<{
         variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning'
         size?: 'sm' | 'md'
         icon?: string
         to?: RouteLocationRaw
         href?: string
         loading?: boolean
         disabled?: boolean
      }>(),
      { variant: 'secondary', size: 'sm' },
   )

   defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

   const linkProps = computed(() => {
      if (props.to) return { to: props.to }
      if (props.href) return { href: props.href }
      return {}
   })
</script>

<style lang="scss" scoped>
   /* ─── Base ─── */
   .cms-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      border-radius: var(--cms-radius-sm);
      font-weight: 500;
      font-family: var(--cms-font);
      cursor: pointer;
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.13s, border-color 0.13s, color 0.13s, opacity 0.13s;
      border: 1px solid transparent;
      line-height: 1;
      user-select: none;

      &--sm {
         height: 30px;
         padding: 0 0.7rem;
         font-size: 0.8rem;
      }

      &--md {
         height: 36px;
         padding: 0 1rem;
         font-size: 0.8125rem;
      }

      /* ─── Variants ─── */
      &--primary {
         background: var(--cms-primary);
         color: var(--cms-text-on-dark);
         border-color: var(--cms-primary);

         &:hover:not(.cms-btn--disabled) {
            background: var(--cms-primary-hover);
            border-color: var(--cms-primary-hover);
         }
      }

      &--secondary {
         background: var(--cms-bg-surface);
         color: var(--cms-text);
         border-color: var(--cms-border-strong);

         &:hover:not(.cms-btn--disabled) {
            background: var(--cms-bg-hover);
            border-color: var(--cms-border-strong);
         }
      }

      &--ghost {
         background: transparent;
         color: var(--cms-text-muted);
         border-color: transparent;

         &:hover:not(.cms-btn--disabled) {
            background: var(--cms-border);
            color: var(--cms-text);
         }
      }

      &--danger {
         background: var(--cms-danger-soft);
         color: var(--cms-danger);
         border-color: rgba(220, 38, 38, 0.22);

         &:hover:not(.cms-btn--disabled) {
            background: rgba(220, 38, 38, 0.14);
            border-color: rgba(220, 38, 38, 0.38);
         }
      }

      &--warning {
         background: var(--cms-warning-soft);
         color: var(--cms-warning-text);
         border-color: rgba(217, 119, 6, 0.22);

         &:hover:not(.cms-btn--disabled) {
            background: rgba(217, 119, 6, 0.14);
            border-color: rgba(217, 119, 6, 0.38);
         }
      }

      &--disabled {
         opacity: 0.42;
         cursor: default;
         pointer-events: none;
      }

      &--loading {
         cursor: default;
         pointer-events: none;
      }
   }

   .cms-btn__icon {
      flex-shrink: 0;
   }

   /* ─── Spinner ─── */
   @keyframes cms-spin {
      to { transform: rotate(360deg); }
   }

   .cms-btn__spinner {
      display: block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(0, 0, 0, 0.15);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: cms-spin 0.65s linear infinite;
      flex-shrink: 0;
   }
</style>
