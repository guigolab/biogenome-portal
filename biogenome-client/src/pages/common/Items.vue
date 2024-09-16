<template>
    <div v-if="config">
        <h1 v-if="config.title" class="va-h1">{{ config.title[locale] }}</h1>
        <p v-if="config.description" style="margin-bottom: 6px" class="va-text-secondary">{{
            config.description[locale] }}</p>
    </div>
    <FiltersBlock :hasCharts="charts.length > 0" />
    <VaCard outlined>
        <VaCardContent>
            <ChartsBlock :charts="charts" v-if="itemStore.view === 'charts'" />
            <TableBlock v-else />
        </VaCardContent>
    </VaCard>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, watch, watchEffect } from 'vue'
import { InfoBlock, ModelConfig } from '../../data/types'
import chartsConfig from '../../../configs/charts.json'
import { useRoute } from 'vue-router'
import { useItemStore } from '../../stores/items-store'
import ChartsBlock from '../../components/blocks/ChartsBlock.vue'
import FiltersBlock from '../../components/blocks/FiltersBlock.vue'
import TableBlock from '../../components/blocks/TableBlock.vue'

const props = defineProps<{
    config?: ModelConfig,
    model?: keyof typeof chartsConfig
}>()

const { locale } = useI18n()
const route = useRoute()
const itemStore = useItemStore()

watchEffect(() => {
    const path = route.fullPath

    const conditions = {
        parentTaxon: path.includes('taxonomy') || path.includes('countries'),
        country: path.includes('countries')
    }

    Object.keys(conditions).forEach(key => {
        const field = key as keyof typeof conditions
        if (!conditions[field]) {
            itemStore[field] = ""
        }
    })
})

const currentModel = computed(() => {
    return props.model || route.name as keyof typeof chartsConfig
})

const charts = computed(() => chartsConfig[currentModel.value] ? chartsConfig[currentModel.value] as InfoBlock[] : [])

watch(() => currentModel.value, async () => {
    itemStore.currentModel = currentModel.value
    await itemStore.fetchItems()
}, { immediate: true })



</script>
