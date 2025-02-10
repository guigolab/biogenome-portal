<template>
    <VaCard outlined square v-if="freq">
        <VaCardContent>
            <div class="row align-center justify-space-between">
                <p class="flex va-text-bold">{{ chartTitle }}</p>
                <div class="flex">
                    <VaButton color="textPrimary" size="small"
                        @click="downloadCanvasAsPNG(`${chart.model}.${chart.field}`, `${chart.type}.png`)">
                        {{ t('buttons.download') }}
                    </VaButton>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent>
            <component class="va-chart" :key="`${chart.model}.${chart.field}`" :is="chartComponents[chart.type]"
                :data="{ ...freq }" :chart-id="`${chart.model}.${chart.field}`" :label="t(`models.${chart.model}`)" />
        </VaCardContent>
    </VaCard>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { DataModels, InfoBlock } from '../data/types';
import DateLineChart from './charts/DateLineChart.vue'
import PieChart from './charts/PieChart.vue'
import BarChart from './charts/BarChart.vue'
import { computed, ref, watch } from 'vue';
import { useItemStore } from '../stores/items-store';

const itemStore = useItemStore()

const props = defineProps<{
    chart: InfoBlock,
    ignoreQuery: boolean
}>()

const chartComponents = {
    'pie': PieChart,
    'bar': BarChart,
    'dateline': DateLineChart
}

const { t } = useI18n()

const freq = ref<Record<string, number>>({})

watch(() => itemStore.searchForm, async () => {
    const f = await itemStore.getFieldFrequencies(props.chart.model as DataModels, props.chart.field, props.ignoreQuery)
    freq.value = { ...f }
}, { immediate: true, deep: true })

const chartTitle = computed(() => {
    const { field, model } = props.chart;
    let key = field.includes('metadata.') ? field.split('.').pop() : field.replace('_', ' ');
    return `${model.charAt(0).toUpperCase() + model.slice(1)} by ${key}`;
});

function downloadCanvasAsPNG(canvasId: string, filename: string) {
    // Get the canvas element
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

    // Ensure the canvas exists
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    // Convert canvas to data URL
    const dataURL = canvas.toDataURL('image/png');

    // Create a download link
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;

    // Trigger the download by simulating a click
    link.click();
}
</script>
<style lang="scss">
.va-chart {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    >* {
        height: 100%;
        width: 100%;
    }

    canvas {
        width: 100%;
        max-height: 400px;
    }
}
</style>