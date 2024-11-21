<template>

    <!-- 
        show map
        show images
        show vernacular names
        show metadata
        show publications

    -->
    <div v-if="parentTaxon">
        <!-- Taxon related info -->
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <TaxonCard :name="parentTaxon.name" :rank="parentTaxon.rank" />
            </div>
        </div>

    </div>
    <div v-else>
        <!-- dashboard info -->
    </div>


    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <MapCard />
        </div>
    </div>

    <!-- <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <Images />
        </div>
    </div>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <Publications />
        </div>
    </div>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <VernacularNames />
        </div>
    </div>
        
    <Charts :charts="charts" v-if="charts.length" :source="'dashboard'" />
    <div class="row">
        <div class="flex"></div>
        <div class="flex">
            <VaSwitch label="Map Type" v-model="mapType" true-value="clorophet" false-value="points">

            </VaSwitch>
        </div>
    </div> -->
    <!-- 
     if root -> overall overview
     if taxon container -> taxon container overview
     if organism -> organism overview
     
     -->
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useConfig } from '../composable/useConfig'
import { useItemStore } from '../stores/items-store';
import Charts from '../sections/Charts.vue';
import TaxonDetails from '../sections/TaxonDetails.vue';
import Header from '../sections/Header.vue';
import { DataModels, LangOption } from '../data/types';
import OrganismService from '../services/clients/OrganismService';
import Images from '../components/carousels/Images.vue';
import Publications from '../components/lists/Publications.vue';
import VernacularNames from '../components/lists/VernacularNames.vue';
import TaxonCard from '../components/cards/TaxonCard.vue';
import { useI18n } from 'vue-i18n';
import MapCard from '../components/cards/MapCard.vue';


const { page, charts } = useConfig('dashboard')
const itemStore = useItemStore()
const parentTaxon = computed(() => itemStore.parentTaxon)

const isOrganism = computed(() => parentTaxon.value?.leaves === 0)

const mapType = ref<'choropleth' | 'points'>('choropleth')

watch(() => isOrganism.value, async () => {
    if (parentTaxon.value && isOrganism.value) await getOrganismInfo(parentTaxon.value.taxid)
})

watch(() => parentTaxon.value, async () => {
    await getFieldStats()
})


async function getOrganismInfo(taxid: string) {
    const { data } = await OrganismService.getOrganism(taxid)

}

async function getFieldStats() {
    for (const { model, field } of charts.value) {
        await itemStore.getFrequencies('dashboard', model as DataModels, field, true)
    }
}

</script>