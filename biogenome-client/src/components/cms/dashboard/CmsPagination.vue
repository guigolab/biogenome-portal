<template>
   <div v-if="lastPage > 1" class="cms-pagination" role="navigation" aria-label="Pagination">
      <span class="cms-pagination__info">
         {{ from }}–{{ to }} of {{ total }}
      </span>
      <div class="cms-pagination__controls">
         <button
            class="cms-pagination__btn"
            :disabled="modelValue <= 1"
            aria-label="Previous page"
            @click="go(modelValue - 1)"
         >
            <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
               <path d="M6 1L1.5 5.5L6 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
         </button>

         <span class="cms-pagination__pages">
            <button
               v-for="p in visiblePages"
               :key="p"
               class="cms-pagination__page"
               :class="{ 'cms-pagination__page--active': p === modelValue }"
               @click="go(p)"
            >
               {{ p }}
            </button>
         </span>

         <button
            class="cms-pagination__btn"
            :disabled="modelValue >= lastPage"
            aria-label="Next page"
            @click="go(modelValue + 1)"
         >
            <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
               <path d="M1 1L5.5 5.5L1 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
         </button>
      </div>
   </div>
   <div v-else-if="total > 0" class="cms-pagination cms-pagination--single">
      <span class="cms-pagination__info">{{ total }} result{{ total !== 1 ? 's' : '' }}</span>
   </div>
</template>

<script setup lang="ts">
   import { computed } from 'vue'

   const props = defineProps<{
      modelValue: number
      total: number
      pageSize: number
   }>()

   const emit = defineEmits<{
      (e: 'update:modelValue', page: number): void
   }>()

   const lastPage = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
   const from = computed(() => Math.min(props.total, (props.modelValue - 1) * props.pageSize + 1))
   const to = computed(() => Math.min(props.total, props.modelValue * props.pageSize))

   const visiblePages = computed(() => {
      const current = props.modelValue
      const last = lastPage.value
      const pages: number[] = []
      const start = Math.max(1, current - 1)
      const end = Math.min(last, start + 2)
      for (let i = start; i <= end; i++) pages.push(i)
      return pages
   })

   function go(page: number) {
      if (page < 1 || page > lastPage.value) return
      emit('update:modelValue', page)
   }
</script>

<style lang="scss" scoped>
   .cms-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
      width: 100%;

      &--single {
         justify-content: flex-start;
      }
   }

   .cms-pagination__info {
      font-size: 0.775rem;
      color: var(--cms-text-muted);
      white-space: nowrap;
   }

   .cms-pagination__controls {
      display: flex;
      align-items: center;
      gap: 0.25rem;
   }

   .cms-pagination__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 1px solid var(--cms-border-strong);
      border-radius: 6px;
      background: var(--cms-bg-surface);
      color: var(--cms-text-muted);
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
      padding: 0;

      &:hover:not(:disabled) {
         border-color: var(--cms-primary);
         color: var(--cms-primary);
      }

      &:disabled {
         opacity: 0.35;
         cursor: default;
      }
   }

   .cms-pagination__pages {
      display: flex;
      gap: 0.2rem;
   }

   .cms-pagination__page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      padding: 0 0.35rem;
      border: 1px solid transparent;
      border-radius: 6px;
      background: none;
      font-size: 0.8125rem;
      color: var(--cms-text-muted);
      cursor: pointer;
      transition: background 0.12s, color 0.12s, border-color 0.12s;

      &:hover:not(.cms-pagination__page--active) {
         background: var(--cms-bg-hover);
      }

      &--active {
         background: var(--cms-primary);
         color: var(--cms-text-on-dark);
         font-weight: 600;
         cursor: default;
      }
   }
</style>
