<template>
   <div class="countries-dropdown">
      <FilterSelect
         :label="t('items.countries.title')"
         field="countries"
         :model="model"
         :value="countriesValue"
         @value-change="handleCountriesChange"
      />
   </div>
</template>

<script setup lang="ts">
   import { computed } from 'vue'
   import { useI18n } from 'vue-i18n'
   import { useItemStore } from '../stores/items-store'
   import FilterSelect from './inputs/FilterSelect.vue'
   import { DataModels } from '../data/types'

   const { t } = useI18n()
   const itemStore = useItemStore()

   const props = defineProps<{
      model: DataModels
   }>()

   const emit = defineEmits<{ (e: 'form-updated'): void }>()

   const countriesValue = computed(() => itemStore.searchForm?.countries__in ?? null)

   function handleCountriesChange(value: string | null) {
      itemStore.setSearchFormField('countries__in', value)
      emit('form-updated')
   }
</script>

<style lang="scss" scoped>
   .countries-dropdown {
      flex-shrink: 0;
   }
</style>
