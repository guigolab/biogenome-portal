<template>
    <section class="row row-equal">
        <div v-for="chart, index in charts" :key="`${index}-${chart.model}-${chart.field}`" :class="chart.class">
            <ChartCard :source="source" :chart="chart" :index="index" />
        </div>
    </section>
</template>
<script setup lang="ts">
import { InfoBlock } from '../data/types'
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
import ChartCard from '../components/cards/ChartCard.vue'

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale, Filler, ArcElement, BarElement)

const props = defineProps<{
    charts: InfoBlock[],
    source: string
}>()

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