<template>

    <div>
        <VaChip style="margin: 3px;" v-for="({ key, count }) in modelList" :key="key"
            :to="{ name: 'model', params: { model: key } }" size="small" :outline="key !== modelParam">{{ key }}
            <span class="va-text-bold" style="margin-left: 3px;">
                {{ count }}
            </span>
        </VaChip>
    </div>

</template>
<script setup lang="ts">
import { computed, inject, watchEffect } from 'vue';
import { useStatsStore } from '../stores/stats-store';
import { useRoute } from 'vue-router';
import { AppConfig } from '../data/types';

const route = useRoute()
const appConfig = inject('appConfig') as AppConfig

const implementedModels = computed(() => Object.keys(appConfig.models))

const modelParam = computed(() => route.params.model)

const statsStore = useStatsStore()
const props = defineProps<{
    taxid: string
}>()


const modelList = computed(() => statsStore.currentStats.filter(({ key, count }) => count > 0 && implementedModels.value.includes(key)))


watchEffect(async () => {
    await statsStore.getTaxonStats(props.taxid)
})


</script>