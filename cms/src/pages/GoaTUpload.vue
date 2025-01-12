<template>
  <Header :title="title" :description="description" />
  <div class="row">
    <div class="flex">
      <p class="va-text-secondary">
        The tsv format have to be compliant with <a target="_blank"
          href="https://docs.google.com/spreadsheets/d/1eC6jQctRoUaeGWWDbb1qsWs-7ajC462nnJdHK4N3ivw"><b>this</b></a></p>
      <p class="va-text-secondary">
        <b>IMPORTANT:</b> the species' INSDC related data (in case of insdc_submitted status) have to be imported
        separatedly
      </p>
    </div>
  </div>
  <div v-if="isLoading" class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <va-card :stripe="!!messages.length" :stripe-color="isError ? 'danger' : 'success'">
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
  <div class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <div class="row">
        <div class="flex">
          <va-file-upload dropzone uploadButtonText="Clik to upload a TSV" v-model="tsv" file-types=".tsv" type="single"
            undo>
          </va-file-upload>
        </div>
      </div>
      <div class="row">
        <div class="flex">
          <va-button block :disabled="!tsv" @click="handleSubmit"> Submit </va-button>
        </div>
      </div>
    </div>

  </div>
</template>
<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import AuthService from '../services/AuthService'
import { AxiosError } from 'axios'
import Header from '../components/Header.vue';
import { useToast } from 'vuestic-ui';

const title = "GoaT Report Upload"
const description = "Upload a goat report"
const isLoading = ref(false)
const messages = ref<Record<string, string>[]>([])
const tsv = ref()
const isError = ref(false)
const intervalId = ref<number | null>(null);
const pollingInterval = 5000; // Interval in milliseconds (e.g., 5000 ms = 5 seconds)
const jobID = ref()
const uploadState = ref("")
const { init } = useToast()


onUnmounted(() => {
  if (intervalId.value !== null) {
    clearInterval(intervalId.value);
  }
})

async function fetchStatus() {
  const { data } = await AuthService.taskStatus(jobID.value)
  const state = data.state
  if (state === 'SUCCESS' && intervalId.value) {
    clearInterval(intervalId.value)
    init({message: 'Success', color: 'success'})
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

  console.log(tsv.value)
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
