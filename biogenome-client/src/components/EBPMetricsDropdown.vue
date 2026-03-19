<template>
   <div class="ebp-metrics">
      <div
         class="ebp-metrics__item"
         :class="{ 'ebp-metrics__item--active': contigFilter }"
      >
         <VaSwitch
            size="small"
            v-model="contigFilter"
            @update:model-value="handleContigFilter"
            label="Contig N50 > 1MB"
            class="ebp-metrics__switch"
         />
      </div>
      <div
         class="ebp-metrics__item"
         :class="{ 'ebp-metrics__item--active': scaffoldFilter }"
      >
         <VaSwitch
            size="small"
            v-model="scaffoldFilter"
            @update:model-value="handleScaffoldFilter"
            label="Scaffold N50 > 10MB"
            class="ebp-metrics__switch"
         />
      </div>
   </div>
</template>

<script setup lang="ts">
   import { computed } from 'vue'
   import { useItemStore } from '../stores/items-store'
   import { DataModels } from '../data/types'

   const itemStore = useItemStore()
   const props = defineProps<{
      model: DataModels
   }>()

   const emit = defineEmits<{ (e: 'form-updated'): void }>()

   const contigFilter = computed({
      get: () => Boolean(itemStore.searchForm['metadata.assembly_stats.contig_n50__gte']),
      set: (value) => {
         itemStore.setSearchFormField('metadata.assembly_stats.contig_n50__gte', value ? 1000000 : null)
         emit('form-updated')
      },
   })

   const scaffoldFilter = computed({
      get: () => Boolean(itemStore.searchForm['metadata.assembly_stats.scaffold_n50__gte']),
      set: (value) => {
         itemStore.setSearchFormField('metadata.assembly_stats.scaffold_n50__gte', value ? 10000000 : null)
         emit('form-updated')
      },
   })

   async function handleContigFilter(value: boolean) {
      itemStore.setSearchFormField('metadata.assembly_stats.contig_n50__gte', value ? 1000000 : null)
      await itemStore.fetchItems(props.model)
   }

   async function handleScaffoldFilter(value: boolean) {
      itemStore.setSearchFormField('metadata.assembly_stats.scaffold_n50__gte', value ? 10000000 : null)
      await itemStore.fetchItems(props.model)
   }
</script>

<style lang="scss" scoped>
   .ebp-metrics {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
   }

   .ebp-metrics__item {
      display: flex;
      align-items: center;
      min-height: 2rem;
      padding: 0.35rem 0.55rem;
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &:focus-within {
         border-color: var(--va-primary);
         box-shadow: 0 0 0 2px rgba(var(--va-primary-rgb, 59, 130, 246), 0.12);
      }

      &--active {
         border-color: color-mix(in srgb, var(--va-primary) 40%, transparent);
      }
   }

   .ebp-metrics__switch {
      :deep(.va-switch__label) {
         font-size: 0.8125rem;
         color: var(--va-text-primary);
      }
   }
</style>
