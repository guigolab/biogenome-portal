<template>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'local_samples' }" label="localSamples" />
      <va-breadcrumbs-item
        v-if="router.currentRoute.value.name === 'localSample'"
        active
        :label="router.currentRoute.value.params.id"
      />
    </va-breadcrumbs>
    <va-divider />
    <div v-if="showData">
      <div class="row row-equal justify-space-between">
        <div class="flex">
          <h1 class="va-h1">{{ localSample.local_id }}</h1>
          <div class="row align-center">
            <div class="flex">
              <va-button :to="{ name: 'organism', params: { taxid: localSample.taxid } }" preset="primary" icon="pets">{{
                localSample.scientific_name
              }}</va-button>
            </div>
          </div>
        </div>
      </div>
      <div class="row row-equal">
        <div
          v-if="localSample.location && localSample.location.coordinates"
          class="flex lg12 md12 sm12 xs12"
        >
          <va-card style="min-height: 300px">
            <LeafletMap
              :coordinates="[{latitude: Number(localSample.location.coordinates[1]),longitude: Number(localSample.location.coordinates[0]), id: localSample.accession, taxid: localSample.taxid }]"
            />
          </va-card>
        </div>
        <div class="flex lg12 md12 sm12 xs12">
          <va-card-title>metatada</va-card-title>
          <va-card-content>
            <Metadata :metadata="localSample.metadata" />
          </va-card-content>
        </div>
      </div>
    </div>
    <div v-else-if="error">
      <h3 class="va-h3">
        {{ error }}
      </h3>
    </div>
  </template>
  <script setup lang="ts">
    import { onMounted, ref, watch } from 'vue'
    import { AxiosResponse } from 'axios'
    import Metadata from '../../components/ui/Metadata.vue'
    import LeafletMap from '../../components/maps/LeafletMap.vue'
    import { useRouter } from 'vue-router'
    import LocalSampleService from '../../services/clients/LocalSampleService'

    const router = useRouter()
    const showData = ref(false)
    const error = ref('')
    const props = defineProps({
      id: String,
    })
  
    watch(
      () => props.id,
      async (value) => {
        try {
          showData.value = false
          getLocalSample(await LocalSampleService.getLocalSample(props.id))
          showData.value = true
        } catch (e) {
            if(e.response){
                error.value = props.id + ' ' + e.response.data.message
            }
          showData.value = false
        }
      },
    )
    const localSample = ref({})
    onMounted(async () => {
      try {
        getLocalSample(await LocalSampleService.getLocalSample(props.id))
        showData.value = true
      } catch (e) {
        if(e.response){
            error.value = props.id + ' ' + e.response.data.message
        }
        showData.value = false
      }
    })
    function getLocalSample({ data }: AxiosResponse) {
      localSample.value = { ...data }
    }
  </script>
  
  <style lang="scss">
    .chart {
      height: 400px;
    }
    .row-equal .flex {
      .va-card {
        height: 100%;
      }
    }
    .va-card {
      margin-bottom: 0 !important;
      &__title {
        display: flex;
        justify-content: space-between;
      }
    }
  
    .list__item + .list__item {
      margin-top: 10px;
    }
  </style>
  