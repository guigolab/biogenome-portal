<template>
  <div>
    <p class="va-title">{{ t('menu.organismsMap') }}</p>
    <va-divider />
    <va-inner-loading :loading="isLoading">
      <div class="row row-equal">
        <div class="flex lg12 md12 sm12 xs12">
          <va-card-content v-if="coordinates.length">
            <div style="height: 80vh" class="row row-equal">
              <div class="flex lg12 md12 sm12 xs12">
                <LeafletMap :key="counter" :coordinates="coordinates" />
              </div>
            </div>
          </va-card-content>
          <va-card-content v-else-if="errorMessage">
            <va-alert color="danger">{{ errorMessage }}</va-alert>
          </va-card-content>
        </div>
      </div>
    </va-inner-loading>
  </div>
</template>
<script setup lang="ts">
import { AxiosResponse } from 'axios'
import { onMounted, ref } from 'vue'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import OrganismService from '../../services/clients/OrganismService'
import { useLocationStore } from '../../stores/location-store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const errorMessage = ref('')
const counter = ref(0)
const isLoading = ref(false)
const locationStore = useLocationStore()

const coordinates = ref([])

onMounted(async () => {
  getCoordinates(await OrganismService.getOrganismsLocations({ ...locationStore.searchForm }))
})
function getCoordinates({ data }: AxiosResponse) {
  coordinates.value = []
  isLoading.value = true
  data.forEach((organism) => {
    organism.locations.forEach((location) => {
      const lng = location[0]
      const lat = location[1]
      const value = {
        latitude: Number(lat),
        longitude: Number(lng),
        id: organism.scientific_name,
        taxid: organism.taxid,
      }
      if (organism.image) {
        value.image = organism.image
      }
      coordinates.value.push(value)
    })
  })
  if (!coordinates.value.length) {
    errorMessage.value = 'No organisms match the query'
  }
  counter.value++
  isLoading.value = false
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

.list__item + .list__item {
  margin-top: 10px;
}
</style>
