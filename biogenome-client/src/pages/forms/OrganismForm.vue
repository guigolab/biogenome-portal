<template>
  <p class="va-title">{{ `Organism ${isUpdate ? 'Update' : 'Creation'}` }}</p>
  <va-divider />
  <va-inner-loading :loading="isLoading">
  <div v-if="!isUpdate" class="row">
    <div class="flex lg6 md6 sm12 xs12">
        <va-input
          v-model="input"
          style="padding-bottom: 10px"
          label="Taxonomic identifier (NCBI)"
          placeholder="Insert a valid Taxonomic identifier"
        >
          <template #append>
            <va-button :disabled="input.length < 1" type="submit" icon="search" @click="getTaxon()"
              >Search Taxon</va-button
            >
          </template>
        </va-input>
    </div>
  </div>
  <Transition>
    <va-card v-if="organismStore.organismForm.taxid" stripe stripe-color="success" class="d-flex">
      <va-form tag="form" @submit.prevent="handleSubmit">
        <va-card-content>
          <h2 class="va-h5">{{ organismStore.organismForm.scientific_name }}</h2>
          <p>taxid: {{ organismStore.organismForm.taxid }}</p>
        </va-card-content>
        <va-divider>Photos</va-divider>
        <va-card-content>
          <va-input v-model="organismStore.organismForm.image" label="avatar">
            <template #append>
              <va-icon
                :disabled="!organismStore.organismForm.image"
                color="primary"
                name="visibility"
                @click="previewAvatar = true"
              />
              <va-icon color="danger" name="delete" @click="removeAvatar" />
            </template>
          </va-input>
          <va-avatar v-show="previewAvatar" size="large" :src="organismStore.organismForm.image"> </va-avatar>
        </va-card-content>
        <va-card-content>
          <div v-for="(img, index) in images" :key="index">
            <va-input v-model="img.value" class="mt-3" :label="`Image url ${index + 1}`">
              <template #appendInner>
                <va-icon :disabled="!img.value" name="delete" color="danger" @click="images.splice(index, 1)" />
              </template>
            </va-input>
          </div>
          <va-button class="mt-3" icon="add" @click="images.push({ value: '' })">Add new image</va-button>
          <va-carousel v-if="validImages.length" height="300px" :ratio="4 / 3" :items="validImages" stateful />
        </va-card-content>
        <va-divider> GoaT Information</va-divider>
        <va-card-content>
          <va-select
            v-model="organismStore.organismForm.goat_status"
            label="Goat Status"
            :disabled="
              organismStore.organismForm.goat_status === 'INSDC Submitted' ||
              organismStore.organismForm.goat_status === 'Publication Available'
            "
            :options="goatStatusOptions"
            class="mt-3"
          >
          </va-select>
          <va-select
            v-model="organismStore.organismForm.target_list_status"
            label="Target List Status"
            :options="targetListStatusOptions"
            class="mt-3"
          >
          </va-select>
        </va-card-content>
        <va-divider>Extra Attributes</va-divider>
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
        <va-divider> Publications </va-divider>
        <va-card-content>
          <div v-for="(pub, index) in publications" :key="index" class="row">
            <div class="flex">
              <va-select
                v-model="pub.source"
                label="publication source"
                :options="['DOI', 'PubMed ID', 'PubMed CentralID']"
              ></va-select>
            </div>
            <div class="flex">
              <va-input
                v-model="pub.id"
                label="publication id"
                :messages="publicationMessages"
                :error="publications.filter((p) => p.id === pub.id).length > 1"
                :error-messages="[`Publication with ID: ${pub.id} already exists`]"
              >
              </va-input>
            </div>
            <div class="flex">
              <va-icon name="delete" color="danger" @click="publications.splice(index, 1)" />
            </div>
          </div>
          <va-button class="mt-3" icon="add" @click="publications.push({ id: '', source: '' })"
            >Add new publication</va-button
          >
        </va-card-content>
        <va-divider> Local Names </va-divider>
        <va-card-content>
          <div v-for="(name, index) in vernacularNames" :key="index" class="row">
            <div class="flex">
              <va-input v-model="name.lang" label="language" />
            </div>
            <div class="flex">
              <va-input v-model="name.locality" label="locality"> </va-input>
            </div>
            <div class="flex">
              <va-input v-model="name.value" label="value"> </va-input>
            </div>
            <div class="flex">
              <va-icon name="delete" color="danger" @click="vernacularNames.splice(index, 1)" />
            </div>
          </div>
          <va-button class="mt-3" icon="add" @click="vernacularNames.push({ value: '', lang: '', locality: '' })"
            >Add new local name</va-button
          >
        </va-card-content>
        <va-divider />
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
import { computed, onMounted, reactive, ref } from 'vue'
import ENAClientService from '../../services/clients/ENAClientService'
import OrganismService from '../../services/clients/OrganismService'
import { useToast } from 'vuestic-ui'
import { useOrganismStore } from '../../stores/organism-store'
import { CommonName, Publication } from '../../data/types'
import AuthService from '../../services/clients/AuthService'
import { useGlobalStore } from '../../stores/global-store'

