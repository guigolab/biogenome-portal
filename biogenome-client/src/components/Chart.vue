<template>
    <VaCard class="data-card" v-if="freq">
        <VaCardContent class="chart-header">
            <div class="row align-center justify-space-between">
                <div class="chart-title">
                    <p class="va-text-bold">{{ chartTitle }}</p>
                    <p class="chart-subtitle">{{ t(`models.${chart.model}`) }}</p>
                </div>
                <div class="flex">
                    <VaButton 
                        color="primary" 
                        size="small"
                        class="download-btn"
                        @click="downloadCanvasAsPNG(`${chart.model}.${chart.field}`, `${chart.type}.png`)"
                    >
                        <VaIcon name="fa-file-arrow-down" class="mr-2" />
                        {{ t('buttons.download') }}
                    </VaButton>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent class="chart-content">
            <component 
                class="va-chart" 
                :key="`${chart.model}.${chart.field}`" 
                :is="chartComponents[chart.type]"
                :data="{ ...freq }" 
                :chart-id="`${chart.model}.${chart.field}`" 
                :label="t(`models.${chart.model}`)" 
            />
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
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : field;
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
<style lang="scss" scoped>
.data-card {
    background: var(--va-background-secondary);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: box-shadow 0.2s, transform 0.2s;
    
    &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10);
    }
}

.chart-header {
    padding: 1rem 1.5rem;
    background: var(--va-background-secondary);
    border-bottom: 1px solid var(--va-background-border);
}

.chart-content {
    padding: 1.5rem;
    height: 400px;
    display: flex;
    align-items: center;
}

.download-btn {
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 6px;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    &:active {
        box-shadow: 0 0 0 2px var(--va-primary);
    }
}

.va-chart {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    >* {
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

.mr-2 {
    margin-right: 0.5rem;
}

.chart-title {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    p {
        margin: 0;
        line-height: 1.2;
    }

    .va-text-bold {
        font-size: 1.1rem;
        color: var(--va-text-primary);
    }

    .chart-subtitle {
        font-size: 0.9rem;
        color: var(--va-text-secondary);
        font-weight: 500;
    }
}
</style>