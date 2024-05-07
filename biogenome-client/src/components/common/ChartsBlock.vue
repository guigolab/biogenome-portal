<template>
    <div class="row row-equal">
        <div v-for="chart, index in charts" :key="index" :class="chart.class">
            <Suspense>
                <template #default>
                    <PieChart v-if="chart.type === 'pie'" :chart="chart" />
                    <DateLineChart v-else-if="chart.type === 'dateline'" :chart="chart" />
                    <BarChart v-else-if="chart.type === 'bar'" :chart="chart" />
                    <ContributorList v-else-if="chart.type === 'contribution'" :chart="chart" />
                    <CustomList v-else-if="chart.type === 'list'" :chart="chart" :is-habitat="false" />
                    <CustomList v-else-if="chart.type === 'habitat'" :chart="chart" :is-habitat="true" />
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
import ContributorList from '../stats/ContributorList.vue'
import PieChart from '../charts/PieChart.vue'
import { InfoBlock } from '../../data/types'
import CustomList from '../stats/CustomList.vue'
import BarChart from '../charts/BarChart.vue'

const props = defineProps<{
    charts: InfoBlock[]
}>()



</script>