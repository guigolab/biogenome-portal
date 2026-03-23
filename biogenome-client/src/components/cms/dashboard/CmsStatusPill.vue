<template>
   <span v-if="value" class="cms-status-pill" :class="`cms-status-pill--${resolvedVariant}`">
      {{ formatted }}
   </span>
   <span v-else class="cms-status-pill__empty">—</span>
</template>

<script setup lang="ts">
   import { computed } from 'vue'

   const props = defineProps<{
      value?: string | null
      type?: 'goat' | 'insdc' | 'target'
   }>()

   const variantMap: Record<string, string> = {
      // GoaT
      sample_acquired: 'success',
      in_progress: 'warning',
      published: 'success',
      insdc_open: 'info',
      open: 'info',
      // INSDC
      submitted: 'warning',
      in_assembly: 'warning',
      // Danger/neutral
      pending_deletion: 'danger',
   }

   const resolvedVariant = computed(() => {
      if (!props.value) return 'neutral'
      return variantMap[props.value] ?? (props.type === 'target' ? 'info' : 'neutral')
   })

   const formatted = computed(() =>
      props.value?.replace(/_/g, ' ') ?? '',
   )
</script>

<style lang="scss" scoped>
   .cms-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: capitalize;
      line-height: 1.4;
      white-space: nowrap;

      &--success {
         background: var(--cms-success-soft);
         color: var(--cms-success-text);
      }
      &--warning {
         background: var(--cms-warning-soft);
         color: var(--cms-warning-text);
      }
      &--info {
         background: var(--cms-info-soft);
         color: var(--cms-info-text);
      }
      &--danger {
         background: var(--cms-danger-soft);
         color: var(--cms-danger-text);
      }
      &--neutral {
         background: var(--cms-border);
         color: var(--cms-text-muted);
      }
   }

   .cms-status-pill__empty {
      color: var(--cms-text-faint);
      font-size: 0.85rem;
   }
</style>
