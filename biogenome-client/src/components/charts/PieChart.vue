<template>
  <Doughnut :chart-id="chartId" :plugins="[ChartDataLabels]" :chart-data="chartData" :chart-options="options" />
</template>

<script setup lang="ts">
import { Doughnut } from 'vue-chartjs';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useChartMixin } from './configs';
import { InfoBlock } from '../../data/types'

const props = defineProps<{ infoBlock: InfoBlock, label: string, chartId: string }>();
const { chartData, options } = await useChartMixin(props.infoBlock, props.label);

</script>
