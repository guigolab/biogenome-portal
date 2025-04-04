<template>
    <div>
        <div class="row">
            <div class="flex">
                <Header title-class="va-h1" description-class="va-text-secondary" :title="t('map.title')"
                    :description="t('map.description')" />
            </div>
        </div>
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <VaCard>
                    <VaCardContent>
                        <div class="row justify-space-between align-center">
                            <div class="flex lg6 md6 sm12 xs12">
                                <TaxonSearch />
                            </div>
                            <div class="flex">
                                <div class="row align-center">
                                    <div v-if="currentTaxon" class="flex">
                                        <TaxonChip />
                                    </div>
                                    <div class="flex">
                                        <VaButtonDropdown :disabled="locations.length === 0"
                                            :close-on-content-click="false" stick-to-edges label="Report"
                                            color="textPrimary" preset="primary" left-icon icon="fa-file-arrow-down"
                                            opened-icon="fa-file-arrow-down">
                                            <div class="layout va-gutter-1 fluid">
                                                <div class="row">
                                                    <div class="flex lg12 md12 sm12 xs12">
                                                        <VaOptionList v-model="selectedModel" type="radio"
                                                            :options="models" />
                                                    </div>
                                                    <div class="flex lg12 md12 sm12 xs12">
                                                        <VaButton :loading="isLoading" @click="downloaData" block>
                                                            Download
                                                        </VaButton>
                                                    </div>
                                                </div>
                                            </div>
                                        </VaButtonDropdown>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </VaCardContent>
                </VaCard>
                <div class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                        <div class="map-container">
                            <div ref="lMap" class="leaflet-map-2"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
import { computed, inject, ref, watch } from 'vue'
import 'leaflet-draw'
import L, { Control } from 'leaflet'
import type { TileLayer } from 'leaflet'
import Header from '../../components/Header.vue'
import { useI18n } from 'vue-i18n'
import TaxonSearch from '../../components/TaxonSearch.vue'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { useMapStore } from '../../stores/map-store'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import GeoLocationService from '../../services/GeoLocationService'
import TaxonChip from '../../components/TaxonChip.vue'
import { useColors } from 'vuestic-ui/web-components'
import { useRouter } from 'vue-router'
import { AppConfig, DataModels, SampleLocations } from '../../data/types'
import { useItemStore } from '../../stores/items-store'
import { RefSymbol } from '@vue/reactivity'


const taxonomyStore = useTaxonomyStore()
const mapStore = useMapStore()
const itemStore = useItemStore()
const currentTaxon = computed(() => taxonomyStore.currentTaxon)
const { t } = useI18n()
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
const selectedModel = ref<DataModels>('organisms')
const lMap = ref<HTMLDivElement | null>(null);
const map = ref<L.Map | null>(null);
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
const isLoading = ref(false)

watch(() => [currentTaxon.value, polygon.value], async () => {
    await mapStore.getCoordinates({ taxid: currentTaxon.value?.taxid, polygon: polygon.value })
    locations.value = [...mapStore.locations]
    if (!map.value) initMap()
    renderPoints()
}, { immediate: true })


function handleRoute(route: any) {
    router.push(route)
    showSamples.value = false
}

const renderPoints = () => {
    if (!map.value) return;
    pointsLayerGroup.value.clearLayers();
    map.value?.removeLayer(pointsLayerGroup.value as any)
    locations.value.forEach((item) => {
        // console.log(item)
        const [lng, lat] = item.coordinates;
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
    map.value.invalidateSize(); // Ensure map renders correctly
};

const initMap = () => {
    if (!lMap.value) return;

    map.value = L.map(lMap.value)

    map.value.setView([0, 0], 2);

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
                '<p> <i style="background:' + getPointsColor(grades[i] + 1) + '"></i> ' +
                grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] : '+') + '</p>';
        }

        return div;
    };

    legend.addTo(map.value as any);

    drawnItems = new L.FeatureGroup()
    map.value.addLayer(drawnItems)

    const drawControl = new L.Control.Draw({
        position: 'topright',

        draw: {
            polygon: {
                allowIntersection: false, // Restricts shapes to simple polygons
                drawError: {
                    color: '#e1e100', // Color the shape will turn when intersects
                    message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
                },
                shapeOptions: {
                    color: '#97009c'
                }
            },
            // disable toolbar item by setting it to false
            polyline: false,
            circle: false, // Turns off this drawing tool
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
    const customButton = L.Control.extend({
        options: {
            position: 'topright', // 'topleft', 'topright', 'bottomleft', 'bottomright'
        },

        onAdd: function (map: L.Map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom')

            container.innerHTML = '<i class="fa fa-trash"></i>' // or any icon/text you want
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
                // Your custom logic here
                drawnItems.clearLayers()
                if (polygon.value) polygon.value = null
            }

            return container
        }
    })

    map.value?.addControl(new customButton())

};

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

async function getSamplesByCoords(latitude: number, longitude: number) {
    lat.value = latitude
    lng.value = longitude
    const q = `${latitude}_${longitude}`
    const { data } = await GeoLocationService.getLocation(q)
    samples.value = [...data]
}

async function downloaData() {
    const query = { polygon: polygon.value, taxid: currentTaxon.value?.taxid, model: selectedModel.value }
    try {
        isLoading.value = true
        const { data } = await GeoLocationService.getRelatedData(query)
        itemStore.downloadFile(selectedModel.value, data, 'tsv')
    } catch (e) {
        itemStore.catchError(e)
    } finally {
        isLoading.value = false
    }

}

</script>
<style>
.map-container {
    position: relative;
    z-index: 100;
}

.leaflet-map-2 {
    height: 80vh;
    width: 100%;
    z-index: 99;
}
</style>