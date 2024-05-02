<template>
    <div :key="currentModel">
        <h1 v-if="config.title" class="va-h1">{{ config.title[locale] }}</h1>
        <p v-if="config.description" style="margin-bottom: 6px" class="va-text-secondary">{{
        config.description[locale] }}</p>
        <VaButton @click="downloadGoatReport" v-if="currentModel === 'status' && goat" :round="false" color="success"
            style="float: right">{{
        t('buttons.goat_report') }}</VaButton>
        <VaTabs :key="currentModel" v-model="tab">
            <template #tabs>
                <VaTab :label="t('tabs.table')" name="table" />
                <VaTab v-if="config.charts && config.charts.length" name="stats" :label="t('tabs.charts')" />
            </template>
        </VaTabs>
        <VaDivider style="margin-top: 0;" />
        <ChartsBlock v-if="tab === 'stats'" :charts="(config.charts as InfoBlock[])" />
        <ItemsBlock v-else :model="currentModel" :columns="config.columns" :filters="config.filters" />
    </div>
</template>

<script setup lang="ts">
import ChartsBlock from '../../components/common/ChartsBlock.vue'
import { useI18n } from 'vue-i18n'
import { computed, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { InfoBlock, ModelConfig } from '../../data/types'
import ItemsBlock from './components/ItemsBlock.vue'
import { goat } from '../../../config.json'
import GoaTService from '../../services/clients/GoaTService'

const { t, locale } = useI18n()

const tab = ref('table')
const router = useRouter()

const currentModel = computed(() => {
    return router.currentRoute.value.name as string
})

watch(() => props.config, () => {
    if (!props.config.charts || !props.config.charts.length) tab.value = 'table'
})

const props = defineProps<{
    config: ModelConfig
}>()


async function downloadGoatReport() {
    const response = await GoaTService.getGoatReport()
    const data = response.data
    const href = URL.createObjectURL(data);

    const filename = response.headers['content-disposition']
    const match = filename.match(/filename=([^;]+)/);
    let name = ''
    if (match && match[1]) {
        name = match[1];
        console.log(name); // Output: PRJEB43510_species_goat.tsv
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

<style lang="scss">
.chart {
    height: 400px;
}

.row-equal .flex {
    .va-card {
        height: 100%;
    }
}
</style>