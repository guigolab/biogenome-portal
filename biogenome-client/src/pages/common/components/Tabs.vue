<template>
    <VaTabs v-model="tab">
        <template #tabs>
            <VaTab v-for="tab in tabs" :label="t(tab.label)" :name="tab.name"></VaTab>
        </template>
    </VaTabs>
    <VaDivider style="margin-top: 0;" />
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
    tabs: { label: string, name: string }[]
}>()

const tab = ref(props.tabs[0])

const emits = defineEmits(['updateView'])


watchEffect(() => {
    emits("updateView", tab.value)
})

</script>