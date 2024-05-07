<template>
    <h2 class="va-h2"> {{ taxon.name }}
    </h2>
    <p style="margin-bottom: 10px;" class="va-text-secondary">{{ taxon.rank }}</p>
    <!-- <div class="row">
        <div class="flex">
            <va-inner-loading :loading="loadIndentedTree">
                <va-button @click="loadTree('indented')">{{ t('taxonDetails.indented')
                    }}</va-button>
            </va-inner-loading>
        </div>
        <div class="flex">
            <va-inner-loading :loading="loadRadialTree">
                <va-button @click="loadTree('radial')" :disabled="Number(taxon.leaves) >= 250">{{
        t('taxonDetails.radial') }}</va-button>
            </va-inner-loading>
        </div>
    </div> -->
    <va-modal fullscreen v-model="showModal">
        <TreeOfLife v-if="treeType === 'radial'" :data="treeData" />
        <IndentedTree v-else :data="treeData" />
    </va-modal>

</template>
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n'
import { TaxonNode, TreeNode } from '../../../data/types';
import TaxonService from '../../../services/clients/TaxonService';
import TreeOfLife from '../../../components/tree/TreeOfLife.vue'
import IndentedTree from '../../../components/tree/IndentedTree.vue'

const { t } = useI18n()
const treeType = ref('')
const loadIndentedTree = ref(false)
const loadRadialTree = ref(false)
const showModal = ref(false)
let treeData: TaxonNode
const props = defineProps<{
    taxon: TreeNode
}>()


async function loadTree(type: 'indented' | 'radial') {
    treeType.value = type
    try {
        if (type === 'indented') {
            loadIndentedTree.value = true
        } else {
            loadRadialTree.value = true
        }
        const { data } = await TaxonService.getTree(props.taxon.taxid)
        treeData = {...data}
    } catch (e) {
        console.log(e)
    } finally {
        loadIndentedTree.value = false
        loadRadialTree.value = false
        showModal.value = true
    }
}

</script>