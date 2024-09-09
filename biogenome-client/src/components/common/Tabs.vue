<template>
    <VaTabs :key="tabsKey" v-model="currentTab" @update:modelValue="(v: string) => $emit('updateView', v)">
        <template #tabs>
            <VaTab v-for="(tabItem, idx) in tabs" :key="`${tabItem.name}-${idx}-${tabs.length}`"
                :label="t(tabItem.label)" :name="tabItem.name">
            </VaTab>
        </template>
    </VaTabs>
    <VaDivider style="margin-top: 0;" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
    tabs: { label: string, name: string }[];
    tab: string;
}>();

const emits = defineEmits(['updateView']);

const currentTab = ref(props.tab);
const tabsKey = ref(0);  // A key to force re-rendering

// Watch for changes in the tabs prop and update the key to force re-rendering
watch(
    () => props.tabs,
    (newTabs) => {
        console.log(newTabs)
        console.log(currentTab.value)
        if (!newTabs.some(tab => tab.name === currentTab.value)) {
            currentTab.value = newTabs[0]?.name ?? '';
            tabsKey.value++;  // Change the key to force re-render

            emits('updateView', currentTab.value)
        } else {
            emits('updateView', 'wiki')
        }
    },
    { immediate: true }
);

</script>
