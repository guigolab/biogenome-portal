<template>
    <Select placeholder="Select a value" :input-id="filter.key" class="w-full" v-model="selectedOption" option-label="label" option-value="value"
        :options="options" />
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { ConfigFilter } from '../../data/types';


const props = defineProps<{
    filter: ConfigFilter
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

const options = [
    { label: 'Field Exists', value: true },
    { label: 'Field Does Not Exist', value: false },
    { label: 'Include All', value: null },
]


</script>