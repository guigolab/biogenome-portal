<template>
   <VaModal v-if="mode === 'tsv'" v-model="isOpen" hide-default-actions close-button class="data-export-modal">
      <div class="data-export-modal__inner">
         <header class="data-export-modal__header">
            <p class="data-export-modal__kicker">{{ t('items.data.exportKicker') || 'Export' }}</p>
            <h2 class="data-export-modal__title">{{ t('reportModal.title') || 'Export TSV' }}</h2>
         </header>
         <p class="data-export-modal__hint va-text-secondary">
            {{ t('reportModal.description') || 'Download current results as a TSV file.' }}
         </p>
         <div class="data-export-modal__field">
            <div class="data-export-modal__card">
               <button
                  type="button"
                  class="data-export-modal__card-header"
                  @click="showFieldsCollapse = !showFieldsCollapse"
               >
                  <VaIcon :name="showFieldsCollapse ? 'fa-chevron-down' : 'fa-chevron-right'" size="small" />
                  {{ t('reportModal.addFieldBtn') || 'Add field' }}
               </button>
               <div v-if="showFieldsCollapse" class="data-export-modal__card-body">
                  <FieldLookup :model="model" @field-exists="addField" />
               </div>
               <div class="data-export-modal__card-body">
                  <VaOptionList v-model="selectedFields" :options="fields" />
               </div>
            </div>
         </div>
         <p class="data-export-modal__summary va-text-secondary">
            {{ t('reportModal.downloadSummary') || 'Downloading' }}
            <span class="va-text-bold">{{ itemStore.total.toLocaleString() }}</span>
            {{ t('exportModal.itemsAs') || 'items as' }}
            <span class="va-text-bold">TSV</span>
         </p>
         <button type="button" class="data-export-modal__submit" :disabled="itemStore.isTSVLoading" @click="downloadData">
            <VaIcon name="fa-file-arrow-down" size="small" />
            {{ t('buttons.download') }}
         </button>
      </div>
   </VaModal>

   <VaModal v-else v-model="isOpen" hide-default-actions close-button class="data-export-modal">
      <div class="data-export-modal__inner">
         <header class="data-export-modal__header">
            <p class="data-export-modal__kicker">{{ t('items.data.exportKicker') || 'Export' }}</p>
            <h2 class="data-export-modal__title">{{ t('chartModal.title') || 'Export chart' }}</h2>
         </header>
         <p class="data-export-modal__hint va-text-secondary">
            {{ t('chartModal.description') || 'Create a chart from the current data.' }}
         </p>
         <div class="data-export-modal__field">
            <label class="data-export-modal__label">{{ t('chartModal.fieldInputLabel') || 'Field' }}</label>
            <input
               v-model="chartForm.field"
               type="text"
               class="data-export-modal__input"
               :placeholder="t('chartModal.fieldInputLabel')"
            />
         </div>
         <div class="data-export-modal__field">
            <label class="data-export-modal__label">{{ t('chartModal.selectLabel') || 'Chart type' }}</label>
            <select v-model="chartForm.type" class="data-export-modal__select">
               <option v-for="ty in types" :key="ty" :value="ty">{{ ty }}</option>
            </select>
         </div>
         <div v-if="examples.length" class="data-export-modal__examples">
            <span class="data-export-modal__label">{{ t('chartModal.exampleBtn') || 'Examples' }}</span>
            <button
               v-for="ex in examples"
               :key="ex.key"
               type="button"
               class="data-export-modal__example-btn"
               @click="loadExample(ex)"
            >
               {{ ex.key }} -> {{ ex.type }}
            </button>
         </div>
         <button type="button" class="data-export-modal__submit" :disabled="isChartDisabled" @click="createChart">
            {{ t('buttons.submit') }}
         </button>
         <div v-if="charts.length" class="data-export-modal__charts-list">
            <div v-for="(ch, i) in charts" :key="`${ch.field}-${chartCounter}-${i}`" class="data-export-modal__chart-item">
               <Chart :chart="ch" :model="model" :ignore-query="false" />
            </div>
         </div>
      </div>
   </VaModal>
</template>

