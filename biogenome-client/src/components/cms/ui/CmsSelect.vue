<template>
   <div
      class="cms-select"
      :class="{
         'cms-select--error': showErrorState,
         'cms-select--disabled': disabled,
      }"
   >
      <label v-if="label" :for="uid" class="cms-select__label">
         {{ label }}
         <span v-if="required" class="cms-select__required" aria-hidden="true">*</span>
      </label>
      <div class="cms-select__wrap">
         <select
            :id="uid"
            class="cms-select__field"
            v-bind="$attrs"
            :value="modelValue"
            :disabled="disabled"
            :required="required"
            @change="onChange"
         >
            <option
               v-if="clearable"
               value=""
               :disabled="required && !modelValue"
            >
               {{ clearLabel }}
            </option>
            <option v-else-if="placeholder" value="" :disabled="required" :selected="!modelValue">{{ placeholder }}</option>
            <option
               v-for="option in normalizedOptions"
               :key="option.value"
               :value="option.value"
            >
               {{ option.label }}
            </option>
         </select>
         <svg class="cms-select__arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>
      </div>
      <p v-if="combinedErrorMessage" class="cms-select__error" role="alert">{{ combinedErrorMessage }}</p>
      <p v-else-if="hint" class="cms-select__hint">{{ hint }}</p>
   </div>
</template>

<script setup lang="ts">
   import { computed, ref, watch } from 'vue'

   const uid = `cms-select-${Math.random().toString(36).slice(2, 9)}`

   type StringOrOption = string | { label: string; value: string }

   const props = withDefaults(defineProps<{
      modelValue?: string
      options?: StringOrOption[]
      label?: string
      placeholder?: string
      hint?: string
      error?: boolean
      errorMessage?: string
      disabled?: boolean
      required?: boolean
      clearable?: boolean
      clearLabel?: string
      rules?: ((v: string) => true | string)[]
   }>(), {
      options: () => [],
      clearLabel: '—',
   })

   const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

   const ruleError = ref('')

   function runRules() {
      if (!props.rules?.length) {
         ruleError.value = ''
         return
      }
      const v = props.modelValue ?? ''
      for (const r of props.rules) {
         const out = r(v)
         if (out !== true) {
            ruleError.value = String(out)
            return
         }
      }
      ruleError.value = ''
   }

   watch(() => props.modelValue, runRules, { immediate: true })

   const combinedErrorMessage = computed(() => props.errorMessage || ruleError.value)
   const showErrorState = computed(() => !!props.error || !!combinedErrorMessage.value)

   const normalizedOptions = computed(() =>
      (props.options ?? []).map((opt) =>
         typeof opt === 'string' ? { label: opt, value: opt } : opt
      )
   )

   function onChange(e: Event) {
      emit('update:modelValue', (e.target as HTMLSelectElement).value)
      runRules()
   }
</script>

<style lang="scss" scoped>
   .cms-select {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      font-family: var(--cms-font);
   }

   .cms-select__label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--cms-text);
      cursor: default;
   }

   .cms-select__required {
      color: var(--cms-danger);
      font-weight: 700;
   }

   .cms-select__wrap {
      position: relative;
      display: flex;
      align-items: center;
   }

   .cms-select__field {
      width: 100%;
      appearance: none;
      background: var(--cms-bg-surface);
      border: 1.5px solid var(--cms-border-strong);
      border-radius: var(--cms-radius-sm);
      padding: 0.5rem 2rem 0.5rem 0.75rem;
      font-size: 0.9375rem;
      font-family: var(--cms-font);
      color: var(--cms-text);
      min-height: 2.375rem;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &:focus {
         outline: none;
         border-color: var(--cms-primary);
         box-shadow: var(--cms-focus-ring);
      }

      &:disabled {
         background: var(--cms-bg-muted);
         opacity: 0.65;
         cursor: not-allowed;
      }

      .cms-select--error & {
         border-color: var(--cms-danger);
      }
   }

   .cms-select__arrow {
      position: absolute;
      right: 0.625rem;
      color: var(--cms-text-muted);
      pointer-events: none;
      flex-shrink: 0;
   }

   .cms-select__error {
      margin: 0;
      font-size: 0.8rem;
      color: var(--cms-danger-text);

      &::before { content: '⚠ '; }
   }

   .cms-select__hint {
      margin: 0;
      font-size: 0.8rem;
      color: var(--cms-text-muted);
   }
</style>
