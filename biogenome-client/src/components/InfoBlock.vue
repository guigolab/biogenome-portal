<template>
    <div class="row row-equal">
        <div v-for="chart, index in charts" :key="index" :class="chart.class">
            <Suspense v-if="chart.type === 'pie'">
                <PieChart :field="chart.field" :model="chart.model" :title="chart.title" :label="chart.label" />
            </Suspense>
            <Suspense v-else-if="chart.type === 'dateline'">
                <DateLineChart :label="chart.label" :field="chart.field" :title="chart.title" :model="chart.model"
                    :color="chart.color" :is-date="chart.isDate" />
            </Suspense>
            <Suspense v-else-if="chart.type === 'contribution'">
                <ContributorList :field="chart.field" :model="chart.model"
                    :title="chart.title" />
            </Suspense>
            <Suspense v-else-if="chart.type === 'list'">  
                <CustomList :title="chart.title" :field="chart.field" :model="chart.model" :is-habitat="chart.isHabitat"/>   
            </Suspense>
        </div>
    </div>
</template>
<script setup lang="ts">
import DateLineChart from './charts/DateLineChart.vue'
import ContributorList from './stats/ContributorList.vue'
import PieChart from './charts/PieChart.vue'
import { InfoBlock } from '../data/types'
import CustomList from './stats/CustomList.vue'

const props = defineProps<{
    charts: InfoBlock[]
}>()

</script>
  