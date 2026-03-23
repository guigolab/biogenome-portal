<template>
   <label class="cms-checkbox" :class="{ 'cms-checkbox--disabled': disabled }">
      <span class="cms-checkbox__control">
         <input
            class="cms-checkbox__native"
            type="checkbox"
            :checked="modelValue"
            :disabled="disabled"
            @change="onChange"
         />
         <span class="cms-checkbox__box" aria-hidden="true">
         <svg class="cms-checkbox__tick" width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
            <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>
         </span>
      </span>
      <span v-if="label || $slots.default" class="cms-checkbox__text">
         <slot>{{ label }}</slot>
      </span>
   </label>
</template>

<script setup lang="ts">
   const props = withDefaults(
      defineProps<{
         modelValue?: boolean
         label?: string
         disabled?: boolean
      }>(),
      { modelValue: false },
   )

   const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

   function onChange(e: Event) {
      emit('update:modelValue', (e.target as HTMLInputElement).checked)
   }
</script>

<style lang="scss" scoped>
   .cms-checkbox {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-family: var(--cms-font);
      font-size: 0.8125rem;
      color: var(--cms-text);
      user-select: none;

      &--disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }

   .cms-checkbox__control {
      position: relative;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
   }

   .cms-checkbox__native {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      opacity: 0;
      cursor: pointer;
      z-index: 2;

      &:disabled {
         cursor: not-allowed;
      }
   }

   .cms-checkbox__box {
      position: absolute;
      inset: 0;
      width: 1rem;
      height: 1rem;
      border: 1.5px solid var(--cms-border-strong);
      border-radius: 4px;
      background: var(--cms-bg-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.12s, background 0.12s, box-shadow 0.12s;

      .cms-checkbox:hover:not(.cms-checkbox--disabled) & {
         border-color: var(--cms-primary);
      }

      .cms-checkbox__native:focus-visible ~ & {
         box-shadow: var(--cms-focus-ring);
      }

      .cms-checkbox__native:checked ~ & {
         background: var(--cms-primary);
         border-color: var(--cms-primary);
      }

      .cms-checkbox__native:disabled + & {
         background: var(--cms-bg-muted);
      }
   }

   .cms-checkbox__tick {
      opacity: 0;
      color: var(--cms-text-on-dark);
      transform: scale(0.85);
      transition: opacity 0.1s;
   }

   .cms-checkbox__native:checked ~ .cms-checkbox__box .cms-checkbox__tick {
      opacity: 1;
   }

   .cms-checkbox__text {
      line-height: 1.35;
   }
</style>
