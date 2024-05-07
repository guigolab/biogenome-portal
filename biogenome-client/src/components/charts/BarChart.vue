<template>
    <va-card class="chart-widget">
        <va-card-title>{{ t(chart.title[locale]) }}</va-card-title>
        <va-card-content>
            <va-chart class="chart" :options="{ scales: { yAxes: { display: false } } }"
                :data="createLineChartData(data)" type="bar" />
        </va-card-content>
    </va-card>
</template>
<script setup lang="ts">
import StatisticsService from '../../services/clients/StatisticsService'
import VaChart from '../../components/va-charts/VaChart.vue'
import { InfoBlock, TLineChartData } from '../../data/types'
import { useI18n } from 'vue-i18n'
const { t,locale } = useI18n()

const props = defineProps<{
  chart: InfoBlock,
  query?: Record<string,any>,
}>()

const colors = ['#2c82e0', '#ef476f', '#ffd166', '#06d6a0', '#8338ec', '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#c9cbcf', '#e74c3c', '#3498db', '#2ecc71', '#f1c40f',
    '#e67e22', '#1abc9c', '#9b59b6', '#34495e', '#95a5a6', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#f39c12',
    '#d35400', '#2c3e50', '#bdc3c7', '#7f8c8d', '#e74c3c', '#2980b9', '#f1c40f', '#2ecc71', '#9b59b6'
]

const { data } =  await StatisticsService.getModelFieldStats(props.chart.model, props.chart.field)

function createLineChartData(data: Record<string, number>): TLineChartData {

    const orderedValues = Object.fromEntries(Object.entries(data).sort(([k, v], [k1, v1]) => v - v1))
    const datasets = [
        {
            label: t(props.chart.label[locale.value]),
            backgroundColor: colors,
            data: Object.values(orderedValues),
        }
    ];
    return {
        labels: Object.keys(orderedValues),
        datasets: datasets,
    };
}
</script>