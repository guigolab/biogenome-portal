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
            <OrganismsCountryCard :country="selectedCountry" v-if="showDetails" />
          </div>
        </div>
      </template>
    </VaSplit>
    <!-- <div ref="cesium" class="cesium-container">
      <div id="infobox" ref="infobox">
        <Transition name="slide-fade">
          <OrganismsCountryCard :country="selectedCountry" v-if="showDetails" />
        </Transition>
      </div>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import * as Cesium from 'cesium'
import StatisticsService from '../../services/clients/StatisticsService'
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow'
import { useI18n } from 'vue-i18n'
import OrganismsCountryCard from '../../components/ui/OrganismsCountryCard.vue'

const { t } = useI18n()
const accessToken = import.meta.env.VITE_CESIUM_TOKEN

const cesium = ref()
const infobox = ref()

const showDetails = ref(false)

let viewer = null
let source = new Cesium.GeoJsonDataSource()

const initSelectedCountry = {
  id: '',
  color: '',
  name: '',
  organisms: [],
  total: 0,
}
const selectedCountry = ref({ ...initSelectedCountry })
const colorHash = reactive({})

onMounted(async () => {
  cesium.value.focus()
  if (accessToken) Cesium.Ion.defaultAccessToken = accessToken
  viewer = new Cesium.Viewer(cesium.value, { timeline: false, animation: false, infoBox: false })
  await getCountries(viewer)
})


async function getCountries(viewer: Cesium.Viewer) {
  const { data } = await StatisticsService.getModelFieldStats('organisms', 'countries')

  viewer.selectedEntityChanged.addEventListener((selectedEntity: Cesium.Entity) => {
    if (Cesium.defined(selectedEntity)) {
      const color = colorHash[selectedEntity.name]
      selectedCountry.value.name = selectedEntity.name
      selectedCountry.value.color = color.toCssHexString()
      showDetails.value = true

      const worldCountries = { ...am5geodata_worldLow }
      selectedCountry.value.id = worldCountries.features.find((ft) => ft.properties.name === selectedEntity.name)?.id
    } else {
      showDetails.value = false
      selectedCountry.value = { ...initSelectedCountry }
    }
  })

  viewer.dataSources.add(source)
  const worldCountries = { ...am5geodata_worldLow }
  worldCountries.features = worldCountries.features.filter((ft) => Object.keys(data).includes(ft.id))

  worldCountries.features.forEach((ft) => {
    ft.properties.organisms = data[ft.id]
  })

  source.load(worldCountries).then((dataSource) => {
    viewer.dataSources.add(dataSource)
    const entities = dataSource.entities.values
    entities.forEach((entity) => {
      const name = entity.name
      let color = colorHash[name]
      if (!color) {
        color = Cesium.Color.fromRandom({ alpha: 1.0 })
        colorHash[name] = color
      }
      entity.polygon.material = color
      // entity.polygon.outline = false
      // entity.polygon.extrudedHeight = entity.properties.oganisms * 1000
    })
  })
}

</script>
<style lang="scss" scoped>
#infobox {
  display: block;
  position: absolute;
  top: 50px;
  z-index: 2;
  width: 300px;
  right: 0;
  overflow: scroll;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.cesium-container {
  height: 100%;
  width: inherit;
  position: relative;
}

.list__item+.list__item {
  margin-top: 20px;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.row-equal .flex {
  .va-card {
    height: 100%;
  }
}

/* Extra small devices (phones, 600px and down) */
@media only screen and (max-width: 600px) {
  #infobox {
    width: 100%;
  }
}

/* Small devices (portrait tablets and large phones, 600px and up) */
@media only screen and (min-width: 600px) {
  #infobox {
    width: 100%;
  }
}

/* Medium devices (landscape tablets, 768px and up) */
@media only screen and (min-width: 768px) {
  #infobox {
    width: 60%;
  }
}

/* Large devices (laptops/desktops, 992px and up) */
@media only screen and (min-width: 992px) {
  #infobox {
    width: 40%;
  }
}

/* Extra large devices (large laptops and desktops, 1200px and up) */
@media only screen and (min-width: 1200px) {
  #infobox {
    width: 30%;
  }
}

.split-demo {
  height: 100vh;
}
</style>
