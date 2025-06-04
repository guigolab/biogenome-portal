<template>
    <div>
        <div class="map-container">
            <div ref="lMap" class="leaflet-map-2"></div>
            <MapStatsDropdown v-if="showStatsDropdown" :filtered-counts="filteredCounts" :polygon="polygon"
                :taxid="currentTaxon?.taxid" @close="showStatsDropdown = false" />
        </div>
        <VaModal hide-default-actions close-button v-model="showSamples">
            <SampleListModal :samples="samples" :lat="lat" :lng="lng" @route="handleRoute" />
        </VaModal>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch, shallowRef} from 'vue'
import L, { Control } from 'leaflet'
import type { TileLayer } from 'leaflet'
import 'leaflet-draw'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { useMapStore } from '../../stores/map-store'
import GeoLocationService from '../../services/GeoLocationService'
import { useColors } from 'vuestic-ui/web-components'
import { useRouter } from 'vue-router'
import { AppConfig, SampleLocations } from '../../data/types'
import SampleListModal from '../../components/SampleListModal.vue'
import MapStatsDropdown from '../../components/MapStatsDropdown.vue'

const taxonomyStore = useTaxonomyStore()
const mapStore = useMapStore()
const currentTaxon = computed(() => taxonomyStore.currentTaxon)
// Replace with your actual locations
const pointsLayerGroup = ref(L.layerGroup());
const config = inject('appConfig') as AppConfig
const generalConfigs = ['general', 'ui']
const models = computed(() =>
    Object.keys(config.models)
        .filter(k => !generalConfigs.includes(k))
        .map((k) => {
            return k
        }
        ))

const lMap = shallowRef<HTMLDivElement | null>(null);
const map = shallowRef<L.Map | null>(null);
let drawnItems: L.FeatureGroup
let polygonLayer: L.Polygon | null = null
const locations = ref<Record<string, any>[]>([])
const { colors } = useColors()
const showSamples = ref(false)
const lat = ref()
const lng = ref()
const router = useRouter()
const samples = ref<SampleLocations[]>([])
const polygon = ref<Record<string, any> | null>(null)
const counts = ref<Record<string, number>>({})
const showStatsDropdown = ref(false)

const filteredCounts = computed(() => {
    return Object.entries(counts.value).filter(([key, value]) => models.value.includes(key) && value > 0).map(([key, value]) => ({ key, value }))
})

watch(() => [currentTaxon.value, polygon.value], async () => {
    await mapStore.getCoordinates({ taxid: currentTaxon.value?.taxid, polygon: polygon.value })
    locations.value = [...mapStore.locations]
    if(!map.value) {
        initMap()
    }
    renderPoints()
    await lookupRelatedData()
}, { immediate: true, deep: true })


function handleRoute(route: any) {
    router.push(route)
    showSamples.value = false
}

const renderPoints = () => {
    if (!map.value) return;
    pointsLayerGroup.value.clearLayers();
    map.value?.removeLayer(pointsLayerGroup.value as any)
    const bounds: [number, number][] = [];
    locations.value.forEach((item) => {
        // console.log(item)
        const [lng, lat] = item.coordinates;
        bounds.push([lat, lng]);
        const marker = L.circleMarker([lat, lng], { color: getPointsColor(item.count), radius: 10 });

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
                color: getPointsColor(item.count), // Reset to original color
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

    if (bounds.length > 0) {
        map.value.fitBounds(bounds);
    }
};

const initMap = () => {
    if (!lMap.value) return;

    map.value = L.map(lMap.value)
    // Add OpenStreetMap tile layer
    const tileLayer: TileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        noWrap: true
    });
    tileLayer.addTo(map.value);

    const legend = createLegend()
    legend.addTo(map.value as any);

    drawnItems = new L.FeatureGroup()
    map.value.addLayer(drawnItems)

    const drawControl = createDrawButton()

    map.value.addControl(drawControl)

    map.value.on(L.Draw.Event.CREATED, (e: any) => {
        if (polygonLayer) {
            drawnItems.removeLayer(polygonLayer)
        }
        polygonLayer = e.layer as L.Polygon
        const bounds = e.layer.getBounds()
        map.value?.fitBounds(bounds)
        drawnItems.addLayer(polygonLayer)
        polygon.value = polygonLayer.toGeoJSON().geometry as any
    })

    // ... existing customButton for reset ...
    const resetButton = createResetButton()
    map.value?.addControl(new resetButton())

    const statsButton = createStatsButton()
    map.value?.addControl(new statsButton())

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

function createLegend() {
    const legend = new Control({ position: 'bottomright' });

    legend.onAdd = function (_: any) {
        var div = L.DomUtil.create('div', 'info legend'),
            grades = [0, 10, 20, 50, 100, 200, 500, 1000],
            labels = [];
        for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<p> <i style="background:' + getPointsColor(grades[i] + 1) + '"></i> ' +
                grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] : '+') + '</p>';
        }
        return div;
    };
    return legend
}

