<template>
  <div class="row align-center">
    <va-input v-model="filter.filter" label="search annotation" class="flex lg4 md4 sm12 xs12"></va-input>
    <va-button :disabled="filter.filter.length <= 2" icon="search" @click="handleSubmit"> Search </va-button>
  </div>
  <va-data-table :items="annotations" :columns="['name', 'scientific_name','assembly_name' , 'actions']">
    <template #cell(actions)="{ rowData }">
      <va-chip
        :to="{ name: 'annotation-form-update', params: { assemblyAccession: rowData.assembly_accession, name: rowData.name } }"
        icon="edit"
        >Edit Annotation</va-chip
      >
      <va-chip color="danger" icon="delete" @click="deleteConfirmation(rowData)">Delete Annotation</va-chip>
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
      <h2 style="color: red">Delete {{ annotationTodelete.name }}</h2>
    </template>
    <div style="padding: 10px">
      Are you sure you want to delete annotation: <strong>{{ annotationTodelete.name }}</strong> ?
    </div>
    <template #footer>
      <va-button color="danger" @click="deleteAnnotation"> Delete </va-button>
    </template>
  </va-modal>
</template>
<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import AnnotationService from '../../../services/clients/AnnotationService'
  import { useGlobalStore } from '../../../stores/global-store';
  import { useToast } from 'vuestic-ui'
import AuthService from '../../../services/clients/AuthService';
  const { init } = useToast()

  const GlobalStore = useGlobalStore()

  const initPagination = {
    offset: 0,
    limit: 10,
  }

  const initFilter = {
    filter: '',
  }

  const showModal = ref(false)
  const filter = ref({ ...initFilter })
  const pagination = ref({ ...initPagination })
  const offset = ref(1 + pagination.value.offset)
  const annotations = ref([])
  const total = ref(0)

  const annotationTodelete = ref({
    name: null,
  })
  onMounted(async () => {
    const { data } = await AnnotationService.getAnnotations({ ...pagination.value })
    annotations.value = data.data
    total.value = data.total
  })

  async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    const { data } = await AnnotationService.getAnnotations({ ...pagination.value, ...filter.value })
    annotations.value = data.data
    total.value = data.total
  }
  async function handleSubmit() {
    const { data } = await AnnotationService.getAnnotations({ ...pagination.value, ...filter.value })
    annotations.value = data.data
    total.value = data.total
    pagination.value = { ...initPagination }
  }

  function deleteConfirmation(rowData:Record<string,any>) {
    annotationTodelete.value.name = rowData.name
    showModal.value = true
  }

  async function deleteAnnotation() {
    showModal.value = false
    await AuthService.deleteAnnotation(annotationTodelete.value.name)
    handleSubmit()
  }
</script>
