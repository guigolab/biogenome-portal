<template>
    <VaModal size="large" v-model="itemStore.showChartModal" hide-default-actions :title="t('buttons.chartDownload')">
        <div class="row">
            <div class="flex">
                <VaInput label="Field to query" v-model="chart.field" :messages="[fieldMessage]" />
            </div>
            <div class="flex">
                <VaSelect label="Chart type" v-model="chart.type" :options="types" />
            </div>
        </div>
        <div class="row">
            <div class="flex">
                <VaButton :disabled="isDisabled" @click="createChart"> {{ t('buttons.submit') }} </VaButton>
            </div>
        </div>
        <VaDivider />
        <ChartsBlock :charts="charts" />
    </VaModal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useItemStore } from '../../stores/items-store'
import { useI18n } from 'vue-i18n'
import columns from '../../../configs/columns.json'
import ChartsBlock from '../blocks/ChartsBlock.vue'
import { InfoBlock } from '../../data/types'

const { t } = useI18n()
const itemStore = useItemStore()

const types = ['pie', 'dateline', 'bar']
const fieldMessage = "If the field is contained in metadata or is nested type: 'metadata.fieldYouWantToSelect' or metadata.parentField.nestedField"

const model = computed(() => itemStore.currentModel as keyof typeof columns)

watch(() => model.value, () => {
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
    chart.value.model = model.value
    charts.value = [...[{ ...chart.value }]]

}

const isDisabled = computed(() => !chart.value.field || !chart.value.type)

</script>