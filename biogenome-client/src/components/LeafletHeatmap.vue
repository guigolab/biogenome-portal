<template>
  <div class="map-container">
    <div ref="mapContainer" class="leaflet-map"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import L, { Map, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat"; // Import the heatmap plugin

const props = defineProps<{
  locations: { coordinates: [number, number], count?: number }[]
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
const map = ref<Map | null>(null);
const heatLayer = ref<any>(null);

const heatmapPoints = computed(() =>
  props.locations.map(loc => [
    loc.coordinates[1], // latitude
    loc.coordinates[0], // longitude
    loc.count || 1      // intensity
  ])
);

const initMap = () => {
  if (map.value || !mapContainer.value) return;
  map.value = L.map(mapContainer.value).setView([0, 0], 2);

  const tileLayer: TileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  });
  tileLayer.addTo(map.value as any);
};

const renderHeatmap = () => {
  if (!map.value) return;
  if (heatLayer.value) {
    map.value.removeLayer(heatLayer.value);
  }
  // @ts-ignore
  heatLayer.value = L.heatLayer(heatmapPoints.value, {
    radius: 25,
    blur: 15,
    maxZoom: 10,
    gradient: {
      0.2: '#9370DB', // Medium Purple - more visible than blue
      0.4: '#32CD32', // Lime Green
      0.6: '#FFD700', // Gold
      0.8: '#FF8C00', // Dark Orange
      1.0: '#FF4500'  // Orange Red
    }
  });
  heatLayer.value.addTo(map.value);
  map.value.invalidateSize();
};

onMounted(() => {
  initMap();
  renderHeatmap();
});

watch(() => props.locations, () => {
  renderHeatmap();
});
</script>

<style scoped>
.map-container {
  position: relative;
  z-index: 100;
}
.leaflet-map {
  height: 400px;
  width: 100%;
  z-index: 99;
}
</style> 