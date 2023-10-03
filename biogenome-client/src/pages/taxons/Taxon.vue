<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'taxons' }" :label="t('taxonDetails.breadcrumb')" />
    <va-breadcrumbs-item active :label="taxid" />
  </va-breadcrumbs>
  <va-divider />
  <va-skeleton v-if="isLoading" height="90vh" />
  <div style="height: 90vh;" v-else-if="errorMessage">
    <va-card stripe stripe-color="danger">
      <va-card-content>
        {{ errorMessage }}
      </va-card-content>
    </va-card>
  </div>
  <div v-else>
    <DetailsHeader v-if="details" :details="details" />
    <div class="row">
      <div class="flex">
        <va-inner-loading :loading="loadIndentedTree">
          <va-button size="small" @click="loadTree('indented')">{{ t('taxonDetails.indented') }}</va-button>
        </va-inner-loading>
      </div>
      <div class="flex">
        <va-inner-loading :loading="loadRadialTree">
          <va-button size="small" @click="loadTree('radial')" :disabled="Number(taxon.leaves) >= 250">{{
            t('taxonDetails.radial') }}</va-button>
        </va-inner-loading>
      </div>
    </div>
    <div class="row">
      <div class="flex lg12 md12 sm12 xs12">
        <SideBar :name="taxon.name" :taxid="taxid" />
      </div>
    </div>
    <va-modal fullscreen v-model="showModal">
      <TreeOfLife v-if="treeType === 'radial'" :data="treeData" />
      <IndentedTree v-else :data="treeData" />
    </va-modal>
  </div>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import TaxonService from '../../services/clients/TaxonService'
import { useI18n } from 'vue-i18n'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
import { Details, TaxonNode } from '../../data/types'
import SideBar from '../taxonomy/components/SideBar.vue'
import TreeOfLife from '../../components/tree/TreeOfLife.vue'
import IndentedTree from '../../components/tree/IndentedTree.vue'
const { t } = useI18n()
const showModal = ref(false)
const details = ref<
  Details | any
>()

const props = defineProps<{
  taxid: string
}>()
const taxon = ref<TaxonNode | any>({})
const isLoading = ref(true)
const errorMessage = ref('')
const loadIndentedTree = ref(false)
const loadRadialTree = ref(false)
const treeData = reactive<Record<string, any>>({})

watch(
  () => props.taxid,
  async (value) => {
    await getTaxon()
    details.value = parseDetails(taxon.value)
    showModal.value=false
  }
)
/*
  get taxon
  get phylogenetic tree
  get coordinates
  get list
*/
const treeType = ref('')

onMounted(async () => {
  await getTaxon()
  details.value = parseDetails(taxon.value)
})

async function getTaxon() {
  try {
    isLoading.value = true
    const { data } = await TaxonService.getTaxon(props.taxid)
    taxon.value = { ...data }
  } catch (e) {
    errorMessage.value = `Something happened: ${e}`
  } finally {
    isLoading.value = false
  }
}

async function loadTree(type: 'indented' | 'radial') {
  treeType.value = type
  try {
    if (type === 'indented') {
      loadIndentedTree.value = true
    } else {
      loadRadialTree.value = true
    }
    const { data } = await TaxonService.getTree(props.taxid)
    Object.assign(treeData, data)
  } catch (e) {
    console.log(e)
  } finally {
    loadIndentedTree.value = false
    loadRadialTree.value = false
    showModal.value = true
  }
}

function parseDetails(taxon: TaxonNode) {
  const details: Details = {
    title: taxon.name,
    description: taxon.rank,
    ncbiPath: `https://www.ncbi.nlm.nih.gov/assembly/${taxon.taxid}`,
    ebiPath: `https://www.ebi.ac.uk/ena/browser/view/${taxon.taxid}`
  }
  return details
}
</script>
  
<style lang="scss">


.chart {
  height: 400px;
}

.row-equal .flex {
  .va-card {
    height: 100%;
  }
}

.va-card {
  margin-bottom: 0 !important;

  &__title {
    display: flex;
    justify-content: space-between;
  }
}

.list__item+.list__item {
  margin-top: 10px;
}
</style>
  