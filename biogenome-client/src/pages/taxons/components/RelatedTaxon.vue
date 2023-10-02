<template>
  <va-inner-loading :loading="isLoading">
    <va-card>
      <va-form tag="form" @submit.prevent="handleSubmit">
        <va-card-content>
          <p>{{ t('relatedTaxon.header') }}</p>
          <div class="row align-center justify-start">
            <div class="flex">
              <va-input v-model="searchForm.taxid" :label="t(filters[0].label)" />
            </div>
            <div class="flex">
              <va-select v-model="searchForm.insdc_status" :label="t(filters[1].label)" :options="filters[1].options" />
            </div>
          </div>
        </va-card-content>
        <va-card-actions align="left">
          <va-button :disabled="!searchForm.taxid" type="submit">{{ t('buttons.submit') }}</va-button>
          <va-button color="danger" @click="reset">{{ t('buttons.reset') }}</va-button>
        </va-card-actions>
      </va-form>
      <va-divider />
      <va-card-content v-if="showTree">
        <p>Your query: <strong>{{ searchForm.taxid }}</strong> {{ `(${query})` }}</p>
        <div class="row">
          <div class="flex lg12 md12 sm12 xs12">
            <IndentedTree :data="tree" />
          </div>
        </div>
      </va-card-content>
      <va-card-content v-else>
        <p style="color: var(--va-danger);">{{ message }}</p>
      </va-card-content>
    </va-card>
  </va-inner-loading>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { Filter } from '../../../data/types'
import TaxonService from '../../../services/clients/TaxonService'
import IndentedTree from '../../../components/tree/IndentedTree.vue'
import { useI18n } from 'vue-i18n'
import {relatedTaxonFilters} from '../configs'

const { t } = useI18n()
const initSearchForm = {
  taxid: '',
  insdc_status: 'Assemblies Submitted',
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

async function handleSubmit() {
  message.value = ''
  showTree.value = false
  try {
    isLoading.value = true
    const { data } = await TaxonService.getPhylogeneticallyCloseTree(searchForm.value.taxid, {
      insdc_status: searchForm.value.insdc_status,
    })
    tree.value = { ...data.tree }
    query.value = data.scientific_name
    taxon.value = data.taxon
    showTree.value = true

  } catch {
    message.value = `${searchForm.value.taxid} not found`
    reset()

  } finally {
    isLoading.value = false

  }
}
function reset() {
  searchForm.value = { ...initSearchForm }
  query.value = ''
  taxon.value = ''
  showTree.value = false
}
</script>