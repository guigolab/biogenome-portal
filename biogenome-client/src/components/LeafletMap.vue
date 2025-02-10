<template>
    <div class="map-container">
        <div ref="mapContainer" class="leaflet-map"></div>
        <VaModal hide-default-actions close-button v-model="showSamples">
            <h3 class="va-h3">{{ t('items.data.results') }} {{ samples.length }}</h3>
            <p class="light-paragraph mb-15">
                Latitude: {{ lat }}; Longitude: {{ lng }}
            </p>
            <VaDataTable sticky-header height="400px" :columns="['scientific_name', 'sample_accession']"
                :items="samples">
                <template #cell(scientific_name)="{ rowData }">
                    <VaChip flat
                        @click="handleRoute({ name: 'item', params: { model: 'organisms', id: rowData.taxid } })">
                        {{ rowData.scientific_name }}
                    </VaChip>
                </template>
                <template #cell(sample_accession)="{ rowData }">
                    <VaChip flat
                        @click="handleRoute({ name: 'item', params: { model: rowData.is_local_sample ? 'local_samples' : 'biosamples', id: rowData.sample_accession } })">
                        {{ rowData.sample_accession }}
                    </VaChip>
                </template>
            </VaDataTable>
        </VaModal>
    </div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import L, { Map, TileLayer, Control } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useColors } from "vuestic-ui/web-components";
import { SampleLocations } from "../data/types";
import GeoLocationService from "../services/GeoLocationService";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { colors } = useColors()
const { t } = useI18n()
const props = defineProps<{
    mapType: 'cloropleth' | 'points',
    locations: Record<string, any>[]
    countries: Record<string, any>[]
    selectedCountries: Record<string, any>[]
}>()

const emits = defineEmits(['countrySelected'])
// Refs
const locations = computed(() => props.locations)
const countries = computed(() => props.countries)
const samples = ref<SampleLocations[]>([])
const mapContainer = ref<HTMLDivElement | null>(null);
const map = ref<Map | null>(null);
const choroplethLayerGroup = ref(L.layerGroup());
const pointsLayerGroup = ref(L.layerGroup());
const showSamples = ref(false)
const lat = ref()
const lng = ref()
const router = useRouter()
watch(() => props.selectedCountries, () => {
    if (props.mapType === 'cloropleth') {
        renderChoropleth();
    }
});

watch(() => props.locations, () => {
    initMap();
    if (props.mapType === "cloropleth") {
        renderChoropleth();
    } else if (props.mapType === "points") {
        renderPoints();
    }
})
// Initialize map on mount
onMounted(() => {
    initMap();
    if (props.mapType === "cloropleth") {
        renderChoropleth();
    } else if (props.mapType === "points") {
        renderPoints();
    }
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

    var legend = new Control({ position: 'bottomright' });

    legend.onAdd = function (_: any) {

        var div = L.DomUtil.create('div', 'info legend'),
            grades = [0, 10, 20, 50, 100, 200, 500, 1000],
            labels = [];

        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<p> <i style="background:' + getColor.value(grades[i] + 1) + '"></i> ' +
                grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] : '+') + '</p>';
        }

        return div;
    };

    legend.addTo(map.value as any);
};

const renderChoropleth = () => {
    if (!map.value) return

    choroplethLayerGroup.value.clearLayers();

    map.value.removeLayer(choroplethLayerGroup.value as any)

    countries.value.forEach((item) => {
        const { countryId, countryName, geojson, occurrences } = item
        const existingCounty = props.selectedCountries.find(c => c.id === countryId)

        const geojsonLayer = L.geoJSON(geojson, {
            style: () => ({
                fillColor: getColor.value(occurrences),
                color: existingCounty ? colors.primary : undefined,
                weight: 4,
                opacity: 1,
                fillOpacity: 0.7,
            }),
            onEachFeature: (feature: any, layer: L.Layer) => {
                // Reset previous selection style
                // Add hover effects
                layer.on("mouseover", (e: any) => {
                    const hoveredLayer = e.target;
                    hoveredLayer.setStyle({
                        weight: 4,
                        color: colors.primary, // Highlight border color
                        fillOpacity: 0.9,
                    });

                    // Ensure styles persist across different Leaflet versions
                    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                        hoveredLayer.bringToFront();
                    }

                    const tooltipContent = `<strong>${countryName}</strong>: ${occurrences}`;
                    hoveredLayer.bindTooltip(tooltipContent, {
                        sticky: true,
                    }).openTooltip();
                });

                // Reset style on hover out
                layer.on("mouseout", (e: any) => {

                    const hoveredLayer = e.target;
                    hoveredLayer.closeTooltip();
                    if (existingCounty) return
                    geojsonLayer.resetStyle(hoveredLayer);

                });

                // Add selection logic
                layer.on("click", (e: any) => {
                    const clickedLayer = e.target;
                    if (existingCounty) {
                        geojsonLayer.resetStyle(clickedLayer);
                    } else {
                        clickedLayer.setStyle({
                            weight: 4,
                            color: colors.primary, // Selected border color
                            fillOpacity: 0.8,
                        });
                    }
                    emits('countrySelected', { id: countryId, name: countryName })
                });

            },
        });
        choroplethLayerGroup.value.addLayer(geojsonLayer);
    });
    map.value.addLayer(choroplethLayerGroup.value as any)
    map.value.invalidateSize(); // Ensure map renders correctly
};

// Render point markers
const renderPoints = () => {
    if (!map.value) return;
    pointsLayerGroup.value.clearLayers();
    map.value?.removeLayer(pointsLayerGroup.value as any)
    locations.value.forEach((item) => {
        const [lng, lat] = item.coordinates;
        const marker = L.circleMarker([lat, lng], { color: getColor.value(item.count), radius: 10 });

        // Add hover event (mouseover)
        marker.on("mouseover", () => {
            marker.setStyle({
                weight: 4, // Increase stroke width
                color: colors.primary, // Change stroke color (e.g., black)
                fillOpacity: 1 // Make it more visible
            });
        });

        // Remove stroke on mouseout
        marker.on("mouseout", () => {
            marker.setStyle({
                weight: 2, // Reset stroke width
                color: getColor.value(item.count), // Reset to original color
                fillOpacity: 0.8 // Reset opacity
            });
        });

        // Add click event
        marker.on("click", async () => {
            await getSamplesByCoords(lat, lng)
            showSamples.value = true
        });
        pointsLayerGroup.value.addLayer(marker);
    });
    map.value.addLayer(pointsLayerGroup.value as any)
    map.value.invalidateSize(); // Ensure map renders correctly

};

const getColor = computed(() => props.mapType === 'cloropleth' ? getCloroplethColor : getPointsColor)

function getCloroplethColor(d: number) {
    return d > 1000 ? '#800026' :
        d > 500 ? '#BD0026' :
            d > 200 ? '#E31A1C' :
                d > 100 ? '#FC4E2A' :
                    d > 50 ? '#FD8D3C' :
                        d > 20 ? '#FEB24C' :
                            d > 10 ? '#FED976' :
                                '#FFEDA0';
}

function getPointsColor(d: number) {
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

.legend {
    display: grid;
    line-height: 18px;
    color: #555;
}

.legend i {
    width: 18px;
    height: 18px;
    float: left;
    margin-right: 8px;
    opacity: 0.7;
}

.info {
    padding: 6px 8px;
    font: 14px/16px Arial, Helvetica, sans-serif;
    background: white;
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
    border-radius: 5px;
}

.info h4 {
    margin: 0 0 5px;
    color: #777;
}
</style>