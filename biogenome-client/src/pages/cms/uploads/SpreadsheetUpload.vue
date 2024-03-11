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
        <va-card>
          <va-form ref="uploadForm" tag="form" @submit.prevent="handleSubmit">
            <va-card-title>Import Options</va-card-title>
            <va-card-content>
              <div class="row">
                <div class="flex lg12 md12">
                  <va-input v-model="excelData.id" label="ID column name"
                    :messages="['Column name of the ID of the samples']"
                    :rules="[(v: string) => v.length > 0 || 'Field is mandatory']">
                  </va-input>
                </div>
                <div class="flex lg12 md12">
                  <va-input v-model="excelData.taxid" label="TAXID column name"
                    :messages="['Column name of the Taxonomic identifier (NCBI) of the samples']"
                    :rules="[(v: string) => v.length > 0 || 'Field is mandatory']"></va-input>
                </div>
                <div class="flex lg12 md12">
                  <va-input v-model="excelData.scientific_name" label="Scientific Name column name"
                    :messages="['Column name of the Scientific Name of the samples']"
                    :rules="[(v: string) => v.length > 0 || 'Field is mandatory']"></va-input>
                </div>
              </div>
            </va-card-content>
            <va-divider>File Options</va-divider>
            <va-card-content>
              <div class="row aling-end">
                <div class="flex lg12 md12">
                  <va-select v-model="excelData.option" :options="['SKIP', 'UPDATE']" label="Existing ID behaviour"
                    :messages="['SKIP or UPDATE existing samples (related to ID column name)']"></va-select>
                </div>
                <div class="flex lg12 md12">
                  <va-counter label="Row number" v-model="excelData.header" :min="1"
                    :messages="['Row number of the column definitions']" />
                </div>
                <div class="flex lg12 md12">
                  <va-file-upload v-model="excel" file-types=".xlsx" type="single" undo>
                    <!-- <va-chip color="info" icon="upload" flat :disabled="fileLoaded">Upload Spreadsheet</va-chip> -->
                  </va-file-upload>
                </div>
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
        <va-card-content v-if="messages.length">
          {{ isError ? 'Error' : 'Success' }}
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
import { reactive, ref } from 'vue'
import AuthService from '../../../services/clients/AuthService'
import { AxiosError } from 'axios'
import { useForm } from 'vuestic-ui/web-components'


const { validate } = useForm('uploadForm')
const isLoading = ref(false)

const messages = ref<Record<string, string>[]>([])
const isError = ref(false)

const excel = ref()

const excelForm = {
  id: '',
  taxid: '',
  header: 1,
  scientific_name: '',
  latitude: '',
  longitude: '',
  option: 'SKIP',
}

const excelData = reactive({ ...excelForm })

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
    messages.value = [...data]
  } catch (error) {
    const axiosError = error as AxiosError
    if (axiosError && axiosError.response && axiosError.response.data) {
      console.log(axiosError)
      // const data = axiosError.response.data
      messages.value = [...axiosError.response.data as Record<string, string>[]]
    }
    isError.value = true
    console.log(error)
  } finally {
    isLoading.value = false
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

}
</script>
