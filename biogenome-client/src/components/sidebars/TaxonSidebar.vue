<template>
  <VaSidebar width="20rem" v-model="taxonomyStore.showSidebar">
    <section class="layout fluid va-gutter-5">
      <h2 class="va-h5 m-0">Taxon Search</h2> <VaIcon name="close" @click="taxonomyStore.showSidebar = !taxonomyStore.showSidebar"> </VaIcon>
      <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <VaInput color="primary" placeholder="Search a Taxon" v-model="filter"
            @update:modelValue="debouncedUpdateSearch">
            <template #prependInner>
              <VaIcon name="search" />
            </template>
          </VaInput>
        </div>
      </div>
      <VaDivider />
      <div class="row justify-space-between">
        <div class="flex">
          Taxon List
        </div>
        <div class="flex va-text-bold">
          {{ options.length }} results
        </div>
      </div>
      <VaTreeView @update:selected="updateTaxon" :nodes="options">
        <template #icon-toggle>
          <VaIcon name="chevron_right" />
        </template>
        <template #content="node">
          <div class="flex items-center">

            <div class="mr-2">
              <b class="display-6">{{ node.label }}</b>
              <p class="va-text-secondary mb-0">
                {{ node.description }}
              </p>
            </div>
          </div>
        </template>
      </VaTreeView>
    </section>
  </VaSidebar>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useItemStore } from '../../stores/items-store'
import { TaxonNode } from '../../data/types'
import { ref } from 'vue'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import TaxonService from '../../services/clients/TaxonService';
import { TreeNode } from 'vuestic-ui/web-components'


const emits = defineEmits(['taxonUpdate'])
const options = ref<TreeNode[]>([])
const filter = ref('')


const updateTaxon = async (treeNode: TreeNode | null) => {
  let taxid = 'root'
  if (treeNode) {
    if (treeNode.id === itemStore.parentTaxon?.taxid) return
    const { id } = treeNode
    taxid = id as string
  }
  router.push({ name: 'taxon', params: { taxid } })
}

function mapNodes(nodes: TaxonNode[]) {
  return nodes.map(({ name, rank, taxid }) => (
    {
      id: taxid,
      label: name,
      description: rank,
    }
  )) as TreeNode[]
}

const getMappedTaxons = async (query: Record<string, any>) => {
  try {
    const { data } = await TaxonService.getTaxons(query)
    options.value = [...mapNodes(data.data)]
    //get children and expand node in case only one result
  } catch (error) {
    console.log(error)
  }
}

const debouncedUpdateSearch = debounce(async (filter: string) => {
  if (!filter && filter.length <= 1) return
  await getMappedTaxons({ filter })
}, 400);

function debounce(fn: any, delay: number) {
  let timeoutId: any;
  return function (...args: any) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

const taxonomyStore = useTaxonomyStore()
// Create an array of valid values
const router = useRouter()
const itemStore = useItemStore()

//default view to organisms




</script>
