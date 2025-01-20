<template>
    <VaSelect  inner-label :loading="isLoading" @open="fetchOptions" clearable :label="label" v-model="model" :options="optionsKeys">
        <template #option="{ option, selectOption }">
            <div class="row option align-center justify-space-between" @click="selectOption(option)">
                <div class="flex">
                    <p>{{ option }}</p>
                </div>
                <div v-if="options" class="flex">
                    <VaChip size="small">
                        {{ options[option as string] }}
                    </VaChip>
                </div>
            </div>
        </template>
        <template #content>
            {{ value }}
        </template>
    </VaSelect>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useItemStore } from '../../stores/items-store';
import { DataModels } from '../../data/types';

const itemStore = useItemStore()

const props = defineProps<{
    label?: string,
    field: string,
    model: DataModels,
    value: string | null,
}>()

const isLoading = ref(false)
const model = computed({
    get() {
        return props.value
    },
    set(value: string) {
        emits('valueChange', value)
    }
})

const options = ref<Record<string, number> | null>(null)

const optionsKeys = computed(() => Object.keys(options.value ?? {}))

async function fetchOptions() {
    isLoading.value = true
    const opts = await itemStore.getFieldFrequencies(props.model, props.field, false)
    options.value = { ...opts }
    isLoading.value = false
}
const emits = defineEmits(['valueChange'])

</script>
<style scoped>
.option {
    cursor: pointer;
    padding: 5px;
}

.option:hover {
    background-color: #dee5f2;
    /* Background color on hover */
}
</style>