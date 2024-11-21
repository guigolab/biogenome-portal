<template>
    <VaCollapse header="Available Views" v-model="showCollapse">
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <Select :icon="iconMap[model].icon" :color="iconMap[model].color" @value-change="setView" :value="model"
                    :options="statsObject" />
            </div>
        </div>
    </VaCollapse>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTaxonomyStore } from '../../stores/taxonomy-store';
import { useI18n } from 'vue-i18n';
import { useItemStore } from '../../stores/items-store';
import { useStatsStore } from '../../stores/stats-store';
import { DataModels } from '../../data/types';
import { useRouter } from 'vue-router';
import Select from '../inputs/Select.vue';
import { iconMap } from '../../composable/useIconMap';

const props = defineProps<{
    model: DataModels
}>()

const { t } = useI18n()
const showCollapse = ref(true)

const taxonomyStore = useTaxonomyStore()
const itemStore = useItemStore()
const statsStore = useStatsStore()
const router = useRouter()

const taxonStats = computed(() => taxonomyStore.stats)
const portalStats = computed(() => statsStore.currentStats)

const currentStats = computed(() => {
    if (itemStore.parentTaxon) return [...taxonStats.value]
    return [...portalStats.value.map(({ key, count }) => [key, count])] as [DataModels, number][]
})

const statsObject = computed(() => Object.fromEntries(currentStats.value))
const hasStats = computed(() => currentStats.value.length > 0)

watch(() => hasStats.value, async () => {
    if (!hasStats.value) await statsStore.getStats()
})


function setView(key: DataModels) {
    router.push({ name: key })
}

</script>