<template>
  <div>
    <h1 class="va-h1">{{ t('maps.countries.title') }}</h1>
    <p class="va-text-secondary">{{ t('maps.countries.description') }}</p>
    <va-divider />
    <VaSplit class="split-demo" :limits="[10, 10]">
      <template #start>
        <div style="position: relative;height: 100%;">
          <div style="position: absolute;z-index: 1;width: 100%;height: 100%;">
            <div ref="cesium" class="cesium-container">
            </div>
          </div>
        </div>
      </template>
      <template #end>
        <div style="position: relative;height: 100%;">
          <div style="position: absolute;width: 100%;height: 100%;">
            <!-- <OrganismsCountryCard :country="selectedCountry" v-if="showDetails" /> -->
          </div>
        </div>
      </template>
    </VaSplit>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as Cesium from 'cesium'
import StatisticsService from '../../services/clients/StatisticsService'
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow'
import { useI18n } from 'vue-i18n'
// import OrganismsCountryCard from '../../components/ui/OrganismsCountryCard.vue'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui/web-components'

const { init } = useToast()
const { t } = useI18n()

const accessToken = import.meta.env.VITE_CESIUM_TOKEN

const cesium = ref()
const showDetails = ref(false)

let source = new Cesium.GeoJsonDataSource()

const initSelectedCountry = {
  id: '',
  name: '',
}
const selectedCountry = ref({ ...initSelectedCountry })

onMounted(async () => {
  cesium.value.focus()
  if (accessToken) Cesium.Ion.defaultAccessToken = accessToken
  await getCountries()
})


async function getCountries() {
  try {
    const { data } = await StatisticsService.getModelFieldStats('organisms', 'countries')
    createCesiumMap(data)
  } catch (error) {
    const axiosError = error as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}

function createCesiumMap(data: Record<string, number>) {

  const viewer = new Cesium.Viewer(cesium.value, { timeline: false, animation: false, infoBox: false })

  viewer.selectedEntityChanged.addEventListener(eventListener)

  viewer.dataSources.add(source)

  const worldCountries = { ...am5geodata_worldLow }

  worldCountries.features = [...am5geodata_worldLow.features
    .filter((ft) => ft.id && typeof ft.id === 'string' && Object.keys(data).includes(ft.id))]

  source.load(worldCountries).then((dataSource) => {
    viewer.dataSources.add(dataSource)
  })
}

const eventListener = (selectedEntity: Cesium.Entity) => {
  if (Cesium.defined(selectedEntity) && selectedEntity.name) {
    selectedCountry.value.name = selectedEntity.name
    showDetails.value = true
    const countryId = am5geodata_worldLow.features.find((ft) => ft.properties && ft.properties.name === selectedEntity.name)?.id
    if (countryId && typeof countryId === 'string') selectedCountry.value.id = countryId
  } else {
    showDetails.value = false
    selectedCountry.value = { ...initSelectedCountry }
  }
}

</script>
<style lang="scss" scoped>
.cesium-container {
  height: 100%;
  width: inherit;
  position: relative;
}

.split-demo {
  height: 100vh;
}
</style>
