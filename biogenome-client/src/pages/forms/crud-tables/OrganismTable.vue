<template>
  <div class="row align-center">
    <va-select
      v-model="filter.filter_option"
      class="flex lg4 md4 sm12 xs12"
      :options="['taxid', 'common_name', 'scientific_name', 'tolid']"
      label="filter by"
    ></va-select>
    <va-input v-model="filter.filter" label="search organism" class="flex lg4 md4 sm12 xs12"></va-input>
    <va-button :disabled="filter.filter.length <= 2" icon="search" @click="handleSubmit"> Search </va-button>
  </div>
  <va-data-table
    :items="organisms"
    :columns="['taxid', 'scientific_name', 'insdc_common_name', 'tolid_prefix', 'actions']"
  >
    <template #cell(actions)="{ rowData }">
      <va-chip :to="{ name: 'organism-form', params: { taxid: rowData.taxid } }" icon="edit">Edit Organism</va-chip>
      <va-chip color="danger" icon="delete" @click="deleteConfirmation(rowData)">Delete Organism</va-chip>
    </template>
  </va-data-table>
  <div class="row justify-center">
    <div class="flex">
      <va-pagination
        v-model="offset"
        :page-size="pagination.limit"
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
  <va-modal v-model="showModal" hide-default-actions>
    <template #header>
      <h2 style="color: red">Delete {{ organismToDelete.scientific_name }}</h2>
    </template>
    <div style="padding: 10px">
      Are you sure you want to delete the organism: <strong>{{ organismToDelete.scientific_name }}</strong> ?
      <br />
      All its related data will be also deleted
    </div>
    <template #footer>
      <va-button color="danger" @click="deleteOrganism"> Delete </va-button>
    </template>
  </va-modal>
</template>
<script setup lang="ts">
  import OrganismService from '../../../services/clients/OrganismService'
  import { ref, onMounted } from 'vue'
import AuthService from '../../../services/clients/AuthService';
  const initPagination = {
    offset: 0,
    limit: 10,
  }

  const initFilter = {
    filter: '',
    filter_option: '',
  }

  const showModal = ref(false)
  const filter = ref({ ...initFilter })
  const pagination = ref({ ...initPagination })
  const offset = ref(1 + pagination.value.offset)
  const organisms = ref([])
  const total = ref(0)

  const organismToDelete = ref({
    taxid: null,
    scientific_name: null,
  })
  onMounted(async () => {
    const { data } = await OrganismService.getOrganisms({ ...pagination.value })
    organisms.value = data.data
    total.value = data.total
  })

  async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    const { data } = await OrganismService.getOrganisms({ ...pagination.value, ...filter.value })
    organisms.value = data.data
    total.value = data.total
  }
  async function handleSubmit() {
    const { data } = await OrganismService.getOrganisms({ ...pagination.value, ...filter.value })
    organisms.value = data.data
    total.value = data.total
    pagination.value = { ...initPagination }
  }

  function deleteConfirmation(rowData) {
    organismToDelete.value.taxid = rowData.taxid
    organismToDelete.value.scientific_name = rowData.scientific_name
    showModal.value = true
  }

  async function deleteOrganism() {
    const { data } = await AuthService.deleteOrganism(organismToDelete.value.taxid)
    console.log(data)
  }
</script>
