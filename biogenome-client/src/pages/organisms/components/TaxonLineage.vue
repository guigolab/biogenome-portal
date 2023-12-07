<template>
    <va-card>
        <va-card-title>
            {{ t('organismDetails.lineage') }}
        </va-card-title>
        <va-card-content>
            Click on a node to see the taxonomic details
        </va-card-content>
        <va-card-content v-if="tree" class="chart" style="overflow: scroll;">
            <IndentedTree :data="tree"/>
        </va-card-content>
    </va-card>
</template>
<script setup lang="ts">
import { TaxonNode } from '../../../data/types';
import IndentedTree from '../../../components/tree/IndentedTree.vue'
import OrganismService from '../../../services/clients/OrganismService';
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
    taxid: string
}>()
const tree = ref<TaxonNode>()
const { data } = await OrganismService.getOrganismLineage(props.taxid)
tree.value = { ...data }

</script>