<template>
    <div class="row">
        <div class="flex" v-for="({ key, count }) in modelList" :key="key">
            <VaChip :to="{ name: 'model', params: { model: key } }" :icon="iconMap[key].icon" size="small"
                :outline="key !== modelParam" color="textPrimary">{{ key }}
                <span class="va-text-bold" style="margin-left: 3px;">
                    {{ count }}
                </span>
            </VaChip>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useStatsStore } from '../stores/stats-store';
import { iconMap } from '../composable/useIconMap';
import { useRoute } from 'vue-router';

const route = useRoute()

const modelParam = computed(() => route.params.model)

const statsStore = useStatsStore()
const props = defineProps<{
    taxid: string
}>()


const modelList = computed(() => statsStore.currentStats.filter(({ count }) => count > 0))


watchEffect(async () => {
    await statsStore.getTaxonStats(props.taxid)
})


</script>