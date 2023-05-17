<template>
    <va-modal v-model="showModal" hide-default-actions no-esc-dismiss no-outside-dismiss no-dismiss fullscreen>
        <va-inner-loading :loading="isLoading">
        <va-form tag="form" @submit.prevent="handleSubmit">
          <va-card-content>
            <div class="row align-center justify-space-between">
              <div v-for="(filter, index) in filters" :key="index" class="flex lg4 md4 sm12 xs12">
                <div v-if="filter.type === 'input'">
                  <va-input
                    v-model="searchForm[filter.key]"
                    :label="t(filter.label)"
                    :placeholder="t(filter.placeholder)"
                  />
                </div>
                <div v-else>
                  <va-select
                    prevent-overflow
                    v-model="searchForm[filter.key]"
                    :label="t(filter.label)"
                    :options="filter.options"
                  />
                </div>
              </div>
              <div class="flex">
                <va-button :disabled="!Boolean(searchForm.taxid)" type="submit">{{t('buttons.submit')}}</va-button>
              </div>
              <div class="flex">
                <va-button color="danger" type="reset">{{t('buttons.reset')}}</va-button>
              </div>
            </div>
          </va-card-content>
        </va-form>
        <va-card-content v-if="showTree">
            {{ query }}
            <IndentedTree :data="tree"/>
        </va-card-content>
        <va-card-content v-if="message">
            <p class="va-h5">{{ message }}</p>
        </va-card-content>
    </va-inner-loading>
    </va-modal>
</template>
<script setup lang="ts">
  import { ref } from 'vue'
  import { Filter } from '../../data/types'
  import TaxonService from '../../services/clients/TaxonService';
  import IndentedTree from '../../components/tree/IndentedTree.vue'
  import { useI18n } from 'vue-i18n'
      
  const { t } = useI18n()
  const initSearchForm = {
      taxid:'',
      insdc_status:'Assemblies Submitted'
    }
  const props = defineProps<{
    showModal:boolean
  }>()
  const showTree = ref(false)
  const tree = ref({})
  const query = ref('')
  const taxon = ref('')
  const searchForm = ref({...initSearchForm})
  const isLoading = ref(false)
  const message = ref('')
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
      options: [
        'Biosample Submitted',
        'Reads Submitted',
        'Assemblies Submitted',
      ],
    }
  ]

  async function handleSubmit(){
    message.value = ''
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