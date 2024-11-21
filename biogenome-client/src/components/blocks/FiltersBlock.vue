<template>
    <FilterBar :model="model" :hasCharts="hasCharts" />
    <!-- <FilterSidebar>
        <TaxonSearchSelect @taxon-update="updateTaxon" />
        <VaSwitch label="show tree" v-model="useTaxonomyStore().showTree"></VaSwitch>
        <Transition name="slide">
            <TaxonCard :name="parentTaxon.name" :rank="parentTaxon.rank" :taxid="parentTaxon.taxid"
                v-if="parentTaxon" />
        </Transition>
        <Tabs :tabs="tabs" :selected-tab="model" @set-tab="setView" />
        <VaDivider class="m-0" />
        <FilterForm :model="model" />
    </FilterSidebar> -->
</template>
<script setup lang="ts">
import FilterBar from '../bars/FilterBar.vue'
import FilterSidebar from '../sidebars/FilterSidebar.vue'
import { DataModels, TaxonNode } from '../../data/types'
import FilterForm from '../forms/FilterForm.vue'
import TaxonSearchSelect from '../inputs/TaxonSearchSelect.vue'
import Tabs from '../tabs/Tabs.vue'
import TaxonCard from '../cards/TaxonCard.vue'
import { useItemStore } from '../../stores/items-store'
import { computed, onMounted, ref } from 'vue'
import TaxonService from '../../services/clients/TaxonService'
import { useStatsStore } from '../../stores/stats-store'
import { iconMap } from '../../composable/useIconMap'
import { useRouter } from 'vue-router'
import { useTaxonomyStore } from '../../stores/taxonomy-store'

const props = defineProps<{
    hasCharts: boolean,
    model: DataModels,
}>()

const itemStore = useItemStore()
const parentTaxon = computed(() => itemStore.parentTaxon)
const statsStore = useStatsStore()

const router = useRouter()
const tabs = ref<{
    name: string;
    label: string;
    icon: string;
    count: number
}[]>([])


onMounted(async () => {
    if (itemStore.parentTaxon) {
        await getStats(itemStore.parentTaxon.taxid)
    } else {
        initTabs()
    }
})

function initTabs() {
    const mappedTabs = statsStore.currentStats.map(({ key, count }) => {
        const label = `tabs.${key}`
        const { icon } = iconMap[key]
        return { name: key, label, icon, count }
    })
    tabs.value = [...mappedTabs]
}

async function updateTaxon(taxon: TaxonNode | null) {
    itemStore.parentTaxon = taxon
}

function setView(v: DataModels) {
    router.push({ name: v })
}
async function getStats(taxid: string) {
    const { data } = await TaxonService.getTaxonStats(taxid)
    const mappedTabs = Object.entries(data as Record<string, number>).map(([k, v]) => {
        const label = `tabs.${k}`
        const { icon } = iconMap[k as DataModels]
        return { name: k, label, icon, count: v }
    })
    tabs.value = [...mappedTabs]
}
</script>
