<template>
   <div class="cms-section-card">
      <div v-if="title || $slots.header" class="cms-section-card__header">
         <slot name="header">
            <h2 class="cms-section-card__title">{{ title }}</h2>
            <p v-if="description" class="cms-section-card__desc">{{ description }}</p>
         </slot>
      </div>
      <div class="cms-section-card__body">
         <slot />
      </div>
      <div v-if="$slots.footer" class="cms-section-card__footer">
         <slot name="footer" />
      </div>
   </div>
</template>

<script setup lang="ts">
   defineProps<{
      title?: string
      description?: string
   }>()
</script>

<style lang="scss" scoped>
   .cms-section-card {
      background: var(--cms-bg-surface);
      border: 1px solid var(--cms-border);
      border-radius: var(--cms-radius-card);
      box-shadow: var(--cms-shadow-sm);
      overflow: hidden;
      font-family: var(--cms-font);
   }

   .cms-section-card__header {
      padding: 1.125rem 1.375rem 1rem;
      border-bottom: 1px solid var(--cms-border);
   }

   .cms-section-card__title {
      margin: 0 0 0.3rem;
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: -0.015em;
      color: var(--cms-text);
      line-height: 1.3;
   }

   .cms-section-card__desc {
      margin: 0;
      font-size: 0.875rem;
      color: var(--cms-text-muted);
      line-height: 1.5;
   }

   .cms-section-card__body {
      padding: 1.375rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
   }

   .cms-section-card__footer {
      padding: 1rem 1.375rem;
      border-top: 1px solid var(--cms-border);
      background: var(--cms-bg-muted);
   }
</style>
