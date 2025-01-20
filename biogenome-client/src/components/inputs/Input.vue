<template>
    <VaInput inner-label clearable :label="label" v-model="model">
    </VaInput>
</template>
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    label: string,
    value: string,
}>()

const model = computed({
    get() {
        return props.value
    },
    set(value: string) {
        debounce(emits('valueChange', value), 200)
    }
})

const emits = defineEmits(['valueChange'])

function debounce(fn: any, delay: number) {
    let timeoutId: any;
    return function (...args: any) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

</script>