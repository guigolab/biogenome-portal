<template>
  <h4 class="va-h4"> GoaT Report Upload
  </h4>
  <p class="mb-4"> Upload a goat report, the format MUST be compliant with <a target="_blank"
      href="https://docs.google.com/spreadsheets/d/1eC6jQctRoUaeGWWDbb1qsWs-7ajC462nnJdHK4N3ivw"><b>THIS</b></a></p>
  <p> IMPORTANT: the species' related data (in case of insdc_submitted status) have to be imported separatedly!!
  </p>
  <div class="row   justify-center">
    <div class="flex lg8 md8">
      <va-card>
        <va-inner-loading :loading="isLoading">
          <va-form tag="form" @submit.prevent="handleSubmit">
            <va-card-content>
              <div class="row">
                <div class="flex lg3 md3">
                  <va-file-upload uploadButtonText="Upload GoaT report" v-model="tsv" file-types=".tsv" type="single"
                    undo>
                  </va-file-upload>
                </div>
              </div>
            </va-card-content>
            <va-card-actions align="between">
              <va-button color="danger" type="reset"> Reset </va-button>
              <va-button :disabled="!tsv" type="submit"> Submit </va-button>
            </va-card-actions>
          </va-form>
        </va-inner-loading>
      </va-card>
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
import { onUnmounted, ref } from 'vue'
import AuthService from '../../services/clients/AuthService'
import { AxiosError } from 'axios'

const isLoading = ref(false)
const messages = ref<Record<string, string>[]>([])
const tsv = ref()
const isError = ref(false)
const intervalId = ref<number | null>(null);
const pollingInterval = 5000; // Interval in milliseconds (e.g., 5000 ms = 5 seconds)
const jobID = ref()
const uploadState = ref("")



onUnmounted(() => {
  if (intervalId.value !== null) {
    clearInterval(intervalId.value);
  }
})

async function fetchStatus() {
  const { data } = await AuthService.importGoatReportStatus(jobID.value)
  const state = data.state
  if (state === 'SUCCESS' && intervalId.value) {
    clearInterval(intervalId.value)
    isLoading.value = false
  }
  messages.value = [...data.messages]
  uploadState.value = data.state
}

async function handleSubmit() {
  isError.value = false
  isLoading.value = true
  messages.value = []
  if (!tsv.value) return

  const formData = new FormData()
  formData.append('goat_report', tsv.value)

  try {
    const { data } = await AuthService.importGoatReport(formData)
    uploadState.value = data.state
    jobID.value = data.id
    intervalId.value = window.setInterval(fetchStatus, pollingInterval);

  } catch (error) {
    isError.value = true
    const axiosError = error as AxiosError
    if (axiosError.response && axiosError.response.data) messages.value = [...axiosError.response.data as Record<string, string>[]]
    else messages.value = [{ error: axiosError.message }]
    isLoading.value = false
  }
}
</script>
