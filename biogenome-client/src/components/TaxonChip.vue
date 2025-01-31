<template>
    <VaChip square @click="taxonomyStore.resetTaxon" icon="fa-close" outline color="textPrimary"> {{ t('taxon.chip') }}
        {{ strippedName }}
    </VaChip>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const taxonomyStore = useTaxonomyStore()

const strippedName = computed(() => taxonomyStore.currentTaxon && taxonomyStore.currentTaxon.name.length > 9 ?
    taxonomyStore.currentTaxon.name.slice(0, 9) + '..'
    : taxonomyStore.currentTaxon?.name)

</script>