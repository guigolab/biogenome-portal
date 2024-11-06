<template>
  <div>
    <h1 class="va-h1">{{ t('maps.countries.title') }}</h1>
    <p>{{ t('maps.countries.description') }}</p>
    <div class="row">
      <div class="flex">
        <VaButton :disabled="!showDetails" @click="showDetails = !showDetails"> Show Map </VaButton>
      </div>
    </div>
    <div class="content-row">
      <div :class="['map-container', { 'full-width': !showDetails }]">
        <div ref="cesium" class="cesium-container">
        </div>
      </div>
      <div :class="['details-container', { 'hidden': !showDetails }]">
        <VaCard :key="selectedCountry.id">
          <VaCardContent>
            <h2 class="va-h2 m-0"> {{ selectedCountry.name }} </h2>
          </VaCardContent>
          <VaDivider class="m-0" />
          <VaCardContent>
            <Items :key="'country'" :model="'organisms'" />
          </VaCardContent>
        </VaCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vuestic-ui/web-components'
import Items from '../common/Items.vue'
import { useItemStore } from '../../stores/items-store'
import { AxiosError } from 'axios'
import StatisticsService from '../../services/clients/StatisticsService'


const { init } = useToast()
const { t } = useI18n()
const itemStore = useItemStore()

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
  itemStore.currentModel = 'organisms'
  cesium.value.focus()
  if (accessToken) Cesium.Ion.defaultAccessToken = accessToken
  await getCountries()
})


async function getCountries() {
  try {
    const { data } = await StatisticsService.getModelFieldStats('organisms', 'countries')
    createCesiumMap(data)
  } catch (error) {
    console.error(error)
    const axiosError = error as AxiosError
    init({ message: axiosError.message, color: 'danger' })
  }
}

onUnmounted(() => {
  console.log('Unmounting')
  itemStore.resetSearchForm()
  console.log(itemStore.stores[itemStore.currentModel].searchForm)
})

function createCesiumMap(data: Record<string, number>) {

  const viewer = new Cesium.Viewer(cesium.value, {
    geocoder: false,
    infoBox: false,
    homeButton: false,
    fullscreenButton: false,
    vrButton: false,
    navigationHelpButton: false,
    timeline: false,
    animation: false
  })

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
    if (countryId && typeof countryId === 'string') {
      selectedCountry.value.id = countryId
      itemStore.country = countryId
      itemStore.view = 'table'
    }
  } else {
    showDetails.value = false
    selectedCountry.value = { ...initSelectedCountry }
  }
}

</script>
<style scoped>
.cesium-container {
  height: min(750px, 80vh);
}

.content-row {
  display: flex;
  flex-wrap: wrap;
  min-width: 0;
  width: 100%;
  flex-direction: row;
}

.details-container {
  flex: 0 0 50%;
  max-width: 50%;
  transition: all 0.7s ease;
  overflow: hidden;
}

.details-container.hidden {
  flex: 0 0 0%;
  max-width: 0;
  transform: translateX(100%);
}

.map-container {
  flex: 1;
  max-width: 50%;
  transition: all 0.7s ease;
}

.map-container.full-width {
  flex: 1 1 100%;
  max-width: 100%;
}

@media (max-width: 820px) {
  .details-container {
    flex: 0 0 100%;
    max-width: 100%;
    transition: all 0.7s ease;
    transform: translateX(0);
  }

  .map-container {
    flex: 1;
    max-width: 0;
    transition: all 0.7s ease;
  }

  .details-container.hidden {
    display: none;
  }
}

@media (max-width: 480px) {
  .details-container {
    flex: 0 0 100%;
    max-width: 100%;
    transform: translateX(0);
  }

  .details-container.hidden {
    display: none;
  }
}
</style>
