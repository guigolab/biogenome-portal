<template>
  <div class="container">
    <div v-if="showControls" class="controls">
      <div v-if="showFilterInput" class="control-item">
        <va-input @keyup.enter="search" style="min-width: 250px;" inner-label v-model="filter" label="Filter"
          placeholder="Search by name or accession">
          <template #appendInner>
            <va-icon name="search" />
          </template>
        </va-input>
      </div>

      <div v-if="showSampleTypeSelect" class="control-item">
        <va-select inner-label v-model="sampleType" label="Sample Type" :options="['local_sample', 'biosamples']" />
      </div>

      <div class="control-item">
        <va-button :loading="isLoading" :disabled="isSubmitDisabled" :round="false" @click="search">
          Submit
        </va-button>
      </div>
      <div class="control-item">
        <va-button :disabled="isLoading" :round="false" @click="reset" color="danger">
          Reset
        </va-button>
      </div>
    </div>
    <div class="map-container">
      <div ref="mapRef" class="leaflet-map fill-height"></div>
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
      </div>
      <div v-show="false">
        <div class="organism-card" ref="organismCard">
          <Suspense v-if="selectedSample?.sample_accession">
            <template #fallback>
              <va-skeleton height="150px" />
            </template>
            <SampleCard :selectedSample="selectedSample" :key="selectedSample.sample_accession" />
          </Suspense>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import 'leaflet';
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { SampleLocations } from '../../data/types'
import SampleCard from '../ui/SampleCard.vue'
import GeoLocationService from '../../services/clients/GeoLocationService'
import { models } from '../../../config.json'
import { useToast } from 'vuestic-ui'

const hasLocalSamples = computed(() => {
  return 'local_samples' in models
})

const { init } = useToast()
// Computed properties for conditions
const showControls = computed(() => !props.taxid && !props.sample_accession);
const showFilterInput = computed(() => !props.taxid);
const showSampleTypeSelect = computed(() => !props.sample_accession && hasLocalSamples.value);

// Disable button logic
const isSubmitDisabled = computed(() => {
  return (
    (!props.taxid && !filter.value) ||
    (!props.sample_accession && hasLocalSamples.value && !sampleType.value)
  )
});

const L = window['L'];

const filter = ref('')
const sampleType = ref('')
const isLoading = ref(false)
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow
});

L.Marker.prototype.options.icon = DefaultIcon;

const markerCluster = L.markerClusterGroup()
const mapRef = ref()
const map = ref()
const total = ref(0)
const limit = ref(5000)
const props = defineProps<{
  lineage?: string,
  taxid?: string,
  sample_accession?: string
}>()

const organismCard = ref()
const selectedSample = ref<{
  sample_accession: string
  is_local_sample: boolean
  image?: string
} | null>(null)

// watchEffect(async () => {
//   markerCluster.clearLayers()
// })

onMounted(async () => {
  map.value = L.map(mapRef.value, { minZoom: 2, maxZoom: 20 }).fitWorld()
  map.value.addLayer(markerCluster)

  L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map.value)
  await reset()
})



async function iterateCoordinates(offset: number, query: Record<string, any>) {
  try {
    const params = {
      offset,
      limit: limit.value,
      lineage: props.lineage,
      sample_accession: props.sample_accession,
      taxid: props.taxid,
      ...query
    }
    const { data } = await GeoLocationService.getLocations(params)
    total.value = data.total
    mapCoordinates(data.data)
    // markerCluster.addLayers(coordinates)
    const newOffset = offset + limit.value
    if (newOffset < total.value) {
      await iterateCoordinates(newOffset, query)
    }
  } catch (e) {
    console.error(e)
    isLoading.value = false
  }
}

async function search() {
  isLoading.value = true
  markerCluster.clearLayers()
  await iterateCoordinates(0, { filter: filter.value, sample_type: sampleType.value })
  fitBounds()
}

function fitBounds() {
  try {
    const bounds = markerCluster.getBounds()
    map.value.fitBounds(bounds, { maxZoom: 5 })
  } catch (error) {
    console.error(error)
    init({ message: 'Coordinates not found for value: ' + filter.value, color: 'danger' })
  } finally {
    isLoading.value = false
  }
}
async function reset() {
  filter.value = ''
  sampleType.value = ''
  isLoading.value = true
  markerCluster.clearLayers()
  await iterateCoordinates(0, {})
  fitBounds()
}

function setIcon(image: string) {
  return new L.Icon({
    iconUrl: image,
    iconSize: [66, 66],
    className: 'organism-avatar'
  })
}


function mapCoordinates(coordinates: SampleLocations[]) {
  markerCluster.addLayers(coordinates.map(({ coordinates, sample_accession, image, is_local_sample }) => {
    const marker = L.marker([coordinates.coordinates[1], coordinates.coordinates[0]], {
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

    return marker
  }))
}



</script>
<style>
.organism-avatar {
  border-radius: 25%;
}

.leaflet-popup-content {
  margin: 0 !important;
}

.container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

/* .control-item {
  flex: 1 1 auto;
  max-width: 250px;
} */

.map-container {
  flex: 1;
  position: relative;
  z-index: 100;
}

.leaflet-map {
  height: 100%;
  width: 100%;
  z-index: 99;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.spinner {
  border: 12px solid #f3f3f3;
  /* Light grey */
  border-top: 12px solid #3498db;
  /* Blue */
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
