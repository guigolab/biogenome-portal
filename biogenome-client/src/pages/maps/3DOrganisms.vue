<template>
  <div>
    <p class="va-title">{{ t('menu.organismsMap') }}</p>
    <va-divider />
    <div ref="cesium" class="cesium-container">
      <div id="infobox" ref="infobox">
        <Transition name="slide-fade">
          <OrganismCard :organism="selectedOrganism" v-if="showDetails" />
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as Cesium from 'cesium'
import TaxonService from '../../services/clients/TaxonService'
import { useI18n } from 'vue-i18n'
import OrganismCard from '../../components/organism/OrganismCard.vue'
const { t } = useI18n()

const root = import.meta.env.VITE_ROOT_NODE
const accessToken = import.meta.env.VITE_CESIUM_TOKEN

const cesium = ref(null)
const infobox = ref(null)
const showDetails = ref(false)
let viewer = null

const selectedOrganism = ref(null)

onMounted(async () => {
  cesium.value.focus()
  if (accessToken) Cesium.Ion.defaultAccessToken = accessToken
  viewer = new Cesium.Viewer(cesium.value, { timeline: false, animation: false, infoBox: false })
  await getOrganisms(viewer)
})

async function getOrganisms(viewer: Cesium.Viewer) {
  const { data } = await TaxonService.getTaxonCoordinates(root)
  viewer.selectedEntityChanged.addEventListener((selectedEntity: Cesium.Entity) => {
    if (Cesium.defined(selectedEntity)) {
      selectedOrganism.value = {...selectedEntity.organism}
      showDetails.value = true
    } else {
      showDetails.value = false
    }
  })
  data.forEach((organism) => {
    organism.locations.forEach((tuple) => {
    const image = organism.image ? organism.image : null
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(tuple[0], tuple[1]),
        label: {
          text: organism.scientific_name,
          heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND,
          verticalOrigin: Cesium.VerticalOrigin.TOP
        },
        billboard:{
          image:image,
          height:65,
          width:65,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: Cesium.Cartesian2.ONE,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
        },
        ...organism
      })
    })
  })
  viewer.zoomTo(viewer.entities)
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
</style>
