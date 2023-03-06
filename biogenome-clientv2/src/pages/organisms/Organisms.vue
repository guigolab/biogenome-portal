<template>
  <va-card class="d-flex">
    <va-card-title>
      <div class="row">
        <div class="flex">total: {{ total }}</div>
      </div>
    </va-card-title>
    <va-card-content>
      <div class="row align-center justify-end">
        <div class="flex lg4 md4 sm12 xs12">
          <va-select
            v-model="organismStore.searchForm.parent_taxid"
            label="search parent taxon"
            placeholder="Search by taxon name"
            searchable
            :options="taxons"
            text-by="name"
            track-by="taxid"
            value-by="taxid"
            @update-search="searchTaxon"
          />
        </div>
        <div class="flex lg4 md4 sm12 xs12">
          <va-select
            v-model="organismStore.searchForm.bioproject"
            label="search BioProject"
            placeholder="Search by project title"
            searchable
            :options="bioprojects"
            text-by="title"
            track-by="accession"
            value-by="accession"
            @update-search="searchBioProject"
          />
        </div>
      </div>
    </va-card-content>
    <Filters :search-form="organismStore.searchForm" :filters="filters" @on-reset="reset" @on-submit="handleSubmit" />
    <va-card-content>
      <DataTable :items="organisms" :columns="columns" />
      <div class="row align-center justify-center">
        <div class="flex">
          <va-pagination
            v-model="offset"
            :page-size="organismStore.pagination.limit"
            :total="total"
            :visible-pages="3"
            buttons-preset="secondary"
            rounded
            gapped
            border-color="primary"
            @update:model-value="handlePagination"
          />
        </div>
      </div>
    </va-card-content>
  </va-card>
</template>
<script setup lang="ts">
  import OrganismService from '../../services/clients/OrganismService'
  import { onMounted, ref, watch } from 'vue'
  import { AxiosResponse } from 'axios'
  import { useOrganismStore } from '../../stores/organism-store'
  import DataTable from '../../components/ui/DataTable.vue'
  import BioProjectService from '../../services/clients/BioProjectService'
  import TaxonService from '../../services/clients/TaxonService'
  import Filters from '../../components/ui/Filters.vue'
  import { Filter } from '../../data/types'

  const filters: Filter[] = [
    {
      label: 'search organism',
      placeholder: 'Search by species, taxid, common_name or tolid',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'filter by',
      key: 'filter_option',
      type: 'select',
      options: ['taxid', 'common_name', 'scientific_name', 'tolid'],
    },
    {
      label: 'INSDC status',
      key: 'insdc_status',
      type: 'select',
      options: [
        'Sample Acquired',
        'Biosample Submitted',
        'Reads Submitted',
        'Assemblies Submitted',
        'Annotations Created',
      ],
    },
    {
      label: 'GoaT status',
      key: 'goat_status',
      type: 'select',
      options: [
        'Sample Collected',
        'Sample Acquired',
        'Data Generation',
        'In Assembly',
        'INSDC Submitted',
        'Publication Available',
      ],
    },
    {
      label: 'target list status',
      key: 'target_list_status',
      type: 'select',
      options: ['long_list', 'family_representative', 'other_priority'],
    },
    {
      label: 'sort by',
      key: 'sort_column',
      type: 'select',
      options: ['scientific_name', 'taxid', 'tolid'],
    },
    {
      label: 'sort order',
      key: 'sort_order',
      type: 'select',
      options: ['asc', 'desc'],
    },
  ]

  const organismStore = useOrganismStore()

  const bioprojects = ref([])
  const taxons = ref([])

  const offset = ref(1 + organismStore.pagination.offset)

  const columns = [
    'scientific_name',
    'insdc_common_name',
    'tolid_prefix',
    'taxid',
    'goat_status',
    'insdc_status',
    'target_list_status',
  ]

  const organisms = ref([])
  const total = ref(0)

  watch(
    () => organismStore.searchForm.bioproject,
    (bioproject) => {
      handleSubmit()
    },
  )

  watch(
    () => organismStore.searchForm.parent_taxid,
    (parent) => {
      handleSubmit()
    },
  )

  onMounted(async () => {
    getOrganisms(await OrganismService.getOrganisms({ ...organismStore.searchForm, ...organismStore.pagination }))
  })

  async function handleSubmit() {
    organismStore.resetPagination()
    getOrganisms(await OrganismService.getOrganisms({ ...organismStore.searchForm, ...organismStore.pagination }))
  }

  async function handlePagination(value: number) {
    organismStore.pagination.offset = value - 1
    getOrganisms(await OrganismService.getOrganisms({ ...organismStore.searchForm, ...organismStore.pagination }))
  }

  async function reset() {
    offset.value = 1
    organismStore.resetSearchForm()
    organismStore.resetPagination()
    getOrganisms(await OrganismService.getOrganisms({ ...organismStore.pagination }))
  }

  function getOrganisms({ data }: AxiosResponse) {
    organisms.value = data.data
    total.value = data.total
    return data
  }
  async function searchBioProject(value: string) {
    if (value.length >= 3) {
      const { data } = await BioProjectService.getBioprojects({ filter: value })
      bioprojects.value = [...data.data]
    }
  }
  async function searchTaxon(value: string) {
    if (value.length >= 3) {
      const { data } = await TaxonService.getTaxons({ filter: value })
      taxons.value = [...data.data]
    }
  }
</script>
