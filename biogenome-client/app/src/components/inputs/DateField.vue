<template>
    <DatePicker @value-change="handleValue" dateFormat="yy/mm/dd"
        :maxDate="today" inline class="w-full" :id="filter.key" showButtonBar view="month" v-model="dates"
        selectionMode="range" :manualInput="false" />
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ConfigFilter } from '../../data/types';

const props = defineProps<{
    filter: ConfigFilter
}>()

const emits = defineEmits(['valueChange'])
const today = new Date();
const dates = ref()

const formatDate = (date: Date | null) => date?.toISOString().substring(0, 10)

onMounted(() => {
    if (props.filter.value && props.filter.value.length === 2) {
        const [v1, v2] = props.filter.value
        if(v1 && v2) dates.value = [new Date(v2), new Date(v1)]
    }
})

function handleValue(v: any) {
    if(v && v.length === 2) emits('valueChange', [formatDate(v[1]), formatDate(v[0])])
    else emits('valueChange', [null, null])
}   
</script>