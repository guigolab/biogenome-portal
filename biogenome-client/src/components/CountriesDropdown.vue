<template>
    <div class="countries-dropdown">
        <div class="row align-center">
            <div class="flex">
                <VaDropdown placement="bottom-start" stickToEdges :closeOnContentClick="false">
                    <template #anchor>
                        <VaBadge color="success" :dot="hasActiveCountries" overlap>

                            <VaButton :preset="hasActiveCountries ? 'primary' : 'secondary'" color="primary"
                                class="filter-button" icon="fa-globe">
                                {{ t('items.countries.title') }}
                            </VaButton>
                        </VaBadge>

                    </template>

                    <div class="filter-dropdown-content">
                        <div class="countries-content">
                            <div class="countries-header">
                                <div class="row align-center">
                                    <div class="flex">
                                        <h4 class="va-h6">
                                            {{ t('items.countries.title') }}
                                        </h4>
                                    </div>
                                    <div class="flex">
                                        <VaIcon @click="showInfoModal = true" color="info" name="fa-circle-question" />
                                    </div>
                                </div>
                                <div class="row align-center mt-2">
                                    <div class="flex">
                                        <VaButton :preset="mapStore.showCountriesMap ? 'primary' : 'secondary'"
                                            size="small" @click="toggleMap" class="toggle-map-btn">
                                            <VaIcon :name="mapStore.showCountriesMap ? 'fa-list' : 'fa-map'"
                                                class="mr-2" />
                                            {{ mapStore.showCountriesMap ? t('items.countries.showList') :
                                            t('items.countries.showMap') }}
                                        </VaButton>
                                    </div>
                                </div>
                            </div>

                            <div v-if="mapStore.showCountriesMap" class="map-container">
                                <LeafletMap :selected-countries="mapStore.selectedCountries"
                                    :locations="mapStore.locations" :countries="mapStore.countries"
                                    @country-selected="handleCountry" :map-type="'cloropleth'" />
                            </div>
                            <div v-else>
                                <Select :model="model" field="countries" :value="selectedCountriesValue"
                                    @valueChange="handleCountriesChange" />
                            </div>
                        </div>
                    </div>
                </VaDropdown>
            </div>
        </div>

        <VaModal v-model="showInfoModal" ok-text="Ok">
            <h3 class="va-h3">
                {{ t('items.countries.infoTitle') }}
            </h3>
            <p class="va-text-secondary mt-4">
                {{ t('items.countries.infoDescription') }}
            </p>
        </VaModal>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMapStore } from '../stores/map-store'
import { useItemStore } from '../stores/items-store'
import Select from './inputs/Select.vue'
import LeafletMap from './LeafletMap.vue'
import { DataModels } from '../data/types'

const { t } = useI18n()
const mapStore = useMapStore()
const itemStore = useItemStore()
const showInfoModal = ref(false)

const props = defineProps<{
    model: DataModels
}>()

const hasActiveCountries = computed(() => mapStore.selectedCountries.length > 0)
const selectedCountriesValue = computed(() =>
    mapStore.selectedCountries.map(country => country.id).join(',')
)

function toggleMap() {
    mapStore.showCountriesMap = !mapStore.showCountriesMap
}

async function handleCountriesChange(value: string) {
    const countryIds = value.split(',').filter(Boolean)
    const newSelectedCountries = countryIds.map(id => {
        const country = mapStore.countries.find(c => c.countryId === id)
        return country ? { id: country.countryId, name: country.countryName } : { id, name: id }
    })
    mapStore.selectedCountries = [...newSelectedCountries]
    itemStore.setSearchFormField('countries__in', value)
    await itemStore.fetchItems(props.model)
}

async function handleCountry(country: { id: string, name: string }) {
    const existingCountry = mapStore.selectedCountries.find(c => c.id === country.id)
    if (existingCountry) {
        mapStore.selectedCountries = mapStore.selectedCountries.filter(c => c.id !== country.id)
    } else {
        mapStore.selectedCountries = [...mapStore.selectedCountries, country]
    }
    itemStore.setSearchFormField('countries__in', mapStore.selectedCountries.map(({ id }) => id).join(','))
    await itemStore.fetchItems(props.model)
}
</script>

<style lang="scss" scoped>
.countries-dropdown {
    width: 100%;
}

.countries-header {
    padding: 0.5rem;
    border-bottom: 1px solid var(--va-background-border);
}

.countries-content {
    padding: 0.5rem;
    min-width: 300px;
}

.map-container {
    height: 400px;
    margin-top: 1rem;
    border-radius: 8px;
    overflow: hidden;
}

.filter-button {
    font-weight: 500;
    min-width: 120px;
    transition: all 0.2s ease;
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
}

.filter-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    font-size: 0.75rem;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
}

.filter-dropdown-content {
    padding: 1rem;
    min-width: 300px;
    background: var(--va-background-primary);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.toggle-map-btn {
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
}

.mt-2 {
    margin-top: 0.5rem;
}

.mt-4 {
    margin-top: 1rem;
}

.mr-2 {
    margin-right: 0.5rem;
}
</style>