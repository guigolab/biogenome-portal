<template>
    <div class="map-container">
        <div ref="mapContainer" class="leaflet-map"></div>
    </div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import L, { Map, TileLayer, Control } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMapStore } from "../stores/map-store";
import { useItemStore } from "../stores/items-store";

const mapStore = useMapStore();

const props = defineProps<{
    taxid: string
}>()

// Refs
const mapContainer = ref<HTMLDivElement | null>(null);
const map = ref<Map | null>(null);
const choroplethLayerGroup = ref(L.layerGroup());
const pointsLayerGroup = ref(L.layerGroup());

// Initialize the Leaflet map
const initMap = () => {
    if (map.value || !mapContainer.value) return;

    map.value = L.map(mapContainer.value).setView([0, 0], 2);

    // Add OpenStreetMap tile layer
    const tileLayer: TileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    tileLayer.addTo(map.value);

    var legend = new Control({ position: 'bottomright' });

    legend.onAdd = function (_: any) {

        var div = L.DomUtil.create('div', 'info legend'),
            grades = [0, 10, 20, 50, 100, 200, 500, 1000],
            labels = [];

        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<p> <i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] : '+') + '</p>';
        }

        return div;
    };

    legend.addTo(map.value);
};

// Render choropleth map
const renderChoropleth = async () => {
    console.log("Rendering choropleth...");
    choroplethLayerGroup.value.clearLayers();
    const query ={ taxon_lineage: props.taxid }
    await mapStore.getCountries(query);

    const { countries } = mapStore;
    console.log("Choropleth countries data:", countries);

    countries.forEach((item) => {
        const geojsonLayer = L.geoJSON(item.geojson, {
            style: () => ({
                fillColor: getColor(item.occurrences),
                weight: 2,
                opacity: 1,
                color: "white",
                fillOpacity: 0.7,
            }),
        });
        choroplethLayerGroup.value.addLayer(geojsonLayer);
    });
};

// Render point markers
const renderPoints = async () => {
    console.log("Rendering points...");
    pointsLayerGroup.value.clearLayers();
    const query ={ taxid: props.taxid }

    await mapStore.getCoordinates(query);
    const { locations } = mapStore;
    console.log("Points locations data:", locations);

    locations.forEach((item) => {
        const [lng, lat] = item.coordinates;
        const marker = L.circleMarker([lat, lng], { color: getColor(item.count), radius: 10 });
        pointsLayerGroup.value.addLayer(marker);
    });
};




function getColor(d: number) {
    return d > 1000 ? '#800026' :
        d > 500 ? '#BD0026' :
            d > 200 ? '#E31A1C' :
                d > 100 ? '#FC4E2A' :
                    d > 50 ? '#FD8D3C' :
                        d > 20 ? '#FEB24C' :
                            d > 10 ? '#FED976' :
                                '#FFEDA0';
}

// Switch between the two layer groups
const switchLayerGroup = () => {
    if (!map.value) return;

    if (mapStore.mapType === "cloropleth") {
        console.log("Switching to choropleth layer group...");
        map.value.addLayer(choroplethLayerGroup.value);
        map.value.removeLayer(pointsLayerGroup.value);
    } else if (mapStore.mapType === "points") {
        console.log("Switching to points layer group...");
        map.value.addLayer(pointsLayerGroup.value);
        map.value.removeLayer(choroplethLayerGroup.value);
    }
    map.value.invalidateSize(); // Ensure map renders correctly
};

// Watch for changes in mapType
watch(
    () => mapStore.mapType,
    async () => {
        if (mapStore.mapType === "cloropleth") {
            await renderChoropleth();
        } else if (mapStore.mapType === "points") {
            await renderPoints();
        }
        switchLayerGroup();
    });

watch(() => props.taxid, async () => {
    if (mapStore.mapType === "cloropleth") {
        await renderChoropleth();
    } else if (mapStore.mapType === "points") {
        await renderPoints();
    }
    switchLayerGroup();
});
// Initialize map on mount
onMounted(async () => {
    initMap();
    if (mapStore.mapType === "cloropleth") {
        await renderChoropleth();
    } else if (mapStore.mapType === "points") {
        await renderPoints();
    }
    switchLayerGroup();
});
</script>

<style>
.map-container {
    position: relative;
    z-index: 100;
}

.leaflet-map {
    height: 300px;
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