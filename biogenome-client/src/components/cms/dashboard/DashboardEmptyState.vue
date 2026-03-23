<template>
   <div class="cms-empty" role="status">
      <div class="cms-empty__icon-wrap" aria-hidden="true">
         <CmsIcon :name="icon" size="1.5rem" />
      </div>
      <p class="cms-empty__title">{{ title }}</p>
      <p class="cms-empty__hint">{{ description }}</p>
      <div v-if="$slots.actions" class="cms-empty__actions">
         <slot name="actions" />
      </div>
   </div>
</template>

<script setup lang="ts">
   import CmsIcon from '../ui/CmsIcon.vue'

   withDefaults(
      defineProps<{
         title: string
         description: string
         icon?: string
      }>(),
      { icon: 'fa-box-open' },
   )
</script>

<style lang="scss" scoped>
   .cms-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.75rem 2rem;
      text-align: center;
      gap: 0.375rem;
   }

   .cms-empty__icon-wrap {
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--cms-bg-muted);
      border: 1px solid var(--cms-border);
      margin-bottom: 0.625rem;
      color: var(--cms-text-faint);
   }

   .cms-empty__title {
      font-size: 0.9rem;
      font-weight: 600;
      margin: 0;
      color: var(--cms-text);
      letter-spacing: -0.01em;
   }

   .cms-empty__hint {
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
      margin: 0;
      max-width: 300px;
      line-height: 1.5;
   }

   .cms-empty__actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 1rem;
   }
</style>
