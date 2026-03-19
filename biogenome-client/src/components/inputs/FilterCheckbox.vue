<template>
   <div class="filter-checkbox-wrap" :class="{ 'filter-checkbox-wrap--active': modelValue }">
      <VaSwitch
         :model-value="modelValue"
         size="small"
         :label="checkboxLabel"
         class="filter-checkbox-switch"
         @update:model-value="onChange"
      />
   </div>
</template>

<script setup lang="ts">
   import { computed } from 'vue'
   import { useI18n } from 'vue-i18n'

   const { t } = useI18n()

   const props = defineProps<{
      label: string
      field: string
      value: boolean | null
   }>()

   const emit = defineEmits<{ (e: 'valueChange', value: boolean | null): void }>()

   const modelValue = computed(() => props.value ?? false)

   const checkboxLabel = computed(() => {
      const has = t('items.filters.has')
      return has ? `${has} ${props.label}` : `Has ${props.label}`
   })

   function onChange(v: boolean) {
      emit('valueChange', v)
   }
</script>

<style lang="scss" scoped>
   .filter-checkbox-wrap {
      display: flex;
      align-items: center;
      min-width: 0;
      flex: 1;
      min-height: 2rem;
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      padding: 0.35rem 0.55rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &:focus-within {
         border-color: var(--va-primary);
         box-shadow: 0 0 0 2px rgba(var(--va-primary-rgb, 59, 130, 246), 0.12);
      }

      &--active {
         border-color: color-mix(in srgb, var(--va-primary) 40%, transparent);
      }
   }

   .filter-checkbox-switch {
      :deep(.va-switch__label) {
         font-size: 0.8125rem;
         color: var(--va-text-primary);
      }

      :deep(.va-switch__track) {
         transform: scale(0.92);
      }
   }
</style>
