<template>
  <va-inner-loading :loading="isLoading">
    <div class="row">
      <div class="flex lg12 md12 sm12 xs12">
          <FilterForm :filters="filters" @on-reset="reset" @on-submit="handleSubmit" />
      </div>
    </div>
    <va-divider/>
    <div class="row">
      <div class="flex lg12 md12 sm12 xs12">
        <h1 class="va-h1">{{ query }}</h1>
      </div>
      <div v-if="showTree" class="flex lg12 md12 sm12 xs12">
          <IndentedTree :data="tree" />
      </div>
      <div v-if="message" class="flex lg12 md12 sm12 xs12">
        <p class="va-h5">{{ message }}</p>
      </div>
    </div>
  </va-inner-loading>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { Filter } from '../../data/types'
import TaxonService from '../../services/clients/TaxonService'
import IndentedTree from '../../components/tree/IndentedTree.vue'
import { useI18n } from 'vue-i18n'
import FilterForm from '../../components/ui/FilterForm.vue'

const { t } = useI18n()
const initSearchForm = {
  taxid: '',
  insdc_status: '',
}
const showTree = ref(false)
const tree = ref({})
const query = ref('')
const taxon = ref('')
const message = ref('')

const searchForm = ref({ ...initSearchForm })
const isLoading = ref(false)
const filters: Filter[] = [
  {
    label: 'relatedTaxon.searchInput.label',
    placeholder: 'relatedTaxon.searchInput.placeholder',
    key: 'taxid',
    type: 'input',
  },
  {
    label: 'relatedTaxon.selectInput',
    key: 'insdc_status',
    type: 'select',
    options: ['Biosample Submitted', 'Reads Submitted', 'Assemblies Submitted'],
  },
]

async function handleSubmit(payload) {
  searchForm.value = {...payload}
  message.value = ''
  showTree.value = false
  isLoading.value = true
  const { data } = await TaxonService.getPhylogeneticallyCloseTree(searchForm.value.taxid, {
    insdc_status: searchForm.value.insdc_status,
  })
  if (data && Object.keys(data).length && data.tree && Object.keys(data.tree).length) {
    tree.value = { ...data.tree }
    query.value = data.scientific_name
    taxon.value = data.taxon
    showTree.value = true
  } else {
    message.value = `${searchForm.value.taxid} not found`
  }
  isLoading.value = false
}
function reset() {
  message.value = ''
  searchForm.value = { ...initSearchForm }
  query.value = ''
  taxon.value = ''
  showTree.value = false
}
</script>