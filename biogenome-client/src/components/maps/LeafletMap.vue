<template>
  <va-card>
    <div ref="mapRef" style="padding: 0;margin: 0;" class="leaflet-map fill-height">
    </div>
    <div v-show="false">
      <div class="organism-card" ref="organismCard">
        <Suspense v-if="selectedTaxid">
          <template #fallback>
            <va-skeleton height="150px" />
          </template>
          <OrganismCard :taxid="selectedTaxid" :key="selectedTaxid" />
        </Suspense>
      </div>
    </div>
  </va-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import OrganismCard from '../../components/organism/OrganismCard.vue'
import 'leaflet-map'
import 'leaflet/dist/leaflet.css'
import * as Leaflet from 'leaflet'
import { MarkerClusterGroup } from 'leaflet.markercluster'
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { OrganismCoordinates } from '../../data/types'

const DefaultIcon = Leaflet.icon({
  iconUrl: icon,
  shadowUrl: iconShadow
});

Leaflet.Marker.prototype.options.icon = DefaultIcon;

const props = defineProps<{
  coordinates: OrganismCoordinates[]
}>()

const mapRef = ref()
const organismCard = ref()
const clicked = ref(false)
const selectedTaxid = ref<string | null>(null)

onMounted(() => {
  const map = Leaflet.map(mapRef.value)
  const markerCluster = new MarkerClusterGroup()
  const bounds = new Leaflet.LatLngBounds(props.coordinates?.map(({ latitude, longitude }) => [latitude, longitude]))
  Leaflet.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)

  props.coordinates.forEach(({ latitude, longitude, id, taxid, image }) => {
    const marker = Leaflet.marker([latitude, longitude], { title: id, taxid: taxid })
    if (image) marker.options.icon = setIcon(image)
    marker.bindPopup(() => organismCard.value, { closeButton: false, className: 'organism-popup flex', minWidth: 300, maxHeight: 65 })
    marker.on('click', async (event) => {
      selectedTaxid.value = taxid
    })
    markerCluster.addLayer(marker)
  })
  map.addLayer(markerCluster)
  map.fitBounds(bounds)
  map.fitWorld()
})

function setIcon(image: string) {
  return new Leaflet.Icon({
    iconUrl: image,
    iconSize: [66, 66],
    className: 'organism-avatar'
  })
}


</script>
<style>
.organism-avatar {
  border-radius: 25%;
}

.leaflet-popup-content {
  margin: 0 !important;
}
</style>
