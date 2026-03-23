<template>
   <div class="cms-search" :class="{ 'cms-search--focused': focused }">
      <span class="cms-search__icon" aria-hidden="true">
         <!-- Magnifier SVG inline — zero Vuestic dependency -->
         <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
         </svg>
      </span>

      <input
         ref="inputRef"
         class="cms-search__input"
         type="search"
         :name="props.fieldName"
         :value="props.modelValue"
         :placeholder="props.placeholder"
         :autocomplete="props.autocomplete"
         spellcheck="false"
         data-lpignore="true"
         data-1p-ignore
         data-form-type="other"
         @input="onInput"
         @focus="focused = true"
         @blur="focused = false"
      />

      <button
         v-if="props.modelValue"
         class="cms-search__clear"
         type="button"
         aria-label="Clear search"
         @click="onClear"
      >
         <!-- × icon -->
         <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
         </svg>
      </button>
   </div>
</template>

<script setup lang="ts">
   import { ref } from 'vue'

   const props = withDefaults(
      defineProps<{
         modelValue: string
         placeholder?: string
         /** Stable `name` on the native input so it is not confused with login `username` */
         fieldName?: string
         /**
          * Use token "search" (default) — not "username" — or browsers may autofill saved credentials here.
          * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-detail-tokens
          */
         autocomplete?: string
      }>(),
      {
         placeholder: 'Search…',
         fieldName: 'cms-search-filter',
         autocomplete: 'search',
      },
   )

   const emit = defineEmits<{
      (e: 'update:modelValue', value: string): void
      (e: 'clear'): void
   }>()

   const focused = ref(false)
   const inputRef = ref<HTMLInputElement | null>(null)

   function onInput(e: Event) {
      emit('update:modelValue', (e.target as HTMLInputElement).value)
   }

   function onClear() {
      emit('update:modelValue', '')
      emit('clear')
      inputRef.value?.focus()
   }
</script>

<style lang="scss" scoped>
   .cms-search {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--cms-bg-surface);
      border: 1px solid var(--cms-border-strong);
      border-radius: var(--cms-radius-sm);
      transition: border-color 0.15s, box-shadow 0.15s;
      flex: 1;
      min-width: 160px;
      max-width: 320px;

      &--focused {
         border-color: var(--cms-primary);
         box-shadow: var(--cms-focus-ring);
      }
   }

   .cms-search__icon {
      position: absolute;
      left: 0.625rem;
      display: flex;
      align-items: center;
      color: var(--cms-text-muted);
      pointer-events: none;
      flex-shrink: 0;
   }

   .cms-search__input {
      width: 100%;
      height: 32px;
      padding: 0 2rem 0 2.125rem;
      font-size: 0.8125rem;
      font-family: var(--cms-font);
      color: var(--cms-text);
      background: transparent;
      border: none;
      outline: none;
      line-height: 1;

      &::placeholder {
         color: var(--cms-text-faint);
      }
   }

   .cms-search__clear {
      position: absolute;
      right: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: none;
      background: var(--cms-border);
      color: var(--cms-text-muted);
      cursor: pointer;
      padding: 0;
      transition: background 0.15s;

      &:hover {
         background: var(--cms-border-strong);
      }
   }
</style>
