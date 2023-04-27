<template>
  <p class="va-title">{{t('countriesMap')}}</p>
  <va-divider />
  <div ref="cesium" class="cesium-container">
    <div id="infobox" ref="infobox">
      <Transition name="slide-fade">
        <va-card v-if="showDetails" stripe :stripe-color="selectedCountry.color">
          <va-card-title>
            <div class="row justify-space-between align-center">
              <div class="flex">
                {{ selectedCountry.name }}
              </div>
              <div class="flex">
                <div class="row align-center">
                  <div class="flex">
                    <va-button
                      preset="plain"
                      :disabled="pagination.offset - pagination.limit < 0"
                      size="small"
                      icon="chevron_left"
                      @click="handlePagination(pagination.offset - pagination.limit)"
                    />
                  </div>
                  <div class="flex">
                    {{ pagination.offset + 1 }}-{{
                      pagination.limit > selectedCountry.total
                        ? selectedCountry.total
                        : pagination.limit + pagination.offset > selectedCountry.total
                        ? selectedCountry.total
                        : pagination.limit + pagination.offset
                    }}
                    of {{ selectedCountry.total }}
                  </div>
                  <div class="flex">
                    <va-button
                      preset="plain"
                      :disabled="pagination.offset + pagination.limit > selectedCountry.total"
                      size="small"
                      icon="chevron_right"
                      @click="handlePagination(pagination.offset + pagination.limit)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </va-card-title>
          <va-card-content style="max-height: 50vh; overflow: scroll">
            <va-list>
              <va-list-item
                v-for="(organism, index) in selectedCountry.organisms"
                :key="index"
                tag="li"
                :to="{ name: 'organism', params: { taxid: organism.taxid } }"
                class="list__item"
              >
                <va-list-item-section avatar>
                  <va-avatar>
                    <img :src="organism.image" size="large" />
                  </va-avatar>
                </va-list-item-section>

                <va-list-item-section>
                  <va-list-item-label>
                    {{ organism.scientific_name }}
                  </va-list-item-label>

                  <va-list-item-label caption>
                    {{ organism.insdc_common_name }}
                  </va-list-item-label>
                </va-list-item-section>
                <va-list-item-section v-if="hasINSDCData(organism)" icon>
                  <div v-if="organism.biosamples.length" style="padding: 5px">
                    <va-icon style="padding;:5px" name="fa-vial" color="background-tertiary" size="small" />
                  </div>
                  <div v-if="organism.experiments.length" style="padding: 5px">
                    <va-icon name="fa-file-lines" color="background-tertiary" size="small" />
                  </div>
                  <div v-if="organism.assemblies.length" style="padding: 5px">
                    <va-icon name="fa-dna" color="background-tertiary" size="small" />
                  </div>
                </va-list-item-section>
              </va-list-item>
            </va-list>
          </va-card-content>
        </va-card>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import * as Cesium from 'cesium'
  import StatisticsService from '../../services/clients/StatisticsService'
  import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow'
  import OrganismService from '../../services/clients/OrganismService'
  import { useI18n } from 'vue-i18n'
      
  const { t } = useI18n()
  
  const accessToken = import.meta.env.VITE_CESIUM_TOKEN

  const cesium = ref(null)
  const infobox = ref(null)
  const showDetails = ref(false)
  let viewer = null
  var source = new Cesium.GeoJsonDataSource()
  const initSelectedCountry = {
    id: '',
    color: '',
    name: '',
    organisms: [],
    total: 0,
  }
  const initPagination = {
    limit: 20,
    offset: 0,
  }
  const pagination = ref({ ...initPagination })

  const selectedCountry = ref({ ...initSelectedCountry })
  const colorHash = reactive({})

  onMounted(async () => {
    const { data } = await StatisticsService.getModelFieldStats('organisms', { field: 'countries' })
    cesium.value.focus()
    if (accessToken) Cesium.Ion.defaultAccessToken = accessToken
    viewer = new Cesium.Viewer(cesium.value, { timeline: false, animation: false, infoBox: false })

    viewer.selectedEntityChanged.addEventListener((selectedEntity: Cesium.Entity) => {
      pagination.value = { ...initPagination }
      if (Cesium.defined(selectedEntity)) {
        const color = colorHash[selectedEntity.name]
        selectedCountry.value.name = selectedEntity.name
        selectedCountry.value.color = color.toCssHexString()

        const worldCountries = { ...am5geodata_worldLow }
        selectedCountry.value.id = worldCountries.features.find((ft) => ft.properties.name === selectedEntity.name)?.id
        OrganismService.getOrganisms({ country: selectedCountry.value.id, ...pagination.value }).then(({ data }) => {
          selectedCountry.value.organisms = [...data.data]
          selectedCountry.value.total = data.total
          showDetails.value = true
        })
      } else {
        showDetails.value = false
        selectedCountry.value = { ...initSelectedCountry }
      }
    })
    viewer.dataSources.add(source)
    const worldCountries = { ...am5geodata_worldLow }
    worldCountries.features = worldCountries.features.filter((ft) => Object.keys(data).includes(ft.id))

    worldCountries.features.forEach((ft) => {
      ft.properties.oganisms = data[ft.id]
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
        entity.polygon.outline = false
        entity.polygon.extrudedHeight = entity.properties.oganisms * 1000
      })
    })
  })
  async function handlePagination(offset: number) {
    pagination.value.offset = offset
    const { data } = await OrganismService.getOrganisms({ country: selectedCountry.value.id, ...pagination.value })
    selectedCountry.value.organisms = []
    selectedCountry.value.organisms = [...data.data]
    selectedCountry.value.total = data.total
  }

  function hasINSDCData(org) {
    return org.biosamples.length || org.experiments.length || org.assemblies.length
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
    height: 80vh;
    width: inherit;
    position: relative;
  }

  .list__item + .list__item {
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
  }}

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
</style>
