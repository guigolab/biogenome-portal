<template>
   <div class="filter-input-wrap" :class="{ 'filter-input-wrap--active': !!localValue }">
      <input :value="localValue" :placeholder="label" class="filter-input" type="text" @input="onInput" />
   </div>
</template>

<script setup lang="ts">
   import { ref, watch } from 'vue'

   const props = defineProps<{
      label: string
      value: string | null
   }>()

   const emit = defineEmits<{ (e: 'valueChange', value: string | null): void }>()

   const localValue = ref(props.value ?? '')

   let debounceTimer: ReturnType<typeof setTimeout> | null = null
   function onInput(e: Event) {
      const v = (e.target as HTMLInputElement).value.trim() || null
      localValue.value = v ?? ''
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
         emit('valueChange', v)
         debounceTimer = null
      }, 200)
   }

   watch(
      () => props.value,
      (v) => {
         localValue.value = v ?? ''
      },
   )
</script>

<style lang="scss" scoped>
   .filter-input-wrap {
      display: flex;
      align-items: center;
      min-width: 0;
      flex: 1;
      min-height: 2rem;
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &:focus-within {
         border-color: var(--va-primary);
         box-shadow: 0 0 0 2px rgba(var(--va-primary-rgb, 59, 130, 246), 0.12);
      }

      &--active {
         border-color: color-mix(in srgb, var(--va-primary) 40%, transparent);
      }
   }

   .filter-input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      outline: none;
      padding: 0.45rem 0.55rem;
      font-size: 0.8125rem;
      color: var(--va-text-primary);

      &::placeholder {
         color: var(--va-text-secondary);
         opacity: 0.6;
      }
   }
</style>
