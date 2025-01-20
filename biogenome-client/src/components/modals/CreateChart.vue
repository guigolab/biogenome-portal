<template>
    <VaModal hide-default-actions close-button size="large" v-model="itemStore.showChartModal">

        <div class="va-gutter-5 layout fluid">
            <h3 class="va-h3">{{ t('chart.modalTitle') }}</h3>
            <p class="light-paragraph mb-15">
                {{ t('chart.modalDescription') }}
            </p>
            <VaCard outlined square>
                <VaCardContent>
                    <div class="row">
                        <div class="flex">
                            <VaInput inner-label :label="t('chart.fieldInputLabel')" v-model="chartForm.field" />

                        </div>
                        <div class="flex">
                            <VaSelect inner-label :label="t('chart.chartSelectLabel')" v-model="chartForm.type"
                                :options="types" />
                        </div>
                        <div v-if="examples.length" class="flex">
                            <VaMenu :options="examples"
                                :text-by="(({ key, type }: ConfigFilter) => `${key} --> ${type}`)"
                                @selected="loadExample">
                                <template #anchor>
                                    <VaButton color="secondary">Load example</VaButton>
                                </template>
                            </VaMenu>
                        </div>
                    </div>
                </VaCardContent>
                <VaCardActions>
                    <VaButton type="submit" :disabled="isDisabled" @click="createChart"> {{
                        t('buttons.submit') }}
                    </VaButton>
                </VaCardActions>
            </VaCard>
            <div v-for="ch in charts" class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <Chart :key="counter" :chart="ch" :ignore-query="false" />
                </div>
            </div>
        </div>

    </VaModal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useItemStore } from '../../stores/items-store'
import { useI18n } from 'vue-i18n'
import { ConfigFilter, DataModels, InfoBlock } from '../../data/types'
import Chart from '../Chart.vue'


const { t } = useI18n()
const itemStore = useItemStore()

const types = ['pie', 'dateline', 'bar']

const props = defineProps<{
    model: DataModels
    filters: ConfigFilter[]
}>()

const initChart: InfoBlock = {
    field: '',
    model: props.model,
    type: '' as any,
    class: 'flex lg12 md12 sm12 xs12'
}

const counter = ref(0)
const chartForm = ref({ ...initChart })
const charts = ref<InfoBlock[]>([])

watch(() => props.model, () => {
    chartForm.value = { ...initChart }
    charts.value = []
})

const examples = computed(() => props.filters
    .filter(({ type }) => type === 'date' || type === 'select')
    .map(({ key, type }) => ({ key, type: type === 'select' ? 'bar' : 'dateline' })))

function loadExample(f: ConfigFilter) {
    chartForm.value.field = f.key
    chartForm.value.type = f.type as 'bar' | 'dateline'
}

async function createChart() {
    charts.value = [...[{ ...chartForm.value }]]
    chartForm.value = { ...initChart }
    counter.value++
}

const isDisabled = computed(() => !chartForm.value.field || !chartForm.value.type)

</script>
