<template>
    <div class="map-container">
        <div ref="mapContainer" class="leaflet-map"></div>
        <VaModal hide-default-actions close-button v-model="showSamples">
            <SampleListModal
                :samples="samples"
                :lat="lat"
                :lng="lng"
                @route="handleRoute"
            />
        </VaModal>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import L, { Map, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useColors } from "vuestic-ui/web-components";
import { SampleLocations } from "../data/types";
import GeoLocationService from "../services/GeoLocationService";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import SampleListModal from "./SampleListModal.vue";

const { colors } = useColors()
const router = useRouter()

const props = defineProps<{
    locations: Record<string, any>[]
    interactionDisabled?: boolean
}>()

// Refs
const locations = computed(() => props.locations)
const samples = ref<SampleLocations[]>([])
const mapContainer = ref<HTMLDivElement | null>(null);
const map = ref<Map | null>(null);
const pointsLayerGroup = ref(L.layerGroup());
const showSamples = ref(false)
const lat = ref()
const lng = ref()

watch(() => props.locations, () => {
    initMap();
    renderPoints();
})

// Initialize map on mount
onMounted(() => {
    initMap();
    renderPoints();
});

function handleRoute(route: any) {
    router.push(route)
    showSamples.value = false
}

async function getSamplesByCoords(latitude: number, longitude: number) {
    lat.value = latitude
    lng.value = longitude
    const q = `${latitude}_${longitude}`
    const { data } = await GeoLocationService.getLocation(q)
    samples.value = [...data]
}

// Initialize the Leaflet map
const initMap = () => {
    if (map.value || !mapContainer.value) return;

    map.value = L.map(mapContainer.value).setView([0, 0], 2);

    // Add OpenStreetMap tile layer
    const tileLayer: TileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    tileLayer.addTo(map.value as any);
};

// Render point markers
const renderPoints = () => {
    if (!map.value) return;
    pointsLayerGroup.value.clearLayers();
    map.value?.removeLayer(pointsLayerGroup.value as any)
    const bounds: [number, number][] = [];
    locations.value.forEach((item) => {
        const [lng, lat] = item.coordinates;
        bounds.push([lat, lng]);
        const marker = L.circleMarker([lat, lng], { color: getColor(item.count), radius: 10 });

        // Add hover event (mouseover)
        marker.on("mouseover", () => {
            marker.setStyle({
                weight: 4,
                color: colors.primary,
                fillOpacity: 1
            });
        });

        // Remove stroke on mouseout
        marker.on("mouseout", () => {
            marker.setStyle({
                weight: 2,
                color: getColor(item.count),
                fillOpacity: 0.8
            });
        });

        if (!props.interactionDisabled) {
            // Add click event
            marker.on("click", async () => {
                await getSamplesByCoords(lat, lng)
                showSamples.value = true
            });
        }

        pointsLayerGroup.value.addLayer(marker);
    });
    map.value.addLayer(pointsLayerGroup.value as any)
    map.value.invalidateSize();
    if (bounds.length > 0) {
        map.value.fitBounds(bounds, { padding: [20, 20] });
    }
};

function getColor(d: number) {
    return d > 1000 ? '#00429d' : // Dark Blue
        d > 500 ? '#2a6fdb' :   // Medium Blue
            d > 200 ? '#62a9ff' :  // Light Blue
                d > 100 ? '#80d3f7' : // Cyan
                    d > 50 ? '#bae4bc' :  // Light Green
                        d > 20 ? '#a1d99b' :  // Medium Green
                            d > 10 ? '#74c476' :  // Green
                                '#31a354';       // Dark Green
}
</script>

<style>
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