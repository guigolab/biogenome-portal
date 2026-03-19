<template>
   <VaDropdown v-model="isOpen" placement="bottom-start" stick-to-edges :close-on-content-click="false">
      <template #anchor>
         <div
            class="filter-date-wrap"
            :class="{
               'filter-date-wrap--active': hasValue,
               'filter-date-wrap--empty': !hasValue,
            }"
            role="button"
            tabindex="0"
            @keydown.enter.space.prevent="isOpen = !isOpen"
         >
            <span class="filter-date-value">
               {{ displayText }}
            </span>
            <button
               v-if="hasValue"
               type="button"
               class="filter-date-clear"
               :aria-label="t('buttons.clear')"
               @click.stop="clear"
            >
               <VaIcon name="close" size="10px" />
            </button>
            <VaIcon v-else name="fa-chevron-down" size="10px" class="filter-date-chevron" />
         </div>
      </template>
      <div class="filter-date-dropdown">
         <VaDateInput
            :model-value="modelValue"
            clearable
            :format-date="formatDate"
            mode="range"
            type="month"
            prevent-overflow
            class="filter-date-picker"
            @update:model-value="onRangeChange"
         />
      </div>
   </VaDropdown>
</template>

<script setup lang="ts">
   import { computed, ref } from 'vue'
   import { useI18n } from 'vue-i18n'

   type DateType = Date | string | null

   const { t } = useI18n()

   const props = defineProps<{
      label: string
      value: { start: DateType; end: DateType } | null
   }>()

   const emit = defineEmits<{
      (e: 'valueChange', value: { start: DateType; end: DateType } | null): void
   }>()

   const isOpen = ref(false)

   const modelValue = computed({
      get() {
         return props.value ?? { start: null, end: null }
      },
      set(value: { start: DateType; end: DateType } | null) {
         emit('valueChange', value)
      },
   })

   const hasValue = computed(() => {
      const v = props.value
      return v && (v.start != null || v.end != null)
   })

   function formatDate(date: Date): string {
      return date.toISOString().substring(0, 10)
   }

   function formatDisplayDate(d: Date | string | null): string {
      if (d == null) return ''
      const date = typeof d === 'string' ? new Date(d) : d
      if (isNaN(date.getTime())) return ''
      return date.toISOString().substring(0, 7)
   }

   const displayText = computed(() => {
      const v = props.value
      if (!v || (v.start == null && v.end == null)) return props.label
      const startStr = formatDisplayDate(v.start)
      const endStr = formatDisplayDate(v.end)
      if (startStr && endStr) return `${startStr} — ${endStr}`
      if (startStr) return startStr
      if (endStr) return endStr
      return props.label
   })

   function onRangeChange(value: { start: DateType; end: DateType } | null) {
      emit('valueChange', value)
   }

   function clear() {
      emit('valueChange', null)
   }
</script>

<style lang="scss" scoped>
   .filter-date-wrap {
      display: flex;
      align-items: center;
      min-width: 0;
      flex: 1;
      min-height: 2rem;
      min-width: 140px;
      max-width: 200px;
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      cursor: pointer;
      padding: 0 0.25rem 0 0;

      &:focus-within,
      &:focus {
         outline: none;
         border-color: var(--va-primary);
         box-shadow: 0 0 0 2px rgba(var(--va-primary-rgb, 59, 130, 246), 0.12);
      }

      &--active {
         border-color: color-mix(in srgb, var(--va-primary) 40%, transparent);
      }

      &--empty .filter-date-value {
         color: var(--va-text-secondary);
         opacity: 0.65;
      }
   }

   .filter-date-value {
      flex: 1;
      min-width: 0;
      padding: 0.45rem 0.55rem;
      font-size: 0.8125rem;
      color: var(--va-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
   }

   .filter-date-chevron {
      flex-shrink: 0;
      padding: 0 0.5rem 0 0;
      opacity: 0.4;
      color: var(--va-text-secondary);
      pointer-events: none;
   }

   .filter-date-clear {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 100%;
      min-height: 2rem;
      border: none;
      border-left: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      background: transparent;
      color: var(--va-text-secondary);
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover {
         background: var(--va-background-element);
         color: var(--va-primary);
      }
   }

   .filter-date-dropdown {
      min-width: 260px;
      padding: 0.6rem;
      background: var(--va-background-primary);
      border-radius: 10px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
   }

   .filter-date-picker {
      width: 100%;

      :deep(.va-date-input),
      :deep(.va-input-wrapper),
      :deep(.va-input) {
         font-size: 0.8125rem;
      }
   }
</style>
