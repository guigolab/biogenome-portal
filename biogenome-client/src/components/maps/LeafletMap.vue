<template>
  <va-card>
    <div ref="mapRef" style="padding: 0;margin: 0;" class="leaflet-map fill-height">
    </div>
    <div v-show="false">
      <div class="organism-card" ref="organismCard">
        <OrganismCard :organism="selectedOrganism" :key="selectedTaxid" />
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
import OrganismService from '../../services/clients/OrganismService'
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = Leaflet.icon({
  iconUrl: icon,
  shadowUrl: iconShadow
});

Leaflet.Marker.prototype.options.icon = DefaultIcon;

const props = defineProps({
  coordinates: Array,
})
const mapRef = ref()
const organismCard = ref()
const clicked = ref(false)
const selectedTaxid = ref('')
const selectedOrganism = ref({})
onMounted(() => {
  const map = Leaflet.map(mapRef.value)
  map.fitWorld()
  const markerCluster = new MarkerClusterGroup()
  const bounds = new Leaflet.LatLngBounds(props.coordinates?.map(({ latitude, longitude }) => [latitude, longitude]))
  Leaflet.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)

  props.coordinates.forEach(({ latitude, longitude, id, taxid, image }) => {
    const marker = Leaflet.marker([latitude, longitude], { title: id, taxid: taxid })
    if (image) {
      const icon = new Leaflet.Icon({
        iconUrl: image,
        iconSize: [66, 66],
        className: 'organism-avatar'
      })
      marker.options.icon = icon
    }
    marker.off('click', marker.openPopup)
    marker.on('click', async (event) => {
      clicked.value = false
      if (!event.target.options) return
      const { data } = await OrganismService.getOrganism(taxid)
      selectedOrganism.value = { ...data }
      selectedTaxid.value = taxid
      if (selectedTaxid.value) {
        clicked.value = true
        marker.bindPopup(() => organismCard.value, { closeButton: false, className: 'organism-popup flex', minWidth: 300, maxHeight:150 })
        marker.togglePopup()
      }
    })


    markerCluster.addLayer(marker)
  })
  map.addLayer(markerCluster)
  map.fitBounds(bounds)
})



</script>
<style>
.organism-avatar {
  border-radius: 25%;
}

.leaflet-popup-content {
  margin: 0 !important;
}
</style>
