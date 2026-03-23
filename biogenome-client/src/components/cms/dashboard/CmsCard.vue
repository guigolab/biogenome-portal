<template>
   <div class="cms-card" :class="`cms-card--${color}`" :aria-busy="loading || undefined">
      <!-- Card header: icon + title/description + actions -->
      <div class="cms-card__header">
         <div class="cms-card__header-left">
            <div class="cms-card__icon-badge" aria-hidden="true">
               <CmsIcon :name="icon" size="1rem" />
            </div>
            <div class="cms-card__meta">
               <h2 class="cms-card__title">{{ title }}</h2>
               <p v-if="description" class="cms-card__description">{{ description }}</p>
            </div>
         </div>
         <div v-if="$slots.actions" class="cms-card__header-actions">
            <slot name="actions" />
         </div>
      </div>

      <!-- Optional filter bar -->
      <div v-if="$slots.filters" class="cms-card__filters">
         <slot name="filters" />
      </div>

      <!-- Content divider -->
      <div class="cms-card__divider" />

      <!-- Body -->
      <div class="cms-card__body" :class="{ 'cms-card__body--loading': loading }">
         <!-- Skeleton overlay -->
         <div v-if="loading" class="cms-card__skeleton" aria-label="Loading…">
            <div v-for="i in 4" :key="i" class="cms-card__skeleton-row">
               <div class="cms-card__skeleton-cell cms-card__skeleton-cell--wide" />
               <div class="cms-card__skeleton-cell" />
               <div class="cms-card__skeleton-cell cms-card__skeleton-cell--narrow" />
            </div>
         </div>
         <slot v-else />
      </div>

      <!-- Footer (pagination) -->
      <template v-if="$slots.footer">
         <div class="cms-card__divider" />
         <div class="cms-card__footer">
            <slot name="footer" />
         </div>
      </template>
   </div>
</template>

<script setup lang="ts">
   import CmsIcon from '../ui/CmsIcon.vue'

   withDefaults(
      defineProps<{
         title: string
         description?: string
         icon: string
         color?: 'primary' | 'teal' | 'danger' | 'purple' | 'amber' | 'slate'
         loading?: boolean
      }>(),
      { color: 'primary', loading: false },
   )
</script>

<style lang="scss" scoped>
   /* ─── Icon badge tint per card type ─── */
   .cms-card {
      --_icon-bg:    var(--cms-primary-soft);
      --_icon-color: var(--cms-primary);

      &--teal {
         --_icon-bg:    var(--cms-info-soft);
         --_icon-color: var(--cms-info);
      }
      &--danger {
         --_icon-bg:    var(--cms-danger-soft);
         --_icon-color: var(--cms-danger);
      }
      &--purple {
         --_icon-bg:    var(--cms-purple-soft);
         --_icon-color: var(--cms-purple);
      }
      &--amber {
         --_icon-bg:    var(--cms-warning-soft);
         --_icon-color: var(--cms-warning);
      }
      &--slate {
         --_icon-bg:    var(--cms-slate-soft);
         --_icon-color: var(--cms-slate);
      }
   }

   /* ─── Card shell ─── */
   .cms-card {
      background: var(--cms-bg-surface);
      border: 1px solid var(--cms-border);
      border-radius: var(--cms-radius-card);
      box-shadow: var(--cms-shadow-sm);
      display: flex;
      flex-direction: column;
      overflow: hidden;
   }

   /* ─── Header ─── */
   .cms-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem 0.875rem;
      flex-wrap: wrap;
   }

   .cms-card__header-left {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      min-width: 0;
   }

   .cms-card__icon-badge {
      flex-shrink: 0;
      width: 2.125rem;
      height: 2.125rem;
      border-radius: 8px;
      background: var(--_icon-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--_icon-color);
      margin-top: 1px;
   }

   .cms-card__meta {
      min-width: 0;
   }

   .cms-card__title {
      font-size: 0.9375rem;
      font-weight: 650;
      letter-spacing: -0.015em;
      line-height: 1.3;
      margin: 0 0 0.2rem;
      color: var(--cms-text);
   }

   .cms-card__description {
      font-size: 0.8125rem;
      line-height: 1.45;
      color: var(--cms-text-muted);
      margin: 0;
   }

   .cms-card__header-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      align-items: center;
      flex-shrink: 0;
   }

   /* ─── Filters bar ─── */
   .cms-card__filters {
      display: flex;
      gap: 0.625rem;
      flex-wrap: wrap;
      align-items: center;
      padding: 0.625rem 1.25rem;
      background: var(--cms-bg-muted);
      border-top: 1px solid var(--cms-border);
   }

   /* ─── Divider ─── */
   .cms-card__divider {
      height: 1px;
      background: var(--cms-border);
      flex-shrink: 0;
   }

   /* ─── Body ─── */
   .cms-card__body {
      flex: 1;
      min-height: 0;
      overflow-x: auto;

      &--loading {
         min-height: 180px;
      }
   }

   /* ─── Skeleton loader ─── */
   @keyframes cms-shimmer {
      0%   { background-position: -600px 0 }
      100% { background-position: 600px 0 }
   }

   .cms-card__skeleton {
      padding: 0.75rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
   }

   .cms-card__skeleton-row {
      display: flex;
      gap: 1rem;
      align-items: center;
   }

   .cms-card__skeleton-cell {
      flex: 1;
      height: 13px;
      border-radius: 6px;
      background: linear-gradient(
         90deg,
         var(--cms-border) 0%,
         var(--cms-bg-muted) 40%,
         var(--cms-border) 80%
      );
      background-size: 600px 100%;
      animation: cms-shimmer 1.4s ease-in-out infinite;

      &--wide { flex: 2.5; }
      &--narrow { flex: 0.5; }
   }

   /* ─── Footer ─── */
   .cms-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.625rem 1.25rem;
      flex-wrap: wrap;
   }
</style>
