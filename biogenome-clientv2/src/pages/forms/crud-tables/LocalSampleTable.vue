<template>
  <div class="row align-center">
    <va-select
      v-model="filter.filter_option"
      class="flex lg4 md4 sm12 xs12"
      :options="['taxid', 'scientific_name']"
      label="filter by"
    ></va-select>
    <va-input v-model="filter.filter" label="search local sample" class="flex lg4 md4 sm12 xs12"></va-input>
    <va-button :disabled="filter.filter.length <= 2" icon="search" @click="handleSubmit"> Search </va-button>
  </div>
  <va-data-table :items="localSamples" :columns="['local_id', 'scientific_name']">
    <template #cell(actions)="{ rowData }">
      <va-chip :to="{ name: 'local-sample-form', params: { id: rowData.local_id } }" icon="edit"
        >Edit Local Sample</va-chip
      >
      <va-chip color="danger" icon="delete" @click="deleteConfirmation(rowData)">Delete Local Sample</va-chip>
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
      <h2 style="color: red">Delete {{ sampleToDelete.id }}</h2>
    </template>
    <div style="padding: 10px">
      Are you sure you want to delete local sample: <strong>{{ sampleToDelete.id }}</strong> ?
    </div>
    <template #footer>
      <va-button color="danger" @click="deleteLocalSample"> Delete </va-button>
    </template>
  </va-modal>
</template>
<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import LocalSampleService from '../../../services/clients/LocalSampleService'
  import { useToast } from 'vuestic-ui'
import AuthService from '../../../services/clients/AuthService'

  const { init } = useToast()
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
  const localSamples = ref([])
  const total = ref(0)

  const sampleToDelete = ref({
    id: null,
  })
  onMounted(async () => {
    const { data } = await LocalSampleService.getLocalSamples({ ...pagination.value })
    localSamples.value = data.data
    total.value = data.total
  })

  async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    const { data } = await LocalSampleService.getLocalSamples({ ...pagination.value, ...filter.value })
    localSamples.value = data.data
    total.value = data.total
  }
  async function handleSubmit() {
    const { data } = await LocalSampleService.getLocalSamples({ ...pagination.value, ...filter.value })
    localSamples.value = data.data
    total.value = data.total
    pagination.value = { ...initPagination }
  }

  function deleteConfirmation(rowData) {
    sampleToDelete.value.id = rowData.local_id
    showModal.value = true
  }

  async function deleteLocalSample() {
    const { data } = await AuthService.deleteLocalSample(sampleToDelete.value.id)
    pagination.value = {...initPagination}
    filter.value = {...initFilter}
    localSamples.value  = (await LocalSampleService.getLocalSamples({ ...pagination.value })).data.data
    total.value = data.total
    init({message: data, color:'success'})
  }
</script>
