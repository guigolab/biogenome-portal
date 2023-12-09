<template>
  <div class="row align-center">
    <va-select v-model="filter.filter_option" class="flex lg4 md4 sm12 xs12"
      :options="['taxid', 'assembly_name', 'scientific_name']" label="filter by"></va-select>
    <va-input v-model="filter.filter" label="search assembly" class="flex lg4 md4 sm12 xs12"></va-input>
    <va-button :disabled="filter.filter.length <= 2" icon="search" @click="handleSubmit"> Search </va-button>
  </div>
  <va-data-table :items="assemblies"
    :columns="['accession', 'scientific_name', 'assembly_name', 'assembly_level', 'actions']">
    <template #cell(actions)="{ rowData }">
      <va-chip :disabled="rowData.metadata.assembly_level === 'Scaffold' || rowData.metadata.assembly_level === 'Contig'"
        :to="{ name: 'annotation-form-create', params: { assemblyAccession: rowData.accession } }" icon="edit">Add
        Annotation</va-chip>
      <va-chip :to="{ name: 'chr-aliases', params: { accession: rowData.accession } }"
        :disabled="rowData.metadata.assembly_level === 'Scaffold' || rowData.metadata.assembly_level === 'Contig'">Add
        Chromosomes aliases</va-chip>
      <va-chip color="danger" icon="delete" @click="deleteConfirmation(rowData)">Delete Assembly</va-chip>
    </template>
  </va-data-table>
  <div class="row justify-center">
    <div class="flex">
      <va-pagination v-model="offset" :page-size="pagination.limit" :total="total" :visible-pages="3"
        buttons-preset="secondary" rounded gapped border-color="primary" @update:model-value="handlePagination" />
    </div>
  </div>
  <va-modal v-model="showModal" hide-default-actions>
    <template #header>
      <h2 style="color: red">Delete {{ assemblyToDelete.assemblyName }}</h2>
    </template>
    <div style="padding: 10px">
      Are you sure you want to delete assembly: <strong>{{ assemblyToDelete.assemblyName }}</strong> ?
    </div>
    <template #footer>
      <va-button color="danger" @click="deleteAssembly"> Delete </va-button>
    </template>
  </va-modal>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AssemblyService from '../../../services/clients/AssemblyService'
import AuthService from '../../../services/clients/AuthService'
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
const assemblies = ref([])
const total = ref(0)

const assemblyToDelete = ref({
  accession: null,
  assemblyName: null,
})
onMounted(async () => {
  const { data } = await AssemblyService.getAssemblies({ ...pagination.value })
  assemblies.value = data.data
  total.value = data.total
})

async function handlePagination(value: number) {
  pagination.value.offset = value - 1
  const { data } = await AssemblyService.getAssemblies({ ...pagination.value, ...filter.value })
  assemblies.value = data.data
  total.value = data.total
}
async function handleSubmit() {
  const { data } = await AssemblyService.getAssemblies({ ...pagination.value, ...filter.value })
  assemblies.value = data.data
  total.value = data.total
  pagination.value = { ...initPagination }
}

function deleteConfirmation(rowData: Record<string, any>) {
  assemblyToDelete.value.accession = rowData.accession
  assemblyToDelete.value.assemblyName = rowData.assembly_name
  showModal.value = true
}

async function deleteAssembly() {
  showModal.value = false
  await AuthService.deleteAssembly(assemblyToDelete.value.accession)
  handleSubmit()
}
</script>
