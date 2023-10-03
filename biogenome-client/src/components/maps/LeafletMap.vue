<template>
  <va-card style="height: 100%;">
    <div ref="mapRef" style="padding: 0;margin: 0;" class="leaflet-map fill-height">
    </div>
    <div v-show="false">
      <div  class="organism-card" ref="organismCard">
        <Suspense v-if="selectedSample?.sample_accession">
          <template #fallback>
            <va-skeleton height="150px" />
          </template>
          <SampleCard :selectedSample="selectedSample" :key="selectedSample.sample_accession" />
        </Suspense>
      </div>
    </div>
  </va-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import 'leaflet-map'
import 'leaflet/dist/leaflet.css'
import * as Leaflet from 'leaflet'
import { MarkerClusterGroup } from 'leaflet.markercluster'
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { SampleLocations } from '../../data/types'
import SampleCard from '../ui/SampleCard.vue'
const DefaultIcon = Leaflet.icon({
  iconUrl: icon,
  shadowUrl: iconShadow
});

Leaflet.Marker.prototype.options.icon = DefaultIcon;

const props = defineProps<{
  coordinates: SampleLocations[]
}>()



const mapRef = ref()
const organismCard = ref()
const selectedSample = ref<{
  sample_accession: string
  is_local_sample: boolean
  image?: string
} | null>(null)

onMounted(() => {
  const map = Leaflet.map(mapRef.value).fitWorld()
  const markerCluster = new MarkerClusterGroup()
  if(!props.coordinates.length) return
  const bounds = new Leaflet.LatLngBounds(props.coordinates?.map(({ coordinates }) => [coordinates.coordinates[1], coordinates.coordinates[0]]))
  Leaflet.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)

  // Batch the markers for better performance
  const markersToAdd: Leaflet.Marker[] = [];
  props.coordinates.forEach(({ coordinates, sample_accession, image, is_local_sample }) => {
    console.log(coordinates)
    const marker = Leaflet.marker([coordinates.coordinates[1], coordinates.coordinates[0]], {
      title: sample_accession
    });

    if (image) {
      marker.options.icon = setIcon(image);
    }

    marker.bindPopup(() => organismCard.value, {
      closeButton: false,
      className: 'organism-popup',
      minWidth: 300,
      maxHeight: 150,
    });

    marker.on('click', async (event) => {
      selectedSample.value = image ? { sample_accession, is_local_sample, image } : { sample_accession, is_local_sample }
    });

    markersToAdd.push(marker);
  });

  // Add markers in batches
  markerCluster.addLayers(markersToAdd);

  // Add markerCluster to the map
  map.addLayer(markerCluster);

  // Fit the map to bounds after all markers are added
  map.fitBounds(bounds);

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
