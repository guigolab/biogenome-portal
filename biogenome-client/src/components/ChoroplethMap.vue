<template>
    <div class="map-container">
        <div ref="mapContainer" class="leaflet-map"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import L, { Map, TileLayer, Control } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useColors } from "vuestic-ui/web-components";

const { colors } = useColors()

const props = defineProps<{
    countries: Record<string, any>[]
    selectedCountries: Record<string, any>[]
}>()

const emits = defineEmits(['countrySelected'])

// Refs
const countries = computed(() => props.countries)
const mapContainer = ref<HTMLDivElement | null>(null);
const map = ref<Map | null>(null);
const choroplethLayerGroup = ref(L.layerGroup());

watch(() => props.selectedCountries, () => {
    renderChoropleth();
});

watch(() => props.countries, () => {
    initMap();
    renderChoropleth();
})

// Initialize map on mount
onMounted(() => {
    initMap();
    renderChoropleth();
});

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
                '<p> <i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
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
                fillColor: getColor(occurrences),
                color: existingCounty ? colors.primary : undefined,
                weight: 4,
                opacity: 1,
                fillOpacity: 0.7,
            }),
            onEachFeature: (feature: any, layer: L.Layer) => {
                layer.on("mouseover", (e: any) => {
                    const hoveredLayer = e.target;
                    hoveredLayer.setStyle({
                        weight: 4,
                        color: colors.primary,
                        fillOpacity: 0.9,
                    });

                    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                        hoveredLayer.bringToFront();
                    }

                    const tooltipContent = `<strong>${countryName}</strong>: ${occurrences}`;
                    hoveredLayer.bindTooltip(tooltipContent, {
                        sticky: true,
                    }).openTooltip();
                });

                layer.on("mouseout", (e: any) => {
                    const hoveredLayer = e.target;
                    hoveredLayer.closeTooltip();
                    if (existingCounty) return
                    geojsonLayer.resetStyle(hoveredLayer);
                });

                layer.on("click", (e: any) => {
                    const clickedLayer = e.target;
                    if (existingCounty) {
                        geojsonLayer.resetStyle(clickedLayer);
                    } else {
                        clickedLayer.setStyle({
                            weight: 4,
                            color: colors.primary,
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
    map.value.invalidateSize();
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