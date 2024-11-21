<template>
    <div class="scrollable-container">
        <div v-for="anc in ancestors" :key="anc.taxid" class="breadcrumb-item">
            <VaIcon name="chevron_right"></VaIcon>
            <VaChip class="p-0" size="small" :color="anc.taxid !== taxid ? 'secondary' : 'primary'" square>
                {{ anc.name }}
            </VaChip>
        </div>
    </div>

</template>
<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useTaxonomyStore } from '../../stores/taxonomy-store';

const props = defineProps<{
    taxid: string
}>()

const taxonomyStore = useTaxonomyStore()
const ancestors = computed(() => taxonomyStore.ancestors)

watchEffect(async () => {
    await taxonomyStore.getAncestors(props.taxid)
})

</script>
<style scoped>
.scrollable-container {
    display: flex;
    overflow-x: auto;
    width: 100%;
    white-space: nowrap;
    padding: 5px 0;
    /* Optional: adds some space around the scrollable area */
}

.breadcrumb-item {
    display: inline-flex;
    align-items: center;
    margin-right: 8px;
    /* Optional: spacing between items */
}
</style>