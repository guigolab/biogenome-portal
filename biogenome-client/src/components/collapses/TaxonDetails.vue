<template>
    <VaCollapse v-model="show" :header="name">
        <VaCard>
            <VaCardTitle>
                Summary:
            </VaCardTitle>
            <VaCardContent>
                <TaxonSummary :name="name" :rank="rank" />
            </VaCardContent>
            <VaCardTitle>
                Lineage:
            </VaCardTitle>
            <VaCardContent>
                <Breadcrumbs :taxid="taxid" />
            </VaCardContent>
        </VaCard>
    </VaCollapse>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import TaxonSummary from '../blocks/TaxonSummary.vue';
import Breadcrumbs from '../breadcrumbs/Breadcrumbs.vue';

const props = defineProps<{
    name: string,
    rank: string,
    taxid: string
}>()

const show = ref(true)

</script>