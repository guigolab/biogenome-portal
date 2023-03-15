<template>
    <va-card :stripe="Boolean(message)" stripe-color="danger">
        <va-inner-loading :loading="isLoading">
        <va-card-title>
            search taxon phylogenetically close
            <va-button-dropdown
                style="float: inline-end;"
                icon="info"
                preset="secondary"
                size="small"
            >
                Search taxons phylogenetically close to the taxon queried, if the taxon is not present in the database it will be retrieved from ENA
            </va-button-dropdown>
        </va-card-title>
        <va-form tag="form" @submit.prevent="handleSubmit">
          <va-card-content>
            <div class="row align-center justify-space-between">
              <div v-for="(filter, index) in filters" :key="index" class="flex lg4 md4 sm12 xs12">
                <div v-if="filter.type === 'input'">
                  <va-input
                    v-model="searchForm[filter.key]"
                    :label="filter.label"
                    :placeholder="filter.placeholder"
                  />
                </div>
                <div v-else="filter.type === 'select'">
                  <va-select
                    v-model="searchForm[filter.key]"
                    :label="filter.label"
                    :options="filter.options"
                  />
                </div>
              </div>
              <div class="flex">
                <va-button :disabled="!Boolean(searchForm.taxid)" type="submit">Search</va-button>
              </div>
              <div class="flex">
                <va-button color="danger" type="reset">Reset</va-button>
              </div>
            </div>
          </va-card-content>
        </va-form>
        <va-card-content v-if="showTree">
            {{ query }}
            <TreeOfLife :data="tree"/>
            <IndentedTree :data="tree"/>
        </va-card-content>
        <va-card-content v-if="message">
            <p class="va-h5">{{ message }}</p>
        </va-card-content>
    </va-inner-loading>
    </va-card>
</template>
<script setup lang="ts">
  import { ref } from 'vue'
import { Filter } from '../../data/types'
import TaxonService from '../../services/clients/TaxonService';
import TreeOfLife from '../../components/TreeOfLife.vue';  
import IndentedTree from '../organisms/IndentedTree.vue';
const initSearchForm = {
    taxid:'',
    insdc_status:'Assemblies Submitted'
  }

  const showTree = ref(false)
  const tree = ref({})
  const query = ref('')
  const taxon = ref('')
  const searchForm = ref({...initSearchForm})
  const isLoading = ref(false)
  const message = ref('')
  const filters: Filter[] = [
    {
      label: 'search taxon',
      placeholder: 'Search by NCBI TaxID',
      key: 'taxid',
      type: 'input',
    },
    {
      label: 'INSDC status',
      key: 'insdc_status',
      type: 'select',
      options: [
        'Biosample Submitted',
        'Reads Submitted',
        'Assemblies Submitted',
      ],
    }
  ]

  async function handleSubmit(){
    showTree.value = false
    isLoading.value = true
    const {data} = await TaxonService.getPhylogeneticallyCloseTree(searchForm.value.taxid, {insdc_status:searchForm.value.insdc_status})
    if(data && Object.keys(data).length && data.tree && Object.keys(data.tree).length){
        tree.value = {...data.tree}
        query.value = data.scientific_name
        taxon.value = data.taxon
        showTree.value = true
    }else{
        message.value = `${searchForm.value.taxid} not found`
    }
    isLoading.value = false

  }

</script>