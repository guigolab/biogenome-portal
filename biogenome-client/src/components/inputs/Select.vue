<template>
    <VaSelect preset="bordered" clearable :label="label" v-model="model" :options="keys">
        <template #option="{ option, selectOption }">
            <div class="row option align-center justify-space-between" @click="selectOption(option)">
                <div class="flex">
                    <p>{{ option }}</p>
                </div>
                <div class="flex">
                    <VaChip outline size="small">
                        {{ options[option] }}
                    </VaChip>
                </div>
            </div>
        </template>
    </VaSelect>
</template>
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    label: string,
    value: string,
    options: Record<string, number>
}>()

const keys = computed(() => {
    return Object.keys(props.options)
})

const model = computed({
    get() {
        return props.value
    },
    set(value: string) {
        emits('valueChange', value)
    }
})

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