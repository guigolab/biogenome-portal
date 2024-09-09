<template>
    <div v-if="config">
        <div class="row align-end justify-space-between">
            <div class="flex">
                <h1 v-if="config.title" class="va-h1">{{ config.title[locale] }}</h1>
                <p v-if="config.description" style="margin-bottom: 6px" class="va-text-secondary">{{
        config.description[locale] }}</p>
            </div>
        </div>
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
import { computed, ref, watchEffect } from 'vue'
import { InfoBlock, ModelConfig } from '../../data/types'
import general from '../../../configs/general.json'
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

const { t, locale } = useI18n()
const route = useRoute()
const itemStore = useItemStore()
const isLoading = ref(false)

watchEffect(() => {
    const path = route.fullPath
    if (!path.includes('taxonomy')) {
        itemStore.parentTaxon = ""
    }
    if (!path.includes('countries')) {
        itemStore.country = ""
    }
})
const currentModel = computed(() => {
    return props.model || route.name as keyof typeof chartsConfig
})

const charts = computed(() => chartsConfig[currentModel.value] ? chartsConfig[currentModel.value] as InfoBlock[] : [])

const isGoaTActive = computed(() => {
    return currentModel.value === 'organisms' && general.goat
})


watchEffect(async () => {
    itemStore.currentModel = currentModel.value
    await itemStore.fetchItems()
})



</script>
