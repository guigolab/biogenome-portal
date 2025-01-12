<template>
  <Header :title="title" :description="description" />
  <TaxidInput v-if="!isUpdate" />
  <div v-if="organismStore.organismForm.taxid" class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <va-form ref="organismForm" tag="form" @submit.prevent="handleSubmit">
        <VaCard outlined bordered>
          <VaCardTitle>
            Organism Details
          </VaCardTitle>
          <VaInnerLoading :loading="isLoading">
            <va-card-content>
              <h2 class="va-h2">{{ organismStore.organismForm.scientific_name }}</h2>
              <p class="va-text-secondary">{{ organismStore.organismForm.taxid }}</p>
            </va-card-content>
            <VaDivider />
            <VaCardContent>
              <FormContainer v-for="el in componentList" :key="el.title" :title="el.title">
                <component :is="el.component" />
              </FormContainer>
            </VaCardContent>
            <VaDivider style="margin: 0;" />
            <va-card-actions align="between">
              <va-button type="reset" color="danger">Reset</va-button>
              <va-button type="submit">Submit</va-button>
            </va-card-actions>
          </VaInnerLoading>
        </VaCard>
      </va-form>
    </div>
  </div>
</template>
<script setup lang="ts">
import Header from '../components/Header.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'vuestic-ui'
import { useOrganismStore } from '../stores/organism-store'
import TaxidInput from '../components/TaxidInput.vue'
import ImagesInput from '../components/ImagesInput.vue'
import GoaTInput from '../components/GoaTInput.vue'
import MetadataInput from '../components/MetadataInput.vue'
import PublicationsInput from '../components/PublicationsInput.vue'
import LocalNamesInput from '../components/LocalNamesInput.vue'
import { OrganismForm } from '../data/types'
import { useRouter } from 'vue-router'
import { AxiosError } from 'axios'

import AuthService from '../services/AuthService'
import FormContainer from '../components/FormContainer.vue'
import ItemService from '../services/ItemService'

const title = "Organism Form"
const isLoading = ref(false)
const props = defineProps<{
  taxid?: string
}>()
const description = computed(() => props.taxid ? `Edit ${props.taxid}` : 'Create a new organism, start by typing its NCBI taxonomic identifier')


const componentList = [
  {
    title: 'Links to Images',
    component: ImagesInput,
  },
  {
    title: 'Goat Status',
    component: GoaTInput,
  },
  {
    title: 'Extra Metadata',
    component: MetadataInput,
  },
  {
    title: 'Links to Publications',
    component: PublicationsInput,
  },
  {
    title: 'Vernacular names',
    component: LocalNamesInput,
  },
]

const isUpdate = computed(() => !!props.taxid)
const router = useRouter()
const organismStore = useOrganismStore()
const { init } = useToast()

watch(() => props.taxid, () => {
  resetForm()
})

onMounted(async () => {
  resetForm()

  try {
    if (props.taxid === undefined) return
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
    if (metadataList.length > 0) {
      metadataList.filter(({ key, value }) => key).forEach(({ key, value }) => organismStore.organismForm.metadata[key] = value)
    } else {
      organismStore.organismForm.metadata = {}
    }
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
      router.push({ name: 'items', params: { model: 'organisms' } })

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
  organismStore.filter = ""
  organismStore.metadataList = []
  organismStore.publications = []
  organismStore.images = []
  organismStore.vernacularNames = []
  organismStore.resetOrganimForm()
}

</script>