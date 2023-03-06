<template>
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
            <va-list fit>
              <va-list-item v-for="(organism, index) in selectedCountry.organisms" :key="index" class="list__item">
                <va-list-item-section avatar>
                  <va-avatar>
                    <img :src="organism.image" />
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
              </va-list-item>
            </va-list>
          </va-card-content>
        </va-card>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref, watch } from 'vue'
  import * as Cesium from 'cesium'
  import StatisticsService from '../../services/clients/StatisticsService'
  import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow'
  import OrganismService from '../../services/clients/OrganismService'
  import BioProjectService from '../../services/clients/BioProjectService'

  const accessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YWRkOTdlNy03ZDkzLTQwMWYtYWZmNC05MWNmMWM3NThlMGIiLCJpZCI6MTAyNjI1LCJpYXQiOjE2NTkwMDUzMTF9.2hswNBgOjEve43OMrT1ouf_l9nTBqRvf8RT9FgSCJCA'

  const cesium = ref(null)
  const infobox = ref(null)
  const showDetails = ref(false)
  let viewer = null
  var source = new Cesium.GeoJsonDataSource()
  const props = defineProps({
    accession: String,
  })
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

  watch(
    () => props.accession,
    async () => {
      if (source) source.entities.removeAll()

      createEntities()
    },
  )
  onMounted(async () => {
    if (accessToken) Cesium.Ion.defaultAccessToken = accessToken
    viewer = new Cesium.Viewer(cesium.value, { timeline: false, animation: false, infoBox: false })

    createEntities()
    //   updateSource(props.geojson)
  })
  async function handlePagination(offset: number) {
    pagination.value.offset = offset
    const { data } = await OrganismService.getOrganisms({
      country: selectedCountry.value.id,
      bioproject: props.accession,
      ...pagination.value,
    })
    selectedCountry.value.organisms = [...data.data]
    selectedCountry.value.total = data.total
  }

  async function createEntities() {
    const { data } = await BioProjectService.getBioprojectCountries(props.accession)
    viewer.selectedEntityChanged.addEventListener((selectedEntity: Cesium.Entity) => {
      pagination.value = { ...initPagination }
      if (Cesium.defined(selectedEntity)) {
        const color = colorHash[selectedEntity.name]
        selectedCountry.value.name = selectedEntity.name
        selectedCountry.value.color = color.toCssHexString()

        const worldCountries = { ...am5geodata_worldLow }
        selectedCountry.value.id = worldCountries.features.find((ft) => ft.properties.name === selectedEntity.name)?.id
        OrganismService.getOrganisms({
          country: selectedCountry.value.id,
          bioproject: props.accession,
          ...pagination.value,
        }).then(({ data }) => {
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
  }
  // onBeforeUnmount(() => {
  //     if(viewer){
  //         viewer.entities.removeAll()
  //         viewer.destroy()
  //     }
  // })
</script>
<style scoped>
  #infobox {
    display: block;
    position: absolute;
    top: 50px;
    z-index: 2;
    width: 40%;
    max-width: 480px;
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
</style>