function createStatsButton() {
    return L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom')
            container.innerHTML = '<i class="fa fa-chart-bar"></i>'
            container.title = 'Show Stats'
            container.style.backgroundColor = 'white'
            container.style.width = '34px'
            container.style.height = '34px'
            container.style.display = 'flex'
            container.style.justifyContent = 'center'
            container.style.alignItems = 'center'
            container.style.cursor = 'pointer'
            L.DomEvent.disableClickPropagation(container)
            container.onclick = function () {
                showStatsDropdown.value = !showStatsDropdown.value
            }
            return container
        }
    })
}

function createDrawButton() {
    return new L.Control.Draw({
        position: 'topright',
        draw: {
            polygon: {
                allowIntersection: false,
                drawError: {
                    color: '#e1e100',
                    message: '<strong>Oh snap!<strong> you can\'t draw that!'
                },
                shapeOptions: {
                    color: '#97009c'
                }
            },
            polyline: false,
            circle: false,
            rectangle: false,
            marker: false,
            circlemarker: false,
        },
        edit: {
            featureGroup: drawnItems,
            edit: false,
            remove: false
        }
    })
}

function createResetButton() {
    return L.Control.extend({
        options: {
            position: 'topright',
        },
        onAdd: function (map: L.Map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom')
            container.innerHTML = '<i class="fa fa-trash"></i>'
            container.title = 'Reset'
            container.style.backgroundColor = 'white'
            container.style.width = '34px'
            container.style.height = '34px'
            container.style.display = 'flex'
            container.style.justifyContent = 'center'
            container.style.alignItems = 'center'
            container.style.cursor = 'pointer'
            L.DomEvent.disableClickPropagation(container)
            container.onclick = function () {
                drawnItems.clearLayers()
                if (polygon.value) polygon.value = null
            }
            return container
        }
    })
}
async function getSamplesByCoords(latitude: number, longitude: number) {
    lat.value = latitude
    lng.value = longitude
    const q = `${latitude}_${longitude}`
    const { data } = await GeoLocationService.getLocation(q)
    samples.value = [...data]
}

async function lookupRelatedData() {
    const query = { polygon: polygon.value, taxid: currentTaxon.value?.taxid }
    const { data } = await GeoLocationService.lookupRelatedData(query)
    counts.value = { ...data }
}


</script>
<style lang="scss" scoped>
.map-container {
    height: 80vh;
    padding: 1rem;
}

.leaflet-map-2 {
    width: 100%;
    height: 100%;
}

.custom-sample-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 400px;
    overflow-y: auto;
    margin-bottom: 1rem;
}

.sample-list-item {
    background: var(--va-background-secondary);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.sample-list-content {
    display: flex;
    gap: 1.5rem;
    align-items: center;
}

.sample-chip {
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    padding: 0.25rem 1rem;
    border-radius: 6px;
    transition: background 0.2s;

    &:hover {
        background: var(--va-primary-light);
        color: var(--va-primary);
    }
}

.stats-dropdown-card {
    position: absolute;
    top: 2.5rem;
    right: 2.5rem;
    width: 350px;
    background: var(--va-background-primary);
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 1.5rem 1.5rem 1rem 1.5rem;
    z-index: 3000;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.stats-chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.stats-chip {
    cursor: pointer;
    font-weight: 500;
    font-size: 1rem;
    border-radius: 6px;
    padding: 0.25rem 1rem;
    transition: background 0.2s;
}

.stats-key-value {
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.stats-table-loading {
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>