<template>
    <div v-if="config">
        <div class="row align-end justify-space-between">
            <div class="flex">
                <h1 v-if="config.title" class="va-h1">{{ config.title[locale] }}</h1>
                <p v-if="config.description" style="margin-bottom: 6px" class="va-text-secondary">{{
        config.description[locale] }}</p>
            </div>
            <div v-if="isGoaTActive" class="flex">
                <VaButton @click="downloadGoatReport" :round="false" color="info" style="float: right">{{
        t('buttons.goat_report') }}</VaButton>
            </div>
        </div>
    </div>
    <FiltersBlock :hasCharts="!!charts.length" />
    <ChartsBlock :charts="charts" v-if="itemStore.view === 'charts'" />
    <TableBlock v-else />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { InfoBlock, ModelConfig } from '../../data/types'
import general from '../../../configs/general.json'
import chartsConfig from '../../../configs/charts.json'

import GoaTService from '../../services/clients/GoaTService'
import { useItemStore } from '../../stores/items-store'
import ChartsBlock from '../../components/blocks/ChartsBlock.vue'
import FiltersBlock from '../../components/blocks/FiltersBlock.vue'
import TableBlock from '../../components/blocks/TableBlock.vue'

const props = defineProps<{
    config?: ModelConfig,
    model?: keyof typeof chartsConfig
}>()

const { t, locale } = useI18n()
const router = useRouter()
const itemStore = useItemStore()

const currentModel = computed(() => {
    return props.model || router.currentRoute.value.name as keyof typeof chartsConfig
})

const charts = computed(() => chartsConfig[currentModel.value] as InfoBlock[])

const isGoaTActive = computed(() => {
    return currentModel.value === 'status' && general.goat
})


watchEffect(async () => {
    itemStore.currentModel = currentModel.value
    await itemStore.fetchItems()
})


async function downloadGoatReport() {
    const response = await GoaTService.getGoatReport()
    const data = response.data
    const href = URL.createObjectURL(data);

    const filename = response.headers['content-disposition']
    const match = filename.match(/filename=([^;]+)/);
    let name = ''
    if (match && match[1]) {
        name = match[1];
    } else {
        name = 'file.tsv'
        console.log("Filename not found in the string.");
    }
    // create "a" HTML element with href to file & click
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('download', name); //or any other extension
    document.body.appendChild(link);
    link.click();

    // clean up "a" element & remove ObjectURL
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
}

</script>
