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

import { ref, watchEffect } from 'vue';
import { TaxonNode } from '../../../data/types';
import TaxonService from '../../../services/clients/TaxonService';

const props = defineProps<{
    taxid: string
}>()

const isLoading = ref(false)
const ancestors = ref<TaxonNode[]>([])

watchEffect(async () => {
    await getAncestors(props.taxid)
})

async function getAncestors(taxid: string) {
    isLoading.value = true
    try {
        const { data } = await TaxonService.getAncestors(taxid)
        ancestors.value = [...data]
    } catch (e) {
        console.log(e)
        ancestors.value = []
    } finally {
        isLoading.value = false
    }
}

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