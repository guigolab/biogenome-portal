<template>
   <VaDropdown v-model="isOpen" placement="bottom-start" stick-to-edges :close-on-content-click="false">
      <template #anchor>
         <div
            class="filter-select-wrap"
            :class="{
               'filter-select-wrap--active': hasValue,
               'filter-select-wrap--empty': !hasValue,
            }"
            role="button"
            tabindex="0"
            @keydown.enter.space.prevent="isOpen = !isOpen"
         >
            <span class="filter-select-value">
               {{ displayText }}
            </span>
            <button
               v-if="hasValue"
               type="button"
               class="filter-select-clear"
               :aria-label="t('buttons.clear')"
               @click.stop="clear"
            >
               <VaIcon name="close" size="10px" />
            </button>
            <VaIcon v-else name="fa-chevron-down" size="10px" class="filter-select-chevron" />
         </div>
      </template>
      <div class="filter-select-dropdown">
         <div v-if="isLoading" class="filter-select-loading">
            <VaIcon name="loop" size="small" spin="counter-clockwise" />
            <span>{{ t('loading') }}</span>
         </div>
         <div v-else class="filter-select-options">
            <label v-for="opt in selectOptions" :key="opt.value" class="filter-select-option">
               <input
                  type="checkbox"
                  :checked="selectedSet.includes(opt.value)"
                  class="filter-select-checkbox"
                  @change="toggleOption(opt.value)"
               />
               <span class="filter-select-option-text">{{ opt.text }}</span>
            </label>
            <p v-if="selectOptions.length === 0 && !isLoading" class="filter-select-empty va-text-secondary">
               {{ t('noData') }}
            </p>
         </div>
      </div>
   </VaDropdown>
</template>

<script setup lang="ts">
   import { computed, ref, watch } from 'vue'
   import { useI18n } from 'vue-i18n'
   import { useItemStore } from '../../stores/items-store'
   import { useMapStore } from '../../stores/map-store'
   import type { DataModels } from '../../data/types'

   const { t } = useI18n()
   const itemStore = useItemStore()
   const mapStore = useMapStore()

   const props = defineProps<{
      label: string
      field: string
      model: DataModels
      value: string | null
   }>()

   const emit = defineEmits<{ (e: 'valueChange', value: string | null): void }>()

   const isOpen = ref(false)
   const isLoading = ref(false)
   const options = ref<Record<string, number> | null>(null)
   const countryLabels = ref<Record<string, string>>({})
   const hasFetched = ref(false)

   const query = computed(() => itemStore.buildQuery())

   const selectedSet = ref<string[]>([])

   watch(
      () => props.value,
      (v) => {
         selectedSet.value = v ? v.split(',').filter(Boolean) : []
      },
      { immediate: true },
   )

   const hasValue = computed(() => selectedSet.value.length > 0)

   function getOptionLabel(key: string): string {
      if (props.field === 'countries') {
         return countryLabels.value[key] || key
      }
      return key
   }

   const selectOptions = computed(() => {
      if (!options.value) return []
      return Object.entries(options.value)
         .sort(([, countA], [, countB]) => countB - countA)
         .map(([key]) => ({
            value: key,
            text:
               options.value![key] != null
                  ? `${getOptionLabel(key)} (${options.value![key].toLocaleString()})`
                  : getOptionLabel(key),
         }))
   })

   const displayText = computed(() => {
      if (selectedSet.value.length === 0) return props.label
      if (selectedSet.value.length === 1) {
         const key = selectedSet.value[0]
         return getOptionLabel(key) + (options.value?.[key] != null ? ` (${options.value[key].toLocaleString()})` : '')
      }
      return `${selectedSet.value.length} selected`
   })

   async function fetchOptions() {
      if (hasFetched.value && options.value) return
      isLoading.value = true
      try {
         if (props.field === 'countries') {
            await mapStore.getCountries({ ...query.value })
            options.value = mapStore.countries.reduce<Record<string, number>>(
               (acc, country) => ({ ...acc, [country.countryId]: country.occurrences }),
               {},
            )
            countryLabels.value = mapStore.countries.reduce<Record<string, string>>(
               (acc, country) => ({ ...acc, [country.countryId]: country.countryName }),
               {},
            )
         } else {
            const opts = await itemStore.getFieldFrequencies(props.model, props.field)
            options.value = opts ? { ...opts } : {}
         }
         hasFetched.value = true
      } finally {
         isLoading.value = false
      }
   }

   watch(isOpen, (open) => {
      if (open) fetchOptions()
   })

   function toggleOption(value: string) {
      const set = new Set(selectedSet.value)
      if (set.has(value)) set.delete(value)
      else set.add(value)
      selectedSet.value = [...set]
      emit('valueChange', selectedSet.value.length ? selectedSet.value.join(',') : null)
   }

   function clear() {
      selectedSet.value = []
      emit('valueChange', null)
   }
</script>

<style lang="scss" scoped>
   .filter-select-wrap {
      display: flex;
      align-items: center;
      min-width: 0;
      flex: 1;
      min-height: 2rem;
      min-width: 120px;
      max-width: 180px;
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

      &--empty .filter-select-value {
         color: var(--va-text-secondary);
         opacity: 0.65;
      }
   }

   .filter-select-value {
      flex: 1;
      min-width: 0;
      padding: 0.45rem 0.55rem;
      font-size: 0.8125rem;
      color: var(--va-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
   }

   .filter-select-chevron {
      flex-shrink: 0;
      padding: 0 0.5rem 0 0;
      opacity: 0.4;
      color: var(--va-text-secondary);
      pointer-events: none;
   }

   .filter-select-clear {
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

   .filter-select-dropdown {
      min-width: 220px;
      padding: 0.35rem;
      background: var(--va-background-primary);
      border-radius: 10px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
   }

   .filter-select-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      color: var(--va-text-secondary);
      font-size: 0.8125rem;
   }

   .filter-select-options {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      max-height: 280px;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
   }

   .filter-select-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8125rem;
      color: var(--va-text-primary);

      &:hover {
         background: var(--va-background-element);
      }
   }

   .filter-select-checkbox {
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
      cursor: pointer;
   }

   .filter-select-option-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
   }

   .filter-select-empty {
      padding: 0.75rem;
      font-size: 0.8125rem;
      margin: 0;
   }
</style>
