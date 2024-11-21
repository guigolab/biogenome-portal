<template>
    <VaModal hide-default-actions close-button size="large" v-model="itemStore.showChartModal">
        <h3 class="va-h3">{{ t('chart.modalTitle') }}</h3>
        <p class="light-paragraph mb-15">
            {{ t('chart.modalDescription') }}
        </p>
        <div class="row align-end mb-15 gap-1">
            <div class="flex">
                <VaInput class="w-250" :label="t('chart.fieldInputLabel')" v-model="chart.field" />
            </div>
            <div class="flex">
                <VaSelect class="w-250" :label="t('chart.chartSelectLabel')" v-model="chart.type" :options="types" />
            </div>
            <div class="flex">
                <VaButton preset="submit" :disabled="isDisabled" @click="createChart"> {{ t('buttons.submit') }}
                </VaButton>
            </div>
        </div>
        <VaDivider v-if="charts.length" />
        <ChartsBlock :source="model" :charts="charts" />
    </VaModal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useItemStore } from '../../stores/items-store'
import { useI18n } from 'vue-i18n'
import ChartsBlock from '../blocks/ChartsBlock.vue'
import { DataModels, InfoBlock } from '../../data/types'

const { t } = useI18n()
const itemStore = useItemStore()

const types = ['pie', 'dateline', 'bar']

const props = defineProps<{
    model: DataModels
}>()

watch(() => props.model, () => {
    charts.value = []
    chart.value = { ...initChart }
})

const initChart: InfoBlock = {
    field: '',
    model: '',
    type: 'bar',
    class: 'flex lg12 md12 sm12 xs12'
}
const chart = ref<InfoBlock>({ ...initChart })

const charts = ref<InfoBlock[]>([])

async function createChart() {
    chart.value.model = props.model
    charts.value = [...[{ ...chart.value }]]

}

const isDisabled = computed(() => !chart.value.field || !chart.value.type)

</script>
