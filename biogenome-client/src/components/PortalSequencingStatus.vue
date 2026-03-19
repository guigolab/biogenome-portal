<template>
   <div class="portal-sequencing-status">
      <p class="status-total" aria-live="polite">
         {{ t('home.statusTotal', { count: total.toLocaleString() }) }}
      </p>

      <!-- Stacked distribution bar: proportion at a glance -->
      <div class="status-bar" role="img" :aria-label="barAriaLabel">
         <div
            v-for="step in steps"
            :key="step.label"
            class="status-bar__segment"
            :class="{ 'status-bar__segment--zero': step.count === 0 }"
            :style="{
               width: total ? `${(step.count / total) * 100}%` : '0%',
               backgroundColor: getStepColor(step.color),
            }"
            :title="t(step.label) + ': ' + step.count"
         />
      </div>

      <!-- Legend: exact counts + definitions on hover -->
      <ul class="status-legend" role="list">
         <li v-for="step in steps" :key="step.label" class="status-legend__item">
            <VaPopover placement="top" trigger="hover" :message="t(step.description)" class="status-legend__popover">
               <div class="status-legend__row">
                  <span
                     class="status-legend__swatch"
                     :style="{ backgroundColor: getStepColor(step.color) }"
                     aria-hidden="true"
                  />
                  <VaIcon
                     :name="step.icon"
                     size="small"
                     :color="(step.color || 'primary') as string"
                     class="status-legend__icon"
                  />
                  <span class="status-legend__label">{{ t(step.label) }}</span>
                  <span class="status-legend__count" aria-label="count">
                     {{ step.count.toLocaleString() }}
                  </span>
                  <span class="status-legend__pct va-text-secondary">
                     ({{ formatPercentage(step.count, total) }}%)
                  </span>
               </div>
            </VaPopover>
         </li>
      </ul>
   </div>
</template>

<script setup lang="ts">
   import { computed, inject } from 'vue'
   import { useI18n } from 'vue-i18n'
   import type { AppConfig } from '../data/types'

   const { t } = useI18n()
   const appConfig = inject<AppConfig | null>('appConfig', null)

   function getStepColor(colorKey: string | undefined): string {
      const key = colorKey || 'primary'
      const vars = appConfig?.ui?.colors?.variables
      if (vars && key in vars && typeof vars[key] === 'string') {
         return vars[key] as string
      }
      return `var(--va-${key})`
   }

   const props = defineProps<{
      steps: {
         label: string
         description: string
         value: string
         count: number
         icon?: string
         color?: string
      }[]
   }>()

   const total = computed(() => props.steps.reduce((acc, step) => acc + step.count, 0))

   const barAriaLabel = computed(() => props.steps.map((s) => `${t(s.label)}: ${s.count}`).join(', '))

   function formatPercentage(count: number, total: number) {
      if (total === 0) return 0
      return Number(((count / total) * 100).toFixed(1))
   }
</script>

<style lang="scss" scoped>
   .portal-sequencing-status {
      width: 100%;
      max-width: 640px;
      margin: 0 auto;
   }

   .status-total {
      margin: 0 0 0.75rem 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--va-text-primary);
   }

   .status-bar {
      display: flex;
      width: 100%;
      height: 0.75rem;
      border-radius: 9999px;
      overflow: hidden;
      background: var(--va-background-element);
      margin-bottom: 1.25rem;
   }

   .status-bar__segment {
      min-width: 2px;
      transition: width 0.3s ease;
   }

   .status-bar__segment--zero {
      min-width: 0;
      overflow: hidden;
   }

   .status-legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
   }

   .status-legend__item {
      margin: 0;
   }

   .status-legend__popover {
      display: block;
   }

   .status-legend__row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      cursor: help;
      transition: background 0.15s ease;
   }

   .status-legend__row:hover {
      background: var(--va-background-element);
   }

   .status-legend__swatch {
      width: 0.625rem;
      height: 0.625rem;
      border-radius: 50%;
      flex-shrink: 0;
   }

   .status-legend__icon {
      flex-shrink: 0;
      opacity: 0.9;
   }

   .status-legend__label {
      flex: 1;
      font-size: 0.875rem;
      color: var(--va-text-primary);
   }

   .status-legend__count {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--va-text-primary);
      min-width: 2.5rem;
      text-align: right;
   }

   .status-legend__pct {
      font-size: 0.8125rem;
      min-width: 3.5rem;
      text-align: right;
   }
</style>
