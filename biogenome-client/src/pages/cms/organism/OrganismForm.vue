<template>
  <h4 class="va-h4">Organism Form</h4>
  <p class="mb-4">{{taxid? `Edit ${taxid}`:'Create a new organis, start by typing its NCBI taxonomic identifier'}}</p>
  <TaxidInput v-if="!taxid" />
  <div v-if="organismStore.organismForm.taxid">
    <va-inner-loading :loading="isLoading">
      <va-card stripe stripe-color="success">
        <va-form ref="organismForm" tag="form" @submit.prevent="handleSubmit">
          <va-card-content>
            <h2 class="va-h2">{{ organismStore.organismForm.scientific_name }}</h2>
            <p class="secondary-text">{{ organismStore.organismForm.taxid }}</p>
          </va-card-content>
          <ImagesInput />
          <GoaTInput />
          <MetadataInput />
          <PublicationsInput />
          <LocalNamesInput />
          <va-divider />
          <va-card-actions align="between">
            <va-button type="reset" color="danger">Reset</va-button>
            <va-button type="submit">Submit</va-button>
          </va-card-actions>
        </va-form>
      </va-card>
    </va-inner-loading>
  </div>
</template>
<script setup lang="ts">

import { onMounted, ref, watch } from 'vue'
import { useToast } from 'vuestic-ui'
import { useOrganismStore } from '../../../stores/organism-store'
import TaxidInput from './components/TaxidInput.vue'
import ImagesInput from './components/ImagesInput.vue'
import GoaTInput from './components/GoaTInput.vue'
import MetadataInput from './components/MetadataInput.vue'
import PublicationsInput from './components/PublicationsInput.vue'
import LocalNamesInput from './components/LocalNamesInput.vue'
import AuthService from '../../../services/clients/AuthService'
import OrganismService from '../../../services/clients/OrganismService'
import { OrganismForm } from '../../../data/types'
import { useRouter } from 'vue-router'
import { AxiosError } from 'axios'

const isLoading = ref(false)
const props = defineProps<{
  taxid?: string
}>()
const router = useRouter()
const organismStore = useOrganismStore()
const { init } = useToast()

watch(()=> props.taxid, (v)=>{
  resetForm()
})

onMounted(async () => {
  resetForm()

  try {
    if (props.taxid === undefined) return
    const { data } = await OrganismService.getOrganism(props.taxid)

    const formEntries = Object.entries(data)
      .filter(([k, v]) => Object.keys(organismStore.organismForm).includes(k))
    organismStore.organismForm = { ...Object.fromEntries(formEntries) as OrganismForm }

    const { image_urls, publications, common_names, metadata } = organismStore.organismForm
    if (publications.length) {
      organismStore.publications = [...publications]
    }
    if (image_urls.length) {
      organismStore.images = [...image_urls.map(m => {
        return { value: m }
      })]
    }
    if (common_names.length) {
      organismStore.vernacularNames = [...common_names]
    }
    if (Object.keys(metadata).length) {
      organismStore.metadataList = [...Object.entries(metadata).map(([k, v]) => {
        return { key: k, value: v }
      })]
    }

  } catch (error) {
    console.log(error)
  }
})

async function handleSubmit() {
  try {
    const { metadataList, images, publications, vernacularNames } = organismStore
    if (metadataList.length > 0) {
      metadataList.filter(({ key, value }) => key).forEach(({ key, value }) => organismStore.organismForm.metadata[key] = value)
    }else{
      organismStore.organismForm.metadata = {}
    }
    if (images.length > 0) {
      organismStore.organismForm.image_urls = [...images.filter(({ value }) => value).map(({ value }) => value)]
    }else{
      organismStore.organismForm.image_urls = []
    }
    if (publications.length) {
      organismStore.organismForm.publications = [...publications.filter(({ id }) => id)]
    }else{
      organismStore.organismForm.publications = []
    }
    if (vernacularNames.length > 0) {
      organismStore.organismForm.common_names = [...vernacularNames.filter(({ value }) => value)]
    }else{
      organismStore.organismForm.common_names = []
    }
    if (props.taxid) {
      const { data } = await AuthService.updateOrganism(props.taxid, organismStore.organismForm)
      init({ message: 'Organism updated!', color: 'success' })
      router.push({ name: 'cms-organisms' })

    } else {
      const { data } = await AuthService.createOrganism(organismStore.organismForm)
      init({ message: 'Organism created!', color: 'success' })
      resetForm()
    }
  } catch (error) {
    console.log(error)
    const axiosError = error as AxiosError
    const message = axiosError.response && axiosError.response.data ? axiosError.response.data as string : 'Impossible to create organism'
    init({ message: message, color: 'danger' })
  } finally {
    isLoading.value = false
  }

}

function resetForm() {
  organismStore.metadataList = []
  organismStore.publications = []
  organismStore.images = []
  organismStore.vernacularNames = []
  organismStore.resetOrganimForm()
}

</script>