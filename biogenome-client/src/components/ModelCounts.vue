<template>
    <div class="row justify-center">
        <div v-for="({count, icon, color, key}) in mappedCounts" class="flex">
            <VaCard>
                <VaCardContent>
                    <div class="row justify-space-between align-center">
                        <div class="flex">
                            <Counter :duration="2000" :target-value="count" />
                            <p> {{ key }}
                            </p>
                        </div>
                        <div class="flex">
                            <VaIcon :color="color" :name="icon" size="large"></VaIcon>
                        </div>
                    </div>
                </VaCardContent>
            </VaCard>
        </div>
    </div>
</template>
<script setup lang="ts">
import { Stat } from '../data/types';
import { iconMap } from '../composable/useIconMap';
import { computed } from 'vue';
import Counter from './Counter.vue';
const props = defineProps<{
    counts: Stat[]
}>()

const mappedCounts = computed(() => props.counts.map(({ key, count }) => {
    const { icon, color } = iconMap[key]
    return { key, count, icon, color }
}).filter(({count}) => count > 0))

</script>