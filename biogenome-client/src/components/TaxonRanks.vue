<template>
    <div class="row align-center justify-center">
        <div style="text-align: center;" class="flex">
            <h2 class="va-h3">{{ t('home.targetRanks.title') }}</h2>
        </div>
    </div>
    <div class="row justify-center">
        <div class="flex lg8 md12 sm12 xs12">
            <div class="row justify-center">
                <div class="flex" v-for="r in mappedRanks">
                    <VaButton @click="handleRankSelection(r.rank)" round
                        :color="selectedRank === r.rank ? 'textPrimary' : r.color">
                        {{ r.rank }} <VaChip style="margin-left: 3px;" size="small" color="backgroundPrimary">{{ r.value
                            }}
                        </VaChip>
                    </VaButton>
                </div>
            </div>
        </div>
    </div>
    <div class="row section-mb justify-center">
        <div class="flex lg8 md12 sm12 xs12">
            <VaCard v-if="selectedRank">
                <VaInnerLoading :loading="loading">
                    <VaCardContent>
                        <div class="row justify-space-between">
                            <div class="flex">
                                <div class="row align-center">
                                    <div class="flex">
                                        <h3 class="va-h5">{{ selectedRank }}</h3>

                                    </div>
                                    <div class="flex">
                                        <VaChip color="backgroundPrimary">{{ total }}</VaChip>
                                    </div>
                                </div>

                            </div>
                            <div class="flex">
                                <VaButton preset="secondary" icon="fa-close" color="secondary"
                                    @click="selectedRank = null"></VaButton>
                            </div>
                        </div>
                    </VaCardContent>
                    <VaDivider style="margin: 0;" />
                    <VaDataTable height="400px" hoverable clickable @row:click="handleClick" sticky-header
                        :columns="['name', 'leaves']" :items="taxons">
                        <template #header(leaves)>
                            organisms
                        </template>
                    </VaDataTable>
                    <div class="row justify-center">
                        <div class="flex">
                            <VaPagination color="textPrimary" v-model="offset" :page-size="pagination.limit"
                                :total="total" :visible-pages="3" buttons-preset="primary" rounded gapped
                                @update:model-value="handlePagination" />
                        </div>
                    </div>
                </VaInnerLoading>
            </VaCard>
            <VaCard v-else>
                <VaCardContent>
                    <div class="row align-center justify-center" style="min-height: 400px;">
                        <div class="flex">
                            <h3 class="va-h5"> {{ t('home.targetRanks.description') }} </h3>

                        </div>
                    </div>

                </VaCardContent>
            </VaCard>
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
import { useRouter } from 'vue-router';

const { t } = useI18n()
const taxonomyStore = useTaxonomyStore()
const { init } = useToast()
const router = useRouter()
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
const loading = ref(false)
const taxonomicRanks: TaxonomicRank[] = [
    { rank: "superkingdom", color: "#EF9A9A" },   // Soft Red
    { rank: "domain", color: "#F48FB1" },         // Light Pink
    { rank: "kingdom", color: "#CE93D8" },        // Lavender
    { rank: "phylum", color: "#B39DDB" },         // Pastel Purple
    { rank: "subphylum", color: "#9FA8DA" },      // Light Indigo
    { rank: "class", color: "#90CAF9" },          // Light Blue
    { rank: "subclass", color: "#81D4FA" },       // Sky Blue
    { rank: "order", color: "#80DEEA" },          // Pale Cyan
    { rank: "superorder", color: "#80CBC4" },     // Soft Teal
    { rank: "family", color: "#A5D6A7" },         // Light Mint Green
    { rank: "genus", color: "#C5E1A5" },          // Soft Lime
    { rank: "species", color: "#E6EE9C" },        // Yellow-Green
    { rank: "subspecies", color: "#CFD8DC" },     // Cool Gray
];

const taxons = ref<TaxonNode[]>([])
const total = ref(0)
const mappedRanks = ref<Record<string, any>[]>([])

const selectedRank = ref<string | null>(null)
async function fetchRanks() {
    const { data } = await StatisticsService.getModelFieldStats('taxons', 'rank', {})
    const dataKeys = Object.keys(data)

    const filteredEntries = taxonomicRanks.filter(({ rank }) => dataKeys.includes(rank)).map(({ rank, color }) =>
        ({ rank, color, value: data[rank] })
    )
    mappedRanks.value = [...filteredEntries]

}

async function handleRankSelection(rank: string) {

    selectedRank.value = rank
    pagination.value = {
        ...initPagination
    }
    offset.value = 1 + pagination.value.offset
    await fetchTaxons()
}

async function fetchTaxons() {
    const { data } = await TaxonService.getTaxons({ rank: selectedRank.value, sort_column: 'leaves', ...pagination.value })
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
    const { item } = event
    if (!item.leaves) {
        router.push({ name: 'item', params: { model: 'organisms', id: item.taxid } })
    } else {
        taxonomyStore.currentTaxon = { ...event.item }
        taxonomyStore.showSidebar = true
    }

}

</script>