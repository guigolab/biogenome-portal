<template>
  <p class="va-title">Organisms collected in each country</p>
  <va-divider />
  <div ref="cesium" class="cesium-container">
    <div id="infobox" ref="infobox"></div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import * as Cesium from 'cesium'
  import BioProjectService from '../../services/clients/BioProjectService'

  const accession = 'PRJNA533106'

  const accessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YWRkOTdlNy03ZDkzLTQwMWYtYWZmNC05MWNmMWM3NThlMGIiLCJpZCI6MTAyNjI1LCJpYXQiOjE2NTkwMDUzMTF9.2hswNBgOjEve43OMrT1ouf_l9nTBqRvf8RT9FgSCJCA'

  const cesium = ref(null)
  const infobox = ref(null)
  const showDetails = ref(false)

  onMounted(async () => {
    const { data } = await BioProjectService.getBioProjectCoordinates(accession)

    cesium.value.focus()

    if (accessToken) Cesium.Ion.defaultAccessToken = accessToken

    const viewer = new Cesium.Viewer(cesium.value, { timeline: false, animation: false, infoBox: false })

    viewer.dataSourceDisplay.defaultDataSource.clustering.clusterEvent.addEventListener((entities, cluster) => {
      console.log(entities)
      console.log(cluster)
    })
    // viewer.selectedEntityChanged.addEventListener((selectedEntity: Cesium.Entity) => {
    //   if (Cesium.defined(selectedEntity)) {

    //   } else {

    //   }
    // })
    data.forEach((org) => {
      org.locations.forEach((loc) => {
        const entity: Cesium.Entity = {
          name: org.scientific_name,
          position: Cesium.Cartesian3.fromDegrees(loc[0], loc[1]),
          label: {
            text: org.scientific_name,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, 32),
          },
        }
        if (org.image) {
          const billboard: Cesium.Billboard = {
            image: org.image,
            width: 64,
            height: 64,
          }
          entity.billboard = billboard
        } else {
          const point = {
            pixelSize: 5,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          }
          entity.point = point
        }
        viewer.entities.add(entity)
      })
    })

    viewer.dataSourceDisplay.defaultDataSource.clustering.clusterEvent.addEventListener(function (entities, cluster) {
      cluster.label.show = true
      cluster.label.text = entities.length.toLocaleString()
    })
    viewer.dataSourceDisplay.defaultDataSource.clustering.clusterEvent
    viewer.dataSourceDisplay.defaultDataSource.clustering.pixelRange = 5
    viewer.dataSourceDisplay.defaultDataSource.clustering.enabled = true
    // viewer.dataSourceDisplay.defaultDataSource.clustering.
    // console.log(viewer.dataSourceDisplay.defaultDataSource.clustering)
  })
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
