<template>
   <div
      class="cms-input"
      :class="{
         'cms-input--error': showErrorState,
         'cms-input--disabled': disabled || loading,
      }"
   >
      <label v-if="label" :for="uid" class="cms-input__label">
         {{ label }}
         <span v-if="required" class="cms-input__required" aria-hidden="true">*</span>
      </label>
      <div class="cms-input__wrap" :class="{ 'cms-input__wrap--focused': focused }">
         <slot name="prefix" />
         <textarea
            v-if="type === 'textarea'"
            :id="uid"
            class="cms-input__field cms-input__textarea"
            v-bind="$attrs"
            :value="modelValue"
            :placeholder="placeholder"
            :disabled="disabled || loading"
            :readonly="readonly"
            :required="required"
            :rows="rows ?? 3"
            @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
            @focus="focused = true"
            @blur="onBlur"
         />
         <input
            v-else
            :id="uid"
            class="cms-input__field"
            v-bind="$attrs"
            :type="type"
            :value="modelValue"
            :placeholder="placeholder"
            :disabled="disabled || loading"
            :readonly="readonly"
            :required="required"
            @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
            @focus="focused = true"
            @blur="onBlur"
         />
         <span v-if="loading" class="cms-input__spinner" aria-hidden="true" />
         <button
            v-if="clearable && modelValue && !loading && !disabled"
            type="button"
            class="cms-input__clear"
            aria-label="Clear field"
            @click="emit('update:modelValue', '')"
         >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
               <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
         </button>
         <slot name="suffix" />
      </div>
      <p v-if="combinedErrorMessage" class="cms-input__error" role="alert">{{ combinedErrorMessage }}</p>
      <p v-else-if="hint" class="cms-input__hint">{{ hint }}</p>
   </div>
</template>

<script setup lang="ts">
   import { computed, ref, watch } from 'vue'

   const uid = `cms-input-${Math.random().toString(36).slice(2, 9)}`

   const props = withDefaults(
      defineProps<{
         modelValue?: string
         label?: string
         placeholder?: string
         hint?: string
         error?: boolean
         errorMessage?: string
         disabled?: boolean
         readonly?: boolean
         required?: boolean
         clearable?: boolean
         loading?: boolean
         type?: string
         rows?: number
         /** Like Vuestic rules: each returns `true` or an error string */
         rules?: ((v: string) => true | string)[]
      }>(),
      {
         type: 'text',
      },
   )

   const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
   const focused = ref(false)
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

   function onBlur() {
      focused.value = false
      runRules()
   }
</script>

<style lang="scss" scoped>
   .cms-input {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      font-family: var(--cms-font);
   }

   .cms-input__label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--cms-text);
      line-height: 1.4;
      cursor: default;
   }

   .cms-input__required {
      color: var(--cms-danger);
      font-weight: 700;
   }

   .cms-input__wrap {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--cms-bg-surface);
      border: 1.5px solid var(--cms-border-strong);
      border-radius: var(--cms-radius-sm);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      min-height: 2.375rem;

      &--focused {
         border-color: var(--cms-primary);
         box-shadow: var(--cms-focus-ring);
      }

      .cms-input--error & {
         border-color: var(--cms-danger);

         &.cms-input__wrap--focused {
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
         }
      }

      .cms-input--disabled & {
         background: var(--cms-bg-muted);
         opacity: 0.65;
         cursor: not-allowed;
      }
   }

   .cms-input__field {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      padding: 0.5rem 0.75rem;
      font-size: 0.9375rem;
      font-family: var(--cms-font);
      color: var(--cms-text);
      line-height: 1.5;

      &::placeholder { color: var(--cms-text-faint); }

      &:disabled {
         cursor: not-allowed;
         pointer-events: none;
      }
   }

   .cms-input__textarea {
      resize: vertical;
      align-self: stretch;
      min-height: 4.5rem;
   }

   @keyframes cms-spin { to { transform: rotate(360deg); } }

   .cms-input__spinner {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      margin-right: 0.625rem;
      border: 2px solid var(--cms-border-strong);
      border-top-color: var(--cms-primary);
      border-radius: 50%;
      animation: cms-spin 0.7s linear infinite;
   }

   .cms-input__clear {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      margin-right: 0.25rem;
      border: none;
      background: transparent;
      color: var(--cms-text-faint);
      border-radius: 4px;
      cursor: pointer;
      transition: color 0.12s, background 0.12s;

      &:hover { color: var(--cms-text); background: var(--cms-border); }
   }

   .cms-input__error {
      margin: 0;
      font-size: 0.8rem;
      color: var(--cms-danger-text);
      display: flex;
      align-items: center;
      gap: 0.3rem;

      &::before {
         content: '⚠';
         font-size: 0.75rem;
      }
   }

   .cms-input__hint {
      margin: 0;
      font-size: 0.8rem;
      color: var(--cms-text-muted);
      line-height: 1.4;
   }
</style>
