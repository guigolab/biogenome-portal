<template>
    <VaDateInput style="width: 100%" v-model="model" clearable :format-date="formatDate" mode="range" type="month"
        prevent-overflow :allowed-years="allowedDate" :allowed-months="allowedDate" :allowed-days="allowedDate">
    </VaDateInput>
</template>
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    value: { start: DateType, end: DateType }
}>()

type DateType = Date | string | null

const model = computed({
    get() {

        return props.value
    },
    set(value: { start: DateType, end: DateType }) {

        emits('valueChange', value)
    }
})

const formatDate = (date: Date) => date.toISOString().substring(0, 10);
const allowedDate = (date: Date) => date <= new Date();

const emits = defineEmits(['valueChange'])

// // Helper function to format date values
// function formatDate(date: Date | undefined) {
//     return date ? date.toISOString().split('T')[0] : null;
// }

</script>
