<template>
  <p class="va-title">Annotation Creation</p>
  <va-divider />
  <va-inner-loading :loading="isLoading">
    <div class="row">
      <div class="flex lg6 md6 sm12 xs12">
        <va-input v-model="input" style="padding-bottom: 10px" label="Annotation name"
          placeholder="Insert a valid annotation name">
          <template #append>
            <va-button :disabled="input.length < 1" type="submit" icon="search" @click="checkAnnotationExists()">Validate
              Annotation name</va-button>
          </template>
        </va-input>
      </div>
    </div>
    <Transition>
      <va-card v-if="annotationStore.annotationForm.name" stripe stripe-color="success" class="d-flex">
        <va-form tag="form" @submit.prevent="handleSubmit">
          <va-card-content>
            <h2 class="va-h5">{{ annotationStore.annotationForm.name }}</h2>
            <p>assembly accession: {{ assemblyAccession }}</p>
          </va-card-content>
          <va-divider />
          <va-card-content>
            <va-button-toggle v-model="uploadMode" preset="secondary" border-color="primary" :options="uploadModes" />
            <div class="mt-4" v-if="uploadMode === 'links'">
              <va-input :disabled="annotationStore.annotationForm.gzipAnnotation"
                v-model="annotationStore.annotationForm.gff_gz_location" label="gzipped gff3 url"
                :messages="['URL of the gzipped gff file']" />
              <va-input :disabled="annotationStore.annotationForm.tabixAnnotation"
                v-model="annotationStore.annotationForm.tab_index_location" label="tabindexed gff3 url"
                :messages="['URL of the tabindexed gzipped gff file']" />
            </div>
            <div v-else>
              <va-file-upload :disabled="isValid(annotationStore.annotationForm.gff_gz_location)" type="single"
                v-model="annotationStore.annotationForm.gzipAnnotation" dropzone
                drop-zone-text="Upload a gff gzipped file" file-types=".gz" />
              <va-file-upload :disabled="isValid(annotationStore.annotationForm.tab_index_location)" type="single"
                v-model="annotationStore.annotationForm.tabixAnnotation" dropzone
                drop-zone-text="Upload your GFF evidences" file-types=".tbi" />
            </div>
          </va-card-content>
          <va-divider>Attributes</va-divider>
          <va-card-content>
            <div v-for="(mt, index) in metadataList" :key="index" class="row align-center justify-between">
              <div class="flex lg8 md8 sm8 xs8">
                <va-input v-model="mt.key" label="attribute name" class="mt-3"
                  :error="metadataList.filter((m) => m.key === mt.key).length > 1"
                  :error-messages="[`Attribute name ${mt.key} is already present`]" />
                <va-input v-model="mt.value" label="attribute value" class="mt-3" type="textarea" />
              </div>
              <div class="flex">
                <va-button icon="delete" color="danger" @click="metadataList.splice(index, 1)">
                  Delete Attribute
                </va-button>
              </div>
            </div>
            <va-button class="mt-3" icon="add" @click="metadataList.push({ key: '', value: '' })">Add new
              attribute</va-button>
          </va-card-content>
          <va-card-actions align="between">
            <va-button type="reset" color="danger">Reset</va-button>
            <va-button type="submit">Submit</va-button>
          </va-card-actions>
        </va-form>
      </va-card>
    </Transition>
  </va-inner-loading>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useToast } from 'vuestic-ui'
import { useGlobalStore } from '../../stores/global-store'
import { useAnnotationStore } from '../../stores/annotation-store'
import AnnotationService from '../../services/clients/AnnotationService'
import AuthService from '../../services/clients/AuthService'
import AssemblyService from '../../services/clients/AssemblyService'
import { Assembly } from '../../data/types'

const annotationStore = useAnnotationStore()
const globalStore = useGlobalStore()
const uploadMode = ref('files')
const uploadModes = [
  { label: 'Upload files', value: 'files' },
  { label: 'Insert links', value: 'links' },

]
const props = defineProps<{
  assemblyAccession: string
}>()


const isLoading = ref(false)
const isLocalAssembly = ref(false)
const metadataList = reactive<Record<string, string>[]>([])
const assembly = ref<Assembly | null>(null)
const { init } = useToast()

const input = ref('')

const message = ref('')

onMounted(async () => {
  await getAssembly(props.assemblyAccession)
})

async function getAssembly(accession: string) {
  try {
    isLoading.value = true
    const { data } = await AssemblyService.getAssembly(accession)
    assembly.value = { ...data }
    if (assembly.value) {
      annotationStore.annotationForm.assembly_accession = props.assemblyAccession
      annotationStore.annotationForm.assembly_name = assembly.value.assembly_name
      annotationStore.annotationForm.taxid = assembly.value.taxid
    }
  } catch {
    message.value = `Something happened`
    init({ message: message.value, color: 'danger' })
  } finally {
    isLoading.value = false
  }

}

async function checkAnnotationExists() {
  try {
    isLoading.value = true
    const { status } = await AnnotationService.getAnnotation(input.value)
    if (status === 200) {
      message.value = `Annotation with name: ${input.value} already exists`
      init({ message: message.value, color: 'danger' })
    }
  } catch (error: any) {
    if (!error.response || !error.response.status || error.response.status !== 404) {
      message.value = `Something happened`
      init({ message: message.value, color: 'danger' })
    } else {
      annotationStore.annotationForm.name = input.value
    }
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit() {
  if (!globalStore.isAuthenticated) {
    init({ message: 'You must authenticate first', color: 'danger' })
    return
  }
  //parse form data
  const requestData = parseRequestData()
  try {
    isLoading.value = true
    const { data } = await AuthService.createAnnotation(requestData)
    init({ message: data, color: 'success' })
  } catch {
    message.value = `Something happened`
    init({ message: message.value, color: 'danger' })
  } finally {
    isLoading.value = false

  }
}
function isValid(value: any) {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    // Value is considered empty, continue checking the rest of the object
    return false
  }
  // If a non-empty primitive value is found, return false
  return true;

}

function parseRequestData() {
  const metadata = Object.fromEntries(metadataList.filter((m) => m.key && m.value)
    .map(m => [m.key, m.value]))
  console.log(metadata)
  const request = new FormData()
  for (const [key, value] of Object.entries(annotationStore.annotationForm)) {
    if (value) {
      request.append(key, value);
    }
    for (const [k, v] of Object.entries(metadata)) {
      const keyName = `metadata.${k}`
      request.append(keyName, v)
    }
  }
  return request
}

</script>