const globalStore = useGlobalStore()

const props = defineProps({
  taxid: String,
})

const isUpdate = computed(() => {
  return props.taxid
})

const isLoading = ref(false)

const retries = ref(0)

const organismStore = useOrganismStore()

const previewAvatar = ref(false)

type Metatada = {
  key: string
  value: string
}

const vernacularNames = reactive<CommonName[]>([])

const publicationMessages = [
  'DOI: enter the complete string, e.g., 10.1093/nar/gks1195',
  'PubMed ID (PMID): use simple numbers, e.g., 23193287',
  'PubMed CentralID (PMCID): include the PMC prefix, e.g., PMC3531190',
]

const metadataList = reactive<Metatada[]>([])

const goatStatusOptions = ['Sample Collected', 'Sample Acquired', 'Data Generation', 'In Assembly']
const targetListStatusOptions = ['long_list', 'family_representative', 'other_priority']

const images = reactive<Record<string, string>[]>([])
const { init } = useToast()

const publications = reactive<Publication[]>([])

const input = ref('')

const message = ref('')

const validPublications = computed(() => {
  return publications.filter((pub) => pub.id)
})
const validImages = computed(() => {
  return images.map((v) => v.value).filter((url) => url)
})
const validNames = computed(() => {
  return vernacularNames.filter((n) => n.value)
})
onMounted(async () => {
  if (!isUpdate.value) return

  const { data } = await OrganismService.getOrganism(props.taxid)

  Object.keys(data)
    .filter((k) => Object.keys(organismStore.organismForm).includes(k))
    .forEach((k) => {
      organismStore.organismForm[k] = data[k]
    })
  //parse images
  const parsedImages = organismStore.organismForm.image_urls.map((url) => {
    return {
      value: url,
    }
  })
  if (parsedImages.length) {
    images.push(...parsedImages)
  }
  //parse metadata
  const parsedMetadata = Object.keys(organismStore.organismForm.metadata).map((k) => {
    return {
      key: k,
      value: organismStore.organismForm.metadata[k],
    }
  })
  if (parsedMetadata.length) {
    metadataList.push(...parsedMetadata)
  }
  //parse publications
  const parsedPublications = organismStore.organismForm.publications
  if (parsedPublications.length) {
    publications.push(...parsedPublications)
  }
  //parse local names
  const parsedNames = organismStore.organismForm.common_names
  if (parsedNames.length) {
    vernacularNames.push(...parsedNames)
  }
})

async function getTaxon() {
  isLoading.value = true
  try {
    const { status } = await OrganismService.getOrganism(input.value)
    if (status === 200) {
      message.value = `Organism with taxid: ${input.value} already exists`
      init({ message: message.value, color: 'danger' })
      isLoading.value = false
      return
    }
  } catch (error) {
    if (!error.response || !error.response.status || error.response.status !== 404) {
      message.value = `Something happened`
      init({ message: message.value, color: 'danger' })
      isLoading.value = false
    }
  }
  try {
    if (retries.value === 3) {
      retries.value = 0
    }
    const { data } = await ENAClientService.getTaxon(input.value)
    if (data && data.length) {
      const { tax_id, description } = data[0]
      isLoading.value = false
      organismStore.organismForm.taxid = tax_id
      organismStore.organismForm.scientific_name = description
    }
  } catch (error) {
    message.value = error && error.response ? error.response.data.message : 'Something went wrong'
    init({ message: message.value, color: 'danger' })
    isLoading.value = false
  }
}
async function handleSubmit() {
  //parse form data
  isLoading.value = true
  organismStore.organismForm.publications = [...validPublications.value]
  organismStore.organismForm.image_urls = [...validImages.value]
  let metadata = {}
  metadataList.forEach((m) => {
    metadata[m.key] = m.value
  })
  organismStore.organismForm.metadata = { ...metadata }
  organismStore.organismForm.common_names = [...validNames.value]

  if (isUpdate.value) {
    await AuthService.updateOrganism(props.taxid, organismStore.organismForm)
    init({ message: 'organism updated', color: 'success' })
    isLoading.value = false
    return
  }
  await AuthService.createOrganism(organismStore.organismForm)
  init({ message: 'organism created', color: 'success' })
  isLoading.value = false
  return
}

function removeAvatar() {
  ;(organismStore.organismForm.image = null), (previewAvatar.value = false)
}
</script>
