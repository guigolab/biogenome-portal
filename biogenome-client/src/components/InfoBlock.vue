<template>
    <div class="row row-equal">
        <div v-for="chart, index in charts" :key="index" :class="chart.class">
            <Suspense>
                <template #default>
                    <PieChart v-if="chart.type === 'pie'" :field="chart.field" :model="chart.model" :title="chart.title"
                        :label="chart.label" />
                    <DateLineChart v-else-if="chart.type === 'dateline'" :label="chart.label" :field="chart.field"
                        :title="chart.title" :model="chart.model" :color="chart.color" />
                    <ContributorList v-else-if="chart.type === 'contribution'" :field="chart.field" :model="chart.model"
                        :title="chart.title" />
                    <CustomList v-else-if="chart.type === 'list'" :title="chart.title" :field="chart.field"
                        :model="chart.model" :is-habitat="false" />
                    <CustomList v-else-if="chart.type === 'habitat'" :title="chart.title" :field="chart.field"
                        :model="chart.model" :is-habitat="true" />
                </template>
                <template #fallback>
                    <va-skeleton height="400px" />
                </template>
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
  