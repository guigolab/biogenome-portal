<template>
    <VaSwitch size="small" v-model="model" :label= "'Has '+ label"></VaSwitch>
</template>
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    label: string,
    value: boolean | null
}>()

const emits = defineEmits(['valueChange'])

const model = computed({
    get() {
        return props.value
    },
    set(value: boolean | null) {
        emits('valueChange', value)
    }
})



</script>