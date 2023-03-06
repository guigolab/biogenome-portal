<template>
  <p class="va-title">{{ `Annotation ${isUpdate ? 'Update' : 'Creation'}` }}</p>
  <va-divider />
  <div v-if="!isUpdate" class="row">
    <div class="flex lg6 md6 sm12 xs12">
      <va-inner-loading :loading="isLoading">
        <va-input
          v-model="input"
          style="padding-bottom: 10px"
          label="Annotation name"
          placeholder="Insert a valid annotation name"
        >
          <template #append>
            <va-button :disabled="input.length < 1" type="submit" icon="search" @click="getAnnotation()"
              >Validate Annotation name</va-button
            >
          </template>
        </va-input>
      </va-inner-loading>
    </div>
  </div>
  <Transition>
    <va-card v-if="annotationStore.annotationForm.name" stripe stripe-color="success" class="d-flex">
      <va-form tag="form" @submit.prevent="handleSubmit">
        <va-card-content>
          <h2 class="va-h5">{{ annotationStore.annotationForm.name }}</h2>
          <p>assembly accession: {{ assemblyAccession }}</p>
        </va-card-content>
        <va-divider>Links</va-divider>
        <va-card-content>
          <va-input
            v-model="annotationStore.annotationForm.gff_gz_location"
            label="gzipped gff3 url"
            :messages="['URL of the gzipped gff file']"
          />
          <va-input
            v-model="annotationStore.annotationForm.tab_index_location"
            label="tabindexed gff3 url"
            :messages="['URL of the tabindexed gzipped gff file']"
          />
        </va-card-content>
        <va-divider>Attributes</va-divider>
        <va-card-content>
          <div v-for="(mt, index) in metadataList" :key="index" class="row align-center justify-between">
            <div class="flex lg8 md8 sm8 xs8">
              <va-input
                v-model="mt.key"
                label="attribute name"
                class="mt-3"
                :error="metadataList.filter((m) => m.key === mt.key).length > 1"
                :error-messages="[`Attribute name ${mt.key} is already present`]"
              />
              <va-input v-model="mt.value" label="attribute value" class="mt-3" type="textarea" />
            </div>
            <div class="flex">
              <va-button icon="delete" color="danger" @click="metadataList.splice(index, 1)">
                Delete Attribute
              </va-button>
            </div>
          </div>
          <va-button class="mt-3" icon="add" @click="metadataList.push({ key: '', value: '' })"
            >Add new attribute</va-button
          >
        </va-card-content>
        <va-card-actions align="between">
          <va-button type="reset" color="danger">Reset</va-button>
          <va-button type="submit">Submit</va-button>
        </va-card-actions>
      </va-form>
    </va-card>
  </Transition>
</template>
<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { useToast } from 'vuestic-ui'
  import { useGlobalStore } from '../../stores/global-store'
  import { useAnnotationStore } from '../../stores/annotation-store'
  import AnnotationService from '../../services/clients/AnnotationService'

  const annotationStore = useAnnotationStore()
  const globalStore = useGlobalStore()

  const props = defineProps({
    name: String,
    assemblyAccession: String,
    assemblyName: String,
    taxid: String,
  })

  const isUpdate = computed(() => {
    return props.name
  })

  const isLoading = ref(false)

  const retries = ref(0)

  const previewAvatar = ref(false)

  type Metatada = {
    key: string
    value: string
  }
  const metadataList = reactive<Metatada[]>([])

  const { init } = useToast()

  const input = ref('')

  const message = ref('')

  onMounted(async () => {
    annotationStore.annotationForm.assembly_accession = props.assemblyAccession
    annotationStore.annotationForm.assembly_name = props.assemblyName
    annotationStore.annotationForm.taxid = props.taxid
    if (!isUpdate.value) return

    const { data } = await AnnotationService.getAnnotation(props.name)

    Object.keys(data)
      .filter((k) => Object.keys(annotationStore.annotationForm).includes(k))
      .forEach((k) => {
        annotationStore.annotationForm[k] = data[k]
      })
    //parse metadata
    const parsedMetadata = Object.keys(annotationStore.annotationForm.metadata).map((k) => {
      return {
        key: k,
        value: annotationStore.annotationForm.metadata[k],
      }
    })
    if (parsedMetadata.length) {
      metadataList.push(...parsedMetadata)
    }
  })

  async function getAnnotation() {
    isLoading.value = true
    try {
      const { status } = await AnnotationService.getAnnotation(input.value)
      if (status === 200) {
        message.value = `Annotation with name: ${input.value} already exists`
        init({ message: message.value, color: 'danger' })
        isLoading.value = false
        return
      }
    } catch (error) {
      if (!error.response || !error.response.status || error.response.status !== 404) {
        message.value = `Something happened`
        init({ message: message.value, color: 'danger' })
        isLoading.value = false
        return
      }
    }
    annotationStore.annotationForm.name = input.value
    isLoading.value = false
  }
  async function handleSubmit() {
    
    if (!globalStore.isAuthenticated) {
      init({ message: 'You must authenticate first', color: 'danger' })
    }
    //parse form data
    let metadata = {}
    metadataList.forEach((m) => {
      metadata[m.key] = m.value
    })
    annotationStore.annotationForm.metadata = { ...metadata }

      if(isUpdate.value){
        const {data} = await AnnotationService.updateAnnotation(props.name, annotationStore.annotationForm)
        init({ message: data, color: 'success' })
        return
      }
        const {data} = await AnnotationService.createAnnotation(annotationStore.annotationForm)
        init({ message: data, color: 'success' })
        return
  }
</script>
