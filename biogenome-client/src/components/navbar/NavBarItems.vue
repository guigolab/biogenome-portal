<template>
    <VaNavbar class="secondary-nav">
        <VaSidebarItem style="max-width: 4rem;" :active="isRouteActive({ name: 'taxonomy' })"
            :to="{ name: 'taxonomy' }">
            <VaSidebarItemContent style="place-content: center;position: relative;">
                <VaIcon name="fa-sitemap" />
            </VaSidebarItemContent>
        </VaSidebarItem>
        <VaSidebarItem :active="!!parentTaxon" active-color="info"
            @click="taxonomyStore.showSidebar = !taxonomyStore.showSidebar">
            <VaSidebarItemContent style="place-content: center;position: relative;">
                <VaIcon v-if="parentTaxon === null" name="fa-search" />
                <span v-else class="va-text-bold">{{ parentTaxon?.name
                    }}</span>
                <div style="position: absolute;top: 0;left: 0;" class="va-title">{{ parentTaxon ?
                    'Selected Taxon' : 'Search' }}: </div>
            </VaSidebarItemContent>
        </VaSidebarItem>
        <VaDivider vertical style="margin: 0;" />
        <VaSidebarItem v-if="statsStore.isLoading" v-for="p in pages" :key="p">
            <VaSidebarItemContent style="padding: 0!important;">
                <VaSkeleton height="3.625rem" />
            </VaSidebarItemContent>
        </VaSidebarItem>
        <VaSidebarItem v-else v-for="item in items" :key="item.name" :active="isRouteActive(item)"
            :to="{ name: item.name }">
            <VaSidebarItemContent style="place-content: center;position: relative;">
                <VaIcon :name="iconMap[item.name].icon" />
                <span v-if="!isMobile">{{ t(item.displayName) }}</span>
                <span class="custom-chip">{{ item.count }}</span>
            </VaSidebarItemContent>
        </VaSidebarItem>
    </VaNavbar>
</template>
<script setup lang="ts">
import { computed, onMounted, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import pagesC from '../../../configs/pages.json'
import { useStatsStore } from '../../stores/stats-store'
import { iconMap } from '../../composable/useIconMap'
import { useBreakpoint } from 'vuestic-ui'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { useItemStore } from '../../stores/items-store'

const itemStore = useItemStore()
const breakpoints = useBreakpoint()

const isMobile = computed(() => breakpoints.smDown)
const { t } = useI18n()
const route = useRoute()
const statsStore = useStatsStore()
const taxonomyStore = useTaxonomyStore()
const pages = computed(() => Object.keys(pagesC))

const parentTaxon = computed(() => itemStore.parentTaxon)

watchEffect(async () => {
    if (parentTaxon.value) {
        await statsStore.getTaxonStats(parentTaxon.value.taxid)
    }
})

const items = computed(() =>
    statsStore.currentStats
        .filter(({ key, count }) => pages.value.includes(key) && count > 0)
        .map(({ key, count }) => ({
            name: key,
            displayName: `routes.${key}`,
            count
        }))
        .sort((a, b) => pages.value.indexOf(a.name) - pages.value.indexOf(b.name))
)

onMounted(async () => {
    await statsStore.getPortalStats()
})

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