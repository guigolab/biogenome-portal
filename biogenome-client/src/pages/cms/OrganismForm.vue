<template>
  <Header :title="title" :description="description" />
  <VaInnerLoading :loading="isLoading">
    <VaForm ref="organismForm">
      <div v-if="!taxid" class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <VaCard>
            <VaCardContent>
              <h2 class="va-h6">
                Organism Creation
              </h2>
              <p class="va-text-secondary">
                Type a valid organism name or taxid, the organism validation will be performed against the NCBI and/or EBI databases
              </p>
            </VaCardContent>
            <VaCardContent>
              <OrganismSelection @selected="handleSelection" isOrganismCreation/>
            </VaCardContent>
          </VaCard>
        </div>
      </div>
      <div v-if="organismStore.organismForm.taxid" class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <div class="row row-equal">
            <div class="flex lg12 md12 sm12 xs12">
              <ImagesInput />
            </div>
            <div class="flex lg12 md12 ms12 xs12">
              <VaCard>
                <VaCardContent>
                  <h2 class="va-h6">
                    Sub Project, PI or Entity
                  </h2>
                  <p class="va-text-secondary">
                    Name of the PI or Entity responsible of the organism
                  </p>
                </VaCardContent>
                <VaCardContent>
                  <div class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                      <VaInput :rules="[(v: string) => Boolean(v) || 'Field is mandatory']"
                        v-model="organismStore.organismForm.sub_project" />
                    </div>
                  </div>
                </VaCardContent>
              </VaCard>
            </div>
            <div class="flex lg12 md12 ms12 xs12">
              <VaCard>
                <VaCardContent>
                  <h2 class="va-h6">
                    Sequencing Type
                  </h2>
                  <p class="va-text-secondary">
                    Select the sequencing type
                  </p>
                </VaCardContent>
                <VaCardContent>
                  <div class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                      <VaSelect v-model="organismStore.organismForm.sequencing_type" multiple
                        :options="sequencingOptions" />
                    </div>
                  </div>
                </VaCardContent>
              </VaCard>
            </div>
            <div v-if="hasGoat" class="flex lg12 md12 sm12 xs12">
              <GoaTInput />
            </div>
            <div class="flex lg12 md12 sm12 xs12">
              <MetadataInput />
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
        </div>
      </div>
    </VaForm>
  </VaInnerLoading>
</template>
<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { useForm, useToast } from 'vuestic-ui'
import { useOrganismStore } from '../../stores/organism-store'
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
import OrganismSelection from '../../components/cms/OrganismSelection.vue'


const sequencingOptions = ['ONT (Long Reads)', 'PACBIO (Long Reads)', 'Illumina (Short Reads)', 'RNAseq (Transcriptomics)', 'Isoseq (Transcriptomics)', 'HIC (Scaffolding)', 'OmniC (Scaffolding)', 'Other']
const appConfig = inject('appConfig') as AppConfig
const isLoading = ref(false)
const props = defineProps<{
  taxid?: string
}>()

const { validate, errorMessages,validateAsync } = useForm('organismForm')
const title = computed(() => props.taxid ? `Edit ${organismStore.organismForm.scientific_name}` : 'Create a new organism')
const description = computed(() => props.taxid && organismStore.organismForm.scientific_name ? `Editing organism ${organismStore.organismForm.scientific_name}` : 'Create a new organism')

const hasGoat = computed(() => appConfig.general.goat)

const router = useRouter()
const organismStore = useOrganismStore()
const { init } = useToast()

watch(() => props.taxid, async () => {
  resetForm()
  if (props.taxid === undefined) return
  await getOrganism(props.taxid)
},{immediate: true})

function handleSelection(payload: { scientificName: string, taxId: string }) {
  const { scientificName, taxId } = payload
  organismStore.organismForm.scientific_name = scientificName
  organismStore.organismForm.taxid = taxId
}


async function getOrganism(taxid: string) {
  try {
    const { data } = await ItemService.getItem('organisms', taxid)

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
    const axiosError = error as AxiosError
    if (axiosError.response?.status === 404) {
      init({ message: 'Organism not found, please create a new organism', color: 'warning' })
    } else {
      init({ message: 'Impossible to get organism', color: 'danger' })
    }
  }

}

async function handleSubmit() {
  if (!await validateAsync()) {
    init({ message: 'Fill the required fields', color: 'danger' })
    return
  }
  try {
    isLoading.value = true
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
      router.push({ name: 'cms-items', params: { model: 'organisms' } })

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