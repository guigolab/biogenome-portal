<template>
   <div v-if="freq" class="data-chart-card">
      <header class="data-chart-card__header">
         <div class="data-chart-card__title-block">
            <p class="data-chart-card__kicker">{{ t(`models.${chartModel}`) }}</p>
            <h3 class="data-chart-card__title">{{ chartTitle }}</h3>
         </div>
         <button
            type="button"
            class="data-chart-card__download-btn"
            @click="downloadCanvasAsPNG(`${chartModel}.${chart.field}`, `${chart.type}.png`)"
         >
            <VaIcon name="fa-file-arrow-down" size="small" />
            {{ t('buttons.download') }}
         </button>
      </header>
      <div class="data-chart-card__content">
         <component
            class="data-chart-card__chart"
            :key="`${chartModel}.${chart.field}`"
            :is="chartComponents[chart.type]"
            :data="{ ...freq }"
            :chart-id="`${chartModel}.${chart.field}`"
            :label="t(`models.${chartModel}`)"
         />
      </div>
   </div>
</template>
<script setup lang="ts">
   import { useI18n } from 'vue-i18n'
   import { DataModels, InfoBlock } from '../data/types'
   import DateLineChart from './charts/DateLineChart.vue'
   import PieChart from './charts/PieChart.vue'
   import BarChart from './charts/BarChart.vue'
   import { computed, ref, watch } from 'vue'
   import { useItemStore } from '../stores/items-store'

   const itemStore = useItemStore()

   const props = defineProps<{
      chart: InfoBlock
      /** Current data model tab; overrides deprecated `chart.model` in JSON. */
      model?: DataModels
      ignoreQuery: boolean
   }>()

   const chartModel = computed<DataModels>(
      () => (props.model ?? (props.chart.model as DataModels)) as DataModels,
   )

   const chartComponents = {
      pie: PieChart,
      bar: BarChart,
      dateline: DateLineChart,
   }

   const { t } = useI18n()

   const freq = ref<Record<string, number>>({})

   watch(
      () => ({
         searchForm: itemStore.searchForm,
         model: chartModel.value,
         field: props.chart.field,
         ignoreQuery: props.ignoreQuery,
      }),
      async () => {
         const f = await itemStore.getFieldFrequencies(
            chartModel.value,
            props.chart.field,
            props.ignoreQuery,
         )
         freq.value = { ...f }
      },
      { immediate: true, deep: true },
   )

   const chartTitle = computed(() => {
      const { field } = props.chart
      let key = field.includes('metadata.') ? field.split('.').pop() : field.replace('_', ' ')
      return key ? key.charAt(0).toUpperCase() + key.slice(1) : field
   })

   function downloadCanvasAsPNG(canvasId: string, filename: string) {
      // Get the canvas element
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement

      // Ensure the canvas exists
      if (!canvas) {
         console.error('Canvas element not found!')
         return
      }
      // Convert canvas to data URL
      const dataURL = canvas.toDataURL('image/png')

      // Create a download link
      const link = document.createElement('a')
      link.href = dataURL
      link.download = filename

      // Trigger the download by simulating a click
      link.click()
   }
</script>
<style lang="scss" scoped>
   .data-chart-card {
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &:hover {
         border-color: rgba(0, 0, 0, 0.09);
         box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }
   }

   .data-chart-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.875rem 1.25rem;
      background: var(--va-background-element);
      border-bottom: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
   }

   .data-chart-card__title-block {
      min-width: 0;
      flex: 1;
   }

   .data-chart-card__kicker {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--va-text-secondary);
      margin: 0 0 0.25rem 0;
      line-height: 1.3;
   }

   .data-chart-card__title {
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin: 0;
      color: var(--va-text-primary);
      line-height: 1.3;
   }

   .data-chart-card__download-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      border-radius: 6px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.09));
      background: var(--va-background-primary);
      color: var(--va-text-secondary);
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
      flex-shrink: 0;

      &:hover {
         background: var(--va-background-element);
         border-color: var(--va-primary);
         color: var(--va-primary);
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
      }
   }

   .data-chart-card__content {
      padding: 1rem 1.25rem;
      height: 400px;
      display: flex;
      align-items: center;
      background: var(--va-background-primary);
   }

   .data-chart-card__chart {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;

      > * {
         height: 100%;
         width: 100%;
      }

      canvas {
         width: 100%;
         height: 100%;
         max-height: 400px;
         object-fit: contain;
      }
   }
</style>
