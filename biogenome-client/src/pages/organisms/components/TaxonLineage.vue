<template>
    <va-card>
        <va-card-title>
            {{ t('organismDetails.lineage') }}
        </va-card-title>
        <va-divider />
        <div style="max-height: 400px;overflow: scroll;">
            <va-tree-view expand-all :nodes="[tree]" text-by="name" value-by="taxid" track-by="taxid">
                <template #content="node">
                    <div class="flex items-center">
                        <div class="mr-2">
                            <b class="display-6">
                                <router-link style="color: inherit;"
                                    :to="node.leaves ? { name: 'taxon', params: { taxid: node.taxid } } : { name: 'organism', params: { taxid: node.taxid } }">{{
                                        node.name }}
                                </router-link>
                            </b>
                            <p class="va-text-secondary mb-0">
                                {{ node.rank }}
                            </p>
                        </div>
                    </div>
                </template>
            </va-tree-view>
        </div>
    </va-card>
</template>
<script setup lang="ts">
import { TaxonNode } from '../../../data/types';
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