<template>
    <div>
        <div class="row">
            <div class="flex">
                <Header title-class="va-h1" description-class="va-text-secondary"
                    :title="(modelConfigs.title as LangOption)"
                    :description="(modelConfigs.description as LangOption)" />
            </div>
        </div>
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <VaCard>
                    <VaCardContent>
                        <TaxonSearch />
                    </VaCardContent>
                </VaCard>
            </div>
        </div>
        <div class="row row-equal">
            <div class="flex lg4 md12 sm12 xs12">
                <ItemsFilterCard :model="model" />
            </div>
            <div class="flex lg8 md12 sm12 xs12">
                <!-- <div class="row">
                    <div v-if="mapStore.showCountriesMap" class="flex lg12 md12 sm12 xs12"> -->
                <div v-if="mapStore.showCountriesMap && model === 'organisms'" class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                        <VaCard>
                            <VaCardContent>
                                <div class="row align-center">
                                    <div class="flex">
                                        <h4 class="va-h6">
                                            {{ t('items.countries.title') }}
                                        </h4>
                                    </div>
                                    <div class="flex">
                                        <VaIcon @click="showModal = !showModal" color="info" name="fa-circle-question">

                                        </VaIcon>
                                    </div>
                                </div>
                            </VaCardContent>
                            <VaCardContent>
                                <LeafletMap :selected-countries="mapStore.selectedCountries"
                                    :locations="mapStore.locations" :countries="mapStore.countries"
                                    @country-selected="handleCountry" :map-type="'cloropleth'" />
                            </VaCardContent>
                        </VaCard>
                    </div>
                </div>
                <ItemsTableCard :class="[mapStore.showCountriesMap && model === 'organisms' ? 'card-custom-h' : '']"
                    :model="model" />
            </div>
        </div>
        <VaModal v-model="showModal" ok-text="Ok">
            <h3 class="va-h3">
                {{ t('items.countries.infoTitle') }}
            </h3>
            <p>
                {{ t('items.countries.infoDescription') }}
            </p>
        </VaModal>
    </div>
</template>
<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { DataModels, LangOption, AppConfig, ConfigModel } from '../data/types'
import Header from '../components/Header.vue';
import TaxonSearch from '../components/TaxonSearch.vue';
import { useItemStore } from '../stores/items-store';
import LeafletMap from '../components/LeafletMap.vue';
import { useMapStore } from '../stores/map-store';
import ItemsFilterCard from '../components/ItemsFilterCard.vue';
import ItemsTableCard from '../components/ItemsTableCard.vue';
import { useI18n } from 'vue-i18n';

const config = inject('appConfig') as AppConfig

const { t } = useI18n()
const props = defineProps<{
    model: DataModels
}>()

const showModal = ref(false)
const itemStore = useItemStore()
const mapStore = useMapStore()
const modelConfigs = computed(() => config.models[props.model] as ConfigModel)

async function handleCountry(country: { id: string, name: string }) {
    const existingCountry = mapStore.selectedCountries.find(c => c.id === country.id)
    if (existingCountry) mapStore.selectedCountries = [...mapStore.selectedCountries.filter(c => c.id !== country.id)]
    else mapStore.selectedCountries = [...mapStore.selectedCountries, country]
    itemStore.setSearchFormField('countries__in', mapStore.selectedCountries.map(({ id }) => id).join(','))
    await itemStore.handleQuery()
}

</script>
<style>
.card-custom-h {
    height: fit-content !important;
}
</style>