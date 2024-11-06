<template>
    <div v-if="config">
        <div class="row justify-space-between align-center">
            <div class="flex">
                <h1 v-if="config.title" class="va-h3">{{ config.title[locale] }}</h1>
            </div>
            <div class="flex">Total: {{ total }}</div>
        </div>
        <p class="light-paragraph mb-6" v-if="config.description">{{
            config.description[locale] }}</p>
    </div>
    <FiltersBlock :model="currentModel" :hasCharts="hasCharts" />

    <ChartsBlock :source="currentModel" :charts="charts" v-if="itemStore.view === 'charts'" />
    <TableBlock :model="currentModel" v-else />

</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, watch } from 'vue'
import { DataModels, ModelConfig } from '../../data/types'
import { useRoute } from 'vue-router'
import { useItemStore } from '../../stores/items-store'
import ChartsBlock from '../../components/blocks/ChartsBlock.vue'
import FiltersBlock from '../../components/blocks/FiltersBlock.vue'
import TableBlock from '../../components/blocks/TableBlock.vue'
import { useConfig } from '../../composable/useConfig'
import { useStatsStore } from '../../stores/stats-store'

const props = defineProps<{
    config?: ModelConfig,
    model?: DataModels
}>()

const { locale } = useI18n()
const route = useRoute()
const itemStore = useItemStore()
const statsStore = useStatsStore()
const currentModel = computed(() => {
    return props.model || route.name as DataModels
})

const total = computed(() => {
    const v = statsStore.stats.find(s => s.key === currentModel.value)
    return v ? v.count : 0
})
const charts = computed(() => {
    const { charts } = useConfig(currentModel.value)
    return charts.value
})

const hasCharts = computed(() => charts.value.length > 0)

watch(() => currentModel.value, async () => {
    await itemStore.fetchItems(currentModel.value)
}, { immediate: true })

</script>
