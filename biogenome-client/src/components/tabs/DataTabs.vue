<template>
    <VaNavbar class="secondary-nav">
        <VaSidebarItem active-color="secondary" :active="isRouteActive({ name: 'taxon' })"
            :to="{ name: 'taxon', params: { taxid: param } }">
            <VaSidebarItemContent style="place-content: center;position: relative;">
                <span>Overview</span>
            </VaSidebarItemContent>
        </VaSidebarItem>
        <VaSidebarItem v-if="statsStore.isLoading" v-for="p in pages" :key="p">
            <VaSidebarItemContent style="padding: 0!important;">
                <VaSkeleton height="3.625rem" />
            </VaSidebarItemContent>
        </VaSidebarItem>
        <VaSidebarItem v-else v-for="item in items" :key="item.name" active-color="secondary"
            :active="isRouteActive(item)" :to="{ name: item.name }">
            <VaSidebarItemContent style="place-content: center;position: relative;">
                <span>{{ t(item.displayName) }}</span>
                <span class="custom-chip">{{ item.count }}</span>
            </VaSidebarItemContent>
        </VaSidebarItem>
        <VaSidebarItem v-if="coordCount" active-color="secondary" :active="isRouteActive({ name: 'map' })"
            :to="{ name: 'map' }">
            <VaSidebarItemContent style="place-content: center;position: relative;">
                <span>GeoLocations</span>
                <span class="custom-chip">{{ coordCount }}</span>
            </VaSidebarItemContent>
        </VaSidebarItem>
    </VaNavbar>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import pagesC from '../../../configs/pages.json'
import { useStatsStore } from '../../stores/stats-store'
import { useItemStore } from '../../stores/items-store'

const itemStore = useItemStore()

const { t } = useI18n()
const route = useRoute()
const statsStore = useStatsStore()
const pages = computed(() => Object.keys(pagesC))

const coordsIndex = computed(() => statsStore.currentStats.findIndex(c => c.key === 'coordinates'))
const coordCount = computed(() => coordsIndex.value === -1 || statsStore.currentStats[coordsIndex.value].count === 0 ? 0 : statsStore.currentStats[coordsIndex.value].count)


const parentTaxon = computed(() => itemStore.parentTaxon)
const param = computed(() => parentTaxon.value ? parentTaxon.value.taxid : 'root')

const items = computed(() => {
    const stats = statsStore.currentStats
        .filter(({ key, count }) => pages.value.includes(key) && count > 0)
        .map(({ key, count }) => ({
            name: key,
            displayName: `routes.${key}`,
            count
        }))
        .sort((a, b) => pages.value.indexOf(a.name) - pages.value.indexOf(b.name))

    // if the taxon has no leaves treat it as an organism
    if (parentTaxon.value && parentTaxon.value.leaves === 0) return stats.filter(({ name }) => name !== 'organisms')
    return stats
}
)

function isRouteActive(item: { name: string }) {
    return item.name === route.name || route.meta.name === item.name
}


</script>

<style scoped>
.count {
    position: absolute;
    bottom: 0;
    border: 1px solid var(--va-secondary);
    border-radius: 1rem;
}

.secondary-nav {
    display: flex !important;
    overflow-x: auto;
    width: 100%;
    white-space: nowrap;
    padding: 0 !important;
    /* Optional: adds some space around the scrollable area */
}

/* .nav-items {
    display: flex;
    gap: 8px;
} */

/* Transition styles */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(10px);
}
</style>