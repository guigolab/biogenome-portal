<template>
    <div class="row row-equal">
        <div v-for="chart, index in charts" :key="index" :class="chart.class">
            <Suspense>
                <template #default>
                    <va-card>
                        <va-card-content>
                            <div class="row align-center justify-space-between">
                                <p class="flex">{{ t(chart.title[locale]) }}</p>
                                <div class="flex">
                                    <va-chip size="small" square preset="primary"
                                        @click="downloadCanvasAsPNG(`${chart.model}.${chart.field}`, `${chart.type}.png`)">
                                        Download</va-chip>
                                </div>
                            </div>
                        </va-card-content>
                        <va-card-content>
                            <component class="va-chart" :key="index" :is="chartComponents[chart.type]"
                                :info-block="chart" :chart-id="`${chart.model}.${chart.field}`"
                                :label="t(`tooltip.${chart.model}`)" />
                        </va-card-content>
                    </va-card>
                </template>
                <template #fallback>
                    <va-skeleton height="400px" />
                </template>
            </Suspense>
        </div>
    </div>
</template>
<script setup lang="ts">
import DateLineChart from '../charts/DateLineChart.vue'
import PieChart from '../charts/PieChart.vue'
import BarChart from '../charts/BarChart.vue'
import { InfoBlock } from '../../data/types'
import { useI18n } from 'vue-i18n'
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    LineElement,
    LinearScale,
    PointElement,
    CategoryScale,
    ArcElement,
    Filler,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale, Filler, ArcElement, BarElement)

const { t, locale } = useI18n()

const props = defineProps<{
    charts: InfoBlock[]
}>()

const chartComponents = {
    'pie': PieChart,
    'bar': BarChart,
    'dateline': DateLineChart
}

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
        height: auto;
        height: 400px;
    }
}
</style>
