<template>
    <Slider :min="Math.log(min)" :max="Math.log(max)" :step="0.1" v-model="value" range class="w-full" />
    <!-- Display Range Values with Units -->
    <div class="flex justify-between text-sm mt-2">
        <span>{{ roundNumber(expNumber(value[1])) }}</span>
        <span>{{ roundNumber(expNumber(value[0])) }}</span>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ConfigFilter, DataModels } from '../../data/types';
import { useDebounce } from '../../composable/useDebounce';
import StatisticsService from '../../services/StatisticsService';

const props = defineProps<{
    model: DataModels,
    filter: ConfigFilter
}>()

const emits = defineEmits(['valueChange'])

const value = computed({
    get() {
        const [v1, v2] = props.filter.value?.length === 2 ? props.filter.value : [max.value, min.value]
        const minValue = v2 < min.value ? min.value : v2
        const maxValue = v1 > max.value ? max.value : v1

        return [logNumber(maxValue), logNumber(minValue)]
    },
    set(v: any) {
        const [max, min] = v
        emitDebouncedValue([roundNumber(expNumber(max)), roundNumber(expNumber(min))])
    }
})

const roundNumber = (n: number) => Math.round(n)
const logNumber = (n: number) => Math.log(n)
const expNumber = (n: number) => Math.exp(n)

// Emit value with debounce
const emitDebouncedValue = useDebounce((value: any) => {
    emits('valueChange', value);
}, 300); // Debounce delay of 300ms

const min = ref<number>(0)
const max = ref<number>(10000000000)

async function getFreqs() {
    const { data } = await StatisticsService.getModelFieldStats(props.model, props.filter.key, {})
    const n = Object.keys(data).filter(f => f !== 'No Value').map((k: string) => Number(k))
    min.value = Math.min(...n);
    max.value = Math.max(...n);
}

onMounted(async () => await getFreqs())


</script>