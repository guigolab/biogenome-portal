<template>
    <VaSkeleton tag="h2" variant="text" class="va-h2" v-if="isLoading"></VaSkeleton>
    <h2 v-else-if="taxon" class="va-h2"> {{ taxon.name }}
    </h2>
</template>
<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n'
import { TreeNode } from '../../../data/types';
import TaxonService from '../../../services/clients/TaxonService';
import { useTaxonomyStore } from '../../../stores/taxonomy-store'
import { AxiosError } from 'axios';
import { useToast } from 'vuestic-ui/web-components';
const { t } = useI18n()

const props = defineProps<{
    taxid: string
}>()
const isLoading = ref(false)
const { init } = useToast()
const taxonomyStore = useTaxonomyStore()
const taxon = ref<TreeNode>()

watchEffect(async () => {
    await getTaxon(props.taxid)

})
async function getTaxon(taxid: string) {
    try {
        isLoading.value = true
        const { data } = await TaxonService.getTaxon(taxid)
        taxon.value = { ...data }
        taxonomyStore.currentTaxon = { ...data }
        taxonomyStore.taxidQuery = taxid
    } catch (error) {
        const axiosError = error as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    } finally {
        isLoading.value = false
    }
}

</script>