<script setup lang="ts">
   import { computed, ref, watch } from 'vue'
   import { useI18n } from 'vue-i18n'
   import { useItemStore } from '../stores/items-store'
   import FieldLookup from './FieldLookup.vue'
   import Chart from './Chart.vue'
   import type { ConfigFilter, DataModels, InfoBlock } from '../data/types'

   const { t } = useI18n()
   const itemStore = useItemStore()

   const props = defineProps<{
      modelValue: boolean
      mode: 'tsv' | 'chart'
      model: DataModels
      columns: string[]
      filters: ConfigFilter[]
   }>()
   const emit = defineEmits<{
      (e: 'update:modelValue', value: boolean): void
   }>()

   const isOpen = computed({
      get: () => props.modelValue,
      set: (value: boolean) => emit('update:modelValue', value),
   })
   const fields = ref([...props.columns])
   const selectedFields = ref([...props.columns])
   const showFieldsCollapse = ref(false)

   const types = ['pie', 'dateline', 'bar']
   const initChart: InfoBlock = {
      field: '',
      model: props.model,
      type: '' as any,
      size: 2,
      class: 'flex lg12 md12 sm12 xs12',
   }
   const chartForm = ref<InfoBlock>({ ...initChart })
   const charts = ref<InfoBlock[]>([])
   const chartCounter = ref(0)

   const examples = computed(() =>
      props.filters
         .filter((f) => f.type === 'date' || f.type === 'select')
         .map((f) => ({ key: f.key, type: f.type === 'select' ? 'bar' : 'dateline' })),
   )
   const isChartDisabled = computed(() => !chartForm.value.field || !chartForm.value.type)

   watch(
      () => props.columns,
      () => {
         selectedFields.value = [...props.columns]
         fields.value = [...props.columns]
      },
   )
   watch(
      () => props.model,
      () => {
         chartForm.value = { ...initChart, model: props.model }
         charts.value = []
      },
   )

   function addField(field: string) {
      if (!fields.value.includes(field)) {
         fields.value = [...fields.value, field]
         selectedFields.value = [...selectedFields.value, field]
      }
   }

   async function downloadData() {
      await itemStore.downloadData(props.model, selectedFields.value, 'tsv')
   }

   function loadExample(ex: { key: string; type: string }) {
      chartForm.value.field = ex.key
      chartForm.value.type = ex.type as any
   }

   function createChart() {
      const size = chartForm.value.type === 'dateline' ? 4 : 2
      charts.value = [{ ...chartForm.value, size }]
      chartForm.value = { ...initChart, model: props.model }
      chartCounter.value++
   }
</script>

<style lang="scss" scoped>
   .data-export-modal__inner {
      padding: 0.25rem 0;
      min-width: 320px;
      max-width: 520px;
   }

   .data-export-modal__header {
      margin-bottom: 1.25rem;
   }

   .data-export-modal__kicker {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--va-text-secondary);
      margin: 0 0 0.25rem 0;
      line-height: 1.3;
   }

   .data-export-modal__title {
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--va-text-primary);
      line-height: 1.3;
   }

   .data-export-modal__hint {
      font-size: 0.875rem;
      margin: 0 0 1rem;
      line-height: 1.45;
   }

   .data-export-modal__field {
      margin-bottom: 1rem;
   }

   .data-export-modal__label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--va-text-secondary);
      margin-bottom: 0.35rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
   }

   .data-export-modal__card {
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      border-radius: 8px;
      overflow: hidden;
      background: var(--va-background-element);
   }

   .data-export-modal__card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      text-align: left;
      border: none;
      background: transparent;
      color: var(--va-text-primary);
      cursor: pointer;

      &:hover {
         background: var(--va-background-primary);
      }
   }

   .data-export-modal__card-body {
      padding: 0.5rem 0.75rem;
      border-top: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
   }

   .data-export-modal__summary {
      font-size: 0.8125rem;
      margin: 0 0 1rem;
      line-height: 1.5;
   }

   .data-export-modal__input,
   .data-export-modal__select {
      display: block;
      width: 100%;
      min-width: 140px;
      padding: 0.4rem 0.5rem;
      font-size: 0.8125rem;
      color: var(--va-text-primary);
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.09));
      border-radius: 8px;
      outline: none;
      transition: border-color 0.15s ease;

      &:focus {
         border-color: var(--va-primary);
      }
   }

   .data-export-modal__select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      padding-right: 1.75rem;
   }

   .data-export-modal__submit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      background: var(--va-primary);
      color: #fff;
      cursor: pointer;
      transition: opacity 0.15s ease;

      &:hover:not(:disabled) {
         opacity: 0.9;
      }

      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }

   .data-export-modal__examples {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
   }

   .data-export-modal__example-btn {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.09));
      background: var(--va-background-element);
      color: var(--va-text-secondary);
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover {
         background: var(--va-background-primary);
         color: var(--va-primary);
      }
   }

   .data-export-modal__charts-list {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
   }

   .data-export-modal__chart-item {
      min-width: 0;
   }
</style>
