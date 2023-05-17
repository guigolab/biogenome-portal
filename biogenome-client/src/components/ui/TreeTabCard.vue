<template>
    <va-card  class="fill-height">
        <va-tabs v-model="treeType" grow>
            <template #tabs>
            <va-tab
                v-for="tab in types"
                :key="tab.value"
                :name="tab.value"
            >
                {{ t(tab.label) }}
            </va-tab>
            </template>
        </va-tabs>
        <va-card-content style="height: 500px;overflow: scroll;" v-if="showTree">
            <div v-if="treeType === 'radial'">
                <TreeOfLife :data="treeData"/>
            </div>
            <div v-else>
                <IndentedTree :data="treeData"/>
            </div>
        </va-card-content>
    </va-card>
</template>
<script setup lang="ts">
import TreeOfLife from '../tree/TreeOfLife.vue'
import IndentedTree from '../tree/IndentedTree.vue'
import TaxonService from '../../services/clients/TaxonService'
import { useI18n } from 'vue-i18n'
import {ref} from 'vue'

const { t } = useI18n()


const props = defineProps<{
    taxid:number
}>()

const treeData = await TaxonService.getTree(props.taxid)

const treeType = ref('radial')

const types = ref([
    {value:'radial',label:'taxonDetails.radial'},
    {value:'indented', label:'taxonDetails.indented'}
])

</script>