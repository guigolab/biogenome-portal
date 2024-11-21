<template>
    <VaSelect clearable :label="label" v-model="model" :options="keys">
        <template #option="{ option, selectOption }">
            <div class="row option align-center justify-space-between" @click="selectOption(option)">
                <div class="flex">
                    <p>{{ option }}</p>
                </div>
                <div class="flex">
                    <VaChip size="small">
                        {{ options[option as string] }}
                    </VaChip>
                </div>
            </div>
        </template>
        <template #content>
            <VaIcon class="mr-2" v-if="icon" :name="icon" :color="color" />
            {{ value }}
        </template>
        <template #prepenInner>
            <VaIcon v-if="icon" :name="icon" :color="color" />
        </template>
    </VaSelect>
</template>
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    label?: string,
    value: string,
    options: Record<string, number>
    icon?: string
    color?: string
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