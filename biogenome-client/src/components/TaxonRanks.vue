<template>
  <div class="rank-bar-row">
    <div class="rank-desc-bold">{{ t('taxon.ranksDistribution') }}</div>
    <div class="rank-hierarchy">
      <TransitionGroup name="slide-x-group" tag="div" class="rank-chips-group">
        <div class="rank-chip-wrapper" v-for="(r, idx) in mappedRanks" :key="r.rank">
          <VaDropdown stick-to-edges>
            <template #anchor>
              <VaChip
                @click="handleRankSelection(r.rank)"
                color="backgroundElement"
              >
                {{ r.rank }} <span class="va-text-bold ml-2">{{ r.value }}</span>
              </VaChip>
              <div v-if="idx < mappedRanks.length - 1" class="rank-connector">
                <svg width="40" height="8"><line x1="0" y1="4" x2="40" y2="4" stroke="#ccc" stroke-width="2" /></svg>
              </div>
            </template>
            <VaCard style="width: 300px;">
              <VaCardContent >
                <div class="row justify-space-between align-center">
                  <div class="flex">
                    <h3 class="va-h5">{{ r.rank }}</h3>
                  </div>
                  <div class="flex">
                    <VaChip color="backgroundPrimary">{{ r.value }}</VaChip>
                  </div>
                </div>
              </VaCardContent>
              <VaDivider style="margin: 0;" />
              <VaCardContent>
                <div class="taxon-list-scroller">
                  <VaInfiniteScroll
                    v-if="taxons.length"
                    :disabled="allLoaded || isFetchingMore"
                    :load="fetchMoreTaxons"
                    @onLoad="fetchMoreTaxons"
                    :offset="100"
                  >
                    <template #default>
                      <div v-for="item in taxons" :key="item.taxid" class="taxon-list-item" @click="handleClick({ item })">
                        <span class="taxon-name">{{ item.name }}</span>
                        <VaChip color="backgroundPrimary">{{ item.leaves }}</VaChip>
                      </div>
                      <div v-if="isFetchingMore" class="infinite-loading-indicator">
                        <VaInnerLoading :loading="true" />
                      </div>
                    </template>
                  </VaInfiniteScroll>
                  <div v-else class="no-items">{{ t('noData') }}</div>
                </div>
              </VaCardContent>
            </VaCard>
          </VaDropdown>
        </div>
      </TransitionGroup>
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
    limit:10,
}
const pagination = ref({ ...initPagination })
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
const isFetchingMore = ref(false)
const allLoaded = ref(false)

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
    pagination.value = { ...initPagination }
    taxons.value = []
    allLoaded.value = false
    await fetchTaxons()
    setTimeout(() => {
        const scroller = document.querySelector('.taxon-list-scroller')
        if (scroller) scroller.scrollTop = 0
    }, 0)
}

async function fetchTaxons() {
    loading.value = true
    try {
        const { data } = await TaxonService.getTaxons({ rank: selectedRank.value, sort_column: 'leaves', ...pagination.value })
        taxons.value = [...data.data]
        total.value = data.total
        allLoaded.value = taxons.value.length >= data.total
    } finally {
        loading.value = false
    }
}

async function fetchMoreTaxons() {
    if (loading.value || isFetchingMore.value || allLoaded.value) return
    isFetchingMore.value = true
    try {
        pagination.value.offset += pagination.value.limit
        const { data } = await TaxonService.getTaxons({ rank: selectedRank.value, sort_column: 'leaves', ...pagination.value })
        taxons.value = [...taxons.value, ...data.data]
        allLoaded.value = taxons.value.length >= data.total
    } finally {
        isFetchingMore.value = false
    }
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

<style lang="scss" scoped>
.ml-2 {
    margin-left: 0.5rem;
}
.rank-bar-row {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
}
.rank-desc-bold {
    font-weight: bold;
    font-size: 1rem;
    white-space: nowrap;
    flex-shrink: 0;
    padding-left: 0.5rem;
}
.rank-hierarchy {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    flex-wrap: nowrap;
    overflow-x: auto;
    white-space: nowrap;
    padding: 0.5rem;
    scrollbar-width: thin;
    scrollbar-color: var(--va-background-primary) transparent;
    width: 100%;
}
.rank-hierarchy::-webkit-scrollbar {
    height: 6px;
    background: transparent;
}
.rank-hierarchy::-webkit-scrollbar-thumb {
    background: var(--va-background-primary);
    border-radius: 4px;
}
.rank-chip-wrapper {
    display: flex;
    align-items: center;
}
.rank-chip {
    font-size: 1rem;
    transition: box-shadow 0.2s, background 0.2s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    &.selected {
        box-shadow: 0 0 0 2px var(--va-primary);
        background: var(--va-background-element);
    }
}
.rank-connector {
    display: flex;
    align-items: center;
    margin: 0 0.25rem;
}
.taxon-list-scroller {
    max-height: 250px;
    min-height: 120px;
    overflow-y: auto;
    position: relative;
    scrollbar-width: thin;
    -ms-overflow-style: none;
    scroll-behavior: smooth;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: var(--va-background-primary);
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--va-background-border);
        border-radius: 3px;

        &:hover {
            background: var(--va-primary);
        }
    }
}
.taxon-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0.75rem;
    margin-bottom: 0.25rem;
    background: var(--va-background-secondary);
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
    font-size: 0.97rem;
    min-height: 36px;
    &:hover {
        background: var(--va-background-element);
        color: var(--va-primary);
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        transform: translateY(-2px) scale(1.01);
    }
}
.taxon-name {
    font-weight: 500;
    font-size: 1rem;
}
.no-items {
    text-align: center;
    color: var(--va-secondary);
    margin: 2rem 0;
}
.fade-slide-enter-active, .fade-slide-leave-active {
    transition: all 0.3s cubic-bezier(.4,0,.2,1);
}
.fade-slide-enter-from {
    opacity: 0;
    transform: translateY(10px);
}
.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}
@media (max-width: 768px) {
    .rank-hierarchy {
        flex-direction: row;
        gap: 0.25rem;
        align-items: flex-start;
    }
    .rank-connector {
        transform: rotate(90deg);
        margin: 0.25rem 0;
    }
}
.infinite-loading-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.5rem 0;
}
.all-loaded-indicator {
    font-size: 0.95rem;
    color: var(--va-secondary);
}
.rank-chips-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.slide-x-group-enter-active {
    transition: all 0.5s cubic-bezier(.4,0,.2,1);
}
.slide-x-group-enter-from {
    opacity: 0;
    transform: translateX(-40px);
}
.slide-x-group-leave-active {
    transition: all 0.3s cubic-bezier(.4,0,.2,1);
    position: absolute;
}
.slide-x-group-leave-to {
    opacity: 0;
    transform: translateX(40px);
}
</style>