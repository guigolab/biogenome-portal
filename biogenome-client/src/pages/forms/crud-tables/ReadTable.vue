<template>
  <div class="row align-center">
    <va-select
      v-model="filter.filter_option"
      class="flex lg4 md4 sm12 xs12"
      :options="['taxid', 'assembly_name', 'scientific_name']"
      label="filter by"
    ></va-select>
    <va-input v-model="filter.filter" label="search read" class="flex lg4 md4 sm12 xs12"></va-input>
    <va-button :disabled="filter.filter.length <= 2" icon="search" @click="handleSubmit"> Search </va-button>
  </div>
  <va-data-table :items="experiments" :columns="['experiment_accession', 'scientific_name', 'experiment_title', 'actions']">
    <template #cell(experiment_title)="{ rowData }">
      {{ rowData.metadata.experiment_title }}
    </template>
    <template #cell(scientific_name)="{ rowData }">
      {{ rowData.metadata.scientific_name }}
    </template>
    <template #cell(actions)="{ rowData }">
      <va-chip color="danger" icon="delete" @click="deleteConfirmation(rowData)">Delete Read</va-chip>
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
      <h2 style="color: red">Delete {{ readToDelete.accession }}</h2>
    </template>
    <div style="padding: 10px">
      Are you sure you want to delete read: <strong>{{ readToDelete.accession }}</strong> ?
    </div>
    <template #footer>
      <va-button color="danger" @click="deleteRead"> Delete </va-button>
    </template>
  </va-modal>
</template>
<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import AssemblyService from '../../../services/clients/AssemblyService'
  import ReadService from '../../../services/clients/ReadService'
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
  const experiments = ref([])
  const total = ref(0)

  const readToDelete = ref({
    accession: null,
  })
  onMounted(async () => {
    const { data } = await ReadService.getReads({ ...pagination.value })
    experiments.value = data.data
    total.value = data.total
  })

  async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    const { data } = await ReadService.getReads({ ...pagination.value, ...filter.value })
    experiments.value = data.data
    total.value = data.total
  }
  async function handleSubmit() {
    const { data } = await ReadService.getReads({ ...pagination.value, ...filter.value })
    experiments.value = data.data
    total.value = data.total
    pagination.value = { ...initPagination }
  }

  function deleteConfirmation(rowData) {
    readToDelete.value.accession = rowData.accession
    showModal.value = true
  }

  async function deleteRead() {
    const { data } = await AuthService.deleteRead(readToDelete.value.accession)
    console.log(data)
  }
</script>
