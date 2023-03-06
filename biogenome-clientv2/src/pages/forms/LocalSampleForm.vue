<template>
  <p class="va-title">{{ `Local Sample ${isUpdate ? 'Update' : 'Creation'}` }}</p>
  <va-divider />
  <div v-if="!isUpdate" class="row">
    <va-inner-loading :loading="isLoading">
      <div class="flex lg6 md6 sm12 xs12">
        <va-input
          v-model="taxidInput"
          style="padding-bottom: 10px"
          label="Taxonomic identifier (NCBI)"
          placeholder="Insert a valid Taxonomic identifier"
        >
          <template #append>
            <va-button :disabled="taxidInput.length < 1" icon="search" @click="getTaxon()">Validate TAXID</va-button>
          </template>
        </va-input>
      </div>
      <div class="flex lg6 md6 sm12 xs12">
        <va-input v-model="input" style="padding-bottom: 10px" label="Local Id" placeholder="Insert a valid identifier">
          <template #append>
            <va-button :disabled="input.length < 1" icon="search" @click="getLocalSample()">Validate ID</va-button>
          </template>
        </va-input>
      </div>
    </va-inner-loading>
  </div>
  <Transition>
    <va-card
      v-if="localSampleStore.localSampleForm.local_id && localSampleStore.localSampleForm.taxid"
      stripe
      stripe-color="success"
      class="d-flex"
    >
      <va-form tag="form" @submit.prevent="handleSubmit">
        <va-card-content>
          <h2 class="va-h5">{{ localSampleStore.localSampleForm.local_id }}</h2>
          <p>{{ localSampleStore.localSampleForm.scientific_name }}</p>
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
  import AuthService from '../../services/clients/AuthService'
  import { useGlobalStore } from '../../stores/global-store'
  import LocalSampleService from '../../services/clients/LocalSampleService'
  import { useLocalSampleStore } from '../../stores/local-sample-store'
  import ENAClientService from '../../services/clients/ENAClientService'

  const taxidInput = ref('')

  const retries = ref(0)

  const localSampleStore = useLocalSampleStore()

  const globalStore = useGlobalStore()

  const props = defineProps({
    id: String,
  })

  const isUpdate = computed(() => {
    return props.id
  })

  const isLoading = ref(false)

  type Metatada = {
    key: string
    value: string
  }
  const metadataList = reactive<Metatada[]>([])

  const { init } = useToast()

  const input = ref('')

  const message = ref('')

  onMounted(async () => {
    localSampleStore.localSampleForm.local_id = props.id
    if (!isUpdate.value) return

    const { data } = await LocalSampleService.getLocalSample(props.id)

    Object.keys(data)
      .filter((k) => Object.keys(localSampleStore.localSampleForm).includes(k))
      .forEach((k) => {
        localSampleStore.localSampleForm[k] = data[k]
      })
    //parse metadata
    const parsedMetadata = Object.keys(localSampleStore.localSampleForm.metadata).map((k) => {
      return {
        key: k,
        value: localSampleStore.localSampleForm.metadata[k],
      }
    })
    if (parsedMetadata.length) {
      metadataList.push(...parsedMetadata)
    }
  })

  async function getLocalSample() {
    isLoading.value = true
    try {
      const { status } = await LocalSampleService.getLocalSample(input.value)
      if (status === 200) {
        message.value = `Local sample with name: ${input.value} already exists`
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
    localSampleStore.localSampleForm.local_id = input.value
    isLoading.value = false
  }

  async function getTaxon() {
    isLoading.value = true
    try {
      if (retries.value === 3) {
        retries.value = 0
      }
      const { data } = await ENAClientService.getTaxon(taxidInput.value)
      if (data && data.length) {
        const { tax_id, description } = data[0]
        isLoading.value = false
        localSampleStore.localSampleForm.taxid = tax_id
        localSampleStore.localSampleForm.scientific_name = description
      }
    } catch (error) {
      message.value = error.response.data.message
      init({ message: message.value, color: 'danger' })
      isLoading.value = false
    }
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
    localSampleStore.localSampleForm.metadata = { ...metadata }

    //   if(isUpdate.value){
    //     const {data} = await AuthService.updateOrganism(props.taxid, localSampleStore.organismForm)
    //     init({ message: data, color: 'success' })
    //     return
    //   }
    //     const {data} = await AuthService.createOrganism(localSampleStore.organismForm)
    //     init({ message: data, color: 'success' })
    //     return
  }
</script>
