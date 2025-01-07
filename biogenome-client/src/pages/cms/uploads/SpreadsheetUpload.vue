<template>
  <h4 class="va-h4">Sample metadata upload</h4>
  <p class="mb-4"> If your spreadsheet contains columns labeled "Latitude" or "Longitude," the system will
    automatically
    generate
    coordinates for each sample based on the values in these columns.<br />
    To ensure accurate coordinate generation, it is recommended to provide decimal values for latitude and
    longitude.<br />
    If you do not wish to generate coordinates, please ensure that your spreadsheet does not contain columns
    labeled "Latitude" or "Longitude."</p>
  <div class="row row-equal justify-center">
    <div class="flex lg8 md8">
      <va-inner-loading :loading="isLoading">
        <va-card :disabled="false">
          <va-card-title>Import Options</va-card-title>
          <va-form ref="uploadForm" tag="form" @submit.prevent="handleSubmit">
            <va-card-content class="row">
              <va-input class="flex lg12 md12" v-model="excelData.id" label="ID column name"
                :messages="['Column name of the ID of the samples']"
                :rules="[(v: string) => v.length > 0 || 'Field is mandatory']">
              </va-input>
              <va-input class="flex lg12 md12" v-model="excelData.taxid" label="TAXID column name"
                :messages="['Column name of the Taxonomic identifier (NCBI) of the samples']"
                :rules="[(v: string) => v.length > 0 || 'Field is mandatory']"></va-input>
              <va-input class="flex lg12 md12" v-model="excelData.scientific_name" label="Scientific Name column name"
                :messages="['Column name of the Scientific Name of the samples']"
                :rules="[(v: string) => v.length > 0 || 'Field is mandatory']"></va-input>
            </va-card-content>
            <va-divider>File Options</va-divider>
            <va-card-content class="row aling-end">
              <va-select class="flex lg12 md12" v-model="excelData.option" :options="['SKIP', 'UPDATE']"
                label="Existing ID behaviour"
                :messages="['SKIP or UPDATE existing samples (related to ID column name)']"></va-select>
              <div class="flex lg12 md12">
                <va-counter label="Row number" v-model="excelData.header" :min="1"
                  :messages="['Row number of the column definitions']" />
              </div>
              <div class="flex lg12 md12">
                <va-file-upload color="warning" v-model="excel" file-types=".xlsx" type="single" undo>
                  <!-- <va-chip color="info" icon="upload" flat :disabled="fileLoaded">Upload Spreadsheet</va-chip> -->
                </va-file-upload>
              </div>
            </va-card-content>
            <va-card-actions align="between">
              <va-button color="danger" type="reset"> Reset Form </va-button>
              <va-button :disabled="!excel" type="submit"> Submit Spreadsheet </va-button>
            </va-card-actions>
          </va-form>
        </va-card>
      </va-inner-loading>
    </div>
    <div class="flex lg4 md4">
      <va-card :stripe="messages.length" :stripe-color="isError ? 'danger' : 'success'">
        <va-card-title>Logs</va-card-title>
        <va-card-content>
          <p v-if="uploadState">{{ uploadState }}</p>
          <p v-else-if="isError">
            {{ isError ? 'Error' : 'Success' }}
          </p>
        </va-card-content>
        <va-card-content style="max-height: 90vh;overflow: scroll;">
          <p v-for="message in messages">
            {{ message }}
          </p>
        </va-card-content>
      </va-card>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue'
import AuthService from '../../../services/clients/AuthService'
import { AxiosError } from 'axios'
import { useForm } from 'vuestic-ui/web-components'


const { validate } = useForm('uploadForm')
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
  if (!validate()) return
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
      messages.value = [...axiosError.response.data as Record<string, string>[]]
    } else {
      messages.value = [{ error: axiosError.message }]
    }
    isError.value = true
    isLoading.value = false

  }

}
</script>
