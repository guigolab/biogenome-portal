<template>
    <va-card-content>
        <div class="row align-center">
            <div class="flex lg6 md6">
                <va-input v-model="filter" placeholder="Filter..." clearable />
            </div>
        </div>
    </va-card-content>
    <va-divider />
    <va-tree-view track-by="taxid" text-by="name" value-by="taxid" :nodes="nodes" :filter="filter"
        :filter-method="customFilterMethod">
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
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import TaxonService from '../../../services/clients/TaxonService'

const rootNode = import.meta.env.VITE_ROOT_NODE ?
    import.meta.env.VITE_ROOT_NODE : '131567'

const filter = ref('')
const customFilterMethod = computed(() => {
    return (node: Record<string, any>, filterText: string, key: any) => {
        return node.name.includes(filterText) || node.name.toLowerCase().includes(filterText)
    }
})

const nodes = ref<Record<string, any>[]>([])

const { data } = await TaxonService.getTree(rootNode)

nodes.value = [data]

</script>