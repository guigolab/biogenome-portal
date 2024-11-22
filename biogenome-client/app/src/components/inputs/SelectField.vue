<template>
    <Listbox @change="fetchFreqs" v-model="selectedOption" scroll-height="150px" :options="options" option-value="name" optionLabel="name" class="w-full">
        <template #option="slotProps">
            <div class="flex items-center">
                <div>{{ slotProps.option.name }}</div>
                <Badge :value="slotProps.option.value" severity="secondary"></Badge>
            </div>
        </template>
    </Listbox>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ConfigFilter, DataModels } from '../../data/types';
import { useItemStore } from '../../stores/items-store';

const itemStore = useItemStore()


const props = defineProps<{
    filter: ConfigFilter
    model: DataModels
}>()

const emits = defineEmits(['valueChange'])

const selectedOption = computed(
    {
        get() {
            return props.filter.value
        },
        set(v: string) {
            emits('valueChange', v)
        }
    })

const options = ref<{ name: string, value: number }[]>([])

async function fetchFreqs() {
    const data = await itemStore.getFrequencies(props.model, props.filter.key)
    options.value = Object.entries(data as Record<string, number>).map(([k, v]) => ({ name: k, value: v }))
}

onMounted(async() => await fetchFreqs())
</script>