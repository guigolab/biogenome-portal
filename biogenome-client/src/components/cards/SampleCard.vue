<template>
    <VaCard>
        <VaDataTable :columns="cols" sticky-header height="150px" :items="filteredData">
            <template #cell(sample_accession)="{ rowData }">
                <router-link
                    :to="rowData.is_local_sample ?
                        { name: 'local_sample', params: { id: rowData.sample_accession } } : { name: 'biosample', params: { accession: rowData.sample_accession } }">
                    {{ rowData.sample_accession }}
                </router-link>
            </template>
            <template #cell(scientific_name)="{ rowData }">
                <router-link :to="{ name: 'organism', params: { taxid: rowData.taxid } }">
                    {{ rowData.scientific_name }}
                </router-link>
            </template>
        </VaDataTable>
    </VaCard>
</template>
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import GeoLocationService from '../../services/clients/GeoLocationService';
import { SampleLocations } from '../../data/types';
import { useMapStore } from '../../stores/map-store';

const props = defineProps<{
    coords: string
}>()

const mapStore = useMapStore()

const defaultCols = ['taxid', 'scientific_name']
const cols = computed(() => mapStore.view === 'organisms' ? defaultCols : ['sample_accession', ...defaultCols])
const locs = ref<SampleLocations[]>([])


watchEffect(async () => await getCoords(props.coords))


async function getCoords(coords: string) {
    const { data } = await GeoLocationService.getLocation(coords)
    locs.value = [...data]
}


const filteredData = computed(() => {
    if (mapStore.view === 'samples') {
        return locs.value; // Return all data for 'samples'
    }

    // Return a unique list of objects for 'organisms' based on 'taxid' and 'scientific_name'
    const uniqueMap: Record<string, { taxid: string; scientific_name: string }> = {};

    locs.value.forEach((item: any) => {
        const key = `${item.taxid}_${item.scientific_name}`;
        if (!uniqueMap[key]) {
            uniqueMap[key] = {
                taxid: item.taxid,
                scientific_name: item.scientific_name,
            };
        }
    });

    return Object.values(uniqueMap); // Convert uniqueMap to a list
});
</script>
