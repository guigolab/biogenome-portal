<template>
  <Header :title="title" />
  <!-- 
    OPTIONS:
      METADATA FROM CHECKLIST
        DOWNLOAD TSV TEMPLATE
      METADATA FROM CUSTOM TEMPLATE
  
  -->
  <div v-if="messages.length" class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <VaCard :stripe="messages.length > 0" :stripe-color="isError ? 'danger' : 'success'">
        <VaCardContent>
          <p v-if="uploadState">{{ uploadState }}</p>
          <p v-else-if="isError">
            {{ isError ? 'Error' : 'Success' }}
          </p>
        </VaCardContent>
        <VaCardContent style="max-height: 90vh;overflow: scroll;">
          <ul>
            <li v-for="message in messages">
              {{ message }}

            </li>
          </ul>

        </VaCardContent>
      </VaCard>
    </div>
  </div>
  <VaForm ref="uploadForm" tag="form" @submit.prevent="handleSubmit">

    <div class="row row-equal">
      <div class="flex lg6 md6 sm12 xs12">
        <VaCard>
          <VaCardContent>
            <h2 class="va-h6">
              Field Mapping
            </h2>
            <p class="va-text-secondary">
              If your spreadsheet contains columns that matches the word "lat" or "long," the system
              will
              automatically
              generate
              coordinates for each sample based on the values of these columns.
              To ensure accurate coordinate generation, it is recommended to provide decimal values for latitude and
              longitude.
              If you do not wish to generate coordinates, please ensure that your spreadsheet does not contain columns
              containing the substring: 'lat' or 'long' and with valid coordinates
            </p>
          </VaCardContent>
          <VaCardContent>
            <div class="row">
              <div class="flex lg12 md12 sm12 xs12">
                <VaInput v-model="excelData.id" label="ID COLUMN (required)"
                  placeholder="Type the column name used as unique identifier"
                  :messages="['Column name of the ID of the samples']"
                  :rules="[(v: string) => v.length > 0 || 'Field is mandatory']">
                </VaInput>
              </div>
              <div class="flex lg12 md12 sm12 xs12">
                <VaInput v-model="excelData.taxid" label="TAXID column (required)"
                  placeholder="Type the column name of the taxid"
                  :messages="['Column name of the Taxonomic identifier (NCBI) of the samples']"
                  :rules="[(v: string) => v.length > 0 || 'Field is mandatory']"></VaInput>
              </div>
              <div class="flex lg12 md12 sm12 xs12">
                <VaInput v-model="excelData.scientific_name" label="Scientific Name column (required)"
                  :messages="['Column name of the Scientific Name of the samples']"
                  :rules="[(v: string) => v.length > 0 || 'Field is mandatory']"></VaInput>
              </div>
            </div>
          </VaCardContent>
        </VaCard>
      </div>
      <div class="flex lg6 md6 sm12 xs12">
        <VaCard>
          <VaCardContent>
            <h2 class="va-h6">
              Import Options
            </h2>
            <p class="va-text-secondary">
              Set the column row index (0 based) and the upload behaviour if a local sample with the same id already
              exists
            </p>
          </VaCardContent>
          <VaCardContent>
            <div class="row">
              <div class="flex lg12 md12 sm12 xs12">
                <VaSelect v-model="excelData.option" :options="['SKIP', 'UPDATE']" label="Existing ID behaviour"
                  :messages="['SKIP or UPDATE existing samples (related to ID column name)']">

                </VaSelect>
              </div>
              <div class="flex lg12 md12 sm12 xs12">
                <VaCounter label="Row number" v-model="excelData.header" :min="1"
                  :messages="['Row number of the column definitions']" />
              </div>

              <div class="flex lg12 md12">
                <VaFileUpload dropzone v-model="excel" file-types=".xlsx" type="single" undo>
                  <!-- <va-chip color="info" icon="upload" flat :disabled="fileLoaded">Upload Spreadsheet</va-chip> -->
                </VaFileUpload>
              </div>
            </div>
          </VaCardContent>
        </VaCard>
      </div>

    </div>
    <div class="row justify-space-between">
      <div class="flex">
        <VaButton color="danger" type="reset"> Reset Form </VaButton>

      </div>
      <div class="flex">
        <VaButton :disabled="!excel" type="submit"> Submit Spreadsheet </VaButton>

      </div>
    </div>
  </VaForm>

</template>
<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue'
import AuthService from '../../services/AuthService'
import { AxiosError } from 'axios'
import Header from '../../components/cms/Header.vue'

const title = "Sample metadata upload"
const isLoading = ref(false)

const messages = ref<Record<string, string>[]>([])
const isError = ref(false)
const uploadState = ref("")
const excel = ref()
const intervalId = ref<number | null>(null);
const pollingInterval = 5000; // Interval in milliseconds (e.g., 5000 ms = 5 seconds)
const jobID = ref()
const excelForm = {
  id: '',
  taxid: '',
  header: 1,
  scientific_name: '',
  latitude: '',
  longitude: '',
  option: 'SKIP',
}

onUnmounted(() => {
  if (intervalId.value !== null) {
    clearInterval(intervalId.value);
  }
})



const excelData = reactive({ ...excelForm })

async function fetchStatus() {
  const { data } = await AuthService.taskStatus(jobID.value)
  const state = data.state
  if (state === 'SUCCESS' && intervalId.value) {
    clearInterval(intervalId.value)
    isLoading.value = false
  }
  messages.value = [...data.messages]
  uploadState.value = data.state

}

async function handleSubmit() {
  messages.value = []
  isError.value = false
  const formData = new FormData()
  formData.append('excel', excel.value)
  Object.entries(excelData).forEach(([k, v]) => {
    if (v) formData.append(k, v as any)
  })
  try {
    isLoading.value = true
    const { data } = await AuthService.importSpreadsheet(formData)
    uploadState.value = data.state
    jobID.value = data.id
    intervalId.value = window.setInterval(fetchStatus, pollingInterval);
  } catch (error) {
    console.log(error)
    const axiosError = error as AxiosError
    if (axiosError && axiosError.response && axiosError.response.data) {
      // const data = axiosError.response.data
      const data = axiosError.response.data as any
      if (data.message) {
        messages.value = [...data.message.split(';')]
      } else if (Array.isArray(axiosError.response.data)) {
        messages.value = [...axiosError.response.data as Record<string, string>[]]
      } else {
        messages.value = [{ error: axiosError.message }]

      }
    } else {
    }
    isError.value = true
    isLoading.value = false

  }

}
</script>
