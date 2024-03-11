<template>
    <va-card class="chart-widget">
        <va-card-title>{{ t(title) }}</va-card-title>
        <va-card-content>
            <va-chart class="chart" :options="{ scales: { yAxes: { display: false } } }"
                :data="createLineChartData(data)" type="bar" />
        </va-card-content>
    </va-card>
</template>
<script setup lang="ts">
import StatisticsService from '../../services/clients/StatisticsService'
import VaChart from '../../components/va-charts/VaChart.vue'
import { TLineChartData } from '../../data/types'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const props = defineProps<{
    model: string,
    field: string,
    title: string,
    label: string,
    color?: string,
}>()
const primaryColorVariants = ['#2c82e0', '#ef476f', '#ffd166', '#06d6a0', '#8338ec']

const { data } = await StatisticsService.getModelFieldStats(props.model, { field: props.field })

function createLineChartData(data: Record<string, number>): TLineChartData {

    const orderedValues = Object.fromEntries(Object.entries(data).sort(([k, v], [k1, v1]) => v - v1))
    const datasets = [
        {
            label: t(props.label),
            backgroundColor: props.color ? props.color : primaryColorVariants,
            data: Object.values(orderedValues),
        }
    ];

    return {
        labels: Object.keys(orderedValues),
        datasets: datasets,
    };
}
</script>