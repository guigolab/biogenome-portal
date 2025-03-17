<template>
    <div class="row align-center justify-space-between">
        <div class="flex">
            <h2 class="va-h2">{{ t('targetRanks.title') }}</h2>
            <p class="va-text-secondary"> {{ t('targetRanks.description') }} </p>
        </div>
    </div>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12 va-text-capitalize">
            <VaTabs v-model="currentTab" @update:model-value="handleRankSelection" vertical grow color="textPrimary">
                <template #tabs>
                    <VaTab v-for="tab in mappedRanks" :key="tab.rank" :name="tab.rank">
                        {{ tab.rank }}
                        <span style="margin-left: 3px;">
                            ({{ tab.value }})
                        </span>
                    </VaTab>
                </template>
                <VaCard>
                    <VaInnerLoading :loading="loading">
                        <VaCardContent>
                            <h3 class="va-h4">{{ currentTab }}</h3>
                        </VaCardContent>
                        <VaCardContent>
                            <VaDataTable height="400px" hoverable clickable @row:click="handleClick" sticky-header
                                :columns="['name', 'leaves']" :items="taxons">
                                <template #header(leaves)>
                                    {{ t('models.organisms') }}
                                </template>
                            </VaDataTable>
                        </VaCardContent>
                        <VaCardContent>
                            <div class="row justify-center">
                                <div class="flex">
                                    <VaPagination color="textPrimary" v-model="offset" :page-size="pagination.limit"
                                        :total="total" :visible-pages="3" buttons-preset="primary" rounded gapped
                                        @update:model-value="handlePagination" />
                                </div>
                            </div>
                        </VaCardContent>
                    </VaInnerLoading>
                </VaCard>
            </VaTabs>
        </div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import StatisticsService from '../services/StatisticsService';
import { TaxonNode } from '../data/types';
import TaxonService from '../services/TaxonService';
import { useI18n } from 'vue-i18n';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { useToast } from 'vuestic-ui/web-components';

const { t } = useI18n()
const taxonomyStore = useTaxonomyStore()
const { init } = useToast()
// Define the type for your taxonomic rank legend
type TaxonomicRank = {
    rank: string;
    color: string;
};
const initPagination = {
    offset: 0,
    limit: 10,
}
const pagination = ref({ ...initPagination })
const offset = ref(1 + pagination.value.offset)
const currentTab = ref()
const loading = ref(false)
const taxonomicRanks: TaxonomicRank[] = [
    { rank: "superkingdom", color: "#E57373" },         // Light Red
    { rank: "kingdom", color: "#F06292" },        // Pink
    { rank: "phylum", color: "#BA68C8" },         // Purple
    { rank: "subphylum", color: "#9575CD" },      // Light Purple
    { rank: "class", color: "#7986CB" },          // Light Blue
    { rank: "subclass", color: "#64B5F6" },       // Sky Blue
    { rank: "order", color: "#4FC3F7" },          // Cyan
    { rank: "superorder", color: "#4DD0E1" },     // Light Cyan
    { rank: "family", color: "#4DB6AC" },         // Teal
    { rank: "genus", color: "#81C784" },          // Green
    { rank: "species", color: "#AED581" },        // Light Green
    { rank: "subspecies", color: "#455A64" },           // Amber
];

const taxons = ref<TaxonNode[]>([])
const total = ref(0)
const mappedRanks = ref<Record<string, any>[]>([])

async function fetchRanks() {
    const { data } = await StatisticsService.getModelFieldStats('taxons', 'rank', {})
    const keys = Object.keys(data)
    mappedRanks.value = taxonomicRanks.filter(({ rank }) => keys.includes(rank)).map(({ rank }) => {
        return { rank, value: data[rank] }
    })
    currentTab.value = mappedRanks.value[0].rank
    await fetchTaxons()
}

async function handleRankSelection() {
    pagination.value = {
        ...initPagination
    }
    offset.value = 1 + pagination.value.offset
    await fetchTaxons()
}

async function fetchTaxons() {
    const { data } = await TaxonService.getTaxons({ rank: currentTab.value, sort_column: 'leaves', ...pagination.value })
    taxons.value = [...data.data]
    total.value = data.total
}

async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    await fetchTaxons()
}

onMounted(async () => {
    try {
        loading.value = true
        await fetchRanks()
    } catch (err) {
        init({ message: 'Error fetching data, check the console..', color: 'danger' })
        console.error(err)
    } finally {
        loading.value = false
    }
})

function handleClick(event: any) {
    taxonomyStore.currentTaxon = { ...event.item }
    taxonomyStore.showSidebar = true
}

</script>