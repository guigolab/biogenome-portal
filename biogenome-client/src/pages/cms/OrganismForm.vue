<template>
  <Header title="Organism form" :description="description" />
  <div class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <TaxidInput v-if="!taxid" />
    </div>
  </div>
  <div v-if="organismStore.organismForm.taxid" class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <VaInnerLoading :loading="isLoading">
        <div class="row row-equal">
          <div class="flex lg12 md12 sm12 xs12">
            <ImagesInput />
          </div>
          <div class="flex lg12 md12 sm12 xs12">
            <MetadataInput />
          </div>
          <div v-if="hasGoat" class="flex lg12 md12 sm12 xs12">
            <GoaTInput />
          </div>
          <div class="flex lg12 md12 sm12 xs12">
            <PublicationsInput />
          </div>
          <div class="flex lg12 md12 sm12 xs12">
            <LocalNamesInput />
          </div>
        </div>
        <div class="row justify-space-between">
          <div class="flex">
            <VaButton @click="resetForm" color="danger">Reset</VaButton>
          </div>
          <div class="flex">
            <VaButton @click="handleSubmit">Submit</VaButton>
          </div>
        </div>
      </VaInnerLoading>
    </div>
  </div>

</template>
<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue'
import { useToast } from 'vuestic-ui'
import { useOrganismStore } from '../../stores/organism-store'
import TaxidInput from '../../components/cms/TaxidInput.vue'
import ImagesInput from '../../components/cms/ImagesInput.vue'
import GoaTInput from '../../components/cms/GoaTInput.vue'
import MetadataInput from '../../components/cms/MetadataInput.vue'
import PublicationsInput from '../../components/cms/PublicationsInput.vue'
import LocalNamesInput from '../../components/cms/LocalNamesInput.vue'
import AuthService from '../../services/AuthService'
import { AppConfig, OrganismForm } from '../../data/types'
import { useRouter } from 'vue-router'
import { AxiosError } from 'axios'
import Header from '../../components/cms/Header.vue'
import ItemService from '../../services/CommonService'


const appConfig = inject('appConfig') as AppConfig
const isLoading = ref(false)
const props = defineProps<{
  taxid?: string
}>()
const description = computed(() => props.taxid && organismStore.organismForm.scientific_name ? `Edit ${organismStore.organismForm.scientific_name}` : 'Create a new organism, start by typing the scientific name or the NCBI taxonomic identifier')

const hasGoat = computed(() => appConfig.general.goat)

const router = useRouter()
const organismStore = useOrganismStore()
const { init } = useToast()

watch(() => props.taxid, () => {
  resetForm()
})

onMounted(async () => {
  resetForm()
  if (props.taxid === undefined) return
  try {
    const { data } = await ItemService.getItem('organisms', props.taxid)

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
    organismStore.organismForm.metadata = { ...Object.fromEntries(metadataList.map(({ key, value }) => [key, value])) }
    if (images.length > 0) {
      organismStore.organismForm.image_urls = [...images.filter(({ value }) => value).map(({ value }) => value)]
    } else {
      organismStore.organismForm.image_urls = []
    }
    if (publications.length) {
      organismStore.organismForm.publications = [...publications.filter(({ id }) => id)]
    } else {
      organismStore.organismForm.publications = []
    }
    if (vernacularNames.length > 0) {
      organismStore.organismForm.common_names = [...vernacularNames.filter(({ value }) => value)]
    } else {
      organismStore.organismForm.common_names = []
    }
    if (props.taxid) {
      const { data } = await AuthService.updateOrganism(props.taxid, organismStore.organismForm)
      init({ message: 'Organism updated!', color: 'success' })
      router.push({ name: 'cms-items', params: { model: 'organisms' } })

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